// Prepares the owner's queued RAM film while the persistent worker reviews Roadster.
// Uses the same production functions and reserves the existing job atomically.
import fs from "node:fs/promises";
import path from "node:path";
import {ROOT, DATA, db, project, updateProject, event, completeJob} from "../src/lib/store";
import {auditManualPlan} from "../src/lib/editorial";
import {supplementSources} from "../src/lib/preproduction";
import {prepareVoicePlan, verifyAudioText} from "../src/lib/voice";
import {prepare2D} from "../src/lib/motion-director";
import {normalizePlan} from "../src/lib/model";
import {run, PYTHON, FFMPEG} from "../src/lib/provider";
import {readJSON, writeJSON, fileHash} from "../src/lib/quality";
import {soundCues} from "../src/lib/export-review";

async function main() {
 process.loadEnvFile(path.join(ROOT,".env.local"));
 const id="780ea45d-e247-48d9-8b60-7adfc785703c", dir=path.join(DATA,"projects",id);
 const manifest=await readJSON(path.join(DATA,"productions/2026-10-18-three-explainers/manifest.json"));
 let p=project(id);
 if(!manifest.items.some((v:any)=>v.id===id)||!p?.plan||p.status!=="queued"||p.profile.renderMode!=="2d"||p.profile.production?.version!==2)throw new Error("Only the owner's queued 2D batch film is allowed");
 const controller=new AbortController();
 for(const name of ["SIGTERM","SIGINT"] as const)process.on(name,()=>controller.abort());
 db().exec("BEGIN IMMEDIATE");let job:string;
 try {
  const jobs=db().prepare("SELECT id,status,kind FROM jobs WHERE project_id=? AND status IN ('queued','running')").all(id) as {id:string;status:string;kind:string}[];
  if(jobs.length!==1||jobs[0].status!=="queued"||jobs[0].kind!=="render")throw new Error("Film is not exclusively queued");
  job=jobs[0].id;
  db().prepare("UPDATE jobs SET status='running',started=? WHERE id=? AND status='queued'").run(new Date().toISOString(),job);
  db().exec("COMMIT");
 }catch(e){db().exec("ROLLBACK");throw e;}
 const signal=controller.signal;
 const stage=(name:string,progress:number)=>{
  if(signal.aborted||project(id)?.status==="cancelled")throw new Error("Остановлено.");
  updateProject(id,{status:"running",stage:name,progress,error:null});event(id,name);
 };
 try {
  const requested=(await readJSON(path.join(dir,"duration-budget.json")))?.seconds??p.duration;
  await writeJSON(path.join(dir,"duration-budget.json"),{seconds:requested});
  stage("Проверяем актуальный сценарий перед озвучкой",18);
  await auditManualPlan(p,dir,signal,supplementSources);
  await prepareVoicePlan(p,dir,signal);
  stage("Записываем русскую озвучку",20);
  const ttsProvider=await fs.readFile(path.join(dir,"tts-provider.txt"),"utf8").then(s=>s.trim()).catch(()=>undefined);
  await writeJSON(path.join(dir,"render.json"),{plan:p.plan,voice:p.voice,maxDuration:requested,ttsProvider});
  await writeJSON(path.join(dir,"storyboard.json"),p.plan);
  await run(PYTHON,[path.join(ROOT,"scripts/speech.py"),dir,FFMPEG],{signal,timeout:240000});
  const measured=await readJSON(path.join(dir,"storyboard.json"));
  const duration=Math.round(measured.scenes.reduce((n:number,s:{seconds:number})=>n+s.seconds,0));
  if(duration>requested)throw new Error("Озвучка превысила бюджет.");
  let plan=normalizePlan(measured,duration,p.voice,requested);
  const alignment=await readJSON(path.join(dir,"alignment.json"));
  await writeJSON(path.join(dir,"production-audio-baseline.json"),{recordedAt:new Date().toISOString(),narrationHash:await fileHash(path.join(dir,"narration.wav"))});
  stage("Claude: постановка сквозной 2D-системы",27);
  plan=await prepare2D(plan,p.profile,dir,alignment,signal);
  updateProject(id,{plan,duration});p=project(id)!;
  await writeJSON(path.join(dir,"storyboard.json"),plan);
  stage("Независимо проверяем подписи постановки",28);
  await auditManualPlan(p,dir,signal,supplementSources);
  stage("Scribe: сверяем слова непрерывного мастера",30);
  await verifyAudioText(p,dir,signal);
  stage("Сводим сохранённый мастер и звуковые акценты",32);
  await writeJSON(path.join(dir,"sound-cues.json"),soundCues(plan,alignment));
  await run(PYTHON,[path.join(ROOT,"scripts/remix.py"),dir,FFMPEG],{signal,timeout:240000});
  updateProject(id,{status:"queued",stage:"Голос и постановка готовы; ожидает рендера",progress:33,error:null});
  db().prepare("UPDATE jobs SET status='queued',started=NULL WHERE id=? AND status='running'").run(job);
  console.log({id,prepared:true});
 }catch(e){
  const message=e instanceof Error?e.message:"Подготовка медиа не завершена";
  completeJob(job,"failed",message.slice(0,800));
  if(project(id)?.status!=="cancelled")updateProject(id,{status:"failed",stage:"Подготовка медиа требует проверки",error:message.slice(0,800)});
  console.log({id,prepared:false,error:message});process.exitCode=1;
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
