/** Collect concrete verification evidence; never upgrades an automatic check to human approval. */
import path from 'node:path';
import fs from 'node:fs/promises';
import {ROOT,DATA,project} from '../src/lib/store';
import {readJSON,writeJSON,fileHash} from '../src/lib/quality';
async function main(){
 const manifest=await readJSON(path.join(DATA,'quality-validation/run.json')),cases=[];
 for(const item of manifest.cases){const p=project(item.id),dir=path.join(DATA,'projects',item.id),review=await readJSON(path.join(dir,'review.json')),speech=await readJSON(path.join(dir,'speech-provider.json')),facts=await readJSON(path.join(dir,'fact-audit.json'));
  const editorial=await readJSON(path.join(dir,'editorial-audit.json'));const speechAbsent=!(await fs.access(path.join(dir,'speech-provider.json')).then(()=>true).catch(()=>false));
  const videoHash=await fileHash(path.join(dir,'video.mp4')).catch(()=>null);
  cases.push({...item,pipelineCoverage:item.coverage,expectedGatePassed:item.expectedBlock? p?.status==='failed'&&editorial?.verdict==='changes'&&speechAbsent:undefined,status:p?.status,stage:p?.stage,error:p?.error,videoHash,qualityCurrent:!!videoHash&&review?.quality?.artifactHash===videoHash,technicalPassed:review?.technicalPassed??false,metadata:review?.metadata,frameStatus:review?.quality?.status,coverage:review?.quality?.coverage,ocr:review?.quality?.ocr,findings:review?.quality?.findings.length,facts:facts?{passed:facts.passed,claims:facts.claims.length}:null,audioText:review?.audioText?.status??null,speech:speech?{model:speech.model,cacheKey:speech.cacheKey,preservePauses:speech.preservePauses,pauseEdits:speech.longPauseEdits,insertedInterSceneSilenceSeconds:speech.insertedInterSceneSilenceSeconds}:null,ttsCacheReused:item.expectedTTSCacheKey?item.expectedTTSCacheKey===speech?.cacheKey:undefined,humanApproved:p?.status==='approved'});
 }
 const baseline=await readJSON(path.join(DATA,'quality-baseline/2026-10-18/manifest.json'));let checked=0;const changed:string[]=[];
 for(const p of baseline.projects)for(const [name,hash]of Object.entries(p.files)){const file=path.join(DATA,'projects',p.id,name);checked++;if(await fileHash(file)!==hash)changed.push(path.relative(ROOT,file));}
 const auditionFiles=await fs.readdir(path.join(DATA,'voice-auditions'));const auditionStates=await Promise.all(auditionFiles.map(id=>readJSON(path.join(DATA,'voice-auditions',id,'audition.json'))));const selected=auditionStates.find(s=>s?.status==='selected');
 const result={version:2,checkedAt:new Date().toISOString(),baseline:{checkedFiles:checked,changed},cases,allRendered:cases.filter(c=>!c.expectedBlock).every(c=>c.qualityCurrent&&c.technicalPassed),expectedGatesPassed:cases.filter(c=>c.expectedBlock).every(c=>c.expectedGatePassed),humanApproval:false,voiceAudition:selected?{id:selected.id,status:selected.status,successfulGenerations:selected.successfulGenerations,quotedCredits:selected.totalCredits,selectedBy:selected.selectedBy,choice:String.fromCharCode(65+selected.selected),voice:selected.variants[selected.order[selected.selected]].name,model:selected.variants[selected.order[selected.selected]].model}:'Not selected'};
 await writeJSON(path.join(DATA,'quality-validation/results.json'),result);console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
