import capture
from tests.conftest import make_inventory, make_listing


class FakeEtsyClient:
    """In-memory stand-in for EtsyClient — same read-only surface."""

    def __init__(self, listings, inventories, quota_low_after=None):
        self.listings = listings
        self.inventories = inventories
        self.quota_low_after = quota_low_after
        self.inventory_calls = 0
        self.last_quota = {"limit_per_day": 10000, "remaining_today": 9990}

    def iter_shop_listings(self, shop_id, states=("active",)):
        for listing in self.listings:
            yield listing

    def get_listing_inventory(self, listing_id):
        self.inventory_calls += 1
        return self.inventories[listing_id]

    def quota_is_low(self):
        return self.quota_low_after is not None and self.inventory_calls >= self.quota_low_after


def make_fake_client(**kwargs):
    listings = [make_listing(1, sku="SKU-1"), make_listing(2, sku="SKU-2")]
    inventories = {1: make_inventory("SKU-1"), 2: make_inventory("SKU-2")}
    return FakeEtsyClient(listings, inventories, **kwargs)


def test_capture_writes_listing_and_inventory_snapshots(conn):
    summary = capture.run_capture(make_fake_client(), conn, "shop123")

    assert summary["listings_captured"] == 2
    assert summary["snapshots_written"] == 4  # listing + inventory per listing
    endpoints = {row[0] for row in conn.execute("SELECT DISTINCT endpoint FROM listing_snapshots")}
    assert endpoints == {
        "/v3/application/shops/{shop_id}/listings",
        "/v3/application/listings/{listing_id}/inventory",
    }
    versions = {row[0] for row in conn.execute("SELECT DISTINCT etsy_api_version FROM listing_snapshots")}
    assert versions == {"v3"}


def test_second_run_chains_ancestry_and_stays_quiet_on_schema(conn):
    capture.run_capture(make_fake_client(), conn, "shop123")
    summary = capture.run_capture(make_fake_client(), conn, "shop123")

    assert summary["new_fields"] == []  # baseline already recorded, nothing new
    orphans = conn.execute(
        "SELECT COUNT(*) FROM listing_snapshots WHERE previous_record_id IS NULL"
    ).fetchone()[0]
    total = conn.execute("SELECT COUNT(*) FROM listing_snapshots").fetchone()[0]
    assert total == 8
    assert orphans == 4  # only the first run's snapshots lack a parent


def test_new_field_detected_on_later_run(conn):
    capture.run_capture(make_fake_client(), conn, "shop123")

    client = make_fake_client()
    client.listings[0]["buyer_price"] = {"amount": 700, "divisor": 100}
    summary = capture.run_capture(client, conn, "shop123")

    new_keys = {field["key"] for field in summary["new_fields"]}
    assert "buyer_price" in new_keys
    assert "buyer_price.amount" in new_keys


def test_quota_low_pauses_run(conn):
    client = make_fake_client(quota_low_after=1)
    summary = capture.run_capture(client, conn, "shop123")

    assert summary["quota_low"] is True
    assert summary["listings_captured"] == 1  # stopped after the first listing
    status = conn.execute("SELECT status FROM runs ORDER BY id DESC LIMIT 1").fetchone()[0]
    assert status == "paused_quota"


def test_parse_listing_converts_money():
    parsed = capture.parse_listing(make_listing(1, price_amount=650))
    assert parsed["price"] == 6.5
    assert parsed["currency_code"] == "USD"


def test_parse_inventory_totals_offerings():
    parsed = capture.parse_inventory(make_inventory("SKU-1", quantity=7))
    assert parsed == {"product_count": 1, "skus": ["SKU-1"], "total_offering_quantity": 7}
