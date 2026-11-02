import { mkdir } from 'node:fs/promises';
import { appendSavedCallLauncher, appendSaveCallPrompt } from '../src/mcp-saved-calls.mts';
import { appendServerPicker, CACHE_PREFIX } from '../src/mcp-global-storage.mts';
import { appendResponseViewer } from '../src/mcp-response-viewer.mts';
import { Shortcut, actions, ref, text, variable, dictionary, type Attachment, type VariableType, coerce } from 'shortcutkit';
type V = Attachment<Exclude<VariableType,'Ask'>>;
const s = new Shortcut('MCP Toolkit', { color: 'Blue' });
const set=(name:string,input:V)=>s.action(actions.setvariable,{WFVariableName:name,WFInput:input});
const txt=(...parts:Parameters<typeof text>)=>s.action(actions.gettext,{WFTextActionText:text(...parts)});
const get=(input:V,key:string|V)=>s.action(actions.getvalueforkey,{WFInput:input,WFGetDictionaryValueType:'Value',WFDictionaryKey:typeof key==='string'?text(key):text(key)});
const keys=(input:V)=>s.action(actions.getvalueforkey,{WFInput:input,WFGetDictionaryValueType:'All Keys'});
const chars=(input:V)=>s.action(actions.count,{Input:input,WFCountType:'Characters'});
const replace=(input:V,find:string,to:string)=>s.action(actions.text_replace,{WFInput:input,WFReplaceTextFind:text(find),WFReplaceTextReplace:text(to),WFReplaceTextRegularExpression:true});
const choose=(input:V,prompt:ReturnType<typeof text>,multiple=false)=>s.action(actions.choosefromlist,{WFInput:input,WFChooseFromListActionPrompt:prompt,WFChooseFromListActionSelectMultiple:multiple});
appendSavedCallLauncher(s);
const url=appendServerPicker(s);
s.action(actions.comment,{WFCommentActionText:text('Discovers tools at runtime using tools/list. Uses MCP 2026-07-28 version metadata and HTTP headers. For stateless HTTP MCP endpoints returning JSON. No OAuth/session/SSE support. Primitive fields use forms; nested objects, arrays and advanced schemas use JSON input. Server validates constraints. The review step can cancel any request.')});
export const PROTOCOL_VERSION = '2026-07-28';
const metadata = JSON.stringify({
  'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
  'io.modelcontextprotocol/clientCapabilities': {},
  'io.modelcontextprotocol/clientInfo': { name: 'shortcutkit-mcp-client', version: '0.3.0' },
});
function post(body:V, method:string, name?:V){
 return s.action(actions.downloadurl,{
  WFURL:text(ref(url)),WFHTTPMethod:'POST',ShowHeaders:1,
  WFHTTPHeaders:{
   'Content-Type':'application/json',Accept:'application/json, text/event-stream',
   'MCP-Protocol-Version':PROTOCOL_VERSION,'Mcp-Method':method,
   ...(name ? {'Mcp-Name':name} : {}),
  },
  WFHTTPBodyType:'File',WFRequestVariable:body,
 });
}
const cacheKey=txt(CACHE_PREFIX,ref(url));
const cached=s.action(actions.getstoredcontent,{WFStoredContentKey:text(ref(cacheKey)),WFStoredContentGlobalValue:true});
set('Fetch tools',ref(txt('yes')));
const cacheSize=chars(ref(cached));const hasCache=s.if(ref(cacheSize),'greater_than',0);
const menu=s.chooseFromMenu('Saved tool schemas are available. Refresh to check for changes.',['Use saved schemas','Refresh tools']);
s.menuItem(menu,'Use saved schemas');
const cachedDictionary=s.action(actions.detect_dictionary,{WFInput:ref(cached)});set('Discovery response',ref(cachedDictionary));set('Fetch tools',ref(txt('no')));
s.menuItem(menu,'Refresh tools');s.endMenu(menu);s.endIf(hasCache);
const fetchTools=s.if(coerce(variable('Fetch tools'),'WFStringContentItem'),'is','yes');
const fetched=post(ref(txt('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":',metadata,'}}')), 'tools/list');
const freshTools=get(ref(fetched),'result.tools');const freshSize=chars(ref(freshTools));
const valid=s.if(ref(freshSize),'greater_than',0);
const rawSchemas=txt(ref(fetched));
s.action(actions.setstoredcontent,{WFInput:text(ref(rawSchemas)),WFStoredContentKey:text(ref(cacheKey)),WFStoredContentGlobalValue:true});
s.endIf(valid);set('Discovery response',ref(fetched));s.endIf(fetchTools);
const discovery=s.action(actions.getvariable,{WFVariable:variable('Discovery response')});
const tools=get(ref(discovery),'result.tools');
const toolsLength=chars(ref(tools));
const missing=s.if(ref(toolsLength),'is',0);
s.action(actions.showresult,{Text:text('No tools returned. Raw discovery response:\n',ref(discovery))});
s.action(actions.output,{WFOutput:text(ref(discovery))});s.endIf(missing);
// Tool names are accumulated without any nested repeats.
const loop=s.repeatEach(ref(tools));
const toolName=get(variable('Repeat Item'),'name');
s.action(actions.appendvariable,{WFVariableName:'Tool Names',WFInput:ref(toolName)});
s.endRepeatEach(loop);
const selected=choose(variable('Tool Names'),text('Choose a tool discovered from this server'));
const find=s.repeatEach(ref(tools));
const name=get(variable('Repeat Item'),'name');
const matches=s.if(coerce(name,'WFStringContentItem'),'is', ''); // replace comparison with dynamic text parameter below
const condition=s.actions.at(-1)!;
condition.WFWorkflowActionParameters.WFConditionalActionString=text(ref(selected));
set('Selected Tool',variable('Repeat Item'));
s.endIf(matches);s.endRepeatEach(find);
const schema=get(variable('Selected Tool'),'inputSchema');
const description=get(variable('Selected Tool'),'description');
s.action(actions.showresult,{Text:text(ref(selected),'\n',ref(description))});
const suppliedProps=get(ref(schema),'properties');
const emptyProps=s.action(actions.dictionary,{WFItems:{}});set('Properties',ref(emptyProps));
const propsSize=chars(ref(suppliedProps));const propsPresent=s.if(ref(propsSize),'greater_than',0);set('Properties',ref(suppliedProps));s.endIf(propsPresent);
const props=s.action(actions.getvariable,{WFVariable:variable('Properties')});
const required=get(ref(schema),'required');
const requiredJoined=s.action(actions.text_combine,{text:ref(required),WFTextSeparator:'New Lines'});
const requiredBound=txt('\n',ref(requiredJoined),'\n');
const fields=keys(ref(props));
const count=chars(ref(fields));
set('Argument fragments',ref(txt('')));
const hasFields=s.if(ref(count),'greater_than',0);
const selectedFields=choose(ref(fields),text('Select fields to fill in. Required fields are always prompted.'),true);
const joined=s.action(actions.text_combine,{text:ref(selectedFields),WFTextSeparator:'New Lines'});
const selectedBound=txt('\n',ref(joined),'\n');
const each=s.repeatEach(ref(fields));
set('Field',variable('Repeat Item'));
const needle=txt('\n',variable('Field'),'\n');
set('Include',ref(txt('no')));
for(const source of [ref(requiredBound),ref(selectedBound)]){
 const check=s.if(coerce(source,'WFStringContentItem'),'contains','');s.actions.at(-1)!.WFWorkflowActionParameters.WFConditionalActionString=text(ref(needle));
 set('Include',ref(txt('yes')));s.endIf(check);
}
const include=s.if(coerce(variable('Include'),'WFStringContentItem'),'is','yes');
const field=get(ref(props),variable('Field'));set('Field Schema',ref(field));
// Resolve a direct local $defs reference; complex compositions retain JSON fallback.
const reference=get(variable('Field Schema'),'$ref');
const local=s.if(coerce(reference,'WFStringContentItem'),'begins_with','#/$defs/');
const refKey=replace(ref(reference),'^#/\\$defs/','');
const defs=get(ref(schema),'$defs');const resolved=get(ref(defs),ref(refKey));set('Field Schema',ref(resolved));s.endIf(local);
const type=get(variable('Field Schema'),'type');
const help=get(variable('Field Schema'),'description');
const enums=get(variable('Field Schema'),'enum');
const enumSize=chars(ref(enums));
const enumBranch=s.if(ref(enumSize),'greater_than',0);
const enumChoice=choose(ref(enums),text(variable('Field'),'\n',ref(help)));
const enumNumber=s.if(coerce(type,'WFStringContentItem'),'contains','number');set('JSON Value',ref(enumChoice));s.otherwise(enumNumber);
const enumInteger=s.if(coerce(type,'WFStringContentItem'),'contains','integer');set('JSON Value',ref(enumChoice));s.otherwise(enumInteger);
const enumBoolean=s.if(coerce(type,'WFStringContentItem'),'is','boolean');
const trueChoice=s.if(coerce(enumChoice,'WFStringContentItem'),'is','true');set('JSON Value',ref(txt('true')));s.otherwise(trueChoice);set('JSON Value',ref(txt('false')));s.endIf(trueChoice);
s.otherwise(enumBoolean);
const enumDict=s.action(actions.dictionary,{WFItems:{value:ref(enumChoice)}});const enumText=txt(ref(enumDict));const enumJSON=replace(ref(enumText),'^\\s*\\{\\s*"value"\\s*:\\s*([\\s\\S]*)\\}\\s*$','$1');set('JSON Value',ref(enumJSON));
s.endIf(enumBoolean);s.endIf(enumInteger);s.endIf(enumNumber);
s.otherwise(enumBranch);
const numeric=s.if(coerce(type,'WFStringContentItem'),'contains','number');
numberPrompt();s.otherwise(numeric);
const integer=s.if(coerce(type,'WFStringContentItem'),'contains','integer');numberPrompt();s.otherwise(integer);
const string=s.if(coerce(type,'WFStringContentItem'),'is','string');
const answer=s.action(actions.ask,{WFInputType:'Text',WFAskActionPrompt:text(variable('Field'),'\n',ref(help))});
const d=s.action(actions.dictionary,{WFItems:{value:ref(answer)}});
const serialized=txt(ref(d));const peeled=replace(ref(serialized),'^\\s*\\{\\s*"value"\\s*:\\s*([\\s\\S]*)\\}\\s*$','$1');set('JSON Value',ref(peeled));
s.otherwise(string);
const raw=s.action(actions.ask,{WFInputType:'Text',WFAskActionPrompt:text(variable('Field'),'\n',ref(help),'\nEnter a JSON value matching this schema:\n',variable('Field Schema'))});set('JSON Value',ref(raw));
s.endIf(string);s.endIf(integer);s.endIf(numeric);s.endIf(enumBranch);
// Escape arbitrary property names with the same serializer as input strings.
const keyDictionary=s.action(actions.dictionary,{WFItems:{value:variable('Field')}});
const keyText=txt(ref(keyDictionary));const encodedKey=replace(ref(keyText),'^\\s*\\{\\s*"value"\\s*:\\s*([\\s\\S]*)\\}\\s*$','$1');
const fragment=txt(variable('Argument fragments'),ref(encodedKey),':',variable('JSON Value'),',');set('Argument fragments',ref(fragment));
s.endIf(include);s.endRepeatEach(each);s.endIf(hasFields);
const clean=replace(variable('Argument fragments'),',\\s*$','');
const nameDictionary=s.action(actions.dictionary,{WFItems:{value:ref(selected)}});
const nameText=txt(ref(nameDictionary));const encodedName=replace(ref(nameText),'^\\s*\\{\\s*"value"\\s*:\\s*([\\s\\S]*)\\}\\s*$','$1');
const request=txt('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":',ref(encodedName),',"arguments":{',ref(clean),'},"_meta":',metadata,'}}');
const parsed=s.action(actions.detect_dictionary,{WFInput:ref(request)});
appendSaveCallPrompt(s,ref(url),ref(request));
s.action(actions.showresult,{Text:text('Review request to ',ref(url),'\n',ref(parsed),'\nDone sends; Cancel stops.')});
const response=post(ref(request),'tools/call',ref(selected));
appendResponseViewer(s, ref(response));
function numberPrompt(){
 const asked=s.action(actions.ask,{WFInputType:'Number',WFAskActionPrompt:text(variable('Field'),'\n',ref(help)),WFAskActionAllowsDecimalNumbers:true,WFAskActionAllowsNegativeNumbers:true});
 const encoded=dictionary({value:ref(asked)});encoded.Value.WFDictionaryFieldValueItems[0].WFItemType=3;
 const d=s.action(actions.dictionary,{WFItems:encoded});const json=txt(ref(d));const peeled=replace(ref(json),'^\\s*\\{\\s*"value"\\s*:\\s*([\\s\\S]*)\\}\\s*$','$1');set('JSON Value',ref(peeled));
}
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await s.write(decodeURIComponent(new URL('../dist/MCP Toolkit.shortcut', import.meta.url).pathname));console.log(`Built MCP Toolkit: ${s.actions.length} actions`);
