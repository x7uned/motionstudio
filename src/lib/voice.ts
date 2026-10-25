import path from "node:path";
import fs from "node:fs/promises";
import {z} from "zod";
import type {Project} from "./store";
import {speechEnvironment} from "./provider";
import {structured,roleInstructions} from "./editorial";
import {agentModeOf,contentAgentFor,voiceProfileSchema,voicePlanSchema,projectLanguage,languageDirective,DEFAULT_DELIVERY_EN,type ProjectLanguage} from "./quality-contract";
import {digest,fileHash,readJSON,writeJSON,spokenText} from "./quality";
import {scribe} from "./author-providers";

export const DEFAULT_DELIVERY="Живой русскоязычный рассказчик объясняет знакомому: любопытство, умеренная энергия, смысловые ударения, естественные паузы и уверенный ясный вывод. Без театральности, искусственных вздохов и повторного вступления по главам.";
const directionsSchema=z.object({directions:voicePlanSchema.shape.directions});
export function taggedInput(text:string,directions:{wordIndex:number;tag:string}[]){
 const words=[...text.matchAll(/\S+/g)];const unique=new Map<number,string>();
 for(const d of directions){if(!words[d.wordIndex]||unique.has(d.wordIndex))throw new Error("Неверный или повторный голосовой anchor.");unique.set(d.wordIndex,d.tag);}
 let result=text;
 for(const [index,tag] of [...unique.entries()].sort((a,b)=>b[0]-a[0])){const at=words[index].index!;result=result.slice(0,at)+`[${tag}] `+result.slice(at);}
 return result;
}
/** Editor decision 2026-10-19: Russian voices say the brand as «экс-тюнд»; the written «xtuned» stays on screen and in captions. */
export const PRONUNCIATIONS:Record<ProjectLanguage,{written:string;spoken:string}[]>={ru:[{written:"xtuned",spoken:"экс-тюнд"}],en:[]};
export function pronounce(text:string,language:ProjectLanguage){
 const used=PRONUNCIATIONS[language].filter(r=>new RegExp(`\\b${r.written}\\b`,"i").test(text));
 let out=text;for(const r of used)out=out.replace(new RegExp(`\\b${r.written}\\b`,"gi"),r.spoken);
 // One whitespace-free token per word keeps the voice director's word indices valid for the spoken form.
 if(out.split(/\s+/).length!==text.split(/\s+/).length)throw new Error("Произношение изменило число слов.");
 return {text:out,used};
}
export async function prepareVoicePlan(p:Project,dir:string,signal:AbortSignal){
 if(!p.plan||!p.voice||p.profile.production?.version!==2)return null;
 const text=spokenText(p.plan),env=await speechEnvironment();
 if(/\[[a-z][a-z ]{1,40}\]/i.test(text))throw new Error("Удалите теги подачи из произносимого текста: голосовые указания и субтитры хранятся отдельно.");
 const override=await fs.readFile(path.join(dir,"tts-provider.txt"),"utf8").then(s=>s.trim()).catch(()=>"");
 if((override||env.STUDIO_TTS_PROVIDER||"edge")!=="elevenlabs")throw new Error("Режим качества использует непрерывную озвучку ElevenLabs. Явно настройте ElevenLabs или создайте превью без речи; подмены на озвучку по главам нет.");
 const language=projectLanguage(p.profile),english=language==="en";
 const profile=p.profile.production.voiceProfile??voiceProfileSchema.parse({id:"configured-baseline",voiceId:env.ELEVENLABS_VOICE_ID,model:env.ELEVENLABS_MODEL_ID||"eleven_multilingual_v2",name:"Текущий настроенный голос",delivery:english?DEFAULT_DELIVERY_EN:DEFAULT_DELIVERY});
 const rules=await roleInstructions("voice-director",dir)+languageDirective(p.profile);
 const spoken=pronounce(text,language);
 // Hashes of plans without a pronunciation stay as before, so older projects keep their cached voice plans.
 const inputHash=digest(english?{text,profile,rules,language}:spoken.used.length?{text,profile,rules,pronunciations:spoken.used}:{text,profile,rules});
 const prior=await readJSON(path.join(dir,"voice-plan.json"));
 if(prior?.inputHash===inputHash)return voicePlanSchema.parse(prior);
 const directed=await structured(`${rules}\nНе меняй слова. Верни до4 редких смысловых указаний. wordIndex — номер слова с0 при разбиении plainText пробелами. Нулевая позиция допустима для общего любопытства; остальные — смена причины, механизма и вывода. Подача=${profile.delivery}. PLAIN_TEXT=${JSON.stringify(text)}`,directionsSchema,path.join(dir,"voice-director"),signal,undefined,agentModeOf(p.profile)?contentAgentFor(p.profile):undefined);
 const ttsInput=profile.model==="eleven_v4"?taggedInput(spoken.text,directed.directions):spoken.text;
 if(profile.model==="eleven_v4"&&ttsInput.length>2000)throw new Error("Eleven v4: непрерывный текст превышает проверенный лимит2000символов этого адаптера. Сократите текст или явно выберите v2; автоматической нарезки/подмены нет.");
 const plan=voicePlanSchema.parse({version:2,inputHash,plainText:text,ttsInput,profile,delivery:profile.delivery,directions:directed.directions,preservePauses:true,...(english?{language:"en" as const}:{}),...(spoken.used.length?{pronunciations:spoken.used}:{})});
 await writeJSON(path.join(dir,"voice-plan.json"),plan);return plan;
}
// English joins the spoken brand variants ASR produces ("X tuned", "ex-tuned") so they are not word noise; the brand check reports them.
const BRAND_HEARD=/\b(?:x|ex)[\s.\-‑]*tuned\b/giu;
const tokens=(s:string,language:ProjectLanguage="ru")=>language==="en"?s.replace(/[’']/g,"").replace(BRAND_HEARD,"xtuned").toLocaleLowerCase("en").match(/[\p{L}\p{N}]+/gu)||[]:s.toLocaleLowerCase("ru").replace(/ё/g,"е").match(/[\p{L}\p{N}]+/gu)||[];
/** Each expected "xtuned" must be heard as the brand (xtuned / X tuned / ex-tuned); otherwise listening is required. */
export function brandCheck(expected:string,heard:string){
 const want=(expected.match(/\bxtuned\b/giu)||[]).length,got=(heard.match(BRAND_HEARD)||[]).length; // BRAND_HEARD already includes the joined form "xtuned"/"xTuned"
 return {brand:"xtuned",expected:want,heard:got,ok:got>=want,variants:[...new Set(heard.match(BRAND_HEARD)||[])]};
}
/** Edits identify mismatches; ASR is evidence, not a pronunciation or expressiveness oracle. */
export function transcriptDiff(expected:string,heard:string,language:ProjectLanguage="ru"){
 const a=tokens(expected,language),b=tokens(heard,language);if(a.length>1200||b.length>1600)throw new Error("Слишком длинный транскрипт.");
 const rows=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=0;i<=a.length;i++)rows[i][0]=i;for(let j=0;j<=b.length;j++)rows[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
 const edits:{kind:string;expected:string;heard:string;wordIndex:number}[]=[];let i=a.length,j=b.length;
 while(i||j){if(i&&j&&rows[i][j]===rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){if(a[i-1]!==b[j-1])edits.push({kind:"substitution",expected:a[i-1],heard:b[j-1],wordIndex:j-1});i--;j--;}else if(i&&rows[i][j]===rows[i-1][j]+1){edits.push({kind:"missing",expected:a[i-1],heard:"",wordIndex:Math.max(0,j-1)});i--;}else{edits.push({kind:"extra",expected:"",heard:b[j-1],wordIndex:j-1});j--;}}
 return {expectedWords:a.length,heardWords:b.length,wordErrorRate:rows[a.length][b.length]/Math.max(1,a.length),edits:edits.reverse()};
}
export function audioTextDiff(expected:string,transcript:{text:string;words:{text:string;start:number;end:number}[]},language:ProjectLanguage="ru"){
 const diff=transcriptDiff(expected,transcript.text,language),indices:number[]=[],heard:string[]=[];
 transcript.words.forEach((w,i)=>tokens(w.text,language).forEach(token=>{heard.push(token);indices.push(i);}));
 const timed=JSON.stringify(heard)===JSON.stringify(tokens(transcript.text,language));
 return {...diff,...(language==="en"?{brand:brandCheck(expected,transcript.text)}:{}),edits:diff.edits.map(edit=>({...edit,...(timed&&indices[edit.wordIndex]!==undefined?{at:transcript.words[indices[edit.wordIndex]].start}:{})}))};
}
export async function verifyAudioText(p:Project,dir:string,signal:AbortSignal){
 if(!p.voice||!p.plan)return {version:2,status:"not-applicable",expressivenessChecked:false};
 const audioHash=await fileHash(path.join(dir,"narration.wav"));const expected=spokenText(p.plan),language=projectLanguage(p.profile),key=digest(language==="en"?{audioHash,expected,model:"scribe_v2",diffVersion:2,language}:{audioHash,expected,model:"scribe_v2",diffVersion:2});
 const cache=path.join(dir,`audio-text-${key}.json`),prior=await readJSON(cache);if(prior){await writeJSON(path.join(dir,"audio-text-review.json"),prior);return prior;}
 const pending=path.join(dir,`audio-text-${key}.pending.json`);
 try{
  const rawFile=path.join(dir,`scribe-${audioHash}.json`),recorded=await readJSON(rawFile);
  if(recorded){
   const diff=audioTextDiff(expected,recorded,language);
   const result={version:2,inputHash:key,audioHash,checkedAt:new Date().toISOString(),status:diff.edits.length||diff.brand?.ok===false?"changes":"pass",...diff,transcript:recorded.text,words:recorded.words,expressivenessChecked:false};
   await writeJSON(cache,result);await writeJSON(path.join(dir,"audio-text-review.json"),result);return result;
  }
  if(await fs.access(rawFile).then(()=>true).catch(()=>false))throw new Error("Сохранённый ответ Scribe повреждён. Автоматического платного повтора нет.");
  if(await fs.access(pending).then(()=>true).catch(()=>false))throw new Error("Предыдущий запрос Scribe имеет неизвестный результат. Автоматического платного повтора нет; проверьте историю ElevenLabs.");
  await writeJSON(pending,{startedAt:new Date().toISOString(),audioHash,model:"scribe_v2"});
  // An HTTP rejection (429 after retries, 4xx) means Scribe did not process the audio: no unknown paid result remains.
  const transcript=await scribe(path.join(dir,"narration.wav"),signal,false,language==="en"?"eng":"rus").catch(async e=>{if(e?.rejected)await fs.rm(pending,{force:true});throw e;});
  // Save the successful paid response before diffing or any other fallible processing.
  await writeJSON(path.join(dir,`scribe-${audioHash}.json`),transcript);await fs.rm(pending,{force:true});
  const diff=audioTextDiff(expected,transcript,language);
  const result={version:2,inputHash:key,audioHash,checkedAt:new Date().toISOString(),status:diff.edits.length||diff.brand?.ok===false?"changes":"pass",...diff,transcript:transcript.text,words:transcript.words,expressivenessChecked:false,note:"Расхождения требуют прослушивания: ASR может ошибаться в именах, числах и произношении. Выразительность не оценивалась."};
  await writeJSON(cache,result);await writeJSON(path.join(dir,"audio-text-review.json"),result);return result;
 }catch(e){if(signal.aborted)throw e;const saved=await readJSON(path.join(dir,`scribe-${audioHash}.json`));if(saved){const diff=audioTextDiff(expected,saved,language);const result={version:2,inputHash:key,audioHash,status:diff.edits.length||diff.brand?.ok===false?"changes":"pass",...diff,transcript:saved.text,words:saved.words,expressivenessChecked:false};await writeJSON(cache,result);await writeJSON(path.join(dir,"audio-text-review.json"),result);return result;}const report={version:2,inputHash:key,audioHash,status:"unavailable",error:e instanceof Error?e.message:"Scribe недоступен",expressivenessChecked:false};await writeJSON(path.join(dir,"audio-text-review.json"),report);return report;}
}
