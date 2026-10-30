import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {spawn} from "node:child_process";
import {lookup} from "node:dns/promises";
import {isIP} from "node:net";
import type {DatabaseSync} from "node:sqlite";
import {z} from "zod";
import {systemEnv,localTool} from "./platform";

export const OPENVERSE_ENDPOINT="https://api.openverse.org/v1/audio/";
export const SOUND_LICENSES=["cc0","by","pdm"] as const;
export const SOUND_SOURCES=["freesound","jamendo"] as const;
const MAX_BYTES=20*1024*1024;
// Stable semantic types are cache keys: changing query wording never spends another search.
export const EFFECTS={
  "ui-reveal":{query:null,terms:["reveal"]},
  "ui-highlight":{query:null,terms:["highlight"]},
  "ui-connect":{query:null,terms:["connect"]},
  "servo-motor":{query:"servo motor",terms:["servo","motor","mechanical"]},
  "air-release":{query:"compressed air release",terms:["air","hiss","pressure","release"]},
  "fan-start":{query:"electric fan start",terms:["fan","motor","electric"]},
  "soft-whoosh":{query:"short soft whoosh",terms:["whoosh","swoosh","swish"]},
  "game-shot":{query:"laser game shot",terms:["laser","shot","shoot","blaster"]},
  "soft-impact":{query:"soft impact hit",terms:["impact","hit","thud"]},
  "rewind":{query:"short rewind",terms:["rewind","reverse"]},
  // Outro effects come only from the editor-chosen project snapshot; never searched automatically.
  "pixel-click":{query:null,terms:["click"]},
  "chiptune-arpeggio":{query:null,terms:["arpeggio"]},
} as const;
export type EffectType=keyof typeof EFFECTS;
export type SoundCue={at:number;gain:number;kind:string;effect?:EffectType;file?:string;sha256?:string;targetRmsDbFS?:number;peakDbFS?:number;levelScale?:number;fadeInSeconds?:number;fadeOutSeconds?:number;durationSeconds?:number;durationMode?:"stretch"|"loop";playbackRate?:number;automation?:{at:number;value:number}[];sync?:{objectId:string;channel:string;start:number;end:number}};
export type SoundSheet={version:number;clock:string;cues:SoundCue[];backgroundGain?:number;soundPreferences?:unknown;musicBed?:import("./music-beds").MusicBedCue};
export function effectForCue(kind:string):EffectType|undefined {
  return ({reveal:"ui-reveal",highlight:"ui-highlight",connect:"ui-connect","object-enter":"ui-reveal",
    "assembly-cutaway":"servo-motor","assembly-thrust":"air-release","assembly-fan":"fan-start",
    "assembly-lift":"soft-whoosh",shot:"game-shot",peekShot:"game-shot",hit:"soft-impact",rollback:"rewind"} as Record<string,EffectType>)[kind];
}
const resultSchema=z.object({
  id:z.string().regex(/^[a-zA-Z0-9-]{1,100}$/),title:z.string().nullish(),url:z.string().url(),
  license:z.enum(SOUND_LICENSES),source:z.enum(SOUND_SOURCES),attribution:z.string().min(1),
  foreign_landing_url:z.string().nullish(),creator:z.string().nullish(),license_url:z.string().nullish(),
  license_version:z.string().nullish(),provider:z.string().nullish(),filetype:z.string().nullish(),
  duration:z.number().positive().max(30000),filesize:z.number().nonnegative().max(MAX_BYTES).nullish(),
  mature:z.boolean().nullish(),tags:z.array(z.object({name:z.string()})).optional(),
}).passthrough();
type Result=z.infer<typeof resultSchema>;
export type SoundAsset={type:EffectType;origin:"local"|"openverse";file:string;sha256:string;attribution:string;result?:Result};
type Options={
  search?:(url:string,signal?:AbortSignal)=>Promise<unknown>;
  download?:(url:string,file:string,signal?:AbortSignal)=>Promise<void>;
  convert?:(source:string,wav:string,signal?:AbortSignal)=>Promise<void>;
  ffmpeg?:string;now?:()=>Date;
};
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
export function validEffectWav(bytes:Buffer){
  if(bytes.length<44||bytes.length>300_000||bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WAVE")return false;
  let format=false,data=false;
  for(let i=12;i+8<=bytes.length;){const size=bytes.readUInt32LE(i+4),end=i+8+size;if(end>bytes.length)return false;
    if(bytes.toString("ascii",i,i+4)==="fmt "&&size>=16)format=bytes.readUInt16LE(i+8)===1&&bytes.readUInt16LE(i+10)===1&&bytes.readUInt32LE(i+12)===48000&&bytes.readUInt16LE(i+22)===16;
    if(bytes.toString("ascii",i,i+4)==="data")data=size>=96&&size<=288000&&size%2===0;
    i=end+(size%2);
  }return format&&data;
}
function contained(root:string,file:string){
  const full=path.resolve(root,file);if(!full.startsWith(path.resolve(root)+path.sep))throw new Error("Небезопасный путь эффекта.");return full;
}
function appendCredits(file:string,attribution:string){
  if(!attribution)return;
  const old=fs.existsSync(file)?fs.readFileSync(file,"utf8"):"";
  if(!old.includes(attribution))fs.appendFileSync(file,(old&&!old.endsWith("\n")?"\n":"")+attribution+"\n","utf8");
}
async function atomicJSON(file:string,value:unknown){
  const tmp=file+`.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  await fsp.writeFile(tmp,JSON.stringify(value,null,2));await fsp.rename(tmp,file);
}
/** No shell, inherited credentials, proxy variables or user curl config. */
async function execute(command:string,args:string[],signal?:AbortSignal){
  if(signal?.aborted)throw new Error("Остановлено.");
  await new Promise<void>((resolve,reject)=>{
    const p=spawn(command,args,{env:{...systemEnv(),PATH:process.platform==="win32"?String(process.env.Path??process.env.PATH??""):"/usr/bin:/bin",LANG:"C",NODE_ENV:process.env.NODE_ENV||"production"},stdio:["ignore","ignore","pipe"],signal,timeout:45000,windowsHide:true});
    let stderr="";p.stderr.on("data",b=>{stderr=(stderr+b).slice(-1500);});
    p.on("error",reject);p.on("close",code=>code===0?resolve():reject(new Error(`${path.basename(command)}: ${code}; ${stderr}`)));
  });
}
export function isPublicAddress(ip:string){
  if(isIP(ip)===4){const [a,b]=ip.split(".").map(Number);return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&[0,168].includes(b))||(a===100&&b>=64&&b<=127)||(a===198&&[18,19,51].includes(b))||(a===203&&b===0));}
  // Accept global unicast IPv6 only; disallow IPv4 mappings and documentation blocks.
  return isIP(ip)===6&&/^[23]/i.test(ip)&&!/^2001:(db8|0:|10:|20:)/i.test(ip);
}
export async function publicAudioURL(raw:string){
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443")||isIP(url.hostname)||url.hostname.endsWith(".local"))throw new Error("Эффект должен иметь публичный HTTPS URL.");
  const addresses=await lookup(url.hostname,{all:true});
  if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw new Error("Непубличный адрес эффекта.");
  return {url,address:addresses[0]};
}
/** Follow redirects ourselves: validate and pin DNS on every hop, never curl -L into a private network. */
export async function downloadEffect(raw:string,file:string,signal?:AbortSignal){
  let next=raw;const headers=file+".headers";
  try{for(let hop=0;hop<5;hop++){
    const {url,address}=await publicAudioURL(next),ip=address.family===6?`[${address.address}]`:address.address;
    await execute(process.platform==="win32"?path.join(process.env.SystemRoot??"C:\\Windows","System32","curl.exe"):"/usr/bin/curl",["--disable","--silent","--show-error","--fail","--proto","=https","--connect-timeout","10","--max-time","30","--max-filesize",String(MAX_BYTES),"--noproxy","*","--resolve",`${url.hostname}:443:${ip}`,"--dump-header",headers,"--output",file,"--url",url.href],signal);
    const text=await fsp.readFile(headers,"utf8"),status=Number([...text.matchAll(/^HTTP\/\S+ (\d+)/gm)].at(-1)?.[1]);
    if(status>=300&&status<400){const location=[...text.matchAll(/^location:\s*(.+)$/gim)].at(-1)?.[1].trim();if(!location)throw new Error("Редирект без URL.");next=new URL(location,url).href;continue;}
    if(status!==200)throw new Error(`Загрузка эффекта: HTTP ${status}.`);
    const size=(await fsp.stat(file)).size;if(size===0||size>MAX_BYTES)throw new Error("Неверный размер эффекта.");return;
  }throw new Error("Слишком много редиректов эффекта.");}finally{await fsp.rm(headers,{force:true});}
}
async function fetchSearch(url:string,signal?:AbortSignal){
  const response=await fetch(url,{signal:AbortSignal.any([AbortSignal.timeout(25000),...(signal?[signal]:[])]),redirect:"error",headers:{"User-Agent":"MotionStudio/0.1 (local audio effects)",Accept:"application/json"}});
  if(!response.ok)throw new Error(`Openverse HTTP ${response.status}${response.status===429?"; лимит, повтор отключён":""}.`);
  if(Number(response.headers.get("content-length")||0)>2_000_000)throw new Error("Слишком большой ответ Openverse.");
  const text=await response.text();if(text.length>2_000_000)throw new Error("Слишком большой ответ Openverse.");return JSON.parse(text);
}
export function rankedResults(type:EffectType,raw:unknown):Result[]{
  const results=(raw as {results?:unknown[]})?.results;if(!Array.isArray(results))throw new Error("Openverse не вернул список результатов.");
  return results.flatMap((r,i)=>{
    const parsed=resultSchema.safeParse(r);if(!parsed.success)return [];
    const item=parsed.data;if(item.mature||!item.attribution.trim()||new URL(item.url).protocol!=="https:")return [];
    const words=`${item.title||""} ${(item.tags||[]).map(t=>t.name).join(" ")}`.toLowerCase();
    if(/\b(speech|vocals|singing|music|song)\b/.test(words))return [];
    const title=(item.title||"").toLowerCase();
    if(type==="fan-start"&&!words.includes("fan"))return [];
    const matches=EFFECTS[type].terms.filter(t=>words.includes(t)).length;
    const titleScore=EFFECTS[type].terms.filter(t=>title.includes(t)).length*200+(type==="fan-start"&&/\bstart\b/.test(title)?250:0);
    return matches?[{item,score:matches*100+titleScore-i-(item.duration>4000?20:0)}]:[];
  }).sort((a,b)=>b.score-a.score).map(r=>r.item);
}

export class SoundLibrary {
  constructor(readonly root:string,readonly database:DatabaseSync,readonly options:Options={}){
    database.exec(`CREATE TABLE IF NOT EXISTS sound_searches(type TEXT PRIMARY KEY,day TEXT NOT NULL,created TEXT NOT NULL,status TEXT NOT NULL,request TEXT NOT NULL,response TEXT,error TEXT);
      CREATE TABLE IF NOT EXISTS sound_assets(type TEXT PRIMARY KEY,json TEXT NOT NULL);`);
  }
  status(){return {provider:"openverse",endpoint:OPENVERSE_ENDPOINT,anonymous:true,licenses:SOUND_LICENSES,sources:SOUND_SOURCES,dailySearchCeiling:200,
    searches:this.database.prepare("SELECT type,day,status,error FROM sound_searches ORDER BY created").all(),assets:this.database.prepare("SELECT type FROM sound_assets ORDER BY type").all()};}
  private async validAsset(asset:SoundAsset){
    try{const file=contained(this.root,asset.file);if(!(await fsp.realpath(file)).startsWith(path.join(await fsp.realpath(this.root),"sfx")+path.sep))return false;
      const bytes=await fsp.readFile(file);return validEffectWav(bytes)&&hash(bytes)===asset.sha256;}catch{return false;}
  }
  private async local(type:EffectType){
    const saved=this.database.prepare("SELECT json FROM sound_assets WHERE type=?").get(type) as {json:string}|undefined;
    if(saved){const asset=JSON.parse(saved.json) as SoundAsset;if((asset.origin!=="openverse"||rankedResults(type,{results:[asset.result]}).length)&&await this.validAsset(asset))return asset;}
    // An explicit semantic catalog avoids guessing suitability from arbitrary filenames.
    const catalog=await fsp.readFile(path.join(this.root,"sfx/catalog.json"),"utf8").then(JSON.parse).catch(()=>({effects:[]}));
    for(const item of catalog.effects||[])if(item.type===type&&typeof item.file==="string"&&typeof item.attribution==="string"&&["original",...SOUND_LICENSES].includes(item.license)){
      if(!item.file.startsWith("sfx/"))continue;
      const full=contained(this.root,item.file);if(!fs.existsSync(full))continue;
      const asset:SoundAsset={type,origin:"local",file:item.file,sha256:hash(await fsp.readFile(full)),attribution:item.attribution};
      if(await this.validAsset(asset))return asset;
    }
  }
  async resolve(type:EffectType,signal?:AbortSignal):Promise<{asset?:SoundAsset;reason:string}>{
    if(!Object.hasOwn(EFFECTS,type))throw new Error("Неизвестный тип эффекта.");
    const local=await this.local(type);if(local){this.credit(local);return {asset:local,reason:"local"};}
    const query=EFFECTS[type].query;if(!query)return {reason:"existing-procedural"};
    const request=new URL(OPENVERSE_ENDPOINT);request.search=new URLSearchParams({q:query,license:SOUND_LICENSES.join(","),source:SOUND_SOURCES.join(","),page:"1",page_size:"20"}).toString();
    let row=this.database.prepare("SELECT * FROM sound_searches WHERE type=?").get(type) as any;
    if(!row){
      if(signal?.aborted)throw new Error("Остановлено.");
      const now=(this.options.now?.()||new Date()).toISOString(),day=now.slice(0,10);
      if(this.database.prepare("SELECT 1 FROM sound_searches WHERE day=? AND error LIKE '%HTTP 429%' LIMIT 1").get(day))return {reason:"api-rate-limit-cached-until-next-utc-day"};
      // Reservation commits BEFORE the HTTP request. Unknown outcomes are never searched again.
      this.database.exec("BEGIN IMMEDIATE");let reserved=false;
      try{
        const count=(this.database.prepare("SELECT COUNT(*) n FROM sound_searches WHERE day=?").get(day) as {n:number}).n;
        if(count<200)reserved=!!this.database.prepare("INSERT OR IGNORE INTO sound_searches(type,day,created,status,request) VALUES(?,?,?,'reserved',?)").run(type,day,now,request.href).changes;
        this.database.exec("COMMIT");
      }catch(e){this.database.exec("ROLLBACK");throw e;}
      if(!reserved)return {reason:"search-in-progress-or-daily-limit"};
      try{
        const response=await (this.options.search||fetchSearch)(request.href,signal);
        const results=rankedResults(type,response);
        this.database.prepare("UPDATE sound_searches SET status=?,response=? WHERE type=?").run(results.length?"found":"empty",JSON.stringify(response),type);
      }catch(e){
        this.database.prepare("UPDATE sound_searches SET status='error',error=? WHERE type=?").run(e instanceof Error?e.message:"Ошибка поиска",type);
        if(signal?.aborted)throw e;return {reason:"search-error-cached"};
      }
      row=this.database.prepare("SELECT * FROM sound_searches WHERE type=?").get(type);
    }
    if(row.status!=="found")return {reason:`cached-${row.status}`};
    const candidates=rankedResults(type,JSON.parse(row.response));
    // One selected result, no extra searches or blind request retries. A failed download remains visible.
    const selected=candidates[0];if(!selected)return {reason:"no-suitable-result"};
    const dir=path.join(this.root,"sfx/openverse",type);await fsp.mkdir(dir,{recursive:true});
    const temp=await fsp.mkdtemp(path.join(os.tmpdir(),"motion-sfx-")),source=path.join(temp,"source"),wav=path.join(temp,"effect.wav");
    try{
      await (this.options.download||downloadEffect)(selected.url,source,signal);
      if(this.options.convert)await this.options.convert(source,wav,signal);
      else await execute(this.options.ffmpeg||localTool(this.root,"ffmpeg"),["-y","-v","error","-nostdin","-protocol_whitelist","file,pipe","-i",source,"-t","3","-vn","-acodec","pcm_s16le","-ar","48000","-ac","1",wav],signal);
      const bytes=await fsp.readFile(wav);if(!validEffectWav(bytes))throw new Error("Эффект не является коротким PCM16 mono 48kHz WAV.");
      const sha256=hash(bytes),file=path.relative(this.root,path.join(dir,`${selected.id}-${sha256.slice(0,12)}.wav`));
      await fsp.copyFile(wav,contained(this.root,file));
      // Keep the downloaded URL bytes as well as the normalized mixing copy.
      await fsp.copyFile(source,path.join(dir,`${selected.id}.source`));
      const asset:SoundAsset={type,origin:"openverse",file,sha256,attribution:selected.attribution,result:selected};
      await atomicJSON(path.join(dir,`${selected.id}.json`),asset);this.credit(asset);
      this.database.prepare("INSERT OR REPLACE INTO sound_assets(type,json) VALUES(?,?)").run(type,JSON.stringify(asset));
      return {asset,reason:"openverse"};
    }catch(e){
      const message=e instanceof Error?e.message:"Ошибка загрузки";
      this.database.prepare("UPDATE sound_searches SET status='download-error',error=? WHERE type=?").run(message,type);
      if(signal?.aborted)throw e;return {reason:`download-unavailable: ${message}`};
    }
    finally{await fsp.rm(temp,{recursive:true,force:true});}
  }
  private credit(asset:SoundAsset){
    this.database.exec("BEGIN IMMEDIATE");try{appendCredits(path.join(this.root,"credits.txt"),asset.attribution);this.database.exec("COMMIT");}catch(e){this.database.exec("ROLLBACK");throw e;}
  }
  async prepare(sheet:SoundSheet,projectDir:string,signal?:AbortSignal){
    const cues:SoundCue[]=[],assets:SoundAsset[]=[],resolutions:Record<string,string>={},resolved=new Map<EffectType,Awaited<ReturnType<SoundLibrary["resolve"]>>>();
    const previous=await fsp.readFile(path.join(projectDir,"sound-assets.json"),"utf8").then(JSON.parse).catch(()=>({assets:[]}));
    for(const cue of sheet.cues){
      const type=cue.effect||effectForCue(cue.kind);if(!type){cues.push(cue);continue;}
      if(!resolved.has(type)){
        const saved=(previous.assets||[]).find((a:SoundAsset)=>a.type===type) as SoundAsset|undefined;
        let reusable=false;
        if(saved?.file.startsWith("sfx/")&&typeof saved.attribution==="string")try{
          const file=contained(projectDir,saved.file),bytes=await fsp.readFile(file);
          reusable=(await fsp.realpath(file)).startsWith(path.join(await fsp.realpath(projectDir),"sfx")+path.sep)&&validEffectWav(bytes)&&hash(bytes)===saved.sha256;
        }catch{}
        resolved.set(type,reusable?{asset:saved!,reason:"project-snapshot"}:await this.resolve(type,signal));
      }
      const result=resolved.get(type)!;resolutions[type]=result.reason;
      if(!result.asset){cues.push({...cue,effect:type});continue;}
      const asset=result.asset,snapshot=`sfx/${asset.sha256}.wav`;
      await fsp.mkdir(path.join(projectDir,"sfx"),{recursive:true});
      if(result.reason!=="project-snapshot")await fsp.copyFile(contained(this.root,asset.file),path.join(projectDir,snapshot));
      appendCredits(path.join(projectDir,"credits.txt"),asset.attribution);
      if(!assets.some(a=>a.sha256===asset.sha256&&a.type===type))assets.push({...asset,file:snapshot});
      cues.push({...cue,effect:type,file:snapshot,sha256:asset.sha256});
    }
    await atomicJSON(path.join(projectDir,"sound-assets.json"),{version:1,licenses:SOUND_LICENSES,sources:SOUND_SOURCES,resolutions,assets});
    return {...sheet,cues};
  }
}
