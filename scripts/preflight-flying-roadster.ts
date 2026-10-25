import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {ROOT,DATA,project,db,updateProject,event} from '../src/lib/store';
import {readJSON,writeJSON,digest,auditCurrent,checkNarrative,spokenText} from '../src/lib/quality';
import {auditManualPlan} from '../src/lib/editorial';
import {supplementSources} from '../src/lib/preproduction';
async function main(){
 process.loadEnvFile(path.join(ROOT,'.env.local'));
 const id='175081da-be5c-4ff1-b75b-2a14510c5d55',job='ab4f9362-bb11-4306-b958-6e8a3ec89fad',dir=path.join(DATA,'projects',id),staged=path.join(dir,'qualified-attribution');
 let prepared:any,qualified:any;
 for(let i=0;i<180;i++){
  if(project(id)?.status==='cancelled')throw new Error('Cancelled');
  prepared=await readJSON(path.join(staged,'prepared-visual-storyboard.json'));qualified=await readJSON(path.join(staged,'fact-audit.json'));
  if(qualified&&!qualified.passed)throw new Error('The attribution edit still needs factual correction');
  if(prepared&&qualified?.passed)break;
  await new Promise(r=>setTimeout(r,10000));
 }
 if(!prepared||!qualified?.passed)throw new Error('Preparation did not finish within the bounded handoff');
 if(await fs.access(path.join(dir,'narration.wav')).then(()=>true).catch(()=>false))throw new Error('Preserve an existing successful narration');
 const p=project(id)!,n=await readJSON(path.join(staged,'narrative.json')),base=await readJSON(path.join(staged,'storyboard.json')),sources=await readJSON(path.join(dir,'sources.json'));
 if(!auditCurrent(qualified,base,sources))throw new Error('Qualified facts are stale');
 checkNarrative(n,prepared);
 const archive=path.join(dir,'operator-revisions',digest(p.plan));await fs.mkdir(archive,{recursive:true});
 for(const name of ['storyboard.json','narrative.json','script-package.json','editorial-audit.json','fact-audit.json'])try{await fs.copyFile(path.join(dir,name),path.join(archive,name),constants.COPYFILE_EXCL);}catch(e:any){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}
 const editor=await readJSON(path.join(staged,'editorial-audit.json'));
 if(editor?.verdict!=='pass'||editor.inputHash!==digest(spokenText(prepared)))throw new Error('Missing independent editor');
 await writeJSON(path.join(dir,'editorial-audit.json'),editor);
 updateProject(id,{status:'running',stage:'Проверяем подписи визуальной концепции перед озвучкой',progress:19,error:null});
 console.log('Pre-TTS audit of the complete visual plan');
 const audit=await auditManualPlan({...p,plan:prepared},dir,new AbortController().signal,supplementSources);
 const latestSources=await readJSON(path.join(dir,'sources.json')),visual=await readJSON(path.join(dir,'visual-concept.json'));
 if(!auditCurrent(audit,prepared,latestSources)||visual.sourceHash!==digest(latestSources))throw new Error('Visual source dependencies changed; refresh the concept before TTS');
 await writeJSON(path.join(dir,'narrative.json'),n);await writeJSON(path.join(dir,'storyboard.json'),prepared);
 await writeJSON(path.join(dir,'script-package.json'),{version:2,plan:prepared,caption:n.caption,selectedHookId:n.selectedHookId,angleId:n.selectedAngleId,operatorRevision:'qualified-attribution/provenance.json'});
 await writeJSON(path.join(dir,'context.json'),{profile:p.profile,examples:[],created:new Date().toISOString(),provenance:'Actual Sol visual editor and Claude scene builder; qualified narration independently checked before TTS'});
 await writeJSON(path.join(dir,'duration-budget.json'),{seconds:60});
 await writeJSON(path.join(dir,'production-readiness.json'),{at:new Date().toISOString(),inputHash:digest(prepared),sourceHash:digest(latestSources),facts:true,editor:true,visual:true,ttsRequests:0});
 db().exec('BEGIN IMMEDIATE');
 try{
  const changed=db().prepare("UPDATE jobs SET status='queued',started=NULL WHERE id=? AND status IN ('preproduction','prepared-hold')").run(job);if(changed.changes!==1)throw new Error('Held job state changed');
  updateProject(id,{plan:prepared,title:prepared.title,status:'queued',stage:'Материалы проверены; записываем цельный голос',progress:19,review:null,error:null});db().exec('COMMIT');
 }catch(e){db().exec('ROLLBACK');throw e;}
 event(id,'Рассказ, визуальная идея и детальная Claude-сборка проверены до единственной озвучки.');
 console.log(JSON.stringify({id,released:true,claims:audit.claims.length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
