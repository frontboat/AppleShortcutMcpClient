import { Shortcut, actions, ref, text, variable, dictionary, type Attachment, type DictionaryItems, type DictionaryValue } from 'shortcutkit';
import { readFile, writeFile } from 'node:fs/promises';

// JSON Schema is deliberately interpreted, never evaluated as executable code.
type RuntimeAttachment = Attachment<Exclude<import('shortcutkit').VariableType, 'Ask'>>;
type Schema = { [key: string]: any };
type Tool = { name: string; title?: string; description?: string; inputSchema: Schema };
export function readTools(data: any): Tool[] {
  const tools = data?.result?.tools ?? data?.tools ?? (Array.isArray(data) ? data : undefined);
  if (!Array.isArray(tools) || !tools.length) throw Error('Expected tools/list JSON: {result:{tools:[...]}} or {tools:[...]}');
  const names = new Set<string>();
  for (const tool of tools) {
    if (typeof tool.name !== 'string' || !tool.name || names.has(tool.name)) throw Error('Tool names must be nonempty and unique');
    names.add(tool.name);
    if (!tool.inputSchema || tool.inputSchema.type !== 'object') throw Error(`${tool.name}: inputSchema must be an object`);
  }
  return tools;
}
export function resolve(schema: Schema, root: Schema, seen = new Set<string>()): Schema {
  if (schema.$ref) {
    const path = schema.$ref;
    if (!path.startsWith('#/') || seen.has(path)) throw Error(`Unsupported external or recursive schema reference: ${path}`);
    const found = path.slice(2).split('/').reduce((v: any, k: string) => v?.[k.replaceAll('~1', '/').replaceAll('~0', '~')], root);
    if (!found) throw Error(`Missing schema reference: ${path}`);
    return { ...resolve(found, root, new Set([...seen, path])), ...Object.fromEntries(Object.entries(schema).filter(([k]) => k !== '$ref')) };
  }
  const choices = schema.anyOf ?? schema.oneOf;
  if (choices) {
    const nonNull = choices.filter((v: Schema) => v.type !== 'null');
    if (nonNull.length === 1) return { ...resolve(nonNull[0], root), ...Object.fromEntries(Object.entries(schema).filter(([k]) => !['anyOf','oneOf'].includes(k))) };
    if (nonNull.every((v: Schema) => 'const' in v)) return { ...schema, enum: nonNull.map((v: Schema) => v.const), type: typeof nonNull[0].const };
  }
  return schema;
}

export function generate(tools: Tool[], endpoint: string, name: string) {
  const url = new URL(endpoint);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Error('Use an HTTP(S) endpoint without embedded credentials');
  const s = new Shortcut(name, { color: 'Blue' });
  let serial = 0;
  const warnings = new Set<string>();
  const set = (name: string, input: RuntimeAttachment) => s.action(actions.setvariable, { WFVariableName: name, WFInput: input });
  const emitText = (...parts: Parameters<typeof text>) => s.action(actions.gettext, { WFTextActionText: text(...parts) });
  const replace = (input: RuntimeAttachment, pattern: string, replacement: string) => s.action(actions.text_replace, {
    WFInput: input, WFReplaceTextFind: text(pattern), WFReplaceTextReplace: text(replacement), WFReplaceTextRegularExpression: true,
  });
  function select(options: string[], prompt: string) {
    const list = s.action(actions.list, { WFItems: options });
    return s.action(actions.choosefromlist, {
      WFInput: ref(list), WFChooseFromListActionPrompt: text(prompt),
      WFChooseFromListActionSelectMultiple: true, WFChooseFromListActionSelectAll: false,
    });
  }
  function literal(value: unknown) { return ref(emitText(JSON.stringify(value))); }
  function prompt(schema0: Schema, root: Schema, label: string, depth: number): RuntimeAttachment {
    if (depth > 12) throw Error(`${label}: schema nesting exceeds 12`);
    const schema = resolve(schema0, root);
    if ('const' in schema) return literal(schema.const);
    let type = Array.isArray(schema.type) ? schema.type.find((v: string) => v !== 'null') : schema.type;
    if (!type && schema.properties) type = 'object';
    const help = [label, schema.description, schema.minimum !== undefined ? `Minimum: ${schema.minimum}` : '', schema.maximum !== undefined ? `Maximum: ${schema.maximum}` : ''].filter(Boolean).join('\n');
    if (type === 'array' && schema.items) {
      const itemSchema = resolve(schema.items, root);
      if (itemSchema.enum) {
        const selected = select(itemSchema.enum.map((v: unknown) => JSON.stringify(v)), help);
        const combined = s.action(actions.text_combine, { text: ref(selected), WFTextSeparator: 'Custom', WFTextCustomSeparator: text(',') });
        return ref(emitText('[', ref(combined), ']'));
      }
    }
    if (schema.enum || type === 'boolean') {
      const options: any[] = schema.enum ?? [true, false];
      const output = `Value ${++serial}`;
      const labels = options.map(v => JSON.stringify(v));
      const menu = s.chooseFromMenu(text(help), labels);
      for (let i = 0; i < options.length; i++) { s.menuItem(menu, labels[i]); set(output, literal(options[i])); }
      s.endMenu(menu);
      return variable(output);
    }
    if (type === 'object' && schema.properties && !schema.oneOf && !schema.anyOf && !schema.allOf) return object(schema, root, label, depth + 1);
    if (['string', 'integer', 'number'].includes(type) && !schema.oneOf && !schema.anyOf && !schema.allOf) {
      const numeric = type !== 'string';
      const asked = s.action(actions.ask, {
        WFInputType: numeric ? 'Number' : 'Text', WFAskActionPrompt: text(help),
        ...(numeric ? { WFAskActionAllowsDecimalNumbers: type === 'number', WFAskActionAllowsNegativeNumbers: true,
          ...(typeof schema.default === 'number' ? { WFAskActionDefaultAnswerNumber: schema.default } : {}) }
          : { ...(typeof schema.default === 'string' ? { WFAskActionDefaultAnswer: text(schema.default) } : {}) }),
      });
      // Let Apple's dictionary serializer escape strings and preserve number tokens.
      const encoded = dictionary({ value: ref(asked) });
      if (numeric) encoded.Value.WFDictionaryFieldValueItems[0].WFItemType = 3;
      const d = s.action(actions.dictionary, { WFItems: encoded });
      const json = emitText(ref(d));
      const peeled = replace(ref(json), '^\\s*\\{\\s*"value"\\s*:\\s*([\\s\\S]*)\\}\\s*$', '$1');
      return ref(peeled);
    }
    // Arbitrary arrays/unions/maps still have an exact, lossless input path.
    warnings.add(`${label}: JSON input prompt (${type ?? 'complex schema'})`);
    const asked = s.action(actions.ask, { WFInputType: 'Text', WFAskActionPrompt: text(help, '\nEnter a JSON value matching this schema:\n', JSON.stringify(schema)),
      ...('default' in schema ? { WFAskActionDefaultAnswer: text(JSON.stringify(schema.default)) } : {}) });
    return ref(asked);
  }
  function object(schema: Schema, root: Schema, label: string, depth: number): RuntimeAttachment {
    const accumulator = `Fields ${++serial}`;

    set(accumulator, ref(emitText('')));
    const entries = Object.entries(schema.properties ?? {}) as [string, Schema][];
    const optionalKeys = entries.filter(([key]) => !(schema.required ?? []).includes(key)).map(([key]) => key);
    let chosen: RuntimeAttachment | undefined;
    if (optionalKeys.length) {
      const selected = select(['No optional fields', ...optionalKeys], label + ': select the optional fields to fill in. Unselected fields use server defaults.');
      const joined = s.action(actions.text_combine, { text: ref(selected), WFTextSeparator: 'New Lines' });
      const bounded = emitText('\n', ref(joined), '\n');
      const saved = 'Selected fields ' + ++serial;
      set(saved, ref(bounded));
      chosen = variable(saved);
    }
    for (const [key, child] of entries) {
      const optional = !(schema.required ?? []).includes(key);
      let group: string | undefined;
      if (optional) {
        group = s.if(chosen!, 'contains', `\n${key}\n`);
      }
      const value = prompt(child, root, `${label}.${key}`, depth);
      const next = emitText(variable(accumulator), JSON.stringify(key), ':', value, ',');
      set(accumulator, ref(next));
      if (group) s.endIf(group);
    }
    const clean = replace(variable(accumulator), ',\\s*$', '');
    return ref(emitText('{', ref(clean), '}'));
  }
  s.action(actions.comment, { WFCommentActionText: text(`Generated MCP client for ${endpoint}. Tool definitions are a generation-time snapshot. Optional fields can be skipped. Arrays and complex schema inputs use JSON prompts. Responses are shown as raw text, including structured content and errors. HTTP JSON responses only; authenticated servers require request headers to be configured separately. No automatic pagination or protocol session negotiation.`) });
  const endpointInput = s.action(actions.ask, {
    WFInputType: "URL", WFAskActionPrompt: text("Paste the MCP endpoint URL. This shortcut uses the tool definitions it was generated with; use a compatible server."),
    WFAskActionDefaultAnswer: text(endpoint),
  });
  const labels = tools.map(t => t.name);
  const menu = s.chooseFromMenu('Choose an MCP tool', labels);
  for (const tool of tools) {
    s.menuItem(menu, tool.name);
    s.action(actions.showresult, { Text: text(tool.title ?? tool.name, '\n', tool.description ?? '') });
    const args = object(tool.inputSchema, tool.inputSchema, tool.name, 0);
    const request = emitText('{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":', JSON.stringify(tool.name), ',"arguments":', args, '}}');
    // Parsing the envelope stops malformed JSON before anything is sent.
    const parsed = s.action(actions.detect_dictionary, { WFInput: ref(request) });
    s.action(actions.showresult, { Text: text('Review request to ', ref(endpointInput), '\n', ref(parsed), '\nChoose Done to send, or Cancel to stop.') });
    // Raw JSON body avoids coercing the dynamic arguments dictionary to a string.
    const response = s.action(actions.downloadurl, {
      WFURL: text(ref(endpointInput)), WFHTTPMethod: 'POST', ShowHeaders: 1,
      WFHTTPHeaders: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      WFHTTPBodyType: 'File', WFRequestVariable: ref(request),
    });
    const raw = emitText(ref(response));
    s.action(actions.previewdocument, { WFInput: ref(raw) });
    s.action(actions.output, { WFOutput: ref(raw) });
  }
  s.endMenu(menu);
  return { shortcut: s, warnings: [...warnings] };
}

if (import.meta.main) {
  const [input, endpoint, name = 'Use MCP'] = process.argv.slice(2);
  if (!input || !endpoint) throw Error('Usage: bun mcp-to-shortcut.mts tools.json https://server/mcp "Use Server"');
  const tools = readTools(JSON.parse(await readFile(input, 'utf8')));
  const { shortcut, warnings } = generate(tools, endpoint, name);
  const output = `${name.replaceAll('/', '-')}.shortcut`;
  await shortcut.write(output);
  await writeFile(`${output}.report.json`, JSON.stringify({ endpoint, tools: tools.map(t => t.name), actions: shortcut.actions.length, warnings }, null, 2));
  console.log(`Generated ${output}: ${tools.length} tools, ${shortcut.actions.length} actions. ${warnings.length} fields use JSON prompts.`);
}
