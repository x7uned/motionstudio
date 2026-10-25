import {z} from "zod";
import {anchor3dSchema,type Anchor3D} from "./scene3d";
import type {RoutePath,V3} from "./isometric";

// isometric speedcam catalog (2026-10-22, «This Camera Doesn't Measure Your Speed»): prepared road-enforcement objects
// for the «Изометрия» city — an ANPR camera gantry over the road with a scanning beam and a plate-read flash, a spot
// speed camera on a pole with a radar cone, a section bracket between two cameras, cars driven by word-anchored
// positions (smooth speed, automatic brake lights), steady traffic flows that brake for pole cameras, uplink arcs to a
// marker, and a recorded speed trace with average/limit guides and the mean-value point. The director returns only this
// JSON (field `speedcam` of the isometric plan); every value is a pure function of the plan and the frame time.
// This module imports no runtime code from ./isometric (type-only), so the core can import it without a cycle.

const FPS=30;
const id=z.string().regex(/^[a-z][a-z0-9-]{0,23}$/);
const tone=z.enum(["info","ok","warn","number"]);
const routeId=z.string().max(24);
export const SPEEDCAM_CAMERA_KINDS=["gantry","pole"] as const;
export type SpeedcamCameraKind=typeof SPEEDCAM_CAMERA_KINDS[number];
export const speedcamSchema=z.object({
 /** Cars driven along a route by word-anchored positions: u (0..1 of the route) at a word; speed between keys is a
  *  smooth curve that starts and ends at rest, never backwards. */
 cars:z.array(z.object({id,route:routeId,tone:z.enum(["hero","plain"]),enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
  drive:z.array(z.object({at:anchor3dSchema,u:z.number().min(0).max(1)})).min(1).max(12)})).max(3),
 /** Steady traffic in one lane of a route ("with" = the lane of driven cars, "against" = the opposite lane); cars slow
  *  down before every pole camera on that route and speed up after it (brake lights). */
 flows:z.array(z.object({route:routeId,lane:z.enum(["with","against"]),density:z.number().min(0).max(1),enter:anchor3dSchema,exit:anchor3dSchema.nullable()})).max(4),
 cameras:z.array(z.object({id,kind:z.enum(SPEEDCAM_CAMERA_KINDS),route:routeId,u:z.number().min(0).max(1),
  text:z.string().max(22),tone,enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
  /** Word on which only the tag fades out (the camera stays); null — the tag stays with the camera. */
  textExit:anchor3dSchema.nullable().optional(),
  /** id of a driven car: the camera flashes (plate read / radar shot) the moment that car passes u; '' = none. */
  reads:z.string().max(24),
  /** Beam strength 0..1 on words (gantry: ANPR scan fan; pole: radar cone). Starts at 0.6 when the camera appears. */
  scan:z.array(z.object({at:anchor3dSchema,value:z.number().min(0).max(1)})).max(8)})).max(10),
 /** Bracket on the road edge between two cameras of one route (the measured section), drawn from the first to the second. */
 sections:z.array(z.object({id,from:id,to:id,text:z.string().max(22),tone,enter:anchor3dSchema,exit:anchor3dSchema.nullable()})).max(4),
 /** Data arc from a camera to a marker of the plan (e.g. a hub building) with running packets. */
 uplinks:z.array(z.object({from:id,to:id,tone,enter:anchor3dSchema,exit:anchor3dSchema.nullable()})).max(6),
 /** Recorded speed of a driven car between two cameras, drawn as a glowing curtain over its lane. average — dashed line
  *  at the car's average speed between the two reads; limit — dashed line at ratio × average (parts of the curtain above
  *  it turn pink); match — the moment the car's speed equalled its average (mean value theorem). */
 traces:z.array(z.object({id,car:id,from:id,to:id,enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
  average:z.object({text:z.string().max(22),enter:anchor3dSchema,exit:anchor3dSchema.nullable()}).nullable(),
  limit:z.object({ratio:z.number().min(.5).max(.98),text:z.string().max(22),enter:anchor3dSchema,exit:anchor3dSchema.nullable()}).nullable(),
  match:z.object({text:z.string().max(22),enter:anchor3dSchema,exit:anchor3dSchema.nullable()}).nullable()})).max(1),
});
export type SpeedcamPlan=z.infer<typeof speedcamSchema>;
export const SPEEDCAM_GUIDE=`ДОРОЖНЫЙ КОНТРОЛЬ (необязательное поле speedcam; null — не нужно). Подготовленные предметы для роликов о камерах скорости:
- cameras: kind gantry — рамка над дорогой с камерами распознавания номеров (ANPR): сканирующий луч на полосу и вспышка чтения номера; kind pole — точечная камера скорости на столбе у обочины с радарным конусом. route/u — место на маршруте; text — короткая табличка из сценария или ''; textExit — слово, на котором гаснет только табличка (null — держится с камерой). Таблички камер, отрезков и шторки сами гаснут на общих планах (zoom < 40); reads — id машины из cars: вспышка ровно в момент, когда эта машина проезжает u (камера должна быть видна в этот момент); scan — сила луча 0..1 на словах (по умолчанию 0,6).
- cars: машина, которую ты ведёшь по словам: drive — ключи {at, u} (u не убывает, первый ключ — стоянка/старт; скорость между ключами плавная, стоп-сигналы загораются сами при торможении; не быстрее 10 единиц/с). Вспышка камеры случится, когда машина проедет её u: поставь ключ drive {at: слово чтения, u: u камеры}. tone hero — лавандовая машина героя с номером.
- flows: ровный поток машин в полосе маршрута (with — полоса машин cars, against — встречная); перед каждой камерой pole на этом маршруте поток тормозит и снова разгоняется. Не ставь поток with на маршрут, где едет машина героя (столкновения не проверяются) — используй against.
- sections: скобка-отрезок вдоль обочины между двумя камерами одного маршрута (from → to), рисуется от первой ко второй; text — подпись в середине (например длина участка из сценария).
- uplinks: дуга данных от камеры к метке плана (обычно hub — «система/компьютер») с бегущими пакетами.
- traces: записанная скорость машины между камерами from и to — светящаяся «шторка» над её полосой (высота = скорость), прорисовывается от первой камеры ко второй на слове enter; average — пунктир средней скорости машины между вспышками; limit — пунктир на ratio×средней (например лимит 100 при средней 120 → 0.833), где шторка выше — она розовая; match — точка, где скорость равнялась средней (теорема о среднем), с табличкой. Машина должна проехать обе камеры до enter.
Камеры, скобки и шторка — только на маршрутах из routes; эстакада (deckLeg) подходит для трассы. Подписи — только слова и числа сценария.`;

// ---- Pure math (copies of the core easings; this module must not import ./isometric at runtime) -----------------------
const clamp01=(x:number)=>Math.min(1,Math.max(0,x));
const smooth=(x:number)=>{const t=clamp01(x);return t*t*(3-2*t);};
const easeEnter=(x:number)=>1-(1-clamp01(x))**3;
const easeInOut=(x:number)=>{const t=clamp01(x);return t<.5?4*t*t*t:1-(-2*t+2)**3/2;};
const shown=(t:number,enterAt:number,exitAt:number,inDur=.45,outDur=.45)=>(t<enterAt?0:easeEnter((t-enterAt)/inDur))*(exitAt===Infinity?1:1-easeInOut(clamp01((t-exitAt)/outDur)));
const keyed=(t:number,keys:{at:number;value:number}[],initial:number,dur=.6)=>{let v=initial;for(const k of keys){if(t<k.at)break;v+=(k.value-v)*easeInOut(clamp01((t-k.at)/dur));}return v;};
const fract=(v:number)=>v-Math.floor(v);
const rnd=(n:number)=>fract(Math.sin(n*127.1+311.7)*43758.5453);
export function posOn(r:RoutePath,s:number):V3{
 const {P,S,L}=r,v=Math.min(L,Math.max(0,s));
 let lo=0,hi=S.length-1;
 while(hi-lo>1){const m=(lo+hi)>>1;if(S[m]<=v)lo=m;else hi=m;}
 const f=(v-S[lo])/Math.max(1e-9,S[hi]-S[lo]);
 return [P[lo][0]+(P[hi][0]-P[lo][0])*f,P[lo][1]+(P[hi][1]-P[lo][1])*f,P[lo][2]+(P[hi][2]-P[lo][2])*f];
}
/** Same convention as the core `along`: yaw around +Y (forward = local +X), pitch, unit side vector (local +Z). */
export function frameOn(r:RoutePath,s:number){
 const p=posOn(r,s),a=posOn(r,s-.12),b=posOn(r,s+.12);
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],hz=Math.hypot(dx,dz)||1e-9;
 return {p,yaw:Math.atan2(-dz,dx),pitch:Math.atan2(dy,hz),side:[-dz/hz,dx/hz] as [number,number]};
}
/** Lane offsets from the route axis (local +Z = side): driven cars and "with" flows on +, "against" flows on −. */
export const LANE=.24;
export const GANTRY={post:.72,deckPost:.47,beam:1.8,bar:.26,top:2.12,camY:1.56,housing:1.5};
export const POLE={side:.74,height:1.55,housing:1.45};
/** Radar cone of a pole camera on the road (local frame): apex at x0, far edge at x1, half width at the far edge. */
export const RADAR={x0:-.25,x1:-2.5,half:.72};
export const TRACE_H=2;
/** Height above the road that must stay visible (occlusion guard). */
export const SPEEDCAM_TOP={gantry:GANTRY.top+.05,pole:POLE.height+.3,trace:TRACE_H+.15};

// ---- Drive: monotone cubic Hermite through the word-anchored keys ------------------------------------------------------
/** Position along the route for time t: Fritsch–Carlson monotone Hermite, zero speed at the first and last key. */
export function driveCurve(keys:{t:number;s:number}[]){
 const n=keys.length;
 if(n===1)return {at:(_:number)=>keys[0].s,speed:(_:number)=>0};
 const d=keys.slice(1).map((k,i)=>(k.s-keys[i].s)/Math.max(1e-6,k.t-keys[i].t));
 const m=keys.map((_,i)=>i===0||i===n-1?0:d[i-1]*d[i]<=0?0:3*(d[i-1]+d[i])/((2*d[i]+d[i-1])/d[i-1]+(d[i]+2*d[i-1])/d[i]));
 for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=0;m[i+1]=0;continue;}const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const k=3/Math.sqrt(h);m[i]=k*a*d[i];m[i+1]=k*b*d[i];}}
 const seg=(t:number)=>{let i=0;while(i<n-2&&t>=keys[i+1].t)i++;return i;};
 const at=(t:number)=>{
  if(t<=keys[0].t)return keys[0].s;if(t>=keys[n-1].t)return keys[n-1].s;
  const i=seg(t),h=keys[i+1].t-keys[i].t,x=(t-keys[i].t)/h,x2=x*x,x3=x2*x;
  return (2*x3-3*x2+1)*keys[i].s+(x3-2*x2+x)*h*m[i]+(-2*x3+3*x2)*keys[i+1].s+(x3-x2)*h*m[i+1];
 };
 const speed=(t:number)=>{
  if(t<=keys[0].t||t>=keys[n-1].t)return 0;
  const i=seg(t),h=keys[i+1].t-keys[i].t,x=(t-keys[i].t)/h,x2=x*x;
  return ((6*x2-6*x)*keys[i].s+(3*x2-4*x+1)*h*m[i]+(-6*x2+6*x)*keys[i+1].s+(3*x2-2*x)*h*m[i+1])/h;
 };
 return {at,speed};
}
export const MAX_DRIVE_SPEED=10;
/** Brake light 0..1 from the speed drop over ±0.2 s (continuous: the speed is continuous). */
const brakeOf=(speed:(t:number)=>number,t:number)=>clamp01((speed(t-.25)-speed(t+.25))/.5/1.6)*smooth(speed(t)/.6+.3);
export const BRAKE_SLEW=.12;

// ---- Flows: lane traffic with a speed profile that dips before pole cameras -----------------------------------------
const FLOW_V=3.1,FLOW_GAP=3.4,FLOW_STEP=.05;
function flowProfile(L:number,poles:number[],dir:1|-1){
 // Speed along the travel distance d (0 → L): a dip of 55 % centred 0.3 before each camera, eased over ~2.6/2 units.
 const v=(d:number)=>{let k=1;for(const c of poles){const x=(dir>0?c:L-c)-.3-d;k*=1-.58*(x>=0?smooth(1-x/2.6):smooth(1+x/2.1));}return FLOW_V*k;};
 const n=Math.ceil(L/FLOW_STEP),T=new Float64Array(n+1);
 for(let i=1;i<=n;i++){const a=(i-1)*FLOW_STEP,b=Math.min(L,i*FLOW_STEP);T[i]=T[i-1]+(b-a)/((v(a)+v(b))/2);}
 return {v,T,period:T[n]};
}
const invert=(T:Float64Array,tau:number,L:number)=>{let lo=0,hi=T.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(T[m]<=tau)lo=m;else hi=m;}const f=(tau-T[lo])/Math.max(1e-9,T[hi]-T[lo]);return Math.min(L,(lo+f)*FLOW_STEP);};

// ---- Timeline ----------------------------------------------------------------------------------------------------------
type At=(a:Anchor3D)=>number;
type MarkerRef={id:string;kind:string;point:V3};
export function speedcamTimeline(sc:SpeedcamPlan,routes:Map<string,RoutePath>,at:At,frames:number,markers:MarkerRef[],markerTop:Record<string,number>){
 const cars=sc.cars.map(c=>{
  const path=routes.get(c.route)!,keys=c.drive.map(k=>({t:at(k.at),s:k.u*path.L})).sort((a,b)=>a.t-b.t);
  const curve=driveCurve(keys),s=new Float64Array(frames),v=new Float64Array(frames),brake=new Float64Array(frames);
  // Brake lights follow the deceleration, slew-limited to BRAKE_SLEW per frame (never a one-frame switch).
  for(let f=0;f<frames;f++){s[f]=curve.at(f/FPS);v[f]=curve.speed(f/FPS);const target=brakeOf(curve.speed,f/FPS),prev=f?brake[f-1]:0;brake[f]=prev+Math.max(-BRAKE_SLEW,Math.min(BRAKE_SLEW,target-prev));}
  return {id:c.id,route:c.route,tone:c.tone,path,curve,keys,enterAt:at(c.enter),exitAt:c.exit?at(c.exit):Infinity,s,v,brake};
 });
 const carOf=(id:string)=>cars.find(c=>c.id===id);
 const crossing=(car:ReturnType<typeof carOf>,s:number)=>{
  if(!car)return NaN;const {keys,curve}=car;if(keys[0].s>=s-1e-6)return NaN;
  for(let i=1;i<keys.length;i++)if(keys[i].s>=s-1e-6){let lo=keys[i-1].t,hi=keys[i].t;for(let k=0;k<50;k++){const m=(lo+hi)/2;if(curve.at(m)<s)lo=m;else hi=m;}return hi;}
  return NaN;
 };
 const cameras=sc.cameras.map(c=>{
  const path=routes.get(c.route)!,sAt=c.u*path.L,fr=frameOn(path,sAt),car=carOf(c.reads);
  const read=car&&car.route===c.route?crossing(car,sAt):NaN;
  return {...c,path,sAt,point:fr.p,yaw:fr.yaw,pitch:fr.pitch,side:fr.side,deck:fr.p[1]>.3,enterAt:at(c.enter),exitAt:c.exit?at(c.exit):Infinity,textExitAt:c.textExit?at(c.textExit):Infinity,
   readAt:read,scanKeys:c.scan.map(k=>({at:at(k.at),value:k.value})).sort((a,b)=>a.at-b.at)};
 });
 const camOf=(id:string)=>cameras.find(c=>c.id===id)!;
 const flows=sc.flows.map((f,i)=>{
  const path=routes.get(f.route)!,dir=f.lane==="with"?1:-1 as 1|-1,poles=cameras.filter(c=>c.kind==="pole"&&c.route===f.route).map(c=>c.sAt);
  const prof=flowProfile(path.L,poles,dir),n=Math.max(1,Math.round(f.density*Math.max(1,path.L/FLOW_GAP)));
  return {route:f.route,lane:f.lane,dir,path,prof,n,phase:Array.from({length:n},(_,k)=>fract(k/n+.37*rnd(i*13.7+k)/n)),enterAt:at(f.enter),exitAt:f.exit?at(f.exit):Infinity,poles};
 });
 const sections=sc.sections.map(s=>{const a=camOf(s.from),b=camOf(s.to);return {...s,path:a.path,s0:Math.min(a.sAt,b.sAt),s1:Math.max(a.sAt,b.sAt),forward:b.sAt>=a.sAt,enterAt:at(s.enter),exitAt:s.exit?at(s.exit):Infinity};});
 const uplinks=sc.uplinks.map(u=>{const c=camOf(u.from),m=markers.find(x=>x.id===u.to)!;
  return {...u,a:[c.point[0],c.point[1]+(c.kind==="gantry"?GANTRY.top:POLE.height+.35),c.point[2]] as V3,b:[m.point[0],m.point[1]+(markerTop[m.kind]??.6)*.8,m.point[2]] as V3,enterAt:at(u.enter),exitAt:u.exit?at(u.exit):Infinity};});
 const traces=sc.traces.map(tr=>{
  const car=carOf(tr.car)!,a=camOf(tr.from),b=camOf(tr.to),tA=crossing(car,a.sAt),tB=crossing(car,b.sAt);
  const N=96,samples:{s:number;v:number}[]=[];
  for(let j=0;j<=N;j++){const s=a.sAt+(b.sAt-a.sAt)*j/N;let lo=tA,hi=tB;for(let k=0;k<40;k++){const m=(lo+hi)/2;if(car.curve.at(m)<s)lo=m;else hi=m;}samples.push({s,v:car.curve.speed(hi)});}
  const average=(b.sAt-a.sAt)/Math.max(1e-6,tB-tA),top=Math.max(average*1.05,...samples.map(p=>p.v));
  // Mean value theorem: the last moment between the reads when the speed crosses the average.
  let tm=(tA+tB)/2;
  for(let k=1;k<=400;k++){const t0=tA+(tB-tA)*(k-1)/400,t1=tA+(tB-tA)*k/400,f0=car.curve.speed(t0)-average,f1=car.curve.speed(t1)-average;if(f0===0||f0*f1<0){let lo=t0,hi=t1;for(let i=0;i<40;i++){const m=(lo+hi)/2;if((car.curve.speed(m)-average)*f0>0)lo=m;else hi=m;}tm=hi;}}
  const ratio=tr.limit?.ratio??0;
  return {id:tr.id,car:tr.car,path:car.path,s0:a.sAt,s1:b.sAt,tA,tB,samples,scale:TRACE_H/top,average,avgH:average/top*TRACE_H,limitH:ratio*average/top*TRACE_H,
   match:{t:tm,s:car.curve.at(tm)},enterAt:at(tr.enter),exitAt:tr.exit?at(tr.exit):Infinity,
   avg:tr.average?{text:tr.average.text,enterAt:at(tr.average.enter),exitAt:tr.average.exit?at(tr.average.exit):Infinity}:null,
   limit:tr.limit?{text:tr.limit.text,enterAt:at(tr.limit.enter),exitAt:tr.limit.exit?at(tr.limit.exit):Infinity}:null,
   matchShow:tr.match?{text:tr.match.text,enterAt:at(tr.match.enter),exitAt:tr.match.exit?at(tr.match.exit):Infinity}:null};
 });
 return {cars,cameras,flows,sections,uplinks,traces};
}
export type SpeedcamTimeline=ReturnType<typeof speedcamTimeline>;

// ---- Frame state (renderer + continuity tests) ------------------------------------------------------------------------
/** Read flash: rises over 0.18 s (≤0.28 per frame) and decays over 0.7 s; 0 before the read. */
export const flashPulse=(x:number)=>x<0?0:x<.18?smooth(x/.18):1-easeInOut((x-.18)/.7);
/** Plate highlight after a read: in 0.2 s, holds, out over 0.6 s. */
export const plateGlow=(x:number)=>x<0?0:x<.2?smooth(x/.2):x<1.4?1:1-easeInOut((x-1.4)/.6);
export function speedcamCarState(c:SpeedcamTimeline["cars"][number],t:number){
 const f=Math.max(0,Math.min(c.s.length-1,Math.round(t*FPS)));
 return {s:c.s[f],v:c.v[f],brake:c.brake[f],k:shown(t,c.enterAt,c.exitAt,.5,.45)};
}
export function cameraState(c:SpeedcamTimeline["cameras"][number],t:number,tl:SpeedcamTimeline){
 const k=shown(t,c.enterAt,c.exitAt);
 const scan=keyed(t,c.scanKeys,.6)*k;
 let flash=Number.isFinite(c.readAt)?flashPulse(t-c.readAt):0;
 // A pole camera also shoots every flow car that passes it while its radar is on.
 if(c.kind==="pole")for(const f of tl.flows)if(f.route===c.route){
  const d=f.dir>0?c.sAt:f.path.L-c.sAt,tau=f.prof.T[Math.min(f.prof.T.length-1,Math.round(d/FLOW_STEP))];
  f.phase.forEach((ph,i)=>{const x=fract((t-f.enterAt-tau)/f.prof.period+ph)*f.prof.period;flash=Math.max(flash,flashPulse(x)*.55*flowCarVisible(f,i,t)*clamp01(scan/.5));});
 }
 return {k,scan,flash:flash*k};
}
function flowCarVisible(f:SpeedcamTimeline["flows"][number],i:number,t:number){
 // A car that starts a new lap after the flow's exit does not come back; it already shrank at the lane end.
 const P=f.prof.period,tau=fract((t-f.enterAt)/P+f.phase[i])*P,lapStart=t-tau;
 return lapStart>f.exitAt?0:shown(t,f.enterAt,Infinity,.6);
}
export function flowCars(f:SpeedcamTimeline["flows"][number],t:number){
 const P=f.prof.period,L=f.path.L;
 return f.phase.map((ph,i)=>{
  const tau=fract((t-f.enterAt)/P+ph)*P,d=invert(f.prof.T,tau,L),s=f.dir>0?d:L-d;
  const vNow=f.prof.v(d),vAhead=f.prof.v(Math.min(L,d+.5));
  return {i,s,brake:clamp01((vNow-vAhead)/(FLOW_V*.18)),k:flowCarVisible(f,i,t)*smooth(d/1.2)*smooth((L-d)/1.2)};
 });
}
export function sectionState(s:SpeedcamTimeline["sections"][number],t:number){
 return {k:shown(t,s.enterAt,s.exitAt),draw:easeInOut(clamp01((t-s.enterAt)/Math.max(1.2,Math.min(2.4,.8+(s.s1-s.s0)/14))))};
}
export function uplinkState(u:SpeedcamTimeline["uplinks"][number],t:number){return {k:shown(t,u.enterAt,u.exitAt,.3,.45),draw:easeInOut(clamp01((t-u.enterAt)/.8))};}
export const traceDrawSeconds=(len:number)=>Math.max(1.4,Math.min(2.6,1+len/14));
export function traceState(tr:SpeedcamTimeline["traces"][number],t:number){
 const k=shown(t,tr.enterAt,tr.exitAt),reveal=easeInOut(clamp01((t-tr.enterAt)/traceDrawSeconds(Math.abs(tr.s1-tr.s0))));
 const g=(x:{enterAt:number;exitAt:number}|null)=>x?shown(t,x.enterAt,x.exitAt)*k:0;
 const line=(x:{enterAt:number}|null)=>x?easeInOut(clamp01((t-x.enterAt)/.9)):0;
 return {k,reveal,avg:g(tr.avg),avgDraw:line(tr.avg),limit:g(tr.limit),limitDraw:line(tr.limit),match:g(tr.matchShow)};
}
/** Speed (scene units/s) at route distance s inside the trace, linearly from the recorded samples. */
export function traceSpeedAt(tr:SpeedcamTimeline["traces"][number],s:number){
 const n=tr.samples.length-1,f=clamp01((s-tr.s0)/((tr.s1-tr.s0)||1))*n,i=Math.min(n-1,Math.floor(f));
 return tr.samples[i].v+(tr.samples[i+1].v-tr.samples[i].v)*(f-i);
}
/** Every visible scalar of the catalog for the continuity tests ("v:" weights, "p:" positions scaled to the per-frame limit). */
export function speedcamScalars(tl:SpeedcamTimeline,t:number){
 const out:Record<string,number>={};
 for(const c of tl.cars){const s=speedcamCarState(c,t);out[`v:sc:car:${c.id}`]=s.k;out[`v:sc:car:${c.id}:brake`]=s.brake;out[`p:sc:car:${c.id}:s`]=s.s/(MAX_DRIVE_SPEED/FPS*1.05);}
 for(const c of tl.cameras){const s=cameraState(c,t,tl);out[`v:sc:cam:${c.id}`]=s.k;out[`v:sc:cam:${c.id}:scan`]=s.scan;out[`v:sc:cam:${c.id}:flash`]=s.flash;
  if(Number.isFinite(c.readAt))out[`v:sc:cam:${c.id}:plate`]=plateGlow(t-c.readAt);}
 tl.flows.forEach((f,fi)=>flowCars(f,t).forEach(c=>{out[`v:sc:flow:${fi}:${c.i}`]=c.k;out[`v:sc:flow:${fi}:${c.i}:brake`]=c.brake*c.k;}));
 for(const s of tl.sections){const q=sectionState(s,t);out[`v:sc:section:${s.id}`]=q.k;out[`v:sc:section:${s.id}:draw`]=q.draw;}
 tl.uplinks.forEach((u,i)=>{const q=uplinkState(u,t);out[`v:sc:uplink:${i}`]=q.k;out[`v:sc:uplink:${i}:draw`]=q.draw;});
 for(const tr of tl.traces){const q=traceState(tr,t);for(const [k,v] of Object.entries(q))out[`v:sc:trace:${tr.id}:${k}`]=v;}
 return out;
}

// ---- Validation (called by validateIsometric with its anchor/text checks) -------------------------------------------
type Ctx={check:(a:Anchor3D,what:string)=>number;span:(enter:Anchor3D,exit:Anchor3D|null,what:string,min?:number)=>readonly [number,number];text:(s:string,what:string)=>void;
 routes:Map<string,RoutePath>;markerIds:Set<string>;usedIds:Set<string>};
export function validateSpeedcam(sc:SpeedcamPlan,ctx:Ctx){
 const {check,span,text,routes}=ctx,ids=new Set<string>();
 for(const x of [...sc.cars,...sc.cameras,...sc.sections,...sc.traces]){if(ids.has(x.id)||ctx.usedIds.has(x.id))throw new Error(`Изометрия · камеры: id ${x.id} повторяется.`);ids.add(x.id);}
 const route=(r:string,what:string)=>{const p=routes.get(r);if(!p)throw new Error(`Изометрия · камеры: ${what} стоит на неизвестном маршруте «${r}».`);return p;};
 const cars=new Map<string,{route:string;keys:{t:number;s:number}[];enter:number;exit:number;curve:ReturnType<typeof driveCurve>}>();
 for(const c of sc.cars){
  const p=route(c.route,`машина ${c.id}`),[enter,exit]=span(c.enter,c.exit,`машина ${c.id}`,1);
  const keys=c.drive.map((k,i)=>({t:check(k.at,`${c.id}.drive[${i}]`),s:k.u*p.L,u:k.u}));
  for(let i=1;i<keys.length;i++){
   if(keys[i].t-keys[i-1].t<.4)throw new Error(`Изометрия · камеры: ключи drive машины ${c.id} ${i-1} и ${i} ближе 0,4 с — машина прыгнет; разведи слова.`);
   if(keys[i].u<keys[i-1].u)throw new Error(`Изометрия · камеры: машина ${c.id} едет назад между ключами drive ${i-1} и ${i}; u не должен убывать.`);
  }
  if(keys[0].t<enter-.05&&keys.length>1&&keys[1].t<enter)throw new Error(`Изометрия · камеры: машина ${c.id} начинает ехать до своего появления.`);
  const curve=driveCurve(keys);
  for(let t=keys[0].t;t<=keys.at(-1)!.t;t+=1/FPS){const v=curve.speed(t);if(v>MAX_DRIVE_SPEED)throw new Error(`Изометрия · камеры: машина ${c.id} в ${t.toFixed(2)} с едет ${v.toFixed(1)} ед./с — быстрее ${MAX_DRIVE_SPEED}; дай больше времени между ключами drive.`);}
  cars.set(c.id,{route:c.route,keys,enter,exit,curve});
 }
 const crossing=(car:{keys:{t:number;s:number}[];curve:ReturnType<typeof driveCurve>},s:number)=>{const {keys,curve}=car;if(keys[0].s>=s-1e-6)return NaN;for(let i=1;i<keys.length;i++)if(keys[i].s>=s-1e-6){let lo=keys[i-1].t,hi=keys[i].t;for(let k=0;k<50;k++){const m=(lo+hi)/2;if(curve.at(m)<s)lo=m;else hi=m;}return hi;}return NaN;};
 const cams=new Map<string,{route:string;s:number;kind:string;enter:number;exit:number}>();
 for(const c of sc.cameras){
  const p=route(c.route,`камера ${c.id}`),[enter,exit]=span(c.enter,c.exit,`камера ${c.id}`);
  text(c.text,`подпись камеры ${c.id}`);c.scan.forEach((k,i)=>check(k.at,`${c.id}.scan[${i}]`));
  if(c.textExit&&check(c.textExit,`${c.id}.textExit`)<enter+.6)throw new Error(`Изометрия · камеры: табличка камеры ${c.id} должна быть видна не меньше 0,6 с.`);
  if(c.u*p.L<1.2||c.u*p.L>p.L-1.2)throw new Error(`Изометрия · камеры: камера ${c.id} стоит у самого конца маршрута; u так, чтобы до концов было ≥1,2 единицы.`);
  if(c.reads){
   const car=cars.get(c.reads);if(!car)throw new Error(`Изометрия · камеры: камера ${c.id} читает неизвестную машину «${c.reads}».`);
   if(car.route!==c.route)throw new Error(`Изометрия · камеры: машина ${c.reads} едет по другому маршруту, камера ${c.id} её не увидит.`);
   const t=crossing(car,c.u*p.L);
   if(!Number.isFinite(t))throw new Error(`Изометрия · камеры: машина ${c.reads} не проезжает камеру ${c.id} (u=${c.u}); добавь ключ drive дальше u камеры.`);
   if(t<enter+.3||t>exit-.3||t<car.enter+.2||t>car.exit-.2)throw new Error(`Изометрия · камеры: машина ${c.reads} проезжает камеру ${c.id} в ${t.toFixed(2)} с, когда камера или машина ещё/уже не видна; поставь ключ drive {at: слово чтения, u: ${c.u}}.`);
  }
  cams.set(c.id,{route:c.route,s:c.u*p.L,kind:c.kind,enter,exit});
 }
 for(const f of sc.flows){route(f.route,"поток");span(f.enter,f.exit,`поток ${f.route}`,1);
  if(f.lane==="with"&&sc.cars.some(c=>c.route===f.route))throw new Error(`Изометрия · камеры: поток with на маршруте ${f.route} поедет сквозь машину героя; поставь lane "against".`);}
 const cam=(id:string,what:string)=>{const c=cams.get(id);if(!c)throw new Error(`Изометрия · камеры: ${what} ссылается на неизвестную камеру «${id}».`);return c;};
 for(const s of sc.sections){
  const a=cam(s.from,`отрезок ${s.id}`),b=cam(s.to,`отрезок ${s.id}`);
  if(a.route!==b.route||s.from===s.to)throw new Error(`Изометрия · камеры: отрезок ${s.id} соединяет две разные камеры одного маршрута.`);
  if(Math.abs(a.s-b.s)<3)throw new Error(`Изометрия · камеры: отрезок ${s.id} короче 3 единиц.`);
  text(s.text,`подпись отрезка ${s.id}`);span(s.enter,s.exit,`отрезок ${s.id}`,1.2);
 }
 for(const u of sc.uplinks){cam(u.from,"связь");if(!ctx.markerIds.has(u.to))throw new Error(`Изометрия · камеры: связь от ${u.from} ведёт к неизвестной метке «${u.to}».`);span(u.enter,u.exit,`связь ${u.from}→${u.to}`,.9);}
 for(const tr of sc.traces){
  const car=cars.get(tr.car);if(!car)throw new Error(`Изометрия · камеры: шторка ${tr.id} ссылается на неизвестную машину «${tr.car}».`);
  const a=cam(tr.from,`шторка ${tr.id}`),b=cam(tr.to,`шторка ${tr.id}`);
  if(a.route!==car.route||b.route!==car.route||b.s-a.s<3)throw new Error(`Изометрия · камеры: шторка ${tr.id} идёт по маршруту машины от камеры from к камере to дальше по ходу (≥3 единиц).`);
  const tA=crossing(car,a.s),tB=crossing(car,b.s),[enter]=span(tr.enter,tr.exit,`шторка ${tr.id}`,traceDrawSeconds(b.s-a.s)+.6);
  if(!Number.isFinite(tA)||!Number.isFinite(tB))throw new Error(`Изометрия · камеры: машина ${tr.car} не проезжает обе камеры шторки ${tr.id}.`);
  if(enter<tB-.05)throw new Error(`Изометрия · камеры: шторка ${tr.id} показывает запись скорости раньше, чем машина доехала до второй камеры (${tB.toFixed(2)} с).`);
  for(const [g,name] of [[tr.average,"average"],[tr.limit,"limit"],[tr.match,"match"]] as const)if(g){text(g.text,`${tr.id}.${name}`);const [ge]=span(g.enter,g.exit,`${tr.id}.${name}`);if(ge<enter)throw new Error(`Изометрия · камеры: ${tr.id}.${name} появляется раньше самой шторки.`);}
 }
}
/** On-screen texts of the catalog for the independent written-text audit. */
export function speedcamTexts(sc?:SpeedcamPlan|null){return sc?[...sc.cameras.map(c=>c.text),...sc.sections.map(s=>s.text),...sc.traces.flatMap(t=>[t.average?.text??"",t.limit?.text??"",t.match?.text??""])].filter(Boolean):[];}
/** Points that must stay visible from every camera azimuth (occlusion guard of the core city). */
export function speedcamGuardPoints(sc:SpeedcamPlan|undefined|null,routes:Map<string,RoutePath>):V3[]{
 if(!sc)return [];
 const pts:V3[]=[];
 for(const c of sc.cameras){const p=routes.get(c.route);if(!p)continue;const f=frameOn(p,c.u*p.L),top=c.kind==="gantry"?SPEEDCAM_TOP.gantry:SPEEDCAM_TOP.pole;
  for(const o of c.kind==="gantry"?[-GANTRY.post,0,GANTRY.post]:[-POLE.side,POLE.side])for(let y=0;y<=top+1e-9;y+=.25)pts.push([f.p[0]+f.side[0]*o,f.p[1]+y,f.p[2]+f.side[1]*o]);}
 for(const tr of sc.traces){const a=sc.cameras.find(c=>c.id===tr.from),b=sc.cameras.find(c=>c.id===tr.to),p=a&&routes.get(a.route);if(!a||!b||!p)continue;
  for(let s=a.u*p.L;s<=b.u*p.L;s+=.5){const f=frameOn(p,s);pts.push([f.p[0]+f.side[0]*LANE,f.p[1]+SPEEDCAM_TOP.trace,f.p[2]+f.side[1]*LANE]);}}
 return pts;
}
/** Framing points: each camera when it appears, each driven car on its start, the mean-value point when shown. */
export function speedcamFocus(sc:SpeedcamPlan|undefined|null,routes:Map<string,RoutePath>,at:At,total:number){
 if(!sc)return [];
 const out:{t:number;p:V3;what:string;relaxed?:boolean}[]=[];
 for(const c of sc.cameras){const p=routes.get(c.route);if(!p)continue;const enter=at(c.enter),exit=c.exit?at(c.exit):Infinity,t=Math.min(enter+1,(enter+Math.min(exit,enter+20))/2);if(t>total)continue;const f=frameOn(p,c.u*p.L);
  out.push({t,p:[f.p[0],f.p[1]+(c.kind==="gantry"?.8:.6),f.p[2]],what:`камера ${c.id}`});}
 for(const c of sc.cars){const p=routes.get(c.route);if(!p)continue;const t=at(c.enter)+.2;if(t>total)continue;out.push({t,p:posOn(p,c.drive[0].u*p.L),what:`машина ${c.id} на старте`});}
 return out;
}
type StoryEvent={at:number;kind:"route"|"marker"|"pin"|"zone"|"district"|"link"|"card";tone:"info"|"ok"|"warn"|"number"};
/** Story moments for sound and the music arrangement, in the core event vocabulary (marker → object-enter, link/route → connect, the rest → highlight). */
export function speedcamStoryEvents(tl:SpeedcamTimeline):StoryEvent[]{
 const ev:StoryEvent[]=[];
 for(const c of tl.cameras){ev.push({at:c.enterAt,kind:"marker",tone:c.tone});if(Number.isFinite(c.readAt))ev.push({at:c.readAt,kind:"card",tone:c.tone});}
 for(const s of tl.sections)ev.push({at:s.enterAt,kind:"route",tone:s.tone});
 for(const u of tl.uplinks)ev.push({at:u.enterAt,kind:"link",tone:u.tone});
 for(const tr of tl.traces){ev.push({at:tr.enterAt,kind:"route",tone:"info"});if(tr.limit)ev.push({at:tr.limit.enterAt,kind:"pin",tone:"warn"});if(tr.avg)ev.push({at:tr.avg.enterAt,kind:"pin",tone:"number"});if(tr.matchShow)ev.push({at:tr.matchShow.enterAt,kind:"pin",tone:"ok"});}
 return ev;
}
export function speedcamEventTimes(tl:SpeedcamTimeline){
 return [...tl.cars.flatMap(c=>[c.enterAt,c.exitAt,...c.keys.map(k=>k.t)]),...tl.cameras.flatMap(c=>[c.enterAt,c.exitAt,c.readAt,...c.scanKeys.map(k=>k.at)]),
  ...tl.flows.flatMap(f=>[f.enterAt,f.exitAt]),...tl.sections.flatMap(s=>[s.enterAt,s.exitAt]),...tl.uplinks.flatMap(u=>[u.enterAt,u.exitAt]),
  ...tl.traces.flatMap(t=>[t.enterAt,t.exitAt,t.avg?.enterAt??NaN,t.limit?.enterAt??NaN,t.matchShow?.enterAt??NaN])].filter(t=>Number.isFinite(t));
}
