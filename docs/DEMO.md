# MCP Toolkit demo script

Plan for a two-minute macOS recording. No video is included yet.

## Prepare

Save two small read-only requests for the batch segment. Use demo names and arguments. Hide unrelated shortcuts, notifications, account names, and stored personal data. Show fresh results; do not script prices, counts, or titles. Make shortened waits and retries apparent.

## Opening

Show MCP Toolkit in Shortcuts.

Narration: “I created Shortcutkit and used it with a coding agent to build this MCP client in Apple Shortcuts.”

## 1. Discover tools

Choose New tool call, then Add URL. Paste `https://publicsurplus-production.up.railway.app/mcp` and name the server “Auction Demo.” Choose Refresh tools if cached definitions exist. Show the returned menu.

Narration: “The shortcut fetches this server's tools and input schemas when it runs.”

## 2. Make a request

Choose `search_lots`, select `limit`, and enter `3`. Show the prompts, save as “Auction demo,” then review the endpoint and arguments before sending.

Narration: “Basic fields use native prompts. Complex inputs still need JSON entry.”

## 3. Inspect the response

Choose Readable text or Structured data. Show the returned result, including empty results or JSON embedded in text.

Narration: “You can view text, structured data, or the raw response. Structured data still needs formatting.”

## 4. Run saved calls

Choose Run multiple saved calls and select the two demo requests. Show the review order and both sections of the combined output.

Narration: “Saved calls retain their arguments. A batch runs them in sequence; results do not feed into later calls.”

## Closing

Narration: “This prototype supports stateless HTTP MCP servers returning JSON. I tested it on macOS; iPhone and iPad compatibility is unverified.”

Include the [case study](../CASE-STUDY.md), [shortcut](https://www.icloud.com/shortcuts/a38cb4a66ec74df7bc272b809ad60c6f), and Shortcutkit source/package links in the accompanying post.
