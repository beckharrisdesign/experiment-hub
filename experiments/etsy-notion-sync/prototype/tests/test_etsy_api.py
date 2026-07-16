import pytest

from etsy_api import EtsyApiError, EtsyClient
from tests.conftest import FakeResponse, FakeSession


def make_client(session, **kwargs):
    sleeps = []
    client = EtsyClient(
        "key", "token", session=session, sleep=sleeps.append, pacing_seconds=0.2, **kwargs
    )
    return client, sleeps


def test_get_sends_auth_headers_and_paces():
    session = FakeSession()
    session.queue(FakeResponse(json_body={"ok": True}))
    client, sleeps = make_client(session)

    assert client.get("/v3/application/listings/1/inventory") == {"ok": True}
    headers = session.requests[0]["headers"]
    assert headers["x-api-key"] == "key"
    assert headers["Authorization"] == "Bearer token"
    assert sleeps == [0.2]  # gentle pacing between calls


def test_shared_secret_joins_x_api_key_header():
    session = FakeSession()
    session.queue(FakeResponse(json_body={"ok": True}))
    client, _ = make_client(session, shared_secret="hush")

    client.get("/v3/application/listings/1/inventory")
    assert session.requests[0]["headers"]["x-api-key"] == "key:hush"


def test_429_honors_retry_after_then_succeeds():
    session = FakeSession()
    session.queue(FakeResponse(status_code=429, headers={"retry-after": "3"}))
    session.queue(FakeResponse(json_body={"ok": True}))
    client, sleeps = make_client(session)

    assert client.get("/path") == {"ok": True}
    assert sleeps[0] == 3.0


def test_non_numeric_retry_after_falls_back_to_one_second():
    session = FakeSession()
    session.queue(FakeResponse(status_code=429, headers={"retry-after": "Wed, 15 Jul 2026 14:00:00 GMT"}))
    session.queue(FakeResponse(json_body={"ok": True}))
    client, sleeps = make_client(session)

    assert client.get("/path") == {"ok": True}
    assert sleeps[0] == 1.0


def test_gives_up_after_max_retries():
    session = FakeSession()
    for _ in range(4):
        session.queue(FakeResponse(status_code=429, headers={"retry-after": "1"}))
    client, _ = make_client(session, max_retries=3)

    with pytest.raises(EtsyApiError):
        client.get("/path")


def test_quota_is_low_reads_response_headers():
    session = FakeSession()
    session.queue(FakeResponse(json_body={}, headers={"x-limit-per-day": "10000", "x-remaining-today": "500"}))
    client, _ = make_client(session, quota_floor=0.1)

    client.get("/path")
    assert client.quota_is_low()  # 5% remaining < 10% floor
    assert client.last_quota["remaining_today"] == 500


def test_quota_not_low_without_headers():
    session = FakeSession()
    session.queue(FakeResponse(json_body={}))
    client, _ = make_client(session)
    client.get("/path")
    assert not client.quota_is_low()


def test_iter_shop_listings_paginates():
    session = FakeSession()
    page1 = {"count": 3, "results": [{"listing_id": 1}, {"listing_id": 2}]}
    page2 = {"count": 3, "results": [{"listing_id": 3}]}
    session.queue(FakeResponse(json_body=page1))
    session.queue(FakeResponse(json_body=page2))
    client, _ = make_client(session)

    listings = list(client.iter_shop_listings("shop123"))
    assert [l["listing_id"] for l in listings] == [1, 2, 3]
    assert session.requests[0]["params"]["offset"] == 0
    assert session.requests[1]["params"]["offset"] == 2
    assert "Inventory" in session.requests[0]["params"]["includes"]


def test_client_has_no_write_methods():
    """SPEC guardrail 5: one-directional only — the client can only GET."""
    assert not any(hasattr(EtsyClient, m) for m in ("post", "put", "patch", "delete"))
