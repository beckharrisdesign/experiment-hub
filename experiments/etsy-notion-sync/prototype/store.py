"""Append-only SQLite store for historical Etsy captures.

Rows in listing_snapshots are never mutated or deleted (SPEC ancestry
requirement). Each snapshot points at the previous snapshot for the same
(listing_id, endpoint) via previous_record_id.
"""
import json
import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS listing_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at TEXT NOT NULL,
  etsy_api_version TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  listing_id INTEGER NOT NULL,
  sku TEXT,
  raw_response TEXT NOT NULL,
  parsed TEXT NOT NULL,
  previous_record_id INTEGER REFERENCES listing_snapshots(id)
);
CREATE INDEX IF NOT EXISTS idx_snapshots_listing_time
  ON listing_snapshots (listing_id, captured_at);

CREATE TABLE IF NOT EXISTS schema_keys (
  endpoint TEXT NOT NULL,
  key TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  sample_value TEXT,
  PRIMARY KEY (endpoint, key)
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  summary TEXT
);
"""


def connect(path):
    conn = sqlite3.connect(path)
    conn.executescript(SCHEMA)
    return conn


def append_snapshot(conn, captured_at, etsy_api_version, endpoint, listing_id, sku,
                    raw_response, parsed):
    previous = conn.execute(
        "SELECT id FROM listing_snapshots WHERE listing_id = ? AND endpoint = ?"
        " ORDER BY id DESC LIMIT 1",
        (listing_id, endpoint),
    ).fetchone()
    cursor = conn.execute(
        "INSERT INTO listing_snapshots"
        " (captured_at, etsy_api_version, endpoint, listing_id, sku,"
        "  raw_response, parsed, previous_record_id)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            captured_at,
            etsy_api_version,
            endpoint,
            listing_id,
            sku,
            json.dumps(raw_response),
            json.dumps(parsed),
            previous[0] if previous else None,
        ),
    )
    conn.commit()
    return cursor.lastrowid


def known_keys(conn, endpoint):
    rows = conn.execute("SELECT key FROM schema_keys WHERE endpoint = ?", (endpoint,))
    return {row[0] for row in rows}


def record_keys(conn, endpoint, new_keys, seen_at):
    """Persist newly seen keys; new_keys is {key: sample_value}."""
    conn.executemany(
        "INSERT OR IGNORE INTO schema_keys (endpoint, key, first_seen_at, sample_value)"
        " VALUES (?, ?, ?, ?)",
        [(endpoint, key, seen_at, sample) for key, sample in new_keys.items()],
    )
    conn.commit()


def latest_parsed_by_listing(conn, endpoint):
    """{listing_id: {"parsed": ..., "sku": ..., "captured_at": ...}} for the newest snapshot per listing."""
    rows = conn.execute(
        "SELECT listing_id, sku, parsed, captured_at FROM listing_snapshots"
        " WHERE endpoint = ? AND id IN ("
        "   SELECT MAX(id) FROM listing_snapshots WHERE endpoint = ? GROUP BY listing_id"
        " )",
        (endpoint, endpoint),
    )
    return {
        row[0]: {"sku": row[1], "parsed": json.loads(row[2]), "captured_at": row[3]}
        for row in rows
    }


def start_run(conn, started_at):
    cursor = conn.execute("INSERT INTO runs (started_at) VALUES (?)", (started_at,))
    conn.commit()
    return cursor.lastrowid


def finish_run(conn, run_id, finished_at, status, summary):
    conn.execute(
        "UPDATE runs SET finished_at = ?, status = ?, summary = ? WHERE id = ?",
        (finished_at, status, json.dumps(summary), run_id),
    )
    conn.commit()
