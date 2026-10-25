import {z} from "zod";
import {findCue,cueCount} from "./word-cues";

const id=z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/);
const vec=z.tuple([z.number().min(-100).max(100),z.number().min(-100).max(100),z.number().min(-100).max(100)]);
const color=z.string().regex(/^#[\da-fA-F]{6}$/);
export const anchor3dSchema=z.object({scene:z.number().int().min(1).max(24),progress:z.number().min(0).max(1),cue:z.string().max(32),cueOccurrence:z.number().int().min(1).max(100).optional()});
export const cameraKeySchema=z.object({at:anchor3dSchema,position:vec,target:vec,fov:z.number().min(22).max(75)});
const transform=z.object({at:anchor3dSchema,position:vec,rotation:vec,scale:z.number().min(.01).max(20)});
export const MODEL_KINDS=["sphere","box","cylinder","arrow","torus","phone","server","chip","satellite","globe","moon","asset","assembly"] as const;
const channelSchema=z.array(z.object({at:anchor3dSchema,value:z.number().min(-100).max(100)})).min(1).max(24);
export const object3dSchema=z.object({
 id,model:z.enum(MODEL_KINDS),assetId:z.string().max(40),label:z.string().max(36),
 color,metalness:z.number().min(0).max(1),roughness:z.number().min(.05).max(1),
 enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
 keys:z.array(transform).min(1).max(32),
 animationClip:z.string().max(80),
 labelStyle:z.enum(["none","pin"]).optional(),
 animationWindow:z.object({start:anchor3dSchema,end:anchor3dSchema}).optional(),
 articulation:z.object({cutaway:channelSchema.optional(),thrust:channelSchema.optional(),lift:channelSchema.optional(),fan:channelSchema.optional(),wheels:channelSchema.optional()}).optional(),
});
export const world3dSchema=z.object({
 version:z.literal(1),concept:z.string().min(5).max(500),
 cameraMode:z.enum(["orbit","flythrough","dolly","mixed","static"]),
 camera:z.array(cameraKeySchema).min(2).max(40),
 objects:z.array(object3dSchema).min(1).max(24),
 lighting:z.object({keyPosition:vec,keyColor:color,keyIntensity:z.number().min(.1).max(8),fillIntensity:z.number().min(.1).max(3),rimColor:color}),
 ground:z.boolean(),
 shadows:z.boolean().optional(),
 notes:z.array(z.string().max(300)).max(12),
 referenceShotIds:z.array(z.string().max(80)).max(40),
});
export type World3D=z.infer<typeof world3dSchema>;
export type Anchor3D=z.infer<typeof anchor3dSchema>;
export type Vec3=[number,number,number];
type Clock={seconds:number;narration?:string}[];
type Alignment={words?:{text:string;start:number;end:number}[]}[];
const word=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
export function anchorTime(a:Anchor3D,scenes:Clock,alignment:Alignment=[]){
 const i=a.scene-1,s=scenes[i];if(!s)throw new Error(`3D: нет главы ${a.scene}.`);
 const start=scenes.slice(0,i).reduce((n,s)=>n+s.seconds,0);
 if(a.cueOccurrence&&(!a.cue||cueCount(s.narration||"",a.cue)<a.cueOccurrence))throw new Error("Неверное вхождение слова 3D.");
 if(a.cue){const found=findCue(alignment[i]?.words||[],a.cue,a.cueOccurrence);if(found)return found.start;}
 return start+a.progress*s.seconds;
}
export const smooth3d=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export function sampleKeys<T extends {at:Anchor3D}>(keys:T[],t:number,scenes:Clock,alignment:Alignment=[]):{a:T;b:T;mix:number}{
 const timed=keys.map(k=>({key:k,t:anchorTime(k.at,scenes,alignment)}));
 if(t<=timed[0].t)return {a:keys[0],b:keys[0],mix:0};
 for(let i=1;i<timed.length;i++)if(t<=timed[i].t)return {a:timed[i-1].key,b:timed[i].key,mix:smooth3d((t-timed[i-1].t)/(timed[i].t-timed[i-1].t))};
 return {a:keys.at(-1)!,b:keys.at(-1)!,mix:0};
}
export function mixVec(a:Vec3,b:Vec3,m:number):Vec3{return a.map((v,i)=>v+(b[i]-v)*m) as Vec3;}
export function objectState(o:World3D["objects"][number],t:number,scenes:Clock,alignment:Alignment=[]){
 const {a,b,mix}=sampleKeys(o.keys,t,scenes,alignment);
 const enter=anchorTime(o.enter,scenes,alignment),exit=o.exit?anchorTime(o.exit,scenes,alignment):Infinity;
 const visibility=smooth3d((t-enter)/.5)*(1-smooth3d((t-exit)/.5));
 return {position:mixVec(a.position,b.position,mix),rotation:mixVec(a.rotation,b.rotation,mix),scale:(a.scale+(b.scale-a.scale)*mix)*(.88+.12*visibility),opacity:visibility};
}
export function cameraState(w:World3D,t:number,scenes:Clock,alignment:Alignment=[]){
 const {a,b,mix}=sampleKeys(w.camera,t,scenes,alignment);
 return {position:mixVec(a.position,b.position,mix),target:mixVec(a.target,b.target,mix),fov:a.fov+(b.fov-a.fov)*mix};
}
export function validateWorld3D(raw:unknown,scenes:Clock,assets:string[]=[],alignment:Alignment=[],assemblies:string[]=[]){
 const w=world3dSchema.parse(raw),ids=new Set<string>();
 const time=(a:Anchor3D)=>{if(a.cue&&!scenes[a.scene-1]?.narration?.split(/\s+/).some(s=>word(s)===word(a.cue)))throw new Error(`3D: слово ${a.cue} отсутствует в главе ${a.scene}.`);return anchorTime(a,scenes,alignment);};
 const ordered=(keys:{at:Anchor3D}[])=>{let last=-1;for(const k of keys){const t=time(k.at);if(t<=last)throw new Error("3D: ключи должны идти по времени без повторов.");last=t;}};
 ordered(w.camera);
 if(time(w.camera[0].at)!==0||Math.abs(time(w.camera.at(-1)!.at)-scenes.reduce((n,s)=>n+s.seconds,0))>1/30)throw new Error("3D: камера должна покрывать весь ролик от начала до конца.");
 for(const k of w.camera)if(Math.hypot(...k.position.map((v,i)=>v-k.target[i]))<.5)throw new Error("3D: камера слишком близко к точке взгляда.");
 for(const o of w.objects){
  if(ids.has(o.id))throw new Error("3D: повтор id объекта.");ids.add(o.id);ordered(o.keys);
  if(o.model==="asset"&&!assets.includes(o.assetId))throw new Error(`3D: модель ${o.assetId} не загружена. Добавьте GLB/GLTF или выберите процедурную модель явно.`);
  if(o.model==="assembly"&&!assemblies.includes(o.assetId))throw new Error("3D: детальная сборка не подготовлена или отсутствует в снимке.");
  if(o.model!=="asset"&&o.model!=="assembly"&&(o.assetId||o.animationClip))throw new Error("3D: assetId допустим только для загруженной модели или детальной сборки.");
  if(o.model==="assembly"&&o.animationClip)throw new Error("Детальные сборки используют articulation, не GLB-клипы.");
  if(o.articulation){if(o.model!=="assembly")throw new Error("Articulation требует детальной сборки.");for(const [channel,keys] of Object.entries(o.articulation)){if(!keys)continue;ordered(keys);if(channel!=="wheels"&&keys.some(k=>k.value<0||k.value>1))throw new Error("Канал раскрытия/тяги должен быть в пределах0..1.");}}
  if(o.animationWindow){if(o.model!=="asset"||!o.animationClip)throw new Error("3D: окно анимации требует GLB-клип.");if(time(o.animationWindow.end)<=time(o.animationWindow.start))throw new Error("3D: неверное окно анимации.");}
  const start=time(o.enter);if(o.exit&&time(o.exit)<start+.7)throw new Error("3D: объект исчезает раньше завершения плавного входа.");
 }
 return w;
}

export function articulationState(o:World3D["objects"][number],t:number,scenes:Clock,alignment:Alignment=[]){
 const channel=(name:"cutaway"|"thrust"|"lift"|"fan"|"wheels")=>{const keys=o.articulation?.[name];if(!keys?.length)return 0;const {a,b,mix}=sampleKeys(keys,t,scenes,alignment);return a.value+(b.value-a.value)*mix;};
 const keys=o.articulation?.fan;
 let phase=0;
 if(keys?.length){
  const timed=keys.map(k=>({t:anchorTime(k.at,scenes,alignment),v:k.value})),end=Math.max(0,t);
  phase=Math.min(end,timed[0].t)*timed[0].v;
  for(let i=1;i<timed.length;i++){
   const a=timed[i-1],b=timed[i],span=b.t-a.t,u=Math.max(0,Math.min(1,(end-a.t)/span));
   phase+=span*(a.v*u+(b.v-a.v)*(u**3-.5*u**4));
  }
  phase+=Math.max(0,end-timed.at(-1)!.t)*timed.at(-1)!.v;
 }
 return {cutaway:channel("cutaway"),thrust:channel("thrust"),lift:channel("lift"),fan:channel("fan"),fanAngle:phase*8,wheels:channel("wheels")};
}
export function referenceRenderCapability(analyses:any[],legacyRequires=false){
 const rich=analyses.filter(a=>a?.version===2);
 if(rich.some(a=>["live-action","screen-recording"].includes(a.sceneType)||a.shots?.some((s:any)=>s.reproduction?.method==="video-editing")))return {engine:null,reason:"Нужен монтаж исходного видео. 3D-рендер поддерживает модели, камеру, свет и текст; съёмку и экранные записи он не заменяет."};
 if(rich.some(a=>["3d","mixed"].includes(a.sceneType)||a.shots?.some((s:any)=>["threejs","blender"].includes(s.reproduction?.method))))return {engine:"three" as const,reason:"Доступен 3D-рендер: модели, камера, свет и текст. Точная геометрия из видео не восстанавливается автоматически."};
 if(legacyRequires&&!rich.length)return {engine:null,reason:"Для старого разбора сначала нужен подробный разбор сцен."};
 return {engine:"2d" as const,reason:"Доступен рендер схем и текста."};
}

export function clipProgressAt(o:World3D["objects"][number],t:number,scenes:Clock,alignment:Alignment=[]){
 if(!o.animationWindow)return undefined;const start=anchorTime(o.animationWindow.start,scenes,alignment),end=anchorTime(o.animationWindow.end,scenes,alignment);return Math.max(0,Math.min(1,(t-start)/(end-start)));
}
