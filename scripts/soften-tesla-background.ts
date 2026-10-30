import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {bundle} from "@remotion/bundler";
import {bundleLive} from "../src/lib/remotion-bundle";
import {selectComposition,renderStill,renderMedia} from "@remotion/renderer";
import {DATA,ROOT,project,updateProject,db,event} from "../src/lib/store";
import {readJSON,writeJSON,fileHash,digest,auditCurrent} from "../src/lib/quality";
import {verifyModelSnapshot} from "../src/lib/model-assets";
import {reviewExport} from "../src/lib/export-review";
import {run,FFMPEG,CHROME} from "../src/lib/provider";
import {backgroundDesignSchema} from "../src/lib/backgrounds";

async function main(){
 const action=process.argv[2]||"preview",id="06650328-05fb-40cd-a25f-bd95a798a166",dir=path.join(DATA,"projects",id),production=path.join(DATA,"productions/2026-10-18-tesla-background-01-soft"),manifestFile=path.join(production,"manifest.json"),signal=new AbortController().signal;
 let p=project(id)!;assert.ok(p?.plan);assert.equal((db().prepare("SELECT COUNT(*) n FROM jobs WHERE status IN ('queued','running')").get() as {n:number}).n,0,"No overlapping jobs");
 let manifest=await readJSON(manifestFile);
 if(!manifest){
  const oldHash=await fileHash(path.join(dir,"video.mp4")),backup=path.join(dir,"visual-revisions",oldHash);await fs.mkdir(backup,{recursive:true});
  for(const name of ["video.mp4","review.json","quality-report.json","playback-review.json","encoded-audio-verification.json","poster.jpg","contact-sheet.jpg"])await fs.copyFile(path.join(dir,name),path.join(backup,name));
  await writeJSON(path.join(backup,"profile.json"),p.profile);
  const next={...p.profile,backgroundDesign:backgroundDesignSchema.parse({version:1,id:"01",opacity:.5})};
  manifest={version:1,id,oldHash,backup,oldProfileHash:digest(p.profile),profileHash:digest(next),planHash:digest(p.plan),voiceHash:await fileHash(path.join(dir,"narration.wav")),mixHash:await fileHash(path.join(dir,"audio.wav")),startedAt:new Date().toISOString(),background:next.backgroundDesign};
  await writeJSON(manifestFile,manifest);
 }
 if(digest(p.profile)===manifest.oldProfileHash){db().prepare("UPDATE projects SET profile=? WHERE id=?").run(JSON.stringify({...p.profile,backgroundDesign:manifest.background}),id);p=project(id)!;}
 assert.ok(p.plan);
 assert.equal(digest(p.profile),manifest.profileHash);assert.equal(digest(p.plan),manifest.planHash);assert.equal(await fileHash(path.join(dir,"narration.wav")),manifest.voiceHash);assert.equal(await fileHash(path.join(dir,"audio.wav")),manifest.mixHash);
 assert.ok(auditCurrent(await readJSON(path.join(dir,"fact-audit.json")),p.plan,(await readJSON(path.join(dir,"sources.json")))??[]),"Unchanged script retains the fact gate");
 if(manifest.complete){assert.equal(await fileHash(path.join(dir,"video.mp4")),manifest.videoHash);console.log(JSON.stringify({alreadyComplete:true,file:manifest.delivery}));return;}
 const inputProps={plan:p.plan,profile:p.profile,format:p.format,alignment:await readJSON(path.join(dir,"alignment.json")),models:verifyModelSnapshot(dir),modelBase:`${id}/models`};
 const serveUrl=await bundleLive({entryPoint:path.join(ROOT,"renderer/index.tsx"),publicDir:path.join(DATA,"projects")});const chromiumOptions={gl:"angle" as const};
 const composition=await selectComposition({serveUrl,id:"StudioFilm",inputProps,browserExecutable:CHROME,chromiumOptions});
 if(action==="preview"){
  const preview=path.join(production,"preview");await fs.mkdir(preview,{recursive:true});for(const at of [3,15.5,33.5,44])await renderStill({composition,serveUrl,inputProps,browserExecutable:CHROME,chromiumOptions,frame:Math.round(at*30),scale:.5,output:path.join(preview,`${at}.png`)});
  console.log(JSON.stringify({preview,background:p.profile.backgroundDesign}));return;
 }
 assert.equal(action,"render");updateProject(id,{status:"running",stage:"Снижаем непрозрачность фона01 до50%",progress:35,review:null,error:null});
 const rendered=path.join(dir,"background-render.mp4"),output=path.join(dir,"background-revision.mp4");let last=35;
 await renderMedia({composition,serveUrl,inputProps,browserExecutable:CHROME,chromiumOptions,codec:"h264",outputLocation:rendered,concurrency:2,crf:20,muted:true,onProgress:({progress})=>{const n=Math.round(35+progress*43);if(n>=last+4){last=n;updateProject(id,{progress:n});console.log(`render ${n}%`);}}});
 await run(FFMPEG,["-y","-v","error","-i",rendered,"-i",path.join(manifest.backup,"video.mp4"),"-map","0:v:0","-map","1:a:0","-vf","scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p","-c:v","libx264","-preset","fast","-crf","20","-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709","-c:a","copy","-t",String(p.duration),"-movflags","+faststart",output],{signal,timeout:180000});
 const audioHash=async(file:string)=>(await run(FFMPEG,["-v","error","-i",file,"-map","0:a:0","-c:a","copy","-f","hash","-hash","sha256","-"],{signal,timeout:60000})).trim();
 const oldAudio=await audioHash(path.join(manifest.backup,"video.mp4"));assert.equal(await audioHash(output),oldAudio,"AAC sound stream must remain identical");
 await fs.rename(output,path.join(dir,"video.mp4"));updateProject(id,{stage:"Проверяем кадры нового MP4 с фоном01",progress:85});
 const result=await reviewExport(p,dir,signal);assert.ok(result.review.technicalPassed);assert.equal(await fileHash(path.join(dir,"narration.wav")),manifest.voiceHash);assert.equal(await fileHash(path.join(dir,"audio.wav")),manifest.mixHash);assert.equal(digest(project(id)!.plan),manifest.planHash);
 updateProject(id,{status:"review",stage:"Tesla: фон01 с непрозрачностью50%; готово к просмотру",progress:100,review:result.review,error:null});
 for(const name of ["playback-review.json","encoded-audio-verification.json"])await fs.rm(path.join(dir,name),{force:true});
 const delivery=path.join(DATA,"deliveries/2026-10-18-tesla-background-01-soft");await fs.mkdir(delivery,{recursive:true});
 for(const [source,target] of [["video.mp4","tesla-roadster-background-01-soft.mp4"],["quality-report.json","QUALITY.json"],["credits.txt","credits.txt"]])await fs.copyFile(path.join(dir,source),path.join(delivery,target));
 Object.assign(manifest,{complete:true,completedAt:new Date().toISOString(),videoHash:result.artifactHash,audioPacketHash:oldAudio,audioUnchanged:true,technical:result.review.metadata,delivery});await writeJSON(manifestFile,manifest);await fs.rm(rendered,{force:true});
 event(id,"Непрозрачность фона01 «Точечная матрица» снижена до50%, включая заставку. Сценарий, постановка, Dennis-мастер, звуковой микс и AAC-поток сохранены. Новая озвучка не выполнялась.");
 console.log(JSON.stringify({file:path.join(delivery,"tesla-roadster-background-01-soft.mp4"),videoHash:result.artifactHash,audioUnchanged:true,technical:result.review.metadata,findings:result.review.quality.findings}));
}
main().catch(e=>{console.error(e instanceof Error?e.stack:"Background revision failed");process.exitCode=1;});
