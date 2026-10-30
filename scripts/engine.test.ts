import {TEST_PYTHON} from "./test-tools";
// Parallel engine (user decision 2026-10-21): everything runs in parallel except local rendering.
import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {z} from "zod";

const previous=process.cwd();
let temp="";
let m:{
 store:typeof import("../src/lib/store");agent:typeof import("../src/lib/agent-provider");
 scheduler:typeof import("../src/lib/job-scheduler");slot:typeof import("../src/lib/render-slot");
 review:typeof import("../src/lib/export-review");config:typeof import("../src/lib/studio-config");
};
before(async()=>{
 temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),"studio-engine-")));
 process.chdir(temp);
 m={store:await import("../src/lib/store"),agent:await import("../src/lib/agent-provider"),scheduler:await import("../src/lib/job-scheduler"),
  slot:await import("../src/lib/render-slot"),review:await import("../src/lib/export-review"),config:await import("../src/lib/studio-config")};
});
after(()=>{m.store.db().close();process.chdir(previous);fs.rmSync(temp,{recursive:true,force:true});});

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function waitFor<T>(fn:()=>T|undefined|null|false,ms=15000):Promise<T>{const start=Date.now();for(;;){const v=fn();if(v)return v;if(Date.now()-start>ms)throw new Error("timeout");await sleep(20);}}
const schema=z.toJSONSchema(z.object({answer:z.string()}));
const insertJob=(id:string,project:string|null,kind="render",status="queued")=>m.store.db().prepare("INSERT INTO jobs(id,project_id,kind,status,created) VALUES(?,?,?,?,?)").run(id,project,kind,status,new Date(Date.now()+Number(id.replace(/\D/g,"")||0)).toISOString());
async function answerTask(scope:string,taskId:string,value:unknown){
 const dir=path.join(m.agent.tasksDir(scope),taskId);
 fs.writeFileSync(path.join(dir,"answer.json"),JSON.stringify(value));
 return m.agent.submitAnswer(dir);
}
/** Same per-job shape as the engine: own AbortController, agent context, park/cancel/pause settle only this job. */
function agentScheduler(scopes:Record<string,string>,results:Record<string,string>){
 return new m.scheduler.JobScheduler<any>({
  claim:()=>m.store.claimJob(),limit:()=>Infinity,
  execute:async(job,controller)=>{
   const scope=scopes[job.project_id];
   try{
    const value=await m.agent.runAgentJob({scope,label:job.project_id,declaredAgent:"test/model",signal:controller.signal},
     ()=>m.agent.askViaAgent(`Роль для ${job.project_id}`,schema,path.join(scope,"role"),[],controller.signal));
    results[job.id]=`done:${(value as any).answer}`;m.store.completeJob(job.id,"completed");
   }catch(e){results[job.id]=`stopped:${e instanceof Error?e.message:e}`;m.store.completeJob(job.id,"cancelled");}
  },
 });
}

test("claimJob runs different projects at once but never two jobs of one project",()=>{
 insertJob("j1","p1");insertJob("j2","p1","review-only");insertJob("j3","p2");insertJob("j4",null,"style");insertJob("j5",null,"style");
 const claimed=[m.store.claimJob(),m.store.claimJob(),m.store.claimJob(),m.store.claimJob()];
 assert.deepEqual(claimed.slice(0,3).map(j=>j.id),["j1","j3","j4"]);
 assert.equal(claimed[3],undefined,"p1 and the style analysis are busy");
 m.store.completeJob("j1","completed");
 assert.equal(m.store.claimJob().id,"j2","the next job of p1 starts after the first one ends");
 // eligible() can hold a kind back (legacy CLI jobs keep one at a time) while later jobs still start.
 m.store.completeJob("j4","completed");
 insertJob("j6","p3");
 assert.equal(m.store.claimJob(j=>j.kind!=="style").id,"j6");
 m.store.db().exec("DELETE FROM jobs");
});

test("two agent jobs wait for answers at the same time; cancelling one leaves the other waiting",async()=>{
 const scopes={a:path.join(temp,"projects/a"),b:path.join(temp,"projects/b")},results:Record<string,string>={};
 insertJob("ja","a");insertJob("jb","b");
 const s=agentScheduler(scopes,results);
 assert.equal(s.fill(),2,"both jobs start without waiting for each other");
 const [ta,tb]=await waitFor(()=>{const a=m.agent.activeTasks(scopes.a),b=m.agent.activeTasks(scopes.b);return a.length&&b.length?[a[0],b[0]]:null;});
 assert.equal(m.store.db().prepare("SELECT count(*) n FROM jobs WHERE status='running'").get()!.n,2);
 assert.ok(s.abort("ja"));
 await waitFor(()=>results.ja);
 assert.match(results.ja,/^stopped/);
 assert.equal(m.agent.activeTasks(scopes.b).length,1,"the other job still waits for its task");
 assert.equal(results.jb,undefined);
 assert.equal(ta.status,"pending");
 assert.deepEqual(await answerTask(scopes.b,tb.id,{answer:"b"}),{ok:true,errors:[]});
 await waitFor(()=>results.jb);assert.equal(results.jb,"done:b");
 await s.drain();assert.equal(s.size,0);
 m.store.db().exec("DELETE FROM jobs");
});

test("park of one parallel job holds only that job; a paused (held) row aborts only its own job",async()=>{
 const scopes={c:path.join(temp,"projects/c"),d:path.join(temp,"projects/d")},log:Record<string,string>={};
 insertJob("jc","c");insertJob("jd","d");
 const s=new m.scheduler.JobScheduler<any>({claim:()=>m.store.claimJob(),limit:()=>Infinity,execute:async(job,controller)=>{
  const watch=setInterval(()=>{const row=m.store.db().prepare("SELECT status FROM jobs WHERE id=?").get(job.id) as any;if(row?.status==="held")controller.abort();},50);
  try{await m.agent.runAgentJob({scope:scopes[job.project_id as "c"|"d"],label:job.id,declaredAgent:"t",signal:controller.signal,parkAfterMs:job.id==="jc"?300:60_000},()=>m.agent.askViaAgent("p",schema,path.join(scopes[job.project_id as "c"|"d"],"role"),[],controller.signal));log[job.id]="done";}
  catch(e){log[job.id]=e instanceof m.agent.AgentParkedError?"parked":controller.signal.aborted?"paused":"failed";}
  finally{clearInterval(watch);}
 }});
 s.fill();
 await waitFor(()=>log.jc);assert.equal(log.jc,"parked");
 assert.equal(log.jd,undefined,"the other job keeps waiting");
 m.store.db().prepare("UPDATE jobs SET status='held' WHERE id='jd'").run();
 await waitFor(()=>log.jd);assert.equal(log.jd,"paused");
 await s.drain();m.store.db().exec("DELETE FROM jobs");
});

test("the render slot runs local renders strictly one at a time, FIFO, and an aborted waiter leaves the queue",async()=>{
 const slot=new m.slot.RenderSlot(()=>1);let inside=0,max=0;const order:string[]=[],waits:string[]=[];
 const render=(label:string,ms:number,signal?:AbortSignal)=>slot.run(label,async()=>{inside++;max=Math.max(max,inside);order.push(`start:${label}`);await sleep(ms);order.push(`end:${label}`);inside--;},{signal,onWait:h=>waits.push(`${label}<${h.map(x=>x.label)}`)});
 const ac=new AbortController();
 const runs=[render("A",60),render("B",30),render("C",10,ac.signal),render("D",10)];
 await sleep(5);ac.abort();
 const settled=await Promise.allSettled(runs);
 assert.equal(max,1,"never two renders at once");
 assert.deepEqual(order,["start:A","end:A","start:B","end:B","start:D","end:D"]);
 assert.equal(settled[2].status,"rejected");
 assert.deepEqual(waits,["B<A","C<A","D<A"]);
 assert.deepEqual(slot.state().active,[]);assert.deepEqual(slot.state().waiting,[]);
 // Nested acquire inside a held slot (bundle inside the render step) passes through instead of deadlocking.
 assert.equal(await slot.run("outer",()=>slot.run("inner",async()=>"ok")),"ok");
 // Work outside the slot (agent waits, TTS, OCR) overlaps freely with a render.
 let overlapped=false;const r=slot.run("R",()=>sleep(40));await sleep(10);overlapped=slot.state().active.length===1;await r;
 assert.ok(overlapped);
});

test("frame review: agent mode sends every part at once; legacy keeps one part at a time",async()=>{
 const parts=[0,8,16];
 let inside=0,max=0;
 const part=async(start:number)=>{inside++;max=Math.max(max,inside);await sleep(20);inside--;return start;};
 assert.deepEqual(await m.review.reviewParts(parts,false,new AbortController().signal,part),parts);
 assert.equal(max,1,"legacy Codex/Claude CLI: the old order, one process at a time");
 max=0;
 assert.deepEqual(await m.review.reviewParts(parts,true,new AbortController().signal,part),parts);
 assert.equal(max,3,"agent mode: all parts are in flight together");
 // Real agent tasks: all three frame-review tasks are visible to the agent before any answer.
 const scope=path.join(temp,"projects/review");
 const pending=m.agent.runAgentJob({scope,label:"r",declaredAgent:"t"},()=>m.review.reviewParts(parts,true,new AbortController().signal,(start,signal)=>m.agent.askViaAgent(`Часть ${start}`,schema,path.join(scope,"quality","h",`frame-review-${start}`),[],signal)));
 const tasks=await waitFor(()=>{const t=m.agent.activeTasks(scope);return t.length===3?t:null;});
 assert.deepEqual(tasks.map(t=>t.role).sort(),["quality-h-frame-review-0","quality-h-frame-review-16","quality-h-frame-review-8"]);
 for(const t of [...tasks].reverse())await answerTask(scope,t.id,{answer:t.role});
 assert.deepEqual((await pending).map((v:any)=>v.answer),["quality-h-frame-review-0","quality-h-frame-review-8","quality-h-frame-review-16"],"results stay in part order");
 // A park in one part stops its siblings (no stray pollers) and is rethrown for the engine to hold the job.
 const stopped:number[]=[];
 await assert.rejects(m.review.reviewParts(parts,true,new AbortController().signal,async(start,signal)=>{
  if(start===8){await sleep(10);throw new m.agent.AgentParkedError(["x"]);}
  await new Promise((_,reject)=>signal.addEventListener("abort",()=>{stopped.push(start);reject(new Error("Остановлено."));},{once:true}));
 }),m.agent.AgentParkedError);
 assert.deepEqual(stopped.sort((a,b)=>a-b),[0,16]);
});

test("settings: one file with defaults, guarded render slot, no secrets",()=>{
 const {studioConfig,setConfig,configKeys,activeJobLimit}=m.config;
 const c=studioConfig(temp);
 assert.equal(c.defaults.brand,"ask");assert.equal(c.engine.renderSlots,1);assert.equal(c.engine.maxActiveJobs,0);assert.equal(activeJobLimit(c),Infinity);
 assert.ok(configKeys().includes("defaults.brand")&&configKeys().includes("engine.renderSlots")&&!configKeys().includes("ui.port")&&configKeys().includes("agent.declared"));
 assert.equal(setConfig("engine.maxActiveJobs","3",{root:temp}),3);assert.equal(activeJobLimit(studioConfig(temp)),3);
 assert.throws(()=>setConfig("engine.renderSlots","2",{root:temp}),/по словам пользователя/);
 assert.equal(setConfig("engine.renderSlots","2",{root:temp,userQuote:"да, два рендера"}),2);
 assert.equal(studioConfig(temp).confirmations[0].userQuote,"да, два рендера");
 assert.throws(()=>setConfig("agent.declared","sk_live_abc123",{root:temp}),/Секреты/);
 assert.throws(()=>setConfig("defaults.duration","61",{root:temp}),/Недопустимое/);
 assert.throws(()=>setConfig("elevenlabs.key","x",{root:temp}),/Нет такой настройки/);
 assert.equal(setConfig("defaults.brand","worldifthen",{root:temp}),"worldifthen");
 assert.equal(setConfig("defaults.brand",null,{root:temp}),"ask");
 const file=JSON.parse(fs.readFileSync(path.join(temp,"studio.config.json"),"utf8"));
 assert.equal(file.defaults,undefined,"unset removes the key; defaults are not copied into the file");
 assert.doesNotMatch(JSON.stringify(file),/ELEVENLABS|TAVILY|APIFY/);
});

test("ElevenLabs TTS: a 429 is retried with backoff without paying twice (cache, pending marker, PAID_GATE)",()=>{
 const python=TEST_PYTHON;
 const r=spawnSync(python,["-m","unittest","-v","test_elevenlabs_retry"],{cwd:path.join(previous,"scripts"),encoding:"utf8",env:{...process.env,ELEVENLABS_API_KEY:""}});
 assert.equal(r.status,0,r.stderr);
 assert.match(r.stderr,/Ran 5 tests[\s\S]*OK/);
});

test("Scribe: a 429 is retried with backoff; a quota 429 is not; rejections are marked as not processed",async()=>{
 const providers=await import("../src/lib/author-providers");
 fs.writeFileSync(path.join(temp,".env.local"),"ELEVENLABS_API_KEY=sample-private-key\n");
 const audio=path.join(temp,"audio.wav");fs.writeFileSync(audio,Buffer.alloc(100));
 const delays=[...providers.SCRIBE_RETRY_MS];providers.SCRIBE_RETRY_MS.splice(0,delays.length,...delays.map(()=>5));
 const original=globalThis.fetch;let calls=0;
 const busy=(status:string)=>new Response(JSON.stringify({detail:{status,message:"busy"}}),{status:429});
 try{
  globalThis.fetch=(async()=>{calls++;return calls<3?busy("too_many_concurrent_requests"):new Response(JSON.stringify({text:"Привет мир",language_code:"rus",words:[{type:"word",text:"Привет",start:0,end:.4},{type:"word",text:"мир",start:.5,end:.8}]}),{status:200});}) as typeof fetch;
  const t=await providers.scribe(audio,new AbortController().signal);
  assert.equal(calls,3);assert.equal(t.words.length,2);
  calls=0;globalThis.fetch=(async()=>{calls++;return busy("quota_exceeded");}) as typeof fetch;
  await assert.rejects(providers.scribe(audio,new AbortController().signal),(e:any)=>e.rejected===true&&e.httpStatus===429&&!String(e.message).includes("sample-private-key"));
  assert.equal(calls,1,"a quota answer is not retried");
  calls=0;globalThis.fetch=(async()=>{calls++;return busy("system_busy");}) as typeof fetch;
  await assert.rejects(providers.scribe(audio,new AbortController().signal),/лимит запросов/);
  assert.equal(calls,delays.length+1,"retries are bounded");
 }finally{globalThis.fetch=original;providers.SCRIBE_RETRY_MS.splice(0,delays.length,...delays);fs.rmSync(path.join(temp,".env.local"),{force:true});}
});
