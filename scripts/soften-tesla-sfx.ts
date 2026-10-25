import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {DATA,ROOT,project,updateProject,event,db} from "../src/lib/store";
import {readJSON,writeJSON,fileHash,digest} from "../src/lib/quality";
import {reviewExport} from "../src/lib/export-review";
import {SOUND_PREFERENCES} from "../src/lib/sound-preferences";
import {run,PYTHON,FFMPEG} from "../src/lib/provider";
async function main(){
 const id="06650328-05fb-40cd-a25f-bd95a798a166",p=project(id)!;assert.ok(p?.plan);
 const dir=path.join(DATA,"projects",id),production=path.join(DATA,"productions/2026-10-18-tesla-soft-sfx-v6"),manifestFile=path.join(production,"manifest.json"),signal=new AbortController().signal;
 assert.equal((db().prepare("SELECT COUNT(*) n FROM jobs WHERE status IN ('queued','running')").get() as {n:number}).n,0,"No overlapping jobs");
 let manifest=await readJSON(manifestFile);
 if(!manifest){
  const oldHash=await fileHash(path.join(dir,"video.mp4")),backup=path.join(dir,"audio-revisions",oldHash);
  await fs.mkdir(backup,{recursive:true});
  assert.equal((await readJSON(path.join(dir,"quality-report.json")))?.artifactHash,oldHash,"Finish current visual review before audio-only revision");
  for(const name of ["video.mp4","audio.wav","premix.wav","sound-cues.json","sound-assets.json","review.json","quality-report.json","sfx-only.wav","sound-mix-report.json"])await fs.copyFile(path.join(dir,name),path.join(backup,name));
  manifest={version:1,id,oldHash,backup,qualityDir:path.join(dir,"quality",oldHash.slice(0,16)),oldReview:await readJSON(path.join(backup,"quality-report.json")),voiceHash:await fileHash(path.join(dir,"narration.wav")),planHash:digest(p.plan),profileHash:digest(p.profile),startedAt:new Date().toISOString()};await writeJSON(manifestFile,manifest);
 }
 assert.equal(await fileHash(path.join(dir,"narration.wav")),manifest.voiceHash);assert.equal(digest(p.plan),manifest.planHash);assert.equal(digest(p.profile),manifest.profileHash);
 if(!manifest.complete||process.argv.includes("--remix")){
  updateProject(id,{status:"running",stage:"Уменьшаем все эффекты на40% без новой озвучки",progress:40,error:null,review:null});
  const previous=await readJSON(path.join(manifest.backup,"sound-cues.json"));
  assert.ok(previous&&previous.version===5,"Apply the 40% reduction once to the previous accepted levels");
  const cues={...previous,version:6,soundPreferences:SOUND_PREFERENCES,cues:previous.cues.map((c:any)=>({...c,levelScale:(c.levelScale??1)*.6}))};
  assert.equal(cues.backgroundGain,.009);assert.ok(cues.cues.every((c:any)=>c.levelScale===((c.effect==="fan-start"||c.effect==="soft-whoosh")?.3:.6)));
  await writeJSON(path.join(dir,"sound-cues.json"),cues);
  await run(PYTHON,[path.join(ROOT,"scripts/remix.py"),dir,FFMPEG],{signal,timeout:120000});
  const mix=await readJSON(path.join(dir,"sound-mix-report.json"));
  for(const c of mix.cues){assert.ok(c.actualActiveRmsDbFS>=c.targetActiveRmsDbFS+20*Math.log10(c.levelScale??1)-4,`Quiet effect: ${c.effect}`);assert.ok(c.peakDbFS<=cues.cues.find((x:any)=>x.at===c.at)!.peakDbFS!+.1);}
  const output=path.join(dir,"audio-revision.mp4");
  await run(FFMPEG,["-y","-v","error","-i",path.join(manifest.backup,"video.mp4"),"-i",path.join(dir,"audio.wav"),"-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","aac","-b:a","192k","-ar","48000","-ac","2","-af",`atrim=duration=${p.duration},asetpts=PTS-STARTPTS`,"-t",String(p.duration),"-movflags","+faststart",output],{signal,timeout:120000});
  await fs.rename(output,path.join(dir,"video.mp4"));
  updateProject(id,{stage:"Проверяем новый звук и неизменность всех кадров",progress:85});
  const result=await reviewExport(p,dir,signal,{reuseVisual:{video:path.join(manifest.backup,"video.mp4"),artifactHash:manifest.oldHash,qualityDir:manifest.qualityDir,inputHash:manifest.oldReview.inputHash}});
  assert.ok(result.review.technicalPassed);
  assert.equal(await fileHash(path.join(dir,"narration.wav")),manifest.voiceHash);assert.equal(digest(project(id)!.plan),manifest.planHash);
  updateProject(id,{status:"review",stage:"Фон50%, эффекты ещё на40% тише; готово к просмотру",progress:100,review:result.review,error:null});
  await fs.rm(path.join(dir,"playback-review.json"),{force:true});
  Object.assign(manifest,{complete:true,videoHash:result.artifactHash,completedAt:new Date().toISOString(),mix});await writeJSON(manifestFile,manifest);
  event(id,"Все звуковые эффекты уменьшены ещё на40%: UI ×0.6, вентилятор/переход ×0.3 от исходной калибровки. Плавные хвосты и фон50% сохранены. Dennis-мастер не менялся. Видеопоток побитно сохранён. Новое ревью привязано к новому файлу.");
 }
 const delivery=path.join(DATA,"deliveries/2026-10-18-tesla-soft-sfx-v6");await fs.mkdir(delivery,{recursive:true});
 for(const [source,target] of [["video.mp4","tesla-roadster-soft-sfx-v6.mp4"],["sfx-only.wav","effects-only.wav"],["sound-mix-report.json","sound-mix-report.json"],["credits.txt","credits.txt"],["quality-report.json","QUALITY.json"]])await fs.copyFile(path.join(dir,source),path.join(delivery,target));
 assert.equal(await fileHash(path.join(delivery,"tesla-roadster-soft-sfx-v6.mp4")),manifest.videoHash);
 console.log(JSON.stringify({file:path.join(delivery,"tesla-roadster-soft-sfx-v6.mp4"),videoHash:manifest.videoHash,cues:manifest.mix.cues.map((c:any)=>({at:c.at,effect:c.effect,target:c.targetActiveRmsDbFS,actual:c.actualActiveRmsDbFS,peak:c.peakDbFS,boost:c.boostVsLegacyDb}))},null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Audio correction failed");process.exitCode=1;});
