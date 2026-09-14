import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import create_draft_listings as cdl


def payload(**overrides):
    p = {
        "template": {"taxonomy_id": 88, "who_made": "i_did", "when_made": "2020_2026",
                     "is_supply": True, "type": "download"},
        "listings": [{
            "name": "Christmas Bow",
            "title": "Christmas Bow Hand Embroidery Pattern PDF, Holiday Hoop Art",
            "tags": ["tag{}".format(i) for i in range(13)],
            "description": "A description.",
            "price": 6.0,
            "quantity": 50,
        }],
    }
    p.update(overrides)
    return p


class FakeResponse:
    def __init__(self, status_code=201, body=None, text=""):
        self.status_code = status_code
        self._body = body or {}
        self.text = text

    def json(self):
        return self._body


def draft_post(url, headers=None, data=None, timeout=None):
    return FakeResponse(201, {"listing_id": 42, "state": "draft", "title": data["title"]})


def test_validate_accepts_good_payload():
    assert cdl.validate(payload()) == []


def test_validate_requires_template_fields():
    p = payload(template={"taxonomy_id": 88})
    errs = cdl.validate(p)
    assert any("who_made" in e for e in errs)


def test_validate_requires_description_price_quantity():
    p = payload()
    p["listings"][0].update(description="", price=0, quantity=0)
    errs = cdl.validate(p)
    assert any("description" in e for e in errs)
    assert any("price" in e for e in errs)
    assert any("quantity" in e for e in errs)


def test_validate_tag_rules_shared_with_applier():
    p = payload()
    p["listings"][0]["tags"] = ["x" * 21] + ["t{}".format(i) for i in range(12)]
    assert any("21 chars" in e for e in cdl.validate(p))


def test_create_sends_template_and_form_fields():
    seen = []

    def post(url, headers=None, data=None, timeout=None):
        seen.append((url, data))
        return draft_post(url, headers, data, timeout)

    created, failed = cdl.create_drafts(payload(), "5568941", {}, post=post, sleep=lambda s: None)
    assert (len(created), failed) == (1, 0)
    assert created[0] == ("Christmas Bow", 42)
    url, data = seen[0]
    assert url.endswith("/shops/5568941/listings")
    assert data["type"] == "download" and data["taxonomy_id"] == 88
    assert data["is_supply"] == "true"
    assert data["tags"] == ",".join(payload()["listings"][0]["tags"])


def test_create_flags_non_draft_response():
    def post(url, headers=None, data=None, timeout=None):
        return FakeResponse(201, {"listing_id": 43, "state": "active", "title": data["title"]})

    created, failed = cdl.create_drafts(payload(), "5568941", {}, post=post, sleep=lambda s: None)
    assert (created, failed) == ([], 1)


def test_create_counts_failures_and_continues():
    p = payload()
    p["listings"] = [dict(p["listings"][0]), dict(p["listings"][0], name="Second")]
    calls = {"n": 0}

    def post(url, headers=None, data=None, timeout=None):
        calls["n"] += 1
        if calls["n"] == 1:
            return FakeResponse(400, text="boom")
        return draft_post(url, headers, data, timeout)

    created, failed = cdl.create_drafts(p, "5568941", {}, post=post, sleep=lambda s: None)
    assert (len(created), failed) == (1, 1)


def test_shipped_payload_validates():
    path = os.path.join(os.path.dirname(__file__), "..", "holiday_drafts_2026.json")
    p = json.load(open(path))
    assert len(p["listings"]) == 9
    assert cdl.validate(p) == []


def test_create_sets_personalization_when_present():
    calls = []

    def post(url, headers=None, data=None, timeout=None):
        calls.append((url, data))
        if url.endswith("/personalization"):
            return FakeResponse(200, {"is_personalizable": True})
        return draft_post(url, headers, data, timeout)

    p = payload()
    p["listings"][0]["personalization"] = {
        "instructions": "Optional custom text", "is_required": False, "char_count_max": 40}
    created, failed = cdl.create_drafts(p, "5568941", {}, post=post, sleep=lambda s: None)
    assert (len(created), failed) == (1, 0)
    purl, pdata = calls[1]
    assert purl.endswith("/listings/42/personalization")
    assert pdata["is_personalizable"] == "true"
    assert pdata["personalization_is_required"] == "false"
    assert pdata["personalization_char_count_max"] == 40


def test_create_counts_personalization_failure():
    def post(url, headers=None, data=None, timeout=None):
        if url.endswith("/personalization"):
            return FakeResponse(500, text="boom")
        return draft_post(url, headers, data, timeout)

    p = payload()
    p["listings"][0]["personalization"] = {"instructions": "x", "is_required": False, "char_count_max": 40}
    created, failed = cdl.create_drafts(p, "5568941", {}, post=post, sleep=lambda s: None)
    assert (created, failed) == ([], 1)
