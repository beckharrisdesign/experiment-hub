# Known-good seed packet fixtures

Add packet fixtures here when you want to prove seed scanning is working.

Each fixture should include:

- a stable `name`
- expected canonical seed metadata in `expected`
- either packet image paths in `images` or deterministic transcript/model output
- optional field `tolerances` for values that should be compared after normalization

Default tests use local transcripts or mocked outputs only, so they do not call
OpenAI or consume AI tokens. Live OCR/AI evaluation should stay opt-in behind an
environment variable and should report field-level failures with fixture name,
technique, expected value, and actual value.
