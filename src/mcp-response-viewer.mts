import { actions, coerce, ref, text, variable, type Shortcut, type Attachment, type VariableType } from 'shortcutkit';
type V = Attachment<Exclude<VariableType, 'Ask'>>;

/** Append the lab-verified result views. No server-specific field names. */
export function appendResponseViewer(s: Shortcut, response: V) {
  const txt = (...parts: Parameters<typeof text>) => s.action(actions.gettext, { WFTextActionText: text(...parts) });
  const get = (input: V, key: string) => s.action(actions.getvalueforkey, {
    WFInput: input, WFGetDictionaryValueType: 'Value', WFDictionaryKey: text(key),
  });
  const raw = txt(response);
  const result = get(response, 'result');
  const resultLength = s.action(actions.count, { Input: ref(result), WFCountType: 'Characters' });
  // JSON-RPC errors have no result. Preserve the error envelope for inspection.
  const absent = s.if(ref(resultLength), 'is', 0);
  s.action(actions.previewdocument, { WFInput: ref(raw) });
  s.action(actions.output, { WFOutput: ref(raw) });
  s.endIf(absent);
  const toolError = get(ref(result), 'isError');
  const failed = s.if(coerce(toolError, 'WFNumberContentItem'), 'is', 1);
  s.action(actions.showresult, { Text: text('The server reported a tool error. Choose a response view to inspect it.') });
  s.endIf(failed);

  const menu = s.chooseFromMenu('View MCP response', ['Readable text', 'Structured data', 'Raw response']);
  s.menuItem(menu, 'Readable text');
  const blank = txt('');
  s.action(actions.setvariable, { WFVariableName: 'Response text blocks', WFInput: ref(blank) });
  const blocks = get(ref(result), 'content');
  const blockSize = s.action(actions.count, { Input: ref(blocks), WFCountType: 'Characters' });
  const hasBlocks = s.if(ref(blockSize), 'greater_than', 0);
  const each = s.repeatEach(ref(blocks));
  const type = get(variable('Repeat Item'), 'type');
  const isText = s.if(coerce(type, 'WFStringContentItem'), 'is', 'text');
  const content = get(variable('Repeat Item'), 'text');
  s.action(actions.appendvariable, { WFVariableName: 'Response text blocks', WFInput: ref(content) });
  s.endIf(isText);
  s.endRepeatEach(each);
  s.endIf(hasBlocks);
  const combined = s.action(actions.text_combine, { text: variable('Response text blocks'), WFTextSeparator: 'New Lines' });
  const length = s.action(actions.count, { Input: ref(combined), WFCountType: 'Characters' });
  const empty = s.if(ref(length), 'is', 0);
  const fallback = txt('No text blocks were returned. Full response:\n\n', ref(raw));
  finish(ref(fallback));
  s.otherwise(empty);
  finish(ref(combined));
  s.endIf(empty);

  s.menuItem(menu, 'Structured data');
  const structured = get(ref(result), 'structuredContent');
  const size = s.action(actions.count, { Input: ref(structured), WFCountType: 'Characters' });
  const missing = s.if(ref(size), 'is', 0);
  const missingView = txt('No structured data was returned. Full response:\n\n', ref(raw));
  finish(ref(missingView));
  s.otherwise(missing);
  const data = txt(ref(structured));
  finish(ref(data));
  s.endIf(missing);

  s.menuItem(menu, 'Raw response');
  finish(ref(raw));
  s.endMenu(menu);
  function finish(input: V) {
    s.action(actions.previewdocument, { WFInput: input });
    s.action(actions.output, { WFOutput: input });
  }
}
