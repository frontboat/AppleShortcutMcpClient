# How this repo uses Shortcutkit

This guide documents our use of the installed `shortcutkit` 3.1.0 package. It complements [project status](STATUS.md) and the [README](../README.md); it is not a complete Shortcutkit API reference.

The project author is also Shortcutkit’s creator. Official links: [source](https://github.com/frontboat/shortcutkit), [npm](https://www.npmjs.com/package/shortcutkit), and [PyPI](https://pypi.org/project/shortcutkit/). This repo uses its TypeScript package.

## What runs where

Shortcutkit is our build-time library. Bun executes `.mts` TypeScript modules that append native Apple Shortcuts actions to a workflow and write a `.shortcut` file. Apple's CLI signs the file; Shortcuts imports and executes it.

```text
TypeScript builders → Shortcutkit action graph → unsigned .shortcut
→ Apple signing → imported shortcut → native Shortcuts execution
```

The generated shortcut does not require Bun, TypeScript, Shortcutkit, or an AI model at runtime. Its HTTP requests, menus, storage, and previews are native Shortcuts actions.

Our current builder generates a runtime MCP interpreter. Tool discovery and prompts happen when the shortcut runs. The earlier `archive/static/mcp-to-shortcut.mts` generator instead reads a schema snapshot during building and emits fixed tool branches. Both use Shortcutkit, but the timing of schema interpretation differs.

## Build entry point and modules

`scripts/build.mts` creates one `Shortcut` and passes it into helper functions. Each helper appends actions to the same workflow:

| Module | Actions it generates |
| --- | --- |
| `src/mcp-global-storage.mts` | Read global registry, choose/add a server, update stored URLs |
| `scripts/build.mts` | Read/refresh schema cache, discover tools, interpret input fields, review and send requests |
| `src/mcp-response-viewer.mts` | Extract text, show structured content, preserve raw responses |
| `src/mcp-saved-calls.mts` | Save/replay requests, select multiple calls, review and execute a batch |
| `examples/display/build.mts` | Separate small shortcuts for testing display patterns |

Calling a helper during building emits actions. It does not make the MCP request or read the user's global storage on the build machine.

## Actions and references

We use `s.action(actions.<name>, parameters)` to append an action. Its return value describes the generated action; it is not the result that action will produce on a device.

```ts
import { Shortcut, actions, ref, text } from 'shortcutkit';

const s = new Shortcut('Example');
const input = s.action(actions.ask, {
  WFInputType: 'Text',
  WFAskActionPrompt: text('Enter a value'),
});
s.action(actions.showresult, {
  Text: text('You entered: ', ref(input)),
});
await s.write('Example.shortcut');
```

Our main reference helpers are:

| Helper | Use |
| --- | --- |
| `ref(action)` | Read a prior action's output at runtime |
| `text(...parts)` | Build text containing literals and runtime references |
| `variable(name)` | Read a named runtime variable |
| `coerce(source, className)` | Explicitly read a reference as a Shortcuts content type |
| `dictionary(items)` | Encode a Shortcuts dictionary parameter, including item type codes |

For example, `text(ref(input))` preserves a runtime reference. Ordinary JavaScript interpolation such as `` `${ref(input)}` `` stringifies the descriptor during building and does not connect the actions.

We use the local `V` alias, `Attachment<Exclude<VariableType, 'Ask'>>`, for references accepted by variable-picker parameters. An Ask for Input action's output is referenced with `ref(asked)`; the special Ask Each Time attachment is a different reference kind.

## Control flow

JavaScript control flow runs during generation. Shortcuts control-flow helpers emit actions that run later.

```ts
const group = s.if(coerce(input, 'WFStringContentItem'), 'is', 'yes');
// Append actions for the true branch here.
s.otherwise(group);
// Append actions for the false branch here.
s.endIf(group);
```

Keep the grouping identifier returned by each helper and close that same block. The same rule applies to `repeatEach`/`endRepeatEach`, `repeatCount`/`endRepeatCount`, and menu blocks.

### Menus

`chooseFromMenu` declares labels, and `menuItem` starts each corresponding branch. Emit branches in exactly the same order as the declared labels. We observed incorrect native routing when these orders differed; a regression test checks the startup menu.

`actions.choosefromlist` takes a runtime list. Setting `WFChooseFromListActionSelectMultiple: true` enables selection of several fields or saved calls.

For lists assembled from runtime outputs, we initialize a named variable and use `appendvariable` in a repeat. This pattern is verified in the saved-server and discovered-tool pickers. A List action mixing a literal and an output reference displayed “Text” in the saved-server test instead of the referenced names.

### Repeat scopes

Use `variable('Repeat Item')` and `variable('Repeat Index')` in a top-level repeat. In our tested nested loops, the inner loop needs `Repeat Item 2` and `Repeat Index 2`. The unqualified names selected the outer iteration and caused blank listing fields.

Adding another repeat around a helper can change its scope. Review helper references whenever changing the generated nesting; the TypeScript compiler does not check native repeat scope.

### Dynamic comparisons

Dictionary-derived values need explicit content types. We observed missing-parameter errors for text comparisons on generic Dictionary Value outputs. Coercing the subject to `WFStringContentItem` fixed tool-name, `$ref`, and schema-type comparisons.

The current builder also writes a variable-valued `WFConditionalActionString` onto the generated conditional's parameters because `s.if` accepts a literal string or number for its comparison argument. This is deliberate use of the action representation exposed by the installed version. Preserve the token-string encoding and verify it in the native editor when changing it.

For empty-text tests, we use Count Characters and a numeric comparison. An existing content item is not necessarily nonempty text; the earlier optional-field helper failed despite passing a local simulation.

## JSON and HTTP requests

We use `dictionary()` and Apple's dictionary-to-text conversion to escape arbitrary user strings. A singleton `{value: reference}` dictionary is serialized, then its wrapper is removed to obtain a JSON value fragment. That avoids hand-escaping quotes, backslashes, or line breaks.

Dictionary references default to Text items. For numeric input, we explicitly change the singleton item's `WFItemType` to `3` (Number) before serializing it. The earlier property-search builders also patch coordinate, radius, and offset items this way. A reference being sourced from a Number action does not by itself change the dictionary item type.

The runtime interpreter joins these JSON fragments into a complete JSON-RPC envelope. `actions.detect_dictionary` parses it before review. This is not complete JSON Schema validation, and Apple's dictionary parser accepts formats beyond strict JSON.

We send the serialized JSON through `actions.downloadurl` with:

- `WFHTTPMethod: 'POST'`.
- `WFHTTPBodyType: 'File'` and `WFRequestVariable` referencing the request text.
- Explicit content type, accepted response types, and MCP headers.

The raw body avoids encoding dynamic nested arguments as one JSON string. MCP protocol metadata is our application logic, not functionality provided by Shortcutkit.

The endpoint prompt uses `WFInputType: 'Text'`. A URL-typed input interpolated into a review message fetched the endpoint during native conversion and displayed an HTML response instead of the URL.

## Global storage

We generate `getstoredcontent` and `setstoredcontent` actions with `WFStoredContentGlobalValue: true`. Values are JSON serialized as text. On read, `detect_dictionary` restores dictionary access.

`setstoredcontent.WFInput` is a text parameter, so it receives `text(ref(serialized))`. Dictionary and picker inputs receive references in their parameter-specific forms. Do not assume every `WFInput` key has the same encoding.

See [the storage key table](../README.md#global-storage) for the registry, tools cache, and saved-call formats. Keeping those keys stable lets newly imported shortcut versions reuse the existing global values.

## Inspecting the installed catalog

Use the package's extracted definitions and types when checking parameter names or encodings:

```sh
bun -e 'import { actions, getDefinition } from "shortcutkit"; console.log(JSON.stringify(getDefinition(actions.setstoredcontent), null, 2));'
```

Relevant installed files include:

- `node_modules/shortcutkit/README.md`: public usage and API overview.
- `dist/index.d.ts`, `dist/values.d.ts`: action/reference APIs and encoded value types.
- `dist/generated/params.d.ts`: generated parameter types.
- `dist/index.js`: bundled action definitions, parameter-kind tables, and implementation.

The package exposes `getDefinition`, `getAction`, `PARAM_KINDS`, `PARAM_CHOICES`, and related catalog data. Upstream extraction and encoding documentation is also useful, but check the installed package before assuming upstream changes apply to this checkout.

## Build, sign, and validate

```sh
bun install
bun run build
shortcuts sign --mode anyone --input 'dist/MCP Toolkit.shortcut' --output 'releases/MCP Toolkit.shortcut'
open 'releases/MCP Toolkit.shortcut'
```

`Shortcut.sign()` is available in the package, but our workflow uses Apple's CLI explicitly after generation. The signed artifact is what we import. The plain `.shortcut` file remains a generated build artifact that can be inspected with `plutil` on macOS.

Run the regression tests and type checks listed in [README.md](../README.md#build-and-verify). Tests cover generated structures, earlier-output references, menu order, storage settings, and nested-loop references. They do not prove that the native engine resolves or executes those parameters correctly.

For an unfamiliar action or encoding, build a small diagnostic shortcut first. We used this approach to isolate discovery, direct dictionary access, missing fields, repeats, current location, numeric request values, pagination, text extraction, and record formatting before integrating them.

After changing menus, coercions, loops, storage, or request serialization:

1. Typecheck and inspect the generated action parameters.
2. Run the relevant structural regression tests.
3. Rebuild and sign the artifact.
4. Import and execute the affected path in Shortcuts.
5. Record native verification separately from generated-file test results.
