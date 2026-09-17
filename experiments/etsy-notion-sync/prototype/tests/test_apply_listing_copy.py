import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import apply_listing_copy as alc


def entry(lid=4465356349, **overrides):
    e = {
        "listing_id": lid,
        "group": "treatment",
        "title": "Leaf Fan Hand Embroidery Pattern PDF, Striped Botanical Hoop Art",
        "tags": ["tag{}".format(i) for i in range(13)],
    }
    e.update(overrides)
    return e


class FakeResponse:
    def __init__(self, status_code=200, body=None, headers=None, text=""):
        self.status_code = status_code
        self._body = body or {}
        self.headers = headers or {}
        self.text = text

    def json(self):
        return self._body


def echo_patch(url, headers=None, data=None, timeout=None):
    return FakeResponse(200, {"title": data["title"], "tags": data["tags"].split(",")})


# --- validate ---

def test_validate_accepts_good_entry():
    assert alc.validate([entry()]) == []


def test_validate_refuses_protected_and_control():
    errs = alc.validate([entry(lid=4415035303), entry(lid=4466791377)])
    assert len(errs) == 2
    assert all("protected/control" in e for e in errs)


def test_validate_refuses_string_id_bypass():
    # A quoted protected id must not slip past the membership check.
    e = entry(lid="4415035303")
    errs = alc.validate([e])
    assert any("protected/control" in msg for msg in errs)
    assert e["listing_id"] == 4415035303  # normalized to int


def test_validate_refuses_non_numeric_id():
    assert any("not an integer" in msg for msg in alc.validate([entry(lid="abc")]))


def test_validate_tag_rules():
    errs = alc.validate([entry(tags=["x" * 21] + ["t{}".format(i) for i in range(12)])])
    assert any("21 chars" in e for e in errs)
    errs = alc.validate([entry(tags=["ok"] * 13)])
    assert any("duplicate" in e for e in errs)
    errs = alc.validate([entry(tags=["bad_tag!"] + ["t{}".format(i) for i in range(12)])])
    assert any("characters Etsy rejects" in e for e in errs)
    errs = alc.validate([entry(tags=["only", "two"])])
    assert any("2 tags" in e for e in errs)


def test_validate_title_length():
    errs = alc.validate([entry(title="x" * 141)])
    assert any("141 chars" in e for e in errs)


# --- apply_updates ---

def test_apply_sends_form_fields_and_verifies_echo():
    seen = []

    def patch(url, headers=None, data=None, timeout=None):
        seen.append((url, data))
        return echo_patch(url, headers, data, timeout)

    e = entry()
    updated, failed, aborted = alc.apply_updates([e], "5568941", {}, patch=patch, sleep=lambda s: None)
    assert (updated, failed, aborted) == (1, 0, False)
    url, data = seen[0]
    assert url.endswith("/shops/5568941/listings/{}".format(e["listing_id"]))
    assert data["title"] == e["title"]
    assert data["tags"] == ",".join(e["tags"])  # comma-joined, per Etsy's form/explode=false schema


def test_apply_aborts_remaining_on_echo_mismatch():
    def patch(url, headers=None, data=None, timeout=None):
        return FakeResponse(200, {"title": data["title"], "tags": ["something", "else"]})

    entries = [entry(lid=4465356349), entry(lid=4465359686)]
    updated, failed, aborted = alc.apply_updates(entries, "5568941", {}, patch=patch, sleep=lambda s: None)
    assert (updated, failed, aborted) == (0, 1, True)


def test_apply_counts_http_failures_and_continues():
    calls = {"n": 0}

    def patch(url, headers=None, data=None, timeout=None):
        calls["n"] += 1
        if calls["n"] == 1:
            return FakeResponse(500, text="boom")
        return echo_patch(url, headers, data, timeout)

    entries = [entry(lid=4465356349), entry(lid=4465359686)]
    updated, failed, aborted = alc.apply_updates(entries, "5568941", {}, patch=patch, sleep=lambda s: None)
    assert (updated, failed, aborted) == (1, 1, False)


def test_apply_catches_request_exceptions():
    import requests

    def patch(url, headers=None, data=None, timeout=None):
        raise requests.ConnectionError("network down")

    updated, failed, aborted = alc.apply_updates([entry()], "5568941", {}, patch=patch, sleep=lambda s: None)
    assert (updated, failed, aborted) == (0, 1, False)


def test_apply_honors_429_retry_after():
    calls = {"n": 0}
    slept = []

    def patch(url, headers=None, data=None, timeout=None):
        calls["n"] += 1
        if calls["n"] == 1:
            return FakeResponse(429, headers={"retry-after": "2"})
        return echo_patch(url, headers, data, timeout)

    updated, failed, aborted = alc.apply_updates([entry()], "5568941", {}, patch=patch, sleep=slept.append)
    assert (updated, failed, aborted) == (1, 0, False)
    assert 2.0 in slept


# --- the shipped payload ---

def test_shipped_payload_validates():
    path = os.path.join(os.path.dirname(__file__), "..", "listing_copy_2026-09.json")
    entries = json.load(open(path))["listings"]
    assert len(entries) == 13
    assert alc.validate(entries) == []
