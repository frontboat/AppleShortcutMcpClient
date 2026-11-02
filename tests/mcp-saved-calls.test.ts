import {test,expect} from 'bun:test';
import {Shortcut,actions,ref} from 'shortcutkit';
import {appendSavedCallLauncher,appendSaveCallPrompt,CALLS_KEY} from '../src/mcp-saved-calls.mts';
test('calls are saved globally with endpoint and original request, and replay includes review',()=>{
 const s=new Shortcut('Calls');appendSavedCallLauncher(s);
 const url=s.action(actions.gettext,{WFTextActionText:'https://example.com/mcp'});
 const request=s.action(actions.gettext,{WFTextActionText:'{"params":{"name":"lookup","arguments":{"n":3}}}'});
 appendSaveCallPrompt(s,ref(url),ref(request));
 const a=s.actions;
 const stores=a.filter(x=>x.WFWorkflowActionIdentifier==='is.workflow.actions.setstoredcontent');
 expect(stores).toHaveLength(1);expect(stores[0].WFWorkflowActionParameters.WFStoredContentGlobalValue).toBe(true);
 expect(JSON.stringify(stores[0])).toContain(CALLS_KEY);
 const entry=a.find(x=>x.WFWorkflowActionIdentifier==='is.workflow.actions.dictionary'&&JSON.stringify(x).includes('endpoint'))!;
 expect(JSON.stringify(entry)).toContain('request');
 expect(JSON.stringify(a)).toContain('Done sends this request again');
 const groups:string[]=[];const seen=new Set<string>();
 function check(v:any){if(!v||typeof v!=='object')return;if(v.Type==='ActionOutput')expect(seen.has(v.OutputUUID)).toBe(true);for(const x of Object.values(v))check(x);}
 for(const action of a){const p=action.WFWorkflowActionParameters;check(p);seen.add(p.UUID as string);if(p.GroupingIdentifier){if(p.WFControlFlowMode===0)groups.push(p.GroupingIdentifier as string);else{expect(p.GroupingIdentifier).toBe(groups.at(-1));if(p.WFControlFlowMode===2)groups.pop();}}}
 expect(groups).toEqual([]);
});
test('startup menu labels match emitted branch order',()=>{
 const s=new Shortcut('Menu order');appendSavedCallLauncher(s);
 const a=s.actions;const open=a.find(x=>x.WFWorkflowActionIdentifier==='is.workflow.actions.choosefrommenu'&&x.WFWorkflowActionParameters.WFControlFlowMode===0)!;
 const p=open.WFWorkflowActionParameters;
 const branches=a.filter(x=>x.WFWorkflowActionParameters.GroupingIdentifier===p.GroupingIdentifier&&x.WFWorkflowActionParameters.WFControlFlowMode===1).map(x=>x.WFWorkflowActionParameters.WFMenuItemTitle);
 expect(JSON.stringify(branches)).toBe(JSON.stringify(p.WFMenuItems));
});
test('batch has multi-selection, review before execution, and explicit nested text-block references',()=>{
 const s=new Shortcut('Batch');appendSavedCallLauncher(s);
 const a=s.actions;
 const selector=a.findIndex(x=>x.WFWorkflowActionIdentifier==='is.workflow.actions.choosefromlist'&&x.WFWorkflowActionParameters.WFChooseFromListActionSelectMultiple===true);
 expect(selector).toBeGreaterThan(0);
 const review=a.findIndex((x,i)=>i>selector&&x.WFWorkflowActionIdentifier==='is.workflow.actions.showresult'&&JSON.stringify(x).includes('Batch review'));
 const request=a.findIndex((x,i)=>i>selector&&x.WFWorkflowActionIdentifier==='is.workflow.actions.downloadurl');
 expect(review).toBeGreaterThan(selector);expect(request).toBeGreaterThan(review);
 expect(JSON.stringify(a.slice(request))).toContain('Repeat Item 2');
 expect(JSON.stringify(a.slice(request))).toContain('TOOL ERROR');
 expect(a.at(-2)?.WFWorkflowActionIdentifier).toBe('is.workflow.actions.choosefrommenu');
});
