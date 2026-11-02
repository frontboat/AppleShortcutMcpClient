import { test, expect } from 'bun:test';
import { Shortcut, actions, ref } from 'shortcutkit';
import { appendResponseViewer } from '../src/mcp-response-viewer.mts';

test('viewer has independent text, structured and lossless raw branches', () => {
 const s=new Shortcut('Test');
 const response=s.action(actions.dictionary,{WFItems:{result:{content:[{type:'text',text:'hello\nworld'}],structuredContent:{total:1}}}});
 appendResponseViewer(s,ref(response));
 const p=s.toPlist() as any;
 const a=p.WFWorkflowActions;
 const menu=a.find((v:any)=>v.WFWorkflowActionIdentifier==='is.workflow.actions.choosefrommenu'&&v.WFWorkflowActionParameters.WFControlFlowMode===0);
 expect(menu.WFWorkflowActionParameters.WFMenuItems).toEqual(['Readable text','Structured data','Raw response']);
 const keys=a.filter((v:any)=>v.WFWorkflowActionIdentifier==='is.workflow.actions.getvalueforkey').map((v:any)=>v.WFWorkflowActionParameters.WFDictionaryKey.Value.string);
 expect(keys).toEqual(['result','isError','content','type','text','structuredContent']);
 expect(a.filter((v:any)=>v.WFWorkflowActionIdentifier==='is.workflow.actions.output')).toHaveLength(6);
 const groups:string[]=[];const seen=new Set<string>();
 function check(v:any){if(!v||typeof v!=='object')return;if(v.Type==='ActionOutput')expect(seen.has(v.OutputUUID)).toBe(true);for(const x of Object.values(v))check(x);}
 for(const action of a){const q=action.WFWorkflowActionParameters;check(q);expect(seen.has(q.UUID)).toBe(false);seen.add(q.UUID);
 if(q.GroupingIdentifier){if(q.WFControlFlowMode===0)groups.push(q.GroupingIdentifier);else {expect(q.GroupingIdentifier).toBe(groups.at(-1));if(q.WFControlFlowMode===2)groups.pop();}}}
 expect(groups).toEqual([]);
});
