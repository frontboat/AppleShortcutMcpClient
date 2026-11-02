# Project status

Last reviewed: November 2, 2026.

## Working baseline

**MCP Toolkit** is a working prototype for macOS Shortcuts. It discovers MCP tools at runtime, prompts for arguments, reviews requests before sending, and displays responses. It also supports saved servers, cached tool definitions, saved requests, and sequential batches.

[Install from iCloud](https://www.icloud.com/shortcuts/a38cb4a66ec74df7bc272b809ad60c6f), or build from `scripts/build.mts` and its helpers in `src/`. The signed artifact is `releases/MCP Toolkit.shortcut`.

The runtime client has been tested interactively in the Mac Shortcuts app. iPhone and iPad compatibility has not been verified.

## Verified behavior

Native tests covered:

- Live tool discovery and schema-driven field selection.
- MCP `2026-07-28` requests with protocol metadata and method/name/version headers.
- Text and numeric inputs, request serialization, and request review.
- Readable text output and separate structured/raw response views.
- Global server storage, persistence across runs, and reuse of cached tool definitions.
- Named tool-call storage and replay.
- Multi-selection of saved calls, sequential execution, and combined output.

These observations cover the tested paths rather than every server, schema, or failure case. Automated tests inspect generated structures and encodings; they do not execute Apple's runtime.

## Storage and execution

A saved server maps a friendly name to an endpoint URL. The tool cache stores the complete tools/list response as text, including input and output schemas. Cache reuse and refresh are explicit. An invalid refresh does not overwrite the saved copy; network errors do not automatically fall back to it.

A saved call stores the endpoint and full request body, not a previous result. Replay reuses those arguments and protocol metadata. It does not validate the saved request against a newly fetched schema before sending.

Batch review shows each request and the actual execution order. Calls run sequentially and independently. Tool-reported errors remain in the report while later calls continue; native network or permission failures can stop the batch. There is no output-to-input binding, ordering editor, retry interface, or partial-result persistence.

## Display and examples

The main viewer offers Readable text, Structured data, and Raw response. Text blocks retain their line breaks. JSON embedded in a text block remains JSON; the structured-data view does not yet format nested records.

`examples/display/build.mts` generates four small experiments:

| Lab | Purpose | Verification |
| --- | --- | --- |
| Tools | Inspect discovered tools, required inputs, and schemas | Native execution tested |
| Text | Display server text without the JSON-RPC envelope | Native execution tested |
| Structured | Display a synthetic structured value | Builder checked; current fixture needs native verification |
| Field View | Discover record keys and display labeled fields | Builder checked; current fixture needs native verification |

Field View is separate from the main client. Nested objects still appear as JSON, field order follows the data, and labels/spacing need refinement. `outputSchema` is cached but is not used to guide rendering yet.

## Known limitations

The supported transport is stateless HTTP POST returning JSON. Requests advertise MCP `2026-07-28`; there is no protocol-version negotiation.

Basic strings, numbers, integers, enums, and direct local `$defs` references have input handling. Complex schemas generally use JSON entry, and the server enforces constraints.

Not implemented: OAuth, SSE parsing, stdio, automatic discovery/result pagination, complete schema validation, resources/prompts, subscriptions, multi-round-trip requests, media rendering, cache TTL enforcement, or saved-item editing/deletion.

## Next work

1. Render structured data using optional output-schema descriptions and types.
2. Improve nested, array, nullable, boolean, and composed-schema inputs.
3. Add cache freshness metadata and server-provided cache hints.
4. Add saved-server/call management and schema-change handling on replay.
5. Add protocol negotiation and richer transport/error handling.
6. Native-test the synthetic display labs.
7. Evaluate named batches and dependency chaining as separate features.

## Validation and maintenance

The client generates 416 native actions. Current automated checks comprise a TypeScript check, nine regression tests, the client build, and the display-lab build.

```sh
bun install --frozen-lockfile
bun run check
bun test
bun run build
bun run build:labs
```

Update this document when functionality, verification scope, or next steps change. Keep native test observations distinct from generator tests. See the [Shortcutkit guide](SHORTCUTKIT.md) for implementation patterns and the [case study](../CASE-STUDY.md) for the development story.
