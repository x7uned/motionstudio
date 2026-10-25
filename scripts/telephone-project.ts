import fs from "node:fs/promises";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {bundle} from "@remotion/bundler";
import {selectComposition,renderStill} from "@remotion/renderer";
import sharp from "sharp";
import {db,project,updateProject,event,enqueue,DATA,ROOT} from "../src/lib/store";
import {normalizePlan,sceneClock} from "../src/lib/model";
import {run,PYTHON,FFMPEG,CHROME} from "../src/lib/provider";

const work="/Users/rv/Documents/Codex/2026-10-18/https-github-com-charlie947-motion-graphics/work/telephone-history";
const out="/Users/rv/Documents/Codex/2026-10-18/https-github-com-charlie947-motion-graphics/outputs/telephone-history";
const json=async(p:string)=>JSON.parse(await fs.readFile(p,"utf8"));
const save=async(p:string,d:unknown)=>fs.writeFile(p,JSON.stringify(d,null,2));
async function main(){
 await fs.mkdir(out,{recursive:true});
 const mode=process.argv[2]??"prepare";
 let manifest=await json(path.join(out,"project.json")).catch(()=>null);
 if(mode==="prepare"){
  const pack=await json(path.join(work,"script-package.json"));
  const research=await json(path.join(work,"research/research.json"));
  const ids=new Set(research.facts.map((f:any)=>f.id));
  const plan=normalizePlan(pack.plan,150,true);
  if(plan.filmKind!=="telephone-history"||plan.scenes.some(s=>!s.history||!s.sourceFactIds?.length||s.sourceFactIds.some(id=>!ids.has(id))))throw Error("Missing documentary metadata or source fact IDs");
  const words=plan.scenes.reduce((n,s)=>n+s.narration.split(/\s+/).filter(Boolean).length,0);
  if(words<285||words>322)throw Error(`Unexpected script length: ${words}`);
  const id=manifest?.id??randomUUID(),dir=path.join(DATA,"projects",id);
  if(project(id))throw Error("Project already prepared; use measure, preview or enqueue");
  await fs.mkdir(path.join(dir,"assets"),{recursive:true});
  for(const f of ["bell-1876.jpg","bell-drawing.jpg","operators-1928.jpg","operators-1937.jpg","bell-longdistance-1892.jpg","manifest.json"])await fs.copyFile(path.join(work,"assets",f),path.join(dir,"assets",f));
  await fs.cp(path.join(work,"research"),path.join(dir,"research-evidence"),{recursive:true});
  for(const [from,to] of [["research/sources.json","sources.json"],["research/research.json","research.json"],["research/factual-research.md","research.md"],["query-plan.json","research-query.json"],["script-package.json","script-package.json"],["script.md","script.md"]])await fs.copyFile(path.join(work,from),path.join(dir,to));
  await save(path.join(dir,"storyboard.json"),plan);
  await save(path.join(dir,"duration-budget.json"),{seconds:165,targetSeconds:150,reason:"Пользователь просит примерно2:30; естественная речь без ускорения, предел2:45."});
  await save(path.join(dir,"render.json"),{plan,voice:true,maxDuration:165,ttsProvider:"elevenlabs"});
  await fs.writeFile(path.join(dir,"tts-provider.txt"),"elevenlabs");
  const profile=project("ec811bd9-2cfd-4594-a39b-16eb005ab382")!.profile;
  const now=new Date().toISOString();
  db().prepare("INSERT INTO projects(id,title,topic,status,stage,progress,format,duration,voice,created,updated,plan,profile) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id,plan.title,"История создания телефона: от передачи голоса до телефонной сети. Архивные материалы и исследование.","draft","Исследование и сценарий готовы",15,"9:16",150,1,now,now,JSON.stringify(plan),JSON.stringify(profile));
  manifest={id,title:plan.title,targetSeconds:150,budgetSeconds:165,words};
  await save(path.join(out,"project.json"),manifest);
  const pipeline={roles:[{role:"query-planner",model:"gpt-6.1-sol",effort:"xhigh",artifact:"research-query.json"},{role:"researcher",model:"gpt-6.1-sol",effort:"xhigh",artifact:"research.md"},{role:"scriptwriter",model:"gpt-6.1-sol",effort:"xhigh",artifact:"script-package.json"}],researchTools:"Tavily Search + Extract, official institution pages; Tavily rate limit handled with official web sources",archive:"LOC photographs and drawing, curated local assets with source/date/rights manifest",voice:"Existing Alexey library voice, one continuous performance; Dennis not used",targetSeconds:150,budgetSeconds:165};
  await save(path.join(dir,"pipeline.json"),pipeline);
  event(id,"Отдельные роли планировщика, исследователя и сценариста GPT‑6.1 Sol/xhigh завершены. Архивные материалы подготовлены.");
  console.log(JSON.stringify(manifest));return;
 }
 if(!manifest)throw Error("Prepare project first");
 const id=manifest.id,dir=path.join(DATA,"projects",id);
 if(mode==="measure"){
  updateProject(id,{stage:"Записываем связный русский рассказ",progress:20});
  console.log(await run(PYTHON,[path.join(ROOT,"scripts/speech.py"),dir,FFMPEG],{timeout:240000}));
  const plan=await json(path.join(dir,"storyboard.json")),duration=Math.round(plan.scenes.reduce((n:number,s:any)=>n+s.seconds,0));
  updateProject(id,{plan:normalizePlan(plan,duration,true),duration,stage:"Озвучка готова, проверяем кадры",progress:30});
  console.log(JSON.stringify({id,duration,voice:await json(path.join(dir,"speech-provider.json"))}));return;
 }
 if(mode==="preview"){
  const p=project(id)!;
  const props={plan:p.plan!,profile:p.profile,format:p.format,audio:`${id}/audio.wav`,alignment:await json(path.join(dir,"alignment.json"))};
  const serveUrl=await bundle({entryPoint:path.join(ROOT,"renderer/index.tsx"),publicDir:path.join(ROOT,"data/projects")});
  const comp=await selectComposition({serveUrl,id:"StudioFilm",inputProps:props,browserExecutable:CHROME});
  const dest=path.join(out,"preview");await fs.mkdir(dest,{recursive:true});const thumbs:Buffer[]=[];
  for(const [i,s] of sceneClock(p.plan!).entries()){
   const frame=Math.min(comp.durationInFrames-1,s.startFrame+Math.round(s.frames*.65));
   const f=path.join(dest,`${i+1}.png`);
   await renderStill({composition:comp,serveUrl,inputProps:props,output:f,frame,browserExecutable:CHROME,scale:.5});
   thumbs.push(await sharp(f).resize(270,480).png().toBuffer());console.log(`Preview${i+1}/${p.plan!.scenes.length}`);
  }
  for(let page=0;page<Math.ceil(thumbs.length/8);page++){
   const pics=thumbs.slice(page*8,page*8+8);
   await sharp({create:{width:1080,height:Math.ceil(pics.length/4)*480,channels:3,background:"#000000"}}).composite(pics.map((input,i)=>({input,left:i%4*270,top:Math.floor(i/4)*480}))).png().toFile(path.join(dest,`overview-${page+1}.png`));
  }
  console.log(JSON.stringify({id,preview:dest,frames:comp.durationInFrames}));return;
 }
 if(mode==="enqueue"){
  updateProject(id,{status:"queued",stage:"В очереди на финальный рендер",progress:30});
  enqueue(id);event(id,"Архивные кадры и схема проверены перед финальным рендером. Озвучка берётся из успешного кэша.");
  console.log(JSON.stringify({id,status:"queued"}));return;
 }
 throw Error("Unknown mode");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
