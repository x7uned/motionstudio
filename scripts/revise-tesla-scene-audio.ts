import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {DATA,ROOT,project,updateProject,event,db} from "../src/lib/store";
import {readJSON,writeJSON,fileHash,digest} from "../src/lib/quality";
import {assemblySoundCues} from "../src/lib/scene-sound";
import {soundCues,reviewExport} from "../src/lib/export-review";
import {SOUND_PREFERENCES,spaceSoundEffects} from "../src/lib/sound-preferences";
import {run,PYTHON,FFMPEG} from "../src/lib/provider";
async function main(){
 const id="06650328-05fb-40cd-a25f-bd95a798a166",p=project(id)!;assert.ok(p?.plan);
 const dir=path.join(DATA,"projects",id),production=path.join(DATA,"productions/2026-10-19-tesla-scene-audio-v8"),manifestFile=path.join(production,"manifest.json"),signal=new AbortController().signal;
 assert.equal((db().prepare("SELECT COUNT(*) n FROM jobs WHERE status IN ('queued','running')").get() as {n:number}).n,0,"No overlapping jobs");
 let manifest=await readJSON(manifestFile);
 if(!manifest){
  const oldHash=await fileHash(path.join(dir,"video.mp4")),backup=path.join(dir,"audio-revisions",oldHash);
  await fs.mkdir(backup,{recursive:true});
  assert.equal((await readJSON(path.join(dir,"quality-report.json")))?.artifactHash,oldHash,"Finish current visual review before audio-only revision");
  for(const name of ["video.mp4","audio.wav","premix.wav","sound-cues.json","sound-assets.json","review.json","quality-report.json","sfx-only.wav","sound-mix-report.json","encoded-audio-verification.json","playback-review.json"])await fs.copyFile(path.join(dir,name),path.join(backup,name));
  manifest={version:1,id,oldHash,backup,qualityDir:path.join(dir,"quality",oldHash.slice(0,16)),oldReview:await readJSON(path.join(backup,"quality-report.json")),voiceHash:await fileHash(path.join(dir,"narration.wav")),planHash:digest(p.plan),profileHash:digest(p.profile),startedAt:new Date().toISOString()};await writeJSON(manifestFile,manifest);
 }
 assert.equal(await fileHash(path.join(dir,"narration.wav")),manifest.voiceHash);assert.equal(digest(p.plan),manifest.planHash);assert.equal(digest(p.profile),manifest.profileHash);
 if(!manifest.complete||process.argv.includes("--remix")){
  updateProject(id,{status:"running",stage:"Привязываем протяжённый звук к движениям сцены",progress:40,error:null,review:null});
  const previous=await readJSON(path.join(manifest.backup,"sound-cues.json"));
  assert.ok(previous&&previous.version===7,"Upgrade the saved v7 sound sheet once");
  const generated=soundCues(p.plan!,(await readJSON(path.join(dir,"alignment.json")))??[]);
  const cues={...generated,soundPreferences:{...SOUND_PREFERENCES,projectLevelOverrides:{"ui-reveal":1.5,"outro-transition":.5}},cues:generated.cues.map(c=>{
   const saved=previous.cues.find((old:any)=>old.effect===c.effect&&old.file);
   if(c.effect==="fan-start")assert.ok(saved?.file,"Reuse the preserved fan snapshot; no remote downloads");
   return {...c,...(saved?{file:saved.file,sha256:saved.sha256}:{}),levelScale:(c.levelScale??1)*(c.effect==="ui-reveal"?1.5:c.kind==="outro-transition"?.5:1)};
  })};
  assert.equal(cues.cues.filter(c=>c.kind==="assembly-cutaway").length,assemblySoundCues(p.plan!,(await readJSON(path.join(dir,"alignment.json")))??[]).filter(c=>c.kind==="assembly-cutaway").length,"All body movement windows retain their own sound");
  assert.ok(cues.cues.filter(c=>c.kind==="assembly-cutaway").every(c=>c.durationMode==="stretch"&&c.durationSeconds!>0));
  assert.ok(cues.cues.some(c=>c.kind==="assembly-fan"&&c.durationMode==="loop"&&c.automation?.length));
  await writeJSON(path.join(dir,"sound-cues.json"),cues);
  await run(PYTHON,[path.join(ROOT,"scripts/remix.py"),dir,FFMPEG],{signal,timeout:120000});
  const mix=await readJSON(path.join(dir,"sound-mix-report.json"));
  for(const c of mix.cues){assert.ok(c.actualActiveRmsDbFS>-100,`Silent scene sound: ${c.kind}`);assert.ok(c.peakDbFS<=cues.cues.find(x=>x.at===c.at&&x.kind===c.kind)!.peakDbFS!+.1);}
  const output=path.join(dir,"audio-revision.mp4");
  await run(FFMPEG,["-y","-v","error","-i",path.join(manifest.backup,"video.mp4"),"-i",path.join(dir,"audio.wav"),"-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","aac","-b:a","192k","-ar","48000","-ac","2","-af",`atrim=duration=${p.duration},asetpts=PTS-STARTPTS`,"-t",String(p.duration),"-movflags","+faststart",output],{signal,timeout:120000});
  await fs.rename(output,path.join(dir,"video.mp4"));
  updateProject(id,{stage:"Проверяем новый звук и неизменность всех кадров",progress:85});
  const result=await reviewExport(p,dir,signal,{reuseVisual:{video:path.join(manifest.backup,"video.mp4"),artifactHash:manifest.oldHash,qualityDir:manifest.qualityDir,inputHash:manifest.oldReview.inputHash}});
  assert.ok(result.review.technicalPassed);
  assert.equal(await fileHash(path.join(dir,"narration.wav")),manifest.voiceHash);assert.equal(digest(project(id)!.plan),manifest.planHash);
  updateProject(id,{status:"review",stage:"Звуки следуют движению корпуса и вентиляторам; готово к просмотру",progress:100,review:result.review,error:null});
  for(const name of ["playback-review.json","encoded-audio-verification.json"])await fs.rm(path.join(dir,name),{force:true});
  Object.assign(manifest,{complete:true,videoHash:result.artifactHash,completedAt:new Date().toISOString(),mix});await writeJSON(manifestFile,manifest);
  event(id,"Звук корпуса начинается с предыдущего ключа движения и растянут до его конца. Вентилятор непрерывно звучит от раскрутки до остановки, с автоматизацией по скорости и бесшовным повтором установившегося звука. Все вжухи ещё на20% тише. Голос, изображение, фон50%, редкие блипы и плавные хвосты сохранены.");
 }
 const delivery=path.join(DATA,"deliveries/2026-10-19-tesla-scene-audio-v8");await fs.mkdir(delivery,{recursive:true});
 for(const [source,target] of [["video.mp4","tesla-roadster-scene-audio-v8.mp4"],["sfx-only.wav","effects-only.wav"],["sound-mix-report.json","sound-mix-report.json"],["credits.txt","credits.txt"],["quality-report.json","QUALITY.json"]])await fs.copyFile(path.join(dir,source),path.join(delivery,target));
 assert.equal(await fileHash(path.join(delivery,"tesla-roadster-scene-audio-v8.mp4")),manifest.videoHash);
 console.log(JSON.stringify({file:path.join(delivery,"tesla-roadster-scene-audio-v8.mp4"),videoHash:manifest.videoHash,cues:manifest.mix.cues.map((c:any)=>({at:c.at,effect:c.effect,target:c.targetActiveRmsDbFS,actual:c.actualActiveRmsDbFS,peak:c.peakDbFS,boost:c.boostVsLegacyDb}))},null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Audio correction failed");process.exitCode=1;});
