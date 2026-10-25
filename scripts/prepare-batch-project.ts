import path from 'node:path';
import {ROOT,DATA,db,enqueue,project,updateProject,event,completeJob} from '../src/lib/store';
import {readJSON,writeJSON} from '../src/lib/quality';
import {preproduce} from '../src/lib/preproduction';
async function main(){
 process.loadEnvFile(path.join(ROOT,'.env.local'));
 const id=process.argv[2],manifest=await readJSON(path.join(DATA,'productions/2026-10-18-three-explainers/manifest.json'));
 if(!manifest.items.some((i:any)=>i.id===id)||!project(id))throw new Error('Only this owner-requested batch is allowed');
 if(db().prepare("SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')").get(id))throw new Error('Project already active');
 if(project(id)!.plan)throw new Error('Preserve a completed/manual storyboard; this helper only prepares before speech');
 db().exec('BEGIN IMMEDIATE');let job:string;try{job=enqueue(id);db().prepare("UPDATE jobs SET status='running',started=? WHERE id=?").run(new Date().toISOString(),job);updateProject(id,{status:'running',stage:'Готовим сценарий по обновлённым источникам',error:null});db().exec('COMMIT');}catch(e){db().exec('ROLLBACK');throw e;}
 const controller=new AbortController();for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>controller.abort());
 try{const plan=await preproduce(project(id)!,path.join(DATA,'projects',id),(stage,progress)=>{if(controller.signal.aborted||project(id)?.status==='cancelled')throw new Error('Остановлено.');updateProject(id,{status:'running',stage,progress,error:null});event(id,stage);},controller.signal);updateProject(id,{plan,title:plan.title,status:'queued',stage:'Сценарий проверен; ожидает озвучки',progress:18,error:null});db().prepare("UPDATE jobs SET status='queued',started=NULL WHERE id=? AND status='running'").run(job);console.log({id,prepared:true});}catch(e){const message=e instanceof Error?e.message:'Подготовка не завершена';completeJob(job,'failed',message.slice(0,800));updateProject(id,{status:'failed',stage:'Подготовка требует исправления',error:message.slice(0,800)});console.log({id,prepared:false,error:message});process.exitCode=1;}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
