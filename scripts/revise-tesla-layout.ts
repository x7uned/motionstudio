import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {bundle} from "@remotion/bundler";
import {selectComposition,renderStill,renderMedia} from "@remotion/renderer";
import {DATA,ROOT,project,updateProject,db,event} from "../src/lib/store";
import {readJSON,writeJSON,fileHash,digest,auditCurrent} from "../src/lib/quality";
import {verifyModelSnapshot} from "../src/lib/model-assets";
import {soundCues,reviewExport} from "../src/lib/export-review";
import {soundLibrary} from "../src/lib/sound-provider";
import {run,PYTHON,FFMPEG,CHROME} from "../src/lib/provider";
import {threeLayout} from "../src/lib/three-layout";

async function main(){
 const action=process.argv[2]||"preview",id="06650328-05fb-40cd-a25f-bd95a798a166",p=project(id)!;assert.ok(p?.plan);
 const dir=path.join(DATA,"projects",id),production=path.join(DATA,"productions/2026-10-18-tesla-layout-smooth-audio"),manifestFile=path.join(production,"manifest.json"),signal=new AbortController().signal;
 assert.equal((db().prepare("SELECT COUNT(*) n FROM jobs WHERE status IN ('queued','running')").get() as {n:number}).n,0,"No overlapping jobs");
 let manifest=await readJSON(manifestFile);
 if(!manifest){
  const oldHash=await fileHash(path.join(dir,"video.mp4")),backup=path.join(dir,"audio-revisions",oldHash);await fs.mkdir(backup,{recursive:true});
  for(const name of ["video.mp4","audio.wav","premix.wav","sfx-only.wav","sound-cues.json","sound-assets.json","sound-mix-report.json","review.json","quality-report.json","playback-review.json","encoded-audio-verification.json","poster.jpg","contact-sheet.jpg"])await fs.copyFile(path.join(dir,name),path.join(backup,name));
  manifest={version:1,id,oldHash,backup,voiceHash:await fileHash(path.join(dir,"narration.wav")),planHash:digest(p.plan),profileHash:digest(p.profile),layout:threeLayout(true,true),startedAt:new Date().toISOString()};await writeJSON(manifestFile,manifest);
 }
 assert.equal(await fileHash(path.join(dir,"narration.wav")),manifest.voiceHash);assert.equal(digest(p.plan),manifest.planHash);assert.equal(digest(p.profile),manifest.profileHash);
 assert.ok(auditCurrent(await readJSON(path.join(dir,"fact-audit.json")),p.plan,(await readJSON(path.join(dir,"sources.json")))??[]),"Facts remain current for the unchanged words");
 if(action==="prepare"||action==="preview"){
  globalThis.fetch=async()=>{throw new Error("Layout revision uses existing local sound assets only");};
  const alignment=await readJSON(path.join(dir,"alignment.json")),sheet=await soundLibrary().prepare(soundCues(p.plan,alignment),dir,signal);await writeJSON(path.join(dir,"sound-cues.json"),sheet);
  await run(PYTHON,[path.join(ROOT,"scripts/remix.py"),dir,FFMPEG],{signal,timeout:120000});
  manifest.preparedAudioHash=await fileHash(path.join(dir,"audio.wav"));manifest.mix=await readJSON(path.join(dir,"sound-mix-report.json"));await writeJSON(manifestFile,manifest);
  if(action==="prepare"){console.log("Audio ready without TTS");return;}
 }
 assert.equal(await fileHash(path.join(dir,"audio.wav")),manifest.preparedAudioHash,"Use the prepared audio revision");
 const inputProps={plan:p.plan,profile:p.profile,format:p.format,audio:`${id}/audio.wav`,alignment:await readJSON(path.join(dir,"alignment.json")),models:verifyModelSnapshot(dir),modelBase:`${id}/models`};
 const serveUrl=await bundle({entryPoint:path.join(ROOT,"renderer/index.tsx"),publicDir:path.join(DATA,"projects"),symlinkPublicDir:true});
 const chromiumOptions={gl:"angle" as const};
 const composition=await selectComposition({serveUrl,id:"StudioFilm",inputProps,browserExecutable:CHROME,chromiumOptions});
 if(action==="preview"){
  const preview=path.join(production,"preview");await fs.mkdir(preview,{recursive:true});
  for(const at of [3,15.5,22,33.5])await renderStill({composition,serveUrl,inputProps,browserExecutable:CHROME,chromiumOptions,frame:Math.round(at*30),scale:.5,output:path.join(preview,`${at}.png`)});
  console.log(JSON.stringify({preview,layout:manifest.layout}));return;
 }
 assert.equal(action,"render");
 updateProject(id,{status:"running",stage:"Рендерим нижнюю компоновку и плавный звук",progress:35,error:null,review:null});
 const rendered=path.join(dir,"layout-render.mp4"),output=path.join(dir,"layout-revision.mp4");let last=35;
 await renderMedia({composition,serveUrl,inputProps,browserExecutable:CHROME,chromiumOptions,codec:"h264",outputLocation:rendered,concurrency:2,crf:20,muted:false,onProgress:({progress})=>{const n=Math.round(35+progress*43);if(n>=last+4){last=n;updateProject(id,{progress:n});console.log(`render ${n}%`);}}});
 await run(FFMPEG,["-y","-v","error","-i",rendered,"-i",path.join(dir,"audio.wav"),"-map","0:v:0","-map","1:a:0","-vf","scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p","-c:v","libx264","-preset","fast","-crf","20","-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709","-c:a","aac","-b:a","192k","-ar","48000","-ac","2","-af",`atrim=duration=${p.duration},asetpts=PTS-STARTPTS`,"-t",String(p.duration),"-shortest","-movflags","+faststart",output],{signal,timeout:180000});
 await fs.rename(output,path.join(dir,"video.mp4"));
 updateProject(id,{stage:"Проверяем кадры нового MP4 и громкость",progress:85});
 const result=await reviewExport(p,dir,signal);assert.ok(result.review.technicalPassed,"Final technical export checks");
 assert.equal(await fileHash(path.join(dir,"narration.wav")),manifest.voiceHash);assert.equal(digest(project(id)!.plan),manifest.planHash);
 updateProject(id,{status:"review",stage:"Нижний блок опущен, звук затухает плавно; на просмотре",progress:100,review:result.review,error:null});
 for(const name of ["playback-review.json","encoded-audio-verification.json"])await fs.rm(path.join(dir,name),{force:true});
 const delivery=path.join(DATA,"deliveries/2026-10-18-tesla-dennis-v4");await fs.mkdir(delivery,{recursive:true});
 for(const [source,target] of [["video.mp4","tesla-roadster-dennis-v4.mp4"],["sfx-only.wav","effects-only.wav"],["sound-mix-report.json","sound-mix-report.json"],["sound-cues.json","sound-cues.json"],["credits.txt","credits.txt"],["quality-report.json","QUALITY.json"]])await fs.copyFile(path.join(dir,source),path.join(delivery,target));
 Object.assign(manifest,{complete:true,completedAt:new Date().toISOString(),videoHash:result.artifactHash,delivery,technical:result.review.metadata});await writeJSON(manifestFile,manifest);
 event(id,"Нижний текст опущен: номер/заголовок/пояснение +110px, субтитры +126px; Масштаб модели и камера сохранены. Переход ×0.5; плавные хвосты, вентилятор 0.9с. Исходный Dennis-мастер и сценарий сохранены, новой озвучки нет.");
 await fs.rm(rendered,{force:true});console.log(JSON.stringify({file:path.join(delivery,"tesla-roadster-dennis-v4.mp4"),videoHash:result.artifactHash,technical:result.review.metadata,findings:result.review.quality.findings}));
}
main().catch(e=>{console.error(e instanceof Error?e.stack:"Revision failed");process.exitCode=1;});
