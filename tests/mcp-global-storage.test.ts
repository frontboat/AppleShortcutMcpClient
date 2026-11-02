import { test,expect } from 'bun:test';
import {Shortcut} from 'shortcutkit';
import {appendServerPicker,REGISTRY_KEY,CACHE_PREFIX} from '../src/mcp-global-storage.mts';
test('server registry uses global storage, prompts for text URL and stores dictionary JSON',()=>{
 const s=new Shortcut('Storage test');appendServerPicker(s);
 const a=s.actions;
 const storage=a.filter(x=>x.WFWorkflowActionIdentifier.includes('storedcontent'));
 expect(storage).toHaveLength(2);
 for(const action of storage){expect(action.WFWorkflowActionParameters.WFStoredContentGlobalValue).toBe(true);expect(JSON.stringify(action.WFWorkflowActionParameters.WFStoredContentKey)).toContain(REGISTRY_KEY);}
 const asks=a.filter(x=>x.WFWorkflowActionIdentifier==='is.workflow.actions.ask');
 expect(asks).toHaveLength(2);expect(asks.every(x=>x.WFWorkflowActionParameters.WFInputType==='Text')).toBe(true);
 expect(CACHE_PREFIX).toContain('2026-07-28');
});
