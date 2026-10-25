import React from "react";
import brand from "../video-design/brand.json";
import {easeSine} from "../src/lib/illustrated";
import type {IllustratedTimeline} from "../src/lib/illustrated";
import {TUNNEL_KEY_SECONDS,type TunnelKind} from "../src/lib/illustrated-catalog-tunnel";

// Prepared objects for the "tunnel through the Earth" explainer (2026-10-20): a cut-away faceted Earth with a drilled
// shaft and a falling jumper, a shell-theorem diagram, a chrome stopwatch, a depth column with a magnifier and an
// orbit whose shadow on the diameter is the faller. Illustrations, not to scale. Every value derives from the frame
// time and the object's keys; no randomness, no generated code.
const C=brand.colors;
type V3=[number,number,number];
const D=Math.PI/180;
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number,a:number,b:number)=>{const x=clamp01((v-a)/(b-a));return x*x*(3-2*x);};
const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const pts=(p:number[][])=>p.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const rgb=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const hex=(v:number[])=>"#"+v.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,"0")).join("");
const mix=(a:string,b:string,k:number)=>{const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v+(y[i]-v)*clamp01(k)));};
const unit=(a:V3):V3=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
/** Light from the top left, slightly from the viewer (same side as the space catalog's sunlight). */
const LIGHT=unit([-.74,-.46,.5]);
export type TimedObject=IllustratedTimeline["objects"][number];
export type TunnelArtProps={kind:string;o:TimedObject;t:number;a:number;xray:number;uid:string;overlay?:boolean};
const KS=(k:TunnelKind)=>TUNNEL_KEY_SECONDS[k]??2;

/* ───────────── Keyed track: flight values arrive exactly on their word ───────────── */
export type Key={at:number;value:number};
export type Seg={t0:number;t1:number;s:number;v:number;fly:boolean;m0:number;m1:number};
const EPS=1e-4;
/** Shortest flight segment (s): keys closer than this arrive slightly late instead of teleporting. */
export const MIN_MOVE=.6;
export function segValue(g:Seg,t:number){
 const h=g.t1-g.t0;if(t>=g.t1||h<=1e-9)return g.v;const x=clamp01((t-g.t0)/h);
 if(!g.fly)return g.s+(g.v-g.s)*easeSine(x);
 const x2=x*x,x3=x2*x;return (2*x3-3*x2+1)*g.s+(x3-2*x2+x)*h*g.m0+(-2*x3+3*x2)*g.v+(x3-x2)*h*g.m1;
}
export function trackValue(segs:Seg[],t:number){for(let i=segs.length-1;i>=0;i--)if(segs[i].t0<=t)return segValue(segs[i],t);return 0;}
/** Keys → segments. Values below `split` are ordinary states: each eases from its own word over ks seconds.
 *  Values at or above `split` are flight positions: the motion toward a key starts at the previous key and reaches
 *  the value exactly on this key's word. Flight segments are monotone cubic Hermite pieces: through a key the
 *  phase speed is the harmonic mean of both sides (no speed kink in the centre); at a turn or a rest it is the
 *  segment's own rate or zero. With linear=true every flight segment runs at constant speed (a stopwatch). */
export function buildTrack(keys:readonly Key[],ks:number,split:number,linear=false):Seg[]{
 const segs:Seg[]=[],sorted=[...keys].sort((a,b)=>a.at-b.at);
 const atEnd=(v:number)=>Math.abs(v-split)<EPS||Math.abs(v-1)<EPS;
 const restSlope=(v:number,d:number)=>linear||atEnd(v)?d:0;
 const pushFly=(t0:number,t1:number,s:number,v:number)=>{
  const d=(v-s)/(t1-t0),g:Seg={t0,t1,s,v,fly:true,m0:d,m1:restSlope(v,d)},F=segs[segs.length-1];
  if(linear){g.m0=d;g.m1=d;}
  else if(F&&F.fly&&Math.abs(F.t1-t0)<1e-6){const dF=(F.v-F.s)/(F.t1-F.t0);
   if(dF*d>0){const h=2*dF*d/(dF+d);F.m1=h;g.m0=h;}else{F.m1=dF;g.m0=d;}}
  else g.m0=restSlope(s,d);
  segs.push(g);
 };
 let prev:Key|null=null,prevEnd=-Infinity;
 for(const k of sorted){
  const floor=segs.length?segs[segs.length-1].t0:-Infinity,v=k.value;
  const start=Math.max(prev?Math.max(prev.at,prevEnd):k.at,floor),s0=trackValue(segs,start);
  if(v>=split-EPS&&s0>=split-EPS){
   if(Math.abs(v-s0)<EPS)prevEnd=start;
   else{const t1=prev?Math.max(k.at,start+MIN_MOVE):start+ks;pushFly(start,t1,s0,v);prevEnd=t1;}
  }else{
   const t0=Math.max(k.at,floor),s=trackValue(segs,t0);
   if(v>split+EPS){
    // Skipped the ready state: ease up to it from this word, then fly on for ks seconds.
    if(s<split-EPS)segs.push({t0,t1:t0+ks,s,v:split,fly:false,m0:0,m1:0});
    const sF=trackValue(segs,t0+ks);if(Math.abs(v-sF)>EPS)pushFly(t0+ks,t0+2*ks,sF,v);prevEnd=t0+2*ks;
   }else if(Math.abs(v-s)<EPS)prevEnd=t0;
   else{segs.push({t0,t1:t0+ks,s,v,fly:false,m0:0,m1:0});prevEnd=t0+ks;}
  }
  prev=k;
 }
 return segs;
}
/** Cumulative phase travelled (|Δu| summed), so an orbit keeps going round while the faller swings back. */
export function trackTravel(segs:Seg[],t:number,split:number){
 const u=(v:number)=>clamp01((v-split)/(1-split));let W=0;
 for(let i=0;i<segs.length;i++){const g=segs[i];if(g.t0>t)break;const e=Math.min(t,g.t1,segs[i+1]?.t0??Infinity);W+=Math.abs(u(segValue(g,e))-u(g.s));}
 return W;
}
/** State of a keyed track at time t: value V, flight phase u (0 entry … 1 exit), travelled phase W and their rates. */
export function trackAt(t:number,keys:readonly Key[],ks:number,split=.3,linear=false){
 const segs=buildTrack(keys,ks,split,linear),h=1/60,k=split<1?1/(1-split):0,u=(v:number)=>clamp01((v-split)*k);
 const V=trackValue(segs,t),W=trackTravel(segs,t,split);
 return {V,u:u(V),W,du:(u(trackValue(segs,t+h))-u(trackValue(segs,t-h)))/(2*h),dW:(trackTravel(segs,t+h,split)-trackTravel(segs,t-h,split))/(2*h)};
}
/** Position along a straight gravity tunnel for phase u: −1 entry, 0 middle, +1 exit (simple harmonic motion). */
export const tunnelPos=(u:number)=>-Math.cos(Math.PI*u);

/* ───────────── Faceted Earth halves ───────────── */
type Face={p:number[][];n:V3;lon:number;lat:number;i:number};
/** Visible triangles of a unit sphere between view longitudes l0..l1 (0 = facing the viewer), sorted back to front. */
function hemi(l0:number,l1:number,step:number,rot=0):Face[]{
 const at=(l:number,b:number):V3=>{const lr=(l+rot)*D,br=b*D;return [Math.cos(br)*Math.sin(lr),-Math.sin(br),Math.cos(br)*Math.cos(lr)];};
 const faces:Face[]=[];let i=0;
 for(let lat=-90;lat<90-1e-9;lat+=step)for(let l=l0;l<l1-1e-9;l+=step){
  const a=at(l,lat),b=at(l+step,lat),c=at(l+step,lat+step),d=at(l,lat+step);
  for(const [tri,k] of [[[a,b,c],0],[[a,c,d],1]] as [V3[],number][]){
   const n=unit([tri[0][0]+tri[1][0]+tri[2][0],tri[0][1]+tri[1][1]+tri[2][1],tri[0][2]+tri[1][2]+tri[2][2]]);
   if(n[2]>-.02)faces.push({p:tri.map(v=>[v[0],v[1]]),n,lon:l+step*(k?.33:.67),lat:lat+step*(k?.67:.33),i:i*2+k});
  }
  i++;
 }
 return faces.sort((x,y)=>x.n[2]-y.n[2]);
}
type LL=[number,number][];
const CONTINENTS:LL[]=[
 [[-165,64],[-140,70],[-95,72],[-75,62],[-60,50],[-80,30],[-97,17],[-106,22],[-124,40],[-130,56]],
 [[-81,9],[-60,9],[-35,-6],[-40,-23],[-58,-38],[-69,-55],[-75,-40],[-72,-15],[-81,-4]],
 [[-10,36],[-9,58],[20,70],[60,72],[100,77],[140,72],[172,66],[160,58],[141,47],[125,35],[121,22],[106,9],[99,20],[80,8],[72,22],[57,25],[48,30],[36,36],[26,40],[12,44],[0,41]],
 [[-17,15],[-10,32],[10,37],[32,31],[43,12],[51,11],[40,-15],[32,-29],[20,-35],[13,-20],[9,4],[-8,5]],
 [[114,-22],[130,-12],[143,-11],[153,-27],[146,-39],[135,-35],[115,-34]],
 [[-56,60],[-44,60],[-20,72],[-30,82],[-60,80],[-70,76]],
];
function inside(poly:LL,lon:number,lat:number){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)c=!c;}return c;}
const wrap=(lon:number)=>((lon+180)%360+360)%360-180;
type Ground="ocean"|"land"|"ice";
const ground=(lon:number,lat:number):Ground=>lat<-70||lat>78?"ice":CONTINENTS.some(p=>inside(p,wrap(lon),lat))?"land":"ocean";
const EARTH={ocean:["#4F63DA","#1F1C5E"],land:["#67BF57","#245C32"],ice:[C.ivory,"#9A97C0"]} as const;
const CLOUDS:[number,number,number][]=[[-140,42,11],[-100,8,8],[-40,-30,10],[-20,50,12],[30,-5,7],[70,30,10],[110,48,10],[150,-25,11],[175,12,8],[-70,-55,13],[10,-58,14],[-150,-10,8],[-60,22,9]];
const cloudCover=(lon:number,lat:number,t:number)=>{let m=0;for(const [lo,la,s] of CLOUDS){const dl=wrap(lon-lo-t*2.5)*Math.cos(lat*D);m=Math.max(m,smooth(s-Math.hypot(dl,lat-la),-3,3));}return m;};
const tone=(m:readonly [string,string],n:V3,jit:number)=>mix(m[1],m[0],clamp01(.3+.78*dot(n,LIGHT)+jit));
function Globe({faces,r,t,geo,dim=0}:{faces:Face[];r:number;t:number;geo:number;dim?:number}){
 return <g strokeLinejoin="round">
  {faces.map(f=>{const g=ground(f.lon+geo,f.lat),c=mix(tone(EARTH[g],f.n,(hash(f.i)-.5)*.08),"#0E0C24",dim);return <polygon key={f.i} points={pts(f.p.map(([x,y])=>[x*r,y*r]))} fill={c} stroke={c} strokeWidth={1}/>;})}
  {faces.map(f=>{const m=cloudCover(f.lon+geo,f.lat,t);if(m<.03)return null;const c=mix(mix("#B9B6D2",C.ivory,clamp01(dot(f.n,LIGHT)+.3)),"#2A2850",dim);return <polygon key={`c${f.i}`} points={pts(f.p.map(([x,y])=>[x*r*1.02,y*r*1.02]))} fill={c} opacity={.55*m}/>;})}
 </g>;
}

/* ───────────── Cut face: the layered disc in the cut plane ───────────── */
/** Layer radii as fractions of the Earth radius: inner core 1220 km, outer core 3480 km, 660 km boundary, crust
 *  (exaggerated so it stays visible). */
export const LAYERS={inner:.19,outer:.546,lower:.896,crust:.975};
const LAYER_COLORS:[string,string][]=[["#FFF6D8","#F6C453"],["#FFC24A","#E2702A"],["#E2582E","#9C2C24"],["#EF7A3C","#B23F26"],["#B49A82","#5A4640"]];
const layerOf=(r:number)=>r<LAYERS.inner?0:r<LAYERS.outer?1:r<LAYERS.lower?2:r<LAYERS.crust?3:4;
type DiscFace={p:number[][];r:number;ang:number;cx:number;cy:number;k:number;i:number};
const DISC:DiscFace[]=(()=>{
 const rings=[0,.1,.19,.29,.4,.47,.546,.64,.73,.815,.896,.94,.975,1],out:DiscFace[]=[];let i=0;
 for(let k=0;k<rings.length-1;k++){const n=k===0?7:6+5*k,r0=rings[k],r1=rings[k+1],off=k*.37;
  const p=(a:number,r:number)=>[Math.cos(a)*r,Math.sin(a)*r];
  for(let j=0;j<n;j++){const a0=(j+off)/n*2*Math.PI,a1=(j+1+off)/n*2*Math.PI,am=(a0+a1)/2,step=2*Math.PI/n;
   const tris=k===0?[[[0,0],p(a0,r1),p(a1,r1)]]:[[p(a0,r0),p(a1,r0),p(am,r1)],[p(a1,r0),p(am+step,r1),p(am,r1)]];
   tris.forEach((tri,q)=>{const cx=(tri[0][0]+tri[1][0]+tri[2][0])/3,cy=(tri[0][1]+tri[1][1]+tri[2][1])/3;
    out.push({p:tri,r:k===0?r1*.5:(r0+r1)/2,ang:Math.atan2(cy,cx),cx,cy,k:q,i:i++});});}
 }
 return out;
})();
function discFill(f:DiscFace,t:number){
 const L=layerOf(f.r),[lt,dk]=LAYER_COLORS[L];
 let k=.56+.22*(-.55*f.cx-.8*f.cy)+(f.k?-.08:.05)+(hash(f.i*1.3)-.5)*.16;
 if(L===1)k+=.17*Math.sin(f.ang*3+f.r*15-t*1.6)+.08*Math.sin(f.ang*7-t*2.3);
 if(L===0)k+=.12+.08*Math.sin(t*1.3);
 if(L===2||L===3)k+=.05*Math.sin(f.ang*2+t*.35+f.r*6);
 return mix(dk,lt,clamp01(k));
}
/** The layered disc of radius R in its own plane (callers squash it into the cut ellipse). */
function LayerDisc({R,t,uid,detail=1}:{R:number;t:number;uid:string;detail?:number}){
 const cells=detail>.5?Array.from({length:6},(_,c)=>{const th=c*60+15,dir=c%2?1:-1,path=Array.from({length:25},(_,s)=>{const a=s/24*2*Math.PI,ang=(th+17*Math.cos(a))*D,r=(.715+.105*Math.sin(a))*R;return [Math.cos(ang)*r,Math.sin(ang)*r];});return {path,dir,c};}):[];
 return <g>
  <defs><radialGradient id={`core-${uid}`}><stop offset="0" stopColor="#FFFBEA" stopOpacity=".95"/><stop offset=".45" stopColor={C.yellow} stopOpacity=".45"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient></defs>
  {[1,LAYERS.crust,LAYERS.lower,LAYERS.outer,LAYERS.inner].map((r,i)=><circle key={i} r={r*R} fill={LAYER_COLORS[layerOf(r-.01)][1]}/>)}
  <g strokeLinejoin="round">{DISC.map(f=>{const c=discFill(f,t);return <polygon key={f.i} points={pts(f.p.map(([x,y])=>[x*R,y*R]))} fill={c} stroke={c} strokeWidth={1} vectorEffect="non-scaling-stroke"/>;})}</g>
  {cells.map(c=><polyline key={c.c} points={pts(c.path)} fill="none" stroke="#FFC08A" strokeWidth={3} strokeDasharray="10 14" strokeDashoffset={c.dir*t*16} strokeLinecap="round" opacity={.32} vectorEffect="non-scaling-stroke"/>)}
  {[LAYERS.inner,LAYERS.outer,LAYERS.lower,LAYERS.crust].map((r,i)=><circle key={i} r={r*R} fill="none" stroke="#2A1420" strokeWidth={2} opacity={.35} vectorEffect="non-scaling-stroke"/>)}
  <circle r={R*.36} fill={`url(#core-${uid})`} opacity={.6+.12*Math.sin(t*1.3)}/>
 </g>;
}

/* ───────────── Shaft, jumper, capsule, sparkles ───────────── */
/** A drilled shaft from (x0,y0) to (x1,y1), half width w; p grows it from the start with a glowing drill head. */
function Shaft({x0,y0,x1,y1,w,p,t}:{x0:number;y0:number;x1:number;y1:number;w:number;p:number;t:number}){
 if(p<=.002)return null;
 const len=Math.hypot(x1-x0,y1-y0),ang=Math.atan2(y1-y0,x1-x0)/D,L=len*p,n=Math.floor(L/34);
 return <g transform={`translate(${x0},${y0}) rotate(${ang})`}>
  <rect x={0} y={-w-5} width={L} height={2*w+10} fill="#2A1420" opacity={.55}/>
  <rect x={0} y={-w} width={L} height={2*w} fill="#0B0814"/>
  <rect x={0} y={-w} width={L} height={w*.6} fill="#2A2240" opacity={.85}/>
  <rect x={0} y={w*.42} width={L} height={w*.58} fill="#150F22"/>
  <rect x={0} y={-w*.22} width={L} height={w*.44} fill={C.lavender} opacity={.07+.02*Math.sin(t*1.7)}/>
  {Array.from({length:n},(_,i)=><line key={i} x1={17+i*34} y1={-w} x2={17+i*34} y2={w} stroke={C.lavender} strokeWidth={1.5} opacity={.16} vectorEffect="non-scaling-stroke"/>)}
  {Array.from({length:n},(_,i)=>[-1,1].map(s=><circle key={`${i}${s}`} cx={34+i*34} cy={s*(w-5)} r={2.6} fill={C.yellowLine} opacity={.45+.4*Math.sin(t*2.6+i*1.7+s)}/>))}
  {[-1,1].map(s=><line key={s} x1={0} y1={s*w} x2={L} y2={s*w} stroke={C.lavender} strokeWidth={2.5} opacity={.8} vectorEffect="non-scaling-stroke"/>)}
  {p<.999&&<g transform={`translate(${L},0)`}>
   <circle r={w*1.5} fill={C.yellow} opacity={.25}/><circle r={w*.7} fill="#FFF3C0" opacity={.9}/>
   {Array.from({length:7},(_,i)=>{const a=(i/7*2-1)*70*D+Math.sin(t*9+i)*.2,l=w*(1.1+.6*hash(i+Math.floor(t*8)));return <line key={i} x1={Math.cos(a)*w*.6} y1={Math.sin(a)*w*.6} x2={Math.cos(a)*l*1.4} y2={Math.sin(a)*l*1.4} stroke={C.yellowLine} strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke"/>;})}
  </g>}
 </g>;
}
/** Small jumper in an ivory suit with a yellow visor (about 64 px tall), facing the viewer. spread 0 standing →
 *  1 skydiver star. Drawn with a dark outline so it reads over the bright core and the mantle. */
export function Jumper({spread,rot=0,scale=1}:{spread:number;rot?:number;scale?:number}){
 const arm=(s:number)=>[lerp(s*13,s*21,spread),lerp(14,-21,spread)],leg=(s:number)=>[lerp(s*6,s*15,spread),lerp(33,29,spread)];
 const limb=(a:number[],b:number[],w:number,key:string)=><g key={key}><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#120C1D" strokeWidth={w+4} strokeLinecap="round"/><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.ivory} strokeWidth={w} strokeLinecap="round"/></g>;
 return <g transform={`rotate(${rot}) scale(${scale})`}>
  {[-1,1].map(s=>{const f=leg(s);return <g key={`l${s}`}>{limb([s*5,12],f,7,"x")}<circle cx={f[0]} cy={f[1]} r={4.6} fill={C.purple} stroke="#120C1D" strokeWidth={1.5}/></g>;})}
  {[-1,1].map(s=>{const h=arm(s);return <g key={`a${s}`}>{limb([s*9,-5],h,6,"x")}<circle cx={h[0]} cy={h[1]} r={4.2} fill={C.purple} stroke="#120C1D" strokeWidth={1.5}/></g>;})}
  <polygon points={pts([[-11,-11],[11,-11],[9,15],[-9,15]])} fill="#120C1D" stroke="#120C1D" strokeWidth={4} strokeLinejoin="round"/>
  <polygon points={pts([[-11,-11],[0,-11],[0,15],[-9,15]])} fill={C.ivory}/><polygon points={pts([[0,-11],[11,-11],[9,15],[0,15]])} fill="#CFC6E3"/>
  <rect x={-9.5} y={5} width={19} height={4} fill={C.purple}/>
  <circle cx={0} cy={-21} r={12.5} fill={C.ivory} stroke="#120C1D" strokeWidth={2.5}/>
  <ellipse cx={1.5} cy={-21} rx={8} ry={5.8} fill={C.yellow}/><ellipse cx={-1.5} cy={-23} rx={2.6} ry={1.6} fill="#FFFBEA" opacity={.85}/>
 </g>;
}
/** Gravity-train capsule along +x with a bubble window and the traveller's helmet inside. */
function Capsule({rot=0}:{rot?:number}){
 return <g transform={`rotate(${rot})`}>
  <rect x={-36} y={-16} width={72} height={32} rx={16} fill="#120C1D"/>
  <rect x={-34} y={-14} width={68} height={28} rx={14} fill="#CFC6E3"/>
  <path d="M -34 0 A 14 14 0 0 1 -20 -14 L 34 -14 L 34 0 Z" fill={C.ivory}/>
  <rect x={-30} y={2} width={60} height={4} fill={C.purple}/>
  <circle cx={10} cy={-3} r={10} fill="#2A2240" stroke="#120C1D" strokeWidth={2}/>
  <circle cx={10} cy={-2} r={6} fill={C.ivory}/><ellipse cx={11} cy={-2} rx={4} ry={2.8} fill={C.yellow}/>
  <circle cx={-30} cy={0} r={3} fill={C.pink}/><circle cx={30} cy={0} r={3} fill={C.yellowLine}/>
 </g>;
}
function Sparkles({w,t,r=40}:{w:number;t:number;r?:number}){
 if(w<.01)return null;
 return <g opacity={w}>{Array.from({length:6},(_,i)=>{const a=i*60*D+t*.6,rr=r+6*Math.sin(t*2+i),s=4+2.5*(.5+.5*Math.sin(t*3.1+i*2));
  return <polygon key={i} transform={`translate(${Math.cos(a)*rr},${Math.sin(a)*rr})`} points={pts([[0,-s*1.8],[s*.45,-s*.45],[s*1.8,0],[s*.45,s*.45],[0,s*1.8],[-s*.45,s*.45],[-s*1.8,0],[-s*.45,-s*.45]])} fill={i%2?C.yellowLine:C.ivory}/>;})}</g>;
}
/** Arrow from (x,y) along (dx,dy) with a dark outline. */
function Arrow({x,y,dx,dy,color,w=5,opacity=1}:{x:number;y:number;dx:number;dy:number;color:string;w?:number;opacity?:number}){
 const l=Math.hypot(dx,dy);if(l<4||opacity<.01)return null;const ux=dx/l,uy=dy/l,head=Math.min(14,l*.5),bx=x+dx-ux*head,by=y+dy-uy*head;
 const tip=[[x+dx,y+dy],[bx-uy*head*.6,by+ux*head*.6],[bx+uy*head*.6,by-ux*head*.6]];
 return <g opacity={opacity}><line x1={x} y1={y} x2={bx} y2={by} stroke="#120C1D" strokeWidth={w+4} strokeLinecap="round"/><polygon points={pts(tip)} fill="#120C1D" stroke="#120C1D" strokeWidth={4} strokeLinejoin="round"/>
  <line x1={x} y1={y} x2={bx} y2={by} stroke={color} strokeWidth={w} strokeLinecap="round"/><polygon points={pts(tip)} fill={color}/></g>;
}
/** Speed streaks trailing behind a body moving along (ux,uy). */
function Streaks({ux,uy,speed,t}:{ux:number;uy:number;speed:number;t:number}){
 if(speed<.02)return null;
 return <g opacity={speed}>{[-14,-5,5,14].map((o,i)=>{const len=(26+36*speed)*(.7+.3*Math.sin(t*7+i*2)),sx=-ux*(30+i%2*8)+(-uy)*o,sy=-uy*(30+i%2*8)+ux*o;
  return <line key={i} x1={sx} y1={sy} x2={sx-ux*len} y2={sy-uy*len} stroke={C.ivory} strokeWidth={3} strokeLinecap="round" opacity={.55}/>;})}</g>;
}
function Pin({x,y,nx,ny,show}:{x:number;y:number;nx:number;ny:number;show:number}){
 if(show<.01)return null;const a=Math.atan2(ny,nx)/D+90;
 return <g transform={`translate(${x},${y}) rotate(${a}) scale(${.7+.3*show})`} opacity={show}>
  <ellipse cx={0} cy={0} rx={10} ry={4} fill={C.yellow} opacity={.35}/>
  <path d="M 0 -2 C -14 -18, -12 -38, 0 -38 C 12 -38, 14 -18, 0 -2 Z" fill={C.yellow} stroke="#120C1D" strokeWidth={2.5}/>
  <circle cx={0} cy={-27} r={5} fill="#120C1D"/>
 </g>;
}

/* ───────────── tunnel-earth ───────────── */
/** Geometry of the hero (object-local px at scale 1). phi = yaw of the cut plane (the cut disc shows as an ellipse). */
export const EARTH_CUT={R:230,phi:40,tw:30,lp:262,chordA:56,chordX:.5};
const CPH=Math.cos(EARTH_CUT.phi*D),GEO=20;
const KEPT=hemi(EARTH_CUT.phi+90,EARTH_CUT.phi+270,8),FRONT=hemi(EARTH_CUT.phi-90,EARTH_CUT.phi+90,8);
type Tube={a:[number,number];b:[number,number];kind:"polar"|"chord"};
/** Tunnels in the cut plane (in-plane coordinates; screen x = in-plane x · cos phi). */
export function tunnels(rows:number):Tube[]{
 const {R,chordA,chordX}=EARTH_CUT,list:Tube[]=[];
 if(rows!==2)list.push({a:[0,-R],b:[0,R],kind:"polar"});
 if(rows===2)list.push({a:[-R*Math.sin(chordA*D),-R*Math.cos(chordA*D)],b:[R*Math.sin(chordA*D),-R*Math.cos(chordA*D)],kind:"chord"});
 if(rows>=3){const x=R*chordX,y=R*Math.sqrt(1-chordX*chordX);list.push({a:[x,-y],b:[x,y],kind:"chord"});}
 return list;
}
/** Reveal shares of tunnel-earth for a value V below the flight range. */
export const earthReveal=(V:number)=>({open:smooth(V,.02,.14),drill:smooth(V,.15,.27),ready:smooth(V,.22,.3)});
function TunnelEarth({o,t,xray,uid,overlay}:{o:TimedObject;t:number;xray:number;uid:string;overlay:boolean}){
 const {R,tw,lp}=EARTH_CUT,tr=trackAt(t,o.activeKeys??[],KS("tunnel-earth")),{open,drill,ready}=earthReveal(tr.V),u=tr.u,x=tunnelPos(u);
 const moving=smooth(Math.abs(tr.du),.004,.04),speed=Math.abs(Math.sin(Math.PI*u))*moving,dir=Math.sign(tr.du)||1;
 const tubes=tunnels(o.rows||1),flip=180*smooth(x,-.45,.45),weightless=(1-smooth(Math.abs(x),.06,.3))*ready;
 const S=(p:[number,number]):[number,number]=>[p[0]*CPH,p[1]];
 if(overlay){
  // X-ray: gravity inside a uniform ball points to the centre and grows with the radius.
  const field=[.3,.5,.7,.9].flatMap((r,ri)=>Array.from({length:8+ri*2},(_,j)=>{const a=(j/(8+ri*2)+ri*.07)*2*Math.PI,px=Math.cos(a)*r*R,py=Math.sin(a)*r*R;return {px,py,r,key:`${ri}-${j}`};})).filter(p=>Math.abs(p.px)>tw+10);
  return <g opacity={xray*open}>{field.map(p=>{const [sx,sy]=S([p.px,p.py]),l=.24*p.r*R*(.92+.08*Math.sin(t*2-p.r*6));return <Arrow key={p.key} x={sx} y={sy} dx={-sx/Math.hypot(sx,sy)*l} dy={-sy/Math.hypot(sx,sy)*l} color={p.r>.6?C.lavender:"#BFA8F0"} w={3.5}/>;})}
   <circle r={7} fill={C.yellow}/><circle r={16} fill="none" stroke={C.yellow} strokeWidth={2} opacity={.6}/></g>;
 }
 const sil=`M 0 ${-R} A ${R} ${R} 0 0 0 0 ${R} A ${lerp(R,R*CPH,open)} ${R} 0 0 0 0 ${-R} Z`;
 // Jumper (polar tunnel): stands beside the north mouth, hops in, flips feet-first toward the new "down" at the centre.
 const k0=1-smooth(u,0,.1),k1=smooth(u,.9,1),restY=Math.sqrt(R*R-38*38)+31,jx=38*(k1-k0),jumperY=x*lp+k0*(-restY-x*lp)+k1*(restY-x*lp);
 const polar=tubes.find(b=>b.kind==="polar"),chord=tubes.find(b=>b.kind==="chord");
 const pull=Math.abs(x)*ready;
 // Capsule on the chord: same phase, along the chord from end a to end b.
 let cap:null|{x:number;y:number;ux:number;uy:number;mx:number;my:number}=null;
 if(chord){const [ax,ay]=S(chord.a),[bx,by]=S(chord.b),len=Math.hypot(bx-ax,by-ay),ux=(bx-ax)/len,uy=(by-ay)/len,half=len/2-30,mx=(ax+bx)/2,my=(ay+by)/2;cap={x:mx+ux*half*x,y:my+uy*half*x,ux,uy,mx,my};}
 return <g>
  <path d={sil} fill="none" stroke="#7FA0FF" strokeWidth={26} opacity={.07}/>
  <path d={sil} fill="none" stroke="#9CB4FF" strokeWidth={9} opacity={.22}/>
  <Globe faces={KEPT} r={R} t={t} geo={GEO}/>
  {open>.001&&<g opacity={smooth(open,0,.25)}>
   <g transform={`scale(${CPH},1)`}>
    <LayerDisc R={R} t={t} uid={uid}/>
    {tubes.map((b,i)=><Shaft key={i} x0={b.a[0]} y0={b.a[1]} x1={b.b[0]} y1={b.b[1]} w={b.kind==="polar"?tw:tw*.8} p={drill} t={t}/>)}
   </g>
   <ellipse rx={R*CPH} ry={R} fill="none" stroke="#FFE2C0" strokeWidth={2.5} opacity={.5}/>
  </g>}
  {polar&&drill>.01&&<g opacity={smooth(drill,0,.15)}><ellipse cx={0} cy={-R} rx={tw*CPH+8} ry={6} fill="#120C1D" stroke={C.lavender} strokeWidth={2.5}/>
   <g opacity={smooth(drill,.92,1)}><ellipse cx={0} cy={R} rx={tw*CPH+8} ry={6} fill="#120C1D" stroke={C.lavender} strokeWidth={2.5}/></g></g>}
  {chord&&<g>{[chord.a,chord.b].map((p,i)=>{const [sx,sy]=S(p),l=Math.hypot(sx,sy);return <Pin key={i} x={sx} y={sy} nx={sx/l} ny={sy/l} show={i===0?smooth(drill,0,.2):smooth(drill,.8,1)}/>;})}</g>}
  {open<.999&&<g opacity={1-smooth(open,.72,1)} transform={`translate(${R},0) scale(${1-.94*open},1) translate(${-R},0)`}>
   <Globe faces={FRONT} r={R} t={t} geo={GEO}/>
   <path d={`M 0 ${-R} A ${R} ${R} 0 0 1 0 ${R} A ${R*CPH} ${R} 0 0 1 0 ${-R} Z`} fill="#0A0814" opacity={.5*smooth(open,0,.8)}/>
   <path d={`M 0 ${-R} A ${R*CPH} ${R} 0 0 0 0 ${R}`} fill="none" stroke="#FFE2C0" strokeWidth={3} opacity={.6*smooth(open,0,.15)}/>
  </g>}
  {cap&&ready>.01&&<g opacity={ready}>
   <line x1={cap.x} y1={cap.y} x2={0} y2={0} stroke={C.lavender} strokeWidth={3} strokeDasharray="4 9" strokeDashoffset={-t*20} opacity={.55}/>
   <g transform={`translate(${cap.x},${cap.y})`}><Streaks ux={cap.ux*dir} uy={cap.uy*dir} speed={speed} t={t}/>
    <Arrow x={cap.uy*30} y={-cap.ux*30} dx={-cap.ux*x*64} dy={-cap.uy*x*64} color={C.yellow} opacity={smooth(Math.abs(x),.05,.15)}/>
    <g transform={`scale(${.88+.12*ready})`}><Capsule rot={Math.atan2(cap.uy,cap.ux)/D}/></g></g>
  </g>}
  {polar&&ready>.01&&<g opacity={ready} transform={`translate(${jx},${jumperY})`}>
   <Streaks ux={0} uy={dir} speed={speed} t={t}/>
   <Sparkles w={weightless} t={t}/>
   <Arrow x={30} y={-Math.sign(x)*6} dx={0} dy={-Math.sign(x)*70*Math.abs(x)} color={C.lavender} opacity={smooth(pull,.05,.15)}/>
   <g transform={`scale(${.88+.12*ready})`}><Jumper spread={smooth(u,.03,.14)*(1-smooth(u,.86,.97))} rot={flip}/></g>
  </g>}
 </g>;
}

/* ───────────── gravity-shells ───────────── */
/** Cone axes (degrees) of the two shell pairs that cancel. */
const CONES=[24,128];
function hit(px:number,py:number,ex:number,ey:number,R:number){const b=px*ex+py*ey,c=px*px+py*py-R*R,s=-b+Math.sqrt(Math.max(0,b*b-c));return [px+ex*s,py+ey*s];}
/** Shell theorem: the ball under you pulls, the shell above you cancels. a = depth: 0 surface → 1 centre. */
function GravityShells({t,a,uid}:{t:number;a:number;uid:string}){
 const R=220,r=R*(1-a),py=-r,shell=smooth(a,.06,.22),arrow=smooth(r/R,.03,.14),float=1-smooth(r/R,.04,.2);
 const cones=CONES.map((deg,i)=>{const th=(deg+5*Math.sin(t*.4+i*2))*D,beta=11*D,rays=[-1,1].flatMap(dirn=>[th-beta,th+beta].map(an=>hit(0,py,dirn*Math.cos(an),-dirn*Math.sin(an),R)));
  const arc=(p:number[],q:number[])=>{const a0=Math.atan2(p[1],p[0]),a1=Math.atan2(q[1],q[0]);let da=a1-a0;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;return Array.from({length:9},(_,k)=>{const an=a0+da*k/8;return [Math.cos(an)*R,Math.sin(an)*R];});};
  return {i,th,near:[rays[0],rays[1]],far:[rays[2],rays[3]],nearArc:arc(rays[0],rays[1]),farArc:arc(rays[2],rays[3])};});
 return <g>
  <defs><clipPath id={`ball-${uid}`}><circle r={Math.max(.5,r)}/></clipPath>
   <radialGradient id={`ballglow-${uid}`}><stop offset=".7" stopColor={C.yellow} stopOpacity="0"/><stop offset=".92" stopColor={C.yellow} stopOpacity=".35"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient></defs>
  <g opacity={.3}><LayerDisc R={R} t={t} uid={`${uid}-pale`} detail={0}/></g>
  <circle r={R} fill={C.lavender} opacity={.1}/>
  {[.2,.4,.6,.8,1].map((k,i)=><circle key={i} r={k*R} fill="none" stroke={C.lavender} strokeWidth={2} strokeDasharray="8 10" strokeDashoffset={(i%2?1:-1)*t*10} opacity={.3}/>)}
  {r>.5&&<g clipPath={`url(#ball-${uid})`}><LayerDisc R={R} t={t} uid={uid}/></g>}
  {r>2&&<circle r={r*1.12} fill={`url(#ballglow-${uid})`}/>}
  {r>.5&&<circle r={r} fill="none" stroke={C.yellow} strokeWidth={4} opacity={.9}/>}
  <rect x={-9} y={-R} width={18} height={R} fill="#120C1D" opacity={.8}/>
  <line x1={-9} y1={-R} x2={-9} y2={0} stroke={C.lavender} strokeWidth={2} opacity={.45}/><line x1={9} y1={-R} x2={9} y2={0} stroke={C.lavender} strokeWidth={2} opacity={.45}/>
  <g opacity={shell}>{cones.map(c=><g key={c.i}>
   <polygon points={pts([[0,py],...c.near])} fill={C.lavender} opacity={.16}/><polygon points={pts([[0,py],...c.far])} fill={C.lavender} opacity={.16}/>
   {[...c.near,...c.far].map((q,k)=><line key={k} x1={0} y1={py} x2={q[0]} y2={q[1]} stroke={C.lavender} strokeWidth={1.5} opacity={.45}/>)}
   <polyline points={pts(c.nearArc)} fill="none" stroke={C.lavender} strokeWidth={9} strokeLinecap="round" opacity={.85}/>
   <polyline points={pts(c.farArc)} fill="none" stroke={C.lavender} strokeWidth={9} strokeLinecap="round" opacity={.85}/>
   {[-1,1].map(s=>{const ex=s*Math.cos(c.th),ey=-s*Math.sin(c.th),mx=ex*58,my=py+ey*58;return <g key={s}>
    <Arrow x={ex*36} y={py+ey*36} dx={ex*48} dy={ey*48} color={C.lavender} w={4}/>
    {[-3,3].map(o=><line key={o} x1={mx-ey*7+ex*o} y1={my+ex*7+ey*o} x2={mx+ey*7+ex*o} y2={my-ex*7+ey*o} stroke="#120C1D" strokeWidth={2.5}/>)}</g>;})}
  </g>)}</g>
  <Arrow x={0} y={py+30} dx={0} dy={r*.5} color={C.yellow} w={7} opacity={arrow*smooth(r,40,70)}/>
  <circle r={4+3*float} fill={C.ivory} opacity={.5+.5*float}/>
  <g transform={`translate(0,${py})`}><Sparkles w={float} t={t} r={44}/>
   <Jumper spread={smooth(a,.04,.2)} rot={10*float*Math.sin(t*1.1)}/></g>
 </g>;
}

/* ───────────── stopwatch ───────────── */
/** Share of "arrived" for the stopwatch: averaged over the last 0.6 s, so the green glow eases in after the arc closes. */
export function stopwatchDone(t:number,keys:readonly Key[],ks:number){
 const segs=buildTrack(keys,ks,0,true);let n=0;for(let k=0;k<12;k++)n+=smooth(trackValue(segs,t-k*.05),.985,1);
 return easeSine(n/12);
}
function Stopwatch({o,t,uid}:{o:TimedObject;t:number;uid:string}){
 const keys=o.activeKeys??[],V=trackAt(t,keys,KS("stopwatch"),0,true).V,done=stopwatchDone(t,keys,KS("stopwatch")),cy=22,arcC=mix(C.yellow,C.green,done),ang=-90+360*V;
 const arc=(r:number,from:number,to:number)=>{const n=Math.max(2,Math.ceil(Math.abs(to-from)/4));return Array.from({length:n+1},(_,k)=>{const a=(from+(to-from)*k/n)*D;return [Math.cos(a)*r,cy+Math.sin(a)*r];});};
 const bezel=Array.from({length:24},(_,k)=>{const a0=k*15*D,a1=(k+1)*15*D,am=(k+.5)*15,lit=.5+.5*Math.cos((am-225)*D)+(k%2?-.08:.06);
  return {p:[[Math.cos(a0)*120,cy+Math.sin(a0)*120],[Math.cos(a1)*120,cy+Math.sin(a1)*120],[Math.cos(a1)*99,cy+Math.sin(a1)*99],[Math.cos(a0)*99,cy+Math.sin(a0)*99]],c:mix("#4A4760","#ECE8F6",clamp01(lit)),k};});
 const glint=(t*.22)%1;
 return <g>
  <defs><radialGradient id={`swglow-${uid}`}><stop offset=".55" stopColor={C.green} stopOpacity=".55"/><stop offset="1" stopColor={C.green} stopOpacity="0"/></radialGradient>
   <clipPath id={`swface-${uid}`}><circle cx={0} cy={cy} r={99}/></clipPath></defs>
  <ellipse cx={0} cy={164} rx={104} ry={13} fill="#000" opacity={.25}/>
  {done>.01&&<circle cx={0} cy={cy} r={150} fill={`url(#swglow-${uid})`} opacity={done*(.85+.15*Math.sin(t*3))}/>}
  <circle cx={0} cy={-142} r={17} fill="none" stroke="#120C1D" strokeWidth={13}/><circle cx={0} cy={-142} r={17} fill="none" stroke="#B9B5CC" strokeWidth={8}/>
  <path d="M -12 -142 A 17 17 0 0 1 4 -158" fill="none" stroke="#F2EFFA" strokeWidth={3} opacity={.8}/>
  <rect x={-10} y={-122} width={20} height={26} fill="#5E5A72"/><rect x={-10} y={-122} width={10} height={26} fill="#9C98B2"/>
  <rect x={-24} y={-130} width={48} height={16} rx={5} fill="#5E5A72"/><rect x={-24} y={-130} width={24} height={16} rx={5} fill="#C9C5DA"/>
  {Array.from({length:7},(_,i)=><line key={i} x1={-18+i*6} y1={-128} x2={-18+i*6} y2={-116} stroke="#2E2B3E" strokeWidth={1.5} opacity={.6}/>)}
  <g transform={`rotate(45,0,${cy})`}><rect x={-8} y={cy-138} width={16} height={22} rx={3} fill="#5E5A72"/><rect x={-8} y={cy-138} width={8} height={22} rx={3} fill="#B9B5CC"/></g>
  <circle cx={0} cy={cy} r={123} fill="#120C1D"/>
  {bezel.map(b=><polygon key={b.k} points={pts(b.p)} fill={b.c} stroke={b.c} strokeWidth={1}/>)}
  <circle cx={0} cy={cy} r={99} fill="#140E22"/>
  <circle cx={-24} cy={cy-26} r={70} fill={C.purple} opacity={.06}/>
  {Array.from({length:60},(_,k)=>{const a=k*6*D,major=k%5===0,r0=major?80:88;return <line key={k} x1={Math.cos(a)*r0} y1={cy+Math.sin(a)*r0} x2={Math.cos(a)*94} y2={cy+Math.sin(a)*94} stroke={major?C.ivory:C.lavender} strokeWidth={major?4:2} opacity={major?.8:.35}/>;})}
  <circle cx={0} cy={cy} r={68} fill="none" stroke="#2C2540" strokeWidth={14}/>
  {V>.002&&<><polyline points={pts(arc(68,-90,ang))} fill="none" stroke={arcC} strokeWidth={26} strokeLinecap="round" opacity={.22}/>
   <polyline points={pts(arc(68,-90,ang))} fill="none" stroke={arcC} strokeWidth={14} strokeLinecap="round"/></>}
  <g transform={`translate(0,${cy+40})`}>
   <circle r={19} fill="#0B0814" stroke="#4A4760" strokeWidth={3}/>
   {Array.from({length:8},(_,k)=><circle key={k} cx={Math.cos(k*45*D)*14} cy={Math.sin(k*45*D)*14} r={1.6} fill={C.lavender} opacity={.6*(1-done)}/>)}
   <line x1={0} y1={0} x2={Math.cos((V*3600-90)*D)*13} y2={Math.sin((V*3600-90)*D)*13} stroke={C.yellow} strokeWidth={3} strokeLinecap="round" opacity={1-done}/>
   <polyline points={pts([[-8,0],[-2,7],[9,-7]])} fill="none" stroke={C.green} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" opacity={done}/>
  </g>
  <g transform={`rotate(${ang},0,${cy})`}>
   <line x1={-20} y1={cy} x2={86} y2={cy} stroke="#120C1D" strokeWidth={9} strokeLinecap="round"/>
   <line x1={-20} y1={cy} x2={86} y2={cy} stroke={C.ivory} strokeWidth={5} strokeLinecap="round"/>
   <circle cx={86} cy={cy} r={4} fill={arcC}/>
  </g>
  <circle cx={0} cy={cy} r={9} fill={C.yellow} stroke="#120C1D" strokeWidth={3}/>
  <g clipPath={`url(#swface-${uid})`}><polygon points={pts([[-100+glint*260,cy-120],[-70+glint*260,cy-120],[-150+glint*260,cy+120],[-180+glint*260,cy+120]])} fill="#fff" opacity={.07*Math.sin(Math.PI*glint)}/></g>
  <path d={`M ${-72} ${cy-52} A 88 88 0 0 1 ${-20} ${cy-86}`} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={.12}/>
 </g>;
}

/* ───────────── depth-gauge ───────────── */
/** Depth fractions of the Earth radius at the layer tops: crust → upper mantle → lower mantle (660 km) → outer core
 *  (2890 km) → inner core (5150 km) → centre. */
const DEPTHS=[0,.0055,.1036,.4536,.8085,1];
const DG={x0:-150,x1:-60,top:-246,bottom:290,lx:72,ly:-150,lr:98};
function DepthGauge({t,a,uid}:{t:number;a:number;uid:string}){
 const {x0,x1,top,bottom,lx,ly,lr}=DG,H=bottom-top,grow=smooth(a,0,.22),drill=smooth(a,.25,.5),far=smooth(a,.6,1);
 const ys=DEPTHS.map((d,i)=>i===1?top+5:top+d*H),cols=[LAYER_COLORS[4],LAYER_COLORS[3],LAYER_COLORS[2],LAYER_COLORS[1],LAYER_COLORS[0]];
 const facets:{p:number[][];c:string;k:string}[]=[];
 for(let b=0;b<5;b++){const y0=ys[b],y1=ys[b+1],rows=Math.max(1,Math.round((y1-y0)/44)),[lt,dk]=cols[b];
  for(let r=0;r<rows;r++){const a0=y0+(y1-y0)*r/rows,a1=y0+(y1-y0)*(r+1)/rows,mxs=x0+(x1-x0)*(.3+.4*hash(b*13+r));
   let k1=.62+(hash(b*7+r)-.5)*.16,k2=.4+(hash(b*11+r)-.5)*.16;
   if(b===3){k1+=.15*Math.sin(t*1.6+r);k2+=.15*Math.sin(t*1.6+r+1.5);}if(b===4){k1+=.1+.06*Math.sin(t*1.3);k2+=.1+.06*Math.sin(t*1.3);}
   facets.push({p:[[x0,a0],[mxs,a0],[x0,a1]],c:mix(dk,lt,clamp01(k1+.08)),k:`${b}-${r}-a`},{p:[[mxs,a0],[x1,a0],[x1,a1],[x0,a1]],c:mix(dk,lt,clamp01(k2)),k:`${b}-${r}-b`});}}
 // Magnifier: the top 40 km of the crust at 3.6 px/km; the deepest borehole goes about a third of the way to the mantle.
 const sY=ly-56,kpx=3.6,bore=12.3*kpx*drill,moho=sY+35*kpx;
 const strata=["#9C8670","#7E6A5A","#B49A82","#6A5448","#8E7A66","#A58E7A","#5A4640"];
 return <g>
  <defs><clipPath id={`loupe-${uid}`}><circle cx={lx} cy={ly} r={lr-6}/></clipPath>
   <radialGradient id={`dgcore-${uid}`}><stop offset="0" stopColor="#FFFBEA" stopOpacity=".7"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient></defs>
  <ellipse cx={(x0+x1)/2+8} cy={bottom+18} rx={78} ry={11} fill="#000" opacity={.4}/>
  <circle cx={(x0+x1)/2} cy={bottom-30} r={70} fill={`url(#dgcore-${uid})`} opacity={.55+.15*Math.sin(t*1.3)}/>
  <polygon points={pts([[x1,top],[x1+18,top-10],[x1+18,bottom-10],[x1,bottom]])} fill="#3A2232"/>
  {ys.slice(0,5).map((y,b)=><polygon key={b} points={pts([[x1,y],[x1+18,y-10],[x1+18,ys[b+1]-10],[x1,ys[b+1]]])} fill={mix(cols[b][1],"#120C1D",.35)}/>)}
  {facets.map(f=><polygon key={f.k} points={pts(f.p)} fill={f.c} stroke={f.c} strokeWidth={1}/>)}
  <polygon points={pts([[x0,top],[x1,top],[x1+18,top-10],[x0+18,top-10]])} fill="#4E9A55"/><polygon points={pts([[x0+40,top],[x1,top],[x1+18,top-10],[x0+58,top-10]])} fill="#3D5BD6" opacity={.8}/>
  {ys.slice(1,5).map((y,i)=><line key={i} x1={x0} y1={y} x2={x1} y2={y} stroke="#2A1420" strokeWidth={1.5} opacity={.4}/>)}
  <g transform={`translate(-105,${top-5})`}>
   <polygon points={pts([[-9,0],[0,-30],[9,0]])} fill="none" stroke="#C9C5DA" strokeWidth={2.5}/>
   {[-20,-10].map(y=><line key={y} x1={y*.3} y1={y} x2={-y*.3} y2={y} stroke="#C9C5DA" strokeWidth={1.5}/>)}
   <circle cx={0} cy={-32} r={3} fill={C.yellow} opacity={.5+.5*Math.sin(t*3)}/>
  </g>
  <rect x={-108} y={top-1} width={6} height={3} fill={C.pink} opacity={drill}/>
  <g opacity={grow}>
   <polygon points={pts([[-116,top-36],[-94,top-36],[lx,ly+lr],[lx,ly-lr]])} fill={C.lavender} opacity={.05}/>
   <line x1={-94} y1={top-36} x2={lx-lr*.2} y2={ly-lr*.98} stroke={C.lavender} strokeWidth={2} opacity={.4}/>
   <line x1={-94} y1={top+8} x2={lx-lr*.2} y2={ly+lr*.98} stroke={C.lavender} strokeWidth={2} opacity={.4}/>
   <rect x={-118} y={top-38} width={26} height={48} rx={4} fill="none" stroke={C.lavender} strokeWidth={2} opacity={.7}/>
   <g transform={`translate(${lx},${ly}) scale(${.55+.45*grow}) translate(${-lx},${-ly})`}>
    <line x1={lx+lr*.72} y1={ly+lr*.72} x2={lx+lr*.98} y2={ly+lr*.98} stroke="#120C1D" strokeWidth={20} strokeLinecap="round"/>
    <line x1={lx+lr*.72} y1={ly+lr*.72} x2={lx+lr*.98} y2={ly+lr*.98} stroke="#6E6A84" strokeWidth={13} strokeLinecap="round"/>
    <circle cx={lx} cy={ly} r={lr} fill="#0A0814"/>
    <g clipPath={`url(#loupe-${uid})`}>
     <rect x={lx-lr} y={ly-lr} width={2*lr} height={sY-(ly-lr)} fill="#0E0A1C"/>
     {Array.from({length:9},(_,i)=><circle key={i} cx={lx-80+hash(i*3)*160} cy={ly-lr+6+hash(i*7)*40} r={1.2+hash(i)*1.2} fill={C.ivory} opacity={.6}/>)}
     {strata.map((c,i)=>{const y0=sY+i*(moho-sY)/strata.length;return <path key={i} d={`M ${lx-lr} ${y0+3*Math.sin(i)} Q ${lx} ${y0-5+4*Math.cos(i*2)} ${lx+lr} ${y0+2} L ${lx+lr} ${moho} L ${lx-lr} ${moho} Z`} fill={c}/>;})}
     <rect x={lx-lr} y={moho} width={2*lr} height={lr} fill="#E2582E"/><rect x={lx-lr} y={moho} width={2*lr} height={4} fill="#FFB07A" opacity={.6}/>
     <rect x={lx-lr} y={sY-4} width={2*lr} height={6} fill="#4E9A55"/>
     <g transform={`translate(${lx-6},${sY-4})`}>
      <polygon points={pts([[-14,0],[0,-44],[14,0]])} fill="none" stroke="#C9C5DA" strokeWidth={3}/>
      {[-30,-18,-8].map(y=><line key={y} x1={y*.32} y1={y} x2={-y*.32} y2={y} stroke="#C9C5DA" strokeWidth={2}/>)}
      <circle cx={0} cy={-46} r={3.5} fill={C.yellow} opacity={.5+.5*Math.sin(t*3)}/>
     </g>
     {drill>.002&&<g>
      <rect x={lx-9} y={sY} width={6} height={bore} fill="#0B0814"/>
      <rect x={lx-8} y={sY} width={4} height={bore} fill="#B9B5CC"/>
      {Array.from({length:Math.ceil(bore/8)},(_,i)=>{const span=Math.max(8,Math.ceil(bore/8)*8),q=((i*8+t*14)%span)/span,y=sY+q*bore;return <line key={i} x1={lx-8} y1={y} x2={lx-4} y2={y+3} stroke="#4A4760" strokeWidth={1.5} opacity={Math.sin(Math.PI*q)}/>;})}
      <circle cx={lx-6} cy={sY+bore} r={5+1.5*Math.sin(t*9)} fill={C.yellow} opacity={.85*(1-smooth(a,.5,.6))+.3}/>
      <circle cx={lx-6} cy={sY+bore} r={11} fill={C.pink} opacity={.25*drill}/>
     </g>}
     <g opacity={far}><line x1={lx-6} y1={sY+bore+10} x2={lx-6} y2={ly+lr} stroke={C.yellow} strokeWidth={3} strokeDasharray="6 8" strokeDashoffset={-t*30}/></g>
    </g>
    <circle cx={lx} cy={ly} r={lr-3} fill="none" stroke="#120C1D" strokeWidth={14}/>
    <circle cx={lx} cy={ly} r={lr-3} fill="none" stroke="#9C98B2" strokeWidth={9}/>
    <path d={`M ${lx-lr*.7} ${ly-lr*.25} A ${lr*.75} ${lr*.75} 0 0 1 ${lx-lr*.25} ${ly-lr*.7}`} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={.18}/>
   </g>
  </g>
  {far>.01&&<g opacity={far}>
   <line x1={x0-14} y1={top+6} x2={x0-14} y2={top+6+(bottom-top-18)*far-30} stroke={C.yellow} strokeWidth={5} strokeDasharray="12 9" strokeDashoffset={-t*40}/>
   <Arrow x={x0-14} y={top+6+(bottom-top-18)*far-44} dx={0} dy={44} color={C.yellow} w={5}/>
   <circle cx={(x0+x1)/2} cy={bottom-4} r={7} fill={C.yellow} opacity={far}/>
   <circle cx={(x0+x1)/2} cy={bottom-4} r={14+3*Math.sin(t*3)} fill="none" stroke={C.yellow} strokeWidth={2.5} opacity={far*.7}/>
  </g>}
 </g>;
}

/* ───────────── orbit-shadow ───────────── */
export const ORBIT_SHADOW={R:232,ro:254};
function OrbitShadow({o,t}:{o:TimedObject;t:number}){
 const {R,ro}=ORBIT_SHADOW,tr=trackAt(t,o.activeKeys??[],KS("orbit-shadow")),V=tr.V,orbit=smooth(V,.02,.15),ready=smooth(V,.16,.3);
 const th=Math.PI*tr.W,sx=ro*Math.sin(th),sy=-ro*Math.cos(th),x=-Math.cos(th),yp=x*ro,moving=smooth(Math.abs(tr.dW),.004,.04);
 const faces=hemi(-180,180,12,-t*3);
 const sweep=Array.from({length:97},(_,k)=>{const a=k/96*2*Math.PI*orbit;return [ro*Math.sin(a),-ro*Math.cos(a)];});
 const trail=Array.from({length:10},(_,k)=>{const a0=th-(k+1)*.09,a1=th-k*.09;return {k,p:[[ro*Math.sin(a0),-ro*Math.cos(a0)],[ro*Math.sin(a1),-ro*Math.cos(a1)]]};});
 const tangent=[Math.cos(th),Math.sin(th)];
 return <g>
  <circle r={R*1.12} fill="#5E7BFF" opacity={.05}/>
  <g opacity={.5}><Globe faces={faces} r={R} t={t} geo={0} dim={.45}/></g>
  <circle r={R} fill="none" stroke={C.lavender} strokeWidth={3} opacity={.45}/>
  <Shaft x0={0} y0={-R} x1={0} y1={R} w={15} p={ready} t={t}/>
  <g opacity={ready*.6}>{Array.from({length:9},(_,k)=>{const y=-ro*Math.cos(k*Math.PI/8);return <line key={k} x1={-24} y1={y} x2={24} y2={y} stroke={C.lavender} strokeWidth={2}/>;})}
   {Array.from({length:16},(_,k)=>{const a=k*Math.PI/8;return <circle key={k} cx={ro*Math.sin(a)} cy={-ro*Math.cos(a)} r={3} fill={C.lavender}/>;})}</g>
  {orbit>.002&&<polyline points={pts(sweep)} fill="none" stroke={C.lavender} strokeWidth={3.5} strokeDasharray="12 10" opacity={.65}/>}
  <g opacity={moving*ready}>{trail.map(s=><line key={s.k} x1={s.p[0][0]} y1={s.p[0][1]} x2={s.p[1][0]} y2={s.p[1][1]} stroke={C.yellow} strokeWidth={6} strokeLinecap="round" opacity={.6*(1-s.k/10)}/>)}</g>
  {ready>.01&&<g opacity={ready}>
   <line x1={sx} y1={sy} x2={0} y2={yp} stroke={C.yellow} strokeWidth={3} strokeDasharray="7 7" strokeDashoffset={-t*20} opacity={.85}/>
   <circle cx={0} cy={yp} r={5} fill={C.yellow}/>
  </g>}
  <Arrow x={sx+tangent[0]*22} y={sy+tangent[1]*22} dx={tangent[0]*54} dy={tangent[1]*54} color={C.yellow} w={5} opacity={ready*moving}/>
  {orbit>.01&&<g opacity={orbit} transform={`translate(${sx},${sy}) rotate(${th/D}) scale(${.88+.12*orbit})`}>
   {[-1,1].map(s=><g key={s}><line x1={s*9} y1={0} x2={s*15} y2={0} stroke="#9C98B2" strokeWidth={3}/>
    <rect x={s>0?15:-37} y={-9} width={22} height={18} fill="#3D5BD6" stroke="#120C1D" strokeWidth={2}/>
    {[1,2].map(k=><line key={k} x1={(s>0?15:-37)+k*7.3} y1={-9} x2={(s>0?15:-37)+k*7.3} y2={9} stroke={C.yellowLine} strokeWidth={1.2} opacity={.7}/>)}</g>)}
   <rect x={-10} y={-11} width={20} height={22} rx={3} fill="#120C1D"/>
   <polygon points={pts([[-8,-9],[2,-9],[2,9],[-8,9]])} fill={C.lavender}/><polygon points={pts([[2,-9],[8,-9],[8,9],[2,9]])} fill={C.purple}/>
   <line x1={0} y1={11} x2={0} y2={17} stroke="#C9C5DA" strokeWidth={2}/><path d="M -6 21 Q 0 15 6 21" fill="none" stroke="#C9C5DA" strokeWidth={2.5}/>
   <circle cx={0} cy={-13} r={2.5} fill={C.pink} opacity={.5+.5*Math.sin(t*4)}/>
  </g>}
  {ready>.01&&<g opacity={ready} transform={`translate(0,${yp})`}>
   <Streaks ux={0} uy={Math.sign(Math.sin(th))||1} speed={Math.abs(Math.sin(th))*moving} t={t}/>
   <Sparkles w={1-smooth(Math.abs(x),.06,.3)} t={t} r={36}/>
   <Arrow x={28} y={0} dx={0} dy={54*Math.sin(th)} color={C.yellow} w={5} opacity={moving}/>
   <g transform={`scale(${(.88+.12*ready)*.9})`}><Jumper spread={smooth(Math.abs(Math.sin(th)),.05,.4)} rot={180*smooth(x,-.45,.45)}/></g>
  </g>}
 </g>;
}

export function TunnelArt({kind,o,t,a,xray,uid,overlay}:TunnelArtProps){
 switch(kind){
  case "tunnel-earth":return <TunnelEarth o={o} t={t} xray={xray} uid={uid} overlay={!!overlay}/>;
  case "gravity-shells":return overlay?null:<GravityShells t={t} a={a} uid={uid}/>;
  case "stopwatch":return overlay?null:<Stopwatch o={o} t={t} uid={uid}/>;
  case "depth-gauge":return overlay?null:<DepthGauge t={t} a={a} uid={uid}/>;
  case "orbit-shadow":return overlay?null:<OrbitShadow o={o} t={t}/>;
 }
 return null;
}
