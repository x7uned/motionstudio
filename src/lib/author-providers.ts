import fs from "node:fs/promises";
import {reelLinks} from "./video-reference-model";
import {APIFY_CAP_USD, IMPORT_LIMIT,wordSchema,type Word} from "./author-model";
import {safeProviderError,serverSecrets} from "./server-secrets";
export const ACTOR="apify~instagram-reel-scraper";
export async function apify(path:string,init:RequestInit={},signal?:AbortSignal,token?:string):Promise<any>{
 const key=token||(await serverSecrets()).APIFY_TOKEN;
 if(!key)throw new Error("Подключите API-токен Apify в разделе профилей.");
 const response=await fetch(`https://api.apify.com/v2/${path}`,{...init,headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json",...init.headers},signal:AbortSignal.any([AbortSignal.timeout(45000),...(signal?[signal]:[])])});
 if(!response.ok)throw safeProviderError("Apify",response.status);
 const body=await response.text();if(body.length>8_000_000)throw new Error("Apify: слишком большой ответ.");
 return JSON.parse(body);
}
export async function apifyAccount(token?:string){
 const {data}=await apify("users/me",{},undefined,token);
 const plan=data?.plan;
 const isFree=!!plan&&Number(plan.monthlyBasePriceUsd)===0&&String(plan.tier||plan.id).toUpperCase()==="FREE";
 let remainingUsd:number|null=null;
 if(isFree){const {data:usage}=await apify("users/me/limits",{},undefined,token);const credit=Number(plan.monthlyUsageCreditsUsd);const used=Number(usage?.current?.monthlyUsageUsd);if(Number.isFinite(credit)&&Number.isFinite(used))remainingUsd=Math.max(0,credit-used);}
 return {connected:true,isFree,plan:isFree?"Free":"Другой тариф или тариф не определён",remainingUsd,checkedAt:new Date().toISOString()};
}
export function actorInput(username:string){return {username:[username],resultsLimit:IMPORT_LIMIT,skipPinnedPosts:false,includeSharesCount:false,includeTranscript:false,includeDownloadedVideo:false};}
export async function ensureFreeAccount(){
 const account=await apifyAccount();
 if(!account.isFree)throw new Error("Импорт разрешён только на тарифе Apify Free. Платный тариф автоматически не подключается.");
 if(account.remainingUsd!==null&&account.remainingUsd<.08)throw new Error("Apify: бесплатный баланс почти закончился. Дождитесь обновления лимита.");
 return account;
}
export async function startInstagramRun(username:string,signal:AbortSignal){
 return (await apify(`acts/${ACTOR}/runs?timeout=900&maxTotalChargeUsd=${APIFY_CAP_USD}&restartOnError=false`,{method:"POST",body:JSON.stringify(actorInput(username))},signal)).data;
}

export function videoListInput(links:string[]){return {...actorInput("unused"),username:reelLinks(links),resultsLimit:1};}
export async function startVideoListRun(links:string[],signal:AbortSignal){
 return (await apify(`acts/${ACTOR}/runs?timeout=900&maxTotalChargeUsd=${APIFY_CAP_USD}&restartOnError=false`,{method:"POST",body:JSON.stringify(videoListInput(links))},signal)).data;
}
export function selectedReelItems(items:any[],links:string[]){
 const allowed=new Set(reelLinks(links).map(u=>new URL(u).pathname.split("/")[2]));
 return reelItems(items.filter(item=>{try{return allowed.has(new URL(String(item.url)).pathname.split("/")[2]);}catch{return false;}}));
}

export function mediaUrl(raw:string){
 const u=new URL(raw);
 if(u.protocol!=="https:"||u.username||u.password||u.port||!(["cdninstagram.com","fbcdn.net"].some(d=>u.hostname===d||u.hostname.endsWith(`.${d}`))))throw new Error("Ссылка на видео не принадлежит разрешённому Instagram CDN.");
 return u;
}
export function reelItems(items:any[],username?:string){
 const seen=new Set<string>();const result:{externalId:string;url:string;caption:string;sourceUrl:string}[]=[];
 for(const item of items){
  if(username&&item?.ownerUsername&&String(item.ownerUsername).toLowerCase()!==username)continue;
  const id=String(item?.id||item?.shortCode||"");
  if(!/^[A-Za-z0-9_-]{3,64}$/.test(id)||seen.has(id)||!item?.videoUrl)continue;
  try{
   mediaUrl(String(item.videoUrl));const u=new URL(String(item.url));
   if(u.protocol!=="https:"||!["www.instagram.com","instagram.com"].includes(u.hostname)||!/^\/(reel|p)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname))continue;
   seen.add(id);result.push({externalId:id,url:`https://www.instagram.com${u.pathname}`,caption:String(item.caption||"").slice(0,5000),sourceUrl:String(item.videoUrl)});
   if(result.length===IMPORT_LIMIT)break;
  }catch{}
 }
 return result;
}
export async function downloadReel(raw:string,file:string,signal:AbortSignal){
 let url=mediaUrl(raw);let response:Response|undefined;
 for(let hop=0;hop<4;hop++){
  response=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0","Referer":"https://www.instagram.com/"},redirect:"manual",signal:AbortSignal.any([signal,AbortSignal.timeout(120000)])});
  if([301,302,303,307,308].includes(response.status)){const to=response.headers.get("location");if(!to)throw new Error("Instagram: неверное перенаправление.");url=mediaUrl(new URL(to,url).href);await response.body?.cancel();continue;}break;
 }
 if(!response?.ok||!response.body)throw new Error("Instagram не отдал файл. Ссылка могла истечь или загрузка ограничена.");
 const limit=250*1024*1024;
 if(Number(response.headers.get("content-length")||0)>limit)throw new Error("Ролик больше 250 МБ. Он пропущен.");
 const handle=await fs.open(`${file}.part`,"w");let count=0;
 try{for await(const chunk of response.body as any){count+=chunk.length;if(count>limit)throw new Error("Ролик больше 250 МБ.");await handle.write(chunk);}await handle.close();if(count<100)throw new Error("Instagram вернул пустой файл.");await fs.rename(`${file}.part`,file);return count;}
 catch(e){await handle.close().catch(()=>{});await response.body.cancel().catch(()=>{});await fs.rm(`${file}.part`,{force:true});throw e;}
}
const RETRY_429=new Set(["too_many_concurrent_requests","system_busy","rate_limit_exceeded","concurrent_limit_exceeded"]);
export const SCRIBE_RETRY_MS=[2000,4000,8000,15000,30000];
const abortableDelay=(ms:number,signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{
 if(signal.aborted)return reject(new Error("Остановлено."));
 const timer=setTimeout(()=>{signal.removeEventListener("abort",stop);resolve();},ms);
 const stop=()=>{clearTimeout(timer);reject(new Error("Остановлено."));};
 signal.addEventListener("abort",stop,{once:true});
});
export async function scribe(file:string,signal:AbortSignal,allowEmpty=false,language?:string){
 const key=(await serverSecrets()).ELEVENLABS_API_KEY;
 if(!key)throw new Error("Не настроен ELEVENLABS_API_KEY.");
 if(language&&!/^[a-z]{2,3}$/.test(language))throw new Error("Некорректный код языка Scribe.");
 const audio=await fs.readFile(file);
 const form=new FormData();form.set("file",new Blob([audio]),"audio.wav");form.set("model_id","scribe_v2");form.set("timestamps_granularity","word");form.set("diarize","false");form.set("tag_audio_events","false");if(language)form.set("language_code",language);
 // Parallel engine (2026-10-21): a 429 (concurrency/rate limit) means the request was not processed — retry with
 // backoff instead of a semaphore; every other failure is reported as before. A rejected request is never charged.
 let response:Response;
 for(let attempt=0;;attempt++){
  response=await fetch("https://api.elevenlabs.io/v1/speech-to-text",{method:"POST",headers:{"xi-api-key":key},body:form,signal:AbortSignal.any([signal,AbortSignal.timeout(300000)])});
  if(response.status!==429||attempt>=SCRIBE_RETRY_MS.length)break;
  const detail=await response.json().catch(()=>({}));const status=detail?.detail?.status;
  if(status&&!RETRY_429.has(status))break;
  await abortableDelay(Math.min(60_000,Math.max(Number(response.headers.get("retry-after")||0)*1000,SCRIBE_RETRY_MS[attempt])),signal);
 }
 if(!response.ok)throw Object.assign(safeProviderError("ElevenLabs Scribe",response.status),{rejected:true,httpStatus:response.status});
 const raw=await response.text();if(raw.length>8_000_000)throw new Error("ElevenLabs: слишком большой ответ.");
 const data=JSON.parse(raw);
 const words:Word[]=(Array.isArray(data.words)?data.words:[]).filter((w:any)=>w.type==="word").map((w:any)=>wordSchema.parse({text:w.text,start:w.start,end:w.end}));
 if(typeof data.text!=="string"||(!allowEmpty&&(!words.length||!data.text.trim())))throw new Error("ElevenLabs не обнаружил разборчивую речь.");
 return {provider:"elevenlabs",model:"scribe_v2",language:data.language_code??null,text:data.text.slice(0,100000),words};
}
