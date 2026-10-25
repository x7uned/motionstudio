import {z} from "zod";
import {anchor3dSchema,type Anchor3D} from "./scene3d";

// isometric/v1 · ring road with a backward braking wave (phantom jam). A prepared object of the «Изометрия» city:
// a closed one-way loop on the street grid, N cars that follow each other around it, and stop-and-go waves that the
// director only *anchors* (which car eases off first, on which word the jam is complete, on which word it fades).
// Car motion is a deterministic kinematic model, not generated code and not a scientific simulation:
//  · every car drives at the ring speed V times (1 − σ), where σ is the slowdown field of the active waves at its
//    position; a wave is a smooth bump (plateau + ramps) whose centre moves BACKWARD against the traffic at C = V/2
//    (the script's "about forty" cars vs "roughly twenty" jam, as a proportion, not to scale);
//  · a wave is born at the car that eases off, with a small amplitude, and grows to a full stop (σ = 1) on its word,
//    so each following car meets a stronger wave and brakes harder (amplification); cars enter its back and leave
//    its front; it fades smoothly on its fade word;
//  · when no wave is active the gaps relax towards even spacing, so a dissolved queue spreads out instead of freezing.
// The field is Lipschitz in position, so cars never overtake; the validator also rejects plans whose cars come
// closer than MIN_GAP. Everything is a pure function of the plan and the frame time. Renderer-safe: zod and math only.
// This file deliberately imports nothing from ./isometric (which imports it), so there is no import cycle.

export const FPS=30;
export const RING={speed:2.4,wave:1.2,rampBack:1.2,rampFront:2.0,seed:.3,fade:2.8,relax:.8,start:1,carScale:1.2} as const;
/** Centre-to-centre distance below which two ring cars would visibly touch (body length 0.5 × carScale = 0.6, plus a visible bumper gap). */
export const MIN_GAP=.66;
export const RING_ROLES=["hero","starter","auto"] as const;
export type RingRole=typeof RING_ROLES[number];
export const RING_GUIDE="rings — замкнутое одностороннее кольцо по улицам вокруг кварталов (эксперимент на кольцевой трассе, пробка без причины). c0<c1, r0<r1 — улицы прямоугольника (стороны ≥2 кварталов), dir cw|ccw (по/против часовой сверху). cars 8–24 машин едут друг за другом; draw — прорисовка кольца, fill — машины появляются по кольцу (fill ≥ draw), go — трогаются ровно и одинаково (go ≥ fill). waves — волны торможения: at — слово, когда машина car (номер 0..cars−1) чуть тормозит первой; grow — слово, к которому волна усилилась до полной остановки (усиление от машины к машине, 1,2–15 с после at); fade — слово, на котором волна гаснет (или null); length 1.5–6 — длина участка полной остановки. Центр волны сам едет НАЗАД против движения вдвое медленнее машин: машины въезжают в хвост и выезжают из головы. label — табличка над волной {text, enter, exit} или null. tags — подсвеченная машина с табличкой: role hero (ты, лаванда), starter (кто притормозил, жёлтая), auto (машина под управлением компьютера, зелёная с датчиком). Тексты только словами сценария. Без волн машины выравнивают дистанцию сами.";

const id=z.string().regex(/^[a-z][a-z0-9-]{0,23}$/);
const street=z.number().int().min(-7).max(6);
const textWindow=z.object({text:z.string().min(1).max(22),enter:anchor3dSchema,exit:anchor3dSchema.nullable()});
export const ringSchema=z.object({
 id,
 c0:street,r0:street,c1:street,r1:street,
 dir:z.enum(["cw","ccw"]),
 cars:z.number().int().min(8).max(24),
 draw:anchor3dSchema,fill:anchor3dSchema,go:anchor3dSchema,exit:anchor3dSchema.nullable(),
 waves:z.array(z.object({
  at:anchor3dSchema,car:z.number().int().min(0).max(23),grow:anchor3dSchema,fade:anchor3dSchema.nullable(),
  length:z.number().min(1.5).max(6),
  label:textWindow.nullable(),
 })).max(4),
 tags:z.array(textWindow.extend({car:z.number().int().min(0).max(23),role:z.enum(RING_ROLES)})).max(8),
});
export type RingPlan=z.infer<typeof ringSchema>;
type V3=[number,number,number];
type V2=[number,number];

// ---- Math (duplicated from ./isometric on purpose: no import cycle) ------------------------------------------------
export const clamp01=(x:number)=>Math.min(1,Math.max(0,x));
const smooth=(x:number)=>{const t=clamp01(x);return t*t*(3-2*t);};
const easeEnter=(x:number)=>1-(1-clamp01(x))**3;
const easeInOut=(x:number)=>{const t=clamp01(x);return t<.5?4*t*t*t:1-(-2*t+2)**3/2;};
export const shown=(t:number,enterAt:number,exitAt:number,inDur=.45,outDur=.45)=>(t<enterAt?0:easeEnter((t-enterAt)/inDur))*(exitAt===Infinity?1:1-easeInOut(clamp01((t-exitAt)/outDur)));
const streetAt=(i:number)=>4*i+2;
const CORNER=.9;
/** A whole ring is long (≈47 units): it draws over up to 4.5 s so the lead dot never jumps more than ~1 unit a frame. */
export const ringDrawSeconds=(L:number)=>Math.max(1.2,Math.min(4.5,.9+L/9));
/** Signed ring distance a−b wrapped into [−L/2, L/2). */
export const wrapDelta=(d:number,L:number)=>{const m=((d%L)+L)%L;return m>=L/2?m-L:m;};

// ---- Geometry ------------------------------------------------------------------------------------------------------
/** Same shape as RoutePath (P, S, L, deck, legs), closed: S[last] = L and P[last] = P[0]; s is used modulo L. */
export type RingPath={P:V3[];S:number[];L:number;deck:null;legs:{axis:"x"|"z";c:number;lo:number;hi:number}[];closed:true};
export function ringPath(r:Pick<RingPlan,"c0"|"r0"|"c1"|"r1"|"dir">):RingPath{
 const x0=streetAt(Math.min(r.c0,r.c1)),x1=streetAt(Math.max(r.c0,r.c1)),z0=streetAt(Math.min(r.r0,r.r1)),z1=streetAt(Math.max(r.r0,r.r1));
 const cw:V2[]=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],corners=r.dir==="cw"?cw:[cw[0],cw[3],cw[2],cw[1]];
 const pts:V2[]=[];
 const push=(p:V2)=>{const l=pts.at(-1);if(!l||Math.hypot(p[0]-l[0],p[1]-l[1])>1e-6)pts.push(p);};
 const line=(a:V2,b:V2)=>{const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.08));for(let i=0;i<=n;i++)push([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]);};
 const unit=(a:V2,b:V2):V2=>{const l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l];};
 // Start in the middle of the first side so the seam (s = 0 = L) lies on a straight piece.
 const start:V2=[(corners[0][0]+corners[1][0])/2,(corners[0][1]+corners[1][1])/2];
 let cur=start;
 for(let k=1;k<=4;k++){
  const p=corners[k%4],prev=corners[k-1],next=corners[(k+1)%4],din=unit(prev,p),dout=unit(p,next);
  const a:V2=[p[0]-din[0]*CORNER,p[1]-din[1]*CORNER],b:V2=[p[0]+dout[0]*CORNER,p[1]+dout[1]*CORNER];
  line(cur,a);
  for(let i=1;i<=14;i++){const u=i/14;push([(1-u)**2*a[0]+2*(1-u)*u*p[0]+u*u*b[0],(1-u)**2*a[1]+2*(1-u)*u*p[1]+u*u*b[1]]);}
  cur=b;
 }
 line(cur,start);
 const P=pts.map(p=>[p[0],0,p[1]] as V3),S=[0];
 for(let i=1;i<P.length;i++)S.push(S[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][2]-P[i-1][2]));
 const legs=[{axis:"x" as const,c:z0,lo:x0,hi:x1},{axis:"z" as const,c:x1,lo:z0,hi:z1},{axis:"x" as const,c:z1,lo:x0,hi:x1},{axis:"z" as const,c:x0,lo:z0,hi:z1}];
 return {P,S,L:S.at(-1)!,deck:null,legs,closed:true};
}
export function ringPos(r:RingPath,s:number):V3{
 const {P,S,L}=r,v=((s%L)+L)%L;
 let lo=0,hi=S.length-1;
 while(hi-lo>1){const m=(lo+hi)>>1;if(S[m]<=v)lo=m;else hi=m;}
 const f=(v-S[lo])/Math.max(1e-9,S[hi]-S[lo]);
 return [P[lo][0]+(P[hi][0]-P[lo][0])*f,0,P[lo][2]+(P[hi][2]-P[lo][2])*f];
}
/** Position, yaw (forward = local +X, like the city cars) and the unit side vector on the ground. */
export function ringAlong(r:RingPath,s:number){
 const p=ringPos(r,s),a=ringPos(r,s-.12),b=ringPos(r,s+.12),dx=b[0]-a[0],dz=b[2]-a[2],h=Math.hypot(dx,dz)||1e-9;
 return {p,yaw:Math.atan2(-dz,dx),side:[-dz/h,dx/h] as V2};
}
/** Occlusion-guard points of every ring (road surface ±0.45 and car-roof height), for the city's height caps. */
export function ringGuardPoints(rings:RingPlan[]=[]):V3[]{
 const out:V3[]=[];
 for(const r of rings){const path=ringPath(r);for(let s=0;s<path.L;s+=.3){const {p,side}=ringAlong(path,s);for(const o of [-.45,0,.45])for(const y of [0,.3])out.push([p[0]+side[0]*o,y,p[2]+side[1]*o]);}}
 return out;
}
export const ringLegs=(rings:RingPlan[]=[])=>rings.flatMap(r=>ringPath(r).legs);

// ---- Waves ---------------------------------------------------------------------------------------------------------
export type WaveTl={car:number;at:number;growAt:number;fadeAt:number;length:number;center0:number;label:{text:string;enterAt:number;exitAt:number}|null};
/** Amplitude A (σ at the centre), plateau length J and the centre (unwrapped ring coordinate) of one wave at time t. */
export function waveAt(w:WaveTl,t:number){
 if(t<w.at||!Number.isFinite(w.center0))return {A:0,J:0,center:w.center0};
 const g=smooth((t-w.at)/Math.max(.1,w.growAt-w.at)),m=w.fadeAt===Infinity?1:1-easeInOut((t-w.fadeAt)/RING.fade);
 return {A:(RING.seed*easeEnter((t-w.at)/.6)+(1-RING.seed)*g)*m,J:w.length*g*m,center:w.center0-RING.wave*(t-w.at)};
}
/** Wave profile at signed distance x from its centre (x > 0 = ahead in the driving direction): plateau, then ramps. */
export function waveProfile(x:number,J:number){
 const h=J/2;
 if(Math.abs(x)<=h)return 1;
 return x>0?1-smooth((x-h)/RING.rampFront):1-smooth((-x-h)/RING.rampBack);
}
/** Combined slowdown σ ∈ [0,1] at ring coordinate s: 1 = standing still, 0 = free flow. */
export function ringSigma(waves:WaveTl[],L:number,s:number,t:number){
 let keep=1;
 for(const w of waves){const {A,J,center}=waveAt(w,t);if(A<=0)continue;keep*=1-A*waveProfile(wrapDelta(s-center,L),J);}
 return 1-keep;
}
const activeAmplitude=(waves:WaveTl[],t:number)=>waves.reduce((m,w)=>Math.max(m,waveAt(w,t).A),0);

// ---- Timeline ------------------------------------------------------------------------------------------------------
export type RingTl={
 id:string;path:RingPath;N:number;drawAt:number;drawDur:number;fillAt:number;goAt:number;exitAt:number;appear:number[];
 waves:WaveTl[];tags:{car:number;role:RingRole;text:string;enterAt:number;exitAt:number}[];
 /** Per car, per frame: unwrapped position, brake light 0..1 and speed. */
 X:Float64Array[];B:Float64Array[];Vel:Float64Array[];minGap:{gap:number;t:number};frames:number;
};
type At=(a:Anchor3D)=>number;
export function ringTimeline(rings:RingPlan[]=[],at:At,total:number):RingTl[]{
 const frames=Math.round(total*FPS)+1;
 return rings.map(r=>{
  const path=ringPath(r),N=r.cars,L=path.L,d0=L/N,drawAt=at(r.draw),drawDur=ringDrawSeconds(L);
  const fillAt=at(r.fill),goAt=Math.max(fillAt,at(r.go)),exitAt=r.exit?at(r.exit):Infinity;
  // Each car appears after its stagger along the ring (1.2 s for the whole ring) and once the drawn ribbon has
  // passed its current position (checked per frame below), so no car stands on an undrawn road.
  const appear=new Array<number>(N).fill(Infinity),drawnAt=(t:number)=>L*easeInOut((t-drawAt)/drawDur);
  const waves:WaveTl[]=r.waves.map(w=>({car:w.car,at:at(w.at),growAt:at(w.grow),fadeAt:w.fade?at(w.fade):Infinity,length:w.length,center0:NaN,
   label:w.label?{text:w.label.text,enterAt:at(w.label.enter),exitAt:w.label.exit?at(w.label.exit):Infinity}:null})).sort((a,b)=>a.at-b.at);
  const tags=r.tags.map(g=>({car:g.car,role:g.role,text:g.text,enterAt:at(g.enter),exitAt:g.exit?at(g.exit):Infinity}));
  const X=Array.from({length:N},()=>new Float64Array(frames)),B=Array.from({length:N},()=>new Float64Array(frames)),Vel=Array.from({length:N},()=>new Float64Array(frames));
  const x=Float64Array.from({length:N},(_,i)=>i*d0),v=new Float64Array(N),b=new Float64Array(N);
  const sub=4,dt=1/(FPS*sub);
  let minGap={gap:Infinity,t:0};
  for(let f=0;f<frames;f++){
   for(let i=0;i<N;i++){X[i][f]=x[i];B[i][f]=b[i];Vel[i][f]=v[i];}
   const tf=f/FPS,drawn=drawnAt(tf);
   for(let i=0;i<N;i++)if(appear[i]===Infinity&&tf>=fillAt+1.2*i/N&&(drawn>=L-1e-6||drawn>=((x[i]%L)+L)%L+.3))appear[i]=tf;
   for(let i=0;i<N;i++){const g=(i===N-1?x[0]+L:x[i+1])-x[i];if(g<minGap.gap)minGap={gap:g,t:tf};}
   for(let k=0;k<sub;k++){
    const t=tf+k*dt;
    for(const w of waves)if(t>=w.at&&!Number.isFinite(w.center0))w.center0=x[w.car];
    const go=smooth((t-goAt)/RING.start),relax=(1-activeAmplitude(waves,t))*RING.relax;
    let mean=0;for(let i=0;i<N;i++)mean+=x[i];mean/=N;
    for(let i=0;i<N;i++){
     const sigma=ringSigma(waves,L,x[i],t),lattice=mean+(i-(N-1)/2)*d0;
     const correction=Math.max(-.5,Math.min(.5,relax*(lattice-x[i])/RING.speed));
     const nv=go*RING.speed*Math.max(0,Math.min(1.5,(1-sigma)*(1+correction)));
     const decel=Math.max(0,(v[i]-nv)/dt)/6;
     const target=clamp01(1.6*sigma+decel);
     b[i]+=(target-b[i])*(1-Math.exp(-(target>b[i]?10:3)*dt));
     v[i]=nv;
    }
    for(let i=0;i<N;i++)x[i]+=v[i]*dt;
   }
  }
  return {id:r.id,path,N,drawAt,drawDur,fillAt,goAt,exitAt,appear,waves,tags,X,B,Vel,minGap,frames};
 });
}

// ---- Frame state (shared by the renderer and the tests) ----------------------------------------------------------
const frameOf=(r:RingTl,t:number)=>Math.max(0,Math.min(r.frames-1,Math.round(t*FPS)));
export const ringDrawn=(r:RingTl,t:number)=>r.path.L*easeInOut((t-r.drawAt)/r.drawDur);
export const ringShown=(r:RingTl,t:number)=>t<r.drawAt?0:r.exitAt===Infinity?1:1-easeInOut(clamp01((t-r.exitAt)/.5));
export const ringLead=(r:RingTl,t:number)=>easeEnter((t-r.drawAt)/.3)*(1-easeInOut(clamp01((t-r.drawAt-r.drawDur+.1)/.4)));
export function ringCarState(r:RingTl,i:number,t:number){
 const f=frameOf(r,t),u=r.X[i][f];
 return {u,s:((u%r.path.L)+r.path.L)%r.path.L,k:shown(t,r.appear[i],r.exitAt,.45,.45),brake:r.B[i][f],speed:r.Vel[i][f]};
}
/** Highlight weight of each role on car i (tags crossfade in and out). */
export function ringCarRoles(r:RingTl,i:number,t:number){
 const out={hero:0,starter:0,auto:0};
 for(const g of r.tags)if(g.car===i)out[g.role]=Math.max(out[g.role],shown(t,g.enterAt,g.exitAt));
 return out;
}
export const ringTagState=(g:RingTl["tags"][number],t:number)=>shown(t,g.enterAt,g.exitAt);
export function waveLabelState(w:WaveTl,L:number,t:number){
 if(!w.label)return {k:0,s:0};
 const {center}=waveAt(w,Math.max(t,w.at));
 return {k:shown(t,w.label.enterAt,w.label.exitAt),s:((center%L)+L)%L};
}
/** Every scalar a viewer can see change ("v:" weights ≤ 0.34 per frame, "p:" positions scaled to 1 per frame). */
export function ringScalars(rings:RingTl[],t:number){
 const out:Record<string,number>={};
 for(const r of rings){
  out[`p:ring:${r.id}:drawn`]=ringDrawn(r,t)/1.2;out[`v:ring:${r.id}:shown`]=ringShown(r,t)*clamp01(ringDrawn(r,t));out[`v:ring:${r.id}:lead`]=ringLead(r,t);
  for(let i=0;i<r.N;i++){const c=ringCarState(r,i,t),roles=ringCarRoles(r,i,t);out[`v:ring:${r.id}:car${i}`]=c.k;out[`v:ring:${r.id}:car${i}:brake`]=c.brake;out[`p:ring:${r.id}:car${i}:u`]=c.u/.2;
   for(const role of RING_ROLES)out[`v:ring:${r.id}:car${i}:${role}`]=roles[role];}
  for(let j=0;j<=24;j++)out[`v:ring:${r.id}:sigma${j}`]=ringSigma(r.waves,r.path.L,r.path.L*j/24,t);
  r.waves.forEach((w,j)=>{out[`v:ring:${r.id}:wave${j}:label`]=waveLabelState(w,r.path.L,t).k;const a=waveAt(w,t);out[`v:ring:${r.id}:wave${j}:amp`]=a.A;if(t>=w.at&&Number.isFinite(w.center0))out[`p:ring:${r.id}:wave${j}:at`]=a.center/.2;});
  r.tags.forEach((g,j)=>out[`v:ring:${r.id}:tag${j}`]=ringTagState(g,t));
 }
 return out;
}

// ---- Validation, framing, story events ---------------------------------------------------------------------------
export type FocusPoint={t:number;p:V3;what:string;relaxed?:boolean};
type Check=(a:Anchor3D,what:string)=>number;
type Text=(s:string,what:string)=>void;
/** Validates the rings of a plan (anchors through the core's check, texts through its grounding rule) and the
 *  resulting motion: no two cars closer than MIN_GAP. Throws with a concrete fix. */
export function validateRings(rings:RingPlan[]=[],ids:Set<string>,check:Check,text:Text,total:number,at:At){
 for(const r of rings){
  if(ids.has(r.id))throw new Error(`Изометрия: id ${r.id} повторяется.`);ids.add(r.id);
  if(r.c1-r.c0<2||r.r1-r.r0<2)throw new Error(`Изометрия: кольцо ${r.id} — нужно c0<c1 и r0<r1, стороны не меньше двух кварталов (c1−c0 ≥ 2, r1−r0 ≥ 2).`);
  const path=ringPath(r),L=path.L;
  if(L/r.cars<1.4)throw new Error(`Изометрия: на кольце ${r.id} длиной ${L.toFixed(0)} слишком много машин (${r.cars}); нужно не меньше 1,4 единицы на машину.`);
  const draw=check(r.draw,`${r.id}.draw`),fill=check(r.fill,`${r.id}.fill`),go=check(r.go,`${r.id}.go`),exit=r.exit?check(r.exit,`${r.id}.exit`):Infinity;
  if(fill<draw-1e-6)throw new Error(`Изометрия: машины кольца ${r.id} появляются (fill) раньше прорисовки (draw).`);
  if(go<fill-1e-6)throw new Error(`Изометрия: машины кольца ${r.id} трогаются (go) раньше, чем появились (fill).`);
  if(exit-draw<ringDrawSeconds(L)+.6)throw new Error(`Изометрия: кольцо ${r.id} исчезает раньше, чем успевает прорисоваться и постоять.`);
  r.waves.forEach((w,i)=>{
   const what=`${r.id}.waves[${i}]`;
   if(w.car>=r.cars)throw new Error(`Изометрия: ${what}.car=${w.car}, а машин на кольце ${r.cars} (номера 0..${r.cars-1}).`);
   const a=check(w.at,`${what}.at`),g=check(w.grow,`${what}.grow`),f=w.fade?check(w.fade,`${what}.fade`):Infinity;
   if(a<go+.3)throw new Error(`Изометрия: ${what} начинается раньше, чем машины тронулись (go + 0,3 с).`);
   if(g-a<1.2||g-a>15)throw new Error(`Изометрия: ${what} — от первого торможения (at) до полной остановки (grow) нужно 1,2–15 с, сейчас ${(g-a).toFixed(1)} с.`);
   if(f-g<.8)throw new Error(`Изометрия: ${what} гаснет (fade) меньше чем через 0,8 с после полной остановки.`);
   if(w.label){text(w.label.text,`табличка ${what}`);const e=check(w.label.enter,`${what}.label.enter`),x=w.label.exit?check(w.label.exit,`${what}.label.exit`):Infinity;
    if(e<a)throw new Error(`Изометрия: табличка ${what} появляется раньше самой волны.`);if(x-e<.6)throw new Error(`Изометрия: табличка ${what} должна быть видна не меньше 0,6 с.`);if(x>f+RING.fade)throw new Error(`Изометрия: табличка ${what} висит над уже погасшей волной; закрой её до fade + ${RING.fade} с.`);}
  });
  r.tags.forEach((g,i)=>{
   const what=`${r.id}.tags[${i}]`;
   if(g.car>=r.cars)throw new Error(`Изометрия: ${what}.car=${g.car}, а машин на кольце ${r.cars}.`);
   text(g.text,`табличка ${what}`);
   const e=check(g.enter,`${what}.enter`),x=g.exit?check(g.exit,`${what}.exit`):Infinity;
   if(e<fill)throw new Error(`Изометрия: ${what} появляется раньше машин кольца.`);if(x-e<.6)throw new Error(`Изометрия: ${what} должна быть видна не меньше 0,6 с.`);
  });
 }
 const tl=ringTimeline(rings,at,total);
 for(const r of tl)if(r.minGap.gap<MIN_GAP)throw new Error(`Изометрия: на кольце ${r.id} машины сближаются до ${r.minGap.gap.toFixed(2)} (нужно ≥ ${MIN_GAP}) около ${r.minGap.t.toFixed(1)} с. Уменьши length волны, число машин или увеличь кольцо; не запускай две волны в одном месте.`);
 return tl;
}
/** What must be framed when it appears: the whole ring once drawn (relaxed), tagged cars and wave labels. */
export function ringFocusPoints(rings:RingPlan[]=[],at:At,total:number):FocusPoint[]{
 const pts:FocusPoint[]=[];
 const tl=ringTimeline(rings,at,total);
 for(const r of tl){
  const t=Math.min(r.drawAt+r.drawDur+.2,total);
  if(r.exitAt>t+.3)for(const leg of r.path.legs)for(const u of [leg.lo,leg.hi])pts.push({t,p:leg.axis==="x"?[u,0,leg.c]:[leg.c,0,u],what:`угол кольца ${r.id}`,relaxed:true});
  for(const g of r.tags){const tt=Math.min(g.enterAt+.5,(g.enterAt+Math.min(g.exitAt,g.enterAt+20))/2);if(tt>total)continue;const c=ringCarState(r,g.car,tt);pts.push({t:tt,p:ringPos(r.path,c.s),what:`машина ${g.car} (${g.text}) кольца ${r.id}`});}
  for(const w of r.waves)if(w.label){const tt=Math.min(w.label.enterAt+.5,(w.label.enterAt+Math.min(w.label.exitAt,w.label.enterAt+20))/2);if(tt>total)continue;pts.push({t:tt,p:ringPos(r.path,waveLabelState(w,r.path.L,tt).s),what:`табличка волны «${w.label.text}» кольца ${r.id}`});}
 }
 return pts;
}
export const ringTexts=(rings:RingPlan[]=[])=>rings.flatMap(r=>[...r.waves.map(w=>w.label?.text??""),...r.tags.map(g=>g.text)]).filter(Boolean);
/** Tone-coded story moments for sound and music: drawing connects, the full stop warns, the fade resolves. */
export function ringStoryEvents(rings:RingTl[]){
 const ev:{at:number;kind:"route"|"pin"|"zone";tone:"info"|"ok"|"warn"|"number"}[]=[];
 for(const r of rings){
  ev.push({at:r.drawAt,kind:"route",tone:"info"});
  for(const w of r.waves){ev.push({at:w.growAt,kind:"zone",tone:"warn"});if(w.fadeAt!==Infinity)ev.push({at:w.fadeAt,kind:"zone",tone:"ok"});if(w.label)ev.push({at:w.label.enterAt,kind:"pin",tone:"warn"});}
  for(const g of r.tags)ev.push({at:g.enterAt,kind:"pin",tone:g.role==="auto"?"ok":g.role==="starter"?"number":"info"});
 }
 return ev;
}
export const ringEventTimes=(rings:RingTl[])=>rings.flatMap(r=>[r.drawAt,r.drawAt+r.drawDur,r.fillAt,r.goAt,r.exitAt,...r.waves.flatMap(w=>[w.at,w.growAt,w.fadeAt,w.label?.enterAt??Infinity,w.label?.exitAt??Infinity]),...r.tags.flatMap(g=>[g.enterAt,g.exitAt])]);
