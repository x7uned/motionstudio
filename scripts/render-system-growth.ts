import fs from "node:fs/promises";
import path from "node:path";
import {randomUUID,createHash} from "node:crypto";
import {bundle} from "@remotion/bundler";
import {selectComposition,renderMedia} from "@remotion/renderer";
import {db,project,updateProject,event,DATA,ROOT} from "../src/lib/store";
import {CHROME,FFMPEG,run} from "../src/lib/provider";

async function main() {
const output="/Users/rv/Documents/Codex/2026-10-18/https-github-com-charlie947-motion-graphics/outputs/system-design-v5";
await fs.mkdir(output,{recursive:true});
const manifestFile=path.join(output,"revision.json");
const sourceId="8d42cb9a-11c1-4170-af86-1da97b4c4cc9";
let id=await fs.readFile(manifestFile,"utf8").then(x=>JSON.parse(x).id as string).catch(()=>randomUUID());
const old=project(sourceId)!;
const dir=path.join(DATA,"projects",id);
await fs.mkdir(dir,{recursive:true});
const plan={...old.plan!,title:"System Design · живая схема"};
const original=path.join(DATA,"projects",sourceId);
for(const file of ["audio.wav","narration.wav","alignment.json","speech-provider.json","speech-rhythm.json","narration-text.txt","duration-budget.json"])
  await fs.copyFile(path.join(original,file),path.join(dir,file));
await fs.writeFile(path.join(dir,"storyboard.json"),JSON.stringify(plan,null,2));
const hash=(buf:Buffer)=>createHash("sha256").update(buf).digest("hex");
const sourceAudioHash=hash(await fs.readFile(path.join(original,"audio.wav")));
if(hash(await fs.readFile(path.join(dir,"audio.wav")))!==sourceAudioHash)throw Error("Audio changed");
const revision={id,sourceId,title:plan.title,seconds:old.duration,audio:"Byte-identical continuous master; no TTS call",sourceAudioHash,motion:"One mounted growing topology; no page swipe"};
await fs.writeFile(manifestFile,JSON.stringify(revision,null,2));
await fs.writeFile(path.join(dir,"revision.json"),JSON.stringify(revision,null,2));
if(!project(id)){
  const now=new Date().toISOString();
  db().prepare("INSERT INTO projects(id,title,topic,status,stage,progress,format,duration,voice,created,updated,plan,profile) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id,plan.title,old.topic,"running","Перестраиваем единую схему",10,old.format,old.duration,1,now,now,JSON.stringify(plan),JSON.stringify(old.profile));
}
updateProject(id,{status:"running",stage:"Рендерим растущую систему",progress:20});
const alignment=JSON.parse(await fs.readFile(path.join(dir,"alignment.json"),"utf8"));
const props={plan,profile:old.profile,format:old.format,audio:`${id}/audio.wav`,alignment};
const serveUrl=await bundle({entryPoint:path.join(ROOT,"renderer/index.tsx"),publicDir:path.join(ROOT,"data/projects")});
const composition=await selectComposition({serveUrl,id:"StudioFilm",inputProps:props,browserExecutable:CHROME});
const draft=process.argv.includes("--draft");
let prev=0;
const renderFile=path.join(dir,draft?"draft.mp4":"render.mp4");
await renderMedia({composition,serveUrl,codec:"h264",outputLocation:renderFile,inputProps:props,browserExecutable:CHROME,concurrency:3,crf:draft?25:19,scale:draft?.5:1,onProgress:({progress})=>{const n=Math.round(progress*100);if(n>=prev+10){prev=n;console.log(`${draft?"Draft":"Final"} ${n}%`);updateProject(id,{progress:20+Math.round(progress*65)});}}});
if(draft){await fs.copyFile(renderFile,path.join(output,"draft.mp4"));console.log(JSON.stringify({id,draft:renderFile}));process.exit(0);}
await run(FFMPEG,["-y","-v","error","-i",renderFile,"-vf","scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p","-c:v","libx264","-preset","fast","-crf","19","-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709","-c:a","aac","-b:a","192k","-ar","48000","-t",String(old.duration),"-movflags","+faststart",path.join(dir,"video.mp4")]);
await fs.copyFile(path.join(dir,"video.mp4"),path.join(output,"System-Design-50s-growing-system-RU.mp4"));
updateProject(id,{stage:"Проверяем движение и экспорт",progress:90,video:`data/projects/${id}/video.mp4`});
event(id,"Сохранена прежняя непрерывная озвучка. Схема больше не перелистывается; ожидает проверки текущего рендера.");
console.log(JSON.stringify({id,video:path.join(dir,"video.mp4"),frames:composition.durationInFrames}));

}
main().catch(error=>{console.error(error);process.exitCode=1;});
