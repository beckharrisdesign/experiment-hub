"""Shared fakes for offline tests — no network, no real credentials."""
import pytest

import store


class FakeResponse:
    def __init__(self, status_code=200, json_body=None, headers=None, text=""):
        self.status_code = status_code
        self._json = json_body if json_body is not None else {}
        self.headers = headers or {}
        self.text = text

    def json(self):
        return self._json


class FakeSession:
    """Queues responses per (method, url-substring); records every request."""

    def __init__(self):
        self.queued = []
        self.requests = []

    def queue(self, response):
        self.queued.append(response)

    def _respond(self, method, url, **kwargs):
        self.requests.append({"method": method, "url": url, **kwargs})
        if not self.queued:
            raise AssertionError("No queued response for {} {}".format(method, url))
        return self.queued.pop(0)

    def get(self, url, **kwargs):
        return self._respond("GET", url, **kwargs)

    def post(self, url, **kwargs):
        return self._respond("POST", url, **kwargs)

    def patch(self, url, **kwargs):
        return self._respond("PATCH", url, **kwargs)


def make_listing(listing_id, sku="WH-UN-S-929E", price_amount=600, quantity=50,
                 state="active", views=12, extra=None):
    listing = {
        "listing_id": listing_id,
        "title": "Listing {}".format(listing_id),
        "state": state,
        "quantity": quantity,
        "views": views,
        "num_favorers": 1,
        "last_modified_timestamp": 1234567890,
        "price": {"amount": price_amount, "divisor": 100, "currency_code": "USD"},
        "skus": [sku],
        "tags": ["embroidery"],
    }
    if extra:
        listing.update(extra)
    return listing


def make_inventory(sku="WH-UN-S-929E", quantity=50):
    return {
        "products": [
            {
                "product_id": 1,
                "sku": sku,
                "offerings": [{"offering_id": 1, "quantity": quantity,
                               "price": {"amount": 600, "divisor": 100}}],
            }
        ],
        "price_on_property": [],
        "quantity_on_property": [],
        "sku_on_property": [],
        "readiness_state_on_property": [],
    }


@pytest.fixture
def conn():
    connection = store.connect(":memory:")
    yield connection
    connection.close()
