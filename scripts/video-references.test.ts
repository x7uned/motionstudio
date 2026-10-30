import {TEST_FFMPEG} from "./test-tools";
import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {reelLink,reelLinks,validateChunk,needsCustomRenderer} from "../src/lib/video-reference-model";
const previous=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),"video-reference-test-"));fs.cpSync(path.join(previous,"data/branding/xtuned-outro"),path.join(temp,"data/branding/xtuned-outro"),{recursive:true});fs.cpSync(path.join(previous,"data/sound-packs/background-beds/v4"),path.join(temp,"data/sound-packs/background-beds/v4"),{recursive:true,filter:f=>!/\.(wav|m4a)$/.test(f)});
process.env.STUDIO_FFMPEG=TEST_FFMPEG;
let store:typeof import("../src/lib/store"),data:typeof import("../src/lib/author-store"),providers:typeof import("../src/lib/author-providers");
const originalFetch=globalThis.fetch;
before(async()=>{process.chdir(temp);store=await import("../src/lib/store");data=await import("../src/lib/author-store");providers=await import("../src/lib/author-providers");fs.writeFileSync(path.join(temp,".env.local"),"APIFY_TOKEN=apify_api_test1234567890123456789\nELEVENLABS_API_KEY=private-test-fixture\n");});
after(()=>{globalThis.fetch=originalFetch;store.db().close();process.chdir(previous);fs.rmSync(temp,{recursive:true,force:true});});
const mock=(fn:(url:string,init?:RequestInit)=>any)=>{globalThis.fetch=(async(url:any,init?:RequestInit)=>{const out=await fn(String(url),init);return out instanceof Response?out:new Response(JSON.stringify(out),{headers:{"Content-Type":"application/json"}});}) as typeof fetch;};
const observations=(start:number,end:number)=>[
 {category:"camera",rule:"Камера меняет ракурс объекта",at:start,end,evidence:"Относительное положение переднего и заднего планов меняется",basis:"frames",confidence:"medium"},
 {category:"assets",rule:"Нужна объёмная модель объекта",at:start,end,evidence:"Виден объём объекта",basis:"frames",confidence:"medium"},
 {category:"motion",rule:"Текст появляется рядом с объектом",at:start,end,evidence:"Подпись появляется на последовательных кадрах",basis:"frames",confidence:"medium"},
];
const shot=(start:number,end:number)=>({id:"s1",at:start,end,purpose:"Показывает устройство объекта",composition:"Объект по центру, текст сверху",onScreenText:["Тест"],camera:{mode:"orbit",description:"Предлагаемый облёт вокруг модели",evidence:"Изменение ракурса между кадрами",confidence:"medium"},objects:[{name:"Корпус",kind:"model3d",appearance:"Объёмный корпус",motion:"Поворачивается относительно камеры",evidence:"Видны разные стороны"}],lighting:"Предположительно мягкий источник света",transition:"Непрерывный план",speechSync:"Речи нет",reproduction:{method:"threejs",steps:["Подготовить модель","Анимировать камеру вокруг модели"],assets:["GLB-модель"],unknowns:["Точная геометрия и траектория камеры неизвестны"]}});
const reconstruction=()=>({concept:"Рассмотреть объёмный объект",recommendedTools:["Three.js"],assetChecklist:["GLB-модель"],steps:["Подготовить сцену и свет","Задать ключевые положения камеры"],unknowns:["Исходная модель неизвестна"]});
const makeClip=(file:string,duration:number,audio=false)=>{
 const args=["-hide_banner","-loglevel","error","-f","lavfi","-i",`color=c=black:s=180x320:r=4:d=${duration}`];
 if(audio)args.push("-f","lavfi","-i",`sine=frequency=440:duration=${duration}`);
 args.push("-c:v","libx264","-pix_fmt","yuv420p");if(audio)args.push("-c:a","aac","-shortest");args.push("-y",file);
 assert.equal(spawnSync(process.env.STUDIO_FFMPEG!,args).status,0);
};
test("Reel inputs canonicalize tracking links, deduplicate, preserve shortcode case and cap unique videos",()=>{
 const link="https://instagram.com/reel/AbC_123/?igsh=tracking#fragment";
 assert.equal(reelLink(link),"https://www.instagram.com/reel/AbC_123/");assert.equal(reelLinks(`${link}\nhttps://www.instagram.com/reels/AbC_123/`).length,1);
 assert.equal(reelLinks(Array.from({length:20},(_,i)=>`https://www.instagram.com/reel/code${i}/`)).length,20);
 assert.throws(()=>reelLinks(Array.from({length:21},(_,i)=>`https://www.instagram.com/reel/code${i}/`)),/20/);
 for(const u of ["@someone","https://instagram.com/someone/","http://instagram.com/reel/abc/","https://instagram.com.evil/reel/abc/","https://user:key@instagram.com/reel/abc/","https://instagram.com:8443/reel/abc/","https://instagram.com/p/abc/"])assert.throws(()=>reelLink(u));
});
test("Apify accepts exactly the requested mixed-author URLs and rejects unrelated results",()=>{
 const links=["https://www.instagram.com/reel/AAA/","https://www.instagram.com/reel/BBB/"];
 const input=providers.videoListInput(links);assert.deepEqual(input.username,links);assert.equal(input.resultsLimit,1);assert.equal(input.includeDownloadedVideo,false);
 const item=(code:string,owner:string)=>({id:code,url:`https://www.instagram.com/reel/${code}/`,videoUrl:"https://scontent.fbcdn.net/v.mp4",ownerUsername:owner});
 const items=[...Array.from({length:22},(_,i)=>item(`extra${i}`,"not-requested")),item("AAA","firstauthor"),item("BBB","secondauthor")];
 assert.deepEqual(providers.selectedReelItems(items,links).map(v=>v.externalId),["AAA","BBB"]);
});
test("A single selected video is a valid durable collection; duplicates do not enqueue twice",()=>{
 const links=["https://instagram.com/reel/one123/"];
 const id=data.createReferenceSet({links,name:"3D камера",frameStep:.5});const a=data.author(id);assert.equal(a.state.links.length,1);assert.equal(data.authorVideos(id).length,1);assert.equal(data.publicAuthor(a).requested,1);assert.equal(data.publicAuthor(a).title,"3D камера");assert.throws(()=>data.createReferenceSet({links,frameStep:.5}),/уже/);assert.throws(()=>data.createReferenceSet({links,frameStep:.25 as any}));
});
test("Frame extraction retains every half-second sample and splits the full sequence into ordered parts",async()=>{
 const dir=path.join(temp,"sampling");fs.mkdirSync(dir);makeClip(path.join(dir,"video.mp4"),16);
 const {extractReferenceFrames}=await import("../src/lib/reference-frames");const frames=await extractReferenceFrames(dir,16,.5,new AbortController().signal);
 assert.equal(frames.frameCount,32);assert.equal(frames.parts.length,2);assert.equal(frames.parts[0].start,0);assert.equal(frames.parts[0].end,15);assert.equal(frames.parts[1].start,15);assert.equal(frames.parts[1].end,16);
 assert.deepEqual(frames.parts.flatMap(p=>p.frames.map(f=>f.at)),Array.from({length:32},(_,i)=>i*.5));
 for(const p of frames.parts)assert.ok(fs.existsSync(path.join(dir,p.sheet))&&p.detail.every(f=>fs.existsSync(path.join(dir,f))));
 const second=await extractReferenceFrames(dir,16,.5,new AbortController().signal);assert.deepEqual(second,frames);
});
test("Chunk analysis must cover the entire fragment and keep timestamps in bounds",()=>{
 const good={summary:"Тест",shots:[shot(0,2)],observations:observations(0,2),limitations:[]};assert.equal(validateChunk(good,0,2).shots.length,1);
 assert.throws(()=>validateChunk({...good,shots:[shot(1,2)]},0,2),/пропущен/);assert.throws(()=>validateChunk({...good,shots:[shot(0,1)]},0,2),/конец/);assert.throws(()=>validateChunk({...good,shots:[shot(0,3)]},0,2),/границы/);
});
test("A video without speech can be transcribed without inventing mandatory narration",async()=>{
 const file=path.join(temp,"music.wav");fs.writeFileSync(file,Buffer.alloc(100));mock(()=>({text:"",words:[],language_code:"und"}));assert.equal((await providers.scribe(file,new AbortController().signal,true)).words.length,0);await assert.rejects(providers.scribe(file,new AbortController().signal));
});
test("Full single-video workflow preserves 3D scene plans, analyzes all frames, resumes and routes 3D references to the real renderer",async()=>{
 const clip=path.join(temp,"no-audio.mp4");makeClip(clip,2);const body=fs.readFileSync(clip);let starts=0,downloads=0,scribeCalls=0,modelCalls=0;
 const link="https://www.instagram.com/reel/Deep3D/",id=data.createReferenceSet({links:[link],name:"Пролёт камеры",frameStep:.5});
 mock((url,init)=>{
  if(url.endsWith("users/me"))return{data:{plan:{tier:"FREE",monthlyBasePriceUsd:0,monthlyUsageCreditsUsd:5}}};
  if(url.endsWith("limits"))return{data:{current:{monthlyUsageUsd:0}}};
  if(url.includes("/runs?")){starts++;assert.deepEqual(JSON.parse(String(init?.body)).username,[link]);return{data:{id:"testRun"}};}
  if(url.includes("actor-runs"))return{data:{id:"testRun",status:"SUCCEEDED",defaultDatasetId:"testDataset",usageTotalUsd:.0036}};
  if(url.includes("datasets"))return[{id:"Deep3D",url:link,caption:"3D-пролёт",videoUrl:"https://scontent.fbcdn.net/v.mp4",ownerUsername:"any-author"}];
  if(url.includes("fbcdn.net")){downloads++;return new Response(body);}
  if(url.includes("speech-to-text")){scribeCalls++;throw new Error("No audio must not be sent to Scribe");}
  throw new Error("Unexpected provider call");
 });
 const ask=async(prompt:string)=>{
  modelCalls++;
  if(prompt.startsWith("Ты режиссёр"))return{summary:"Объёмный объект",shots:[shot(0,2)],observations:observations(0,2),limitations:["Тестовый ответ, не реальная оценка чёрного кадра"]};
  if(prompt.startsWith("Собери технический"))return{summary:"План 3D-сцены",sceneType:"3d",reconstruction:reconstruction(),selectedObservations:[{part:1,index:0},{part:1,index:1},{part:1,index:2}],limitations:["Тестовый ответ модели"]};
  const v=data.authorVideos(id)[0];return{summary:"Разбор одной 3D-сцены",rules:observations(0,2).map((o,i)=>({category:o.category,rule:o.rule,confidence:"medium",evidence:[{videoId:v.id,observationIndex:i}]})),limitations:["Один референс"]};
 };
 const {importReferenceSet}=await import("../src/lib/video-reference-pipeline");await importReferenceSet(id,new AbortController().signal,{ask:ask as any});
 const a=data.author(id),v=data.authorVideos(id)[0];assert.equal(a.status,"ready");assert.equal(a.state.requiresCustomRenderer,true);assert.equal(v.state.coverage.analyzedFrameCount,4);assert.equal(v.state.coverage.frameCount,4);assert.equal(v.state.analysis.shots[0].camera.mode,"orbit");assert.equal(needsCustomRenderer(v.state.analysis),true);assert.equal(scribeCalls,0);assert.equal(modelCalls,3);assert.equal(starts,1);assert.equal(downloads,1);assert.ok(fs.existsSync(path.join(data.authorDir(id),v.id,"REBUILD.md")));
 await importReferenceSet(id,new AbortController().signal,{ask:ask as any});assert.equal(modelCalls,3);assert.equal(starts,1);assert.equal(downloads,1);
 const pub=data.publicAuthor(data.author(id),true);assert.equal(pub.complete,1);assert.equal(pub.requested,1);assert.ok(pub.videos?.[0].briefUrl);const projectId=store.createProject({topic:"Новая 3D-сцена",duration:30,format:"9:16",voice:false,referenceSetId:id});assert.equal(store.project(projectId)?.profile.renderMode,"three");assert.throws(()=>store.createProject({topic:"Новая 3D-сцена",duration:30,format:"9:16",voice:false,renderMode:"2d",referenceSetId:id}),/3D/);
});

test("Four independent references are processed concurrently with at most three model calls and no repeated downloads",async()=>{
 const clip=path.join(temp,"four-no-audio.mp4");makeClip(clip,1);const body=fs.readFileSync(clip);let active=0,peak=0,downloads=0;
 const links=Array.from({length:4},(_,i)=>`https://www.instagram.com/reel/Batch3D${i}/`),id=data.createReferenceSet({links,name:"Четыре3D-референса",frameStep:.5});
 mock((url,init)=>{
  if(url.endsWith("users/me"))return{data:{plan:{tier:"FREE",monthlyBasePriceUsd:0,monthlyUsageCreditsUsd:5}}};
  if(url.endsWith("limits"))return{data:{current:{monthlyUsageUsd:0}}};
  if(url.includes("/runs?"))return{data:{id:"batchRun"}};
  if(url.includes("actor-runs"))return{data:{id:"batchRun",status:"SUCCEEDED",defaultDatasetId:"batchDataset",usageTotalUsd:.0144}};
  if(url.includes("datasets"))return links.map((url,i)=>({id:`Batch3D${i}`,url,caption:"Объёмная сцена",videoUrl:`https://scontent.fbcdn.net/v${i}.mp4`,ownerUsername:"source"}));
  if(url.includes("fbcdn.net")){downloads++;return new Response(body);}throw new Error("Unexpected provider call");
 });
 const ask=async(prompt:string)=>{active++;peak=Math.max(peak,active);try{await new Promise(r=>setTimeout(r,25));
  if(prompt.startsWith("Ты режиссёр"))return{summary:"Объёмный объект",shots:[shot(0,1)],observations:observations(0,1),limitations:[]};
  if(prompt.startsWith("Собери технический"))return{summary:"План3D-сцены",sceneType:"3d",reconstruction:reconstruction(),selectedObservations:[{part:1,index:0},{part:1,index:1},{part:1,index:2}],limitations:[]};
  return{summary:"Четыре объёмных референса",rules:observations(0,1).map((o,i)=>({category:o.category,rule:o.rule,confidence:"medium",evidence:data.authorVideos(id).map(v=>({videoId:v.id,observationIndex:i}))})),limitations:[]};
 }finally{active--;}};
 const {importReferenceSet}=await import("../src/lib/video-reference-pipeline");await importReferenceSet(id,new AbortController().signal,{ask:ask as any});
 // Decode/IO timing can leave a slot idle on a busy rendering host. Assert actual
 // concurrency and the safety cap, rather than requiring all slots at one instant.
 assert.ok(peak>1&&peak<=3,`Observed ${peak} concurrent model calls`);assert.equal(downloads,4);assert.equal(data.author(id).status,"ready");assert.equal(data.authorVideos(id).filter(v=>v.status==="complete").length,4);
 await importReferenceSet(id,new AbortController().signal,{ask:ask as any});assert.equal(downloads,4);
});
