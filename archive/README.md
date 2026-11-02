# Static generator example

[The static generator](static/mcp-to-shortcut.mts) reads a saved `tools/list` response during building and emits fixed tool branches. See [its instructions](static/MCP-GENERATOR.txt) for usage.

The [current client](../README.md) interprets schemas at runtime. See its [builder](../scripts/build.mts), [helpers](../src/), and [tests](../tests/). The static generator's regression tests are included in the main test suite.
