import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {z} from "zod";
import {CONTENT_AGENT,OPUS_CONTENT_AGENT,contentAgentFor,productionSettingsSchema} from "../src/lib/quality-contract";
import {contentAsk} from "../src/lib/content-agent";
import {structured} from "../src/lib/editorial";

const production={version:2 as const,policyVersion:"quality/2.0.0"};

test("content role stays Sol unless the project explicitly selected Opus",()=>{
 // Byte-identical legacy descriptor keeps every existing role cache and state hash valid.
 assert.deepEqual(CONTENT_AGENT,{model:"gpt-6.1-sol",effort:"xhigh",timeout:900_000});
 assert.equal(contentAgentFor(undefined),CONTENT_AGENT);
 assert.equal(contentAgentFor({production}),CONTENT_AGENT);
 assert.equal(contentAgentFor({production:{...production,contentAgent:"claude-opus-5-5"}}),OPUS_CONTENT_AGENT);
 assert.equal(productionSettingsSchema.parse({...production,contentAgent:"claude-opus-5-5"}).contentAgent,"claude-opus-5-5");
 assert.throws(()=>productionSettingsSchema.parse({...production,contentAgent:"claude-sonnet-5-5"}));
});

test("role caches are separated by the selected content model",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"studio-content-role-"));
 try{
  const calls:unknown[]=[];
  const agent=async(...args:unknown[])=>{calls.push(args[5]);return {value:calls.length};};
  const schema=z.object({value:z.number()}),signal=new AbortController().signal;
  assert.equal((await structured("rules",schema,dir,signal,agent as any,OPUS_CONTENT_AGENT)).value,1);
  assert.deepEqual((JSON.parse(await fs.readFile(path.join(dir,"cache.json"),"utf8"))).role,OPUS_CONTENT_AGENT);
  assert.equal((await structured("rules",schema,dir,signal,agent as any,OPUS_CONTENT_AGENT)).value,1,"same role reuses its cache");
  assert.equal((await structured("rules",schema,dir,signal,agent as any,CONTENT_AGENT)).value,2,"another model never reuses the Opus answer");
  assert.deepEqual(calls,[OPUS_CONTENT_AGENT,CONTENT_AGENT]);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

async function fakeClaude(dir:string,reportedModel:string){
 const bin=path.join(dir,"fake-claude"),argsFile=path.join(dir,"args.txt");
 const out=JSON.stringify({type:"result",subtype:"success",is_error:false,result:"",structured_output:{value:7},num_turns:1,total_cost_usd:0,modelUsage:{[reportedModel]:{inputTokens:1,outputTokens:1}}});
 await fs.writeFile(bin,`#!/bin/sh\nprintf '%s\\n' "$@" > ${JSON.stringify(argsFile)}\ncat > /dev/null\nprintf '%s\\n' ${JSON.stringify(out)}\n`,{mode:0o755});
 return {bin,argsFile};
}

test("an Opus project reaches Claude Code with the requested model and rejects a substitute",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"studio-content-claude-")),previous=process.env.STUDIO_CLAUDE;
 try{
  const schema=z.toJSONSchema(z.object({value:z.number()})),signal=new AbortController().signal;
  const ok=await fakeClaude(dir,"claude-opus-5-5");process.env.STUDIO_CLAUDE=ok.bin;
  assert.deepEqual(await contentAsk(OPUS_CONTENT_AGENT)("prompt",schema,path.join(dir,"role"),[],signal),{value:7});
  const args=(await fs.readFile(ok.argsFile,"utf8")).split("\n");
  assert.equal(args[args.indexOf("--model")+1],"claude-opus-5-5");
  assert.equal(args[args.indexOf("--effort")+1],"xhigh");
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,"role","progress.json"),"utf8")).requestedModel,"claude-opus-5-5");
  const other=await fakeClaude(dir,"claude-sonnet-5-5");process.env.STUDIO_CLAUDE=other.bin;
  await assert.rejects(contentAsk(OPUS_CONTENT_AGENT)("prompt",schema,path.join(dir,"substitute"),[],signal),/Подмена не допускается/);
 }finally{
  if(previous===undefined)delete process.env.STUDIO_CLAUDE;else process.env.STUDIO_CLAUDE=previous;
  await fs.rm(dir,{recursive:true,force:true});
 }
});

test("new writing and evidence skills reach only projects whose snapshot contains them",async()=>{
 const {snapshotRole}=await import("../src/lib/editorial");
 const {qualityInstructions}=await import("../src/lib/quality-instructions");
 const {createHash}=await import("node:crypto");
 const fresh=await fs.mkdtemp(path.join(os.tmpdir(),"studio-skill-new-")),legacy=await fs.mkdtemp(path.join(os.tmpdir(),"studio-skill-old-"));
 try{
  const snapshot=qualityInstructions(process.cwd(),fresh);
  assert.match(snapshot.roles["reel-script-craft"],/но \/ поэтому/);
  assert.match(await snapshotRole("claim-evidence-rules",fresh),/Бремя доказательства/);
  const {sha256,...body}=snapshot,old={...body,roles:Object.fromEntries(Object.entries(body.roles).filter(([n])=>!["reel-script-craft","claim-evidence-rules"].includes(n)))};
  await fs.writeFile(path.join(legacy,"quality-instructions.json"),JSON.stringify({...old,sha256:createHash("sha256").update(JSON.stringify(old)).digest("hex")}));
  assert.equal(await snapshotRole("reel-script-craft",legacy),"","an older frozen snapshot never picks up the live skill");
  assert.equal(await snapshotRole("reel-script-craft",undefined),"");
 }finally{await fs.rm(fresh,{recursive:true,force:true});await fs.rm(legacy,{recursive:true,force:true});}
});

test("lenient fact checking blocks only contradictions and is an explicit project setting",async()=>{
 const {factsPassed}=await import("../src/lib/quality");
 const {lenientFacts}=await import("../src/lib/quality-contract");
 const claim=(status:string)=>({id:"c1",span:"x",claim:"x",kind:"fact",status,reason:"r",evidence:[]});
 const report=(status:string)=>({summary:"",queries:[],claims:[claim(status)]}) as any;
 assert.equal(factsPassed(report("uncertain")),false,"strict keeps the old rule");
 assert.equal(factsPassed(report("uncertain"),true),true);
 assert.equal(factsPassed(report("contradicted"),true),false);
 assert.equal(lenientFacts({production:{...production,factCheck:"lenient"}}),true);
 assert.equal(lenientFacts({production}),false);
 // User decision 2026-10-19: "off" is an explicit project mode; arbitrary values stay invalid.
 assert.equal(productionSettingsSchema.parse({...production,factCheck:"off"}).factCheck,"off");
 assert.throws(()=>productionSettingsSchema.parse({...production,factCheck:"none"}));
});
