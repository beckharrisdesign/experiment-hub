"""Schema drift detection: notice when Etsy responses grow new fields.

Per SPEC.md, we track top-level and one-level-nested keys per endpoint and
log a "new field detected" notice the first time a key appears.
"""
import json

SAMPLE_MAX_CHARS = 120


def _sample(value):
    try:
        text = json.dumps(value, default=str)
    except (TypeError, ValueError):
        text = repr(value)
    if len(text) > SAMPLE_MAX_CHARS:
        text = text[:SAMPLE_MAX_CHARS] + "…"
    return text


def key_signature(payload):
    """Map of top-level and one-level-nested keys to a truncated sample value.

    Nested keys are dotted ("price.amount"). For list values, the first dict
    element stands in for the list's shape ("images.url_570xN").
    """
    keys = {}
    if not isinstance(payload, dict):
        return keys
    for key, value in payload.items():
        keys[key] = _sample(value)
        child = value[0] if isinstance(value, list) and value else value
        if isinstance(child, dict):
            for child_key, child_value in child.items():
                keys["{}.{}".format(key, child_key)] = _sample(child_value)
    return keys


def detect_new_keys(known_keys, payload):
    """Return {key: sample_value} for keys in payload not present in known_keys."""
    current = key_signature(payload)
    return {key: sample for key, sample in current.items() if key not in known_keys}
