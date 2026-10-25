import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {existsSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {z} from "zod";

// Fake model CLIs leave a marker if anything spawns them: agent jobs must never reach Codex or Claude.
let tmp="";let marker="";
let m:{
 provider:typeof import("../src/lib/provider");claude:typeof import("../src/lib/claude-provider");
 agent:typeof import("../src/lib/agent-provider");content:typeof import("../src/lib/content-agent");
 contract:typeof import("../src/lib/quality-contract");editorial:typeof import("../src/lib/editorial");
};
before(async()=>{
 tmp=await fs.mkdtemp(path.join(os.tmpdir(),"studio-agent-mode-"));marker=path.join(tmp,"spawned.txt");
 for(const name of ["codex","claude"]){const bin=path.join(tmp,`fake-${name}`);await fs.writeFile(bin,`#!/bin/sh\necho ${name} >> ${JSON.stringify(marker)}\nexit 1\n`,{mode:0o755});process.env[`STUDIO_${name.toUpperCase()}`]=bin;}
 m={provider:await import("../src/lib/provider"),claude:await import("../src/lib/claude-provider"),agent:await import("../src/lib/agent-provider"),content:await import("../src/lib/content-agent"),contract:await import("../src/lib/quality-contract"),editorial:await import("../src/lib/editorial")};
});
after(async()=>{await fs.rm(tmp,{recursive:true,force:true});});

const schema=z.object({title:z.string(),note:z.string().optional(),count:z.number().int()});
const signal=()=>new AbortController().signal;
async function waitFor<T>(fn:()=>T|undefined|null|false,ms=30000):Promise<T>{const start=Date.now();for(;;){const v=fn();if(v)return v;if(Date.now()-start>ms)throw new Error("timeout");await new Promise(r=>setTimeout(r,20));}}
async function answer(scope:string,value:unknown,opts:{isolated?:boolean}={}){
 const task=await waitFor(()=>m.agent.activeTasks(scope)[0]);
 await fs.writeFile(path.join(task.path,"answer.json"),JSON.stringify(value));
 return {task,result:await m.agent.submitAnswer(task.path,opts)};
}
const job=(scope:string,extra:Partial<import("../src/lib/agent-provider").AgentJob>={})=>({scope,label:"test",declaredAgent:"test-harness/model-x",...extra});

test("legacy projects keep their descriptors by reference; agent projects get the self-declared driving agent",()=>{
 const {contract,content,claude}=m;
 const production={version:2 as const,policyVersion:"quality/2.0.0"};
 assert.equal(contract.contentAgentFor({production}),contract.CONTENT_AGENT);
 assert.equal(contract.contentAgentFor({production:{...production,contentAgent:"claude-opus-5-5"}}),contract.OPUS_CONTENT_AGENT);
 assert.equal(content.motionAgentFor({production}),claude.MOTION_AGENT);
 assert.equal(content.motionAskFor({production}),undefined);
 assert.deepEqual(content.directorRecord(),{provider:"claude",model:"claude-opus-5-5",effort:"xhigh"});
 const agentProfile={production:{...production,agentMode:{version:1 as const,declaredAgent:"claude-code/claude-opus-5-5"}}};
 assert.deepEqual(contract.contentAgentFor(agentProfile),{provider:"agent",model:"driving-agent",effort:"xhigh",timeout:900_000,declaredAgent:"claude-code/claude-opus-5-5"});
 assert.equal((content.motionAgentFor(agentProfile) as any).provider,"agent");
 assert.equal(contract.productionSettingsSchema.parse(agentProfile.production).agentMode?.declaredAgent,"claude-code/claude-opus-5-5");
 assert.match(content.contentLabel(contract.contentAgentFor(agentProfile)),/Ведущий агент · claude-code\/claude-opus-5-5 \(самоотчёт\)/);
});

test("an agent role outside a worker job is refused instead of silently using another model",async()=>{
 await assert.rejects(m.agent.askViaAgent("prompt",z.toJSONSchema(schema),path.join(tmp,"outside"),[],signal()),/вне задачи worker/);
});

test("Codex adapter inside an agent job writes a task, waits, validates and returns the restored answer",async()=>{
 const scope=path.join(tmp,"project-a"),image=path.join(tmp,"frame.jpg");await fs.mkdir(scope,{recursive:true});await fs.writeFile(image,"jpeg-bytes");
 const events:string[]=[];
 const pending=m.agent.runAgentJob(job(scope,{onWait:w=>events.push(`wait:${w.map(t=>t.role).join(",")}`),onResume:()=>events.push("resume")}),()=>m.provider.askJSON("Напиши заголовок.",z.toJSONSchema(schema),path.join(scope,"quality","model-0"),[image],signal(),{model:"gpt-6.1-sol",effort:"xhigh"}));
 const task=await waitFor(()=>m.agent.activeTasks(scope)[0]);
 assert.equal(task.role,"quality-model-0");assert.equal(task.isolation,"recommended");assert.equal(task.hint.model,"gpt-6.1-sol");
 assert.match(await fs.readFile(path.join(task.path,"prompt.md"),"utf8"),/^Напиши заголовок\.[\s\S]*images\/image-1\.jpg/);
 assert.equal(await fs.readFile(path.join(task.path,"images/image-1.jpg"),"utf8"),"jpeg-bytes");
 const strict=JSON.parse(await fs.readFile(path.join(task.path,"schema.json"),"utf8"));
 assert.deepEqual(strict.required.sort(),["count","note","title"],"strict schema: every key present, optional as null");
 await fs.writeFile(path.join(task.path,"answer.json"),JSON.stringify({title:"x",note:null}));
 const bad=await m.agent.submitAnswer(task.path);
 assert.equal(bad.ok,false);assert.ok(bad.errors.some(e=>e.startsWith("count")));
 await fs.writeFile(path.join(task.path,"answer.json"),JSON.stringify({title:"Заголовок",note:null,count:3}));
 assert.equal((await m.agent.submitAnswer(task.path,{isolated:true})).ok,true);
 assert.deepEqual(await pending,{title:"Заголовок",count:3},"null optionals are restored to absent");
 const progress=JSON.parse(await fs.readFile(path.join(scope,"quality","model-0","progress.json"),"utf8"));
 assert.equal(progress.provider,"agent");assert.equal(progress.verified,false);assert.equal(progress.isolated,true);assert.equal(progress.declaredAgent,"test-harness/model-x");
 assert.equal(m.agent.listTasks(scope)[0].status,"consumed");
 assert.deepEqual(events,["wait:quality-model-0","resume"]);
 assert.deepEqual(m.agent.activeTasks(scope),[]);
 assert.equal(existsSync(marker),false,"no model CLI was spawned");
});

test("Claude adapter and content/structured roles also go to the agent; the role cache records the agent",async()=>{
 const scope=path.join(tmp,"project-b");await fs.mkdir(scope,{recursive:true});
 const role=m.contract.agentDescriptor("codex/gpt-x");
 const motion=m.agent.runAgentJob(job(scope),()=>m.claude.askClaudeJSON("Постановка.",z.toJSONSchema(schema),path.join(scope,"motion-2d-director"),[],signal(),m.claude.MOTION_AGENT));
 assert.equal((await answer(scope,{title:"m",note:"n",count:1})).result.ok,true);
 assert.deepEqual(await motion,{title:"m",note:"n",count:1});
 const record=m.agent.runAgentJob(job(scope),async()=>({director:m.content.directorRecord()}));
 assert.deepEqual((await record).director,{provider:"agent",model:"driving-agent",effort:"xhigh",declaredAgent:"test-harness/model-x",verified:false});
 const story=m.agent.runAgentJob(job(scope),()=>m.editorial.structured("Рассказ.",schema,path.join(scope,"writer"),signal(),undefined,role));
 await answer(scope,{title:"s",note:null,count:2});
 assert.deepEqual(await story,{title:"s",count:2});
 assert.equal(JSON.parse(await fs.readFile(path.join(scope,"writer","cache.json"),"utf8")).role.provider,"agent");
 assert.deepEqual(await m.editorial.structured("Рассказ.",schema,path.join(scope,"writer"),signal(),undefined,role),{title:"s",count:2},"validated role answers stay cached");
 assert.equal(existsSync(marker),false);
});

test("a pending task survives an aborted job and is reused; a consumed answer is never reused",async()=>{
 const scope=path.join(tmp,"project-c");await fs.mkdir(scope,{recursive:true});
 const ac=new AbortController();
 const first=m.agent.runAgentJob(job(scope,{signal:ac.signal}),()=>m.provider.askJSON("Одно и то же.",z.toJSONSchema(schema),path.join(scope,"role"),[],ac.signal));
 const task=await waitFor(()=>m.agent.activeTasks(scope)[0]);ac.abort();
 await assert.rejects(first,/Остановлено/);
 const again=m.agent.runAgentJob(job(scope),()=>m.provider.askJSON("Одно и то же.",z.toJSONSchema(schema),path.join(scope,"role"),[],signal()));
 const reused=await waitFor(()=>m.agent.activeTasks(scope)[0]);
 assert.equal(reused.id,task.id,"same prompt after restart reuses the waiting task");
 await answer(scope,{title:"r",note:null,count:1});await again;
 const third=m.agent.runAgentJob(job(scope),()=>m.provider.askJSON("Одно и то же.",z.toJSONSchema(schema),path.join(scope,"role"),[],signal()));
 const fresh=await waitFor(()=>m.agent.activeTasks(scope)[0]);
 assert.notEqual(fresh.id,task.id,"a consumed answer is used once");
 await answer(scope,{title:"t",note:null,count:2});assert.equal((await third).title,"t");
 assert.equal((await m.agent.submitAnswer(fresh.path).catch(e=>e)).message.includes("уже"),true,"double submit is refused");
});

test("an unanswered task parks the job instead of failing it",async()=>{
 const scope=path.join(tmp,"project-d");await fs.mkdir(scope,{recursive:true});
 await assert.rejects(m.agent.runAgentJob(job(scope,{parkAfterMs:50}),()=>m.provider.askJSON("Пауза.",z.toJSONSchema(schema),path.join(scope,"role"),[],signal())),(e:unknown)=>e instanceof m.agent.AgentParkedError);
 assert.equal(m.agent.listTasks(scope)[0].status,"pending","the task stays for the agent");
});

test("concurrent roles in one job produce a batch of tasks the agent can answer in parallel",async()=>{
 const scope=path.join(tmp,"project-e");await fs.mkdir(scope,{recursive:true});
 const all=m.agent.runAgentJob(job(scope),()=>Promise.all([1,2,3].map(i=>m.provider.askJSON(`Фрагмент ${i}.`,z.toJSONSchema(schema),path.join(scope,`part-${i}-agent`),[],signal()))));
 const tasks=await waitFor(()=>{const t=m.agent.activeTasks(scope);return t.length===3&&t;});
 assert.equal(new Set(tasks.map(t=>t.id)).size,3);
 for(const [i,t] of tasks.entries()){await fs.writeFile(path.join(t.path,"answer.json"),JSON.stringify({title:t.role,note:null,count:i}));assert.equal((await m.agent.submitAnswer(t.path)).ok,true);}
 assert.deepEqual((await all).map(v=>v.title).sort(),["part-1-agent","part-2-agent","part-3-agent"]);
});

test("every role schema converts to a strict schema the submit check can validate",async()=>{
 const [visual,scene3d,netcode,illustrated,authorModel,refModel,model,research]=await Promise.all([import("../src/lib/visual-contract"),import("../src/lib/scene3d"),import("../src/lib/netcode"),import("../src/lib/illustrated"),import("../src/lib/author-model"),import("../src/lib/video-reference-model"),import("../src/lib/model"),import("../src/lib/research-model")]);
 const c=m.contract;
 const schemas:Record<string,unknown>={narrative:c.narrativeSchema,editorial:c.editorialSchema,claims:c.claimsSchema,facts:c.factResultSchema,frameReview:c.frameReviewSchema,visualConcept:visual.visualConceptSchema,assembly:visual.assemblyPlanSchema,world3d:scene3d.world3dSchema,netcode:netcode.netcodeSchema,illustrated:illustrated.illustratedSchema,videoAnalysis:authorModel.videoAnalysisSchema,corpus:authorModel.corpusSchema,chunk:refModel.chunkAnalysisSchema,research:research.researchSchema};
 for(const [name,s] of Object.entries(schemas)){
  const strict=m.provider.schemaForAgent(z.toJSONSchema(s as z.ZodType));
  const validator=z.fromJSONSchema(strict);
  assert.equal(validator.safeParse({}).success,false,`${name}: empty answer must be rejected`);
 }
 assert.equal(z.fromJSONSchema(m.provider.schemaForAgent(model.profileJsonSchema)).safeParse({}).success,false);
});
