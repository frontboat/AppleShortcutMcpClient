# Project status

Last reviewed: November 2, 2026.

## Verified behavior

Native tests in macOS Shortcuts covered:

- Live tool discovery and schema-driven field selection.
- MCP `2026-07-28` metadata and method/name/version headers.
- Text and numeric inputs, serialization, and request review.
- Text, structured, and raw response views.
- Saved servers, persistence across runs, and cached tool definitions.
- Named-call replay, multi-selection, sequential execution, and combined output.

These observations cover tested paths, not every server or schema. iPhone and iPad compatibility is unverified. Automated tests inspect generated structures; they do not execute Apple's runtime.

## Storage and execution

Server entries map names to URLs. The cache stores complete `tools/list` responses, including schemas. Users choose reuse or refresh; invalid refreshes preserve the cache, and network errors do not fall back to it.

Saved calls retain endpoints, arguments, and protocol metadata. Replay requires review but does not check the saved request against a fresh schema.

Batch review shows requests in execution order. Independent calls run in sequence. Tool errors remain in the report while later calls continue; native network or permission failures can stop the batch. There is no chaining, ordering editor, retry interface, or partial-result persistence.

## Display and examples

The viewer offers Readable text, Structured data, and Raw response. Text retains line breaks; embedded JSON and nested structured records remain unformatted.

`examples/display/build.mts` generates:

| Lab | Purpose | Verification |
| --- | --- | --- |
| Tools | Inspect tools, required inputs, and schemas | Native-tested |
| Text | Extract server text | Native-tested |
| Structured | Display a synthetic structured value | Builder checked; current fixture needs native testing |
| Field View | Display labeled record fields | Builder checked; current fixture needs native testing |

Field View remains separate. Field order follows the data; labels and spacing need refinement. Cached `outputSchema` does not guide rendering yet.

## Known limitations

Transport is stateless HTTP POST returning JSON. Requests advertise MCP `2026-07-28` without version negotiation.

Strings, numbers, integers, enums, and direct local `$defs` references have input handling. Complex schemas generally use JSON entry; servers enforce constraints.

Unsupported: OAuth, SSE parsing, stdio, automatic discovery/result pagination, complete schema validation, resources/prompts, subscriptions, multi-round-trip requests, media rendering, cache expiration, and saved-item editing/deletion.

## Next work

1. Render structured data using output schemas.
2. Improve nested, array, nullable, boolean, and composed-schema inputs.
3. Add cache timestamps and server-provided freshness hints.
4. Add saved-item management and schema-change handling on replay.
5. Add version negotiation and transport/error handling.
6. Native-test the synthetic display fixtures.
7. Evaluate named batches and dependency chaining separately.

## Validation

The client generates 416 actions. Checks comprise a TypeScript check, nine regression tests, and client/lab builds:

```sh
bun install --frozen-lockfile
bun run check
bun test
bun run build
bun run build:labs
```

Record native test observations separately from automated results. See the [implementation guide](SHORTCUTKIT.md) for encoding and validation procedures.
