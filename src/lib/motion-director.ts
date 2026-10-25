import fs from "node:fs/promises";
import path from "node:path";
import {z} from "zod";
import {askClaudeJSON,MOTION_AGENT} from "./claude-provider";
import {motionAgentFor} from "./content-agent";
import {languageDirective} from "./quality-contract";
import {diagramSchema,visualBeatSchema,type Storyboard,type StyleProfile} from "./model";
import {validateDirectedPlan,type Research} from "./research-model";
import {ROOT} from "./store";
import {digest,readJSON,writeJSON,withoutOutro} from "./quality";
const motionSchema=z.object({scenes:z.array(z.object({id:z.string(),diagram:diagramSchema,beats:z.array(visualBeatSchema).min(2).max(12)})).min(4).max(24)});
/** Scene/node pairs without a same-scene reveal, so a repair can name them instead of repeating the generic contract error. */
/** Prepared 2D vocabulary beyond plain tiles; every field is optional so older plans render unchanged. */
export const DIAGRAM_VOCABULARY="Узел-список/таблица (подсказки, реестр, журнал, записи): у node задай list={columns:[1–3 заголовка колонок<=14 символов, слова из проверенного сценария или визуальной концепции], rows:2–4}; label — короткое название без перечня колонок. Рендер рисует колонки и схематические строки без значений: не придумывай имена, адреса и числа. Тон связи edge.kind: request — вопрос/запрос (фиолетовая со стрелкой к адресату); reply — ответ, referral, результат (жёлтая со стрелкой к получателю); reference — известный/доступный адрес или указатель без передачи сообщения (пунктир). Встречные запрос и ответ между одними узлами — две связи с разными id, рендер разводит их параллельно. highlight на связи утолщает её.";
export function unrevealedNodes(raw:any):string[]{
 if(!Array.isArray(raw?.scenes))return [];
 return raw.scenes.flatMap((s:any)=>{const shown=new Set((s?.beats??[]).filter((b:any)=>b?.action==="reveal").map((b:any)=>b.target));return (s?.diagram?.nodes??[]).filter((n:any)=>!shown.has(n?.id)).map((n:any)=>`${s.id}/${n.id}`);});
}
export async function prepare2D(plan:Storyboard,profile:StyleProfile,dir:string,alignment:any[],signal:AbortSignal,feedback=""):Promise<Storyboard>{
 // The @xtuned outro scene is staged by its own renderer: direct only the film's chapters, then return it unchanged.
 const outro=plan.creatorOutro?plan.scenes.find(s=>s.id===plan.creatorOutro!.sceneId):undefined;
 if(outro){const i=plan.scenes.indexOf(outro),directed=await prepare2D(withoutOutro(plan),profile,dir,alignment.filter((_,k)=>k!==i),signal,feedback);return {...directed,creatorOutro:plan.creatorOutro,scenes:[...directed.scenes,outro]};}
 const rules=(await readJSON(path.join(dir,"quality-instructions.json")))?.motionRules??await fs.readFile(path.join(ROOT,"video-design/MOTION-RULES.md"),"utf8");
 const input={visualConcept:plan.visualConcept,plan:plan.scenes.map(({diagram,beats,...s})=>s),alignment,feedback,rules,policy:profile.production?.policyVersion,model:motionAgentFor(profile),...(languageDirective(profile)?{language:"en"}:{})};
 const hash=digest(input),cached=await readJSON(path.join(dir,"motion-2d.json"));
 const research=await readJSON<Research>(path.join(dir,"research.json"));if(!research)throw new Error("Нет исследования для motion-плана.");
 const apply=(value:unknown)=>{const parsed=motionSchema.parse(value);if(parsed.scenes.length!==plan.scenes.length||parsed.scenes.some((s,i)=>s.id!==plan.scenes[i].id))throw new Error("Motion-план изменил список сцен.");
  const identities=new Map<string,string>();for(const s of parsed.scenes){for(const n of s.diagram.nodes){const identity=JSON.stringify([n.kind,n.label,n.list??null]);if(identities.has(n.id)&&identities.get(n.id)!==identity)throw new Error("Сквозной узел изменил смысл или подпись.");identities.set(n.id,identity);}for(const e of s.diagram.edges){const key=`edge:${e.id}`,identity=JSON.stringify([e.from,e.to,e.kind??null]);if(identities.has(key)&&identities.get(key)!==identity)throw new Error("Сквозная связь изменила концы.");identities.set(key,identity);}}
  return validateDirectedPlan({...plan,scenes:plan.scenes.map((s,i)=>({...s,...parsed.scenes[i]}))},research);};
 if(cached?.hash===hash)return apply(cached.plan);
 const prompt=`Ты motion-режиссёр Claude для существующего 2D-рендерера Motion Studio. Сценарий уже проверен, озвучен и измерен; изменять текст или длительность нельзя. ${rules}\nОдна постоянная система со стабильными id узлов. diagram: сетка2x3, до6nodes и7edges; labels<=24символов, существующие kind. Повторные id сохраняют смысл, list и kind связи. ${DIAGRAM_VOCABULARY} beats: reveal/highlight/hide/connect, at относительно сцены, cue — точное слово narration; cueOccurrence=номер вхождения с1, обязательно у повторяющегося слова. Пустой cue означает резервный at. На каждыйnode нужен reveal, connect толькоedge. Для каждого события description объясняет, какое понимание даёт действие. Не показывай все объекты сразу, не сбрасывай схему по главам. Подписи называй по проверенному сценарию, никаких новых фактов/чисел. Не генерируй код, HTML или CSS. Учти замечания feedback только к изображению. Верни толькоJSON.${languageDirective(profile,"motion")} CONTEXT=${JSON.stringify(input)}`;
 let repair="";
 for(let attempt=0;attempt<2;attempt++){
  const raw=await askClaudeJSON(prompt+repair,z.toJSONSchema(motionSchema),path.join(dir,attempt?"motion-2d-repair":"motion-2d-director"),[],signal,MOTION_AGENT);
  try{const result=apply(raw);await writeJSON(path.join(dir,"motion-2d.json"),{hash,plan:raw,model:motionAgentFor(profile)});return result;}catch(e){if(attempt)throw e;const missing=unrevealedNodes(raw);repair=`\nИсправь контракт: ${e instanceof Error?e.message:"ошибка"}.${missing.length?` В КАЖДОЙ сцене каждый node её diagram должен иметь собственный beat reveal в этой же сцене — и узлы, уже показанные в прошлых главах (рендер оставляет их на месте; добавь reveal at=0, cue=''). Без reveal: ${missing.slice(0,40).join(", ")}.`:""} Previous=${JSON.stringify(raw)}`;}
 }throw new Error("Motion-план 2D не готов.");
}
