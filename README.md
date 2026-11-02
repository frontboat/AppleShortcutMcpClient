# MCP Toolkit for macOS

[AppleShortcutMcpClient source](https://github.com/frontboat/AppleShortcutMcpClient)

A case study and working prototype: paste an MCP URL, discover its tools, fill in schema-driven prompts, and execute requests through native Apple Shortcuts on macOS. Save servers and requests globally, or combine multiple saved calls into one report. No AI model runs inside the shortcut.

**[Read the case study →](CASE-STUDY.md)**

I created [Shortcutkit](https://github.com/frontboat/shortcutkit), the library used to generate this project. I built MCP Toolkit with a coding agent and tested the generated shortcuts in Apple's app. This case study documents that development process, including builder mistakes, native-runtime surprises, and the limits of what we verified.

Shortcutkit: [source](https://github.com/frontboat/shortcutkit) · [TypeScript package on npm](https://www.npmjs.com/package/shortcutkit) · [Python package on PyPI](https://pypi.org/project/shortcutkit/). This project uses the TypeScript package; the Python package was not used for the current client.

[Demo recording script](docs/DEMO.md).

Try **MCP Toolkit** from the [shared iCloud shortcut](https://www.icloud.com/shortcuts/a38cb4a66ec74df7bc272b809ad60c6f), or [build and sign it locally](releases/README.md). Native testing verified discovery, schema prompts, global storage, saved-call replay, and combined batch output in Apple's runtime. This is a prototype for stateless HTTP JSON endpoints, not a complete MCP implementation.

## Try it

MCP Toolkit was made for **macOS** and tested in the Mac Shortcuts app. iPhone and iPad compatibility has not been verified.

**[Get MCP Toolkit from iCloud](https://www.icloud.com/shortcuts/a38cb4a66ec74df7bc272b809ad60c6f)** — open the link on your Mac and add it to Shortcuts. No local build is required to try the shared version.

To import a locally built and signed copy instead:

```sh
open 'releases/MCP Toolkit.shortcut'
```

Choose **New tool call**, **Saved tool calls**, or **Run multiple saved calls**. New calls offer saved servers or Add URL, schema-cache reuse or refresh, tool selection, input prompts, optional request saving, and request review before sending.

Example endpoints used during development:

```text
https://publicsurplus-production.up.railway.app/mcp
https://bentleys-mcp.up.railway.app/mcp
```

Availability and tool definitions can change. A small read-only example is PublicSurplus’s `search_lots` with `limit: 3`.

Single calls offer readable text, structured data, and raw response views. JSON inside a server's text block remains JSON. Batch calls execute independent saved arguments sequentially and produce one labeled report; they do not pass results between calls.

## Build and verify

Use Bun. Dependency versions are recorded in `bun.lock`. The final `releases/MCP Toolkit.shortcut` is allowlisted for Git. Intermediate and historical shortcut builds remain ignored.

```sh
bun install --frozen-lockfile
bun run check
bun test
bun run build
```

The build writes `dist/MCP Toolkit.shortcut`. Sign locally with Apple’s CLI:

```sh
shortcuts sign --mode anyone --input 'dist/MCP Toolkit.shortcut' --output 'releases/MCP Toolkit.shortcut'
open 'releases/MCP Toolkit.shortcut'
```

Signing needs Apple's CLI and a Mac signed into iCloud. Generated structures and tests do not establish native execution correctness; import and test affected flows after changing menus, references, storage, or serialization.

`bun run build:labs` generates the four small display experiments in `dist/labs/`.

## Repository guide

| Path | Purpose |
| --- | --- |
| [CASE-STUDY.md](CASE-STUDY.md) | Problem, experiments, design decisions, results, and limitations |
| [scripts/build.mts](scripts/build.mts) | Current client builder |
| [src/](src/) | Global storage, saved calls/batches, and response-view helpers |
| [tests/](tests/) | Nine generator/structure regression tests |
| [examples/display/](examples/display/) | Small native display experiments |
| [releases/](releases/) | Final signed shortcut, allowlisted for Git, and local build instructions |
| `dist/` | Ignored generated builds |
| [archive/](archive/) | Earlier generic static generator and development notes |
| [docs/STATUS.md](docs/STATUS.md) | Detailed verification record, remaining work, and handoff |
| [docs/SHORTCUTKIT.md](docs/SHORTCUTKIT.md) | How we generate shortcuts and handle native encodings |

## Global storage

Every storage action explicitly enables Global Value. Re-imported shortcut versions reuse these keys:

| Key | Stored content |
| --- | --- |
| `mcp.servers.v1` | JSON mapping friendly names to URL strings |
| `mcp.tools.raw.2026-07-28.v1\|<endpoint>` | Complete tools/list response serialized as text |
| `mcp.calls.v1` | JSON mapping call names to serialized `endpoint` and `request` entries |

Schemas are manual snapshots: use saved schemas or refresh explicitly. Invalid/failed refreshes leave the saved copy intact, but network failures do not automatically switch to it. There are no timestamps or TTL enforcement yet.

Saved calls include their argument values and protocol metadata, not past results. Replay requires review. Global storage is shared with other shortcuts; do not assume secrets are protected. Cross-device syncing and export behavior have not been verified.

## Scope

Requests advertise MCP `2026-07-28` using version/method/name headers and per-request metadata. Supported RPCs are `tools/list` and `tools/call` over stateless HTTP POST with JSON responses. Successful tests do not establish full protocol compliance.

Not implemented: OAuth, SSE, stdio, version negotiation, full JSON Schema validation, automatic pagination, schema-aware output formatting, or result-to-input chaining. Tool errors can be displayed while batches continue; native network and permission failures can stop execution.

The archive contains the earlier static generator. Use the current builder in scripts/ for MCP Toolkit.

See [data handling](docs/PRIVACY.md) for request destinations, global storage, and result behavior.
