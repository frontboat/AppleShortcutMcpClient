import { test, expect } from 'bun:test';
import { generate, readTools, resolve } from '../archive/static/mcp-to-shortcut.mts';

test('accepts MCP envelopes, results, and tool arrays; rejects duplicate tools', () => {
 const tool={name:'example',inputSchema:{type:'object',properties:{}}};
 for(const x of [{result:{tools:[tool]}},{tools:[tool]},[tool]]) expect(readTools(x)).toEqual([tool]);
 expect(()=>readTools({tools:[tool,tool]})).toThrow('unique');
});
test('resolves local references, nullable objects and enum unions',()=>{
 const root={$defs:{Range:{type:'object',properties:{min:{type:'number'}}}}};
 expect(resolve({anyOf:[{$ref:'#/$defs/Range'},{type:'null'}]},root).type).toBe('object');
 expect(resolve({oneOf:[{const:'a'},{const:'b'}]},{}).enum).toEqual(['a','b']);
 expect(()=>resolve({$ref:'#/$defs/x'},{$defs:{x:{$ref:'#/$defs/x'}}})).toThrow('recursive');
});
test('preserves numeric fields, separates optional skip branches, and returns untouched responses',()=>{
 const {shortcut,warnings}=generate([{name:'lookup',inputSchema:{type:'object',required:['q','n'],properties:{q:{type:'string'},n:{type:'number'},optional:{type:'boolean'},tags:{type:'array',items:{type:'string'}}}}}], 'https://example.com/mcp','Example');
 const a=shortcut.actions;
 const dictionaries=a.filter(x=>x.WFWorkflowActionIdentifier==='is.workflow.actions.dictionary');
 const items=dictionaries.map(x=>(x.WFWorkflowActionParameters.WFItems as any).Value.WFDictionaryFieldValueItems[0]);
 expect(items.map(x=>x.WFItemType)).toEqual([0,3]);
 expect(warnings).toEqual(['lookup.tags: JSON input prompt (array)']);
 const request=a.find(x=>x.WFWorkflowActionIdentifier==='is.workflow.actions.downloadurl')!;
 expect(request.WFWorkflowActionParameters.WFHTTPBodyType).toBe('File');
 expect(request.WFWorkflowActionParameters.WFRequestVariable).toHaveProperty('Value.OutputUUID');
 const groups:string[]=[];
 for(const action of a){const p=action.WFWorkflowActionParameters;if(!p.GroupingIdentifier)continue;
 if(p.WFControlFlowMode===0)groups.push(p.GroupingIdentifier as string);
 else {expect(p.GroupingIdentifier).toBe(groups.at(-1));if(p.WFControlFlowMode===2)groups.pop();}}
 expect(groups).toEqual([]);
 expect(a.some(x=>x.WFWorkflowActionIdentifier==='is.workflow.actions.getvalueforkey')).toBe(false);
});
test('optional fields and enum arrays use multiple-selection lists without repeat loops',()=>{
 const {shortcut,warnings}=generate([{name:'search',inputSchema:{type:'object',properties:{types:{type:'array',items:{enum:['sale','lease'],type:'string'}}}}}], 'https://example.com/mcp','Select');
 const choices=shortcut.actions.filter(a=>a.WFWorkflowActionIdentifier==='is.workflow.actions.choosefromlist');
 expect(choices).toHaveLength(2);
 expect(choices.every(a=>a.WFWorkflowActionParameters.WFChooseFromListActionSelectMultiple===true)).toBe(true);
 expect(warnings).toEqual([]);
 const condition=shortcut.actions.find(a=>a.WFWorkflowActionIdentifier==='is.workflow.actions.conditional' && a.WFWorkflowActionParameters.WFControlFlowMode===0)!;
 expect(JSON.stringify(condition)).toContain('\\ntypes\\n');
 expect(shortcut.actions.some(a=>a.WFWorkflowActionIdentifier.includes('repeat'))).toBe(false);
});
