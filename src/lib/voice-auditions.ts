import path from "node:path";
import fs from "node:fs/promises";
import {randomUUID,randomInt} from "node:crypto";
import {z} from "zod";
import {ROOT,DATA,db,enqueue} from "./store";
import {speechEnvironment,run,PYTHON,FFMPEG} from "./provider";
import {safeProviderError} from "./server-secrets";
import {digest,readJSON,writeJSON} from "./quality";
import {voiceProfileSchema} from "./quality-contract";
import {DEFAULT_DELIVERY} from "./voice";

const auditionDir=(id:string)=>{if(!z.string().uuid().safeParse(id).success)throw new Error("Неверный ID сравнения.");return path.join(DATA,"voice-auditions",id);};
async function elevenGET(endpoint:string){const env=await speechEnvironment();if(!env.ELEVENLABS_API_KEY)throw new Error("Не настроен ElevenLabs.");const response=await fetch("https://api.elevenlabs.io"+endpoint,{headers:{"xi-api-key":env.ELEVENLABS_API_KEY},signal:AbortSignal.timeout(30000),cache:"no-store"});if(!response.ok)throw safeProviderError("ElevenLabs",response.status);return response.json();}
export async function voiceCatalog(){
 const env=await speechEnvironment();
 const [models,voices,subscription]=await Promise.allSettled([elevenGET("/v1/models"),elevenGET("/v2/voices?page_size=100&include_total_count=false"),elevenGET("/v1/user/subscription")]);
 return {configuredVoice:env.ELEVENLABS_VOICE_ID,models:models.status==="fulfilled"?models.value.filter((m:any)=>["eleven_multilingual_v2","eleven_v4"].includes(m.model_id)).map((m:any)=>({id:m.model_id,name:m.name,available:m.can_do_text_to_speech===true,creditRate:Number.isFinite(m.model_rates?.character_cost_multiplier)&&Number.isFinite(m.model_rates?.cost_discount_multiplier)?m.model_rates.character_cost_multiplier*m.model_rates.cost_discount_multiplier:null})):[],voices:voices.status==="fulfilled"?voices.value.voices.map((v:any)=>({id:v.voice_id,name:v.name,language:v.labels?.language??"не указан",category:v.category,library:v.category==="premade"||v.sharing?.status==="enabled",rate:v.sharing?.rate??1})):[],credits:subscription.status==="fulfilled"?{used:subscription.value.character_count,limit:subscription.value.character_limit,remaining:Math.max(0,subscription.value.character_limit-subscription.value.character_count)}:null,errors:[models,voices,subscription].flatMap((r,i)=>r.status==="rejected"?[{section:["models","voices","credits"][i],message:r.reason instanceof Error?r.reason.message:"Нет доступа"}]:[])};
}
const quoteSchema=z.object({text:z.string().trim().min(80).max(1700),alternativeVoiceId:z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),rates:z.array(z.number().finite().positive().max(100)).length(3),rateSource:z.string().trim().min(5).max(300)});
export async function quoteAudition(input:unknown){
 const opts=quoteSchema.parse(input),catalog=await voiceCatalog();
 if(!catalog.models.some((m:any)=>m.id==="eleven_v4"&&m.available))throw new Error("Eleven v4 не подтверждён доступным через API. Сравнение не запущено; подмены нет.");
 if(!catalog.configuredVoice||catalog.configuredVoice===opts.alternativeVoiceId||!catalog.voices.some((v:any)=>v.id===opts.alternativeVoiceId&&v.library)||!catalog.voices.some((v:any)=>v.id===catalog.configuredVoice))throw new Error("Нужны текущий голос и другой доступный библиотечный голос.");
 const text=opts.text.replace(/\s+/g," ");if(/[\[\]<>]/.test(text))throw new Error("Для сравнения нужен чистый произносимый текст без тегов.");
 const variants=[{model:"eleven_multilingual_v2",voiceId:catalog.configuredVoice,ttsInput:text},{model:"eleven_v4",voiceId:catalog.configuredVoice,ttsInput:"[curious] "+text},{model:"eleven_v4",voiceId:opts.alternativeVoiceId,ttsInput:"[curious] "+text}].map((v,i)=>{const model=catalog.models.find((m:any)=>m.id===v.model),voice=catalog.voices.find((s:any)=>s.id===v.voiceId);if(!model?.available)throw new Error("Модель недоступна.");const liveRate=model.creditRate===null?null:model.creditRate*Number(voice?.rate);if(liveRate!==null&&opts.rates[i]<liveRate)throw new Error("Ставка ниже текущей оценки API. Обновите доступность и расчёт.");return {...v,name:voice?.name??"Голос",characters:v.ttsInput.length,credits:Math.ceil(v.ttsInput.length*opts.rates[i]),rate:opts.rates[i],liveRate};});
 const total=variants.reduce((n,v)=>n+v.credits,0);
 if(catalog.credits===null)throw new Error("Не удалось проверить доступные кредиты. Платное сравнение не подготовлено.");
 if(total>catalog.credits.remaining)throw new Error("Оценка превышает доступные кредиты. Новые покупки и перерасход не разрешены.");
 const id=randomUUID();const quote={version:2,id,status:"quoted",text,variants,totalCredits:total,rateSource:opts.rateSource,pricingBasis:"Editor-confirmed account rate in credits per input character; estimate, not a billing guarantee",remainingCredits:catalog.credits.remaining,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+15*60_000).toISOString(),maxSuccessfulGenerations:3};
 await writeJSON(path.join(auditionDir(id),"audition.json"),quote);return quote;
}
export async function startAudition(id:string,quoteHash:string){
 const dir=auditionDir(id),state=await readJSON(path.join(dir,"audition.json"));
 if(!state||state.status!=="quoted"||Date.parse(state.expiresAt)<Date.now()||digest(state)!==quoteHash)throw new Error("Оценка изменилась или истекла. Подготовьте сравнение заново.");
 // A synchronous SQLite reservation prevents duplicate clicks from scheduling two experiments.
 const lock=db().prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)").run(`audition:${id}`,"reserved");if(!lock.changes)throw new Error("Сравнение уже запускалось.");
 const shuffled=[0,1,2];for(let i=2;i>0;i--){const j=randomInt(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 await writeJSON(path.join(dir,"audition.json"),{...state,status:"queued",order:shuffled,confirmedAt:new Date().toISOString(),successfulGenerations:0});enqueue(id,"voice-audition");
}
export async function runAudition(id:string,signal:AbortSignal){
 const dir=auditionDir(id);let state=await readJSON(path.join(dir,"audition.json"));if(!state)throw new Error("Сравнение не найдено.");
 for(let i=0;i<3;i++){
  if(signal.aborted)throw new Error("Остановлено.");const variantDir=path.join(dir,`variant-${i}`);await fs.mkdir(variantDir,{recursive:true});
  await writeJSON(path.join(variantDir,"variant.json"),state.variants[i]);
  await writeJSON(path.join(dir,"audition.json"),{...state,status:"running",stage:`Готовим вариант ${i+1} из3`});
  await run(PYTHON,[path.join(ROOT,"scripts/voice-audition.py"),variantDir,FFMPEG],{signal,timeout:240000});
  state={...state,status:"running",successfulGenerations:i+1};await writeJSON(path.join(dir,"audition.json"),state);
 }
 await writeJSON(path.join(dir,"audition.json"),{...state,status:"ready",stage:"Слепое прослушивание",finishedAt:new Date().toISOString()});
}
export async function auditionState(id:string){const state=await readJSON(path.join(auditionDir(id),"audition.json"));if(!state)return null;if(state.status==="quoted")return {...state,quoteHash:digest(state)};const {variants,order,text,...safe}=state;return {...safe,samples:(order||[]).map((index:number,i:number)=>({choice:i,label:`Вариант ${String.fromCharCode(65+i)}`,url:`/api/voice-auditions?id=${id}&sample=${i}`})),...(state.selected!==undefined?{selectedVariant:variants[order[state.selected]]}:{})};}
export async function auditionSample(id:string,choice:number){const state=await readJSON(path.join(auditionDir(id),"audition.json"));if(!state||!["ready","selected"].includes(state.status)||!Number.isInteger(choice)||choice<0||choice>2)throw new Error("Образец недоступен.");return fs.readFile(path.join(auditionDir(id),`variant-${state.order[choice]}/sample.wav`));}
export async function selectAudition(id:string,choice:number){
 const dir=auditionDir(id),state=await readJSON(path.join(dir,"audition.json"));if(!state||state.status!=="ready"||!Number.isInteger(choice)||choice<0||choice>2)throw new Error("Сначала завершите сравнение.");
 const selected=state.variants[state.order[choice]];const profile=voiceProfileSchema.parse({id:`audition-${id}`,voiceId:selected.voiceId,model:selected.model,name:selected.name,delivery:DEFAULT_DELIVERY});
 db().prepare("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)").run("selectedVoiceProfile",JSON.stringify(profile));
 await writeJSON(path.join(dir,"audition.json"),{...state,status:"selected",selected:choice,selectedAt:new Date().toISOString(),selectedBy:"explicit editor action"});return profile;
}
export async function failAudition(id:string,error:string){const dir=auditionDir(id),state=await readJSON(path.join(dir,"audition.json"));if(state)await writeJSON(path.join(dir,"audition.json"),{...state,status:"failed",error:error.slice(0,700)});}
