import {z} from "zod";
import {anchor3dSchema,type Anchor3D} from "./scene3d";
import type {RoutePath,V3} from "./isometric";

// isometric dispatch catalog (2026-10-22, «How Uber Picks Your Driver»): prepared ride-dispatch objects for the
// «Изометрия» city — a glowing hexagon grid on the ground (H3-style cells) whose cells light up in waves (rider cell,
// neighbour rings, supply/demand), a river that cuts one block row with bridges on chosen streets, one-way streets
// with flowing chevrons, waiting driver cars with word-anchored states (candidate · chosen · busy · dim) and tags,
// optional driving along a route, and lines between a driver and a rider ("crow" — dashed straight line as the crow
// flies; "assign" — the match, an arc with running dots). The director returns only this JSON (field `dispatch` of
// the isometric plan); every value is a pure function of the plan and the frame time. Illustrations, not a real map
// and not Uber's interface. This module imports no runtime code from ./isometric (type-only), so the core imports it
// without a cycle.

const FPS=30;
const id=z.string().regex(/^[a-z][a-z0-9-]{0,23}$/);
const tone=z.enum(["info","ok","warn","number"]);
const streetIndex=z.number().int().min(-7).max(6);
const block=z.number().int().min(-7).max(7);
const axis=z.enum(["x","z"]);
export const HEX_STATES=["off","ring","focus","supply","demand"] as const;
export type HexState=typeof HEX_STATES[number];
export const DRIVER_STATES=["idle","candidate","chosen","busy","dim"] as const;
export type DriverState=typeof DRIVER_STATES[number];
export const dispatchSchema=z.object({
 /** Hexagon grid on the ground: cell (0,0) is centred at x/z; size = circumradius of a cell (≈ one block at 2);
  *  rings = how many neighbour rings are drawn. marks paint cells at ring distance from..to around cell q/r. */
 grid:z.object({
  x:z.number().min(-28).max(28),z:z.number().min(-28).max(28),size:z.number().min(1.2).max(3.2),rings:z.number().int().min(1).max(6),
  enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
  marks:z.array(z.object({at:anchor3dSchema,q:z.number().int().min(-6).max(6),r:z.number().int().min(-6).max(6),from:z.number().int().min(0).max(6),to:z.number().int().min(0).max(6),state:z.enum(HEX_STATES)})).max(12),
 }).nullable(),
 /** River in place of one block row (axis x: along x through z=4·line; axis z: along z through x=4·line).
  *  Streets cross it only on bridges (street indices). The river is part of the city from the first frame. */
 river:z.object({axis,line:block,bridges:z.array(streetIndex).min(1).max(3)}).nullable(),
 /** One-way street: on street `street` (axis x: z=4·street+2; axis z: x=4·street+2) between crossings from → to; traffic
  *  only goes from → to (flowing chevrons). Routes may not drive it the other way. */
 oneWay:z.array(z.object({id,axis,street:streetIndex,from:streetIndex,to:streetIndex,enter:anchor3dSchema,exit:anchor3dSchema.nullable()})).max(4),
 /** Driver cars. route '' — parked on a street: crossing c/r (x=4c+2, z=4r+2), shifted by off along axis, facing dir.
  *  route=id — on that route at drive keys {at,u} (first key = where it waits; u never decreases). */
 drivers:z.array(z.object({
  id,route:z.string().max(24),c:streetIndex,r:streetIndex,axis,off:z.number().min(-1.6).max(1.6),dir:z.enum(["+","-"]),
  enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
  drive:z.array(z.object({at:anchor3dSchema,u:z.number().min(0).max(1)})).max(6),
  states:z.array(z.object({at:anchor3dSchema,state:z.enum(DRIVER_STATES)})).max(8),
  tags:z.array(z.object({at:anchor3dSchema,text:z.string().max(18),tone})).max(4),
 })).max(6),
 /** Line between two things (driver or marker ids): crow — dashed straight line low over the ground; assign — the match. */
 lines:z.array(z.object({id,from:id,to:id,style:z.enum(["crow","assign"]),tone,text:z.string().max(18),enter:anchor3dSchema,exit:anchor3dSchema.nullable()})).max(8),
 /** Request ping: three rings spread on the ground from a driver or marker at a word (1.4 s, then gone). */
 pings:z.array(z.object({at:anchor3dSchema,target:id,tone})).max(8).optional(),
});
export type DispatchPlan=z.infer<typeof dispatchSchema>;
export const DISPATCH_GUIDE=`ДИСПЕТЧЕРСКИЙ СЛОЙ (необязательное поле dispatch; null — не нужно). Подготовленные предметы для роликов о подборе машин и карте:
- grid: светящаяся сетка шестиугольников на земле (ячейки как у H3): центр ячейки (0,0) — x/z города, size — радиус ячейки (2 ≈ квартал), rings — сколько колец соседей нарисовано (1..6). Сетка проявляется волной от центра на enter. marks — покраска ячеек на слове at: вокруг ячейки q/r (осевые координаты, q вправо, r вниз-вправо) кольца from..to (0 — сама ячейка); state focus (жёлтая — ячейка пассажира), ring (лавандовая — соседи, где ищут машины), supply (зелёная — машин хватает), demand (розовая — заявок больше машин), off (погасить). Покраска идёт волной по кольцам; подсвеченные ячейки поднимаются светящимися стенками.
- river: река вместо одного ряда кварталов (axis x — вдоль x через z=4·line; axis z — вдоль z через x=4·line); улицы пересекают её только по мостам bridges (номера улиц c при axis x или r при axis z). Река есть с первого кадра, маршруты и машины пересекают её только по мостам.
- oneWay: улица с односторонним движением — axis x: улица z=4·street+2 от перекрёстка c=from до c=to; axis z: улица x=4·street+2 от r=from до r=to; бегущие шевроны показывают направление from → to. Маршрут по этому отрезку — только в направлении from → to.
- drivers: машины водителей. route '' — стоит на улице у перекрёстка c/r со сдвигом off (−1,6..1,6) вдоль axis, лицом dir (+/−); drive=[]. route=id — на маршруте: drive — ключи {at,u} (первый ключ — где ждёт, u не убывает, плавный разгон и остановка, не быстрее 6 единиц/с). states — смена вида на словах: idle (обычная белая), candidate (лавандовое кольцо — рассматривается), chosen (лавандовая машина с жёлтым кольцом — выбрана), busy (везёт пассажира: розовый огонёк на крыше), dim (приглушена — не выбрана). tags — табличка над машиной {at,text,tone}, следующая сменяет предыдущую, text '' — убрать. Не ставь водителя в реку и на один квартал друг на друга.
- pings: сигнал-запрос {at,target,tone} — три кольца расходятся по земле от водителя или метки target за 1,4 с (нажатие Request, заявка ушла).
- lines: линия между двумя объектами (id водителя или метки): style crow — пунктир «по прямой» низко над землёй; assign — назначение водитель → пассажир, дуга с бегущими точками. text — короткая подпись в середине или ''. Для «пачки»: сначала пары по близости (assign), затем на слове-причине их exit и новые assign крест-накрест.
Подписи — только слова и числа сценария. Это условная иллюстрация, не реальная карта и не интерфейс сервиса.`;

// ---- Pure math (copies of the core easings; this module must not import ./isometric at runtime) -----------------------
const clamp01=(x:number)=>Math.min(1,Math.max(0,x));
const smooth=(x:number)=>{const t=clamp01(x);return t*t*(3-2*t);};
const easeEnter=(x:number)=>1-(1-clamp01(x))**3;
const easeInOut=(x:number)=>{const t=clamp01(x);return t<.5?4*t*t*t:1-(-2*t+2)**3/2;};
const shown=(t:number,enterAt:number,exitAt:number,inDur=.45,outDur=.45)=>(t<enterAt?0:easeEnter((t-enterAt)/inDur))*(exitAt===Infinity?1:1-easeInOut(clamp01((t-exitAt)/outDur)));
const streetAt=(i:number)=>4*i+2;
export function posOnRoute(r:RoutePath,s:number):V3{
 const {P,S,L}=r,v=Math.min(L,Math.max(0,s));
 let lo=0,hi=S.length-1;
 while(hi-lo>1){const m=(lo+hi)>>1;if(S[m]<=v)lo=m;else hi=m;}
 const f=(v-S[lo])/Math.max(1e-9,S[hi]-S[lo]);
 return [P[lo][0]+(P[hi][0]-P[lo][0])*f,P[lo][1]+(P[hi][1]-P[lo][1])*f,P[lo][2]+(P[hi][2]-P[lo][2])*f];
}
/** Core `along` convention: yaw around +Y with forward = local +X. */
export function yawOnRoute(r:RoutePath,s:number){const a=posOnRoute(r,s-.12),b=posOnRoute(r,s+.12);return Math.atan2(-(b[2]-a[2]),b[0]-a[0]);}

// ---- Hex grid (pointy-top axial coordinates) -------------------------------------------------------------------------
export const hexDist=(q:number,r:number)=>(Math.abs(q)+Math.abs(r)+Math.abs(q+r))/2;
export function hexCenter(g:{x:number;z:number;size:number},q:number,r:number):[number,number]{return [g.x+g.size*Math.sqrt(3)*(q+r/2),g.z+g.size*1.5*r];}
export function hexCorners(g:{x:number;z:number;size:number},q:number,r:number,scale=1):[number,number][]{
 const [cx,cz]=hexCenter(g,q,r);
 return Array.from({length:6},(_,k)=>{const a=Math.PI/180*(60*k-30);return [cx+g.size*scale*Math.cos(a),cz+g.size*scale*Math.sin(a)] as [number,number];});
}
/** Cell that contains world point x/z (cube rounding). */
export function hexAt(g:{x:number;z:number;size:number},x:number,zz:number){
 const r=(zz-g.z)/(1.5*g.size),q=(x-g.x)/(g.size*Math.sqrt(3))-r/2,s=-q-r;
 let rq=Math.round(q),rr=Math.round(r);const rs=Math.round(s);
 const dq=Math.abs(rq-q),dr=Math.abs(rr-r),ds=Math.abs(rs-s);
 if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;
 return {q:rq+0,r:rr+0};
}
export function gridCells(rings:number){const out:{q:number;r:number;d:number}[]=[];for(let q=-rings;q<=rings;q++)for(let r=-rings;r<=rings;r++){const d=hexDist(q,r);if(d<=rings)out.push({q,r,d});}return out;}
/** Height of a lit cell's light wall per state. */
export const HEX_WALL:Record<HexState,number>={off:0,ring:.55,focus:.95,supply:.7,demand:.7};

// ---- River -----------------------------------------------------------------------------------------------------------
/** Half-width of the water: exactly the block area between the two embankment streets (blocks are 3 wide). */
export const RIVER_HALF=1.5;
/** Predicate for the core city: true where the river cuts the ground (no plates, buildings, dashes or lanes). */
export function riverCut(d?:DispatchPlan|null){
 const rv=d?.river;if(!rv)return null;
 const c=4*rv.line,bridges=rv.bridges.map(streetAt);
 const off=(x:number,z:number)=>Math.abs((rv.axis==="x"?z:x)-c);
 /** Block row and street markings removed by the river (a margin beyond the water). */
 const inBand=(x:number,z:number)=>off(x,z)<RIVER_HALF+.25;
 const onBridge=(x:number,z:number)=>bridges.some(b=>Math.abs((rv.axis==="x"?x:z)-b)<.62);
 return {axis:rv.axis,centre:c,bridges,inBand,onBridge,
  /** Ground point inside the band and not on a bridge. */
  wet:(x:number,z:number)=>off(x,z)<RIVER_HALF&&!onBridge(x,z),
  /** A street (along `ax`, at coordinate `coord`) crosses the river without a bridge. */
  cutsStreet:(ax:"x"|"z",coord:number)=>ax!==rv.axis&&!bridges.some(b=>Math.abs(coord-b)<.62)};
}

// ---- Drivers ---------------------------------------------------------------------------------------------------------
export const DRIVER_LANE=.23;
export const MAX_DRIVER_SPEED=6;
export function parkedSpot(d:{c:number;r:number;axis:"x"|"z";off:number;dir:"+"|"-"}){
 const sgn=d.dir==="+"?1:-1,lane=DRIVER_LANE*sgn;
 const x=d.axis==="x"?streetAt(d.c)+d.off:streetAt(d.c)-lane,z=d.axis==="x"?streetAt(d.r)+lane:streetAt(d.r)+d.off;
 const yaw=d.axis==="x"?(sgn>0?0:Math.PI):(sgn>0?-Math.PI/2:Math.PI/2);
 return {p:[x,0,z] as V3,yaw};
}
/** Smoothstep between consecutive keys: the car starts and stops at rest on every key (peak speed 1.5 × average). */
export function driveAt(keys:{t:number;s:number}[],t:number){
 if(!keys.length)return 0;if(t<=keys[0].t)return keys[0].s;
 for(let i=1;i<keys.length;i++)if(t<keys[i].t){const a=keys[i-1],b=keys[i];return a.s+(b.s-a.s)*smooth((t-a.t)/Math.max(1e-6,b.t-a.t));}
 return keys.at(-1)!.s;
}
export const DRIVER_TOP=.6;

// ---- Timeline --------------------------------------------------------------------------------------------------------
type At=(a:Anchor3D)=>number;
type MarkerRef={id:string;kind:string;point:V3};
const LINE_LIFT={crow:.2,assign:.25};
export function dispatchTimeline(d:DispatchPlan,routes:Map<string,RoutePath>,at:At,markers:MarkerRef[],markerTop:Record<string,number>){
 const grid=d.grid?{...d.grid,enterAt:at(d.grid.enter),exitAt:d.grid.exit?at(d.grid.exit):Infinity,cells:gridCells(d.grid.rings),
  marks:d.grid.marks.map(m=>({...m,at:at(m.at)})).sort((a,b)=>a.at-b.at)}:null;
 const drivers=d.drivers.map(v=>{
  const path=v.route?routes.get(v.route)??null:null,spot=parkedSpot(v);
  const keys=path?v.drive.map(k=>({t:at(k.at),s:k.u*path.L})).sort((a,b)=>a.t-b.t):[];
  return {id:v.id,path,spot,keys,enterAt:at(v.enter),exitAt:v.exit?at(v.exit):Infinity,
   states:v.states.map(k=>({at:at(k.at),state:k.state})).sort((a,b)=>a.at-b.at),
   tags:v.tags.map(k=>({at:at(k.at),text:k.text,tone:k.tone})).sort((a,b)=>a.at-b.at)};
 });
 const oneWay=d.oneWay.map(o=>({...o,enterAt:at(o.enter),exitAt:o.exit?at(o.exit):Infinity}));
 const lines=d.lines.map(l=>({...l,enterAt:at(l.enter),exitAt:l.exit?at(l.exit):Infinity}));
 const pings=(d.pings??[]).map(g=>({...g,at:at(g.at)})).sort((a,b)=>a.at-b.at);
 return {grid,river:d.river,cut:riverCut(d),drivers,oneWay,lines,pings,markers,markerTop};
}
export type DispatchTimeline=ReturnType<typeof dispatchTimeline>;

// ---- Frame state (renderer + continuity tests) ------------------------------------------------------------------------
/** Grid visibility of a cell (wave from the centre: 0.07 s per ring on entry, 0.04 s on exit). */
export function cellShown(g:NonNullable<DispatchTimeline["grid"]>,d:number,t:number){return shown(t,g.enterAt+.07*d,g.exitAt===Infinity?Infinity:g.exitAt+.04*d,.5,.5);}
/** State weights of one cell (off · ring · focus · supply · demand): each mark crossfades its rings in a wave (0.12 s per ring). */
export function cellMix(g:NonNullable<DispatchTimeline["grid"]>,q:number,r:number,t:number){
 const v=[1,0,0,0,0];
 for(const m of g.marks){
  if(t<m.at)break;
  const dd=hexDist(q-m.q,r-m.r);if(dd<Math.min(m.from,m.to)||dd>Math.max(m.from,m.to))continue;
  const w=easeInOut(clamp01((t-m.at-.12*(dd-Math.min(m.from,m.to)))/.5));if(w<=0)continue;
  const i=HEX_STATES.indexOf(m.state);for(let j=0;j<5;j++)v[j]+=((j===i?1:0)-v[j])*w;
 }
 return v;
}
export function driverState(v:DispatchTimeline["drivers"][number],t:number){
 const k=shown(t,v.enterAt,v.exitAt,.5,.45);
 const w=[1,0,0,0,0];
 for(const s of v.states){if(t<s.at)break;const m=easeInOut(clamp01((t-s.at)/.5)),i=DRIVER_STATES.indexOf(s.state);for(let j=0;j<5;j++)w[j]+=((j===i?1:0)-w[j])*m;}
 let p:V3,yaw:number,s=0;
 if(v.path){s=driveAt(v.keys,t);p=posOnRoute(v.path,s);yaw=yawOnRoute(v.path,s);}else{p=v.spot.p;yaw=v.spot.yaw;}
 const tags=v.tags.map((g,i)=>({text:g.text,tone:g.tone,k:(t<g.at?0:easeEnter((t-g.at)/.35))*(1-(v.tags[i+1]&&t>=v.tags[i+1].at?easeInOut(clamp01((t-v.tags[i+1].at)/.35)):0))*k}));
 return {k,w,p,yaw,s,tags};
}
export const endpoint=(tl:DispatchTimeline,ref:string,t:number,lift:number):V3=>{
 const dr=tl.drivers.find(v=>v.id===ref);if(dr){const s=driverState(dr,t);return [s.p[0],s.p[1]+lift,s.p[2]];}
 const m=tl.markers.find(x=>x.id===ref)!;return [m.point[0],m.point[1]+lift,m.point[2]];
};
export function lineState(tl:DispatchTimeline,l:DispatchTimeline["lines"][number],t:number){
 const lift=LINE_LIFT[l.style];
 return {k:shown(t,l.enterAt,l.exitAt,.3,.45),draw:easeInOut(clamp01((t-l.enterAt)/.8)),a:endpoint(tl,l.from,t,lift),b:endpoint(tl,l.to,t,lift)};
}
/** Point of a line at u: crow is straight; assign arcs up by 0.5 + 0.1·distance. */
export function linePoint(style:"crow"|"assign",a:V3,b:V3,u:number):V3{
 if(style==="crow")return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
 const dd=Math.hypot(b[0]-a[0],b[2]-a[2]),lift=.5+.1*dd,mid:V3=[(a[0]+b[0])/2,Math.max(a[1],b[1])+lift,(a[2]+b[2])/2];
 const w0=(1-u)**2,w1=2*(1-u)*u,w2=u*u;
 return [w0*a[0]+w1*mid[0]+w2*b[0],w0*a[1]+w1*mid[1]+w2*b[1],w0*a[2]+w1*mid[2]+w2*b[2]];
}
export const PING_SECONDS=1.4;
/** Rings of a ping: radius grows 0.3 → 2.4, opacity rises and falls (sin), three rings 0.25 s apart; 0 outside the ping. */
export function pingRings(g:{at:number},t:number){
 return [0,1,2].map(i=>{const x=(t-g.at-.25*i)/(PING_SECONDS-.5);const ph=clamp01(x);return {r:.3+2.1*easeEnter(ph),a:x<=0||x>=1?0:Math.sin(Math.PI*ph)};});
}
export function oneWayState(o:DispatchTimeline["oneWay"][number],t:number){return {k:shown(t,o.enterAt,o.exitAt,.6,.5)};}
export function oneWayEnds(o:{axis:"x"|"z";street:number;from:number;to:number}):[V3,V3]{
 const c=streetAt(o.street),a=streetAt(o.from),b=streetAt(o.to);
 return o.axis==="x"?[[a,0,c],[b,0,c]]:[[c,0,a],[c,0,b]];
}
/** Every visible scalar of the catalog for the continuity tests ("v:" weights, "p:" positions scaled to the per-frame limit). */
export function dispatchScalars(tl:DispatchTimeline,t:number){
 const out:Record<string,number>={};
 if(tl.grid){
  const g=tl.grid;
  for(const c of g.cells){if((c.q*7+c.r*3)%3)continue;out[`v:dx:cell:${c.q},${c.r}`]=cellShown(g,c.d,t);cellMix(g,c.q,c.r,t).forEach((v,j)=>out[`v:dx:cell:${c.q},${c.r}:${j}`]=v);}
 }
 for(const v of tl.drivers){const s=driverState(v,t);out[`v:dx:driver:${v.id}`]=s.k;s.w.forEach((w,j)=>out[`v:dx:driver:${v.id}:${j}`]=w);out[`p:dx:driver:${v.id}:x`]=s.p[0]/(MAX_DRIVER_SPEED/FPS*1.05);out[`p:dx:driver:${v.id}:z`]=s.p[2]/(MAX_DRIVER_SPEED/FPS*1.05);
  s.tags.forEach((g,i)=>out[`v:dx:driver:${v.id}:tag${i}`]=g.k);}
 for(const o of tl.oneWay)out[`v:dx:oneway:${o.id}`]=oneWayState(o,t).k;
 for(const l of tl.lines){const s=lineState(tl,l,t);out[`v:dx:line:${l.id}`]=s.k;out[`v:dx:line:${l.id}:draw`]=s.draw;}
 tl.pings.forEach((g,i)=>pingRings(g,t).forEach((r,j)=>out[`v:dx:ping:${i}:${j}`]=r.a));
 return out;
}

// ---- Validation (called by validateIsometric with its anchor/text checks) -------------------------------------------
type Ctx={check:(a:Anchor3D,what:string)=>number;span:(enter:Anchor3D,exit:Anchor3D|null,what:string,min?:number)=>readonly [number,number];text:(s:string,what:string)=>void;
 routes:Map<string,RoutePath>;markerIds:Set<string>;usedIds:Set<string>;
 /** Raw route waypoints of the plan (street-grid legs), to check bridges and one-way directions. */
 waypoints:Map<string,{c:number;r:number}[]>};
const E="Изометрия · диспетчер";
export function validateDispatch(d:DispatchPlan,ctx:Ctx){
 const {check,span,text,routes}=ctx,ids=new Set<string>();
 for(const x of [...d.drivers,...d.oneWay,...d.lines]){if(ids.has(x.id)||ctx.usedIds.has(x.id))throw new Error(`${E}: id ${x.id} повторяется.`);ids.add(x.id);}
 if(d.grid){
  const g=d.grid;span(g.enter,g.exit,"сетка шестиугольников",1.2);
  g.marks.forEach((m,i)=>{const t=check(m.at,`grid.marks[${i}]`);if(t<check(g.enter,"grid.enter")+.2)throw new Error(`${E}: ячейки сетки (marks[${i}]) красятся раньше, чем сетка появилась.`);
   if(hexDist(m.q,m.r)>g.rings)throw new Error(`${E}: ячейка ${m.q},${m.r} marks[${i}] вне нарисованной сетки (rings ${g.rings}).`);
   if(m.from>m.to)throw new Error(`${E}: marks[${i}]: from больше to.`);});
 }
 const cut=riverCut(d);
 if(d.river){
  const rv=d.river;if(new Set(rv.bridges).size!==rv.bridges.length)throw new Error(`${E}: мосты реки повторяются.`);
  // A river runs between two streets: its line must leave room for the embankment streets on both sides.
  if(Math.abs(rv.line)>6)throw new Error(`${E}: река слишком близко к краю города (line ${rv.line}); |line| ≤ 6.`);
 }
 // Routes cross the river only on bridges; one-way streets only forwards.
 for(const [rid,way] of ctx.waypoints){
  for(let i=1;i<way.length;i++){
   const a=way[i-1],b=way[i],ax:"x"|"z"=a.r===b.r?"x":"z";
   const coord=ax==="x"?streetAt(a.r):streetAt(a.c),lo=Math.min(ax==="x"?streetAt(a.c):streetAt(a.r),ax==="x"?streetAt(b.c):streetAt(b.r)),hi=Math.max(ax==="x"?streetAt(a.c):streetAt(a.r),ax==="x"?streetAt(b.c):streetAt(b.r));
   if(cut&&ax!==cut.axis&&cut.cutsStreet(ax,coord)&&lo<cut.centre&&hi>cut.centre)throw new Error(`${E}: маршрут ${rid} пересекает реку не по мосту (участок ${i-1}→${i}); мосты: ${d.river!.bridges.join(", ")}.`);
   for(const o of d.oneWay){
    if(o.axis!==ax||streetAt(o.street)!==coord)continue;
    const [p,q]=oneWayEnds(o),oa=ax==="x"?p[0]:p[2],ob=ax==="x"?q[0]:q[2],olo=Math.min(oa,ob),ohi=Math.max(oa,ob);
    if(Math.min(hi,ohi)-Math.max(lo,olo)<.5)continue;
    const fwd=Math.sign(ob-oa),go=Math.sign((ax==="x"?streetAt(b.c)-streetAt(a.c):streetAt(b.r)-streetAt(a.r)));
    if(fwd!==go)throw new Error(`${E}: маршрут ${rid} едет против одностороннего движения ${o.id} (участок ${i-1}→${i}).`);
   }
  }
 }
 for(const o of d.oneWay){
  if(o.from===o.to)throw new Error(`${E}: односторонний отрезок ${o.id} нулевой длины.`);
  span(o.enter,o.exit,`одностороннее ${o.id}`,1.2);
  const [p,q]=oneWayEnds(o);
  if(cut)for(let u=0;u<=1;u+=.05){const x=p[0]+(q[0]-p[0])*u,z=p[2]+(q[2]-p[2])*u;if(cut.wet(x,z))throw new Error(`${E}: одностороннее ${o.id} проходит по реке.`);}
 }
 const driverIds=new Set<string>(),spots:{id:string;p:V3}[]=[];
 for(const v of d.drivers){
  const [enter,exit]=span(v.enter,v.exit,`водитель ${v.id}`,1);
  v.states.forEach((k,i)=>{const t=check(k.at,`${v.id}.states[${i}]`);if(t<enter-.01)throw new Error(`${E}: водитель ${v.id} меняет вид (states[${i}]) раньше, чем появился.`);});
  v.tags.forEach((k,i)=>{check(k.at,`${v.id}.tags[${i}]`);text(k.text,`табличка водителя ${v.id}`);});
  for(let i=1;i<v.tags.length;i++)if(check(v.tags[i].at,"")-check(v.tags[i-1].at,"")<.6)throw new Error(`${E}: таблички водителя ${v.id} сменяются быстрее 0,6 с.`);
  let p0:V3;
  if(v.route){
   const p=routes.get(v.route);if(!p)throw new Error(`${E}: водитель ${v.id} стоит на неизвестном маршруте «${v.route}».`);
   if(!v.drive.length)throw new Error(`${E}: водитель ${v.id} на маршруте требует хотя бы один ключ drive (где он ждёт).`);
   const keys=v.drive.map((k,i)=>({t:check(k.at,`${v.id}.drive[${i}]`),s:k.u*p.L,u:k.u}));
   for(let i=1;i<keys.length;i++){
    if(keys[i].u<keys[i-1].u)throw new Error(`${E}: водитель ${v.id} едет назад между ключами drive ${i-1} и ${i}; u не должен убывать.`);
    const dt=keys[i].t-keys[i-1].t;if(keys[i].s>keys[i-1].s+1e-6&&dt<.6)throw new Error(`${E}: ключи drive водителя ${v.id} ${i-1} и ${i} ближе 0,6 с.`);
    const peak=1.5*(keys[i].s-keys[i-1].s)/Math.max(1e-6,dt);if(peak>MAX_DRIVER_SPEED)throw new Error(`${E}: водитель ${v.id} между ключами drive ${i-1} и ${i} разгоняется до ${peak.toFixed(1)} ед./с — быстрее ${MAX_DRIVER_SPEED}; дай больше времени.`);
   }
   if(keys.length>1&&keys[0].t<enter+.3&&keys[1].s>keys[0].s)throw new Error(`${E}: водитель ${v.id} трогается раньше, чем появился (первый ключ drive — стоянка не раньше enter+0,3 с).`);
   if(keys.length>1&&keys.at(-1)!.t>exit-.2)throw new Error(`${E}: водитель ${v.id} исчезает, не доехав.`);
   p0=posOnRoute(p,keys[0].s);
  }else{
   if(v.drive.length)throw new Error(`${E}: у стоящего водителя ${v.id} (route '') drive должен быть пустым.`);
   p0=parkedSpot(v).p;
   if(cut&&cut.wet(p0[0],p0[2]))throw new Error(`${E}: водитель ${v.id} стоит в реке.`);
   // A parked car sits on a street (the side offset keeps it in its lane), not inside a block.
   const along=v.axis==="x"?p0[0]:p0[2],fromCross=Math.abs(((along-2)%4+4)%4);
   if(Math.min(fromCross,4-fromCross)>1.62)throw new Error(`${E}: водитель ${v.id} заехал за перекрёсток; |off| ≤ 1,6.`);
  }
  for(const q of spots)if(Math.hypot(q.p[0]-p0[0],q.p[2]-p0[2])<.7)throw new Error(`${E}: водители ${q.id} и ${v.id} стоят друг на друге.`);
  spots.push({id:v.id,p:p0});driverIds.add(v.id);
 }
 for(const [i,g] of (d.pings??[]).entries()){
  if(!driverIds.has(g.target)&&!ctx.markerIds.has(g.target))throw new Error(`${E}: сигнал pings[${i}] ссылается на неизвестный объект «${g.target}».`);
  const t=check(g.at,`pings[${i}]`),v=d.drivers.find(x=>x.id===g.target);
  if(v&&(t<check(v.enter,"")||(v.exit&&t+PING_SECONDS>check(v.exit,""))))throw new Error(`${E}: сигнал pings[${i}] звучит, когда водителя ${g.target} нет на экране.`);
 }
 for(const l of d.lines){
  for(const ref of [l.from,l.to])if(!driverIds.has(ref)&&!ctx.markerIds.has(ref))throw new Error(`${E}: линия ${l.id} ссылается на неизвестный объект «${ref}» (нужен id водителя или метки).`);
  if(l.from===l.to)throw new Error(`${E}: линия ${l.id} соединяет объект сам с собой.`);
  text(l.text,`подпись линии ${l.id}`);span(l.enter,l.exit,`линия ${l.id}`,1);
  const ends=[l.from,l.to].map(ref=>d.drivers.find(v=>v.id===ref));
  ends.forEach((v,i)=>{if(!v)return;const [ve,vx]=[check(v.enter,""),v.exit?check(v.exit,""):Infinity],[le,lx]=[check(l.enter,""),l.exit?check(l.exit,""):Infinity];
   if(le<ve-.01||lx>vx+.5)throw new Error(`${E}: линия ${l.id} видна, когда водителя ${i?l.to:l.from} ещё/уже нет.`);});
 }
}
/** On-screen texts of the catalog for the independent written-text audit. */
export function dispatchTexts(d?:DispatchPlan|null){return d?[...d.drivers.flatMap(v=>v.tags.map(g=>g.text)),...d.lines.map(l=>l.text)].filter(Boolean):[];}
/** Points that must stay visible from every camera azimuth (occlusion guard of the core city). */
export function dispatchGuardPoints(d:DispatchPlan|undefined|null,routes:Map<string,RoutePath>):V3[]{
 if(!d)return [];
 const pts:V3[]=[];
 for(const v of d.drivers){
  const ps:V3[]=[];
  if(v.route){const p=routes.get(v.route);if(!p||!v.drive.length)continue;const s0=Math.min(...v.drive.map(k=>k.u))*p.L,s1=Math.max(...v.drive.map(k=>k.u))*p.L;for(let s=s0;s<=s1+1e-9;s+=.4)ps.push(posOnRoute(p,s));if(s1-s0<.4)ps.push(posOnRoute(p,s1));}
  else ps.push(parkedSpot(v).p);
  for(const q of ps)for(let y=0;y<=DRIVER_TOP+1e-9;y+=.3)pts.push([q[0],q[1]+y,q[2]]);
 }
 return pts;
}
/** Framing points: each driver when it appears (and where it stops), the grid's lit centre cell. */
export function dispatchFocus(d:DispatchPlan|undefined|null,routes:Map<string,RoutePath>,at:At,total:number){
 if(!d)return [];
 const out:{t:number;p:V3;what:string;relaxed?:boolean}[]=[];
 for(const v of d.drivers){
  const enter=at(v.enter),exit=v.exit?at(v.exit):Infinity,t=Math.min(enter+1,(enter+Math.min(exit,enter+20))/2);if(t>total)continue;
  if(v.route){const p=routes.get(v.route);if(!p||!v.drive.length)continue;out.push({t,p:posOnRoute(p,v.drive[0].u*p.L),what:`водитель ${v.id}`});
   const last=v.drive.at(-1)!,tl=at(last.at)+.2;if(v.drive.length>1&&tl<=total&&tl<exit)out.push({t:tl,p:posOnRoute(p,last.u*p.L),what:`водитель ${v.id} на месте`,relaxed:true});}
  else out.push({t,p:parkedSpot(v).p,what:`водитель ${v.id}`});
 }
 if(d.grid){const t=at(d.grid.enter)+.6;if(t<=total)out.push({t,p:[d.grid.x,0,d.grid.z],what:"центр сетки шестиугольников",relaxed:true});}
 return out;
}
type StoryEvent={at:number;kind:"route"|"marker"|"pin"|"zone"|"district"|"link"|"card";tone:"info"|"ok"|"warn"|"number"};
/** Story moments for sound and the music arrangement, in the core event vocabulary (marker → object-enter, link/route → connect, the rest → highlight). */
export function dispatchStoryEvents(tl:DispatchTimeline):StoryEvent[]{
 const ev:StoryEvent[]=[];
 if(tl.grid){ev.push({at:tl.grid.enterAt,kind:"route",tone:"info"});
  for(const m of tl.grid.marks)ev.push({at:m.at,kind:"district",tone:m.state==="demand"?"warn":m.state==="supply"?"ok":m.state==="focus"?"number":"info"});}
 for(const v of tl.drivers){ev.push({at:v.enterAt,kind:"marker",tone:"info"});
  for(const s of v.states)if(s.state==="chosen")ev.push({at:s.at,kind:"pin",tone:"ok"});else if(s.state==="candidate")ev.push({at:s.at,kind:"pin",tone:"info"});}
 for(const o of tl.oneWay)ev.push({at:o.enterAt,kind:"zone",tone:"warn"});
 for(const l of tl.lines)ev.push({at:l.enterAt,kind:"link",tone:l.tone});
 for(const g of tl.pings)ev.push({at:g.at,kind:"pin",tone:g.tone});
 return ev;
}
export function dispatchEventTimes(tl:DispatchTimeline){
 return [...(tl.grid?[tl.grid.enterAt,tl.grid.exitAt,...tl.grid.marks.map(m=>m.at)]:[]),
  ...tl.drivers.flatMap(v=>[v.enterAt,v.exitAt,...v.keys.map(k=>k.t),...v.states.map(s=>s.at),...v.tags.map(g=>g.at)]),
  ...tl.oneWay.flatMap(o=>[o.enterAt,o.exitAt]),...tl.lines.flatMap(l=>[l.enterAt,l.exitAt]),...tl.pings.map(g=>g.at)].filter(t=>Number.isFinite(t));
}
