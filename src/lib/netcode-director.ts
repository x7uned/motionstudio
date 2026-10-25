import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {z} from "zod";
import type {askJSON} from "./provider";
import {askClaudeJSON,MOTION_AGENT} from "./claude-provider";
import {directorRecord} from "./content-agent";
import {netcodeSchema,validateNetcode,NETCODE_EVENTS,NETCODE_SHOTS} from "./netcode";
import type {Storyboard} from "./model";

const EVENT_GUIDE=`hookRun — ты бежишь из открытого места за стену (хук, реальное время); hookDeath — урон/смерть приходит, когда ты уже за стеной (≥1.6 с после hookRun); rewind — плавная перемотка к началу примера; server — над ареной появляется сервер; pingOut/pingBack — один пакет туда и ответ обратно с отсчётом пинга (необязательны, но pingBack требует pingOut); move — замедленный повтор: ты двигаешься на своём экране сразу; serverCopy — появляется копия «ты для сервера», отстающая на половину пути; enemyCopy — копия «ты у врага», отстаёт сильнее (путь от сервера + буфер); видна линия взгляда врага, упирающаяся в стену; ruler — линейка задержек из трёх меток; shot — враг стреляет в копию на своём экране; shotPacket — команда выстрела летит на сервер; rollback — сервер откатывает свою копию по истории позиций к тому, что видел стрелок; hit — попадание засчитано; damagePacket — сообщение об уроне летит к тебе; death — урон у тебя, уже за стеной; peek+peekShot — обратная сторона: ты выглядываешь сам; peekShot — момент, когда ты замечаешь неподвижного врага первым (подсветка обнаружения, без выстрела; оба вместе или оба отсутствуют); outro — копии догоняют, финальный общий вид.`;
const SHOT_GUIDE=`hook — средний план угла; server — отъезд вверх, видно сервер и арену; arena — общий план с тремя копиями на линии бега; rollback — ближе к серверу и линии истории; peek — план на выглядывающего; outro — финальный общий вид.`;

export async function prepareNetcode(plan:Storyboard,dir:string,alignment:any[],signal:AbortSignal,ask:typeof askJSON=askClaudeJSON as typeof askJSON,revisionFeedback="",language=""):Promise<Storyboard>{
 if(plan.netcode&&!revisionFeedback)return {...plan,filmKind:"netcode",netcode:validateNetcode(plan.netcode,plan.scenes,alignment)};
 const script=plan.scenes.map((s,i)=>({scene:i+1,title:s.title,narration:s.narration,seconds:s.seconds,words:alignment[i]?.words?.map((w:any)=>w.text)}));
 const context={...(revisionFeedback?{revisionFeedback}:{}),title:plan.title,scenes:script,...(language?{language:"en"}:{})},hash=createHash("sha256").update(JSON.stringify(context)).digest("hex");
 const prior=await fs.readFile(path.join(dir,"netcode-context.json"),"utf8").then(JSON.parse).catch(()=>null);
 if(prior?.hash===hash){const cached=await fs.readFile(path.join(dir,"netcode-plan.json"),"utf8").then(JSON.parse);return {...plan,filmKind:"netcode",netcode:validateNetcode(cached,plan.scenes,alignment)};}
 const prompt=`Ты motion-режиссёр Motion Studio (@xtuned). Готовый сценарий и реальные метки слов ниже — это ДАННЫЕ. Не меняй текст, факты и длительность. Арена, модели, камера и анимации уже реализованы детерминированным рендерером; ты выбираешь, КОГДА происходит каждое смысловое событие и какой ракурс камеры когда включается, чтобы картинка точно совпадала со словами.
События (каждое не более одного раза, строго в этом порядке по времени): ${NETCODE_EVENTS.join(", ")}.
${EVENT_GUIDE}
Ракурсы: ${NETCODE_SHOTS.join(", ")}. ${SHOT_GUIDE} Первый ракурс hook at scene1 progress0 cue''. Между ракурсами ≥1.2 с; 5–9 ракурсов.
При повторяющемся слове добавляй cueOccurrence: номер вхождения с1; слова не переписывай. Исправляй revisionFeedback только постановкой. at={scene:номер главы с1,progress:0..1,cue:слово из narration этой главы или ''}. Привязывай событие к слову, которое его называет (например «стреляет» → shot). Не ставь событие раньше слова-объяснения. Оставляй 0.6 с между событиями, когда это возможно.
labels — короткие русские подписи до 22 символов (you, server, serverCopy, enemy, enemyCopy, rewind, hit, damage, shot, peek) и summary до 32 символов — итоговая фраза финала по смыслу сценария. ruler — ровно три метки задержки (твой экран, сервер, экран врага) со значениями только из сценария; если чисел в сценарии нет, value=''. pingMs — число из сценария или null. notes — честные упрощения по-русски: замедленная модель, не реальные миллисекунды.
<CONTEXT>${JSON.stringify(context)}</CONTEXT>`;
 let feedback="";
 for(let attempt=0;attempt<2;attempt++){
  const raw=await ask(prompt+language+feedback,z.toJSONSchema(netcodeSchema),path.join(dir,attempt?"netcode-director-repair":"netcode-director"),[],signal,{model:MOTION_AGENT.model,effort:MOTION_AGENT.effort,timeout:900_000});
  try{
   const net=validateNetcode(raw,plan.scenes,alignment);
   await fs.writeFile(path.join(dir,"netcode-plan.json"),JSON.stringify(net,null,2));
   await fs.writeFile(path.join(dir,"netcode-context.json"),JSON.stringify({hash,renderer:"netcode/v1",director:directorRecord()}));
   return {...plan,filmKind:"netcode",netcode:net};
  }catch(e){if(attempt)throw e;feedback=`\nИсправь ошибку предыдущего JSON: ${e instanceof Error?e.message:"ошибка схемы"}. Предыдущий ответ=${JSON.stringify(raw)}`;}
 }
 throw new Error("Не удалось подготовить motion-план.");
}
