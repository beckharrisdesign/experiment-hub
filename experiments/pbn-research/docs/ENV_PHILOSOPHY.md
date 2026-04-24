# Environment philosophy (PBN research)

**Goal:** spend time on research, not on Python packaging archaeology.

This experiment intentionally avoids:

- Notebooks that bootstrap their own venv or mutate `sys.path`
- A `packages/` tree that only works when `PYTHONPATH` is set correctly
- Multiple “if imports fail run this magic cell” recovery paths

Instead: **standard editable install** (`pip install -e .` from `experiments/pbn-research`) so `pbn_eval` is a normal import. The **default workflow is the Node/Express prototype** (`npm run pbn:ui` → `prototype/server.js`), which shells out to Python for pipelines; the CLI is for batching and automation.

If something breaks, the fix is almost always: reinstall in the interpreter you are actually using (`pip install -e ".[dev]"`), not chasing kernel menus.
