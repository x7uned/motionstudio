import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {z} from "zod";
import type {askJSON} from "./provider";
import {askClaudeJSON,MOTION_AGENT} from "./claude-provider";
import {directorRecord} from "./content-agent";
import {ROOT} from "./store";
import {type IsometricPlan,isometricSchema,validateIsometric,MARKER_GUIDE,MARKER_KINDS,AZIMUTH,ZOOM,STREET,BLOCKS,isoLayout} from "./isometric";
import {DISPATCH_GUIDE} from "./isometric-hex";
import type {PortraitLayout,OverlayVersion} from "./illustrated-layout";
import type {Storyboard} from "./model";
import {RING_GUIDE} from "./isometric-wave";
import {SPEEDCAM_GUIDE} from "./isometric-speedcam";
import {TILE_GUIDE} from "./isometric-tiles";
import {COVERAGE} from "./coverage";
import {ZOOM_CLOSE} from "./isometric";

async function styleRules(dir:string){
 const file=path.join(dir,"isometric-style-instructions.md");
 try{return await fs.readFile(file,"utf8");}catch(e:any){if(e.code!=="ENOENT")throw e;}
 const text=await fs.readFile(path.join(ROOT,"video-design","isometric-style.md"),"utf8");
 await fs.writeFile(file,text,{flag:"wx"}).catch((e:any)=>{if(e.code!=="EEXIST")throw e;});
 return fs.readFile(file,"utf8");
}
/**
 * Claude Opus 5.5/xhigh (or, in agent mode, the driving chat agent) stages the measured script in the prepared
 * isometric city. It returns JSON only; the validator (anchors, grounded texts, framing) is the contract. A revision
 * edits the previous plan instead of composing a new city.
 */
export async function prepareIsometric(plan:Storyboard,dir:string,alignment:any[],signal:AbortSignal,ask:typeof askJSON=askClaudeJSON as typeof askJSON,revisionFeedback="",previous?:IsometricPlan,language="",layout?:PortraitLayout,overlay?:OverlayVersion,coverage?:number):Promise<Storyboard>{
 const opts=coverage?{coverage}:{};
 if(plan.isometric&&!revisionFeedback)return {...plan,filmKind:"isometric",isometric:validateIsometric(plan.isometric,plan,alignment,layout,overlay,opts)};
 const rules=await styleRules(dir),F=isoLayout(layout,overlay).focus;
 const scenes=plan.scenes.map((s,i)=>({scene:i+1,title:s.title,subtitle:s.subtitle,items:s.items,narration:s.narration,seconds:s.seconds,words:(alignment[i]?.words||[]).map((w:any)=>({w:w.text,t:Math.round(w.start*100)/100}))}));
 let previousError="";if(previous)try{validateIsometric(structuredClone(previous),plan,alignment,layout,overlay,opts);}catch(e){previousError=e instanceof Error?e.message:"ошибка";}
 const context={...(revisionFeedback?{revisionFeedback}:{}),...(previous?{previousPlan:previous,previousPlanValidatorError:previousError||null}:{}),title:plan.title,visualConcept:plan.visualConcept??null,scenes,markers:MARKER_KINDS.map(k=>({kind:k,meaning:MARKER_GUIDE[k]})),focus:F,...(language?{language:"en"}:{}),...(coverage?{media:(plan.media??[]).map(m=>({subject:m.subject,kind:m.kind}))}:{})};
 const hash=createHash("sha256").update(JSON.stringify({context,rules,renderer:"isometric/v1",...(coverage?{coverage}:{})})).digest("hex");
 const prior=await fs.readFile(path.join(dir,"isometric-context.json"),"utf8").then(JSON.parse).catch(()=>null);
 if(prior?.hash===hash){const cached=await fs.readFile(path.join(dir,"isometric-plan.json"),"utf8").then(JSON.parse);return {...plan,filmKind:"isometric",isometric:validateIsometric(cached,plan,alignment,layout,overlay,opts)};}
 const prompt=`Ты motion-режиссёр Motion Studio для изометрического ролика «Изометрия» (isometric/v1). Сценарий, слова и их реальные времена ниже — это ДАННЫЕ; текст, факты и длительность не меняй. Рендерер уже умеет строить процедурный low-poly город, маршруты, трафик, эстакаду, машины, метки, районы, связи, карточки и ортографическую камеру; ты составляешь только декларативный JSON-план постановки.
ПРАВИЛА СТИЛЯ:
${rules}
ГОРОД: city.seed 1..9999 (вид застройки), skyline low|mixed|tall, parks 0..0.3 (доля парков), traffic 0..1 (фоновые машины на улицах без маршрутов). Кварталы 3×3 с центрами (4·bx, 4·bz), bx,bz ${BLOCKS.min}..${BLOCKS.max}. Улицы между ними: x=4·c+2 и z=4·r+2, c,r ${STREET.min}..${STREET.max}.
МАРШРУТЫ: waypoints — перекрёстки {c,r}: первая точка — старт, последняя — финиш, между ними только точки поворота; соседние точки лежат на одной улице (общий c или общий r), без диагоналей, прямых продолжений и разворотов. deckLeg — номер прямого участка (между точками k и k+1, не короче двух кварталов), который поднимается эстакадой, или -1. draw — слово, с которого маршрут прорисовывается (длится 1,2–3,2 с). traffic — перекраска участка маршрута [from,to] (доли длины 0..1) в состояние free|slow|jam на слове at; jam ставит очередь машин; снятие — новый участок free позже. Не больше 4 маршрутов, держи их компактными (вся история в квадрате ~30×30 единиц).
МАШИНЫ: vehicle едет по своему маршруту от старта; enter — появление на старте, go — слово, на котором трогается; tone hero — лавандовая машина героя.
МЕТКИ: kind из списка markers; на маршруте — route=id, u 0..1 (доля длины), bx=bz=0; на квартале — route='', bx/bz (tower и hub только на квартале, один квартал — одна метка, кроме pin). text — короткая подпись до 22 символов только словами проверенного сценария (pin требует text; для остальных '' — без таблички). tone info|ok|warn|number. active — ключи 0..1 (сила сигнала вышки, свет здания, пульс инцидента).
РАЙОНЫ: districts — центр bx/bz, radius 1..4 квартала, keys — смена света окон normal|lit|dark|warn на словах.
СВЯЗИ: links — дуга между двумя метками (from/to — id меток) с бегущими пакетами, tone; enter/exit.
КАРТОЧКИ: cards — плашка под полосками глав, одна за раз (следующая появляется после exit предыдущей). label — до 22 символов, unit — до 8 (или ''), icon pin|clock|car|signal|bolt|box, route — id маршрута для столбиков трафика или ''. keys — значения (целые 0..999, только числа, которые цифрами есть в сценарии), tone цвета числа, note — короткая пометка до 10 символов из текста или ''. Первое значение показывается с появления карточки, следующие прокручиваются.
КАМЕРА: ключ {at,x,z,zoom ${ZOOM.min}..${ZOOM.max},azimuth ${AZIMUTH.min}..${AZIMUTH.max}}: x,z — точка города в центре кадра (y центра кадра ≈ 960). При zoom 44 в ширину кадра помещается ≈25 единиц (6 кварталов). Первый ключ at={scene:1,progress:0,cue:''}. Между ключами ≥1 с. В момент появления каждой метки, старта машины и окончания прорисовки маршрута эти точки должны быть в зоне x ${F.left}..${F.right}, y ${F.top}..${F.bottom} кадра (валидатор проверит и сам слегка подвинет камеру; если не получается — ошибка с координатами). Экранная проекция: точка (x,0,z) смещается вправо на (dx·cos az − dz·sin az)·zoom и вниз на (dx·sin az + dz·cos az)·0,577·zoom от центра кадра, где dx,dz — смещение от цели камеры.
${DISPATCH_GUIDE}
КОЛЬЦО (необязательно, поле rings): ${RING_GUIDE}
${SPEEDCAM_GUIDE}
Привязывай каждое событие к слову, которое его называет (at={scene,progress:0..1,cue:слово из narration этой главы или ''}; для повторов слова — cueOccurrence с 1). Темп: смена картинки каждые 1,5–3 с, без суеты; финал — общий план. Всё, что появилось, видно не меньше 0,6 с; маршрут живёт не меньше времени прорисовки + 0,6 с. notes — честные упрощения по-русски (условный город, не масштаб, не реальная карта). Исправляй revisionFeedback только постановкой. Если дан previousPlan — это твой прежний план: верни его исправленную версию, сохрани удачные решения, исправь каждое замечание revisionFeedback и previousPlanValidatorError.
<CONTEXT>${JSON.stringify(context)}</CONTEXT>${coverage?COVERAGE_PROMPT:""}`;
 let feedback="";
 for(let attempt=0;attempt<3;attempt++){
  const raw=await ask(prompt+language+feedback,z.toJSONSchema(isometricSchema),path.join(dir,attempt?`isometric-director-repair-${attempt}`:"isometric-director"),[],signal,{model:MOTION_AGENT.model,effort:MOTION_AGENT.effort,timeout:1_800_000});
  try{
   const result=validateIsometric(raw,plan,alignment,layout,overlay,opts);
   await fs.writeFile(path.join(dir,"isometric-plan.json"),JSON.stringify(result,null,2));
   await fs.writeFile(path.join(dir,"isometric-context.json"),JSON.stringify({hash,renderer:"isometric/v1",director:directorRecord()}));
   return {...plan,filmKind:"isometric",isometric:result};
  }catch(e){if(attempt===2)throw e;feedback=`\nИсправь ошибку предыдущего JSON, сохранив остальную постановку: ${e instanceof Error?e.message:"ошибка схемы"}. Предыдущий ответ=${JSON.stringify(raw)}`;}
 }
 throw new Error("Не удалось подготовить изометрическую постановку.");
}

/** Coverage mode (production.coverageVersion=1, experiment 2026-10-21, opt-in per project): appended only for such projects, so other
 *  prompts and their caches stay byte-identical. */
const COVERAGE_PROMPT=`
ПРАВИЛО ПОКАЗА (экспериментальный режим, включён в этом проекте явно) — главнее прежних указаний о темпе и о zoom ${ZOOM.min}..${ZOOM.max}:
- Что говорит голос, то видно на сцене на этом слове. У КАЖДОЙ фразы есть появление, смена состояния, движение или переезд камеры к предмету разговора. Назвали страну — флаг, компанию — логотип (поле tiles), «машины» — машины едут, «считывает номер» — вспышка и номер крупно.
- Камера работает на рассказ: крупный план (zoom ${COVERAGE.closeZoom}..${ZOOM_CLOSE}) на то, о чём говорят сейчас — машина, камера, номер, плитка; общий план (zoom 30..55), когда объясняем связь частей. Каждое новое действие — свой ракурс. Картинка не стоит дольше ${COVERAGE.maxStill} с без нового события или переезда. Камера может постоять, пока зритель читает, но без бесцельного дрейфа. Не меньше 3 ключей с zoom ≥ ${COVERAGE.closeZoom}. При zoom 120 в ширину кадра помещается ≈ 9 единиц (два квартала).
- Сравнение и разделение показывай рядом в одном кадре: обычное против нового, короткое против длинного, до и после.
- Ничего не стоит в кадре без дела: ненужное плавно уходит через exit.
${TILE_GUIDE}`;
