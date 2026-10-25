// Claude Code Stop hook: while a video started in this session is still in production, the agent must not end its turn.
// Allows stopping when the user has to decide (paid step, approval), on terminal states, when the studio is down
// (after one reminder), and after 3 reminders without any progress. Fails open on any error.
import fs from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";

const BUSY=new Set(["queued","running","awaiting-agent"]);
const WORKER_STALE_MS=30_000,MAX_IDLE_BLOCKS=3;
/** Pure decision: {block, reason, state}. projects: [{id,status,stage,progress,kind}] for this session only. */
export function stopDecision({projects,workerSeenAt,now=Date.now(),stopHookActive=false,state={}}){
 const busy=projects.filter(p=>BUSY.has(p.status));
 if(!busy.length)return {block:false,reason:"",state:{...state,blocks:null}};
 const signature=busy.map(p=>`${p.id}|${p.status}|${p.stage}|${p.progress}`).join(";");
 const workerAlive=workerSeenAt&&now-Date.parse(workerSeenAt)<WORKER_STALE_MS;
 if(!workerAlive){
  if(stopHookActive&&state.blocks?.kind==="worker")return {block:false,reason:"",state:{...state,blocks:null}};
  return {block:true,reason:`Ролик ${busy.map(p=>p.id).join(", ")} не готов, а движок студии не запущен. Запусти его в терминале пользователя (npm run studio -- start; в Claude desktop — через терминальную панель), затем npm run studio -- run ${busy[0].id} --timeout 540. Если запустить нельзя — скажи пользователю.`,state:{...state,blocks:{kind:"worker",signature,count:1}}};
 }
 const count=state.blocks?.signature===signature?(state.blocks.count??0)+1:1;
 if(count>MAX_IDLE_BLOCKS)return {block:false,reason:"",state:{...state,blocks:{kind:"idle",signature,count}}};
 // Parallel engine (2026-10-21): one session may drive several videos; each session is held only by its own runs.
 const line=p=>p.status==="awaiting-agent"
  ?`${p.id} ждёт твоих ответов (${p.stage}): npm run studio -- task ${p.id}, ответь answer.json, submit, затем npm run studio -- run ${p.id} --timeout 540`
  :`${p.id} ещё в работе: ${p.stage} (${p.progress??0}%) — npm run studio -- run ${p.id} --timeout 540`;
 const waiting=busy.filter(p=>p.status==="awaiting-agent"),ordered=[...waiting,...busy.filter(p=>p.status!=="awaiting-agent")];
 const reason=`${busy.length>1?`Ролики этой сессии не готовы (${busy.length}). Сначала те, что ждут тебя.`:"Ролик этой сессии не готов."} ${ordered.map(line).join(" · ")}. Не заканчивай ход, пока ролики не готовы или не нужен ответ пользователя.`;
 return {block:true,reason,state:{...state,blocks:{kind:"busy",signature,count}}};
}
async function main(){
 let out={};
 try{
  const input=JSON.parse(fs.readFileSync(0,"utf8"));
  const root=process.env.CLAUDE_PROJECT_DIR||input.cwd||process.cwd();
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(String(input.session_id)))return;
  const file=path.join(root,"data","agent-runs",`${input.session_id}.json`);
  if(!fs.existsSync(file))return;
  const state=JSON.parse(fs.readFileSync(file,"utf8"));
  const {DatabaseSync}=await import("node:sqlite");
  const db=new DatabaseSync(path.join(root,"data","studio.sqlite"),{readOnly:true});
  try{
   const projects=(state.projects||[]).map(({id})=>{
    const p=db.prepare("SELECT id,status,stage,progress FROM projects WHERE id=?").get(id);
    if(p)return {...p,kind:"project"};
    try{const a=db.prepare("SELECT id,status,stage,progress FROM authors WHERE id=?").get(id);return a?{...a,kind:"author"}:null;}catch{return null;}
   }).filter(Boolean);
   const seen=db.prepare("SELECT value FROM settings WHERE key='workerSeen'").get()?.value;
   const decision=stopDecision({projects,workerSeenAt:seen,stopHookActive:!!input.stop_hook_active,state});
   const tmp=`${file}.${randomUUID()}.tmp`;fs.writeFileSync(tmp,JSON.stringify({...state,...decision.state},null,2));fs.renameSync(tmp,file);
   if(decision.block)out={decision:"block",reason:decision.reason};
  }finally{db.close();}
 }catch{}
 finally{if(Object.keys(out).length)process.stdout.write(JSON.stringify(out));}
}
if(process.argv[1]&&import.meta.url===new URL(`file://${path.resolve(process.argv[1])}`).href)main().then(()=>process.exit(0),()=>process.exit(0));
