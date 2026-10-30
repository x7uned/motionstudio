import {TEST_FFMPEG} from "./test-tools";
import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {instagramAccount,validateVideoAnalysis,validateCorpus,speechMetrics,IMPORT_LIMIT} from "../src/lib/author-model";
const previous=process.cwd();
process.env.STUDIO_FFMPEG=TEST_FFMPEG;const temp=fs.mkdtempSync(path.join(os.tmpdir(),"authors-test-"));fs.cpSync(path.join(previous,"data/branding/xtuned-outro"),path.join(temp,"data/branding/xtuned-outro"),{recursive:true});fs.cpSync(path.join(previous,"data/sound-packs/background-beds/v4"),path.join(temp,"data/sound-packs/background-beds/v4"),{recursive:true,filter:f=>!/\.(wav|m4a)$/.test(f)});
let store:typeof import("../src/lib/store"),authors:typeof import("../src/lib/author-store"),providers:typeof import("../src/lib/author-providers"),secrets:typeof import("../src/lib/server-secrets");
const originalFetch=globalThis.fetch;
before(async()=>{process.chdir(temp);store=await import("../src/lib/store");authors=await import("../src/lib/author-store");providers=await import("../src/lib/author-providers");secrets=await import("../src/lib/server-secrets");});
after(()=>{globalThis.fetch=originalFetch;store.db().close();process.chdir(previous);fs.rmSync(temp,{recursive:true,force:true});});
const mock=(fn:(url:string,init?:RequestInit)=>any)=>{globalThis.fetch=(async(u:any,init?:RequestInit)=>{const v=await fn(String(u),init);return v instanceof Response?v:new Response(JSON.stringify(v),{status:200,headers:{"Content-Type":"application/json"}});}) as typeof fetch;};
const sampleAnalysis=()=>({summary:"Простой пример",structure:[{at:0,label:"Начало"}],observations:[{category:"hook",rule:"Начинает с конкретной проблемы",at:0,end:1,evidence:"В первой фразе названо ограничение",basis:"transcript",confidence:"high"},{category:"motion",rule:"Карточка расширяется локально",at:.2,end:1,evidence:"На двух соседних кадрах карточка увеличилась",basis:"frames",confidence:"medium"},{category:"writing",rule:"Связывает решение с причиной",at:.5,end:1.2,evidence:"Слова связывают ограничение и решение",basis:"transcript",confidence:"high"}],limitations:["Анализ по кадрам"]});
test("Instagram profile normalization rejects reel links and unrelated hosts",()=>{
 assert.deepEqual(instagramAccount("@Xtu.ned"),{username:"xtu.ned",url:"https://www.instagram.com/xtu.ned/"});assert.equal(instagramAccount("https://instagram.com/xtuned/?igsh=test").username,"xtuned");
 for(const input of ["https://instagram.com.evil.test/foo","https://instagram.com/reel/xyz","https://instagram.com/","../../etc/passwd","foo..bar","https://user:pass@instagram.com/foo","https://instagram.com:999/foo","https://instagram.com/direct/"])assert.throws(()=>instagramAccount(input));
});
test("Free check and actor request cap spending and disable all paid add-ons",async()=>{
 mock((url,init)=>{if(url.endsWith("users/me"))return{data:{plan:{tier:"FREE",monthlyBasePriceUsd:0,monthlyUsageCreditsUsd:5}}};if(url.endsWith("limits"))return{data:{current:{monthlyUsageUsd:1}}};assert.match(url,/maxTotalChargeUsd=1/);const body=JSON.parse(String(init?.body));assert.equal(body.resultsLimit,20);assert.equal(body.includeTranscript,false);assert.equal(body.includeDownloadedVideo,false);assert.equal(body.includeSharesCount,false);assert.equal((init?.headers as any).Authorization.startsWith("Bearer "),true);return{data:{id:"run"}};});
 await secrets.saveApifyToken("apify_api_123456789012345678901234");assert.equal((await providers.ensureFreeAccount()).remainingUsd,4);assert.equal((await providers.startInstagramRun("xtuned",new AbortController().signal)).id,"run");
 mock(()=>({data:{plan:{tier:"STARTER",monthlyBasePriceUsd:19}}}));await assert.rejects(providers.ensureFreeAccount(),/только.*Free/);
});
test("Token persistence preserves other ENV values and exposes no token through public profile",async()=>{
 fs.writeFileSync(path.join(temp,".env.local"),"ELEVENLABS_API_KEY=sample-private-key\nOTHER_SETTING=keep\n");
 await secrets.saveApifyToken("apify_api_123456789012345678901234");const value=fs.readFileSync(path.join(temp,".env.local"),"utf8");assert.match(value,/OTHER_SETTING=keep/);// POSIX file modes do not exist on Windows (the file is private to the user profile there).
 if(process.platform!=="win32")assert.equal(fs.statSync(path.join(temp,".env.local")).mode&0o777,0o600);assert.equal((await secrets.serverSecrets()).ELEVENLABS_API_KEY,"sample-private-key");await assert.rejects(secrets.saveApifyToken("bad\nKEY=secret"));
});
test("Dataset is bounded to 20, deduplicates and rejects private/network URLs",()=>{
 const item=(i:number)=>({id:`reel${i}`,url:`https://instagram.com/reel/code${i}/`,videoUrl:"https://scontent.cdninstagram.com/video.mp4",ownerUsername:"xtuned",caption:"Текст"});
 const list=[item(1),item(1),{...item(2),videoUrl:"https://127.0.0.1/secrets"},{...item(3),ownerUsername:"other"},...Array.from({length:30},(_,i)=>item(i+4))];
 const selected=providers.reelItems(list,"xtuned");assert.equal(selected.length,IMPORT_LIMIT);assert.equal(new Set(selected.map(v=>v.externalId)).size,20);
 for(const u of ["http://cdninstagram.com/a","https://cdninstagram.com.evil.test/a","https://user:key@fbcdn.net/a","https://fbcdn.net:8443/a"])assert.throws(()=>providers.mediaUrl(u));
});
test("Downloader rejects redirects outside CDN without requesting the new host",async()=>{
 let calls=0;mock(()=>{calls++;return new Response(null,{status:302,headers:{Location:"https://127.0.0.1/private"}});});await assert.rejects(providers.downloadReel("https://scontent.fbcdn.net/v.mp4",path.join(temp,"blocked.mp4"),new AbortController().signal));assert.equal(calls,1);
});
test("Scribe uses multipart upload, word timestamps and returns validated timing",async()=>{
 const file=path.join(temp,"audio.wav");fs.writeFileSync(file,Buffer.alloc(100));mock((url,init)=>{assert.equal(url,"https://api.elevenlabs.io/v1/speech-to-text");const form=init?.body as FormData;assert.equal(form.get("model_id"),"scribe_v2");assert.equal(form.get("timestamps_granularity"),"word");assert.equal(form.get("diarize"),"false");return{text:"Привет мир",language_code:"rus",words:[{text:"Привет",start:0,end:.5,type:"word"},{text:" ",start:.5,end:.6,type:"spacing"},{text:"мир",start:.6,end:.9,type:"word"}]};});
 const t=await providers.scribe(file,new AbortController().signal);assert.equal(t.words.length,2);assert.equal(speechMetrics(t.words,1).wordCount,2);
 mock(()=>new Response("must-not-expose-secret",{status:403}));await assert.rejects(providers.scribe(file,new AbortController().signal),e=>e instanceof Error&&e.message.includes("разрешений")&&!e.message.includes("secret"));
});
test("Explicit Scribe language is passed to the provider and malformed codes never leave the server",async()=>{
 const file=path.join(temp,"russian.wav");fs.writeFileSync(file,Buffer.alloc(100));let calls=0;
 mock((_url,init)=>{calls++;assert.equal((init?.body as FormData).get("language_code"),"rus");return{text:"Русская речь",language_code:"rus",words:[{text:"Русская",start:0,end:.4,type:"word"},{text:"речь",start:.45,end:.8,type:"word"}]};});
 assert.equal((await providers.scribe(file,new AbortController().signal,false,"rus")).language,"rus");
 await assert.rejects(providers.scribe(file,new AbortController().signal,false,"rus&bad"),/код языка/);assert.equal(calls,1);
});
test("Video and corpus evidence must resolve to actual times and observations",()=>{
 const a=validateVideoAnalysis(sampleAnalysis(),2);assert.throws(()=>validateVideoAnalysis(sampleAnalysis(),.4));
 const base={summary:"Подача",rules:[{category:"hook",rule:"Конкретная проблема",confidence:"high",evidence:[{videoId:"v1",observationIndex:0}]},{category:"motion",rule:"Локальное расширение",confidence:"medium",evidence:[{videoId:"v1",observationIndex:1}]},{category:"writing",rule:"Причина до решения",confidence:"medium",evidence:[{videoId:"v1",observationIndex:2}]}],limitations:[]};
 const videos=[{id:"v1",analysis:a},{id:"v2",analysis:a}];assert.equal(validateCorpus(base,videos).rules[0].confidence,"medium");const bad=structuredClone(base);bad.rules[0].evidence[0].observationIndex=99;assert.throws(()=>validateCorpus(bad,videos));
});
test("Imports are durable, reject active duplicates and snapshot examples for new projects",()=>{
 const id=authors.createAuthor("@xtuned");assert.equal(authors.author(id).status,"queued");assert.throws(()=>authors.createAuthor("xtuned"),/уже/);assert.equal(store.jobs().find((j:any)=>j.project_id===id)?.kind,"author-import");
 authors.addAuthorVideo(id,{externalId:"123",url:"https://instagram.com/reel/demo/",caption:"Пример про кэш",sourceUrl:"https://scontent.fbcdn.net/v.mp4"});authors.addAuthorVideo(id,{externalId:"123",url:"https://instagram.com/reel/demo/",caption:"Повтор",sourceUrl:"https://scontent.fbcdn.net/v.mp4"});assert.equal(authors.authorVideos(id).length,1);
 const v=authors.authorVideos(id)[0],dir=authors.authorDir(id);fs.mkdirSync(path.join(dir,v.id),{recursive:true});fs.writeFileSync(path.join(dir,"PROFILE.md"),"# Наблюдения\nСначала проблема, потом решение");fs.writeFileSync(path.join(dir,v.id,"transcript.json"),JSON.stringify({text:"Профиль про кэш."}));
 authors.updateAuthorVideo(v.id,{status:"complete",state:{downloaded:true,transcript:true,analysis:sampleAnalysis()}});authors.updateAuthor(id,{status:"partial",report:{summary:"Разбор",rules:[],limitations:[]}});
 const projectId=store.createProject({topic:"Как работает кэш",duration:30,format:"9:16",voice:false,authorProfileId:id});assert.equal(store.project(projectId)?.profile.authorReference?.id,id);assert.equal(store.project(projectId)?.profile.background,store.profile().background);
 const project=path.join(temp,"new-project"),ref=authors.profileSnapshot(id,project);const text=authors.authorInstructions(project,ref,"кэш");assert.match(text,/Профиль про кэш/);assert.match(text,/не являются источниками/);assert.equal(JSON.stringify(authors.publicAuthor(authors.author(id),true)).includes("source_url"),false);
 fs.appendFileSync(path.join(project,"author-profile.json")," ");assert.throws(()=>authors.authorInstructions(project,ref),/изменён/);
});
test("Import pipeline downloads, transcribes, extracts frames, builds a profile and resumes without repeated paid requests",async()=>{
 const {spawnSync}=await import("node:child_process");
 const clip=path.join(temp,"fixture.mp4");const ff=spawnSync(process.env.STUDIO_FFMPEG!,["-hide_banner","-loglevel","error","-f","lavfi","-i","color=c=black:s=180x320:d=2","-f","lavfi","-i","sine=frequency=440:duration=2","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac","-shortest","-y",clip]);assert.equal(ff.status,0);
 const {importAuthor}=await import("../src/lib/author-pipeline");
 let starts=0,transcripts=0,downloads=0;
 const body=fs.readFileSync(clip);
 mock((url,init)=>{
  if(url.endsWith("users/me"))return{data:{plan:{tier:"FREE",monthlyBasePriceUsd:0,monthlyUsageCreditsUsd:5}}};
  if(url.endsWith("limits"))return{data:{current:{monthlyUsageUsd:0}}};
  if(url.includes('/runs?')){starts++;return{data:{id:"fixtureRun"}};}
  if(url.includes('actor-runs/'))return{data:{id:"fixtureRun",status:"SUCCEEDED",defaultDatasetId:"fixtureDataset",usageTotalUsd:.006}};
  if(url.includes('datasets/'))return[1,2].map(i=>({id:`fixture${i}`,url:`https://www.instagram.com/reel/fixture${i}/`,videoUrl:`https://scontent.fbcdn.net/fixture${i}.mp4`,ownerUsername:"fixtureauthor",caption:"Тест"}));
  if(url.includes('scontent.fbcdn.net')){downloads++;return new Response(body,{headers:{"Content-Type":"video/mp4"}});}
  if(url.includes('speech-to-text')){transcripts++;return{text:"Простой пример",language_code:"rus",words:[{text:"Простой",type:"word",start:.1,end:.7},{text:"пример",type:"word",start:.8,end:1.5}]};}
  throw new Error('Unexpected test URL');
 });
 const id=authors.createAuthor("fixtureauthor");
 // Only provider responses and model responses are fixtures; file, clock, FFmpeg, queue and persistence paths run normally.
 const model=async(prompt:string,_schema:unknown,_dir:string)=>{
  if(!prompt.startsWith("Собери профиль"))return sampleAnalysis();
  const videos=authors.authorVideos(id);return{summary:"Профиль по двум примерам",rules:[{category:"hook",rule:"Сначала конкретная проблема",confidence:"high",evidence:videos.map(v=>({videoId:v.id,observationIndex:0}))},{category:"motion",rule:"Локально расширяет карточку",confidence:"medium",evidence:[{videoId:videos[0].id,observationIndex:1}]},{category:"writing",rule:"Связывает решение с причиной",confidence:"medium",evidence:[{videoId:videos[0].id,observationIndex:2}]}],limitations:["Тестовый ответ модели"]};
 };
 await importAuthor(id,new AbortController().signal,{ask:model as any});
 assert.equal(authors.author(id).status,"partial");assert.equal(authors.authorVideos(id).filter(v=>v.status==="complete").length,2);assert.equal(starts,1);assert.equal(transcripts,2);assert.equal(downloads,2);
 assert.match(fs.readFileSync(path.join(authors.authorDir(id),"PROFILE.md"),"utf8"),/2\/2/);
 await importAuthor(id,new AbortController().signal,{ask:model as any});assert.equal(starts,1);assert.equal(transcripts,2);assert.equal(downloads,2);
 const pub=authors.publicAuthor(authors.author(id),true);assert.ok(pub.videos);assert.equal(pub.videos.length,2);assert.ok(pub.videos.every((v:any)=>v.videoUrl&&v.sheetUrl&&v.transcriptUrl));
});
