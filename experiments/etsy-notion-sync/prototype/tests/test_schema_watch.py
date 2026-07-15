import schema_watch


def test_key_signature_includes_one_level_nested_keys():
    payload = {
        "listing_id": 1,
        "price": {"amount": 600, "divisor": 100},
        "images": [{"url": "https://example.com/a.jpg"}],
        "tags": ["a", "b"],
    }
    keys = schema_watch.key_signature(payload)
    assert "listing_id" in keys
    assert "price.amount" in keys
    assert "images.url" in keys  # first list element stands in for list shape
    assert "tags" in keys
    assert "price.amount.nested" not in keys  # only one level deep


def test_detect_new_keys_only_reports_unseen():
    known = {"listing_id", "price", "price.amount"}
    payload = {"listing_id": 1, "price": {"amount": 600, "buyer_fee": 12}}
    new = schema_watch.detect_new_keys(known, payload)
    assert set(new) == {"price.buyer_fee"}
    assert "12" in new["price.buyer_fee"]


def test_non_dict_payload_is_harmless():
    assert schema_watch.key_signature(["not", "a", "dict"]) == {}
