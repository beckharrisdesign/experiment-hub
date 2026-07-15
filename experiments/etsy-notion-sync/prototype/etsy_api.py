"""Read-only Etsy Open API v3 client with rate-limit awareness.

Only GET endpoints exist here on purpose — this system never writes to Etsy.
"""
import logging
import time

import requests

API_BASE = "https://openapi.etsy.com"
API_VERSION = "v3"

# Widest valid includes set for getListingsByShop, per SPEC.md.
LISTING_INCLUDES = (
    "Shipping,Images,Shop,User,Translations,Inventory,Videos,Personalization,BuyerPrice"
)

LISTINGS_ENDPOINT = "/v3/application/shops/{shop_id}/listings"
INVENTORY_ENDPOINT = "/v3/application/listings/{listing_id}/inventory"

PAGE_LIMIT = 100

log = logging.getLogger("etsy_api")


class EtsyApiError(RuntimeError):
    pass


class EtsyClient:
    def __init__(
        self,
        api_key,
        oauth_token,
        session=None,
        sleep=time.sleep,
        pacing_seconds=0.2,
        quota_floor=0.1,
        max_retries=3,
    ):
        self.api_key = api_key
        self.oauth_token = oauth_token
        self.session = session or requests.Session()
        self.sleep = sleep
        self.pacing_seconds = pacing_seconds
        self.quota_floor = quota_floor
        self.max_retries = max_retries
        # Latest quota headers seen, e.g. {"limit_per_day": 10000, "remaining_today": 9987}
        self.last_quota = {}

    def get(self, path, params=None):
        url = API_BASE + path
        headers = {
            "x-api-key": self.api_key,
            "Authorization": "Bearer {}".format(self.oauth_token),
        }
        for attempt in range(self.max_retries + 1):
            response = self.session.get(url, params=params, headers=headers, timeout=30)
            self._record_quota(response.headers)
            if response.status_code == 429:
                retry_after = float(response.headers.get("retry-after", 1))
                log.warning("429 from %s — honoring retry-after=%ss", path, retry_after)
                self.sleep(retry_after)
                continue
            if response.status_code >= 400:
                raise EtsyApiError(
                    "GET {} failed with {}: {}".format(path, response.status_code, response.text[:500])
                )
            self.sleep(self.pacing_seconds)
            return response.json()
        raise EtsyApiError("GET {} still rate-limited after {} retries".format(path, self.max_retries))

    def _record_quota(self, headers):
        for field, header in (
            ("limit_per_day", "x-limit-per-day"),
            ("remaining_today", "x-remaining-today"),
            ("limit_per_second", "x-limit-per-second"),
            ("remaining_this_second", "x-remaining-this-second"),
        ):
            value = headers.get(header)
            if value is not None:
                try:
                    self.last_quota[field] = int(float(value))
                except ValueError:
                    pass

    def quota_is_low(self):
        """True when remaining daily quota is below the safety floor (SPEC guardrail 3)."""
        limit = self.last_quota.get("limit_per_day")
        remaining = self.last_quota.get("remaining_today")
        if not limit or remaining is None:
            return False
        return (remaining / limit) < self.quota_floor

    def iter_shop_listings(self, shop_id, states=("active",)):
        """Yield every listing for the shop across the requested states, paginated."""
        path = LISTINGS_ENDPOINT.format(shop_id=shop_id)
        for state in states:
            offset = 0
            while True:
                payload = self.get(
                    path,
                    params={
                        "state": state,
                        "limit": PAGE_LIMIT,
                        "offset": offset,
                        "includes": LISTING_INCLUDES,
                    },
                )
                results = payload.get("results") or []
                for listing in results:
                    yield listing
                offset += len(results)
                if not results or offset >= payload.get("count", 0):
                    break

    def get_listing_inventory(self, listing_id):
        return self.get(INVENTORY_ENDPOINT.format(listing_id=listing_id))
