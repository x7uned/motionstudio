import {z} from "zod";
import {anchor3dSchema,anchorTime,type Anchor3D} from "./scene3d";

// Declarative motion plan for the netcode film. The director picks WHEN each fixed event happens; the renderer owns geometry.
// Original studio GLBs from data/models: purple player, yellow player, game server. Snapshotted per project.
export const NETCODE_MODELS={you:"a608d46c5ea70e237eb4b8b5",enemy:"abf3f6b1d7940a977309ef2f",server:"0b7e7ce860e329b1acd96799"};
export const NETCODE_EVENTS=["hookRun","hookDeath","rewind","server","pingOut","pingBack","move","serverCopy","enemyCopy","ruler","shot","shotPacket","rollback","hit","damagePacket","death","peek","peekShot","outro"] as const;
export const NETCODE_SHOTS=["hook","server","arena","rollback","peek","outro"] as const;
export type NetcodeEvent=typeof NETCODE_EVENTS[number];
const label=z.string().min(1).max(22);
export const netcodeSchema=z.object({
 version:z.literal(1),
 pingMs:z.number().int().min(5).max(400).nullable(),
 labels:z.object({you:label,server:label,serverCopy:label,enemy:label,enemyCopy:label,rewind:label,hit:label,damage:label,shot:label,peek:label,summary:z.string().min(1).max(32)}),
 ruler:z.array(z.object({label:z.string().min(1).max(18),value:z.string().max(14)})).length(3),
 events:z.array(z.object({kind:z.enum(NETCODE_EVENTS),at:anchor3dSchema})).min(10).max(19),
 camera:z.array(z.object({shot:z.enum(NETCODE_SHOTS),at:anchor3dSchema})).min(3).max(12),
 notes:z.array(z.string().max(300)).max(8),
});
export type NetcodePlan=z.infer<typeof netcodeSchema>;
type Clock={seconds:number;narration?:string}[];
type Alignment={words?:{text:string;start:number;end:number}[]}[];
const word=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
const REQUIRED:NetcodeEvent[]=["hookRun","hookDeath","rewind","server","move","serverCopy","enemyCopy","shot","shotPacket","rollback","hit","damagePacket","death"];

export function validateNetcode(raw:unknown,scenes:Clock,alignment:Alignment=[]):NetcodePlan{
 const plan=netcodeSchema.parse(raw);
 const time=(a:Anchor3D,what:string)=>{
  if(!scenes[a.scene-1])throw new Error(`Netcode: ${what} ссылается на несуществующую главу ${a.scene}.`);
  if(a.cue&&!scenes[a.scene-1].narration?.split(/\s+/).some(s=>word(s)===word(a.cue)))throw new Error(`Netcode: слово «${a.cue}» отсутствует в главе ${a.scene} (${what}).`);
  return anchorTime(a,scenes,alignment);
 };
 const seen=new Set<string>();
 for(const e of plan.events){if(seen.has(e.kind))throw new Error(`Netcode: событие ${e.kind} повторяется.`);seen.add(e.kind);}
 for(const k of REQUIRED)if(!seen.has(k))throw new Error(`Netcode: нет обязательного события ${k}.`);
 if(seen.has("peekShot")!==seen.has("peek"))throw new Error("Netcode: peek и peekShot задаются вместе.");
 const hr=plan.events.find(x=>x.kind==="hookRun")!,hd=plan.events.find(x=>x.kind==="hookDeath")!;
 if(time(hd.at,"hookDeath")-time(hr.at,"hookRun")<1.6)throw new Error("Netcode: в хуке нужно не меньше 1,6 с между началом бега и уроном.");
 if(seen.has("peek")){const p=plan.events.find(x=>x.kind==="peek")!,q=plan.events.find(x=>x.kind==="peekShot")!;if(time(q.at,"peekShot")-time(p.at,"peek")<1.9)throw new Error("Netcode: между peek и peekShot нужно не меньше 1,9 с, чтобы ты успел выйти из-за стены.");}
 if(seen.has("pingBack")&&!seen.has("pingOut"))throw new Error("Netcode: pingBack без pingOut.");
 // Canonical story order keeps the persistent arena causal: no event may precede its cause.
 let previous=-Infinity,prevKind="";
 for(const kind of NETCODE_EVENTS){const e=plan.events.find(x=>x.kind===kind);if(!e)continue;const t=time(e.at,kind);if(t<previous-1e-6)throw new Error(`Netcode: ${kind} раньше, чем ${prevKind}.`);previous=t;prevKind=kind;}
 const total=scenes.reduce((n,s)=>n+s.seconds,0);
 const cams=plan.camera.map(c=>time(c.at,`камера ${c.shot}`));
 if(cams[0]>.05)throw new Error("Netcode: первый ракурс камеры должен начинаться с первого кадра.");
 for(let i=1;i<cams.length;i++)if(cams[i]-cams[i-1]<1.2)throw new Error("Netcode: между ракурсами камеры нужно не меньше 1,2 с.");
 if(cams.at(-1)!>total)throw new Error("Netcode: ракурс за пределами ролика.");
 return plan;
}
export function eventTimes(plan:NetcodePlan,scenes:Clock,alignment:Alignment=[]){
 const out={} as Record<NetcodeEvent,number>;
 for(const k of NETCODE_EVENTS){const e=plan.events.find(x=>x.kind===k);out[k]=e?anchorTime(e.at,scenes,alignment):Infinity;}
 return out;
}
export const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
export const easeOut=(v:number)=>{const t=Math.max(0,Math.min(1,v));return 1-Math.pow(1-t,3);};
export const ramp=(t:number,start:number,dur=.45)=>start===Infinity?0:easeOut((t-start)/dur);
export const pulse=(t:number,start:number,up=.25,hold=.9,down=.5)=>start===Infinity||t<start?0:t<start+up?easeOut((t-start)/up):t<start+up+hold?1:1-easeOut((t-start-up-hold)/down);

// Simulation lags in "game progress" units; the film is an explicit slow-motion model, not real milliseconds.
export const LAG={server:.25,enemy:.6};
export const FREEZE=.95;
export const hookRunEnd=(e:Record<NetcodeEvent,number>)=>Math.max(e.hookRun+1.45,e.hookDeath-.15);
/** Game clock g(t): advances only while the story plays the duel, freezes while the narration explains. */
export function gameClock(t:number,e:Record<NetcodeEvent,number>){
 const seg=(a:number,b:number,from:number,to:number)=>from+(to-from)*ease((t-a)/Math.max(.001,b-a));
 const runEnd=hookRunEnd(e);
 if(t<e.rewind){if(t<e.hookRun)return 0;return seg(e.hookRun,runEnd,0,1.02);}
 if(t<e.move)return seg(e.rewind,Math.min(e.rewind+1.6,e.move),1.02,0);
 const moveEnd=Math.max(e.move+2.5,Math.min(e.shot-.2,e.enemyCopy+4));
 if(t<e.peek)return seg(e.move,moveEnd,0,FREEZE);
 const peekEnd=Math.max(e.peek+1.8,e.peekShot-.1);
 if(t<e.outro)return seg(e.peek,peekEnd,FREEZE,2.0);
 return seg(e.outro,e.outro+2,2.0,2.5);
}
/** Path progress u(g): run into cover, hold, then peek back out. */
export function pathAt(g:number){
 if(g<=0)return 0;if(g<=1)return Math.min(1,g);if(g<=1.3)return 1;if(g<=2)return 1-(g-1.3)/.7*.7;return .3;
}
export const ARENA={start:[-3.4,0,.6] as const,end:[2.4,0,.6] as const,enemy:[1.5,0,-3.2] as const,server:[1.5,3.0,-4.6] as const,wall:{x:[0,3.2],z:[-1,-.3],h:1.7}};
export function pointAt(u:number):[number,number,number]{const [x0,,z0]=ARENA.start,[x1,,z1]=ARENA.end;return [x0+(x1-x0)*u,0,z0+(z1-z0)*u];}
/** Fraction along a→b where the straight line enters the wall footprint, or null if the wall does not block it. */
export function wallEntry(a:readonly number[],b:readonly number[]):number|null{
 const {x,z}=ARENA.wall;let t0=0,t1=1;const dx=b[0]-a[0],dz=b[2]-a[2];
 for(const [p,d,lo,hi] of [[a[0],dx,x[0],x[1]],[a[2],dz,z[0],z[1]]] as const){
  if(Math.abs(d)<1e-9){if(p<lo||p>hi)return null;continue;}
  let s=(lo-p)/d,u=(hi-p)/d;if(s>u)[s,u]=[u,s];t0=Math.max(t0,s);t1=Math.min(t1,u);if(t0>t1)return null;
 }
 return t0;
}
