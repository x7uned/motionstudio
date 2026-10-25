import {z} from "zod";
import {anchor3dSchema,anchorTime,type Anchor3D} from "./scene3d";
import {corpus,grounded} from "./illustrated";
import {illustratedLayout,type PortraitLayout,type OverlayVersion} from "./illustrated-layout";
import {ringSchema,ringGuardPoints,ringLegs,ringTimeline,ringScalars,validateRings,ringFocusPoints,ringTexts,ringStoryEvents,ringEventTimes} from "./isometric-wave";
import {dispatchSchema,dispatchTimeline,dispatchScalars,validateDispatch,dispatchTexts,dispatchGuardPoints,dispatchFocus,dispatchStoryEvents,dispatchEventTimes,riverCut} from "./isometric-hex";
import {speedcamSchema,speedcamTimeline,speedcamScalars,validateSpeedcam,speedcamTexts,speedcamGuardPoints,speedcamFocus,speedcamStoryEvents,speedcamEventTimes} from "./isometric-speedcam";
import {tileSchema} from "./isometric-tiles";
import {sentences,anchoredTimes,coverageReport,coverageError,COVERAGE} from "./coverage";
import {findMedia,type MediaAsset} from "./media-contract";

// isometric/v1 — the style sample «Изометрия» (renderer/style-lab/iso-city) as a prepared production renderer.
// One persistent low-poly city for the whole film: the director (Claude Opus 5.5 or the driving chat agent) only
// returns this JSON — routes on the street grid, prepared markers, district light states, links, screen cards and
// orthographic camera keys, every one anchored to a measured word. The city layout, the occlusion guard and all motion
// are pure functions of the plan and the frame time: hashes instead of randomness, no generated code, no remote assets.
// Renderer-safe: zod and pure math only.

export const FPS=30;
/** True isometric elevation (camera looks along (1,1,1) at azimuth 45°): atan(1/√2) = 35.264°. */
export const ELEV=Math.atan(1/Math.SQRT2);
export const AZIMUTH={min:39,max:51};
export const ZOOM={min:28,max:72};
/** Coverage mode (production.coverageVersion=1, experiment 2026-10-21, opt-in): close-ups on the subject up to this zoom. */
export const ZOOM_CLOSE=150;
export const TARGET_Y=.4;
export const CAMERA_DISTANCE=80;
export const CANVAS={width:1080,height:1920};
/** Street indices c/r map to x=4c+2, z=4r+2; block indices bx/bz to block centres 4bx, 4bz. */
export const STREET={min:-7,max:6};
export const BLOCKS={min:-7,max:7};
export const streetAt=(i:number)=>4*i+2;
export const CORNER=.9,DECK_H=1.35,DECK_W=.98;
export const MARKER_KINDS=["pin","beacon","tower","hub","alert"] as const;
export type MarkerKind=typeof MARKER_KINDS[number];
export const MARKER_GUIDE:Record<MarkerKind,string>={
 pin:"метка на карте: точка на земле и табличка с text над ней (text обязателен). Тон рамки — tone. Для «сейчас/старт/цель/здесь» и подписей мест",
 beacon:"точка назначения: жёлтое кольцо на земле, расходящиеся пульсы и световой столб; text — необязательная табличка над столбом",
 tower:"вышка связи на квартале (только bx/bz): решётчатая мачта с огнём; active 0..1 — сила сигнала: от вершины расходятся кольца, active 0 — тишина",
 hub:"выделенное здание на квартале (только bx/bz): склад, дата-центр, магазин, станция — широкий корпус с фиолетовым контуром крыши; active 0..1 — свет окон и сияние крыши",
 alert:"инцидент: розовый ромб над точкой и пульсирующее кольцо на земле (авария, сбой, перекрытие); active 0..1 — частота и яркость пульса",
};
const id=z.string().regex(/^[a-z][a-z0-9-]{0,23}$/);
const tone=z.enum(["info","ok","warn","number"]);
const block=z.number().int().min(BLOCKS.min).max(BLOCKS.max);
const streetIndex=z.number().int().min(STREET.min).max(STREET.max);
/** Upper limits leave room for explicit long films (up to 180 s); short plans are unaffected. */
export const isometricSchema=z.object({
 version:z.literal(1),
 concept:z.string().min(5).max(400),
 city:z.object({
  seed:z.number().int().min(1).max(9999),
  skyline:z.enum(["low","mixed","tall"]),
  parks:z.number().min(0).max(.3),
  traffic:z.number().min(0).max(1),
 }),
 routes:z.array(z.object({
  id,
  waypoints:z.array(z.object({c:streetIndex,r:streetIndex})).min(2).max(8),
  /** Index of one straight leg (waypoint k → k+1) that climbs onto an elevated deck; -1 = none. */
  deckLeg:z.number().int().min(-1).max(6),
  style:z.enum(["main","alt"]),
  draw:anchor3dSchema,exit:anchor3dSchema.nullable(),
  traffic:z.array(z.object({at:anchor3dSchema,from:z.number().min(0).max(1),to:z.number().min(0).max(1),state:z.enum(["free","slow","jam"])})).max(8),
 })).max(4),
 vehicles:z.array(z.object({id,route:id,tone:z.enum(["hero","plain"]),enter:anchor3dSchema,go:anchor3dSchema,exit:anchor3dSchema.nullable()})).max(4),
 markers:z.array(z.object({
  id,kind:z.enum(MARKER_KINDS),
  /** route!=='' places the marker on that route at fraction u; otherwise at the centre of block bx/bz. */
  route:z.string().max(24),u:z.number().min(0).max(1),bx:block,bz:block,
  text:z.string().max(22),tone,
  enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
  active:z.array(z.object({at:anchor3dSchema,value:z.number().min(0).max(1)})).max(10),
 })).max(16),
 districts:z.array(z.object({id,bx:block,bz:block,radius:z.number().int().min(1).max(4),
  keys:z.array(z.object({at:anchor3dSchema,state:z.enum(["normal","lit","dark","warn"])})).min(1).max(8)})).max(4),
 links:z.array(z.object({from:id,to:id,tone,enter:anchor3dSchema,exit:anchor3dSchema.nullable()})).max(8),
 cards:z.array(z.object({id,label:z.string().min(1).max(22),unit:z.string().max(8),icon:z.enum(["pin","clock","car","signal","bolt","box"]),
  /** Optional mini bars coloured by the traffic of this route ('' = none). */
  route:z.string().max(24),
  enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
  keys:z.array(z.object({at:anchor3dSchema,value:z.number().int().min(0).max(999),tone,note:z.string().max(10)})).min(1).max(6)})).max(4),
 camera:z.array(z.object({at:anchor3dSchema,x:z.number().min(-28).max(28),z:z.number().min(-28).max(28),zoom:z.number().min(ZOOM.min).max(ZOOM_CLOSE),azimuth:z.number().min(AZIMUTH.min).max(AZIMUTH.max)})).min(1).max(40),
 notes:z.array(z.string().max(300)).max(8),
 /** Optional ring roads with backward braking waves (src/lib/isometric-wave.ts, phantom jam); absent in older plans. */
 rings:z.array(ringSchema).max(2).optional(),
 /** Optional dispatch catalog (src/lib/isometric-hex.ts): hexagon grid, river, one-way streets, drivers, lines. Absent/null — none. */
 dispatch:dispatchSchema.nullable().optional(),
 /** Optional road-enforcement catalog (src/lib/isometric-speedcam.ts): ANPR gantries, pole cameras, sections, driven cars, flows, speed trace. Absent/null — none. */
 speedcam:speedcamSchema.nullable().optional(),
 /** Optional real logo / flag / portrait tiles from the project media snapshot (src/lib/isometric-tiles.ts). Absent — none. */
 tiles:z.array(tileSchema).max(8).optional(),
});
export type IsometricPlan=z.infer<typeof isometricSchema>;
type Clock={seconds:number;narration?:string;title?:string;subtitle?:string;items?:string[]}[];
type Alignment={words?:{text:string;start:number;end:number}[]}[];
export type V3=[number,number,number];
type V2=[number,number];

// ---- Pure math -----------------------------------------------------------------------------------------------
const fract=(v:number)=>v-Math.floor(v);
export const rnd=(n:number)=>fract(Math.sin(n*127.1+311.7)*43758.5453);
const r2=(a:number,b:number,k=0)=>rnd(a*92.17+b*31.73+k*17.31+.5);
export const clamp01=(x:number)=>Math.min(1,Math.max(0,x));
export const smooth=(x:number)=>{const t=clamp01(x);return t*t*(3-2*t);};
export const sineOut=(x:number)=>Math.sin(Math.PI/2*clamp01(x));
/** CSS cubic-bezier easing (Newton steps with a bisection fallback); pure, renderer- and node-safe. */
export function bezier(x1:number,y1:number,x2:number,y2:number){
 const f=(t:number,a:number,b:number)=>((1-3*b+3*a)*t+(3*b-6*a))*t*t+3*a*t,d=(t:number,a:number,b:number)=>3*(1-3*b+3*a)*t*t+2*(3*b-6*a)*t+3*a;
 return (x:number)=>{
  if(x<=0)return 0;if(x>=1)return 1;
  let t=x;for(let i=0;i<8;i++){const s=d(t,x1,x2);if(Math.abs(s)<1e-6)break;t-=(f(t,x1,x2)-x)/s;}
  if(!(t>=0&&t<=1)||Math.abs(f(t,x1,x2)-x)>1e-6){let lo=0,hi=1;t=x;for(let i=0;i<50;i++){const v=f(t,x1,x2);if(Math.abs(v-x)<1e-7)break;if(v<x)lo=t;else hi=t;t=(lo+hi)/2;}}
  return f(t,y1,y2);
 };
}
export const easeOut=bezier(.16,1,.3,1);
export const easeInOut=bezier(.65,0,.35,1);
/** Entrances of visible things: cubic ease-out (start slope 3, not the bezier's 6), so even the first frame of a
 *  0.35 s entrance shows under a third of the change. */
export const easeEnter=(x:number)=>1-(1-clamp01(x))**3;
export const tween=(t:number,a:number,b:number,ease:(x:number)=>number=easeOut)=>ease(clamp01((t-a)/(b-a)));
/** Visibility of something shown from enterAt to exitAt: eased in and out, never a one-frame switch. */
export const shown=(t:number,enterAt:number,exitAt:number,inDur=.45,outDur=.45)=>(t<enterAt?0:easeEnter((t-enterAt)/inDur))*(exitAt===Infinity?1:1-easeInOut(clamp01((t-exitAt)/outDur)));

// ---- Camera ------------------------------------------------------------------------------------------------------
export type IsoPose={x:number;z:number;zoom:number;az:number};
export function cameraPosition(p:IsoPose):V3{
 const az=p.az*Math.PI/180,d=CAMERA_DISTANCE;
 return [p.x+d*Math.cos(ELEV)*Math.sin(az),TARGET_Y+d*Math.sin(ELEV),p.z+d*Math.cos(ELEV)*Math.cos(az)];
}
/** Orthographic projection with the renderer's camera (frustum = canvas size / zoom, up = +Y). */
export function project(p:V3|readonly number[],pose:IsoPose,w=CANVAS.width,h=CANVAS.height){
 const az=pose.az*Math.PI/180,se=Math.sin(ELEV),ce=Math.cos(ELEV);
 const dx=p[0]-pose.x,dy=p[1]-TARGET_Y,dz=p[2]-pose.z;
 return {x:w/2+(dx*Math.cos(az)-dz*Math.sin(az))*pose.zoom,y:h/2-(-dx*se*Math.sin(az)+dy*ce-dz*se*Math.cos(az))*pose.zoom};
}
/** Camera keys ease into each other; a longer travel takes longer and still lands before the next key. */
export function cameraAt(t:number,keys:{at:number;pose:IsoPose}[]):IsoPose{
 if(!keys.length)return {x:0,z:0,zoom:44,az:45};
 let pose=keys[0].pose;
 for(let i=1;i<keys.length;i++){const k=keys[i];if(t<k.at)break;
  const travel=Math.hypot(k.pose.x-pose.x,k.pose.z-pose.z)/10+Math.abs(k.pose.zoom-pose.zoom)/25+Math.abs(k.pose.az-pose.az)/8;
  const dur=Math.max(.9,Math.min(.9+travel,2.4,(keys[i+1]?.at??Infinity)-k.at-.1)),m=easeInOut(clamp01((t-k.at)/dur));
  pose={x:pose.x+(k.pose.x-pose.x)*m,z:pose.z+(k.pose.z-pose.z)*m,zoom:pose.zoom+(k.pose.zoom-pose.zoom)*m,az:pose.az+(k.pose.az-pose.az)*m};}
 return pose;
}
/** Pose the camera settles into for time t: the latest key at or before t. */
export function poseAt(t:number,keys:{at:number;pose:IsoPose}[]){let pose=keys[0]?.pose??{x:0,z:0,zoom:44,az:45};for(const k of keys){if(k.at>t)break;pose=k.pose;}return pose;}

// ---- Layout ------------------------------------------------------------------------------------------------------
/** The studio header/captions of illustrated films plus the screen card under the chapter bars (iso-city: y426).
 *  Overlay v2 (editor decision 2026-10-21): no chapter bars and no chapter label — the card moves up under the title
 *  and the focus area reaches down to the captions.
 *  Overlay v3 (user decision 2026-10-22): no header — the card takes the old header row (below TikTok's tabs) and
 *  labels may rise to it. labelsTop = the highest screen y for marker/media labels when no card is shown. */
export function isoLayout(layout?:PortraitLayout,overlay?:OverlayVersion){
 const l=illustratedLayout(layout,overlay),card=l.bare?l.header:l.chrome?l.progress+42:l.title+54,cardHeight=124;
 const labelsTop=l.bare?l.header:l.chrome?l.progress+24:l.title+46;
 return {...l,card,cardHeight,labelsTop,focus:{left:150,right:866,top:card+cardHeight+50,bottom:(l.chrome?l.chapter:l.captions)-44}};
}

// ---- Routes ------------------------------------------------------------------------------------------------------
export type RoutePath={P:V3[];S:number[];L:number;deck:{from:number;to:number}|null;legs:{axis:"x"|"z";c:number;lo:number;hi:number}[]};
export function routePath(r:{waypoints:{c:number;r:number}[];deckLeg:number}):RoutePath{
 const way=r.waypoints.map(p=>[streetAt(p.c),streetAt(p.r)] as V2);
 const pts:V2[]=[];
 const push=(p:V2)=>{const l=pts.at(-1);if(!l||Math.hypot(p[0]-l[0],p[1]-l[1])>1e-6)pts.push(p);};
 const line=(a:V2,b:V2)=>{const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.08));for(let i=0;i<=n;i++)push([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]);};
 const unit=(a:V2,b:V2):V2=>{const l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l];};
 let cur=way[0];
 for(let i=1;i<way.length;i++){
  const p=way[i];
  if(i===way.length-1){line(cur,p);break;}
  const din=unit(way[i-1],p),dout=unit(p,way[i+1]);
  const a:V2=[p[0]-din[0]*CORNER,p[1]-din[1]*CORNER],b:V2=[p[0]+dout[0]*CORNER,p[1]+dout[1]*CORNER];
  line(cur,a);
  for(let k=1;k<=14;k++){const u=k/14;push([(1-u)**2*a[0]+2*(1-u)*u*p[0]+u*u*b[0],(1-u)**2*a[1]+2*(1-u)*u*p[1]+u*u*b[1]]);}
  cur=b;
 }
 const leg=r.deckLeg>=0&&r.deckLeg<way.length-1?[way[r.deckLeg],way[r.deckLeg+1]] as const:null;
 // The deck climbs 1.2→3.2 units after the leg's first corner and descends symmetrically before the last one.
 const lift=([x,z]:V2)=>{
  if(!leg)return 0;const [a,b]=leg,len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const onX=Math.abs(a[0]-b[0])<1e-6;
  if(onX?Math.abs(x-a[0])>1e-6:Math.abs(z-a[1])>1e-6)return 0;
  const d=onX?(z-a[1])*Math.sign(b[1]-a[1]):(x-a[0])*Math.sign(b[0]-a[0]);
  if(d<0||d>len)return 0;
  return DECK_H*smooth((d-1.2)/2)*smooth((len-1.2-d)/2);
 };
 const P=pts.map(p=>[p[0],lift(p),p[1]] as V3);
 const S=[0];
 for(let i=1;i<P.length;i++)S.push(S[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1],P[i][2]-P[i-1][2]));
 let deck:RoutePath["deck"]=null;
 for(let i=0;i<P.length;i++)if(P[i][1]>1e-4){deck=deck?{from:deck.from,to:S[i]}:{from:S[Math.max(0,i-1)],to:S[i]};}
 const legs=way.slice(1).map((b,i)=>{const a=way[i];return Math.abs(a[0]-b[0])<1e-6?{axis:"z" as const,c:a[0],lo:Math.min(a[1],b[1]),hi:Math.max(a[1],b[1])}:{axis:"x" as const,c:a[1],lo:Math.min(a[0],b[0]),hi:Math.max(a[0],b[0])};});
 return {P,S,L:S.at(-1)!,deck,legs};
}
export function posAt(r:RoutePath,s:number):V3{
 const {P,S,L}=r,v=Math.min(L,Math.max(0,s));
 let lo=0,hi=S.length-1;
 while(hi-lo>1){const m=(lo+hi)>>1;if(S[m]<=v)lo=m;else hi=m;}
 const f=(v-S[lo])/Math.max(1e-9,S[hi]-S[lo]);
 return [P[lo][0]+(P[hi][0]-P[lo][0])*f,P[lo][1]+(P[hi][1]-P[lo][1])*f,P[lo][2]+(P[hi][2]-P[lo][2])*f];
}
/** Position plus yaw (around +Y, forward = local +X), pitch and the unit side vector on the ground. */
export function along(r:RoutePath,s:number){
 const p=posAt(r,s),a=posAt(r,s-.12),b=posAt(r,s+.12);
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],hz=Math.hypot(dx,dz)||1e-9;
 return {p,yaw:Math.atan2(-dz,dx),pitch:Math.atan2(dy,hz),side:[-dz/hz,dx/hz] as V2};
}
export const drawSeconds=(L:number)=>Math.max(1.2,Math.min(3.2,.9+L/9));
const sweepSeconds=(len:number)=>Math.max(1.2,Math.min(2.6,1+len/5));

// ---- City --------------------------------------------------------------------------------------------------------
export type Building={x:number;z:number;w:number;d:number;h:number;hb:number;tw:number;td:number;color:string;delay:number};
export type Roof={b:number;x:number;z:number;s:number;h:number};
export type Window={b:number;x:number;y:number;z:number;len:number;face:"x"|"z";color:string};
export type Plate={x:number;z:number;park:boolean;plaza:boolean};
export type Tree={x:number;z:number;s:number;delay:number};
export type Dash={x:number;z:number;axis:"x"|"z"};
export type Car={axis:"x"|"z";c:number;dir:1|-1;min:number;len:number;o:number;v:number;color:string};
export type Hub={id:string;x:number;z:number;w:number;h:number};
const BUILDING_COLORS=["#2A2536","#252131","#302A3D","#211C2C","#383145","#2D2738"];
const CAR_COLORS=["#3A3346","#2C2D28","#4A4060","#FDFEED","#8D59DA","#F4CA50","#3A3346","#E0CDF8"];
const SKYLINE={low:{tall:.06,tallH:1.2,base:.75},mixed:{tall:.24,tallH:1.9,base:.95},tall:{tall:.42,tallH:2.6,base:1.1}};
/** Height above the ground at which a marker must stay visible (occlusion guard) and where its tag is anchored. */
export const MARKER_TOP:Record<MarkerKind,number>={pin:.55,beacon:1.45,tower:3.1,hub:1.6,alert:1.25};
export type GuardRay=[number,number];
/** A point P is hidden behind a lot when the ray P + a·(√2·sin az, 1, √2·cos az) (towards the camera) passes the
 *  lot's footprint below its roof. Returns the highest roof that hides none of the guard points. */
export function occlusionCap(x0:number,x1:number,z0:number,z1:number,points:V3[],rays:GuardRay[],m=.22){
 let cap=Infinity;
 for(const [dx,dz] of rays)for(const p of points){
  const tx=dx?[(x0-m-p[0])/dx,(x1+m-p[0])/dx]:p[0]>=x0-m&&p[0]<=x1+m?[-Infinity,Infinity]:[Infinity,-Infinity];
  const tz=dz?[(z0-m-p[2])/dz,(z1+m-p[2])/dz]:p[2]>=z0-m&&p[2]<=z1+m?[-Infinity,Infinity]:[Infinity,-Infinity];
  const lo=Math.max(0,Math.min(tx[0],tx[1]),Math.min(tz[0],tz[1])),hi=Math.min(Math.max(tx[0],tx[1]),Math.max(tz[0],tz[1]));
  if(lo<=hi)cap=Math.min(cap,p[1]+lo);
 }
 return cap;
}
export function guardRays(azimuths:number[]):GuardRay[]{
 const lo=Math.min(...azimuths)-3,hi=Math.max(...azimuths)+3,n=Math.max(2,Math.ceil((hi-lo)/3));
 // Every key azimuth exactly, plus a ≤3° sweep covering the travels between keys (the 0.22 margin covers the rest).
 // cot(35.264°) = √2: per unit of height the ray towards the camera moves √2 on the ground.
 const all=[...new Set([...azimuths,...Array.from({length:n+1},(_,i)=>lo+(hi-lo)*i/n)])];
 return all.map(d=>{const a=d*Math.PI/180;return [Math.SQRT2*Math.sin(a),Math.SQRT2*Math.cos(a)] as GuardRay;});
}
export function markerPoint(m:{route:string;u:number;bx:number;bz:number},routes:Map<string,RoutePath>):V3{
 const r=m.route?routes.get(m.route):undefined;
 return r?posAt(r,m.u*r.L):[4*m.bx,0,4*m.bz];
}

/** The whole city of one plan: deterministic layout limited to what any camera key can see, with the occlusion guard. */
export function isoWorld(plan:IsometricPlan){
 const routes=new Map(plan.routes.map(r=>[r.id,routePath(r)]));
 const poses=plan.camera.map(c=>({x:c.x,z:c.z,zoom:c.zoom,az:c.azimuth}));
 // Mid-poses cover the frames a camera travel passes through between two keys.
 const sampled=poses.flatMap((p,i)=>i?[0.25,.5,.75,1].map(k=>({x:poses[i-1].x+(p.x-poses[i-1].x)*k,z:poses[i-1].z+(p.z-poses[i-1].z)*k,zoom:poses[i-1].zoom+(p.zoom-poses[i-1].zoom)*k,az:poses[i-1].az+(p.az-poses[i-1].az)*k})):[p]);
 const inView=(x:number,z:number,margin:number)=>sampled.some(p=>[0,3].some(y=>{const s=project([x,y,z],p),m=margin*p.zoom;return s.x>-m&&s.x<CANVAS.width+m&&s.y>-m&&s.y<CANVAS.height+m;}));
 const reserved=new Set(plan.markers.filter(m=>!m.route).map(m=>`${m.bx},${m.bz}`));
 const points:V3[]=[];
 for(const r of routes.values())for(let s=0;s<=r.L;s+=.3){const {p,side}=along(r,s);for(const o of [-.45,0,.45])points.push([p[0]+side[0]*o,p[1],p[2]+side[1]*o]);}
 for(const m of plan.markers){const p=markerPoint(m,routes);for(let y=0;y<=MARKER_TOP[m.kind]+1e-9;y+=.25)points.push([p[0],p[1]+y,p[2]]);}
 points.push(...ringGuardPoints(plan.rings));
 points.push(...dispatchGuardPoints(plan.dispatch,routes));
 points.push(...speedcamGuardPoints(plan.speedcam,routes));
 // Dispatch catalog: a river replaces one block row; streets cross it only on bridges (absent = the city is unchanged).
 const river=riverCut(plan.dispatch);
 const rays=guardRays(poses.map(p=>p.az));
 const seed=plan.city.seed,sky=SKYLINE[plan.city.skyline];
 const first=poses[0];
 const delayAt=(x:number,z:number,j:number)=>.04+.72*clamp01(Math.hypot(x-first.x,z-first.z)/26)+.08*j;
 const buildings:Building[]=[],roofs:Roof[]=[],windows:Window[]=[],plates:Plate[]=[],trees:Tree[]=[],dashes:Dash[]=[],hubs:Hub[]=[];
 let capped=0;
 for(let i=-9;i<=9;i++)for(let j=-9;j<=9;j++){
  const cx=4*i,cz=4*j;
  if(!inView(cx,cz,7))continue;
  if(river&&river.inBand(cx,cz))continue;
  const plaza=reserved.has(`${i},${j}`),p=r2(i+seed*.37,j-seed*.11,1),park=!plaza&&p<plan.city.parks;
  plates.push({x:cx,z:cz,park,plaza});
  if(plaza)continue;
  if(park){
   const n=5+Math.floor(r2(i,j+seed,9)*5);
   for(let k=0;k<n;k++)trees.push({x:cx+(r2(i,j+seed,20+k)-.5)*2.3,z:cz+(r2(i,j+seed,40+k)-.5)*2.3,s:.7+.45*r2(i,j+seed,60+k),delay:delayAt(cx,cz,r2(i,j+seed,80+k))});
   continue;
  }
  const alongX=r2(i,j+seed,2)<.5;
  const lots:{x:number;z:number;w:number;d:number}[]=[];
  const half=(o:number)=>alongX?{x:cx,z:cz+o,w:2.7,d:1.3}:{x:cx+o,z:cz,w:1.3,d:2.7};
  const q=(ox:number,oz:number)=>({x:cx+ox,z:cz+oz,w:1.3,d:1.3});
  const u=r2(i,j+seed,3);
  if(u<.3)lots.push({x:cx,z:cz,w:2.7,d:2.7});
  else if(u<.55)lots.push(half(-.7),half(.7));
  else if(u<.8)lots.push(q(-.7,-.7),q(.7,-.7),q(-.7,.7),q(.7,.7));
  else lots.push(half(-.7),...(alongX?[q(-.7,.7),q(.7,.7)]:[q(.7,-.7),q(.7,.7)]));
  for(const lot of lots){
   const k=lot.x*3.17+lot.z*1.13+seed*7.31;
   const w=lot.w*(.84+.1*rnd(k+1)),d=lot.d*(.84+.1*rnd(k+2));
   const cap=occlusionCap(lot.x-w/2,lot.x+w/2,lot.z-d/2,lot.z+d/2,points,rays);
   let h=.35+sky.base*rnd(k+3)**2;
   if(rnd(k+4)<sky.tall)h=1.7+sky.tallH*rnd(k+5);
   if(h>cap)capped++;
   h=Math.max(.16,Math.min(h,cap));
   const tier=h>1.5&&rnd(k+6)<.6,hb=tier?h*.76:h;
   const b=buildings.length;
   buildings.push({x:lot.x,z:lot.z,w,d,h,hb,tw:tier?w*.62:0,td:tier?d*.62:0,color:BUILDING_COLORS[Math.floor(rnd(k+7)*BUILDING_COLORS.length)],delay:delayAt(lot.x,lot.z,rnd(k+8))});
   if(cap-h>.14&&rnd(k+9)<.6){
    const tw=tier?w*.62:w,td=tier?d*.62:d,n=1+Math.floor(rnd(k+10)*2);
    for(let v=0;v<n;v++)roofs.push({b,x:lot.x+(rnd(k+11+v)-.5)*tw*.5,z:lot.z+(rnd(k+13+v)-.5)*td*.5,s:.14+.12*rnd(k+15+v),h:.06+.06*rnd(k+17+v)});
   }
   if(hb>.7)for(let y=.26,row=0;y<hb-.12;y+=.24,row++)for(const face of ["x","z"] as const){
    const r=rnd(k+31+row*2.7+(face==="x"?0:.9));
    const color=r<.83?"#3A2F54":r<.95?"#7C68AC":"#BFA04A";
    windows.push(face==="x"?{b,x:lot.x+w/2+.006,y,z:lot.z,len:d*.74,face,color}:{b,x:lot.x,y,z:lot.z+d/2+.006,len:w*.74,face,color});
   }
  }
 }
 for(const m of plan.markers)if(m.kind==="hub"&&!m.route){
  const x=4*m.bx,z=4*m.bz,w=2.5,cap=occlusionCap(x-w/2,x+w/2,z-w/2,z+w/2,points.filter(p=>Math.hypot(p[0]-x,p[2]-z)>1.6),rays);
  hubs.push({id:m.id,x,z,w,h:Math.max(.7,Math.min(1.6,cap))});
 }
 const streets=Array.from({length:21},(_,i)=>-42+i*4);
 for(const c of streets)for(const axis of ["x","z"] as const)for(let u=-44;u<=44;u+=1){
  if(streets.some(s=>Math.abs(u-s)<.8))continue;
  const x=axis==="x"?u:c,z=axis==="x"?c:u;
  if(inView(x,z,2)&&!(river&&river.inBand(x,z)))dashes.push({x,z,axis});
 }
 // Background traffic: lanes on streets that carry no route; cars shrink in and out over the last metre of a lane
 // that ends outside every camera view, so nothing pops.
 const rLegs=ringLegs(plan.rings),routeStreet=(axis:"x"|"z",c:number)=>[...routes.values()].some(r=>r.legs.some(l=>l.axis===axis&&Math.abs(l.c-c)<1e-6))||rLegs.some(l=>l.axis===axis&&Math.abs(l.c-c)<1e-6);
 const cars:Car[]=[];
 if(plan.city.traffic>0)for(const c of streets)for(const axis of ["x","z"] as const){
  if(routeStreet(axis,c))continue;
  if(river&&river.cutsStreet(axis,c))continue;
  let lo=Infinity,hi=-Infinity;
  for(let u=-46;u<=46;u+=.5){const x=axis==="x"?u:c,z=axis==="x"?c:u;if(inView(x,z,4)){lo=Math.min(lo,u);hi=Math.max(hi,u);}}
  lo-=3;hi+=3;
  if(!(hi-lo>8))continue;
  for(const dir of [1,-1] as const){
   const n=Math.floor(plan.city.traffic*2.2+r2(c,dir+seed,axis==="x"?3:4)*1.2);
   for(let k=0;k<n;k++)cars.push({axis,c,dir,min:lo,len:hi-lo,o:fract(r2(c,dir+seed,10+k)+k/Math.max(1,n)),v:1.3+1.2*r2(c,dir,20+k),color:CAR_COLORS[Math.floor(r2(c,dir+seed,30+k)*CAR_COLORS.length)]});
  }
 }
 return {routes,buildings,roofs,windows,plates,trees,dashes,cars,hubs,guard:{points,rays},capped};
}
export type IsoWorld=ReturnType<typeof isoWorld>;
export function carState(car:Car,t:number){
 const u=fract(car.o+car.v*t/car.len)*car.len,coord=car.dir>0?car.min+u:car.min+car.len-u;
 const lane=.23*car.dir;
 const x=car.axis==="x"?coord:car.c-lane,z=car.axis==="x"?car.c+lane:coord;
 const yaw=car.axis==="x"?(car.dir>0?0:Math.PI):(car.dir>0?-Math.PI/2:Math.PI/2);
 return {x,z,yaw,s:smooth(u/1.2)*smooth((car.len-u)/1.2)};
}
/** Buildings and trees rise in a wave from the first camera target during the first ~1.5 s. */
export const riseAt=(delay:number,t:number)=>Math.max(.001,tween(t,delay,delay+.55,easeEnter));
export const DECK_RISE=[.3,.9] as const;

// ---- Timeline ----------------------------------------------------------------------------------------------------
type Zone={at:number;from:number;to:number;state:"free"|"slow"|"jam";dur:number};
const STATE_MIX={free:[1,0,0],slow:[0,1,0],jam:[0,0,1]} as const;
/** Traffic colour weights (free · slow · jam) at route distance s: each zone recolours as a wave along the route. */
export function trafficAt(zones:Zone[],s:number,t:number){
 let g=1,y=0,p=0;
 for(const z of zones){
  if(t<z.at)break;
  // Sine-out front: the first colour reaches the zone's start ~0.2 s after the word (no ease-in lag), stops softly.
  const front=z.from-1.2+(z.to-z.from+2.4)*sineOut((t-z.at)/z.dur);
  const w=smooth((front-s)/2.4+.5)*smooth((s-z.from)/.45+.5)*(1-smooth((s-z.to)/.45+.5));
  const [tg,ty,tp]=STATE_MIX[z.state];g+=(tg-g)*w;y+=(ty-y)*w;p+=(tp-p)*w;
 }
 return {g,y,p};
}
/** Moment the recolour wave of a zone reaches distance s. */
const reach=(z:Zone,s:number)=>z.at+z.dur*Math.asin(clamp01((s-z.from+1.2)/(z.to-z.from+2.4)))*2/Math.PI;
export type JamCar={zone:number;k:number;s0:number;room:number;appearAt:number;clearAt:number};
function jamCars(zones:Zone[]):JamCar[]{
 const out:JamCar[]=[];
 zones.forEach((z,zi)=>{
  if(z.state!=="jam")return;
  const n=Math.max(1,Math.min(7,Math.floor((z.to-z.from-.6)/.78)));
  const room=Math.max(0,z.to-.45-(z.from+.55+(n-1)*.78));
  for(let k=0;k<n;k++){
   const s0=z.from+.55+k*.78;
   const clear=zones.find((c,ci)=>ci>zi&&c.at>z.at&&c.state!=="jam"&&s0>=c.from-.3&&s0<=c.to+.3);
   out.push({zone:zi,k,s0,room,appearAt:reach(z,s0)-.1,clearAt:clear?reach(clear,s0):Infinity});
  }
 });
 return out;
}
export function jamCarState(c:JamCar,t:number){
 const k=t<c.appearAt?0:easeEnter((t-c.appearAt)/.5)*(c.clearAt===Infinity?1:1-easeInOut(clamp01((t-c.clearAt)/.45)));
 return {s:c.s0+Math.min(.18*Math.max(0,t-c.appearAt),c.room),k,brake:k*tween(t,c.appearAt+.3,c.appearAt+.8,easeEnter)};
}
const keyedValue=(t:number,keys:{at:number;value:number}[],initial=0,dur=.6)=>{let v=initial;for(const k of keys){if(t<k.at)break;v+=(k.value-v)*easeInOut(clamp01((t-k.at)/dur));}return v;};
export const DISTRICT_STATES=["normal","lit","dark","warn"] as const;

export function isoTimeline(plan:IsometricPlan,world:IsoWorld,scenes:Clock,alignment:Alignment=[]){
 const at=(a:Anchor3D)=>anchorTime(a,scenes,alignment),total=scenes.reduce((n,s)=>n+s.seconds,0),frames=Math.round(total*FPS)+1;
 const routes=plan.routes.map(r=>{
  const path=world.routes.get(r.id)!,drawAt=at(r.draw);
  const zones:Zone[]=r.traffic.map(k=>{const from=Math.min(k.from,k.to)*path.L,to=Math.max(k.from,k.to)*path.L;return {at:at(k.at),from,to,state:k.state,dur:sweepSeconds(to-from)};}).sort((a,b)=>a.at-b.at);
  return {id:r.id,style:r.style,path,drawAt,drawDur:drawSeconds(path.L),exitAt:r.exit?at(r.exit):Infinity,zones,jams:jamCars(zones)};
 });
 const routeOf=(id:string)=>routes.find(r=>r.id===id)!;
 // Vehicles integrate a speed that follows the traffic under them and never close in on a visible jam queue.
 const vehicles=plan.vehicles.map(v=>{
  const r=routeOf(v.route),enterAt=at(v.enter),goAt=Math.max(enterAt,at(v.go)),exitAt=v.exit?at(v.exit):Infinity;
  const s=new Float64Array(frames);let pos=0;
  for(let f=0;f<frames;f++){
   const t=f/FPS;s[f]=pos;
   const m=trafficAt(r.zones,pos,t);
   let v2=smooth((t-goAt)/.55)*(4.3*m.g+1.5*m.y+.45*m.p);
   v2=Math.min(v2,1.8*Math.max(0,r.path.L-.3-pos));
   let limit=Infinity;
   for(const c of r.jams){const j=jamCarState(c,t);if(j.k>.5&&j.s>pos+.05)limit=Math.min(limit,j.s-.85);}
   pos=Math.min(pos+v2/FPS,Math.max(pos,limit),r.path.L-.3);
  }
  return {id:v.id,route:v.route,tone:v.tone,enterAt,goAt,exitAt,s};
 });
 const markers=plan.markers.map(m=>({...m,point:markerPoint(m,world.routes),enterAt:at(m.enter),exitAt:m.exit?at(m.exit):Infinity,activeKeys:m.active.map(k=>({at:at(k.at),value:k.value})).sort((a,b)=>a.at-b.at)}));
 const districts=plan.districts.map(d=>({...d,keys:d.keys.map(k=>({at:at(k.at),state:k.state})).sort((a,b)=>a.at-b.at)}));
 const links=plan.links.map(l=>({...l,enterAt:at(l.enter),exitAt:l.exit?at(l.exit):Infinity,a:markers.find(m=>m.id===l.from)!,b:markers.find(m=>m.id===l.to)!}));
 const cards=plan.cards.map(c=>({...c,enterAt:at(c.enter),exitAt:c.exit?at(c.exit):Infinity,keys:c.keys.map(k=>({...k,at:at(k.at)})).sort((a,b)=>a.at-b.at)}));
 const camera=plan.camera.map(c=>({at:at(c.at),pose:{x:c.x,z:c.z,zoom:c.zoom,az:c.azimuth}})).sort((a,b)=>a.at-b.at);
 const dispatch=plan.dispatch?dispatchTimeline(plan.dispatch,world.routes,at,markers,MARKER_TOP):null;
 const speedcam=plan.speedcam?speedcamTimeline(plan.speedcam,world.routes,at,frames,markers,MARKER_TOP):null;
 const tiles=(plan.tiles??[]).map(x=>({...x,point:markerPoint(x,world.routes),enterAt:at(x.enter),exitAt:x.exit?at(x.exit):Infinity}));
 return {total,frames,rings:ringTimeline(plan.rings,at,total),routes,vehicles,markers,districts,links,cards,camera,dispatch,speedcam,tiles};
}
export type IsoTimeline=ReturnType<typeof isoTimeline>;
type TlRoute=IsoTimeline["routes"][number];

// ---- Frame state (shared by the renderer and the continuity tests) --------------------------------------------
export const routeDrawn=(r:TlRoute,t:number)=>r.path.L*tween(t,r.drawAt,r.drawAt+r.drawDur,easeInOut);
export const routeShown=(r:TlRoute,t:number)=>t<r.drawAt?0:r.exitAt===Infinity?1:1-easeInOut(clamp01((t-r.exitAt)/.5));
export const leadDot=(r:TlRoute,t:number)=>tween(t,r.drawAt,r.drawAt+.3,easeEnter)*(1-tween(t,r.drawAt+r.drawDur-.1,r.drawAt+r.drawDur+.3,easeInOut));
export function vehicleState(v:IsoTimeline["vehicles"][number],t:number){
 const f=Math.max(0,Math.min(v.s.length-1,Math.round(t*FPS)));
 return {s:v.s[f],k:shown(t,v.enterAt,v.exitAt,.5,.45)};
}
export function markerState(m:IsoTimeline["markers"][number],t:number){return {k:shown(t,m.enterAt,m.exitAt),active:keyedValue(t,m.activeKeys)};}
export function tileState(x:IsoTimeline["tiles"][number],t:number){return {k:shown(t,x.enterAt,x.exitAt)};}
/** District light mix (normal · lit · dark · warn): the change spreads from the centre outwards (0.08 s per unit). */
export function districtMix(d:IsoTimeline["districts"][number],x:number,z:number,t:number){
 const dist=Math.hypot(x-4*d.bx,z-4*d.bz),reachR=d.radius*4+1;
 const inside=1-smooth((dist-reachR+1)/2);
 const v=[1,0,0,0];
 if(inside<=0)return {v,inside:0};
 for(const k of d.keys){const w=easeInOut(clamp01((t-k.at-dist*.08)/.6));if(w<=0)break;const i=DISTRICT_STATES.indexOf(k.state);for(let j=0;j<4;j++)v[j]+=((j===i?1:0)-v[j])*w;}
 return {v,inside};
}
/** Weight of the "current chapter" accent of a header segment: crossfades over 0.3 s at both chapter boundaries. */
export const chapterAccent=(t:number,start:number,end:number)=>easeEnter((t-start)/.3)*(1-easeEnter((t-end)/.3));
export function linkState(l:IsoTimeline["links"][number],t:number){return {draw:tween(t,l.enterAt,l.enterAt+.8,easeInOut),k:shown(t,l.enterAt,l.exitAt,.3,.45)};}
/** A bigger change rolls longer (0.9–2.2 s), so the digits never blur into a jump. */
const rollSeconds=(delta:number)=>Math.max(.9,Math.min(2.2,.9+Math.abs(delta)/25));
export function cardState(c:IsoTimeline["cards"][number],t:number){
 const k=shown(t,c.enterAt,c.exitAt);
 let value=c.keys[0].value;
 for(const key of c.keys.slice(1)){if(t<key.at)break;value+=(key.value-value)*easeInOut(clamp01((t-key.at)/rollSeconds(key.value-value)));}
 // Tone and note follow the latest key; both crossfade over 0.35 s.
 const chips=c.keys.map((key,i)=>({text:key.note,tone:key.tone,k:(t<key.at?0:easeEnter((t-key.at)/.35))*(1-(c.keys[i+1]&&t>=c.keys[i+1].at?easeInOut(clamp01((t-c.keys[i+1].at)/.35)):0))}));
 return {k,value,chips};
}

/** Every scalar a viewer can see change, for one moment; the continuity tests compare consecutive frames.
 *  "v:" keys are visibilities/state weights 0..1 (MOTION-RULES: none may switch within one frame, ≤ FRAME_LIMIT.v per
 *  frame); "p:" keys are positions scaled so that 1 is the largest acceptable step per frame (FRAME_LIMIT.p). */
export const FRAME_LIMIT={v:.34,p:1};
export function frameScalars(tl:IsoTimeline,world:IsoWorld,t:number){
 const out:Record<string,number>={};
 const cam=cameraAt(t,tl.camera);
 Object.assign(out,{"p:camX":cam.x/1,"p:camZ":cam.z/1,"p:camZoom":cam.zoom/1.5,"p:camAz":cam.az/.5});
 for(const r of tl.routes){
  // The ribbon grows from its start: what is visible is the drawn length times the exit fade.
  const drawn=routeDrawn(r,t);
  out[`p:route:${r.id}:drawn`]=drawn/1.2;out[`v:route:${r.id}:shown`]=routeShown(r,t)*clamp01(drawn);out[`v:route:${r.id}:dot`]=leadDot(r,t);
  for(let i=0;i<=8;i++){const m=trafficAt(r.zones,r.path.L*i/8,t);out[`v:route:${r.id}:g${i}`]=m.g;out[`v:route:${r.id}:p${i}`]=m.p;out[`v:route:${r.id}:y${i}`]=m.y;}
  r.jams.forEach((c,i)=>{const j=jamCarState(c,t);out[`v:jam:${r.id}:${i}`]=j.k;out[`v:jam:${r.id}:${i}:brake`]=j.brake;out[`p:jam:${r.id}:${i}:s`]=j.s/.2;});
 }
 for(const v of tl.vehicles){const s=vehicleState(v,t);out[`v:vehicle:${v.id}`]=s.k;out[`p:vehicle:${v.id}:s`]=s.s/.2;}
 for(const m of tl.markers){const s=markerState(m,t);out[`v:marker:${m.id}`]=s.k;out[`v:marker:${m.id}:active`]=s.active;}
 for(const d of tl.districts)for(const [i,b] of world.buildings.entries()){if(i%7)continue;const s=districtMix(d,b.x,b.z,t);s.v.forEach((v,j)=>out[`v:district:${d.id}:${i}:${j}`]=v*s.inside);}
 tl.links.forEach((l,i)=>{const s=linkState(l,t);out[`v:link:${i}`]=s.k;out[`v:link:${i}:draw`]=s.draw;});
 for(const c of tl.cards){const s=cardState(c,t);out[`v:card:${c.id}`]=s.k;out[`p:card:${c.id}:value`]=s.value/Math.max(1.2,Math.max(...c.keys.map((k,i)=>i?Math.abs(k.value-c.keys[i-1].value):0))/8);s.chips.forEach((ch,i)=>out[`v:card:${c.id}:chip${i}`]=ch.k);}
 world.buildings.forEach((b,i)=>{if(i%11===0)out[`v:rise:${i}`]=riseAt(b.delay,t);});
 world.cars.forEach((c,i)=>{if(i%5===0)out[`v:car:${i}`]=carState(c,t).s;});
 Object.assign(out,ringScalars(tl.rings,t));
 if(tl.dispatch)Object.assign(out,dispatchScalars(tl.dispatch,t));
 if(tl.speedcam)Object.assign(out,speedcamScalars(tl.speedcam,t));
 for(const x of tl.tiles)out[`v:tile:${x.id}`]=tileState(x,t).k;
 return out;
}

// ---- Validation --------------------------------------------------------------------------------------------------
const word=(s:string)=>s.toLowerCase().replace(/ё/g,"е").replace(/[^\p{L}\p{N}]/gu,"");
/** Map-interface words that carry no factual claim (you-are-here pins), in both studio languages. */
const MAP_WORDS=new Set(["now","you","start","here","сейчас","ты","вы","старт","здесь","тут"]);
// Pins are skipped by the same tokens the check uses, so «ТЫ-ЗДЕСЬ» or «Start→here» count like «ты здесь».
const isoGrounded=(text:string,vocabulary:Set<string>)=>grounded(text,vocabulary,MAP_WORDS);
/** Moment a viewer reads something shown from..to: settled after it appears, never past the middle of its window. */
const focusTime=(from:number,to:number,lead:number)=>Math.min(from+lead,(from+Math.min(to,from+20))/2);
export type FocusPoint={t:number;p:V3;what:string;relaxed?:boolean};
/** Points that must be in the focus area when they appear (shared by the framing solver, the validator and the safe-zone warnings). */
export function focusPoints(plan:IsometricPlan,routes:Map<string,RoutePath>,at:(a:Anchor3D)=>number,total:number):FocusPoint[]{
 const pts:FocusPoint[]=[];
 for(const r of plan.routes){const p=routes.get(r.id)!,end=at(r.draw)+drawSeconds(p.L),exit=r.exit?at(r.exit):Infinity;if(exit<=end+.3)continue;const t=Math.min(end+.2,total);
  pts.push({t,p:posAt(p,0),what:`начало маршрута ${r.id}`,relaxed:true},{t,p:posAt(p,p.L),what:`конец маршрута ${r.id}`,relaxed:true});}
 for(const m of plan.markers){const enter=at(m.enter),exit=m.exit?at(m.exit):Infinity,t=focusTime(enter,exit,1);if(t>total)continue;const p=markerPoint(m,routes);pts.push({t,p:[p[0],p[1]+MARKER_TOP[m.kind]*.5,p[2]],what:`${m.kind} ${m.id}`});}
 for(const v of plan.vehicles){const r=routes.get(v.route)!,t=Math.max(at(v.enter),at(v.go))+.2;if(t>total)continue;pts.push({t,p:posAt(r,0),what:`машина ${v.id} на старте`});}
 pts.push(...dispatchFocus(plan.dispatch,routes,at,total));
 pts.push(...speedcamFocus(plan.speedcam,routes,at,total));
 pts.push(...ringFocusPoints(plan.rings,at,total));
 for(const x of plan.tiles??[]){const enter=at(x.enter),exit=x.exit?at(x.exit):Infinity,t=focusTime(enter,exit,1);if(t>total)continue;const p=markerPoint(x,routes);pts.push({t,p:[p[0],p[1]+x.lift,p[2]],what:`плитка ${x.id}`},{t,p:[p[0],p[1]+x.lift+3.5,p[2]],what:`верх плитки ${x.id}`});}
 return pts;
}
/** Minimal deterministic framing: move (and if needed widen) each camera key so that the things that appear during
 *  its interval sit inside the focus area. Returns how many keys changed. */
export function solveIsoCamera(plan:IsometricPlan,scenes:Clock,alignment:Alignment=[],layout?:PortraitLayout,overlay?:OverlayVersion){
 const routes=new Map(plan.routes.map(r=>[r.id,routePath(r)])),total=scenes.reduce((n,s)=>n+s.seconds,0),at=(a:Anchor3D)=>anchorTime(a,scenes,alignment);
 const F=isoLayout(layout,overlay).focus,M=24;
 const keys=plan.camera.map((c,i)=>({i,at:at(c.at)})).sort((a,b)=>a.at-b.at);
 const groups=new Map<number,FocusPoint[]>();
 for(const fp of focusPoints(plan,routes,at,total)){let k=keys[0];for(const key of keys){if(key.at>fp.t)break;k=key;}groups.set(k.i,[...(groups.get(k.i)??[]),fp]);}
 let changed=0;
 for(const [i,pts] of groups){
  const cam=plan.camera[i];let pose={x:cam.x,z:cam.z,zoom:cam.zoom,az:cam.azimuth};
  const box=(p:IsoPose)=>{const s=pts.map(q=>project(q.p,p));return {x0:Math.min(...s.map(v=>v.x)),x1:Math.max(...s.map(v=>v.x)),y0:Math.min(...s.map(v=>v.y)),y1:Math.max(...s.map(v=>v.y))};};
  let b=box(pose);
  const W=F.right-F.left-2*M,H=F.bottom-F.top-2*M,need=Math.min(1,W/Math.max(1,b.x1-b.x0),H/Math.max(1,b.y1-b.y0));
  if(need<1){pose={...pose,zoom:Math.max(ZOOM.min,Math.floor(pose.zoom*need*10)/10)};b=box(pose);}
  const shift=(lo:number,hi:number,a:number,c:number)=>a<lo&&c>hi?((lo+hi)-(a+c))/2:a<lo?Math.min(lo-a,hi-c):c>hi?Math.max(hi-c,lo-a):0;
  const dsx=shift(F.left+M,F.right-M,b.x0,b.x1),dsy=shift(F.top+M,F.bottom-M,b.y0,b.y1);
  if(Math.abs(dsx)>.5||Math.abs(dsy)>.5){
   // Screen shift → target shift on the ground (inverse of the projection's ground rotation).
   const az=pose.az*Math.PI/180,a=-dsx/pose.zoom,c=-dsy/(pose.zoom*Math.sin(ELEV));
   pose={...pose,x:pose.x+a*Math.cos(az)+c*Math.sin(az),z:pose.z-a*Math.sin(az)+c*Math.cos(az)};
  }
  const next={x:Math.round(Math.max(-28,Math.min(28,pose.x))*100)/100,z:Math.round(Math.max(-28,Math.min(28,pose.z))*100)/100,zoom:Math.round(pose.zoom*10)/10};
  if(Math.abs(next.x-cam.x)>.01||Math.abs(next.z-cam.z)>.01||Math.abs(next.zoom-cam.zoom)>.05){Object.assign(cam,next);changed++;}
 }
 return changed;
}

/** opts.coverage=1 — the experimental coverage mode (opt-in per project): close-ups up to ZOOM_CLOSE, every sentence shown,
 *  no long still stretches, enough close shots. Absent — the original isometric/v1 contract (zoom ≤ 72). */
export function validateIsometric(raw:unknown,plan:{title:string;summary?:string;scenes:Clock;media?:readonly MediaAsset[];creatorOutro?:{sceneId:string}|null},alignment:Alignment=[],layout?:PortraitLayout,overlay?:OverlayVersion,opts:{coverage?:number}={}):IsometricPlan{
 const result=isometricSchema.parse(raw),scenes=plan.scenes,total=scenes.reduce((n,s)=>n+s.seconds,0),vocabulary=corpus(plan);
 if(!opts.coverage&&result.camera.some(c=>c.zoom>ZOOM.max))throw new Error(`Изометрия: zoom больше ${ZOOM.max} доступен только проектам с правилом показа.`);
 if(!opts.coverage&&result.tiles?.length)throw new Error("Изометрия: плитки логотипов и флагов доступны только проектам с правилом показа.");
 const check=(a:Anchor3D,what:string)=>{
  if(!scenes[a.scene-1])throw new Error(`Изометрия: ${what} ссылается на несуществующую главу ${a.scene}.`);
  if(a.cue&&!(scenes[a.scene-1].narration||"").split(/\s+/).some(s=>word(s)===word(a.cue)))throw new Error(`Изометрия: слова «${a.cue}» нет в главе ${a.scene} (${what}).`);
  const t=anchorTime(a,scenes,alignment);if(t<0||t>total+.01)throw new Error(`Изометрия: ${what} за пределами ролика.`);return t;
 };
 const span=(enter:Anchor3D,exit:Anchor3D|null,what:string,min=.6)=>{const a=check(enter,`${what}.enter`),b=exit?check(exit,`${what}.exit`):Infinity;if(b-a<min)throw new Error(`Изометрия: ${what} должен быть виден не меньше ${String(min).replace(".",",")} с — появление и исчезновение плавные, не в одном кадре.`);return [a,b] as const;};
 const text=(s:string,what:string)=>{if(s&&!isoGrounded(s,vocabulary))throw new Error(`Изометрия: ${what} «${s}» не опирается на проверенный текст сценария.`);};
 const ids=new Set<string>();
 for(const x of [...result.routes,...result.vehicles,...result.markers,...result.districts,...result.cards]){if(ids.has(x.id))throw new Error(`Изометрия: id ${x.id} повторяется.`);ids.add(x.id);}
 const routes=new Map<string,RoutePath>();
 for(const r of result.routes){
  r.waypoints.forEach((p,i)=>{if(!i)return;const a=r.waypoints[i-1];
   if(a.c!==p.c&&a.r!==p.r)throw new Error(`Изометрия: маршрут ${r.id} идёт по диагонали между точками ${i-1} и ${i}; соседние точки — на одной улице (общий c или общий r).`);
   if(a.c===p.c&&a.r===p.r)throw new Error(`Изометрия: маршрут ${r.id} повторяет точку ${i}.`);
   if(i>1){const b=r.waypoints[i-2],d1=[a.c-b.c,a.r-b.r],d2=[p.c-a.c,p.r-a.r];if(d1[0]*d2[1]-d1[1]*d2[0]===0)throw new Error(`Изометрия: маршрут ${r.id} в точке ${i-1} едет прямо или разворачивается — оставь только точки поворота.`);}
  });
  if(r.deckLeg>=r.waypoints.length-1)throw new Error(`Изометрия: у маршрута ${r.id} нет участка ${r.deckLeg} для эстакады.`);
  if(r.deckLeg>=0){const a=r.waypoints[r.deckLeg],b=r.waypoints[r.deckLeg+1];if(4*(Math.abs(a.c-b.c)+Math.abs(a.r-b.r))<8)throw new Error(`Изометрия: эстакада маршрута ${r.id} требует прямой участок не короче двух кварталов.`);}
  const p=routePath(r);routes.set(r.id,p);
  const draw=check(r.draw,`${r.id}.draw`),exit=r.exit?check(r.exit,`${r.id}.exit`):Infinity;
  if(exit-draw<drawSeconds(p.L)+.6)throw new Error(`Изометрия: маршрут ${r.id} исчезает раньше, чем успевает прорисоваться (${drawSeconds(p.L).toFixed(1)} с) и постоять.`);
  r.traffic.forEach((k,i)=>{const t=check(k.at,`${r.id}.traffic[${i}]`);if(Math.abs(k.to-k.from)*p.L<1.5)throw new Error(`Изометрия: участок трафика ${r.id}[${i}] короче 1,5 единицы.`);if(t<draw+.3)throw new Error(`Изометрия: трафик ${r.id}[${i}] перекрашивает маршрут до его прорисовки.`);});
 }
 for(const v of result.vehicles){
  if(!routes.has(v.route))throw new Error(`Изометрия: машина ${v.id} едет по неизвестному маршруту ${v.route}.`);
  const [enter]=span(v.enter,v.exit,`машина ${v.id}`,1);if(check(v.go,`${v.id}.go`)<enter+.3)throw new Error(`Изометрия: машина ${v.id} трогается раньше, чем появилась.`);
 }
 for(const m of result.markers){
  if(m.route&&!routes.has(m.route))throw new Error(`Изометрия: ${m.id} стоит на неизвестном маршруте ${m.route}.`);
  if(["tower","hub"].includes(m.kind)&&m.route)throw new Error(`Изометрия: ${m.kind} ${m.id} ставится на квартал (route='', bx/bz), а не на дорогу.`);
  if(m.kind==="pin"&&!m.text)throw new Error(`Изометрия: метка ${m.id} требует text.`);
  text(m.text,`подпись ${m.id}`);span(m.enter,m.exit,m.id);m.active.forEach((k,i)=>check(k.at,`${m.id}.active[${i}]`));
 }
 const blocks=new Map<string,string>();
 for(const m of result.markers)if(!m.route){const key=`${m.bx},${m.bz}`;if(blocks.has(key)&&m.kind!=="pin"&&blocks.get(key)!=="pin")throw new Error(`Изометрия: ${m.id} и ${blocks.get(key)} занимают один квартал ${key}.`);blocks.set(key,m.kind==="pin"?blocks.get(key)??"pin":m.id);}
 for(const d of result.districts)d.keys.forEach((k,i)=>check(k.at,`${d.id}.keys[${i}]`));
 const markerIds=new Set(result.markers.map(m=>m.id));
 for(const l of result.links){if(!markerIds.has(l.from)||!markerIds.has(l.to)||l.from===l.to)throw new Error(`Изометрия: связь ${l.from}→${l.to} должна соединять два разных маркера.`);span(l.enter,l.exit,`связь ${l.from}→${l.to}`,.9);}
 if(result.dispatch)validateDispatch(result.dispatch,{check,span,text,routes,markerIds,usedIds:ids,waypoints:new Map(result.routes.map(r=>[r.id,r.waypoints]))});
 validateRings(result.rings,ids,check,text,total,a=>anchorTime(a,scenes,alignment));
 if(result.speedcam)validateSpeedcam(result.speedcam,{check,span,text,routes,markerIds,usedIds:ids});
 for(const x of result.tiles??[]){
  if(ids.has(x.id))throw new Error(`Изометрия: id ${x.id} повторяется.`);ids.add(x.id);
  if(x.route&&!routes.has(x.route))throw new Error(`Изометрия: плитка ${x.id} стоит на неизвестном маршруте ${x.route}.`);
  if(!findMedia(plan.media,x.subject,x.kind))throw new Error(`Изометрия: плитки ${x.id} «${x.subject}» (${x.kind}) нет в медиаснимке проекта; используй только subject из media.`);
  text(x.subject,`плитка ${x.id}`);span(x.enter,x.exit,`плитка ${x.id}`,1);
 }
 const cards=result.cards.map(c=>{
  text(c.label,`карточка ${c.id}`);text(c.unit,`единица ${c.id}`);
  if(c.route&&!routes.has(c.route))throw new Error(`Изометрия: карточка ${c.id} ссылается на неизвестный маршрут ${c.route}.`);
  const [enter,exit]=span(c.enter,c.exit,`карточка ${c.id}`,1.2);
  c.keys.forEach((k,i)=>{check(k.at,`${c.id}.keys[${i}]`);text(k.note,`пометка ${c.id}`);if(!grounded(String(k.value),vocabulary))throw new Error(`Изометрия: число ${k.value} на карточке ${c.id} не встречается в проверенном тексте.`);});
  return {id:c.id,enter,exit};
 }).sort((a,b)=>a.enter-b.enter);
 for(let i=1;i<cards.length;i++)if(cards[i].enter<cards[i-1].exit-1e-6)throw new Error(`Изометрия: карточки ${cards[i-1].id} и ${cards[i].id} на экране одновременно; одна карточка за раз — закрой предыдущую через exit.`);
 const cams=result.camera.map((c,i)=>({at:check(c.at,`camera[${i}]`),c})).sort((a,b)=>a.at-b.at);
 if(cams[0].at>.05)throw new Error("Изометрия: первый ключ камеры должен стоять в начале ролика (scene 1, progress 0, cue '').");
 for(let i=1;i<cams.length;i++)if(cams[i].at-cams[i-1].at<1)throw new Error("Изометрия: между ключами камеры нужно не меньше 1 с.");
 const framed=solveIsoCamera(result,scenes,alignment,layout,overlay);
 if(framed&&!result.notes.some(n=>n.startsWith("Кадрирование")))result.notes=[...result.notes.slice(0,7),`Кадрирование: ${framed} ключей камеры автоматически подогнаны под безопасную зону кадра.`];
 if(opts.coverage){
  const at=(a:Anchor3D)=>anchorTime(a,scenes,alignment),skip=plan.creatorOutro?.sceneId?[plan.creatorOutro.sceneId]:[];
  const message=coverageError(coverageReport(sentences(scenes as any,alignment as any,skip),anchoredTimes(result,at)),"Изометрия");
  if(message)throw new Error(message);
  const close=result.camera.filter(c=>c.zoom>=COVERAGE.closeZoom).length;
  if(total>30&&close<3)throw new Error(`Изометрия: правило показа — нужны крупные планы предмета разговора: хотя бы 3 ключа камеры с zoom ≥ ${COVERAGE.closeZoom} (сейчас ${close}).`);
 }
 const F=isoLayout(layout,overlay).focus,keys=result.camera.map(c=>({at:anchorTime(c.at,scenes,alignment),pose:{x:c.x,z:c.z,zoom:c.zoom,az:c.azimuth}})).sort((a,b)=>a.at-b.at);
 for(const fp of focusPoints(result,routes,a=>anchorTime(a,scenes,alignment),total)){
  const s=project(fp.p,poseAt(fp.t,keys)),m=fp.relaxed?60:0;
  if(s.x<F.left-m||s.x>F.right+m||s.y<F.top-m||s.y>F.bottom+m)throw new Error(`Изометрия: ${fp.what} в ${fp.t.toFixed(2)} с вне безопасной зоны кадра (${Math.round(s.x)},${Math.round(s.y)}; нужно x ${F.left}..${F.right}, y ${F.top}..${F.bottom}). Поставь ключ камеры ближе к ${fp.p[0].toFixed(1)}, ${fp.p[2].toFixed(1)} или уменьши zoom.`);
 }
 return result;
}
/** On-screen texts for the independent check of the plan's captions (writtenText). */
export function isometricTexts(p?:IsometricPlan){return p?[...(p.tiles??[]).filter(x=>x.label).map(x=>x.subject),...ringTexts(p.rings),...p.markers.map(m=>m.text),...p.cards.flatMap(c=>[c.label,c.unit,...c.keys.map(k=>k.note)]),...dispatchTexts(p.dispatch),...speedcamTexts(p.speedcam)].filter(Boolean):[];}
/** Story moments for sound accents and the music arrangement: tone-coded like illustrated callouts. */
export function isoStoryEvents(tl:IsoTimeline){
 const ev:{at:number;kind:"route"|"marker"|"pin"|"zone"|"district"|"link"|"card";tone:"info"|"ok"|"warn"|"number"}[]=[];
 for(const r of tl.routes){ev.push({at:r.drawAt,kind:"route",tone:"info"});
  r.zones.forEach((z,i)=>{const after=r.zones.slice(0,i).some(p=>p.state!=="free"&&p.from<z.to&&p.to>z.from);
   if(z.state==="jam")ev.push({at:z.at,kind:"zone",tone:"warn"});else if(z.state==="free"&&after)ev.push({at:z.at,kind:"zone",tone:"ok"});else if(z.state==="slow")ev.push({at:z.at,kind:"zone",tone:"number"});});}
 for(const m of tl.markers)ev.push({at:m.enterAt,kind:m.kind==="pin"?"pin":"marker",tone:m.kind==="alert"?"warn":m.tone});
 for(const d of tl.districts)d.keys.forEach((k,i)=>{if(k.state==="dark"||k.state==="warn")ev.push({at:k.at,kind:"district",tone:"warn"});else if(i&&["dark","warn"].includes(d.keys[i-1].state))ev.push({at:k.at,kind:"district",tone:"ok"});});
 for(const l of tl.links)ev.push({at:l.enterAt,kind:"link",tone:l.tone});
 for(const c of tl.cards)c.keys.slice(1).forEach(k=>ev.push({at:k.at,kind:"card",tone:k.tone}));
 if(tl.dispatch)ev.push(...dispatchStoryEvents(tl.dispatch));
 if(tl.speedcam)ev.push(...speedcamStoryEvents(tl.speedcam));
 ev.push(...ringStoryEvents(tl.rings));
 for(const x of tl.tiles)ev.push({at:x.enterAt,kind:"marker",tone:"info"});
 return ev.sort((a,b)=>a.at-b.at);
}
/** Every anchored moment of the plan (dense review frames are taken around them). */
export function isoEventTimes(tl:IsoTimeline){
 return [...tl.routes.flatMap(r=>[r.drawAt,r.drawAt+r.drawDur,r.exitAt,...r.zones.map(z=>z.at)]),...tl.vehicles.flatMap(v=>[v.enterAt,v.goAt,v.exitAt]),
  ...tl.markers.flatMap(m=>[m.enterAt,m.exitAt,...m.activeKeys.map(k=>k.at)]),...tl.districts.flatMap(d=>d.keys.map(k=>k.at)),...tl.links.flatMap(l=>[l.enterAt,l.exitAt]),
  ...tl.cards.flatMap(c=>[c.enterAt,c.exitAt,...c.keys.map(k=>k.at)]),...ringEventTimes(tl.rings),...tl.camera.map(c=>c.at),...(tl.dispatch?dispatchEventTimes(tl.dispatch):[]),...(tl.speedcam?speedcamEventTimes(tl.speedcam):[]),...tl.tiles.flatMap(x=>[x.enterAt,x.exitAt])].filter(t=>Number.isFinite(t)&&t<=tl.total);
}
