# MCP Toolkit for macOS

[Install from iCloud](https://www.icloud.com/shortcuts/a38cb4a66ec74df7bc272b809ad60c6f) or open `MCP Toolkit.shortcut` from this directory in the Mac Shortcuts app.

MCP Toolkit was made and tested for macOS. iPhone and iPad compatibility has not been verified.

## Build locally

Run these commands from the repository root with Bun installed. Signing requires Apple's CLI and a Mac signed into iCloud.

```sh
bun install --frozen-lockfile
bun run build
shortcuts sign --mode anyone --input 'dist/MCP Toolkit.shortcut' --output 'releases/MCP Toolkit.shortcut'
open 'releases/MCP Toolkit.shortcut'
```

The workflow name and import filename are both MCP Toolkit. The release file is allowlisted for Git; other generated shortcut files remain ignored.

After changing the builder, test the affected flows in Shortcuts before distributing a replacement release.
