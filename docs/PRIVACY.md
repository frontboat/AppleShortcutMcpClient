# Data handling

## Requests

MCP Toolkit sends tool-discovery requests to the endpoint you select. When you run a tool, it sends that tool's arguments directly to the same endpoint. The request review shows the destination and request body before submission.

There is no AI model involved at runtime. The selected MCP service controls how it handles requests and returned data.

## Stored values

The shortcut uses native Shortcuts global storage for:

- Named server URLs.
- Complete tool-definition responses, including input and output schemas.
- Named requests containing their endpoint, tool arguments, and protocol metadata.

Global values are accessible to other shortcuts on the device. Saved arguments should not contain secrets. Cached definitions and saved requests persist across runs. Cross-device syncing and export behavior have not been verified.

The generated workflow contains actions that read stored values at runtime. It does not bundle a populated server registry, cached tool responses, or saved requests.

## Results

Single calls display text, structured data, or the raw response. Batch calls combine results into one report. Outputs can be shared or saved through the native preview interface; the shortcut does not automatically store a result history.

## Building and sharing

The final signed shortcut is distributed through the iCloud link and `releases/MCP Toolkit.shortcut`. Signed shortcut files include public certificate and archive metadata.

Development dependencies, intermediate builds, environment files, local exports, and signing keys are excluded by `.gitignore`. Only the final release shortcut is allowlisted among generated shortcut files.
