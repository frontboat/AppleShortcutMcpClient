# How this repo uses Shortcutkit

Implementation notes for the installed `shortcutkit` 3.1.0 TypeScript package.

## What runs where

Our `.mts` builders run in Bun and use Shortcutkit to write native actions to a `.shortcut` file:

```text
TypeScript builders → Shortcutkit action graph → unsigned .shortcut
→ Apple signing → imported shortcut → native Shortcuts execution
```

The imported shortcut handles HTTP, menus, storage, and previews without Bun or an AI model. It interprets tool schemas at runtime; the [archived generator](../archive/README.md) interprets a snapshot during building.

## Build entry point and modules

`scripts/build.mts` passes one `Shortcut` to helpers that append actions:

| Module | Actions it generates |
| --- | --- |
| `src/mcp-global-storage.mts` | Read global registry, choose/add a server, update stored URLs |
| `scripts/build.mts` | Read/refresh schema cache, discover tools, interpret input fields, review and send requests |
| `src/mcp-response-viewer.mts` | Extract text, show structured content, preserve raw responses |
| `src/mcp-saved-calls.mts` | Save/replay requests, select multiple calls, review and execute a batch |
| `examples/display/build.mts` | Separate small shortcuts for testing display patterns |

## Actions and references

`s.action(actions.<name>, parameters)` appends an action and returns its descriptor, not its runtime output.

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

| Helper | Use |
| --- | --- |
| `ref(action)` | Read a prior action's output at runtime |
| `text(...parts)` | Build text containing literals and runtime references |
| `variable(name)` | Read a named runtime variable |
| `coerce(source, className)` | Explicitly read a reference as a Shortcuts content type |
| `dictionary(items)` | Encode a Shortcuts dictionary parameter, including item type codes |

`text(ref(input))` preserves a runtime reference. JavaScript interpolation such as `` `${ref(input)}` `` stringifies the descriptor during building instead of connecting actions.

The local `V` alias, `Attachment<Exclude<VariableType, 'Ask'>>`, types variable-picker references. Use `ref(asked)` for Ask for Input output; Ask Each Time is a separate attachment kind.

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

Because `s.if` accepts a literal string or number as its comparison argument, the builder writes variable-valued `WFConditionalActionString` into the generated parameters. Preserve its token-string encoding and verify changes in the native editor.

For empty-text tests, we use Count Characters and a numeric comparison. An existing content item is not necessarily nonempty text; the earlier optional-field helper failed despite passing a local simulation.

## JSON and HTTP requests

To escape user strings, we serialize a singleton `{value: reference}` using `dictionary()` and Apple's dictionary-to-text conversion, then remove the wrapper. The resulting JSON fragment preserves quotes, backslashes, and line breaks.

Dictionary references default to Text items, even when sourced from Number actions. For numeric input, set the singleton item's `WFItemType` to `3` (Number) before serialization. Earlier property-search builders do this for coordinates, radius, and offset.

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

Imported versions reuse these keys:

| Key | Stored content |
| --- | --- |
| `mcp.servers.v1` | JSON mapping friendly names to URL strings |
| `mcp.tools.raw.2026-07-28.v1\|<endpoint>` | Complete tools/list response serialized as text |
| `mcp.calls.v1` | JSON mapping call names to serialized `endpoint` and `request` entries |

The shortcut records no fetch timestamps and does not expire cached definitions. Users choose whether to reuse saved definitions or refresh them. An invalid refresh leaves the saved copy intact; network failures do not switch to it. Cross-device syncing and export behavior have not been verified.

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

The package exposes `getDefinition`, `getAction`, `PARAM_KINDS`, and `PARAM_CHOICES`. Check installed definitions before applying upstream documentation.

## Build, sign, and validate

Use the [build checks](../README.md#build-and-verify) and [signing instructions](../releases/README.md#build-locally). We sign with Apple's CLI rather than `Shortcut.sign()`. Inspect unsigned files with `plutil`; import the signed artifact for native tests.

Regression tests check structures, earlier-output references, menu order, storage settings, and repeat scopes. They cannot establish native execution correctness. For unfamiliar actions or encodings, test a small diagnostic shortcut before integration.

After changing menus, coercions, loops, storage, or request serialization:

1. Typecheck and inspect the generated action parameters.
2. Run the relevant structural regression tests.
3. Rebuild and sign the artifact.
4. Import and execute the affected path in Shortcuts.
5. Record native verification separately from generated-file test results.
