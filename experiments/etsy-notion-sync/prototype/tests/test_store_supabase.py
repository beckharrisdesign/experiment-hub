import pytest

from store_supabase import SupabaseStore, SupabaseStoreError
from tests.conftest import FakeResponse, FakeSession


@pytest.fixture
def session():
    return FakeSession()


@pytest.fixture
def sb(session):
    return SupabaseStore("https://example.supabase.co", "service-key", session=session)


def test_append_snapshot_chains_previous_record(sb, session):
    session.queue(FakeResponse(json_body=[{"id": 7}]))            # previous lookup
    session.queue(FakeResponse(status_code=201, json_body=[{"id": 8}]))  # insert

    new_id = sb.append_snapshot(
        captured_at="2026-07-15T00:00:00Z",
        etsy_api_version="v3",
        endpoint="/v3/application/shops/{shop_id}/listings",
        listing_id=1,
        sku="SKU-1",
        raw_response={"listing_id": 1},
        parsed={"price": 6.0},
    )
    assert new_id == 8
    lookup, insert = session.requests
    assert lookup["params"]["listing_id"] == "eq.1"
    assert lookup["params"]["order"] == "id.desc"
    assert insert["json"]["previous_record_id"] == 7
    assert insert["headers"]["Authorization"] == "Bearer service-key"


def test_append_snapshot_first_capture_has_null_parent(sb, session):
    session.queue(FakeResponse(json_body=[]))
    session.queue(FakeResponse(status_code=201, json_body=[{"id": 1}]))
    sb.append_snapshot(
        captured_at="t", etsy_api_version="v3", endpoint="e", listing_id=1,
        sku=None, raw_response={}, parsed={},
    )
    assert session.requests[1]["json"]["previous_record_id"] is None


def test_record_keys_uses_ignore_duplicates(sb, session):
    session.queue(FakeResponse(status_code=201))
    sb.record_keys("/endpoint", {"price.buyer_fee": "12"}, "2026-07-15T00:00:00Z")
    request = session.requests[0]
    assert request["headers"]["Prefer"] == "resolution=ignore-duplicates"
    assert request["json"][0]["key"] == "price.buyer_fee"


def test_record_keys_skips_empty(sb, session):
    sb.record_keys("/endpoint", {}, "now")
    assert session.requests == []


def test_latest_parsed_by_listing_reads_view(sb, session):
    session.queue(FakeResponse(json_body=[
        {"listing_id": 1, "sku": "SKU-1", "parsed": {"price": 6.0}, "captured_at": "t1"},
    ]))
    latest = sb.latest_parsed_by_listing("/endpoint")
    assert latest[1]["parsed"]["price"] == 6.0
    assert "etsy_latest_listing_snapshots" in session.requests[0]["url"]


def test_run_lifecycle(sb, session):
    session.queue(FakeResponse(status_code=201, json_body=[{"id": 3}]))
    session.queue(FakeResponse(status_code=204))

    run_id = sb.start_run("2026-07-15T00:00:00Z", trigger_source="manual")
    assert run_id == 3
    assert session.requests[0]["json"]["trigger_source"] == "manual"

    sb.finish_run(run_id, "2026-07-15T00:05:00Z", "ok", {"snapshots_written": 4})
    patch = session.requests[1]
    assert patch["method"] == "PATCH"
    assert patch["params"]["id"] == "eq.3"
    assert patch["json"]["status"] == "ok"


def test_token_custody_roundtrip(sb, session):
    session.queue(FakeResponse(json_body=[{"id": "default", "refresh_token": "r1", "access_token": "a1"}]))
    tokens = sb.get_tokens()
    assert tokens["refresh_token"] == "r1"

    session.queue(FakeResponse(status_code=201))
    sb.set_tokens("a2", "r2", expires_in=3600)
    upsert = session.requests[1]
    assert upsert["headers"]["Prefer"] == "resolution=merge-duplicates"
    assert upsert["json"]["refresh_token"] == "r2"
    assert upsert["json"]["expires_at"] is not None


def test_error_raises_with_context(sb, session):
    session.queue(FakeResponse(status_code=403, text="permission denied"))
    with pytest.raises(SupabaseStoreError, match="GET etsy_listing_snapshots"):
        sb.append_snapshot(captured_at="t", etsy_api_version="v3", endpoint="e",
                           listing_id=1, sku=None, raw_response={}, parsed={})
