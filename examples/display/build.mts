import { mkdir } from 'node:fs/promises';
const outputDir = new URL('../../dist/labs/', import.meta.url);
await mkdir(outputDir, { recursive: true });
import { Shortcut, actions, ref, text, variable, coerce, type Attachment, type VariableType } from 'shortcutkit';
type V=Attachment<Exclude<VariableType,'Ask'>>;
const meta={
 'io.modelcontextprotocol/protocolVersion':'2026-07-28',
 'io.modelcontextprotocol/clientCapabilities':{},
 'io.modelcontextprotocol/clientInfo':{name:'shortcut-display-lab',version:'0.1.0'},
};
const surplus='https://publicsurplus-production.up.railway.app/mcp';
function helpers(s:Shortcut){
 const txt=(...p:Parameters<typeof text>)=>s.action(actions.gettext,{WFTextActionText:text(...p)});
 const get=(v:V,k:string)=>s.action(actions.getvalueforkey,{WFInput:v,WFGetDictionaryValueType:'Value',WFDictionaryKey:text(k)});
 function request(url:V|string,method:string,params:Record<string,unknown>,tool?:string){
  const body=txt(JSON.stringify({jsonrpc:'2.0',id:1,method,params:{...params,_meta:meta}}));
  return s.action(actions.downloadurl,{WFURL:typeof url==='string'?text(url):text(url),WFHTTPMethod:'POST',ShowHeaders:1,
   WFHTTPHeaders:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2026-07-28','Mcp-Method':method,...(tool?{'Mcp-Name':tool}:{})},
   WFHTTPBodyType:'File',WFRequestVariable:ref(body)});
 }
 function preview(v:V){s.action(actions.previewdocument,{WFInput:v});s.action(actions.output,{WFOutput:v});}
 return {txt,get,request,preview};
}
// Test 1: metadata only. No tools are executed.
{
 const s=new Shortcut('MCP Lab 1 - Tools');const {txt,get,request,preview}=helpers(s);
 const endpoint=s.action(actions.ask,{WFInputType:'Text',WFAskActionPrompt:text('MCP URL to inspect (no tool will be called)'),WFAskActionDefaultAnswer:text(surplus)});
 const response=request(ref(endpoint),'tools/list',{});
 const tools=get(ref(response),'result.tools');
 const names=s.repeatEach(ref(tools));
 const name=get(variable('Repeat Item'),'name');
 s.action(actions.appendvariable,{WFVariableName:'Names',WFInput:ref(name)});s.endRepeatEach(names);
 const chosen=s.action(actions.choosefromlist,{WFInput:variable('Names'),WFChooseFromListActionPrompt:text('Choose a tool to inspect')});
 const each=s.repeatEach(ref(tools));const n=get(variable('Repeat Item'),'name');
 const gid=crypto.randomUUID().toUpperCase();
 s.action(actions.conditional,{WFInput:coerce(n,'WFStringContentItem'),WFCondition:4,WFConditionalActionString:text(ref(chosen)),GroupingIdentifier:gid,WFControlFlowMode:0});
 const description=get(variable('Repeat Item'),'description');
 const schema=get(variable('Repeat Item'),'inputSchema');
 const fields=get(ref(schema),'properties');
 const required=get(ref(schema),'required');
 const display=txt('TOOL\n',ref(n),'\n\nDESCRIPTION\n',ref(description),'\n\nREQUIRED INPUTS\n',ref(required),'\n\nPARAMETERS / INPUT OPTIONS\n',ref(fields),'\n\nFULL INPUT SCHEMA\n',ref(schema));
 preview(ref(display));s.endIf(gid);s.endRepeatEach(each);
 await s.write(decodeURIComponent(new URL(`${s.name}.shortcut`, outputDir).pathname));console.log(s.name,s.actions.length);
}
// Test 2: real unstructured text, no property-specific parser.
{
 const s=new Shortcut('MCP Lab 2 - Text');const {txt,get,request,preview}=helpers(s);
 const response=request(surplus,'tools/call',{name:'search_lots',arguments:{limit:3}},'search_lots');
 const blocks=get(ref(response),'result.content');
 const each=s.repeatEach(ref(blocks));const kind=get(variable('Repeat Item'),'type');
 const isText=s.if(coerce(kind,'WFStringContentItem'),'is','text');
 const content=get(variable('Repeat Item'),'text');
 s.action(actions.appendvariable,{WFVariableName:'Text blocks',WFInput:ref(content)});
 s.endIf(isText);s.endRepeatEach(each);
 const joined=s.action(actions.text_combine,{text:variable('Text blocks'),WFTextSeparator:'New Lines'});
 const display=txt('PublicSurplus: text result\n\n',ref(joined));preview(ref(display));
 await s.write(decodeURIComponent(new URL(`${s.name}.shortcut`, outputDir).pathname));console.log(s.name,s.actions.length);
}
// Test 3: synthetic structured data shown independently of text content.
{
 const s=new Shortcut('MCP Lab 3 - Structured');const {txt,get,request,preview}=helpers(s);
 const response=s.action(actions.dictionary,{WFItems:{result:{structuredContent:{total:2,records:[{id:'sample-1',name:'Example item',status:'available',details:{category:'sample'}},{id:'sample-2',name:'Another item',status:'available'}]}}}});
 const data=get(ref(response),'result.structuredContent');
 const display=txt('SYNTHETIC STRUCTURED RESULT\nTwo illustrative records; no live location data.\n\n',ref(data));preview(ref(display));
 await s.write(decodeURIComponent(new URL(`${s.name}.shortcut`, outputDir).pathname));console.log(s.name,s.actions.length);
}
// Test 4: generic field labels for each record; nested values stay lossless JSON.
{
 const s=new Shortcut('MCP Lab 4 - Field View');const {txt,get,request,preview}=helpers(s);
 const response=s.action(actions.dictionary,{WFItems:{result:{structuredContent:{total:2,records:[{id:'sample-1',name:'Example item',status:'available',details:{category:'sample'}},{id:'sample-2',name:'Another item',status:'available'}]}}}});
 const rows=get(ref(response),'result.structuredContent.records');
 const outer=s.repeatEach(ref(rows));
 s.action(actions.setvariable,{WFVariableName:'Record',WFInput:variable('Repeat Item')});
 const heading=txt('\n──────── RECORD ',variable('Repeat Index'),' ────────\n');
 s.action(actions.appendvariable,{WFVariableName:'Display lines',WFInput:ref(heading)});
 const fields=s.action(actions.getvalueforkey,{WFInput:variable('Record'),WFGetDictionaryValueType:'All Keys'});
 const inner=s.repeatEach(ref(fields));
 const value=s.action(actions.getvalueforkey,{WFInput:variable('Record'),WFGetDictionaryValueType:'Value',WFDictionaryKey:text(variable('Repeat Item 2'))});
 const line=txt(variable('Repeat Item 2'),': ',ref(value),'\n');
 s.action(actions.appendvariable,{WFVariableName:'Display lines',WFInput:ref(line)});
 s.endRepeatEach(inner);s.endRepeatEach(outer);
 const combined=s.action(actions.text_combine,{text:variable('Display lines'),WFTextSeparator:'New Lines'});
 preview(ref(combined));
 await s.write(decodeURIComponent(new URL(`${s.name}.shortcut`, outputDir).pathname));console.log(s.name,s.actions.length);
}
