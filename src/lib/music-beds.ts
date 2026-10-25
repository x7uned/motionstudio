import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {execFile} from "node:child_process";
import {MUSIC_PACK,MUSIC_PACKS,MUSIC_BED_IDS,musicBedSchema,type MusicBed,type MusicBedId} from "./music-bed-schema";
import {buildArrangement,type ArrangementInput} from "./music-arrangement";
import {sceneClock,type Storyboard} from "./model";
import {timeline} from "./illustrated";
import {isoWorld,isoTimeline,isoStoryEvents} from "./isometric";
export {MUSIC_PACK,MUSIC_PACKS,MUSIC_BED_IDS,musicBedSchema,type MusicBed,type MusicBedId};

/** Mandatory background music (user decision 2026-10-20). Read docs/background-music.md. */
export const MUSIC_SNAPSHOT_DIR="music-bed";
/** The user's choice for how-things-work explainers ("1, 2, 4 давай будем использовать для таких роликов"). */
export const EXPLAINER_BEDS=["pluck-curious","glass-arp","chip-soft"] as const satisfies readonly MusicBedId[];
/** Starting mix levels heard and kept by the user in the demos (manifest.mix). */
export const MUSIC_MIX={pauseDb:-8,speechDb:-15,attackSeconds:.12,releaseSeconds:.7,thresholdDbFS:-45,holdSeconds:.25,windowSamples:960,fadeInSeconds:1.5,fadeOutSeconds:2.5,outroFadeSeconds:1.2} as const;
export type MusicMix={-readonly [K in keyof typeof MUSIC_MIX]:number};
/** Arranged v3 beds sit 3 dB higher under speech: the level of the demo the user approved (2026-10-20). */
export const ARRANGED_MIX:MusicMix={...MUSIC_MIX,speechDb:-12};
export type MusicAccent={at:number;kind:"chime"|"fall"|"rise"|"cadence"};
export type MusicBedCue={version:1;pack:MusicBed["pack"];id:MusicBedId;file:string;sha256:string;samples:number;gainDb:number;mix:MusicMix;outroStart:number|null;
 arrangement?:{sha256:string;bpm:number;cadence:number;measuredLufs:number;tension:{from:number;to:number}[];accents:MusicAccent[];loop?:true}};

const L="(?<!\\p{L})",E="(?!\\p{L})";
const words=(list:string[])=>new RegExp(list.map(w=>L+w).join("|"),"iu");
// Ordered: the first matching rule wins; preferred beds only. music-box and nature-air are editor-only.
const RULES:{id:MusicBedId;matched:string;re:RegExp}[]=[
 {id:"space-drone",matched:"space",re:words(["space"+E,"cosmos","sun"+E,"suns"+E,"solar","moon","planet","orbit","stars?"+E,"galax","asteroid","comet","black hole","mars"+E,"jupiter","saturn","venus","universe","gravity","eclipse","космо","солнц","лун","планет","орбит","зв[её]зд","галакт","астероид","комет","ч[её]рн\\S* дыр","марс","юпитер","сатурн","венер","вселен","гравитац","затмен"])},
 {id:"space-drone",matched:"planet-what-if",re:/(?=.*(?:what if|что (?:будет,? )?если))(?=.*(?<!\p{L})(?:earth|земл))/isu},
 {id:"warm-pad",matched:"history",re:words(["history","historic","centur","invent","ancient","medieval","истори","век(?:а|ов|е)?"+E,"изобрет","древн","средневек"])},
 {id:"chip-soft",matched:"digital",re:words(["qr"+E,"internet","online","digital","pixel","bits?"+E,"bytes?"+E,"data"+E,"chips?"+E,"computer","software","apps?"+E,"wi-?fi","gps"+E,"smartphone","phones?"+E,"games?"+E,"video game","интернет","онлайн","цифров","пиксел","бит(?:ы|ов|а)?"+E,"байт","данны","чип","компьют","приложени","вай-?фай","смартфон","телефон","видеоигр","игр[аыу]"+E,"нейросет","сервер"])},
 {id:"glass-arp",matched:"math-signal",re:words(["math","algorithm","encrypt","cipher","compress","signal","error correction","reed","equation","probabilit","quantum","radio","laser","математ","алгоритм","шифр","сжати","сигнал","коррекц","уравнен","вероятн","квант","радио","лазер"])},
 {id:"lofi-pulse",matched:"everyday",re:words(["food","coffee","sleep","kitchen","cooking","everyday","morning","еда"+E,"еды"+E,"кофе","сон"+E,"сна"+E,"кухн","готовк","утр[оа]"+E])},
];
/** Choose once per project; `pick(n)` returns 0..n-1 (randomInt on the server, fixed in tests). */
export function chooseMusicBed(topic:string,pick:(n:number)=>number):{id:MusicBedId;selection:"topic"|"explainer-random";matched?:string}{
 for(const r of RULES)if(r.re.test(topic))return {id:r.id,selection:"topic",matched:r.matched};
 return {id:EXPLAINER_BEDS[pick(EXPLAINER_BEDS.length)],selection:"explainer-random"};
}

type PackEntry={id:string;file:string;generator:string;gainDb:number;sha256:string;status:string;arranged?:boolean};
const hashOf=(bytes:Buffer|string)=>createHash("sha256").update(bytes).digest("hex");
function packManifest(root:string,pack:string){return JSON.parse(fs.readFileSync(path.join(root,"data/sound-packs",pack,"manifest.json"),"utf8")) as {beds:PackEntry[];generatorSha256:Record<string,string>};}

/** Copy the chosen bed's generator and settings into the project; the project never reads the live pack again. */
export function snapshotMusicBed(root:string,projectDir:string,choice:{id:MusicBedId;selection:MusicBed["selection"];matched?:string},pack:MusicBed["pack"]=MUSIC_PACK):MusicBed{
 const source=path.join(root,"data/sound-packs",pack),manifest=packManifest(root,pack),entry=manifest.beds.find(b=>b.id===choice.id);
 if(!entry)throw new Error(`Подложки ${choice.id} нет в ${pack}.`);
 const generator=entry.generator.split(" ")[0],name=path.basename(generator),code=fs.readFileSync(path.join(source,generator));
 if(hashOf(code)!==manifest.generatorSha256[name])throw new Error(`Генератор ${name} в ${pack} изменён.`);
 const target=path.join(projectDir,MUSIC_SNAPSHOT_DIR);fs.mkdirSync(target,{recursive:true});
 fs.writeFileSync(path.join(target,name),code);
 const bed=JSON.stringify({version:1,pack,id:entry.id,generator:name,generatorSha256:hashOf(code),gainDb:entry.gainDb,referenceSha256:entry.sha256,...(entry.arranged?{arranged:true}:{}),mix:entry.arranged?ARRANGED_MIX:MUSIC_MIX},null,2)+"\n";
 fs.writeFileSync(path.join(target,"bed.json"),bed);
 return musicBedSchema.parse({version:1,pack,id:entry.id,selection:choice.selection,...(choice.matched?{matched:choice.matched}:{}),sha256:hashOf(bed)});
}
export function projectMusicBed(projectDir:string,bed:MusicBed){
 const dir=path.join(projectDir,MUSIC_SNAPSHOT_DIR),text=fs.readFileSync(path.join(dir,"bed.json"));
 if(hashOf(text)!==bed.sha256)throw new Error("Снимок фоновой музыки изменён после выбора.");
 const info=JSON.parse(text.toString("utf8")) as {pack:MusicBed["pack"];id:MusicBedId;generator:string;generatorSha256:string;gainDb:number;arranged?:boolean;mix:MusicMix};
 const generator=path.join(dir,path.basename(info.generator));
 if(info.id!==bed.id||hashOf(fs.readFileSync(generator))!==info.generatorSha256)throw new Error("Генератор фоновой музыки в проекте изменён.");
 return {...info,generator};
}

/** 16-bit mono 48 kHz narration master → float samples (remix.py enforces the same format). */
export function readMonoPcm16(bytes:Buffer){
 if(bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WAVE")throw new Error("Голосовой мастер не WAV.");
 let at=12,fmt:{channels:number;rate:number;bits:number}|null=null;
 while(at+8<=bytes.length){
  const id=bytes.toString("ascii",at,at+4),size=bytes.readUInt32LE(at+4),body=at+8;
  if(id==="fmt ")fmt={channels:bytes.readUInt16LE(body+2),rate:bytes.readUInt32LE(body+4),bits:bytes.readUInt16LE(body+14)};
  if(id==="data"){
   if(!fmt||fmt.channels!==1||fmt.rate!==48000||fmt.bits!==16)throw new Error("Неожиданный формат голосового мастера.");
   const n=Math.floor(Math.min(size,bytes.length-body)/2),out=new Float32Array(n);
   for(let i=0;i<n;i++)out[i]=bytes.readInt16LE(body+2*i)/32768;
   return out;
  }
  at=body+size+(size&1);
 }
 throw new Error("В голосовом мастере нет данных.");
}

const smooth=(x:number)=>x<=0?0:x>=1?1:x*x*(3-2*x);
/** Duck the interleaved stereo bed under the voice: pauses at pauseDb, speech at speechDb, smooth one-pole attack/release.
 * The bed fades in at the start and is gone by the outro, where only the outro's own cues play. */
export function duckBed(bed:Float32Array,voice:Float32Array,gainDb:number,outroStart:number|null,mix:MusicMix=MUSIC_MIX,loop=false){
 const SR=48000,N=bed.length/2,T=N/SR,out=new Float32Array(bed.length),g0=10**(gainDb/20),gp=10**(mix.pauseDb/20),gs=10**(mix.speechDb/20);
 const target=new Uint8Array(N),thr=10**(mix.thresholdDbFS/20),hold=SR*mix.holdSeconds,w=mix.windowSamples;let last=-Infinity;
 for(let i=0;i<N;i+=w){
  let s=0;for(let j=i;j<i+w&&j<voice.length;j++)s+=voice[j]*voice[j];
  if(Math.sqrt(s/w)>thr)last=i;
  const v=i-last<hold?1:0;for(let j=i;j<i+w&&j<N;j++)target[j]=v;
 }
 const atk=1-Math.exp(-1/(mix.attackSeconds*SR)),rel=1-Math.exp(-1/(mix.releaseSeconds*SR));
 const end=outroStart!==null&&outroStart>mix.outroFadeSeconds&&outroStart<T?outroStart:T,fade=end<T?mix.outroFadeSeconds:mix.fadeOutSeconds;
 let k=0;
 // A loop film (2026-10-22) has no fades, and the ducking envelope starts where it ends, so the seam keeps its level.
 if(loop)for(let i=0;i<N;i++)k+=(target[i]-k)*(target[i]>k?atk:rel);
 for(let i=0;i<N;i++){
  k+=(target[i]-k)*(target[i]>k?atk:rel);
  const t=i/SR,g=g0*(gp+(gs-gp)*k)*(loop?1:smooth(t/mix.fadeInSeconds)*smooth((end-t)/fade));
  out[2*i]=bed[2*i]*g;out[2*i+1]=bed[2*i+1]*g;
 }
 return out;
}

/** What the arranged bed follows: chapters, the director's tone-coded callouts and big words, the outro. */
export function arrangementInputFor(plan:Storyboard,alignment:any[]):Omit<ArrangementInput,"bed"|"seconds">{
 const clock=sceneClock(plan),outro=plan.creatorOutro?clock.find(s=>s.id===plan.creatorOutro!.sceneId):undefined;
 const tl=plan.illustrated?timeline(plan.illustrated,plan.scenes,alignment):null;
 // isometric/v1: the plan's tone-coded story moments (jam → warn, cleared → ok) play the role of callouts.
 const iso=plan.isometric?isoStoryEvents(isoTimeline(plan.isometric,isoWorld(plan.isometric),plan.scenes,alignment)).filter(e=>e.kind!=="route"&&e.kind!=="link").map(e=>({at:e.at,tone:e.tone})):[];
 return {chapters:clock.map(s=>({start:s.start,end:s.end})),outroStart:outro?outro.start:null,
  callouts:tl?tl.callouts.map(c=>({at:c.from,tone:c.tone})):iso,bigWords:tl?tl.bigWords.map(b=>({at:b.enterAt})):[]};
}
const run=(command:string,args:string[],signal?:AbortSignal,stderr=false)=>new Promise<string>((resolve,reject)=>execFile(command,args,{env:{PATH:process.env.PATH??""} as unknown as NodeJS.ProcessEnv,timeout:180000,signal,maxBuffer:4_000_000},(e:Error|null,out,err)=>e?reject(e):resolve(String(stderr?err:out))));
/** Integrated loudness of a raw float32 stereo bed (ffmpeg loudnorm measurement). */
async function measureLufs(ffmpeg:string,raw:string,signal?:AbortSignal){
 const text=await run(ffmpeg,["-hide_banner","-nostats","-f","f32le","-ar","48000","-ac","2","-i",raw,"-af","loudnorm=print_format=json","-f","null","-"],signal,true);
 const lufs=Number(/"input_i"\s*:\s*"(-?[\d.]+)"/.exec(text)?.[1]);
 if(!Number.isFinite(lufs))throw new Error("Не удалось измерить громкость фоновой музыки.");
 return lufs;
}

/** Generate the project's bed to the exact film length, duck it under the narration master and write music-bed.f32.
 *  Arranged (v3) beds first derive their arrangement from the plan and are levelled to −20 LUFS by measurement. */
export async function renderMusicBed(projectDir:string,bed:MusicBed,samples:number,outroStart:number|null,signal?:AbortSignal,story?:{input:Omit<ArrangementInput,"bed"|"seconds">;ffmpeg:string;loop?:boolean}):Promise<MusicBedCue>{
 const info=projectMusicBed(projectDir,bed),raw=path.join(projectDir,MUSIC_SNAPSHOT_DIR,"generated.f32");
 if(!Number.isInteger(samples)||samples<48000||samples>48000*181)throw new Error("Недопустимая длительность фоновой музыки.");
 let arrangement:MusicBedCue["arrangement"],gainDb=info.gainDb;
 if(info.arranged){
  if(!story)throw new Error("Аранжированной подложке нужен план фильма.");
  // v4 (2026-10-21): single-sound accents, rises only where the picture resolves a problem; v3 projects keep rules 1.
  // v5 (2026-10-22) keeps the v4 rules and adds the seamless loop mode (only v5 generators know arrangement.loop).
  if(story.loop&&info.pack!=="background-beds/v5")throw new Error("Петле нужна подложка background-beds/v5.");
  const plan=buildArrangement({...story.input,bed:info.id,seconds:samples/48000},info.pack==="background-beds/v4"||info.pack==="background-beds/v5"?2:1,story.loop?{loop:true}:{}),text=JSON.stringify(plan,null,1),file=path.join(projectDir,MUSIC_SNAPSHOT_DIR,"arrangement.json");
  fs.writeFileSync(file,text);
  await run(process.execPath,[info.generator,info.id,String(samples/48000),file,raw],signal);
  const lufs=await measureLufs(story.ffmpeg,raw,signal);gainDb=Math.max(-12,Math.min(24,-20-lufs));
  arrangement={sha256:hashOf(text),bpm:plan.bpm,cadence:plan.cadence,measuredLufs:lufs,tension:plan.tension,accents:plan.accents,...(plan.loop?{loop:true as const}:{})};
 }else await run(process.execPath,[info.generator,info.id,String(samples/48000),raw],signal);
 const bytes=fs.readFileSync(raw),generated=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 if(generated.length!==samples*2)throw new Error("Генератор фоновой музыки вернул другую длительность.");
 const narration=path.join(projectDir,"narration.wav"),voice=fs.existsSync(narration)?readMonoPcm16(fs.readFileSync(narration)):new Float32Array(0);
 const ducked=duckBed(generated,voice,gainDb,outroStart,info.mix,!!story?.loop);
 if(ducked.some(v=>!Number.isFinite(v)))throw new Error("Фоновая музыка содержит недопустимые значения.");
 const out=Buffer.from(ducked.buffer,ducked.byteOffset,ducked.byteLength),file="music-bed.f32";
 fs.writeFileSync(path.join(projectDir,file),out);fs.rmSync(raw,{force:true});
 return {version:1,pack:info.pack,id:info.id,file,sha256:hashOf(out),samples,gainDb:Math.round(gainDb*100)/100,mix:info.mix,outroStart,...(arrangement?{arrangement}:{})};
}
