"""Supabase (PostgREST) backend for the append-only capture store.

Same method surface as store.SqliteStore, plus Etsy token custody
(get_tokens/set_tokens) — tokens live server-side because Etsy rotates the
refresh token on every use, so a static secret can't hold them.

All access uses the service-role key; the tables have RLS enabled with no
policies, so nothing else can reach them. Append-only is also enforced at
the database level by triggers (migration: etsy_sync_runtime_tables).
"""
import json
from datetime import datetime, timedelta, timezone

import requests

SNAPSHOTS = "etsy_listing_snapshots"
RUNS = "etsy_runs"
SCHEMA_KEYS = "etsy_schema_keys"
TOKENS = "etsy_tokens"
LATEST_VIEW = "etsy_latest_listing_snapshots"


class SupabaseStoreError(RuntimeError):
    pass


class SupabaseStore:
    def __init__(self, url, service_role_key, session=None):
        self.rest_base = url.rstrip("/") + "/rest/v1"
        self.key = service_role_key
        self.session = session or requests.Session()

    def _headers(self, prefer=None):
        headers = {
            "apikey": self.key,
            "Authorization": "Bearer {}".format(self.key),
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def _check(self, response, context):
        if response.status_code >= 400:
            raise SupabaseStoreError(
                "{} failed with {}: {}".format(context, response.status_code, response.text[:500])
            )
        return response

    def _get(self, table, params):
        response = self.session.get(
            "{}/{}".format(self.rest_base, table),
            params=params,
            headers=self._headers(),
            timeout=30,
        )
        return self._check(response, "GET {}".format(table)).json()

    def _post(self, table, payload, prefer):
        response = self.session.post(
            "{}/{}".format(self.rest_base, table),
            json=payload,
            headers=self._headers(prefer),
            timeout=30,
        )
        return self._check(response, "POST {}".format(table))

    def _patch(self, table, params, payload):
        response = self.session.patch(
            "{}/{}".format(self.rest_base, table),
            params=params,
            json=payload,
            headers=self._headers(),
            timeout=30,
        )
        return self._check(response, "PATCH {}".format(table))

    # -- store interface -----------------------------------------------------

    def append_snapshot(self, captured_at, etsy_api_version, endpoint, listing_id,
                        sku, raw_response, parsed):
        previous = self._get(SNAPSHOTS, {
            "select": "id",
            "listing_id": "eq.{}".format(listing_id),
            "endpoint": "eq.{}".format(endpoint),
            "order": "id.desc",
            "limit": "1",
        })
        created = self._post(SNAPSHOTS, {
            "captured_at": captured_at,
            "etsy_api_version": etsy_api_version,
            "endpoint": endpoint,
            "listing_id": listing_id,
            "sku": sku,
            "raw_response": raw_response,
            "parsed": parsed,
            "previous_record_id": previous[0]["id"] if previous else None,
        }, prefer="return=representation").json()
        return created[0]["id"]

    def known_keys(self, endpoint):
        rows = self._get(SCHEMA_KEYS, {"select": "key", "endpoint": "eq.{}".format(endpoint)})
        return {row["key"] for row in rows}

    def record_keys(self, endpoint, new_keys, seen_at):
        if not new_keys:
            return
        self._post(SCHEMA_KEYS, [
            {"endpoint": endpoint, "key": key, "first_seen_at": seen_at, "sample_value": sample}
            for key, sample in new_keys.items()
        ], prefer="resolution=ignore-duplicates")

    def latest_parsed_by_listing(self, endpoint):
        rows = self._get(LATEST_VIEW, {
            "select": "listing_id,sku,parsed,captured_at",
            "endpoint": "eq.{}".format(endpoint),
        })
        return {
            row["listing_id"]: {
                "sku": row["sku"],
                "parsed": row["parsed"] if isinstance(row["parsed"], dict) else json.loads(row["parsed"]),
                "captured_at": row["captured_at"],
            }
            for row in rows
        }

    def start_run(self, started_at, trigger_source="scheduled"):
        created = self._post(RUNS, {
            "started_at": started_at,
            "trigger_source": trigger_source,
        }, prefer="return=representation").json()
        return created[0]["id"]

    def finish_run(self, run_id, finished_at, status, summary):
        self._patch(RUNS, {"id": "eq.{}".format(run_id)}, {
            "finished_at": finished_at,
            "status": status,
            "summary": summary,
        })

    def commit(self):
        pass  # PostgREST writes are atomic per request

    # -- token custody ---------------------------------------------------------

    def get_tokens(self):
        rows = self._get(TOKENS, {"select": "*", "id": "eq.default"})
        return rows[0] if rows else None

    def set_tokens(self, access_token, refresh_token, expires_in=None, now=None):
        now = now or datetime.now(timezone.utc)
        expires_at = (
            (now + timedelta(seconds=int(expires_in))).isoformat() if expires_in else None
        )
        self._post(TOKENS, {
            "id": "default",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at,
            "updated_at": now.isoformat(),
        }, prefer="resolution=merge-duplicates")
