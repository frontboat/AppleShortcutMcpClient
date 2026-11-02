# Static generator example

`static/` contains the earlier tools/list-to-shortcut generator and its instructions. It reads a saved schema during building and emits fixed tool branches.

The current client interprets schemas at runtime. Its builder is in `scripts/`, helpers are in `src/`, and tests are in `tests/`. The static generator's regression tests are included in the main test suite.
