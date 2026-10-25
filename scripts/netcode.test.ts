import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const scenes=[
 {seconds:4,narration:"Ты уже за стеной, но тебя убили."},
 {seconds:8,narration:"Пинг это путь до сервера и обратно. Ты двигаешься сразу."},
 {seconds:8,narration:"Сервер узнаёт позже, а враг видит тебя ещё позже."},
 {seconds:8,narration:"Он стреляет, сервер откатывает время и засчитывает попадание."},
 {seconds:6,narration:"Урон приходит за стеной. Кто выглядывает, видит первым."},
];
const at=(scene:number,progress:number,cue="")=>({scene,progress,cue});
function plan(){
 return {version:1,pingMs:60,labels:{you:"Ты",server:"Сервер",serverCopy:"Ты для сервера",enemy:"Враг",enemyCopy:"Ты у врага",rewind:"Перемотаем",hit:"Попадание",damage:"Урон",shot:"Выстрел",peek:"Видишь первым",summary:"Выходящий видит первым"},
  ruler:[{label:"Твой экран",value:""},{label:"Сервер",value:""},{label:"Экран врага",value:""}],
  events:[
   {kind:"hookRun",at:at(1,0)},{kind:"hookDeath",at:at(1,.6,"убили")},{kind:"rewind",at:at(2,0)},{kind:"server",at:at(2,.1,"сервера")},
   {kind:"pingOut",at:at(2,.2)},{kind:"pingBack",at:at(2,.4,"обратно")},{kind:"move",at:at(2,.7,"двигаешься")},
   {kind:"serverCopy",at:at(3,.1,"узнаёт")},{kind:"enemyCopy",at:at(3,.5,"враг")},{kind:"ruler",at:at(3,.8)},
   {kind:"shot",at:at(4,.1,"стреляет")},{kind:"shotPacket",at:at(4,.25)},{kind:"rollback",at:at(4,.4,"откатывает")},{kind:"hit",at:at(4,.8,"попадание")},
   {kind:"damagePacket",at:at(5,0)},{kind:"death",at:at(5,.25,"стеной")},{kind:"peek",at:at(5,.45,"выглядывает")},{kind:"peekShot",at:at(5,.85,"видит")},{kind:"outro",at:at(5,.95)}],
  camera:[{shot:"hook",at:at(1,0)},{shot:"server",at:at(2,.1)},{shot:"arena",at:at(3,0)},{shot:"rollback",at:at(4,.35)},{shot:"peek",at:at(5,.4)}],
  notes:["Замедленная модель."]};
}
test("netcode plan validates cues, order and camera spacing",async()=>{
 const {validateNetcode}=await import("../src/lib/netcode");
 assert.equal(validateNetcode(plan(),scenes).events.length,19);
 const missingCue=plan();missingCue.events[1].at.cue="нетслова";
 assert.throws(()=>validateNetcode(missingCue,scenes),/отсутствует/);
 const reordered=plan();reordered.events.find(e=>e.kind==="hit")!.at=at(4,0);
 assert.throws(()=>validateNetcode(reordered,scenes),/раньше/);
 const dup=plan();dup.events=dup.events.filter(e=>e.kind!=="ruler");dup.events.push({kind:"shot",at:at(4,.9)});
 assert.throws(()=>validateNetcode(dup,scenes),/повторяется/);
 const lonely=plan();lonely.events=lonely.events.filter(e=>e.kind!=="peekShot");
 assert.throws(()=>validateNetcode(lonely,scenes),/вместе/);
 const tight=plan();tight.camera[1].at=at(1,.1);
 assert.throws(()=>validateNetcode(tight,scenes),/1,2/);
});
test("netcode game clock is continuous and freezes the duel while explaining",async()=>{
 const {validateNetcode,eventTimes,gameClock,pathAt,pointAt,wallEntry,ARENA,LAG,FREEZE}=await import("../src/lib/netcode");
 const e=eventTimes(validateNetcode(plan(),scenes),scenes);
 let prev=gameClock(0,e);
 for(let f=1;f<34*30;f++){const g=gameClock(f/30,e);assert.ok(Math.abs(g-prev)<.08,`скачок времени на кадре ${f}`);prev=g;}
 assert.ok(Math.abs(gameClock((e.shot+e.death)/2,e)-FREEZE)<1e-9);
 // At the frozen moment you are hidden, while the shooter's copy of you is still in the open.
 const you=pointAt(pathAt(FREEZE)),seen=pointAt(pathAt(FREEZE-LAG.enemy));
 assert.notEqual(wallEntry(ARENA.enemy,you),null);
 assert.equal(wallEntry(ARENA.enemy,seen),null);
 // Peeker's advantage: when you shoot first, the shooter still sees you behind the wall.
 const g=gameClock(e.peekShot,e);
 assert.equal(wallEntry(ARENA.enemy,pointAt(pathAt(g))),null);
 assert.notEqual(wallEntry(ARENA.enemy,pointAt(pathAt(g-LAG.enemy))),null);
});
test("Claude adapter strips secrets/session identity and parses structured output",async()=>{
 const {claudeEnvironment,claudeArgs,parseClaudeResult,MOTION_AGENT}=await import("../src/lib/claude-provider");
 const env=claudeEnvironment({PATH:"/bin",HOME:"/h",ELEVENLABS_API_KEY:"x",TAVILY_API_KEY:"x",APIFY_TOKEN:"x",CODEX_THREAD:"x",CLAUDECODE:"1",CLAUDE_CODE_SESSION_ID:"s",ANTHROPIC_BASE_URL:"http://proxy",CLAUDE_CONFIG_DIR:"/c",ANTHROPIC_API_KEY:"k"} as any);
 for(const k of ["ELEVENLABS_API_KEY","TAVILY_API_KEY","APIFY_TOKEN","CODEX_THREAD","CLAUDECODE","CLAUDE_CODE_SESSION_ID","ANTHROPIC_BASE_URL"])assert.equal(env[k],undefined,k);
 assert.equal(env.CLAUDE_CONFIG_DIR,"/c");assert.equal(env.ANTHROPIC_API_KEY,"k");
 assert.equal(MOTION_AGENT.model,"claude-opus-5-5");assert.equal(MOTION_AGENT.effort,"xhigh");
 const args=claudeArgs({},{type:"object"},"");
 for(const flag of ["--restricted","--strict-mcp-config","--no-session-persistence","--json-schema"])assert.ok(args.includes(flag),flag);
 assert.equal(args[args.indexOf("--model")+1],"claude-opus-5-5");assert.equal(args[args.indexOf("--effort")+1],"xhigh");assert.equal(args[args.indexOf("--tools")+1],"");
 assert.deepEqual(parseClaudeResult(JSON.stringify({type:"result",subtype:"success",is_error:false,structured_output:{ok:true}})).value,{ok:true});
 assert.deepEqual(parseClaudeResult(JSON.stringify({type:"result",subtype:"success",is_error:false,result:"Готово: {\"ok\":1}"})).value,{ok:1});
 assert.throws(()=>parseClaudeResult(JSON.stringify({type:"result",subtype:"success",is_error:true,result:"Not logged in · Please run /login"})),/claude auth login/);
});
test("netcode director uses Claude-shaped ask, validates and caches",async()=>{
 const {prepareNetcode}=await import("../src/lib/netcode-director");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"netcode-director-"));let calls=0,agent:any;
 const storyboard:any={title:"Пинг",summary:"",factNotes:"",scenes:scenes.map((s,i)=>({...s,id:`scene-${i+1}`,title:"Глава",subtitle:"",visual:"flow",items:["x"]}))};
 const ask:any=async(_p:string,_s:unknown,_d:string,_i:string[],_sig:AbortSignal,a:any)=>{calls++;agent=a;return plan();};
 try{
  const out=await prepareNetcode(storyboard,dir,[],new AbortController().signal,ask);
  assert.equal(out.filmKind,"netcode");assert.equal(agent.model,"claude-opus-5-5");assert.equal(agent.effort,"xhigh");
  await prepareNetcode(storyboard,dir,[],new AbortController().signal,ask);assert.equal(calls,1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,"netcode-context.json"),"utf8")).director.provider,"claude");
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

// This exercises the exact CLI argument, not only the local Zod parser.
test("Claude CLI receives a compatible strict schema without the unsupported draft-2020 declaration",async()=>{
 const {claudeArgs}=await import("../src/lib/claude-provider"),{z}=await import("zod");
 const original=z.toJSONSchema(z.object({position:z.tuple([z.number(),z.number(),z.number()]),cueOccurrence:z.number().int().positive().optional()}));
 const args=claudeArgs({},original,"");const transmitted=JSON.parse(args[args.indexOf("--json-schema")+1]);
 assert.equal(transmitted.$schema,undefined);assert.equal((original as any).$schema,"https://json-schema.org/draft/2020-12/schema");
 assert.deepEqual(transmitted.properties.position.items,{type:"number"});assert.equal(transmitted.properties.position.prefixItems,undefined);
 assert.ok(transmitted.required.includes("cueOccurrence"));assert.deepEqual(transmitted.properties.cueOccurrence.anyOf.at(-1),{type:"null"});
});
