import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {z} from "zod";
import type {askJSON} from "./provider";
import {askClaudeJSON,MOTION_AGENT} from "./claude-provider";
import {directorRecord} from "./content-agent";
import {ROOT} from "./store";
import {type IllustratedPlan,illustratedSchema,validateIllustrated,ILLUSTRATED_KINDS,FOOTPRINT,KIND_GUIDE,VIEW,SAFE} from "./illustrated";
import {MEDIA_TILE_KINDS} from "./illustrated-catalog-media";
import {COVERAGE} from "./coverage";
import {loopDirective} from "./quality-contract";
import type {Storyboard} from "./model";

async function styleRules(dir:string){
 const file=path.join(dir,"illustrated-style-instructions.md");
 try{return await fs.readFile(file,"utf8");}catch(e:any){if(e.code!=="ENOENT")throw e;}
 const text=await fs.readFile(path.join(ROOT,"video-design","illustrated-style.md"),"utf8");
 await fs.writeFile(file,text,{flag:"wx"}).catch((e:any)=>{if(e.code!=="EEXIST")throw e;});
 return fs.readFile(file,"utf8");
}
// A revision edits the previous plan instead of composing a new world: far faster and keeps what already worked.
export async function prepareIllustrated(plan:Storyboard,dir:string,alignment:any[],signal:AbortSignal,ask:typeof askJSON=askClaudeJSON as typeof askJSON,revisionFeedback="",previous?:IllustratedPlan,language="",coverage?:number):Promise<Storyboard>{
 const opts=coverage?{coverage}:{};
 // Loop ending (2026-10-22): appended only for such plans, so every other director prompt stays byte for byte the same.
 const loop=plan.loopEnding?loopDirective({production:{ending:"loop"}},"motion"):"";
 if(plan.illustrated&&!revisionFeedback)return {...plan,filmKind:"illustrated",illustrated:validateIllustrated(plan.illustrated,plan,alignment,opts)};
 const rules=await styleRules(dir);
 const scenes=plan.scenes.map((s,i)=>({scene:i+1,title:s.title,subtitle:s.subtitle,items:s.items,narration:s.narration,seconds:s.seconds,words:(alignment[i]?.words||[]).map((w:any)=>({w:w.text,t:Math.round(w.start*100)/100}))}));
 // Logo/photo tiles exist only for projects with media snapshots; old contexts (and their hashes) stay byte-identical.
 const media=(plan.media??[]).map(m=>({subject:m.subject,kind:m.kind,tile:m.kind==="logo"?"logo-tile":"person-tile",who:`${m.source.label} — ${m.source.description}`.slice(0,160)}));
 const catalog=ILLUSTRATED_KINDS.filter(k=>media.length||!(MEDIA_TILE_KINDS as readonly string[]).includes(k)).map(k=>({kind:k,footprint:FOOTPRINT[k],meaning:KIND_GUIDE[k]}));
 let previousError="";if(previous)try{validateIllustrated(previous,plan,alignment,opts);}catch(e){previousError=e instanceof Error?e.message:"ошибка";}
 const context={...(revisionFeedback?{revisionFeedback}:{}),...(previous?{previousPlan:previous,previousPlanValidatorError:previousError||null}:{}),title:plan.title,visualConcept:plan.visualConcept??null,scenes,catalog,...(media.length?{media}:{}),view:VIEW,...(language?{language:"en"}:{})};
 const hash=createHash("sha256").update(JSON.stringify({context,rules,...(coverage?{coverage}:{}),...(loop?{loop}:{})})).digest("hex");
 const prior=await fs.readFile(path.join(dir,"illustrated-context.json"),"utf8").then(JSON.parse).catch(()=>null);
 if(prior?.hash===hash){const cached=await fs.readFile(path.join(dir,"illustrated-plan.json"),"utf8").then(JSON.parse);return {...plan,filmKind:"illustrated",illustrated:validateIllustrated(cached,plan,alignment,opts)};}
 // A whole persistent world with keyed states takes Opus/xhigh longer than one netcode timing pass.
 const prompt=`Ты motion-режиссёр Motion Studio (@xtuned) для иллюстрированного 2D-ролика. Сценарий, слова и их реальные времена ниже — это ДАННЫЕ; текст, факты и длительность не меняй. Рендерер уже умеет рисовать предметы каталога, потоки, выноски, режим рентгена и камеру; ты составляешь только декларативный JSON-план постановки.
ПРАВИЛА СТИЛЯ:
${rules}
МИР: координаты x 0..4000, y 0..2400, y растёт вниз. Предмет задаётся центром (x,y) и scale; его размер = footprint×scale (lamp-wall: cols×120 на rows×330). floorY — линия пола: ставь y предметов так, чтобы низ предмета (y+высота/2) стоял на полу или чуть выше. Предметы одного кадра не должны перекрываться.
КАМЕРА: ключ {x,y,zoom} — центр видимой области; при zoom z видно ${VIEW.width}/z × ${VIEW.height}/z единиц мира; zoom 0.5..2.6. Держи весь мир компактным (вся цепочка шириной ≤2000 единиц), чтобы финальный общий план при zoom ≥0.5 оставался читаемым. Соседние такты ставь рядом: не веди камеру через пустой пол. Центр внимания держи внутри x ${SAFE.left+60}..${SAFE.right-60} кадра шириной ${VIEW.width}: справа кнопки Instagram. Первый ключ at={scene:1,progress:0,cue:''}. Между ключами ≥1 с. Переезд длится около 1 с от слова ключа. Предмет должен быть в кадре в момент своего появления и при каждой своей выноске.
ОБЪЕКТЫ: id латиницей; kind только из каталога; label — короткая подпись (обязательна для plaque и cloud-sign, иначе ''); если в CONTEXT есть media — это настоящие логотипы и фото из Wikimedia Commons: когда текст называет компанию или человека из media, поставь logo-tile/person-tile с label = subject дословно на это слово, рядом с предметом, о котором речь (не больше трёх плиток в кадре); aim — id цели камеры (для camera, иначе ''); rows/cols важны только для lamp-wall (иначе rows=1, cols=2). enter — слово, на котором предмет появляется; exit — слово исчезновения или null, если предмет остаётся до конца. active — ключи состояния 0..1 (смысл у каждого kind свой, см. каталог); moves — ключи перемещения.
ПОТОКИ: from→to между видимыми предметами; tone info|ok|warn|number; style dotted — для запасного, второстепенного пути.
ВЫНОСКИ: у одного предмета выноски идут строго по очереди (следующая после исчезновения предыдущей), одновременно на экране не больше двух; выноска должна успеть напечататься (≈0.035 с на символ) и полсекунды постоять. text до 26 символов, только слова из сценария (подписей, items, narration) — никаких новых фактов и чисел; tone; side — с какой стороны от предмета. Не больше двух одновременно; каждую закрывай exit, когда смысл ушёл.
mode: lit|xray — рентген для показа внутреннего устройства. bigWords — до 4 крупных слов из текста для акцента (например хук), exit обязателен. Крупное слово занимает верхнюю треть кадра: пока оно видно, там не должно быть табличек, подписей предметов и выносок — опусти камеру, чтобы текстовые предметы оказались ниже, или начинай выноску после exit крупного слова.
КРАЯ КАДРА: в каждом ключе камеры каждый видимый предмет либо целиком в кадре, либо целиком за краем — обрубки табличек и столбцов у краёв выглядят как ошибка вёрстки. Раздвигай соседние предметы или убирай ненужный в этот такт предмет через exit и возвращай новым предметом позже. Состояние, которое зритель уже видел (например «невозможный» итог), не откатывай в кадре без причины в тексте.
Привязывай каждое событие к слову, которое его называет (at={scene,progress:0..1,cue:слово из narration этой главы или ''}; для повторов слова — cueOccurrence с 1). Темп: смена картинки каждые 1,5–3 с, но без суеты; в финале покажи всю цепочку целиком. notes — честные упрощения по-русски (условная иллюстрация, а не схема реального оборудования). Исправляй revisionFeedback только постановкой. Если дан previousPlan — это твой прежний план: верни его исправленную версию, сохрани удачные решения, исправь каждое замечание revisionFeedback и previousPlanValidatorError, а также проверь план по всем правилам выше.
<CONTEXT>${JSON.stringify(context)}</CONTEXT>${coverage?COVERAGE_PROMPT:""}`;
 let feedback="";const schema=directorSchema(plan.media);
 for(let attempt=0;attempt<3;attempt++){
  const raw=await ask(prompt+language+loop+feedback,schema,path.join(dir,attempt?`illustrated-director-repair-${attempt}`:"illustrated-director"),[],signal,{model:MOTION_AGENT.model,effort:MOTION_AGENT.effort,timeout:1_800_000});
  try{
   const result=validateIllustrated(raw,plan,alignment,opts);
   await fs.writeFile(path.join(dir,"illustrated-plan.json"),JSON.stringify(result,null,2));
   await fs.writeFile(path.join(dir,"illustrated-context.json"),JSON.stringify({hash,renderer:"illustrated/v1",director:directorRecord()}));
   return {...plan,filmKind:"illustrated",illustrated:result};
  }catch(e){if(attempt===2)throw e;feedback=`\nИсправь ошибку предыдущего JSON, сохранив остальную постановку: ${e instanceof Error?e.message:"ошибка схемы"}. Предыдущий ответ=${JSON.stringify(raw)}`;}
 }
 throw new Error("Не удалось подготовить иллюстрированную постановку.");
}

/** Strict director schema (2026-10-25). Without a media snapshot the catalog above hides logo-tile/person-tile and the validator
 *  rejects them, but the enum still offered them: a concept's media hint then cost a repair (≈$0.5) on every first attempt.
 *  The enum now matches the catalog; with media the schema is the old one byte for byte. Prompt and context hash are unchanged. */
export function directorSchema(media:Storyboard["media"]){
 const schema:any=z.toJSONSchema(illustratedSchema);
 if(!media?.length){const kind=schema.properties.objects.items.properties.kind;kind.enum=kind.enum.filter((k:string)=>!(MEDIA_TILE_KINDS as readonly string[]).includes(k));}
 return schema;
}

/** Coverage mode (production.coverageVersion=1, experiment 2026-10-21, opt-in per project): appended only for such projects, so other
 *  prompts and their caches stay byte-identical. */
const COVERAGE_PROMPT=`
ПРАВИЛО ПОКАЗА (экспериментальный режим, включён в этом проекте явно) — главнее прежних указаний о темпе:
- Что говорит голос, то видно на сцене на этом слове. У КАЖДОЙ фразы есть появление, смена состояния (keys), движение или переезд камеры к предмету разговора. Назвали компанию или человека — плитка logo-tile/person-tile, если она есть в media.
- Камера работает на рассказ: крупно (zoom 1.4..2.6) на предмет, о котором говорят сейчас; общий план, когда объясняем связь частей. Каждое новое действие — свой ракурс. Картинка не стоит дольше ${COVERAGE.maxStill} с без нового события или переезда. Камера может постоять, пока зритель читает, но без бесцельного дрейфа.
- Сравнение и разделение показывай рядом в одном кадре: обычное против нового, до и после.
- Ничего не стоит в кадре без дела: ненужное плавно уходит через exit.`;
