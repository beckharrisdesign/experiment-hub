import capture
import sync_notion
from tests.conftest import make_inventory, make_listing
from tests.test_capture import FakeEtsyClient

CONFIG = {
    "listing_id_property": "Etsy Listing ID",
    "title_property": "Short Title",
    "sku_property": "SKU",
    "price_property": "Single price sum",
    "quantity_property": "Inventory value",
    "status_property": "Status",
    "state_to_status": dict(sync_notion.DEFAULT_STATE_TO_STATUS),
}

DB_SCHEMA = {
    "properties": {
        "Etsy Listing ID": {"type": "rich_text"},
        "Short Title": {"type": "title"},
        "SKU": {"type": "rich_text"},
        "Single price sum": {"type": "number"},
        "Inventory value": {"type": "number"},
        "Status": {
            "type": "select",
            "select": {"options": [{"name": "Active"}, {"name": "Inactive"}, {"name": "Sold out"}]},
        },
    }
}


def make_page(page_id, sku, price=None, quantity=None, status=None, listing_id=None):
    return {
        "id": page_id,
        "properties": {
            "Etsy Listing ID": {
                "type": "rich_text",
                "rich_text": [{"plain_text": str(listing_id)}] if listing_id else [],
            },
            "SKU": {"type": "rich_text", "rich_text": [{"plain_text": sku}]},
            "Single price sum": {"type": "number", "number": price},
            "Inventory value": {"type": "number", "number": quantity},
            "Status": {"type": "select", "select": {"name": status} if status else None},
        },
    }


class FakeNotionClient:
    def __init__(self, db_schema, pages):
        self.db_schema = db_schema
        self.pages = pages
        self.updates = []
        self.creates = []

    def get_database(self, database_id):
        return self.db_schema

    def query_database_all(self, database_id):
        return iter(self.pages)

    def update_page(self, page_id, properties):
        self.updates.append((page_id, properties))

    def create_page(self, database_id, properties):
        self.creates.append((database_id, properties))


def capture_fixture(backend, price_amount=600, quantity=50, state="active"):
    listing = make_listing(1, sku="SKU-1", price_amount=price_amount, quantity=quantity, state=state)
    client = FakeEtsyClient([listing], {1: make_inventory("SKU-1")})
    capture.run_capture(client, backend, "shop123")


def test_only_changed_fields_are_planned(backend):
    capture_fixture(backend, price_amount=600, quantity=50, state="active")
    # Price already correct; quantity and status differ.
    page = make_page("page-1", "SKU-1", price=6.0, quantity=10, status="Inactive")
    client = FakeNotionClient(DB_SCHEMA, [page])

    summary = sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    assert summary["updates"] == 1
    page_id, properties = client.updates[0]
    assert page_id == "page-1"
    assert properties == {
        "Inventory value": {"number": 50},
        "Status": {"select": {"name": "Active"}},
    }


def test_idempotent_when_nothing_changed(backend):
    capture_fixture(backend, price_amount=600, quantity=50, state="active")
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])

    summary = sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    assert summary["updates"] == 0
    assert client.updates == []


def test_dry_run_never_writes(backend):
    capture_fixture(backend, price_amount=999, quantity=1, state="active")
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])

    summary = sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=True)

    assert summary["updates"] == 1  # a change was planned...
    assert client.updates == []  # ...but nothing was written


def test_unmatched_listing_creates_row(backend):
    capture_fixture(backend)
    client = FakeNotionClient(DB_SCHEMA, [make_page("page-1", "OTHER-SKU")])

    summary = sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    assert summary["unmatched"] == 1
    assert summary["created"] == 1
    assert client.updates == []
    database_id, properties = client.creates[0]
    assert database_id == "db-1"
    assert properties["Etsy Listing ID"] == {"rich_text": [{"text": {"content": "1"}}]}
    assert properties["Short Title"] == {"title": [{"text": {"content": "Listing 1"}}]}
    assert properties["Single price sum"] == {"number": 6.0}
    assert properties["Inventory value"] == {"number": 50}
    assert properties["Status"] == {"select": {"name": "Active"}}


def test_dry_run_plans_creates_without_writing(backend):
    capture_fixture(backend)
    client = FakeNotionClient(DB_SCHEMA, [make_page("page-1", "OTHER-SKU")])

    summary = sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=True)

    assert summary["created"] == 1
    assert client.creates == []


def test_no_listing_id_property_skips_creates(backend):
    capture_fixture(backend)
    schema = {"properties": {k: v for k, v in DB_SCHEMA["properties"].items()
                             if k != "Etsy Listing ID"}}
    client = FakeNotionClient(schema, [make_page("page-1", "OTHER-SKU")])

    summary = sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    assert summary["created"] == 0
    assert client.creates == []


def test_unwritable_listing_id_property_skips_creates(backend):
    # A row created without its listing id could never match again, so the
    # next run would create a duplicate — the plan must be dropped instead.
    capture_fixture(backend)
    schema = {"properties": dict(DB_SCHEMA["properties"],
                                 **{"Etsy Listing ID": {"type": "formula"}})}
    client = FakeNotionClient(schema, [make_page("page-1", "OTHER-SKU")])

    summary = sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    assert summary["created"] == 0
    assert client.creates == []


def test_unknown_status_option_is_skipped(backend):
    capture_fixture(backend, state="draft")  # "Draft" not among the DB's select options
    page = make_page("page-1", "SKU-1", price=999.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])

    sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    _, properties = client.updates[0]
    assert "Status" not in properties  # option missing in Notion — skipped with a warning
    assert "Single price sum" in properties


def test_duplicate_skus_keep_first_page():
    pages = [make_page("page-1", "SKU-1"), make_page("page-2", "SKU-1")]
    _, by_sku = sync_notion.build_page_indexes(pages, "Etsy Listing ID", "SKU")
    assert by_sku["SKU-1"]["id"] == "page-1"


def test_listing_id_match_beats_sku(backend):
    """The row whose Etsy Listing ID matches wins, even when another row has the SKU."""
    capture_fixture(backend, quantity=99)  # listing_id=1, sku=SKU-1
    decoy = make_page("page-sku", "SKU-1", quantity=50)
    right = make_page("page-lid", "OTHER-SKU", quantity=50, listing_id=1)
    client = FakeNotionClient(DB_SCHEMA, [decoy, right])

    sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    assert [page_id for page_id, _ in client.updates] == ["page-lid"]


def test_sku_fallback_when_listing_id_empty(backend):
    capture_fixture(backend, quantity=99)
    page = make_page("page-1", "SKU-1", quantity=50)  # no listing id set
    client = FakeNotionClient(DB_SCHEMA, [page])

    summary = sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    assert summary["updates"] == 1
    assert client.updates[0][0] == "page-1"
