/** Queue a quality/v2 integration using a successful TTS response already owned by this workspace. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {DATA,ROOT,db,createProject,project} from '../src/lib/store';
import {readJSON,writeJSON} from '../src/lib/quality';
import {qualityInstructions} from '../src/lib/quality-instructions';
import {QUALITY_VERSION} from '../src/lib/quality-contract';
import {DEFAULT_DELIVERY} from '../src/lib/voice';
async function main(){
 const file=path.join(DATA,'quality-validation/run.json'),manifest=await readJSON(file);if(manifest.cases.some((c:any)=>c.kind==='Качество v2 — сохранённый непрерывный голос'))return;
 const source=project('4488485f-92f9-4aa0-acef-5087edb67632')!;
 const from=path.join(DATA,'projects',source.id),speech=await readJSON(path.join(from,'speech-provider.json'));
 if(!source.plan||!speech.cacheKey)throw new Error('Нужна успешная исходная озвучка.');
 const id=createProject({topic:'[QA качества v2] Сохранённый рассказ о задержке сети: редактор, независимые факты, исходный непрерывный дубль, Scribe и проверка экспорта.',duration:source.duration,format:source.format,voice:true,initialPlan:source.plan,renderMode:'three'});
 const dir=path.join(DATA,'projects',id);await fs.mkdir(dir,{recursive:true});
 for(const f of await fs.readdir(from))if(['models','models.json','model-layout.json','assets','alignment.json','sources.json','research.json','duration-budget.json'].includes(f)||/^eleven-[a-f0-9]+\.(json|mp3)$/.test(f))await fs.cp(path.join(from,f),path.join(dir,f),{recursive:true});
 const snapshot=qualityInstructions(ROOT,dir),profile={...source.profile,production:{version:2,policyVersion:QUALITY_VERSION,instructionsHash:snapshot.sha256,voiceProfile:{id:'qa-cached-v2',voiceId:speech.voiceId,model:'eleven_multilingual_v2',name:'Сохранённый голос v2',delivery:DEFAULT_DELIVERY}}};
 db().prepare('UPDATE projects SET profile=?,title=? WHERE id=?').run(JSON.stringify(profile),'[QA] Качество v2 · сохранённый голос',id);
 await writeJSON(path.join(dir,'storyboard.json'),source.plan);
 manifest.cases.push({id,kind:'Качество v2 — сохранённый непрерывный голос',sourceId:source.id,coverage:'real manual editorial/facts→cached TTS→Scribe→render→MP4 review',voice:true,expectedTTSCacheKey:speech.cacheKey});await writeJSON(file,manifest);console.log(id);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
