import {z} from "zod";

/** Arranged background music (background-beds/v3, user approval 2026-10-20 after the work/vizavi-demo film; v4 2026-10-21).
 *  The arrangement is derived deterministically from the film's own plan: chapters, the director's tone-coded
 *  callouts (warn = damage → tension, ok = recovery → lift), big words and the outro. No extra model call. */
export const BASE_BPM:Record<string,number>={"chip-soft":110,"pluck-curious":90,"glass-arp":100,"lofi-pulse":72,"warm-pad":80,"space-drone":76,"music-box":84};
export const ARRANGED_BEDS=Object.keys(BASE_BPM);
const accentSchema=z.object({at:z.number().min(0),kind:z.enum(["chime","fall","rise","cadence"])});
export const arrangementSchema=z.object({version:z.union([z.literal(1),z.literal(2)]),bed:z.string(),seconds:z.number().positive().max(181),bpm:z.number().min(50).max(140),beatPhase:z.number(),
 grooveFrom:z.number().min(0),cadence:z.number().positive(),fadeEnd:z.number().positive(),chapters:z.array(z.number().min(0)).max(40),
 tension:z.array(z.object({from:z.number(),to:z.number()})).max(12),lifts:z.array(z.number()).max(12),accents:z.array(accentSchema).max(40),
 /** background-beds/v5 loop mode (2026-10-22): whole bars over the film, groove from the first beat, no cadence or fades. */
 loop:z.literal(true).optional()});
export type Arrangement=z.infer<typeof arrangementSchema>;
export type ArrangementInput={bed:string;seconds:number;chapters:{start:number;end:number}[];outroStart:number|null;
 callouts:{at:number;tone:string}[];bigWords:{at:number}[]};
const PRIORITY={cadence:5,fall:4,lift:4,chime:3,rise:2} as const;
export const ACCENT_GAP=2.5;

/** Accent rules. 1 = background-beds/v3 (unchanged). 2 = v4 (user feedback 2026-10-21: a triple "done" chime kept
 *  sounding with no visible reason): a rise only where the picture resolves a problem (ok callout ending a warn tension),
 *  plain ok callouts keep their own UI blip and get no music accent. */
export type ArrangementRules=1|2;
export function buildArrangement(input:ArrangementInput,rules:ArrangementRules=1,opts:{loop?:boolean}={}):Arrangement{
 if(opts.loop)return loopArrangement(input,rules);
 const {bed,seconds}=input,content=input.outroStart??seconds,chapters=input.chapters.filter(c=>c.start<content-.5);
 if(!(bed in BASE_BPM))throw new Error(`Подложка ${bed} не поддерживает аранжировку.`);
 // Groove enters with the second chapter (the hook stays thin), never later than 10 s.
 const grooveFrom=Math.min(chapters[1]?.start??0,10);
 // The cadence resolves on the last content chapter (the payoff line), at least 3 s before the outro takes over.
 const last=chapters.at(-1),cadence=Math.max(grooveFrom+4,Math.min(last&&content-last.start<=9?last.start:content-4.5,content-3));
 // Tempo within ±6 % so that the groove entry and the cadence both land on a downbeat.
 const base=60/BASE_BPM[bed],span=cadence-grooveFrom,beats=Math.max(1,Math.round(span/base)),fit=span/beats;
 const beat=span>2&&Math.abs(fit/base-1)<=.06?fit:base,bpm=60/beat,bar=4*beat;
 const sorted=[...input.callouts].filter(c=>c.at>=0&&c.at<cadence-1).sort((a,b)=>a.at-b.at);
 // Tension: from a warn callout until the next ok callout, the next chapter or 7 s; at least 1.5 s.
 const tension:{from:number;to:number;byOk:boolean}[]=[];
 for(const c of sorted){
  if(c.tone!=="warn"||c.at<grooveFrom||tension.some(s=>c.at>=s.from&&c.at<s.to))continue;
  const ok=sorted.find(x=>x.tone==="ok"&&x.at>c.at+.8),next=chapters.find(ch=>ch.start>c.at+1.5)?.start??Infinity;
  const to=Math.min(ok?.at??Infinity,next,c.at+7,cadence-bar);
  if(to-c.at>=1.5)tension.push({from:c.at,to,byOk:!!ok&&to===ok.at});
 }
 const lifts=tension.filter(s=>s.byOk).map(s=>s.to);
 const candidates:{at:number;kind:"chime"|"fall"|"rise"|"cadence";p:number}[]=[
  {at:cadence,kind:"cadence",p:PRIORITY.cadence},
  ...tension.map(s=>({at:s.from,kind:"fall" as const,p:PRIORITY.fall})),
  ...lifts.map(at=>({at,kind:"rise" as const,p:PRIORITY.lift})),
  ...input.bigWords.filter(b=>b.at<cadence-1).map(b=>({at:b.at,kind:"chime" as const,p:PRIORITY.chime})),
  ...(rules===1?sorted.filter(c=>c.tone==="ok"&&!lifts.includes(c.at)&&!tension.some(s=>c.at>=s.from&&c.at<s.to)).map(c=>({at:c.at,kind:"rise" as const,p:PRIORITY.rise})):[])];
 // One meaningful accent at a time: stronger story moments win, the rest stay quiet (never shifted off their word).
 const kept:typeof candidates=[];
 // A lift answering its own fall may follow it closely: the fall → rise pair is the arrangement's core gesture.
 const gap=(a:typeof candidates[number],b:typeof candidates[number])=>{const [x,y]=a.at<b.at?[a,b]:[b,a];return x.kind==="fall"&&y.kind==="rise"&&y.p===PRIORITY.lift&&tension.some(s=>s.from===x.at&&s.to===y.at)?1.2:ACCENT_GAP;};
 for(const c of [...candidates].sort((a,b)=>b.p-a.p||a.at-b.at))if(!kept.some(k=>Math.abs(k.at-c.at)<gap(k,c)))kept.push(c);
 const r=(v:number)=>Math.round(v*1000)/1000;
 return arrangementSchema.parse({version:rules,bed,seconds:r(seconds),bpm:r(bpm),beatPhase:r(cadence),grooveFrom:r(grooveFrom),cadence:r(cadence),fadeEnd:r(content),
  chapters:chapters.map(c=>r(c.start)),tension:tension.map(s=>({from:r(s.from),to:r(s.to)})),lifts:lifts.map(r),
  accents:kept.sort((a,b)=>a.at-b.at).map(c=>({at:r(c.at),kind:c.kind}))});
}

/** Loop ending (background-beds/v5, 2026-10-22): the film is a whole number of bars at the bed's tempo (fitted, ±6 % for
 *  films of 8+ bars), the groove starts on the first beat, the last bar is the dominant that resolves into the first chord
 *  of the next pass (generator), and there is no cadence: the music never stops at the seam. Tension, lifts and single
 *  accents follow the same story rules as v4 (rules 2). */
function loopArrangement(input:ArrangementInput,rules:ArrangementRules):Arrangement{
 const {bed,seconds}=input;
 if(!(bed in BASE_BPM))throw new Error(`Подложка ${bed} не поддерживает аранжировку.`);
 if(input.outroStart!==null)throw new Error("Петля не совместима с заставкой.");
 const base=60/BASE_BPM[bed],bars=Math.max(1,Math.round(seconds/(4*base))),beat=seconds/(bars*4),bar=4*beat;
 const chapters=input.chapters.filter(c=>c.start<seconds-.5),end=seconds-bar;
 const sorted=[...input.callouts].filter(c=>c.at>=0&&c.at<end-1).sort((a,b)=>a.at-b.at);
 const tension:{from:number;to:number;byOk:boolean}[]=[];
 for(const c of sorted){
  if(c.tone!=="warn"||tension.some(s=>c.at>=s.from&&c.at<s.to))continue;
  const ok=sorted.find(x=>x.tone==="ok"&&x.at>c.at+.8),next=chapters.find(ch=>ch.start>c.at+1.5)?.start??Infinity;
  const to=Math.min(ok?.at??Infinity,next,c.at+7,end);
  if(to-c.at>=1.5)tension.push({from:c.at,to,byOk:!!ok&&to===ok.at});
 }
 const lifts=tension.filter(s=>s.byOk).map(s=>s.to);
 const candidates:{at:number;kind:"chime"|"fall"|"rise";p:number}[]=[
  ...tension.map(s=>({at:s.from,kind:"fall" as const,p:PRIORITY.fall})),
  ...lifts.map(at=>({at,kind:"rise" as const,p:PRIORITY.lift})),
  ...input.bigWords.filter(b=>b.at<end-1).map(b=>({at:b.at,kind:"chime" as const,p:PRIORITY.chime})),
  ...(rules===1?sorted.filter(c=>c.tone==="ok"&&!lifts.includes(c.at)&&!tension.some(s=>c.at>=s.from&&c.at<s.to)).map(c=>({at:c.at,kind:"rise" as const,p:PRIORITY.rise})):[])];
 const kept:typeof candidates=[];
 const gap=(a:typeof candidates[number],b:typeof candidates[number])=>{const [x,y]=a.at<b.at?[a,b]:[b,a];return x.kind==="fall"&&y.kind==="rise"&&y.p===PRIORITY.lift&&tension.some(s=>s.from===x.at&&s.to===y.at)?1.2:ACCENT_GAP;};
 for(const c of [...candidates].sort((a,b)=>b.p-a.p||a.at-b.at))if(!kept.some(k=>Math.abs(k.at-c.at)<gap(k,c)))kept.push(c);
 const r=(v:number)=>Math.round(v*1000)/1000;
 return arrangementSchema.parse({version:rules,bed,seconds:r(seconds),bpm:Math.round(60/beat*1e6)/1e6,beatPhase:0,grooveFrom:0,cadence:r(seconds),fadeEnd:r(seconds),
  chapters:chapters.map(c=>r(c.start)),tension:tension.map(s=>({from:r(s.from),to:r(s.to)})),lifts:lifts.map(r),
  accents:kept.sort((a,b)=>a.at-b.at).map(c=>({at:r(c.at),kind:c.kind})),loop:true});
}
