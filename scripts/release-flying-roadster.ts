// Task-scoped handoff of the held preproduction to the normal persistent worker.
import path from 'node:path';
import {DATA,ROOT,db,project,updateProject,event} from '../src/lib/store';
import {readJSON,writeJSON,auditCurrent,digest,spokenText} from '../src/lib/quality';
async function main(){
 const id='175081da-be5c-4ff1-b75b-2a14510c5d55',job='ab4f9362-bb11-4306-b958-6e8a3ec89fad',dir=path.join(DATA,'projects',id);
 for(let i=0;i<180;i++){
  const p=project(id),j=db().prepare('SELECT status FROM jobs WHERE id=? AND project_id=?').get(job,id) as {status:string}|undefined;
  if(!p||!j||p.status==='cancelled')throw new Error('Project cancelled or absent');
  if(['queued','running','completed'].includes(j.status)){console.log('Already handed to worker');return;}
  if(j.status==='prepared-hold'){
   const facts=await readJSON(path.join(dir,'fact-audit.json')),sources=await readJSON(path.join(dir,'sources.json')),editor=await readJSON(path.join(dir,'editorial-audit.json'));
   if(!p.plan||!auditCurrent(facts,p.plan,sources)||editor?.verdict!=='pass'||editor.inputHash!==digest(spokenText(p.plan)))throw new Error('Only independently checked narration may enter production');
   await writeJSON(path.join(dir,'context.json'),{profile:p.profile,examples:[],created:new Date().toISOString(),provenance:'Task-scoped preproduction handoff; normal worker continues all visual/voice/export gates'});
   await writeJSON(path.join(dir,'duration-budget.json'),{seconds:60});
   db().exec('BEGIN IMMEDIATE');
   try{const changed=db().prepare("UPDATE jobs SET status='queued',started=NULL WHERE id=? AND status='prepared-hold'").run(job);if(changed.changes!==1)throw new Error('Job state changed');updateProject(id,{status:'queued',stage:'Сценарий проверен; запускаем новую визуальную цепочку',progress:18,error:null});db().exec('COMMIT');}catch(e){db().exec('ROLLBACK');throw e;}
   event(id,'Проверенный рассказ передан новым визуальным ролям и обычной очереди.');console.log(JSON.stringify({id,job,released:true}));return;
  }
  await new Promise(r=>setTimeout(r,10000));
 }
 throw new Error('Held preparation did not finish within this bounded handoff');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
