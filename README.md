# MCP Toolkit for macOS

Run Model Context Protocol (MCP) tools in Apple Shortcuts without an AI model. Paste a server URL, choose a tool, and enter its arguments. Save calls for reuse or combine several into one report.

This prototype supports stateless HTTP endpoints returning JSON. OAuth, SSE, and stdio are unsupported. Tested on macOS; iPhone and iPad compatibility is unverified.

## Try it

[Install MCP Toolkit from iCloud](https://www.icloud.com/shortcuts/a38cb4a66ec74df7bc272b809ad60c6f) on your Mac, then run it in Shortcuts.

1. Choose **New tool call**, then **Add URL…**.
2. Paste `https://publicsurplus-production.up.railway.app/mcp` and name the server. Choose **Refresh tools** if prompted about saved definitions.
3. Choose `search_lots`, select `limit`, and enter `3`. Fill in any required fields.
4. Save the call or run without saving. Review the request, then choose **Done** to send it.
5. Choose a response view: **Readable text**, **Structured data**, or **Raw response**.

The example endpoint and its tools can change. JSON inside text blocks remains JSON. Saved calls reuse their arguments; batches run independent calls in sequence.

Other shortcuts can access saved URLs, tool definitions, and arguments. Keep secrets out of saved arguments. See [data handling](docs/PRIVACY.md).

## Build and verify

From the repository root, with Bun installed:

```sh
bun install --frozen-lockfile
bun run check
bun test
bun run build
```

The build writes `dist/MCP Toolkit.shortcut`. Follow the [signing and import instructions](releases/README.md) to run it. Test changed flows in Shortcuts; automated checks inspect generated files, not native execution.

## About

I created [Shortcutkit](https://github.com/frontboat/shortcutkit), the TypeScript library used here, and built MCP Toolkit with a coding agent. The [case study](CASE-STUDY.md) describes the development and native testing.

See [project status](docs/STATUS.md) for verified behavior and limitations, the [implementation guide](docs/SHORTCUTKIT.md) for builder and storage details, and the [archive](archive/README.md) for the earlier static generator.
