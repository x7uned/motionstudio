// Coverage mode (experiment 2026-10-21, opt-in per project via production.coverageVersion=1): what the voice says is shown on the stage on
// its word, and the picture never stands still for long. This module is renderer-agnostic: it reads the measured word
// timestamps and every anchored moment of a director plan (any object with {scene, progress, cue}), so new catalogs are
// covered without being listed here. Pure functions, zod-free.

type Word={text:string;start:number;end:number};
type Scene={id?:string;narration?:string;seconds:number};
export type CoverageSentence={scene:number;from:number;to:number;text:string};
export const COVERAGE={
 /** Longest stretch of narration without any new event or camera move. */
 maxStill:4.5,
 /** Sentences shorter than this (s) may share the previous beat. */
 minSentence:1.4,
 /** An event may lead its sentence by this much (the move starts on the breath before the words). */
 lead:.35,
 /** Isometric close-ups: zoom at or above this counts as a close shot. */
 closeZoom:90,
};

/** Sentences of the measured narration (split at . ! ? and after long pauses), outro scenes excluded. */
export function sentences(scenes:Scene[],alignment:{words?:Word[]}[],skipSceneIds:string[]=[]):CoverageSentence[]{
 const out:CoverageSentence[]=[];
 scenes.forEach((s,i)=>{
  if(s.id&&skipSceneIds.includes(s.id))return;
  const words=(alignment[i]?.words??[]).filter(w=>Number.isFinite(w.start)&&Number.isFinite(w.end));
  let cur:Word[]=[];
  const flush=()=>{if(cur.length)out.push({scene:i+1,from:cur[0].start,to:cur.at(-1)!.end,text:cur.map(w=>w.text).join(" ")});cur=[];};
  words.forEach((w,j)=>{
   if(cur.length&&w.start-cur.at(-1)!.end>.7)flush();
   cur.push(w);
   if(/[.!?]["»”)]?$/.test(w.text.trim())||j===words.length-1)flush();
  });
 });
 return out;
}

/** Every {scene, progress, cue} anchor anywhere in a plan, as seconds (exits and state keys count as visible changes). */
export function anchoredTimes(plan:unknown,at:(a:{scene:number;progress:number;cue:string;cueOccurrence?:number})=>number){
 const times:number[]=[];
 const walk=(v:unknown)=>{
  if(Array.isArray(v)){v.forEach(walk);return;}
  if(!v||typeof v!=="object")return;
  const o=v as Record<string,unknown>;
  if(typeof o.scene==="number"&&typeof o.progress==="number"&&typeof o.cue==="string"){try{const t=at(o as any);if(Number.isFinite(t))times.push(t);}catch{}return;}
  Object.values(o).forEach(walk);
 };
 walk(plan);
 return times.sort((a,b)=>a-b);
}

export type CoverageReport={uncovered:CoverageSentence[];still:{from:number;to:number}[]};
export function coverageReport(sents:CoverageSentence[],events:number[]):CoverageReport{
 const ev=events.filter(Number.isFinite).sort((a,b)=>a-b);
 const uncovered=sents.filter(s=>s.to-s.from>=COVERAGE.minSentence&&!ev.some(t=>t>=s.from-COVERAGE.lead&&t<=s.to));
 const still:{from:number;to:number}[]=[];
 if(sents.length){
  const start=sents[0].from,end=sents.at(-1)!.to;
  const marks=[start,...ev.filter(t=>t>start&&t<end),end];
  for(let i=1;i<marks.length;i++)if(marks[i]-marks[i-1]>COVERAGE.maxStill)still.push({from:marks[i-1],to:marks[i]});
 }
 return {uncovered,still};
}

/** Validator message (Russian, like the other director validators) or "" when the plan covers the narration. */
export function coverageError(report:CoverageReport,label:string){
 const f=(t:number)=>t.toFixed(1).replace(".",",");
 if(report.uncovered.length){
  const s=report.uncovered.slice(0,3).map(x=>`глава ${x.scene}, ${f(x.from)}–${f(x.to)} с: «${x.text.slice(0,90)}»`).join("; ");
  return `${label}: правило показа — у фраз нет действия на сцене (${report.uncovered.length}): ${s}. Поставь на их слова появление, смену состояния, движение или переезд камеры к тому, о чём говорится.`;
 }
 if(report.still.length){
  const s=report.still.slice(0,3).map(x=>`${f(x.from)}–${f(x.to)} с`).join(", ");
  return `${label}: правило показа — картинка стоит дольше ${String(COVERAGE.maxStill).replace(".",",")} с без нового события или переезда камеры (${s}). Добавь действие или плавный переезд к предмету разговора.`;
 }
 return "";
}
