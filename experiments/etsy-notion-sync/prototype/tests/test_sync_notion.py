import capture
import sync_notion
from notion_api import NotionApiError
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
    "extra_fields": [],  # extra-field behavior has its own tests below
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
            "select": {"options": [{"name": "Active"}, {"name": "Inactive"}, {"name": "Sold Out"}]},
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
    def __init__(self, db_schema, pages, comment_error=False):
        self.db_schema = db_schema
        self.pages = pages
        self.updates = []
        self.creates = []
        self.db_updates = []
        self.comments = []
        self.comment_error = comment_error

    def get_database(self, database_id):
        return self.db_schema

    def update_database(self, database_id, properties):
        self.db_updates.append((database_id, properties))

    def query_database_all(self, database_id):
        return iter(self.pages)

    def update_page(self, page_id, properties):
        self.updates.append((page_id, properties))

    def create_page(self, database_id, properties):
        self.creates.append((database_id, properties))

    def create_comment(self, page_id, text):
        if self.comment_error:
            raise NotionApiError("Create comment on {} failed with 403".format(page_id))
        self.comments.append((page_id, text))


def capture_fixture(backend, price_amount=600, quantity=50, state="active", extra=None):
    listing = make_listing(1, sku="SKU-1", price_amount=price_amount, quantity=quantity,
                           state=state, extra=extra)
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


# --- extra fields (description, tags, dates, ...) ---------------------------

EXTRA_FIELDS = [
    {"parsed_key": "description", "property": "Description", "type": "rich_text"},
    {"parsed_key": "tags", "property": "Tags", "type": "multi_select"},
    {"parsed_key": "last_modified_timestamp", "property": "Etsy Last Modified", "type": "date"},
]

EXTRA_CONFIG = dict(CONFIG, extra_fields=EXTRA_FIELDS)

EXTRA_DB_SCHEMA = {
    "properties": dict(
        DB_SCHEMA["properties"],
        **{
            "Description": {"type": "rich_text"},
            "Tags": {"type": "multi_select"},
            "Etsy Last Modified": {"type": "date"},
        },
    )
}


def test_missing_extra_properties_are_created_and_written(backend):
    capture_fixture(backend, extra={"description": "Hand-stitched."})
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])  # schema lacks all three extras

    sync_notion.run_sync(client, backend, "db-1", EXTRA_CONFIG, dry_run=False)

    assert client.db_updates == [("db-1", {
        "Description": {"rich_text": {}},
        "Tags": {"multi_select": {}},
        "Etsy Last Modified": {"date": {}},
    })]
    _, properties = client.updates[0]
    assert properties["Description"] == {"rich_text": [{"text": {"content": "Hand-stitched."}}]}
    assert properties["Tags"] == {"multi_select": [{"name": "embroidery"}]}
    assert properties["Etsy Last Modified"] == {"date": {"start": "2009-02-13"}}


def test_dry_run_plans_extra_fields_without_creating_properties(backend):
    capture_fixture(backend, extra={"description": "Hand-stitched."})
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])

    summary = sync_notion.run_sync(client, backend, "db-1", EXTRA_CONFIG, dry_run=True)

    assert summary["updates"] == 1  # extras were planned...
    assert client.db_updates == []  # ...but no schema or page writes happened
    assert client.updates == []


def test_extra_fields_idempotent_when_unchanged(backend):
    capture_fixture(backend, extra={"description": "  Hand-stitched.  "})
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    page["properties"]["Description"] = {
        "type": "rich_text", "rich_text": [{"plain_text": "Hand-stitched."}],
    }
    page["properties"]["Tags"] = {
        "type": "multi_select", "multi_select": [{"name": "embroidery"}],
    }
    page["properties"]["Etsy Last Modified"] = {
        "type": "date", "date": {"start": "2009-02-13"},
    }
    client = FakeNotionClient(EXTRA_DB_SCHEMA, [page])

    summary = sync_notion.run_sync(client, backend, "db-1", EXTRA_CONFIG, dry_run=False)

    assert summary["updates"] == 0
    assert client.updates == []


def test_long_description_is_truncated_for_notion(backend):
    capture_fixture(backend, extra={"description": "x" * 2500})
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(EXTRA_DB_SCHEMA, [page])

    sync_notion.run_sync(client, backend, "db-1", EXTRA_CONFIG, dry_run=False)

    _, properties = client.updates[0]
    content = properties["Description"]["rich_text"][0]["text"]["content"]
    assert content == "x" * 2000


def test_non_creatable_extra_field_type_is_skipped(backend):
    capture_fixture(backend)
    config = dict(CONFIG, extra_fields=[
        {"parsed_key": "title", "property": "Linked Item", "type": "relation"},
    ])
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])

    sync_notion.run_sync(client, backend, "db-1", config, dry_run=False)

    assert client.db_updates == []  # relation can't be auto-created
    assert all("Linked Item" not in props for _, props in client.updates)


def test_unmatched_listing_create_includes_extra_fields(backend):
    capture_fixture(backend, extra={"description": "Hand-stitched."})
    client = FakeNotionClient(EXTRA_DB_SCHEMA, [make_page("page-1", "OTHER-SKU")])

    summary = sync_notion.run_sync(client, backend, "db-1", EXTRA_CONFIG, dry_run=False)

    assert summary["created"] == 1
    _, properties = client.creates[0]
    assert properties["Description"] == {"rich_text": [{"text": {"content": "Hand-stitched."}}]}
    assert properties["Tags"] == {"multi_select": [{"name": "embroidery"}]}


def test_sold_out_state_maps_to_notion_option(backend):
    capture_fixture(backend, state="sold_out")
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])

    sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    _, properties = client.updates[0]
    assert properties["Status"] == {"select": {"name": "Sold Out"}}


# --- change comments --------------------------------------------------------

COMMENT_CONFIG = dict(CONFIG, comments_enabled=True)


def test_comment_logs_changed_fields_on_update(backend):
    capture_fixture(backend, price_amount=600, quantity=50, state="active")
    page = make_page("page-1", "SKU-1", price=6.0, quantity=10, status="Inactive")
    client = FakeNotionClient(DB_SCHEMA, [page])

    sync_notion.run_sync(client, backend, "db-1", COMMENT_CONFIG, dry_run=False)

    assert len(client.comments) == 1
    page_id, text = client.comments[0]
    assert page_id == "page-1"
    assert "Inventory value: 10 → 50" in text
    assert "Status: Inactive → Active" in text


def test_no_comment_in_dry_run(backend):
    capture_fixture(backend, quantity=1)
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])

    sync_notion.run_sync(client, backend, "db-1", COMMENT_CONFIG, dry_run=True)

    assert client.updates == []
    assert client.comments == []


def test_no_comment_when_nothing_changed(backend):
    capture_fixture(backend, price_amount=600, quantity=50, state="active")
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])

    sync_notion.run_sync(client, backend, "db-1", COMMENT_CONFIG, dry_run=False)

    assert client.comments == []


def test_comments_disabled_by_config(backend):
    capture_fixture(backend, quantity=1)
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page])

    # CONFIG omits comments_enabled → defaults off; the update still happens.
    sync_notion.run_sync(client, backend, "db-1", CONFIG, dry_run=False)

    assert len(client.updates) == 1
    assert client.comments == []


def test_comment_failure_does_not_block_update(backend):
    capture_fixture(backend, quantity=1)
    page = make_page("page-1", "SKU-1", price=6.0, quantity=50, status="Active")
    client = FakeNotionClient(DB_SCHEMA, [page], comment_error=True)

    summary = sync_notion.run_sync(client, backend, "db-1", COMMENT_CONFIG, dry_run=False)

    assert summary["updates"] == 1
    assert len(client.updates) == 1  # the page write still landed
    assert client.comments == []  # comment raised and was swallowed


def test_changes_comment_text_formats_values():
    from datetime import datetime, timezone

    now = datetime(2026, 7, 20, 8, 49, tzinfo=timezone.utc)
    text = sync_notion.changes_comment_text(
        {
            "Views": {"from": 8, "to": 13},
            "Tags": {"from": None, "to": ["a", "b"]},
        },
        now=now,
    )
    assert text.splitlines()[0] == "Etsy → Notion sync · 2026-07-20 08:49 UTC"
    assert "Tags: — → a, b" in text  # empty before-value renders as an em dash
    assert "Views: 8 → 13" in text


def test_changes_comment_text_caps_long_value():
    change = {"Description": {"from": "old", "to": "x" * 5000}}
    text = sync_notion.changes_comment_text(change)
    assert len(text) <= sync_notion.RICH_TEXT_LIMIT
