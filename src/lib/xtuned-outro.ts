import {z} from "zod";
/**
 * @xtuned outro v1: shared by every film kind, renderer-safe (zod only, no node imports).
 * The spoken line is the fixed last sentence of the single continuous narration take; visuals and
 * sounds follow its measured word clock. Every visible change is continuous (sprite frames included).
 */
export const OUTRO_PACK="xtuned-outro/v1" as const;
export const outroLanguageSchema=z.enum(["ru","en"]);
export type OutroLanguage=z.infer<typeof outroLanguageSchema>;
const lineSchema=z.object({
 spoken:z.string().min(10).max(120),question:z.string().min(3).max(48),
 cueWord:z.string().min(2).max(24),brandWord:z.string().min(2).max(24),
 button:z.string().min(2).max(16),done:z.string().min(2).max(16),
 brandHeard:z.array(z.string().min(2).max(32)).min(1).max(12),
});
const soundSchema=z.object({file:z.string().regex(/^sounds\/[a-z0-9-]+\.wav$/),sha256:z.string().regex(/^[a-f0-9]{64}$/),title:z.string().max(80),license:z.string().max(40),attribution:z.string().max(240)});
export const outroPackSchema=z.object({
 pack:z.literal(OUTRO_PACK),username:z.string().regex(/^@[A-Za-z0-9_.-]{1,31}$/),
 character:z.object({pack:z.literal("denis-story/v1"),file:z.literal("spritesheet.png"),sha256:z.string().regex(/^[a-f0-9]{64}$/),cell:z.tuple([z.literal(192),z.literal(208)]),columns:z.literal(8),size:z.tuple([z.literal(1536),z.literal(2080)])}),
 languages:z.object({ru:lineSchema,en:lineSchema}),
 reserveSeconds:z.number().min(3).max(6),tailSeconds:z.number().min(.8).max(2),
 sounds:z.object({click:soundSchema.nullable(),success:soundSchema.nullable()}),
});
export type OutroPack=z.infer<typeof outroPackSchema>;
/** Project profile: the pack is snapshotted once at creation; old projects never gain an outro. */
/**
 * Per-project brand (editor decision 2026-10-20): the same v1 pack (character, button, sounds), only the on-screen
 * handle and the spoken brand change. Kagenami is English-only until its Russian pronunciation is chosen by ear;
 * the EN line and ASR variants are the ones heard correctly in the English bit-flip film (f6b7e8a9).
 * World If Then (editor decision 2026-10-20, @worldifthen_ai, "_ai" never spoken) is English-only too; its question
 * replaces the pack's, and its brand is three spoken words, anchored as one phrase.
 */
export const outroBrandSchema=z.enum(["kagenami","worldifthen"]);
export type OutroBrand=z.infer<typeof outroBrandSchema>;
export const OUTRO_BRANDS:Record<OutroBrand,{username:string;languages:Partial<Record<OutroLanguage,{spoken:string;question?:string;brandWord:string;brandHeard:string[]}>>}>={
 kagenami:{username:"@kagenami_ai",languages:{en:{spoken:"Want more breakdowns like this? Follow Kagenami.",brandWord:"Kagenami",brandHeard:["kagenami","kage nami","kaganami","kagenomi","kaginami"]}}},
 worldifthen:{username:"@worldifthen_ai",languages:{en:{spoken:"Want to know more? Follow World If Then.",question:"Want to know more?",brandWord:"World If Then",brandHeard:["world if then","worldifthen","world if them","world of then","world if than","world if den"]}}},
};
export const profileOutroSchema=z.object({pack:z.literal(OUTRO_PACK),sha256:z.string().regex(/^[a-f0-9]{64}$/),language:outroLanguageSchema,brand:outroBrandSchema.optional()});
/** Storyboard: what the renderer and the cue sheet need, frozen into the plan. */
export const creatorOutroSchema=z.object({
 version:z.literal(1),pack:z.literal(OUTRO_PACK),sha256:z.string().regex(/^[a-f0-9]{64}$/),language:outroLanguageSchema,
 sceneId:z.string().regex(/^scene-\d+$/),username:z.string().regex(/^@[A-Za-z0-9_.-]{1,31}$/),
 spoken:z.string().min(10).max(120),question:z.string().min(3).max(48),cueWord:z.string().min(2).max(24),brandWord:z.string().min(2).max(24),
 button:z.string().min(2).max(16),done:z.string().min(2).max(16),brandHeard:z.array(z.string().min(2).max(32)).min(1).max(12),
 sheet:z.string().regex(/^[a-f0-9-]{36}\/branding\/xtuned-outro-v1\/spritesheet\.png$/),
 tailSeconds:z.number().min(.8).max(2),
});
export type CreatorOutro=z.infer<typeof creatorOutroSchema>;

export const OUTRO_SHEET={columns:8,cell:[192,208] as const,size:[1536,2080] as const};
const STATES={idle:{row:0,frames:7,fps:3},wave:{row:1,frames:4,fps:4},point:{row:4,frames:6,fps:4},happy:{row:9,frames:6,fps:4}} as const;
export type OutroPose=keyof typeof STATES;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const smooth=(v:number)=>{const x=clamp(v);return x*x*(3-2*x);};
const plain=(s:string)=>s.toLocaleLowerCase().replace(/ё/g,"е").replace(/[^\p{L}\p{N}]+/gu,"");
type Word={text:string;start:number;end:number};

/** A brand of several spoken words ("World If Then"): the last word of its last occurrence, joined over 1–3 words. */
function phraseEnd(words:Word[],phrase:string){
 const target=plain(phrase);
 for(let i=words.length-1;i>=0;i--)for(let k=1;k<=3&&i+k<=words.length;k++){
  const joined=words.slice(i,i+k).map(w=>plain(w.text)).join("");
  if(joined===target)return words[i+k-1];
  if(!target.startsWith(joined))break;
 }
 return undefined;
}
/** Measured anchors. Without a voice track the times fall back to fixed proportions of the scene. */
export function outroAnchors(o:Pick<CreatorOutro,"cueWord"|"brandWord"|"tailSeconds">,start:number,end:number,words:Word[]=[]){
 const cue=words.find(w=>plain(w.text)===plain(o.cueWord)),brand=o.brandWord.includes(" ")?phraseEnd(words,o.brandWord):[...words].reverse().find(w=>plain(w.text).startsWith(plain(o.brandWord)));
 const cueAt=cue?.start??start+(end-start)*.45,brandEnd=brand?.end??Math.max(cueAt+.6,end-o.tailSeconds);
 // Press right after the brand word: the click never masks "xtuned" and feedback follows the press.
 const pressAt=Math.max(start+.9,Math.min(brandEnd+.12,end-.75)),flipAt=pressAt+.04;
 return {start,end,cueAt,brandEnd,pressAt,flipAt,measured:!!(cue&&brand)};
}
export type OutroAnchors=ReturnType<typeof outroAnchors>;

/**
 * Sprite layers in draw order. Frame swaps inside a pose and pose changes (0.3 s) are both continuous: the
 * incoming layer fades in over the first half of the window (2 video frames for a frame swap) while the outgoing
 * one is still opaque, then the outgoing one fades over the second half. Coverage never dips (no flicker) and no
 * layer changes by more than 0.5 per frame.
 */
export const FRAME_BLEND_SECONDS=4/30, POSE_BLEND_SECONDS=.3;
function stack(p:number){return {bottom:1-clamp(2*(p-.5)),top:clamp(2*p)};}
function poseLayers(pose:OutroPose,elapsed:number){
 const s=STATES[pose],period=2*(s.frames-1),tick=Math.max(0,elapsed)*s.fps,i=Math.floor(tick),f=tick-i,w=FRAME_BLEND_SECONDS*s.fps;
 const frame=(k:number)=>{const ph=k%period;return ph<s.frames?ph:period-ph;};
 if(f<=1-w||frame(i)===frame(i+1))return [{row:s.row,frame:frame(i),opacity:1}];
 const {bottom,top}=stack((f-(1-w))/w);
 return [{row:s.row,frame:frame(i),opacity:bottom},{row:s.row,frame:frame(i+1),opacity:top}];
}
export function outroPoseKeys(a:OutroAnchors):{start:number;pose:OutroPose}[]{
 return [{start:a.start,pose:"wave"},{start:Math.max(a.start+.9,a.cueAt-.35),pose:"point"},{start:a.flipAt,pose:"happy"}];
}
export function outroSpriteLayers(t:number,keys:{start:number;pose:OutroPose}[]){
 let i=0;for(let k=1;k<keys.length;k++){if(keys[k].start>t)break;i=k;}
 // While two poses blend, both hold their frames: only the pose weights move, never two blends at once.
 const elapsed=(k:number,at:number)=>at-keys[k].start-(k?POSE_BLEND_SECONDS:0);
 const p=(t-keys[i].start)/POSE_BLEND_SECONDS,current=poseLayers(keys[i].pose,elapsed(i,t));
 if(!i||p>=1)return current;
 const {bottom,top}=stack(p);
 return [...poseLayers(keys[i-1].pose,elapsed(i-1,keys[i].start)).map(l=>({...l,opacity:l.opacity*bottom})),...current.map(l=>({...l,opacity:l.opacity*top}))];
}

/** Close to the studio's cubic-bezier(0.16,1,0.3,1) entrance curve. */
export const easeOut=(v:number)=>1-Math.pow(1-clamp(v),4);
/** Every visible property of the outro at time t. Entrances: 0.45 s, scale 0.88→1, rise 18 px; states 0.12–0.5 s. */
export function outroState(t:number,a:OutroAnchors){
 const at=(from:number,len:number)=>smooth((t-from)/len);
 const enter=(from:number)=>{const e=easeOut((t-from)/.45);return {opacity:at(from,.35),scale:.88+.12*e,y:18*(1-e)};};
 const overlay=at(a.start,.8),question=enter(a.start+.15),plate=enter(a.start+.4),button=enter(a.start+.65);
 const character={opacity:at(a.start+.25,.45),y:18*(1-easeOut((t-a.start-.25)/.45))};
 const cursorIn=at(a.cueAt-.2,.3),travel=smooth((t-a.cueAt)/Math.max(.3,a.pressAt-.12-a.cueAt)),cursorOut=at(a.flipAt+.55,.4);
 const down=at(a.pressAt-.1,.12),up=at(a.pressAt+.02,.14),press=down*(1-up);
 const done=at(a.flipAt,.28),glow=at(a.flipAt,.2)*(1-at(a.flipAt+.35,.5));
 return {overlay,question,plate,button,character,buttonPress:1-.06*press,cursor:cursorIn*(1-cursorOut),cursorTravel:travel,cursorPress:press,done,glow};
}
/** Sound anchors: articulation starts on the preceding motion key (press-down), success on the flip. */
export function outroSoundTimes(a:OutroAnchors){return {whoosh:a.start,click:a.pressAt-.1,success:a.flipAt};}

/** Brand check over the ASR words of the outro sentence. A miss is an error, not a note. */
/** Editor-confirmed by ear (2026-10-19): Dennis' «экс-тюнд» ends devoiced (ASR: «Extunt»/«экстюнт»);
 *  his «Кагенами» has a reduced first vowel (ASR: «Когенами»). */
export const EDITOR_BRAND_HEARD=["extunt","экстюнт","экс тюнт","когенами"];
export function outroBrandHeard(heardWords:string[],accepted:string[]){
 const heard=heardWords.slice(-6).map(plain).filter(Boolean);
 const joined=heard.map((_,i)=>[heard[i],heard.slice(i,i+2).join(""),heard.slice(i,i+3).join("")]).flat();
 const ok=[...accepted,...EDITOR_BRAND_HEARD].map(plain).some(x=>joined.includes(x));
 return {ok,heard:heardWords.slice(-6).join(" ")};
}
