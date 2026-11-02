import { actions, coerce, ref, text, variable, type Shortcut, type Attachment, type VariableType } from 'shortcutkit';
import { appendResponseViewer } from './mcp-response-viewer.mts';
type V=Attachment<Exclude<VariableType,'Ask'>>;
export const CALLS_KEY='mcp.calls.v1';
function helpers(s:Shortcut){
 const txt=(...p:Parameters<typeof text>)=>s.action(actions.gettext,{WFTextActionText:text(...p)});
 const set=(n:string,v:V)=>s.action(actions.setvariable,{WFVariableName:n,WFInput:v});
 const get=(v:V,k:string|V)=>s.action(actions.getvalueforkey,{WFInput:v,WFGetDictionaryValueType:'Value',WFDictionaryKey:typeof k==='string'?text(k):text(k)});
 function load(){
  const raw=s.action(actions.getstoredcontent,{WFStoredContentKey:text(CALLS_KEY),WFStoredContentGlobalValue:true});
  const empty=s.action(actions.dictionary,{WFItems:{}});set('Saved calls',ref(empty));
  const size=s.action(actions.count,{Input:ref(raw),WFCountType:'Characters'});const exists=s.if(ref(size),'greater_than',0);
  const parsed=s.action(actions.detect_dictionary,{WFInput:ref(raw)});set('Saved calls',ref(parsed));s.endIf(exists);
 }
 return {txt,set,get,load};
}
export function appendSavedCallLauncher(s:Shortcut){
 const {txt,get,load}=helpers(s);
 const menu=s.chooseFromMenu('Use MCP',['Saved tool calls','Run multiple saved calls','New tool call']);
 s.menuItem(menu,'Saved tool calls');load();
 const names=s.action(actions.getvalueforkey,{WFInput:variable('Saved calls'),WFGetDictionaryValueType:'All Keys'});
 const size=s.action(actions.count,{Input:ref(names),WFCountType:'Characters'});const empty=s.if(ref(size),'is',0);
 s.action(actions.showresult,{Text:text('No saved tool calls yet. Make a new call and choose Save this call.')});
 s.action(actions.output,{WFOutput:text('No saved tool calls')});s.endIf(empty);
 const chosen=s.action(actions.choosefromlist,{WFInput:ref(names),WFChooseFromListActionPrompt:text('Choose a saved tool call')});
 const stored=get(variable('Saved calls'),ref(chosen));
 const call=s.action(actions.detect_dictionary,{WFInput:ref(stored)});
 const endpoint=get(ref(call),'endpoint');const request=get(ref(call),'request');
 const parsed=s.action(actions.detect_dictionary,{WFInput:ref(request)});
 const name=get(ref(parsed),'params.name');
 s.action(actions.showresult,{Text:text('Run saved call: ',ref(chosen),'\nServer: ',ref(endpoint),'\n',ref(parsed),'\nDone sends this request again. Cancel stops.')});
 const response=s.action(actions.downloadurl,{WFURL:text(ref(endpoint)),WFHTTPMethod:'POST',ShowHeaders:1,
  WFHTTPHeaders:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':ref(name)},
  WFHTTPBodyType:'File',WFRequestVariable:ref(request)});
 appendResponseViewer(s,ref(response));
 s.menuItem(menu,'Run multiple saved calls');appendBatchCalls(s);
 s.menuItem(menu,'New tool call');s.endMenu(menu);
}
export function appendSaveCallPrompt(s:Shortcut,endpoint:V,request:V){
 const {txt,get,load}=helpers(s);
 const menu=s.chooseFromMenu('Save this request for reuse? Saved requests include your input values. Other shortcuts on this device can access them.',['Run without saving','Save this call']);
 s.menuItem(menu,'Run without saving');s.menuItem(menu,'Save this call');load();
 const name=s.action(actions.ask,{WFInputType:'Text',WFAskActionPrompt:text('Name this saved call')});
 const existing=get(variable('Saved calls'),ref(name));const size=s.action(actions.count,{Input:ref(existing),WFCountType:'Characters'});
 const collision=s.if(ref(size),'greater_than',0);
 s.action(actions.showresult,{Text:text('A saved call named ',ref(name),' already exists. Done replaces it; Cancel stops.')});s.endIf(collision);
 const entry=s.action(actions.dictionary,{WFItems:{endpoint,request}});const serialized=txt(ref(entry));
 const updated=s.action(actions.setvalueforkey,{WFDictionary:variable('Saved calls'),WFDictionaryKey:text(ref(name)),WFDictionaryValue:text(ref(serialized))});
 const raw=txt(ref(updated));
 s.action(actions.setstoredcontent,{WFInput:text(ref(raw)),WFStoredContentKey:text(CALLS_KEY),WFStoredContentGlobalValue:true});s.endMenu(menu);
}

/** Independent saved requests, executed in the exact order shown in review. */
export function appendBatchCalls(s:Shortcut){
 const {txt,set,get,load}=helpers(s);load();
 const names=s.action(actions.getvalueforkey,{WFInput:variable('Saved calls'),WFGetDictionaryValueType:'All Keys'});
 const count=s.action(actions.count,{Input:ref(names),WFCountType:'Characters'});
 const none=s.if(ref(count),'is',0);
 s.action(actions.showresult,{Text:text('No saved calls yet. Save a new tool call first.')});
 s.action(actions.output,{WFOutput:text('No saved tool calls')});s.endIf(none);
 const selected=s.action(actions.choosefromlist,{WFInput:ref(names),WFChooseFromListActionPrompt:text('Select saved calls to run together'),WFChooseFromListActionSelectMultiple:true});
 set('Batch review',ref(txt('These requests will run sequentially in this order. Done runs all; Cancel stops.\n')));
 const review=s.repeatEach(ref(selected));
 const saved=get(variable('Saved calls'),variable('Repeat Item'));
 const entry=s.action(actions.detect_dictionary,{WFInput:ref(saved)});
 const endpoint=get(ref(entry),'endpoint');const request=get(ref(entry),'request');
 const plan=txt(variable('Batch review'),'\n',variable('Repeat Index'),'. ',variable('Repeat Item'),'\nServer: ',ref(endpoint),'\n',ref(request),'\n');set('Batch review',ref(plan));
 s.endRepeatEach(review);
 s.action(actions.showresult,{Text:text(variable('Batch review'))});
 set('Batch output',ref(txt('MCP SAVED CALL RESULTS\n')));
 const run=s.repeatEach(ref(selected));
 set('Batch call name',variable('Repeat Item'));
 const savedCall=get(variable('Saved calls'),variable('Batch call name'));
 const call=s.action(actions.detect_dictionary,{WFInput:ref(savedCall)});
 const url=get(ref(call),'endpoint');const body=get(ref(call),'request');
 const parsed=s.action(actions.detect_dictionary,{WFInput:ref(body)});
 const tool=get(ref(parsed),'params.name');
 const response=s.action(actions.downloadurl,{WFURL:text(ref(url)),WFHTTPMethod:'POST',ShowHeaders:1,
 WFHTTPHeaders:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':ref(tool)},WFHTTPBodyType:'File',WFRequestVariable:ref(body)});
 // Start with raw fallback, which also retains protocol errors and non-text content.
 const raw=txt(ref(response));set('Batch call output',ref(raw));set('Batch text',ref(txt('')));
 const result=get(ref(response),'result');
 const length=s.action(actions.count,{Input:ref(result),WFCountType:'Characters'});
 const hasResult=s.if(ref(length),'greater_than',0);
 const error=get(ref(result),'isError');
 const failed=s.if(coerce(error,'WFNumberContentItem'),'is',1);
 const failure=txt('TOOL ERROR\n',ref(raw));set('Batch call output',ref(failure));
 s.otherwise(failed);
 const content=get(ref(result),'content');const contentSize=s.action(actions.count,{Input:ref(content),WFCountType:'Characters'});
 const hasContent=s.if(ref(contentSize),'greater_than',0);
 const blocks=s.repeatEach(ref(content));
 const type=get(variable('Repeat Item 2'),'type');
 const isText=s.if(coerce(type,'WFStringContentItem'),'is','text');
 const value=get(variable('Repeat Item 2'),'text');
 const appended=txt(variable('Batch text'),ref(value),'\n');set('Batch text',ref(appended));
 s.endIf(isText);s.endRepeatEach(blocks);s.endIf(hasContent);
 const textSize=s.action(actions.count,{Input:variable('Batch text'),WFCountType:'Characters'});
 const hasText=s.if(ref(textSize),'greater_than',0);set('Batch call output',variable('Batch text'));s.endIf(hasText);
 s.endIf(failed);s.endIf(hasResult);
 const section=txt(variable('Batch output'),'\n──────── ',variable('Batch call name'),' ────────\nServer: ',ref(url),'\nTool: ',ref(tool),'\n\n',variable('Batch call output'),'\n');set('Batch output',ref(section));
 s.endRepeatEach(run);
 s.action(actions.previewdocument,{WFInput:variable('Batch output')});
 s.action(actions.output,{WFOutput:variable('Batch output')});
}
