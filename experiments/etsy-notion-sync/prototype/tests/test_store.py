import json

import store

ENDPOINT = "/v3/application/shops/{shop_id}/listings"


def _snapshot(conn, listing_id, captured_at, parsed):
    return store.append_snapshot(
        conn,
        captured_at=captured_at,
        etsy_api_version="v3",
        endpoint=ENDPOINT,
        listing_id=listing_id,
        sku="SKU-1",
        raw_response={"listing_id": listing_id},
        parsed=parsed,
    )


def test_ancestry_chain_links_previous_record(conn):
    first = _snapshot(conn, 1, "2026-07-15T00:00:00Z", {"price": 6.0})
    second = _snapshot(conn, 1, "2026-07-16T00:00:00Z", {"price": 6.5})
    other = _snapshot(conn, 2, "2026-07-16T00:00:00Z", {"price": 3.0})

    rows = dict(conn.execute("SELECT id, previous_record_id FROM listing_snapshots"))
    assert rows[first] is None
    assert rows[second] == first
    assert rows[other] is None  # different listing starts its own chain


def test_ancestry_is_per_endpoint(conn):
    listing_snap = _snapshot(conn, 1, "2026-07-15T00:00:00Z", {})
    inventory_id = store.append_snapshot(
        conn,
        captured_at="2026-07-15T00:00:00Z",
        etsy_api_version="v3",
        endpoint="/v3/application/listings/{listing_id}/inventory",
        listing_id=1,
        sku="SKU-1",
        raw_response={},
        parsed={},
    )
    rows = dict(conn.execute("SELECT id, previous_record_id FROM listing_snapshots"))
    assert rows[listing_snap] is None
    assert rows[inventory_id] is None  # inventory chain independent of listings chain


def test_latest_parsed_by_listing_returns_newest_only(conn):
    _snapshot(conn, 1, "2026-07-15T00:00:00Z", {"price": 6.0})
    _snapshot(conn, 1, "2026-07-16T00:00:00Z", {"price": 7.0})
    _snapshot(conn, 2, "2026-07-16T00:00:00Z", {"price": 3.0})

    latest = store.latest_parsed_by_listing(conn, ENDPOINT)
    assert latest[1]["parsed"]["price"] == 7.0
    assert latest[2]["parsed"]["price"] == 3.0


def test_price_history_query(conn):
    """The SPEC's motivating analysis: every price a listing has ever had."""
    _snapshot(conn, 1, "2026-07-14T00:00:00Z", {"price": 5.0})
    _snapshot(conn, 1, "2026-07-15T00:00:00Z", {"price": 6.0})
    _snapshot(conn, 1, "2026-07-16T00:00:00Z", {"price": 6.0})

    rows = conn.execute(
        "SELECT captured_at, json_extract(parsed, '$.price') FROM listing_snapshots"
        " WHERE listing_id = 1 AND endpoint = ? ORDER BY captured_at",
        (ENDPOINT,),
    ).fetchall()
    assert [price for _, price in rows] == [5.0, 6.0, 6.0]


def test_runs_audit_trail(conn):
    run_id = store.start_run(conn, "2026-07-15T00:00:00Z")
    store.finish_run(conn, run_id, "2026-07-15T00:01:00Z", "ok", {"snapshots_written": 4})
    row = conn.execute("SELECT status, summary FROM runs WHERE id = ?", (run_id,)).fetchone()
    assert row[0] == "ok"
    assert json.loads(row[1])["snapshots_written"] == 4
