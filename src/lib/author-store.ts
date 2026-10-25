import {referenceRenderCapability} from "./scene3d";
import {reelLinks,referenceTitle} from "./video-reference-model";
import fs from "node:fs";
import path from "node:path";
import {randomUUID,createHash} from "node:crypto";
import {db,DATA,enqueue,assetUrl} from "./store";
import {instagramAccount, type CorpusProfile,type VideoAnalysis} from "./author-model";
export function authorTables(){
 db().exec(`CREATE TABLE IF NOT EXISTS authors(id TEXT PRIMARY KEY,username TEXT NOT NULL,url TEXT NOT NULL,status TEXT NOT NULL,stage TEXT NOT NULL,progress INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT '{}',report TEXT,error TEXT,created TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS author_videos(id TEXT PRIMARY KEY,author_id TEXT NOT NULL,external_id TEXT NOT NULL,url TEXT NOT NULL,caption TEXT NOT NULL,source_url TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',state TEXT NOT NULL DEFAULT '{}',error TEXT,UNIQUE(author_id,external_id));
 CREATE TABLE IF NOT EXISTS author_events(id INTEGER PRIMARY KEY AUTOINCREMENT,author_id TEXT NOT NULL,message TEXT NOT NULL,created TEXT NOT NULL);`);
}
export function authorDir(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error("Профиль не найден.");return path.join(DATA,"authors",id);}
export function author(id:string):any{authorTables();const r=db().prepare("SELECT * FROM authors WHERE id=?").get(id) as any;return r?{...r,state:JSON.parse(r.state),report:r.report?JSON.parse(r.report):null}:null;}
export function authors():any[]{authorTables();return (db().prepare("SELECT id FROM authors ORDER BY created DESC,rowid DESC").all() as any[]).map(r=>author(r.id));}
export function authorVideos(id:string):any[]{authorTables();return (db().prepare("SELECT * FROM author_videos WHERE author_id=? ORDER BY rowid").all(id) as any[]).map(v=>({...v,state:JSON.parse(v.state)}));}
export function updateAuthor(id:string,patch:Record<string,unknown>){
 const fields=Object.keys(patch).filter(k=>["status","stage","progress","state","report","error"].includes(k));
 if(!fields.length)return;
 db().prepare(`UPDATE authors SET ${fields.map(k=>`${k}=?`).join(",")},updated=? WHERE id=?`).run(...fields.map(k=>["state","report"].includes(k)?JSON.stringify(patch[k]):patch[k] as any),new Date().toISOString(),id);
}
export function authorEvent(id:string,message:string){db().prepare("INSERT INTO author_events(author_id,message,created) VALUES(?,?,?)").run(id,message,new Date().toISOString());}
export function updateAuthorVideo(id:string,patch:Record<string,unknown>){
 const fields=Object.keys(patch).filter(k=>["status","state","error","source_url","caption"].includes(k));
 if(fields.length)db().prepare(`UPDATE author_videos SET ${fields.map(k=>`${k}=?`).join(",")} WHERE id=?`).run(...fields.map(k=>k==="state"?JSON.stringify(patch[k]):patch[k] as any),id);
}
export function createAuthor(account:string){
 authorTables();const p=instagramAccount(account);
 if(authors().some(a=>a.username===p.username&&["queued","running"].includes(a.status)))throw new Error("Этот аккаунт уже обрабатывается.");
 const id=randomUUID(),now=new Date().toISOString();
 db().prepare("INSERT INTO authors(id,username,url,status,stage,created,updated) VALUES(?,?,?,?,?,?,?)").run(id,p.username,p.url,"queued","Ожидает импорта",now,now);
 enqueue(id,"author-import");authorEvent(id,"Запрошено до 20 публичных роликов. Apify: только Free, предел $1 на запуск, без платных дополнений.");return id;
}
export function createReferenceSet(opts:{links:string|string[];name?:string;frameStep?:.5|1;agentMode?:{declaredAgent:string}}){
 authorTables();const links=reelLinks(opts.links),frameStep=opts.frameStep??.5;
 if(![.5,1].includes(frameStep))throw new Error("Шаг кадров: 0,5 или 1 секунда.");
 const key=createHash("sha256").update(JSON.stringify({links:[...links].sort(),frameStep})).digest("hex");
 if(authors().some(a=>a.state.requestKey===key&&["queued","running"].includes(a.status)))throw new Error("Эта подборка уже обрабатывается.");
 const id=randomUUID(),now=new Date().toISOString();
 const state={mode:"links",links,name:(opts.name?.trim()||`Подборка · ${links.length} видео`).slice(0,80),frameStep,requestKey:key,...(opts.agentMode?{agentMode:{version:1,declaredAgent:opts.agentMode.declaredAgent}}:{})};
 db().prepare("INSERT INTO authors(id,username,url,status,stage,state,created,updated) VALUES(?,?,?,?,?,?,?,?)").run(id,"",links[0],"queued","Ожидает импорта",JSON.stringify(state),now,now);
 for(const url of links)addAuthorVideo(id,{externalId:new URL(url).pathname.split("/")[2],url,caption:"",sourceUrl:""});
 enqueue(id,"author-import");authorEvent(id,`Запрошено ${links.length} конкретных Reels. Кадры через ${frameStep} с; Apify Free, предел $1, без платных дополнений.`);if(opts.agentMode)authorEvent(id,`Агентный режим: разбор кадров и каталог приёмов выполняет ведущий агент (${opts.agentMode.declaredAgent}, самоотчёт).`);return id;
}
export function addAuthorVideo(id:string,v:{externalId:string;url:string;caption:string;sourceUrl:string}){
 db().prepare("INSERT OR IGNORE INTO author_videos(id,author_id,external_id,url,caption,source_url) VALUES(?,?,?,?,?,?)").run(randomUUID(),id,v.externalId,v.url,v.caption,v.sourceUrl);
}
function readTranscript(id:string,videoId:string){try{return String(JSON.parse(fs.readFileSync(path.join(authorDir(id),videoId,"transcript.json"),"utf8")).text||"").slice(0,100000);}catch{return "";}}
export function referenceCapability(id:string){const a=author(id);if(!a)throw new Error("Подборка не найдена.");return referenceRenderCapability(authorVideos(id).filter(v=>v.status==="complete").map(v=>v.state.analysis),!!a.state.requiresCustomRenderer);}
export function publicAuthor(a:any,detail=false){
 const vs=authorVideos(a.id);const complete=vs.filter(v=>v.status==="complete").length;
 const rel=`data/authors/${a.id}`;
 return {id:a.id,title:referenceTitle(a),mode:a.state.mode||"account",frameStep:a.state.frameStep??1,links:a.state.links??[],username:a.username,url:a.url,status:a.status,stage:a.stage,progress:a.progress,created:a.created,updated:a.updated,error:a.error,
  found:a.state.mode==="links"?vs.filter(v=>v.source_url||v.state.downloaded).length:vs.length,complete,renderCapability:referenceCapability(a.id),requiresCustomRenderer:!!a.state.requiresCustomRenderer,requested:a.state.links?.length??20,costUsd:a.state.costUsd??null,runId:a.state.runId??null,report:a.report,
  profileUrl:a.report?assetUrl(`${rel}/PROFILE.md`):null,
  videos:detail?vs.map(v=>({id:v.id,url:v.url,caption:v.caption,status:v.status,error:v.error,duration:v.state.duration??null,metrics:v.state.metrics??null,analysis:v.state.analysis??null,coverage:v.state.coverage??null,
   briefUrl:v.state.analysis?.version===2?assetUrl(`${rel}/${v.id}/REBUILD.md`):null,
   frameIndexUrl:v.state.frames?assetUrl(`${rel}/${v.id}/frames.json`):null,
   sheets:v.state.sheets?.map((name:string)=>assetUrl(`${rel}/${v.id}/${name}`))??[],
   videoUrl:v.state.downloaded?assetUrl(`${rel}/${v.id}/video.mp4`):null,
   sheetUrl:v.state.frames?assetUrl(`${rel}/${v.id}/contact-sheet.jpg`):null,
   transcriptText:v.state.transcript?readTranscript(a.id,v.id):null,
   transcriptUrl:v.state.transcript?assetUrl(`${rel}/${v.id}/transcript.json`):null,
  })):undefined,
  events:detail?db().prepare("SELECT message,created FROM author_events WHERE author_id=? ORDER BY id DESC LIMIT 50").all(a.id):undefined,
 };
}
export function profileSnapshot(id:string,projectDir:string){
 const a=author(id);const capability=referenceCapability(id);if(!capability.engine)throw new Error(capability.reason);if(!a?.report||!["ready","partial"].includes(a.status))throw new Error("Сначала завершите разбор профиля автора.");
 const content=fs.readFileSync(path.join(authorDir(id),"PROFILE.md"),"utf8");
 const examples=authorVideos(id).filter(v=>v.status==="complete").slice(0,20).map(v=>({id:v.id,caption:v.caption.slice(0,1200),text:JSON.parse(fs.readFileSync(path.join(authorDir(id),v.id,"transcript.json"),"utf8")).text.slice(0,18000),analysis:v.state.analysis as VideoAnalysis}));
 const report=a.report as CorpusProfile;
 fs.mkdirSync(projectDir,{recursive:true});
 const snapshot={id,username:a.username,name:referenceTitle(a),report,content,examples};
 const json=JSON.stringify(snapshot,null,2),sha256=createHash("sha256").update(json).digest("hex");
 fs.writeFileSync(path.join(projectDir,"author-profile.json"),json);
 return {id,username:a.username,name:referenceTitle(a),sha256};
}
export function authorInstructions(projectDir:string,reference?:{id:string;username:string;name?:string;sha256:string},topic=""){
 if(!reference)return "";
 const json=fs.readFileSync(path.join(projectDir,"author-profile.json"),"utf8");
 if(createHash("sha256").update(json).digest("hex")!==reference.sha256)throw new Error("Снимок профиля автора изменён. Восстановите исходный файл.");
 const p=JSON.parse(json);
 const terms=new Set(topic.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]);
 const selected=[...p.examples].map((v:any)=>({...v,score:[...terms].filter(t=>(v.caption+v.text).toLowerCase().includes(t)).length})).sort((a:any,b:any)=>b.score-a.score).slice(0,3);
 return `\nРАЗБОР ВИДЕОРЕФЕРЕНСОВ ${reference.name||reference.username} (сценарий, сцены и способ реализации; без обучения весов):\n${p.content}\nИспользуй сценарную структуру и технические планы сцен. Для 3D доступен настоящий Three.js-рендер: процедурные модели или загруженные GLB/GLTF, ключи камеры, свет, плавные трансформации и титры. После сценария отдельный 3D-режиссёр превращает разбор в world3d JSON. Не выдавай обычную схему за эквивалент 3D. Снятое видео, физические симуляции и точное восстановление геометрии не поддерживаются. Не копируй исходные фразы, личность, голос или бренд. Факты из референсов не являются источниками новой темы. Бренд @xtuned, ограничения рендера и правила плавности имеют приоритет.\nПОДОБРАННЫЕ ПРИМЕРЫ=${JSON.stringify(selected.map((v:any)=>({id:v.id,caption:v.caption,text:v.text.slice(0,6000),analysis:v.analysis?.version===2?{...v.analysis,shots:v.analysis.shots.slice(0,24)}:v.analysis})))}`;
}
