// Ping explainer: GPT-6.1 Sol writes research + script; Claude Opus 5.5 directs the netcode motion.
// Modes: prepare (create draft + GPT preproduction), measure (one ElevenLabs take), enqueue (worker render).
import fs from "node:fs/promises";
import path from "node:path";
import {randomUUID,createHash} from "node:crypto";
import {validateNetcode,NETCODE_MODELS} from "../src/lib/netcode";
import {snapshotModels} from "../src/lib/model-assets";
import {db,project,updateProject,event,enqueue,profile,DATA,ROOT} from "../src/lib/store";
import {normalizePlan} from "../src/lib/model";
import {preproduce} from "../src/lib/preproduction";
import {run,PYTHON,FFMPEG} from "../src/lib/provider";

const manifestFile=path.join(ROOT,"work","ping-opus.json");
const TOPIC=`Почему в шутере тебя убивают, когда ты уже за стеной. Связный русский рассказ до минуты для @xtuned, 9:16. Один сквозной пример: ты (фиолетовый) забегаешь за угол, противник (жёлтый) держит этот угол, между вами игровой сервер. Порядок: 1) узнаваемая боль — ты уже за стеной, а тебя убили; 2) пинг — время пути сообщения до сервера и обратно; 3) своё движение ты видишь сразу (предсказание клиента), а сервер узнаёт о шаге только через половину этого пути; 4) противник получает твою позицию ещё позже: путь от сервера к нему плюс небольшой буфер интерполяции, поэтому на его экране ты ещё в прошлом — перед углом; 5) он стреляет в эту прошлую копию; 6) сервер откатывает время по истории позиций (компенсация задержки) и засчитывает попадание в пользу стрелка; 7) сообщение о смерти приходит, когда ты уже за стеной; 8) вывод: тот же механизм даёт преимущество выглядывающему — кто выходит из-за угла, видит первым; практический совет только если он есть в источниках. Пиши уверенно и живо: это общий механизм серверно-авторитетных шутеров (Valve Source, VALORANT). Одно короткое уточнение о различиях игр допустимо, но финал — ясный вывод, не оговорка. Числа только из источников или явно как «например». Не путай пинг с FPS. Визуал ставит отдельный motion-режиссёр: одна арена весь ролик, без перелистывания.`;

const json=async(p:string)=>JSON.parse(await fs.readFile(p,"utf8"));
const save=(p:string,d:unknown)=>fs.writeFile(p,JSON.stringify(d,null,2));

async function main(){
 const mode=process.argv[2]??"prepare";
 let manifest=await json(manifestFile).catch(()=>null);
 if(mode==="prepare"){
  const id=manifest?.id??randomUUID(),dir=path.join(DATA,"projects",id);
  await fs.mkdir(dir,{recursive:true});
  if(!project(id)){
   const saved={...profile(),renderMode:"2d" as const};
   delete (saved as any).authorReference;delete (saved as any).modelSnapshot;delete (saved as any).productionTemplate;
   const now=new Date().toISOString();
   db().prepare("INSERT INTO projects(id,title,topic,status,stage,progress,format,duration,voice,created,updated,profile) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run(id,"Пинг: почему убивают за стеной",TOPIC,"draft","Препродакшн GPT",0,"9:16",60,1,now,now,JSON.stringify(saved));
   await save(path.join(dir,"context.json"),{profile:saved,examples:[],created:now});
   await fs.writeFile(path.join(dir,"tts-provider.txt"),"elevenlabs");
   manifest={id};await fs.mkdir(path.dirname(manifestFile),{recursive:true});await save(manifestFile,manifest);
   event(id,"Проект создан: сценарий — GPT‑6.1 Sol xhigh, motion-режиссура — Claude Opus 5.5 xhigh.");
  }
  const p=project(id)!;
  const stage=(name:string,progress:number)=>{updateProject(id,{status:"running",stage:name,progress,error:null});event(id,name);console.log(`[${progress}%] ${name}`);};
  const plan=await preproduce(p,dir,stage,new AbortController().signal);
  updateProject(id,{title:plan.title,plan,status:"draft",stage:"Сценарий GPT готов, ждёт motion-режиссуры",progress:18});
  console.log(JSON.stringify({id,title:plan.title,scenes:plan.scenes.map(s=>({title:s.title,narration:s.narration}))},null,2));
  return;
 }
 if(!manifest)throw Error("Сначала prepare.");
 const id=manifest.id,dir=path.join(DATA,"projects",id);
 if(mode==="measure"){
  const p=project(id)!;
  await save(path.join(dir,"storyboard.json"),p.plan);
  await save(path.join(dir,"render.json"),{plan:p.plan,voice:true,maxDuration:60,ttsProvider:"elevenlabs"});
  await save(path.join(dir,"duration-budget.json"),{seconds:60});
  updateProject(id,{stage:"Записываем один непрерывный дубль",progress:20});
  console.log(await run(PYTHON,[path.join(ROOT,"scripts/speech.py"),dir,FFMPEG],{timeout:240000}));
  const measured=await json(path.join(dir,"storyboard.json")),duration=Math.round(measured.scenes.reduce((n:number,s:any)=>n+s.seconds,0));
  updateProject(id,{plan:normalizePlan(measured,duration,true,60),duration,stage:"Озвучка готова, motion-режиссура",progress:30});
  console.log(JSON.stringify({id,duration,voice:await json(path.join(dir,"speech-provider.json"))}));
  return;
 }
 if(mode==="direct"){
  // Motion plan authored by Claude Opus 5.5 (xhigh) against the measured voice clock; validated like the queue director output.
  const p=project(id)!,alignment=await json(path.join(dir,"alignment.json"));
  const net=validateNetcode(await json(path.join(dir,"netcode-plan.json")),p.plan!.scenes,alignment);
  snapshotModels(ROOT,dir,Object.values(NETCODE_MODELS));
  const plan={...p.plan!,filmKind:"netcode" as const,netcode:net};delete (plan as any).world3d;
  await save(path.join(dir,"storyboard.json"),plan);
  const hash=createHash("sha256").update(JSON.stringify({title:plan.title,scenes:plan.scenes.map((s,i)=>({scene:i+1,title:s.title,narration:s.narration,seconds:s.seconds,words:alignment[i]?.words?.map((w:any)=>w.text)}))})).digest("hex");
  await save(path.join(dir,"netcode-context.json"),{hash,renderer:"netcode/v1",director:{provider:"claude",model:"claude-opus-5-5",effort:"xhigh",via:"Claude Code (desktop session), validated by validateNetcode"}});
  updateProject(id,{plan,stage:"Motion-план Claude готов, превью кадров",progress:32});
  event(id,`Motion-режиссёр Claude Opus 5.5 xhigh: ${net.events.length} событий, ${net.camera.length} ракурсов камеры по меткам слов.`);
  console.log(JSON.stringify({id,events:net.events.length,camera:net.camera.length}));return;
 }
 if(mode==="enqueue"){
  updateProject(id,{status:"queued",stage:"В очереди на рендер",progress:30,error:null});
  enqueue(id);event(id,"Motion-план Claude Opus 5.5 проверен на кадрах; отправлено на финальный рендер очередью.");
  console.log(id);return;
 }
}
main().catch(e=>{console.error(e);process.exit(1);});
