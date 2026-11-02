# MCP Toolkit demo script

Target: a roughly two-minute recording for the case study. This is a shot list and narration draft; no recording is included yet. Show actual native execution and keep any shortened waits apparent.

## Opening disclosure

Narration: “I created Shortcutkit. I used it with a coding agent to build this working MCP client in Apple Shortcuts. Here is what the prototype does today.”

On screen: MCP Toolkit in the macOS Shortcuts app. Include the source and package links in the accompanying post, rather than inside the input flow.

## 1. A URL becomes a tool menu

Choose New tool call, then Add URL. Paste:

```text
https://publicsurplus-production.up.railway.app/mcp
```

Use a demo name such as “Auction Demo.” Show the tools returned by the live request. If the endpoint is already saved, explicitly choose Refresh tools rather than presenting cached data as a new discovery.

Narration: “The shortcut fetches this server's tools and input schemas at runtime. These tool names are not built into its source.”

## 2. Fill in a small request

Choose `search_lots` and enter `3` for `limit`. Show the schema-provided description and input prompts. Save the request as “Auction demo,” then briefly show the actual endpoint, tool, and arguments in the review before submitting.

Narration: “The schema drives the prompts. Basic fields have native inputs; complex schemas still need JSON entry.”

## 3. Inspect a response

Choose Structured data or Readable text. Show what is actually returned, even if there are no matches. Some servers put JSON inside text blocks; do not present that as polished record formatting.

Narration: “There are text, structured-data, and raw-response views. Structured data still needs better formatting.”

For a plain-text example, optionally use PublicSurplus `search_lots` with `limit: 3`:

```text
https://publicsurplus-production.up.railway.app/mcp
```

Its Readable text view is a clearer demonstration of text extraction. A second server also demonstrates that the tool menu changes with the endpoint.

## 4. Reuse and combine saved calls

Before recording this segment, save a second small read-only request and name it clearly. Select Run multiple saved calls and choose the two demo requests. Show the review order, submit, and scroll the combined output far enough to reveal both labeled sections.

Narration: “Saved requests retain their endpoint and arguments in global storage. A batch runs them sequentially and combines the results. These are independent calls; one result is not fed into the next.”

## Closing

Narration: “This is a tested prototype for stateless HTTP MCP servers returning JSON. The repo includes the builder, regression tests, small experiments, and the native-runtime lessons we found.”

Link the case study, [shared macOS shortcut](https://www.icloud.com/shortcuts/a38cb4a66ec74df7bc272b809ad60c6f), and Shortcutkit source/packages in the post. State that the shortcut was made for macOS; iPhone and iPad compatibility has not been verified. Avoid claiming compatibility with every MCP server or full protocol compliance.

## Recording preparation

Use only demo server names and arguments. Hide unrelated shortcuts, notifications, account names, and existing saved-call lists. Do not capture global storage containing personal queries or credentials. Use small read-only requests so the recording does not depend on a long result set or external changes.

The server's listings and counts change. Record fresh results and avoid scripting exact prices, counts, or titles. If a request fails during recording, capture the retry honestly or explain the cut.
