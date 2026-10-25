import React from "react";
import brand from "../video-design/brand.json";
import {keyed,easeSine,type IllustratedTimeline} from "../src/lib/illustrated";
import {MINUTE_KEY_SECONDS,loopPhase,parseAmount,type MinuteKind} from "../src/lib/illustrated-catalog-minute";
import {Earth} from "./IllustratedSpace";

// Prepared objects for the "One minute on Earth" film (2026-10-22, World If Then). The film loops: its first and last
// frame is the maternity ward, so every ambient periodic motion (breathing, blinks, flicker, sparkles, the clock's
// second hand, heartbeats, fireflies…) runs through loopPhase(t, period, loop): with `loop` (the film length) each
// motion makes a whole number of cycles over the film and the last frame equals the first. Dioramas float in space on
// their own low-poly pedestals. Illustrations, not to scale; no logos; no words inside the objects except the
// counter / money-stack label (verbatim on-screen text). Every value derives from the frame time and the keyed state.
const C=brand.colors;
export type TimedObject=IllustratedTimeline["objects"][number];
export type MinuteArtProps={kind:string;o:TimedObject;t:number;a:number;xray:number;uid:string;overlay?:boolean;loop?:number;stackMax?:number};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number,a:number,b:number)=>{const x=clamp01((v-a)/(b-a));return x*x*(3-2*x);};
/** Rise over [a,b], fall over [c,d]. */
const win=(v:number,a:number,b:number,c:number,d:number)=>smooth(v,a,b)*(1-smooth(v,c,d));
const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const f1=(v:number)=>v.toFixed(1);
const pts=(p:number[][])=>p.map(([x,y])=>`${f1(x)},${f1(y)}`).join(" ");
const rgb=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const hex=(v:number[])=>"#"+v.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,"0")).join("");
const mix=(a:string,b:string,k:number)=>{const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v+(y[i]-v)*clamp01(k)));};
const D=Math.PI/180,TAU=Math.PI*2;
const FONT="'Manrope Variable',sans-serif";
type Keyed={activeKeys?:{at:number;value:number}[];enterAt?:number};
const INK="#120C1D";
const METAL={hi:"#7C7A92",top:"#666882",mid:"#4E4F62",lo:"#3A3B4C",dark:"#26273A",deep:"#1D1628"};
const YEL={light:C.yellow,dark:"#C99A2E",top:C.yellowLine};
const LAV={light:C.lavender,dark:"#A68BD0",top:"#F3EBFD"};
const PINK={light:C.pink,dark:"#8E1C38",soft:"#F59AB5"};
const GRN={light:C.green,dark:"#3F9A28"};
const PURP={light:C.purple,dark:"#5B3A94",deep:"#3A2264"};
const MINT={light:"#A8E8C4",dark:"#5FAE86"};
const FIRE={out:"#E2563A",outD:"#B4304E",mid:"#F59A3C",midD:"#E2702A",core:C.yellow,hot:"#FFF3C0"};
/** Ambient wave in [-1,1]; always through loopPhase, so a looping film's last frame equals its first. */
const wave=(t:number,p:number,loop?:number,off=0)=>Math.sin(TAU*(loopPhase(t,p,loop)+off));
/** Rounded rectangle path. */
const rrect=(x:number,y:number,w:number,h:number,r:number)=>{const q=Math.max(0,Math.min(r,w/2,h/2));
 return `M${f1(x+q)} ${f1(y)}H${f1(x+w-q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+w)} ${f1(y+q)}V${f1(y+h-q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+w-q)} ${f1(y+h)}H${f1(x+q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x)} ${f1(y+h-q)}V${f1(y+q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+q)} ${f1(y)}Z`;};

/* ───────────── Shared drawing helpers ───────────── */
/** Quad (TL, TR, BR, BL) in two tones split along the TR–BL diagonal: light from the top left. */
function Quad({p,light,dark}:{p:number[][];light:string;dark:string}){
 return <><polygon points={pts([p[0],p[1],p[3]])} fill={light} stroke={light} strokeWidth={.7} strokeLinejoin="round"/><polygon points={pts([p[1],p[2],p[3]])} fill={dark} stroke={dark} strokeWidth={.7} strokeLinejoin="round"/></>;
}
/** Box: front rectangle with its top and right faces (depth d runs up-right). */
function Box({x,y,w,h,d,front,top,side}:{x:number;y:number;w:number;h:number;d:[number,number];front:{light:string;dark:string};top:string;side:string}){
 return <>
  <polygon points={pts([[x,y],[x+w,y],[x+w+d[0],y+d[1]],[x+d[0],y+d[1]]])} fill={top} stroke={top} strokeWidth={.7}/>
  <polygon points={pts([[x+w,y],[x+w,y+h],[x+w+d[0],y+h+d[1]],[x+w+d[0],y+d[1]]])} fill={side} stroke={side} strokeWidth={.7}/>
  <Quad p={[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]} light={front.light} dark={front.dark}/>
 </>;
}
/** Four-point faceted star: eight facets lit from the top left. */
function Spark({x,y,r,light=C.yellow,dark=YEL.dark,k=1}:{x:number;y:number;r:number;light?:string;dark?:string;k?:number}){
 if(k<=.003||r<=.2)return null;
 const out=[0,1,2,3].map(i=>[x+Math.cos((i*90-90)*D)*r,y+Math.sin((i*90-90)*D)*r]),inn=[0,1,2,3].map(i=>[x+Math.cos((i*90-45)*D)*r*.3,y+Math.sin((i*90-45)*D)*r*.3]);
 const c=[x,y],hi=mix(light,"#FFFFFF",.45);
 return <g opacity={clamp01(k)}>
  {[0,1,2,3].map(i=>{const o=out[i],prev=inn[(i+3)%4],next=inn[i];const lit=i===0||i===3;
   return <React.Fragment key={i}><polygon points={pts([c,prev,o])} fill={lit?hi:mix(light,dark,.35)}/><polygon points={pts([c,o,next])} fill={lit?light:dark}/></React.Fragment>;})}
 </g>;
}
/** Unit heart outline (top dip near y −0.47, tip at +0.9), sampled from the classic parametric heart. */
const HEART=Array.from({length:20},(_,i)=>{const th=i/20*TAU;return [Math.pow(Math.sin(th),3),-(13*Math.cos(th)-5*Math.cos(2*th)-2*Math.cos(3*th)-Math.cos(4*th))/16-.16];});
/** Faceted gem heart centred at (x,y), half-width r, lit from the top left. */
function FacetHeart({x,y,r,light=C.pink,dark=PINK.dark,k=1}:{x:number;y:number;r:number;light?:string;dark?:string;k?:number}){
 if(k<=.003||r<=.3)return null;
 const P=HEART.map(([u,v])=>[x+u*r,y+v*r]),c=[x-r*.12,y-r*.02],hi=mix(light,"#FFFFFF",.4);
 return <g opacity={clamp01(k)}>{P.map((p,i)=>{const q=P[(i+1)%P.length],mx=(p[0]+q[0])/2-c[0],my=(p[1]+q[1])/2-c[1],lit=clamp01(.5-.5*Math.cos(Math.atan2(my,mx)+135*D)),col=i%2?mix(dark,light,lit):mix(dark,hi,lit*.9);
  return <polygon key={i} points={pts([c,p,q])} fill={col} stroke={col} strokeWidth={.6} strokeLinejoin="round"/>;})}</g>;
}
/** Low-poly flame (base at x,y, height s), flickering through loop-aware phases. */
function Flame({x,y,s,t,loop,seed=0,k=1,uid}:{x:number;y:number;s:number;t:number;loop?:number;seed?:number;k?:number;uid:string}){
 if(k<=.003||s<=1)return null;
 const fl=(p:number,o:number)=>wave(t,p*(1+.13*hash(seed*3.1)),loop,o+hash(seed*7.7));
 const hh=1+.07*fl(.47,0)+.05*fl(.29,.3),sw=.1*fl(.61,.4)+.05*fl(.37,.15);
 const shape=(w:number,h:number)=>[[0,.02],[-w*.62,-.1],[-w,-.32],[-w*.82,-.58],[-w*.38+sw*.4,-.8],[sw*.9,-1],[w*.3+sw*.5,-.76],[w*.78,-.52],[w*.96,-.28],[w*.6,-.07]].map(([u,v])=>[x+u*s,y+v*s*h*hh]);
 const layer=(w:number,h:number,light:string,dark:string,key:string)=>{const p=shape(w,h),c=[x+sw*s*.2,y-s*h*hh*.4];
  return <g key={key}>{p.map((a,i)=>{const b=p[(i+1)%p.length],lit=i<5,col=lit?(i%2?light:mix(light,"#FFFFFF",.18)):(i%2?dark:mix(dark,light,.35));return <polygon key={i} points={pts([c,a,b])} fill={col} stroke={col} strokeWidth={.6} strokeLinejoin="round"/>;})}</g>;};
 return <g opacity={clamp01(k)}>
  <defs><radialGradient id={`fg-${uid}`}><stop offset="0" stopColor={FIRE.mid} stopOpacity=".55"/><stop offset=".5" stopColor={FIRE.out} stopOpacity=".18"/><stop offset="1" stopColor={FIRE.out} stopOpacity="0"/></radialGradient></defs>
  <ellipse cx={x} cy={y-s*.42} rx={s*.95} ry={s*.9} fill={`url(#fg-${uid})`}/>
  {layer(.42,1,FIRE.out,FIRE.outD,"o")}{layer(.3,.78,FIRE.mid,FIRE.midD,"m")}{layer(.17,.5,FIRE.core,"#E8A53A","c")}
  <ellipse cx={x} cy={y-s*.1} rx={s*.07} ry={s*.12} fill={FIRE.hot} opacity={.8}/>
 </g>;
}
/** Floating low-poly island: lit top ellipse at y, faceted rim of height h and a rock underside `depth` below the rim
 *  (its tip is the bottom of the drawing). Small shards float beside it. */
function Island({y,rx,ry,h,depth,t,loop,uid,top="#8C8AA2",topDark="#666882",rim=[METAL.top,METAL.lo],rock=["#5B4683","#241A3A"],glow=C.lavender,k=0,seed=1}:{y:number;rx:number;ry:number;h:number;depth:number;t:number;loop?:number;uid:string;top?:string;topDark?:string;rim?:[string,string];rock?:[string,string];glow?:string;k?:number;seed?:number}){
 const n=22,ring=(yy:number,s:number,jit=0)=>Array.from({length:n+1},(_,i)=>{const an=Math.PI*i/n,j=jit?(hash(seed*13.1+i*3.7)-.5)*jit:0;return [Math.cos(an)*rx*s,yy+Math.sin(an)*ry*s+j];});
 const top0=ring(y,1),bot0=ring(y+h,1),mid=ring(y+h+depth*.42,.68,depth*.16),tip=[rx*.05,y+h+depth];
 const litAt=(i:number)=>clamp01(.5-.5*Math.cos(Math.PI*(i+.5)/n));
 const shards=[[-rx*.78,y+h+depth*.35,9],[rx*.82,y+h+depth*.2,7],[rx*.42,y+h+depth*.82,6]];
 return <g>
  <defs><radialGradient id={`ig-${uid}`}><stop offset="0" stopColor={glow} stopOpacity=".32"/><stop offset="1" stopColor={glow} stopOpacity="0"/></radialGradient></defs>
  <ellipse cx={0} cy={y+h+depth*.3} rx={rx*1.02} ry={depth*.75} fill={`url(#ig-${uid})`} opacity={.6+.4*k}/>
  {mid.slice(0,-1).map((p,i)=>{const q=mid[i+1],a0=bot0[i],a1=bot0[i+1],l=litAt(i),j=(hash(seed*5+i)-.5)*.16;
   const c1=mix(rock[1],rock[0],clamp01(l*.9+j+.08)),c2=mix(rock[1],rock[0],clamp01(l*.7+j)),c3=mix(rock[1],rock[0],clamp01(l*.5+j-.08));
   return <g key={i}><polygon points={pts([a0,a1,q])} fill={c1} stroke={c1} strokeWidth={.6}/><polygon points={pts([a0,q,p])} fill={c2} stroke={c2} strokeWidth={.6}/><polygon points={pts([p,q,tip])} fill={c3} stroke={c3} strokeWidth={.6}/></g>;})}
  {top0.slice(0,-1).map((p,i)=>{const q=top0[i+1],c=mix(rim[1],rim[0],litAt(i));return <polygon key={i} points={pts([p,q,bot0[i+1],bot0[i]])} fill={c} stroke={c} strokeWidth={.6}/>;})}
  <ellipse cx={0} cy={y} rx={rx} ry={ry} fill={topDark}/>
  <ellipse cx={-rx*.06} cy={y-ry*.06} rx={rx*.93} ry={ry*.86} fill={top}/>
  <ellipse cx={0} cy={y} rx={rx} ry={ry} fill="none" stroke={glow} strokeOpacity={.3+.5*k} strokeWidth={3}/>
  {shards.map(([sx,sy,r],i)=>{const by=sy+4*wave(t,5.2+i*1.3,loop,hash(seed+i)),c=mix(rock[1],rock[0],.7-.2*i);
   return <g key={i}><polygon points={pts([[sx,by-r],[sx+r*.8,by],[sx,by+r*1.3],[sx-r*.8,by]])} fill={c}/><polygon points={pts([[sx,by-r],[sx-r*.8,by],[sx,by+r*1.3]])} fill={mix(c,"#FFFFFF",.12)}/></g>;})}
 </g>;
}
/** Faceted rock under a straight slab edge from x0 to x1 at y (a rectangular diorama floating in space). */
function SlabRock({x0,x1,y,depth,seed=3,rock=["#5B4683","#241A3A"]}:{x0:number;x1:number;y:number;depth:number;seed?:number;rock?:[string,string]}){
 const n=14,w=x1-x0,top=Array.from({length:n+1},(_,i)=>[x0+w*i/n,y]);
 const prof=(x:number)=>{const u=(x-x0)/w*2-1;return Math.max(0,1-u*u);};
 const low=Array.from({length:n},(_,i)=>{const x=x0+w*(i+.5)/n;return [x+(hash(seed+i*2.3)-.5)*w/n*.4,y+depth*(.25+.75*prof(x))*(.7+.3*hash(seed*3+i))];});
 return <g>{low.map((b,i)=>{const p=top[i],q=top[i+1],nx=low[i+1],l=clamp01(.75-i/n*.6+(hash(seed*9+i)-.5)*.2);
  const c1=mix(rock[1],rock[0],l),c2=mix(rock[1],rock[0],l*.7);
  return <g key={i}><polygon points={pts([p,q,b])} fill={c1} stroke={c1} strokeWidth={.6}/>{nx&&<polygon points={pts([b,q,nx])} fill={c2} stroke={c2} strokeWidth={.6}/>}</g>;})}</g>;
}

/* ───────────── maternity-ward ───────────── */
export function wardState(a:number){return {lamp:.3+.3*smooth(a,0,.5)+.4*smooth(a,.5,1),births:smooth(a,.15,.5),glow:smooth(a,.55,1)};}
const BLANKETS:[string,string][]=[["#F59AB5","#C25A80"],["#D9C4F5","#9C80CC"],["#F8DA7A","#C9A040"],[MINT.light,MINT.dark]];
const TONES:[string,string][]=[["#F2C29C","#C98E68"],["#D9A07A","#A86E4C"],["#A9714A","#7A4B30"],["#F5D2B4","#D6A27E"]];
type CribSpec={x:number;y:number;s:number;seq:number;col:[number,number];cap:number;tone:number;mobile:boolean};
const CRIBS:CribSpec[]=[
 {x:-255,y:152,s:.9,seq:1,col:[1,2],cap:3,tone:0,mobile:false},{x:-85,y:152,s:.9,seq:3,col:[3,0],cap:1,tone:2,mobile:true},
 {x:85,y:152,s:.9,seq:4,col:[0,1],cap:2,tone:1,mobile:false},{x:255,y:152,s:.9,seq:6,col:[2,3],cap:0,tone:3,mobile:false},
 {x:-300,y:258,s:1.12,seq:0,col:[0,3],cap:2,tone:1,mobile:true},{x:-100,y:258,s:1.12,seq:2,col:[2,1],cap:0,tone:3,mobile:false},
 {x:100,y:258,s:1.12,seq:5,col:[1,0],cap:3,tone:0,mobile:false},{x:300,y:258,s:1.12,seq:7,col:[3,2],cap:1,tone:2,mobile:true},
];
/** Birth rhythm of crib `seq` (0..7): a 6.4 s double cycle gives one arrival every 0.4 s across the row. burst =
 *  starburst envelope; swap = blanket colour A→B (first half) and B→A (second half), hidden under the burst; rise =
 *  the little star or heart rising afterwards; x = position in the 3.2 s cycle. */
export function cribBirth(t:number,seq:number,loop?:number){
 const U=(loopPhase(t,6.4,loop)+seq/16)%1,x=(2*U)%1,swapIn=smooth(x,.03,.12);
 return {burst:smooth(x,0,.09)*(1-smooth(x,.1,.34)),swap:U<.5?swapIn:1-swapIn,rise:win(x,.06,.16,.42,.66),x};
}
function Mobile({x,y,t,loop,seed}:{x:number;y:number;t:number;loop?:number;seed:number}){
 const rot=loopPhase(t,9+seed*1.7,loop),items=[0,1,2,3].map(j=>{const th=TAU*(rot+j/4),z=Math.sin(th),ox=x+Math.cos(th)*36,oy=y+z*7,len=[24,32,27,35][j];return {j,z,ox,oy,len};}).sort((p,q)=>p.z-q.z);
 return <g>
  {items.map(({j,z,ox,oy,len})=>{const s=.86+.14*z,cy=oy+len,op=.72+.28*(z+1)/2;
   return <g key={j} opacity={op}><line x1={ox} y1={oy} x2={ox} y2={cy-6*s} stroke={C.ivory} strokeOpacity={.5} strokeWidth={1.2}/>
    {j===0?<Spark x={ox} y={cy} r={10*s} light={C.yellow} dark={YEL.dark}/>:
     j===1?<g><circle cx={ox} cy={cy} r={8*s} fill={C.lavender}/><circle cx={ox+4*s} cy={cy-3*s} r={7*s} fill={mix("#2A2142",C.lavender,.15)}/></g>:
     j===2?<FacetHeart x={ox} y={cy} r={8*s} light={PINK.soft} dark="#C25A80"/>:
     <g fill={C.ivory}><circle cx={ox-6*s} cy={cy+1} r={5*s}/><circle cx={ox} cy={cy-2} r={7*s}/><circle cx={ox+7*s} cy={cy+1} r={5*s}/><rect x={ox-11*s} y={cy} width={22*s} height={5*s} rx={2.5*s}/></g>}
   </g>;})}
  <ellipse cx={x} cy={y} rx={13} ry={4} fill={C.lavender}/><ellipse cx={x} cy={y-1} rx={9} ry={2.5} fill="#FFFFFF" opacity={.5}/>
 </g>;
}
/** One hospital bassinet on its cart (origin = floor contact): a clear acrylic tub with a swaddled baby inside. */
function Crib({c,t,loop,births,lamp,uid}:{c:CribSpec;t:number;loop?:number;births:number;lamp:number;uid:string}){
 const b=cribBirth(t,c.seq,loop),i=c.seq,burst=b.burst*births,swap=b.swap*births;
 // A new baby: blanket, cap and skin tone cross-fade to the next baby's while the starburst whitens the crib.
 const wash=(c0:string)=>mix(c0,"#FFF7E6",burst*.55),[A,B]=[BLANKETS[c.col[0]],BLANKETS[c.col[1]]],bl=[wash(mix(A[0],B[0],swap)),wash(mix(A[1],B[1],swap))];
 const T0=TONES[c.tone],T1=TONES[(c.tone+1)%4],tone=[wash(mix(T0[0],T1[0],swap)),wash(mix(T0[1],T1[1],swap))],K0=BLANKETS[c.cap],K1=BLANKETS[(c.cap+2)%4],cap=[wash(mix(K0[0],K1[0],swap)),wash(mix(K0[1],K1[1],swap))];
 const breath=.5+.5*wave(t,2.7+.3*(i%3),loop,hash(i*3.1)),wu=loopPhase(t,4.6+.7*i,loop),wig=win(wu,.1,.16,.3,.38)*Math.sin(TAU*(wu*9+hash(i)));
 const pop=1+.07*burst,hx=-36,hy=-108,RY=-142,BY=-74;
 const egg=Array.from({length:16},(_,k)=>{const an=k/16*TAU;return [14+Math.cos(an)*43,-101+Math.sin(an)*19*(an>Math.PI?1.05:1)];}),ctr=[4,-108];
 const rim=mix(mix(C.lavender,C.ivory,.45),C.yellow,clamp01(burst*1.3));
 return <g transform={`translate(${c.x},${c.y}) scale(${c.s})`}>
  <ellipse cx={0} cy={0} rx={82} ry={9} fill="#000" opacity={.35}/>
  {burst>.01&&<g opacity={burst}>
   <circle cx={0} cy={-110} r={118} fill={`url(#burst-${uid})`}/>
   {Array.from({length:10},(_,k)=>{const an=(k*36+hash(i)*36)*D,l=46+80*burst,w=4;return <polygon key={k} points={pts([[Math.cos(an+w*D*2)*20,-110+Math.sin(an+w*D*2)*20],[Math.cos(an)*l,-110+Math.sin(an)*l],[Math.cos(an-w*D*2)*20,-110+Math.sin(an-w*D*2)*20]])} fill={k%2?C.yellowLine:C.ivory} opacity={.7}/>;})}
  </g>}
  {c.mobile&&<g><polyline points={pts([[66,BY],[66,-212],[58,-222],[18,-224]])} fill="none" stroke={METAL.hi} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"/><Mobile x={16} y={-224} t={t} loop={loop} seed={i}/></g>}
  {/* cart */}
  {[-60,60].map((x,k)=><g key={x}><rect x={x-3.5} y={-68} width={7} height={60} fill={k?METAL.lo:METAL.hi}/><path d={`M ${x-5} -12 L ${x} -6 L ${x+5} -12`} stroke={METAL.mid} strokeWidth={3} fill="none"/><circle cx={x} cy={-6} r={6.5} fill={METAL.dark}/><circle cx={x-2} cy={-8} r={2.2} fill={METAL.hi}/></g>)}
  <Box x={-64} y={-34} w={128} h={6} d={[9,-6]} front={{light:METAL.top,dark:METAL.lo}} top={METAL.hi} side={METAL.dark}/>
  <path d={rrect(-48,-52,46,10,4)} fill={BLANKETS[(c.cap+1)%4][0]}/><path d={rrect(-46,-43,42,9,4)} fill={BLANKETS[(c.cap+2)%4][0]}/><path d={rrect(-48,-52,46,4,2)} fill="#FFFFFF" opacity={.25}/>
  <Box x={-72} y={BY} w={144} h={8} d={[9,-6]} front={{light:METAL.hi,dark:METAL.mid}} top="#9A98B0" side={METAL.lo}/>
  {/* tub: back rim and inner wall, mattress, baby, front wall, front rim */}
  <path d={`M -80 ${RY} A 80 12 0 0 1 80 ${RY} L 68 ${BY} H -68 Z`} fill="#2A2142" opacity={.5}/>
  <path d={`M -80 ${RY} A 80 12 0 0 1 80 ${RY}`} fill="none" stroke={rim} strokeWidth={2.2} opacity={.55}/>
  <path d={rrect(-70,-90,140,14,6)} fill="#E8E0F5"/><rect x={-70} y={-80} width={140} height={4} fill="#B9A8DE" opacity={.7}/>
  <g transform={`translate(0,-100) scale(${pop.toFixed(3)}) translate(0,100)`}>
   <ellipse cx={hx+4} cy={hy+2} rx={28} ry={26} fill={bl[1]}/>
   <g transform={`translate(0,-84) scale(1,${(1+.07*breath).toFixed(3)}) translate(0,84)`}>
    {egg.map((p,k)=>{const q=egg[(k+1)%egg.length],l=clamp01(.5-.5*Math.cos(Math.atan2((p[1]+q[1])/2-ctr[1],(p[0]+q[0])/2-ctr[0])+135*D));const col=mix(bl[1],bl[0],.42+.58*l);return <polygon key={k} points={pts([ctr,p,q])} fill={col} stroke={col} strokeWidth={.8} strokeLinejoin="round"/>;})}
    <path d="M -10 -86 Q 4 -110 22 -119 Q 40 -112 50 -96 Q 30 -104 -10 -86 Z" fill={bl[0]} opacity={.9}/>
    <path d="M -10 -86 Q 30 -104 50 -96" stroke={bl[1]} strokeWidth={2} fill="none" opacity={.7}/>
    <path d="M 24 -88 Q 38 -92 50 -90" stroke={bl[1]} strokeWidth={1.8} fill="none" opacity={.5}/>
    <path d="M 22 -117 Q 38 -114 48 -104" stroke="#FFFFFF" strokeWidth={2.4} fill="none" opacity={.35} strokeLinecap="round"/>
   </g>
   <circle cx={hx} cy={hy} r={21} fill={tone[0]}/>
   <path d={`M ${hx+10} ${hy-18} A 21 21 0 0 1 ${hx+16} ${hy+14} Q ${hx+8} ${hy+3} ${hx+10} ${hy-18} Z`} fill={tone[1]} opacity={.5}/>
   {[-7,7].map(dx=><path key={dx} d={`M ${hx+dx-3.6} ${hy+1} Q ${hx+dx} ${hy+4.2} ${hx+dx+3.6} ${hy+1}`} stroke="#4A2C1C" strokeWidth={1.8} fill="none" strokeLinecap="round"/>)}
   {[-12,12].map(dx=><circle key={dx} cx={hx+dx} cy={hy+7} r={4.2} fill={C.pink} opacity={.35}/>)}
   <circle cx={hx} cy={hy+7} r={1.5} fill={tone[1]}/><path d={`M ${hx-3} ${hy+12} Q ${hx} ${hy+14.5} ${hx+3} ${hy+12}`} stroke="#B4407A" strokeWidth={1.5} fill="none" strokeLinecap="round"/>
   <path d={`M ${hx-21.5} ${hy-3} A 21.5 21.5 0 0 1 ${hx+21.5} ${hy-3} Q ${hx} ${hy-11} ${hx-21.5} ${hy-3} Z`} fill={cap[0]}/>
   <path d={`M ${hx-21} ${hy-4} A 21 21 0 0 1 ${hx-5} ${hy-21}`} stroke="#FFFFFF" strokeOpacity={.35} strokeWidth={3.5} fill="none"/>
   {[-14,-7,0,7,14].map(dx=><line key={dx} x1={hx+dx} y1={hy-8-(14-Math.abs(dx))*.15} x2={hx+dx*.92} y2={hy-18+Math.abs(dx)*.55} stroke={cap[1]} strokeWidth={1.5} opacity={.55}/>)}
   <path d={`M ${hx-21} ${hy-4} Q ${hx} ${hy-12} ${hx+21} ${hy-4}`} stroke={cap[1]} strokeWidth={3.6} fill="none" strokeLinecap="round"/>
   <circle cx={hx+3} cy={hy-24} r={6.5} fill={cap[0]}/><circle cx={hx+1} cy={hy-26} r={2.6} fill="#FFFFFF" opacity={.5}/>
   <g transform={`translate(${f1(wig*2.4)},${f1(-Math.abs(wig)*2)}) rotate(${f1(wig*14)} -12 -98)`}><circle cx={-12} cy={-98} r={6} fill={tone[0]}/><circle cx={-13.5} cy={-100} r={2.2} fill="#FFFFFF" opacity={.3}/></g>
  </g>
  <path d={`M -80 ${RY} A 80 12 0 0 0 80 ${RY} L 68 ${BY} H -68 Z`} fill={C.lavender} opacity={.12}/>
  <polygon points={pts([[-73,RY+6],[-61,RY+10],[-54,BY-4],[-64,BY-4]])} fill="#FFFFFF" opacity={.18}/>
  <polygon points={pts([[58,RY+10],[64,RY+8],[60,BY-4],[55,BY-4]])} fill="#FFFFFF" opacity={.1}/>
  {[-1,1].map(s=><line key={s} x1={s*80} y1={RY} x2={s*68} y2={BY} stroke={rim} strokeWidth={2.2} opacity={.6}/>)}
  <line x1={-68} y1={BY} x2={68} y2={BY} stroke={rim} strokeWidth={2.2} opacity={.6}/>
  <path d={rrect(28,-90,26,15,4)} fill={bl[0]}/><FacetHeart x={41} y={-82.5} r={4.8} light={C.ivory} dark={bl[1]}/>
  <path d={`M -80 ${RY} A 80 12 0 0 0 80 ${RY}`} fill="none" stroke={rim} strokeWidth={3} opacity={.9}/>
  {burst>.01&&<Spark x={hx+4} y={-138} r={7+16*burst} light={C.ivory} dark={C.yellow} k={burst}/>}
  {b.rise>.005&&births>.005&&(()=>{const y=-150-150*smooth(b.x,.04,.66),x=10+18*Math.sin(b.x*7+i),k=b.rise*births;
   return i%2?<FacetHeart x={x} y={y} r={10} light={PINK.soft} dark="#C25A80" k={k}/>:<Spark x={x} y={y} r={11} k={k}/>;})()}
 </g>;
}
function Nurse({t,loop}:{t:number;loop?:number}){
 const lean=-15+3*wave(t,6.5,loop),hand=wave(t,2.2,loop);
 return <g transform="translate(350,152) scale(.78)">
  <ellipse cx={0} cy={0} rx={42} ry={7} fill="#000" opacity={.35}/>
  <polygon points={pts([[-20,-4],[-4,-4],[-6,-96],[-22,-96]])} fill="#3E8A6A"/><polygon points={pts([[4,-4],[20,-4],[18,-96],[2,-96]])} fill="#2F6B52"/>
  <rect x={-24} y={-8} width={22} height={8} rx={3} fill={C.ivory}/><rect x={2} y={-8} width={22} height={8} rx={3} fill="#D9D2E6"/>
  <g transform={`rotate(${f1(lean)} 0 -96)`}>
   <polygon points={pts([[-30,-96],[30,-96],[26,-190],[-26,-190]])} fill={MINT.dark}/>
   <polygon points={pts([[-30,-96],[0,-96],[-4,-190],[-26,-190]])} fill={MINT.light}/>
   <polygon points={pts([[-12,-190],[12,-190],[0,-172]])} fill="#2F6B52"/>
   <rect x={-8} y={-204} width={16} height={16} fill="#B98A68"/>
   <circle cx={-2} cy={-222} r={22} fill="#D9A07A"/><path d="M -24 -222 L -30 -218 L -24 -214 Z" fill="#D9A07A"/>
   <path d="M -16 -238 A 22 22 0 0 1 22 -228 L 22 -208 Q 12 -222 4 -230 Q -6 -236 -16 -238 Z" fill="#3A2416"/>
   <circle cx={22} cy={-232} r={10} fill="#3A2416"/>
   <path d={rrect(-16,-250,30,10,4)} fill={C.ivory}/><FacetHeart x={-1} y={-245} r={3.5} light={C.pink} dark={PINK.dark}/>
   <circle cx={-13} cy={-224} r={2} fill="#2A160E"/>
   <polyline points={pts([[-8,-182],[-52,-150],[-104+hand*4,-136+hand*2]])} fill="none" stroke={MINT.light} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round"/>
   <circle cx={-108+hand*4} cy={-135+hand*2} r={7} fill="#D9A07A"/>
  </g>
 </g>;
}
function MaternityWard({t,a,uid,loop}:{t:number;a:number;uid:string;loop?:number}){
 const v=wardState(a),night=.5*(1-(v.lamp-.3)/.7),L=v.lamp;
 const W={x0:-380,x1:380,top:-305,base:150},FL={y0:150,y1:262,x0:-440,x1:440};
 const win0={x:-250,y:-276,w:330,h:202};
 const room=`M -440 -255 L -380 -305 L 380 -305 L 440 -255 L 440 284 L -440 284 Z`;
 const hole=`M ${win0.x} ${win0.y} H ${win0.x+win0.w} V ${win0.y+win0.h} H ${win0.x} Z`;
 const bulbs=Array.from({length:19},(_,i)=>{const u=i/18,x=lerp(-372,372,u),sag=Math.sin(Math.PI*((u*2)%1))*24;return {x,y:-292+sag,c:[C.yellowLine,PINK.soft,C.lavender,MINT.light][i%4],tw:.55+.45*(.5+.5*wave(t,2.4+.4*(i%5),loop,hash(i*1.7)))};});
 const balloons=[0,1,2,3,4].map(j=>{const u=(loopPhase(t,8.5,loop)+j/5)%1,x=[-200,-30,130,300,-330][j]+18*Math.sin(TAU*(u*2+hash(j))),y=110-445*u;return {j,x,y,k:win(u,0,.1,.78,.97)*v.births,c:BLANKETS[j%4]};});
 const tiles=[] as React.ReactNode[];
 const rowsY=[0,.2,.42,.66,1].map(f=>lerp(FL.y0,FL.y1,f));
 for(let r=0;r<4;r++)for(let c=0;c<10;c++){const xa=(f:number,y:number)=>{const k=(y-FL.y0)/(FL.y1-FL.y0);return lerp(lerp(W.x0,W.x1,f),lerp(FL.x0,FL.x1,f),k);};
  const y0=rowsY[r],y1=rowsY[r+1],f0=c/10,f1_=(c+1)/10,col=(r+c)%2?"#4E3D74":"#5E4B88";
  tiles.push(<polygon key={`${r}-${c}`} points={pts([[xa(f0,y0),y0],[xa(f1_,y0),y0],[xa(f1_,y1),y1],[xa(f0,y1),y1]])} fill={col} stroke="#3A2C55" strokeWidth={1.2}/>);}
 const lamps=[-160,168];
 return <g>
  <defs>
   <linearGradient id={`wall-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3E2F5E"/><stop offset="1" stopColor="#5A4684"/></linearGradient>
   <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#07061A"/><stop offset=".55" stopColor="#1D1640"/><stop offset="1" stopColor="#4B2C6E"/></linearGradient>
   <linearGradient id={`dawn-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset=".3" stopColor="#B4407A" stopOpacity="0"/><stop offset=".8" stopColor="#E2704A" stopOpacity=".55"/><stop offset="1" stopColor={C.yellow} stopOpacity=".75"/></linearGradient>
   <radialGradient id={`burst-${uid}`}><stop offset="0" stopColor="#FFF7D6" stopOpacity=".95"/><stop offset=".35" stopColor={C.yellow} stopOpacity=".45"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient>
   <radialGradient id={`lamp-${uid}`}><stop offset="0" stopColor="#FFF1C2" stopOpacity=".9"/><stop offset=".35" stopColor={C.yellow} stopOpacity=".35"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient>
   <linearGradient id={`cone-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.yellow} stopOpacity=".28"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></linearGradient>
   <radialGradient id={`warm-${uid}`} cx=".5" cy=".55" r=".65"><stop offset="0" stopColor="#FFC56A" stopOpacity=".5"/><stop offset="1" stopColor="#E2704A" stopOpacity="0"/></radialGradient>
   <radialGradient id={`heartglow-${uid}`}><stop offset="0" stopColor={C.pink} stopOpacity=".55"/><stop offset="1" stopColor={C.pink} stopOpacity="0"/></radialGradient>
   <clipPath id={`win-${uid}`}><rect x={win0.x} y={win0.y} width={win0.w} height={win0.h}/></clipPath>
  </defs>
  {/* pedestal: slab front and floating rock */}
  <ellipse cx={0} cy={300} rx={430} ry={50} fill={`url(#warm-${uid})`} opacity={.25+.5*v.glow}/>
  <SlabRock x0={FL.x0} x1={FL.x1} y={284} depth={62} rock={["#7A64A6","#2A2042"]}/>
  <Quad p={[[FL.x0,FL.y1],[FL.x1,FL.y1],[FL.x1,284],[FL.x0,284]]} light={METAL.top} dark={METAL.lo}/>
  <line x1={FL.x0} y1={FL.y1} x2={FL.x1} y2={FL.y1} stroke={C.lavender} strokeOpacity={.45} strokeWidth={3}/>
  {/* walls */}
  <polygon points={pts([[-440,-255],[-380,-305],[-380,W.base],[-440,FL.y1]])} fill="#2A2042"/>
  <polygon points={pts([[380,-305],[440,-255],[440,FL.y1],[380,W.base]])} fill="#5E4B88"/>
  <rect x={W.x0} y={W.top} width={W.x1-W.x0} height={W.base-W.top} fill={`url(#wall-${uid})`}/>
  {Array.from({length:9},(_,r)=>Array.from({length:14},(_,c)=>{const x=W.x0+28+c*56+(r%2)*28,y=W.top+30+r*38;return (r%2?<circle key={`${r}-${c}`} cx={x} cy={y} r={2.2} fill={C.lavender} opacity={.12}/>:<Spark key={`${r}-${c}`} x={x} y={y} r={5} light={C.lavender} dark={C.lavender} k={.1}/>);}))}
  <rect x={W.x0} y={40} width={W.x1-W.x0} height={W.base-40} fill="#3A2C58"/>
  {Array.from({length:10},(_,i)=><rect key={i} x={W.x0+10+i*76} y={54} width={60} height={84} rx={4} fill="none" stroke={C.lavender} strokeOpacity={.08} strokeWidth={2}/>)}
  <Box x={W.x0} y={34} w={W.x1-W.x0} h={8} d={[0,-4]} front={{light:"#B9A8DE",dark:"#8E7AB8"}} top="#D9CFF0" side="#8E7AB8"/>
  {[[-440,-255,-380,-305],[380,-305,440,-255]].map(([x0,y0,x1,y1],i)=><line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#B9A8DE" strokeWidth={8} strokeLinecap="round"/>)}
  <rect x={W.x0} y={W.top-6} width={W.x1-W.x0} height={9} fill="#B9A8DE"/><rect x={W.x0} y={W.top-6} width={W.x1-W.x0} height={3} fill="#F3EBFD" opacity={.6}/>
  {/* window: night city, moon, curtains, sill with a teddy and a plant */}
  <g clipPath={`url(#win-${uid})`}>
   <rect x={win0.x} y={win0.y} width={win0.w} height={win0.h} fill={`url(#sky-${uid})`}/>
   <rect x={win0.x} y={win0.y} width={win0.w} height={win0.h} fill={`url(#dawn-${uid})`} opacity={v.glow*.8}/>
   {Array.from({length:22},(_,i)=>{const x=win0.x+10+hash(i*3.3)*(win0.w-20),y=win0.y+8+hash(i*5.1)*110;return <circle key={i} cx={x} cy={y} r={.8+hash(i*7)*1.4} fill={C.ivory} opacity={.35+.45*(.5+.5*wave(t,2+hash(i)*3,loop,hash(i*2)))}/>;})}
   <circle cx={-182} cy={-232} r={20} fill="#F6EFCF"/><circle cx={-172} cy={-238} r={18} fill="#14102E"/>
   <circle cx={-182} cy={-232} r={34} fill={C.ivory} opacity={.06}/>
   {[[-250,-150,46],[-206,-178,34],[-176,-136,40],[-140,-196,30],[-112,-160,44],[-70,-128,36],[-36,-186,32],[-6,-146,38],[34,-172,30],[62,-132,40]].map(([x,y,w],i)=><g key={i}>
    <rect x={x} y={y} width={w} height={-74-y+win0.h} fill={i%2?"#141030":"#1B1540"}/>
    {Array.from({length:Math.floor((-74-y+win0.h)/12)*Math.floor(w/11)},(_,k)=>{const cols=Math.floor(w/11),cx=x+5+(k%cols)*11,cy=y+6+Math.floor(k/cols)*12,on=hash(i*31+k*1.7)<.38;
     return on&&<rect key={k} x={cx} y={cy} width={5} height={6} fill={C.yellowLine} opacity={.45+.4*(.5+.5*wave(t,3+hash(k+i)*4,loop,hash(k*1.3+i)))}/>;})}</g>)}
  </g>
  <path d={`M ${win0.x-12} ${win0.y-12} H ${win0.x+win0.w+12} V ${win0.y+win0.h+12} H ${win0.x-12} Z ${hole}`} fill="#CFC3E6" fillRule="evenodd"/>
  <path d={`M ${win0.x-12} ${win0.y-12} H ${win0.x+win0.w+12} L ${win0.x+win0.w} ${win0.y} H ${win0.x} V ${win0.y+win0.h} L ${win0.x-12} ${win0.y+win0.h+12} Z`} fill="#F3EBFD" opacity={.55}/>
  <rect x={win0.x+win0.w/2-4} y={win0.y} width={8} height={win0.h} fill="#CFC3E6"/><rect x={win0.x} y={win0.y+92} width={win0.w} height={8} fill="#CFC3E6"/>
  {[[win0.x-38,1],[win0.x+win0.w+8,-1]].map(([x,s],i)=><g key={i}>
   <polygon points={pts([[x,win0.y-22],[x+30,win0.y-22],[x+26+s*4,win0.y+90],[x+36,win0.y+win0.h+22],[x-4,win0.y+win0.h+22],[x+4-s*4,win0.y+90]])} fill={i?"#C25A80":"#E07A9A"}/>
   {[8,16,23].map(dx=><line key={dx} x1={x+dx} y1={win0.y-20} x2={x+dx+(dx-15)*.3} y2={win0.y+win0.h+20} stroke={i?"#8E3A5E":"#C25A80"} strokeWidth={2.5} opacity={.6}/>)}
  </g>)}
  <rect x={win0.x-48} y={win0.y-28} width={win0.w+96} height={7} rx={3.5} fill={METAL.hi}/>
  <Box x={win0.x-18} y={win0.y+win0.h+10} w={win0.w+36} h={10} d={[0,-6]} front={{light:"#CFC3E6",dark:"#A99BC8"}} top="#E9E2F6" side="#8E7AB8"/>
  {/* teddy bear on the sill */}
  <g transform={`translate(${win0.x+40},${win0.y+win0.h+6})`}>
   <ellipse cx={0} cy={-16} rx={16} ry={16} fill="#B07A4A"/><ellipse cx={-4} cy={-19} rx={9} ry={9} fill="#C99060"/>
   <circle cx={0} cy={-40} r={13} fill="#B07A4A"/><circle cx={-3} cy={-43} r={7} fill="#C99060"/>
   {[-10,10].map(dx=><circle key={dx} cx={dx} cy={-51} r={5} fill="#8A5A34"/>)}
   <ellipse cx={0} cy={-36} rx={5.5} ry={4} fill="#E8C9A0"/><circle cx={0} cy={-37.5} r={1.6} fill="#2A160E"/>
   {[-5,5].map(dx=><circle key={dx} cx={dx} cy={-43} r={1.6} fill="#2A160E"/>)}
   <path d="M -5 -27 Q 0 -24 5 -27 L 0 -21 Z" fill={C.pink}/>
  </g>
  {/* plant on the sill */}
  <g transform={`translate(${win0.x+win0.w-34},${win0.y+win0.h+4})`}>
   <polygon points={pts([[-12,0],[12,0],[15,-18],[-15,-18]])} fill="#C25A80"/><polygon points={pts([[-12,0],[0,0],[0,-18],[-15,-18]])} fill="#E07A9A"/>
   {[-40,-12,16,38].map((an,k)=>{const sway=3*wave(t,4.2,loop,k*.2),r=(an+sway)*D;return <polygon key={k} points={pts([[0,-18],[Math.sin(r)*14-5*Math.cos(r),-18-Math.cos(r)*14],[Math.sin(r)*34,-18-Math.cos(r)*34],[Math.sin(r)*14+5*Math.cos(r),-18-Math.cos(r)*14]])} fill={k%2?"#3F9A28":"#65DA41"}/>;})}
  </g>
  {/* heart sign and wall clock */}
  <circle cx={-322} cy={-176} r={70} fill={`url(#heartglow-${uid})`} opacity={.35+.35*(.5+.5*wave(t,4.8,loop))+.3*v.glow}/>
  <FacetHeart x={-322} y={-176} r={34} light={PINK.soft} dark="#B4407A"/>
  <path d={HEART.map(([u,w],i)=>`${i?"L":"M"} ${f1(-322+u*34)} ${f1(-176+w*34)}`).join(" ")+" Z"} fill="none" stroke="#FFD6E2" strokeWidth={2.5} opacity={.7}/>
  {(()=>{const cx=252,cy=-190,R=54,sec=360*loopPhase(t,60,loop);const hand=(an:number,l:number,w:number,col:string,tail=0)=><line x1={cx-Math.sin(an*D)*tail} y1={cy+Math.cos(an*D)*tail} x2={cx+Math.sin(an*D)*l} y2={cy-Math.cos(an*D)*l} stroke={col} strokeWidth={w} strokeLinecap="round"/>;
   return <g>
    <circle cx={cx+6} cy={cy+6} r={R+6} fill="#000" opacity={.25}/>
    <circle cx={cx} cy={cy} r={R+7} fill="#7A64A6"/><path d={`M ${cx-R-7} ${cy} A ${R+7} ${R+7} 0 0 1 ${cx+(R+7)*.7} ${cy-(R+7)*.7}`} stroke="#B9A8DE" strokeWidth={5} fill="none"/>
    <circle cx={cx} cy={cy} r={R} fill={C.ivory}/>
    {Array.from({length:12},(_,k)=>{const an=k*30*D,l=k%3?7:13;return <line key={k} x1={cx+Math.sin(an)*(R-5)} y1={cy-Math.cos(an)*(R-5)} x2={cx+Math.sin(an)*(R-5-l)} y2={cy-Math.cos(an)*(R-5-l)} stroke={k%3?"#7A64A6":INK} strokeWidth={k%3?2.5:4.5} strokeLinecap="round"/>;})}
    {hand(85,28,6,INK)}{hand(300,42,4,INK)}{hand(sec,46,2.2,C.pink,12)}
    <circle cx={cx} cy={cy} r={5} fill={C.pink}/><circle cx={cx} cy={cy} r={2} fill={INK}/>
    <path d={`M ${cx-R*.75} ${cy-R*.3} A ${R*.8} ${R*.8} 0 0 1 ${cx-R*.2} ${cy-R*.78}`} stroke="#FFFFFF" strokeWidth={4} fill="none" opacity={.5}/>
   </g>;})()}
  {/* fairy lights along the top edge */}
  <polyline points={pts(bulbs.map(b=>[b.x,b.y-5]))} fill="none" stroke="#2A2142" strokeWidth={1.6}/>
  {/* floor tiles */}
  {tiles}
  <polygon points={pts([[W.x0,FL.y0],[W.x1,FL.y0],[FL.x1,FL.y1],[FL.x0,FL.y1]])} fill="#120C1D" opacity={.15}/>
  {/* pendant lamp cords and shades (glow goes above the night veil) */}
  {lamps.map((x,i)=><g key={i}><line x1={x} y1={W.top} x2={x} y2={-130} stroke={METAL.mid} strokeWidth={2.5}/>
   <path d={`M ${x-36} -100 Q ${x-34} -132 ${x} -134 Q ${x+34} -132 ${x+36} -100 Z`} fill={mix("#CFC3E6","#FFF1C2",L)}/>
   <path d={`M ${x-36} -100 Q ${x-34} -132 ${x} -134 L ${x-6} -100 Z`} fill="#FFFFFF" opacity={.3}/></g>)}
  {/* cribs, back row first, and the nurse at the back */}
  {CRIBS.slice(0,4).map(c=><Crib key={c.seq} c={c} t={t} loop={loop} births={v.births} lamp={L} uid={uid}/>)}
  <Nurse t={t} loop={loop}/>
  {CRIBS.slice(4).map(c=><Crib key={c.seq} c={c} t={t} loop={loop} births={v.births} lamp={L} uid={uid}/>)}
  {/* night veil (the window stays bright), then lights */}
  <path d={`${room} ${hole}`} fill="#07051A" fillRule="evenodd" opacity={night}/>
  <rect x={W.x0} y={W.top} width={W.x1-W.x0} height={FL.y1-W.top} fill={`url(#warm-${uid})`} opacity={.45*v.glow}/>
  {lamps.map((x,i)=><g key={i}>
   <polygon points={pts([[x-34,-100],[x+34,-100],[x+150,250],[x-150,250]])} fill={`url(#cone-${uid})`} opacity={L*(.85+.15*wave(t,3.1,loop,i*.3))}/>
   <ellipse cx={x} cy={-98} rx={90} ry={70} fill={`url(#lamp-${uid})`} opacity={.3+.7*L}/>
   <ellipse cx={x} cy={-100} rx={34} ry={6} fill={C.yellowLine} opacity={.4+.6*L}/>
   <ellipse cx={x} cy={252} rx={150} ry={14} fill={C.yellow} opacity={.1*L}/>
  </g>)}
  {bulbs.map((b,i)=><g key={i}><circle cx={b.x} cy={b.y} r={9} fill={b.c} opacity={.18*b.tw*(.6+.4*L)}/><circle cx={b.x} cy={b.y} r={3.6} fill={b.c} opacity={.55+.45*b.tw}/></g>)}
  {balloons.map(b=>b.k>.004&&<g key={b.j} opacity={b.k}>
   <path d={`M ${f1(b.x)} ${f1(b.y+20)} q -6 12 0 22 q 6 10 0 20`} stroke={C.ivory} strokeOpacity={.6} strokeWidth={1.4} fill="none"/>
   <ellipse cx={b.x} cy={b.y} rx={16} ry={19} fill={b.c[0]}/><path d={`M ${f1(b.x+4)} ${f1(b.y-19)} A 16 19 0 0 1 ${f1(b.x+12)} ${f1(b.y+12)} Q ${f1(b.x+4)} ${f1(b.y)} ${f1(b.x+4)} ${f1(b.y-19)} Z`} fill={b.c[1]} opacity={.5}/>
   <ellipse cx={b.x-6} cy={b.y-7} rx={4} ry={6} fill="#FFFFFF" opacity={.5}/><polygon points={pts([[b.x-3,b.y+21],[b.x+3,b.y+21],[b.x,b.y+17]])} fill={b.c[1]}/>
  </g>)}
 </g>;
}

/* ───────────── viewer ───────────── */
export function viewerState(a:number){return {focus:smooth(a,.03,.33),heart:smooth(a,.36,.66),flame:smooth(a,.69,1)};}
/** Blink period: about 17 blinks a minute (looped films get a whole number of blinks). */
export const BLINK_PERIOD=60/17;
const BLINK_AT=.62;
/** Eyelid closure 0..1 at time t: closes over ~0.11 s and opens over ~0.19 s, once per blink period. */
export function blinkAt(t:number,loop?:number){
 const u=loopPhase(t,BLINK_PERIOD,loop),w=.3/BLINK_PERIOD,x=(u-BLINK_AT)/w;
 return x<=0||x>=1?0:x<.36?smooth(x,0,.36):1-smooth(x,.36,1);
}
/** Seconds per blink cycle as actually played (whole number of blinks over a looped film). */
const blinkCycle=(loop?:number)=>loop&&loop>0?loop/Math.max(1,Math.round(loop/BLINK_PERIOD)):BLINK_PERIOD;
/** Tally marks since the focus state began: whole count and the draw-in of the newest mark (each mark is drawn in
 *  over 0.25 s right after a blink ends). */
export function tallyAt(t:number,o:Keyed,loop?:number){
 const from=(o.activeKeys??[]).find(k=>k.value>=.3)?.at;if(from===undefined||t<from)return {n:0,draw:0};
 const P=blinkCycle(loop),end=BLINK_AT*P+.3,done=(s:number)=>Math.floor((s-end)/P);
 const n=Math.min(20,Math.max(0,done(t)-done(from))),last=end+P*done(t);
 return {n,draw:n>0&&n<20?smooth(t-last,0,.25):n>0?1:0};
}
const BEAT=60/70;
/** Heartbeat (lub-dub) 0..1 at 70 bpm. */
export function heartBeat(t:number,loop?:number){const u=loopPhase(t,BEAT,loop);return win(u,.16,.32,.34,.6)+.5*win(u,.6,.7,.72,.92);}
const ecg=(s:number)=>{const u=s-Math.floor(s);return .12*win(u,.06,.11,.13,.18)-.14*win(u,.22,.24,.24,.26)+win(u,.25,.28,.28,.31)-.32*win(u,.3,.33,.33,.37)+.26*win(u,.56,.66,.68,.8);};
const HOOD={light:"#EBBB4A",mid:"#C99A2E",dark:"#8E6A1C"};
const SKN={light:"#F0BE95",mid:"#D99B72",dark:"#B5774F",deep:"#8E5638"};
const HAIR={base:"#3A2416",hi:"#6A4630",mid:"#4E3220"};
function Eye({x,y,close,ring,uid}:{x:number;y:number;close:number;ring:number;uid:string}){
 const id=`eye-${uid}-${x<0?"l":"r"}`,shape=`M ${x-11} ${y} Q ${x} ${y-9} ${x+11} ${y} Q ${x} ${y+7.5} ${x-11} ${y} Z`,cy=lerp(y-9,y+7.5,close);
 return <g>
  <defs><clipPath id={id}><path d={shape}/></clipPath></defs>
  <path d={shape} fill="#F7F2EA"/>
  <g clipPath={`url(#${id})`}>
   <circle cx={x+.5} cy={y+1.6} r={5.6} fill="#5A3622"/><circle cx={x+.5} cy={y+1.6} r={5.6} fill="none" stroke="#2A160E" strokeWidth={1.2}/>
   <circle cx={x+.5} cy={y+1.8} r={2.6} fill="#120A06"/><circle cx={x-1.6} cy={y-.6} r={1.6} fill="#FFFFFF"/><circle cx={x+2.4} cy={y+3.4} r={1.2} fill={C.lavender}/>
   <path d={`M ${x-12} ${y-10} H ${x+12} V ${y} Q ${x} ${y-9} ${x-12} ${y} Z`} fill="#000" opacity={.08}/>
  </g>
  <path d={`M ${x-11} ${y} Q ${x} ${y-9} ${x+11} ${y} Q ${x} ${f1(cy)} ${x-11} ${y} Z`} fill={SKN.mid}/>
  <path d={`M ${x-11.5} ${y+.5} Q ${x} ${f1(cy)} ${x+11.5} ${y-.5} L ${x+13} ${y-2.5}`} stroke="#2A160E" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  <path d={`M ${x-9} ${y-6} Q ${x} ${y-12.5} ${x+10} ${y-6}`} stroke={SKN.dark} strokeWidth={1.4} fill="none" opacity={.6}/>
  <path d={`M ${x-8} ${y+5} Q ${x} ${y+7.5} ${x+8} ${y+5}`} stroke={SKN.dark} strokeWidth={1} fill="none" opacity={.5}/>
  {ring>.003&&<g opacity={ring}><circle cx={x} cy={y} r={22} fill="none" stroke={C.lavender} strokeWidth={8} opacity={.18+.3*close}/><circle cx={x} cy={y} r={22} fill="none" stroke={C.lavender} strokeWidth={3}/></g>}
 </g>;
}
function Viewer({t,a,o,uid,loop}:{t:number;a:number;o:Keyed;uid:string;loop?:number}){
 const v=viewerState(a),close=blinkAt(t,loop),breath=.5+.5*wave(t,4.2,loop),beat=heartBeat(t,loop),tally=tallyAt(t,o,loop);
 const HX=0,HY=-130,by=-1.6*breath,lampFl=.92+.08*wave(t,2.9,loop);
 const face=[[-40,-46],[-20,-56],[0,-58],[20,-56],[40,-46],[47,-22],[47,4],[42,24],[30,42],[14,54],[0,57],[-14,54],[-30,42],[-42,24],[-47,4],[-47,-22]];
 const P=(p:number[][])=>pts(p.map(([x,y])=>[HX+x,HY+y]));
 const ecgX0=110,ecgX1=250,ecgY=-58,beatW=58,ph=loopPhase(t,BEAT,loop);
 const trace=Array.from({length:71},(_,k)=>{const x=lerp(ecgX0+8,ecgX1-8,k/70),s=ph-(ecgX1-8-x)/beatW;return [x,ecgY-ecg(s)*24];});
 const marks=Array.from({length:tally.n},(_,k)=>k);
 const markPos=(k:number)=>{const g=Math.floor(k/5),j=k%5,row=Math.floor(g/3),gx=70+(g%3)*62,gy=-214+row*44;return {g,j,gx,gy};};
 return <g>
  <defs>
   <radialGradient id={`lg-${uid}`}><stop offset="0" stopColor="#FFF1C2" stopOpacity=".85"/><stop offset=".3" stopColor={C.yellow} stopOpacity=".28"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient>
   <linearGradient id={`lc-${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.yellow} stopOpacity=".22"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></linearGradient>
   <linearGradient id={`scr-${uid}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#D9B8F0" stopOpacity=".22"/><stop offset=".45" stopColor="#D9B8F0" stopOpacity=".05"/><stop offset="1" stopColor="#B9A8FF" stopOpacity="0"/></linearGradient>
   <radialGradient id={`ph-${uid}`}><stop offset="0" stopColor="#C9B8FF" stopOpacity=".55"/><stop offset="1" stopColor="#C9B8FF" stopOpacity="0"/></radialGradient>
   <radialGradient id={`hg-${uid}`}><stop offset="0" stopColor={C.pink} stopOpacity=".7"/><stop offset="1" stopColor={C.pink} stopOpacity="0"/></radialGradient>
  </defs>
  <Island y={228} rx={236} ry={42} h={16} depth={58} t={t} loop={loop} uid={uid} top="#4E3D74" topDark="#3A2C55" seed={4}/>
  {[150,112,74].map((r,i)=><ellipse key={i} cx={6} cy={230} rx={r} ry={r*.18} fill={["#8E3A5E","#B4407A","#C25A80"][i]} opacity={.9}/>)}
  <ellipse cx={6} cy={230} rx={150} ry={27} fill="none" stroke={C.yellowLine} strokeOpacity={.35} strokeWidth={2} strokeDasharray="4 6"/>
  {/* floor lamp */}
  <polygon points={pts([[-250,-222],[-150,-222],[20,-30],[-90,60]])} fill={`url(#lc-${uid})`} opacity={lampFl}/>
  <ellipse cx={-200} cy={232} rx={34} ry={8} fill={METAL.dark}/><ellipse cx={-202} cy={229} rx={28} ry={6} fill={METAL.hi}/>
  <rect x={-203} y={-226} width={6} height={456} fill={METAL.mid}/><rect x={-203} y={-226} width={2.5} height={456} fill={METAL.hi}/>
  <ellipse cx={-198} cy={-196} rx={62} ry={112} fill={`url(#lg-${uid})`} opacity={lampFl}/>
  <polygon points={pts([[-226,-292],[-174,-292],[-142,-222],[-258,-222]])} fill="#D9B87A"/>
  <polygon points={pts([[-226,-292],[-200,-292],[-206,-222],[-258,-222]])} fill="#F6E6BE"/>
  <ellipse cx={-200} cy={-222} rx={58} ry={9} fill={C.yellowLine} opacity={.9*lampFl}/>
  {/* plant */}
  <g transform="translate(196,228) scale(.9)">
   <polygon points={pts([[-22,0],[22,0],[28,-40],[-28,-40]])} fill="#8E3A5E"/><polygon points={pts([[-22,0],[0,0],[-2,-40],[-28,-40]])} fill="#C25A80"/>
   {[-50,-28,-8,12,30,48].map((an,k)=>{const r=(an+3*wave(t,5.1,loop,k*.15))*D,l=70+22*hash(k*3);return <polygon key={k} points={pts([[0,-40],[Math.sin(r)*l*.45-9*Math.cos(r),-40-Math.cos(r)*l*.45],[Math.sin(r)*l,-40-Math.cos(r)*l],[Math.sin(r)*l*.45+9*Math.cos(r),-40-Math.cos(r)*l*.45]])} fill={k%2?"#2F7A3E":"#4CA35A"}/>;})}
  </g>
  {/* armchair */}
  <polygon points={pts([[-132,-150],[-112,-178],[112,-178],[132,-150],[136,96],[-136,96]])} fill="#4E3D74"/>
  <polygon points={pts([[-132,-150],[-112,-178],[40,-178],[-20,96],[-136,96]])} fill="#6B4FA0"/>
  {[-130,-80,-30,20].map(y=>[-70,0,70].map(x=><g key={`${x}${y}`}><circle cx={x} cy={y} r={4} fill="#2E2248"/><circle cx={x-1} cy={y-1} r={1.6} fill="#B9A8DE" opacity={.6}/></g>))}
  <path d={rrect(-128,92,256,46,14)} fill="#5E4690"/><path d={rrect(-128,92,256,12,6)} fill="#8E73C2" opacity={.6}/>
  <rect x={-148} y={136} width={296} height={66} fill="#3A2C55"/>{Array.from({length:12},(_,i)=><rect key={i} x={-148+i*25} y={136} width={2} height={66} fill="#2A2042"/>)}
  <rect x={-148} y={136} width={296} height={5} fill="#6B4FA0"/>
  {[-138,138].map(x=><polygon key={x} points={pts([[x-8,202],[x+8,202],[x+5,226],[x-5,226]])} fill="#8A6418"/>)}
  {/* rolled arms of the armchair */}
  {[-1,1].map(s=>{const x0=s<0?-188:126;return <g key={s}>
   <path d={rrect(x0,-14,62,158,28)} fill={s<0?"#6B4FA0":"#4E3D74"}/>
   <path d={rrect(x0+4,-10,54,40,20)} fill={s<0?"#8E73C2":"#5E4690"}/>
   <ellipse cx={x0+31} cy={6} rx={22} ry={11} fill={s<0?"#A68BD0":"#6B4FA0"} opacity={.8}/>
   <path d={rrect(x0,-14,62,158,28)} fill="none" stroke="#2E2248" strokeWidth={2} opacity={.5}/>
  </g>;})}
  {/* legs: seated, knees toward us, shins down to the rug */}
  {[-1,1].map(s=>{const lit=s<0,c=lit?["#4A4F86","#3B3F6E"]:["#30345E","#262A52"];return <g key={s}>
   <polygon points={pts([[s*14,140],[s*56,140],[s*52,206],[s*20,206]])} fill={c[1]}/>
   <polygon points={pts([[s*14,140],[s*30,140],[s*30,206],[s*20,206]])} fill={c[0]} opacity={lit?.7:.4}/>
   <path d={rrect(s>0?12:-68,200,56,22,9)} fill={lit?C.ivory:"#D9D2E6"}/><rect x={s>0?12:-68} y={216} width={56} height={6} rx={3} fill={METAL.hi}/>
   <rect x={s>0?16:-64} y={200} width={48} height={5} rx={2.5} fill="#FFFFFF" opacity={.5}/>
   <polygon points={pts([[s*6,84],[s*70,84],[s*66,132],[s*8,132]])} fill={c[0]}/>
   <ellipse cx={s*37} cy={134} rx={30} ry={15} fill={c[0]}/><ellipse cx={s*33} cy={130} rx={18} ry={8} fill="#FFFFFF" opacity={lit?.12:.06}/>
   <path d={`M ${s*10} 146 Q ${s*37} 156 ${s*64} 146`} stroke="#14102A" strokeWidth={4} fill="none" opacity={.5}/>
  </g>;})}
  {/* torso (hoodie) */}
  <g transform={`translate(0,${f1(by)})`}>
   <ellipse cx={0} cy={-64} rx={58} ry={22} fill={HOOD.dark}/>
   <polygon points={pts([[-30,-72],[-82,-56],[-94,-18],[-84,84],[84,84],[94,-18],[82,-56],[30,-72]])} fill={HOOD.mid}/>
   <polygon points={pts([[-30,-72],[-82,-56],[-94,-18],[-84,84],[-6,84],[-10,-40]])} fill={HOOD.light}/>
   <polygon points={pts([[30,-72],[82,-56],[94,-18],[84,84],[50,84],[56,-20]])} fill={HOOD.dark} opacity={.55}/>
   <path d={`M -52 18 L 52 18 L 60 78 L -60 78 Z`} fill={HOOD.dark} opacity={.4}/><line x1={-52} y1={18} x2={52} y2={18} stroke={HOOD.dark} strokeWidth={3}/>
   <path d="M -32 -70 Q 0 -48 32 -70" fill={HOOD.dark} stroke={HOOD.dark} strokeWidth={8}/>
   {[-1,1].map(s=><g key={s}><line x1={s*14} y1={-60} x2={s*18} y2={-14} stroke={C.ivory} strokeWidth={3} strokeLinecap="round"/><rect x={s*18-2.5} y={-16} width={5} height={10} rx={2} fill={METAL.hi}/></g>)}
   {v.heart>.003&&<g opacity={v.heart}><circle cx={34} cy={-24} r={44+10*beat} fill={`url(#hg-${uid})`} opacity={.55+.45*beat}/>
    <FacetHeart x={34} y={-24} r={18*(1+.17*beat)} light={C.pink} dark={PINK.dark}/></g>}
   <polyline points={pts([[-84,-46],[-100,22],[-42,48]])} fill="none" stroke={HOOD.light} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round"/>
   <polyline points={pts([[84,-46],[100,22],[42,48]])} fill="none" stroke={HOOD.dark} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round"/>
   <polyline points={pts([[-90,-40],[-104,18]])} fill="none" stroke="#F6D57A" strokeWidth={6} strokeLinecap="round" opacity={.6}/>
   {/* phone (back towards us) and hands */}
   <ellipse cx={0} cy={-14} rx={62} ry={24} fill={`url(#ph-${uid})`}/>
   <polygon points={pts([[-29,-6],[29,-6],[34,100],[-34,100]])} fill="#2E2F42"/>
   <polygon points={pts([[-29,-6],[0,-6],[-4,100],[-34,100]])} fill="#3A3B4C"/>
   <path d={rrect(-23,2,22,26,6)} fill="#1D1628"/>{[[-17,9],[-8,9],[-17,21]].map(([x,y],k)=><g key={k}><circle cx={x} cy={y} r={3.6} fill="#07050B"/><circle cx={x-.8} cy={y-.8} r={1.2} fill={C.lavender} opacity={.7}/></g>)}
   <line x1={-29} y1={-6} x2={29} y2={-6} stroke="#C9B8FF" strokeWidth={2.5} opacity={.9}/>
   {[-1,1].map(s=><g key={s}><ellipse cx={s*36} cy={52} rx={13} ry={19} fill={s<0?SKN.light:SKN.mid}/>{[38,50,62].map(y=><path key={y} d={rrect(s<0?-32:18,y,14,8,4)} fill={s<0?SKN.mid:SKN.dark}/>)}</g>)}
  </g>
  {/* head */}
  <g transform={`translate(0,${f1(by*1.25)})`}>
   <polygon points={P([[-15,40],[15,40],[17,72],[-17,72]])} fill={SKN.dark}/>
   <ellipse cx={HX-47} cy={HY-2} rx={8} ry={13} fill={SKN.mid}/><ellipse cx={HX+47} cy={HY-2} rx={8} ry={13} fill={SKN.dark}/>
   <polygon points={P(face)} fill={mix(SKN.mid,SKN.light,.4)}/>
   <polygon points={P([[-40,-46],[-20,-56],[-2,-58],[4,-30],[-4,10],[-14,54],[-30,42],[-42,24],[-47,4],[-47,-22]])} fill={mix(SKN.mid,SKN.light,.78)}/>
   <polygon points={P([[-40,-46],[-20,-56],[-2,-58],[-12,-36],[-34,-30]])} fill={SKN.light}/>
   <polygon points={P([[-47,-22],[-34,-30],[-30,-6],[-47,4]])} fill={mix(SKN.mid,SKN.light,.55)}/>
   <polygon points={P([[30,42],[42,24],[47,4],[47,-22],[38,-6],[30,20]])} fill={mix(SKN.mid,SKN.dark,.7)}/>
   <polygon points={P([[20,-56],[40,-46],[47,-22],[36,-30],[14,-36]])} fill={mix(SKN.mid,SKN.dark,.35)}/>
   <polygon points={P([[-40,6],[-22,4],[-30,28]])} fill="#F6CCA6"/><polygon points={P([[22,4],[40,6],[30,28]])} fill={SKN.dark} opacity={.45}/>
   <polygon points={P([[-14,54],[0,57],[14,54],[8,48],[-8,48]])} fill={mix(SKN.mid,SKN.dark,.3)}/>
   <polygon points={pts(face.map(([x,y])=>[HX+x,HY+y]))} fill={`url(#scr-${uid})`}/>
   <polygon points={P([[-1,-12],[-6,11],[-1,15]])} fill="#F8D2AE"/><polygon points={P([[1,-12],[7,11],[1,15]])} fill={mix(SKN.mid,SKN.dark,.55)}/>
   <path d={`M ${HX-9} ${HY+13} Q ${HX} ${HY+20} ${HX+9} ${HY+13}`} stroke={mix(SKN.mid,SKN.dark,.6)} strokeWidth={2.4} fill="none" strokeLinecap="round"/>
   {[-4.5,4.5].map(dx=><ellipse key={dx} cx={HX+dx} cy={HY+15.5} rx={2.2} ry={1.4} fill={SKN.deep} opacity={.8}/>)}
   <path d={`M ${HX-12} ${HY+31} Q ${HX} ${HY+37} ${HX+12} ${HY+31}`} stroke="#9A4A44" strokeWidth={3} fill="none" strokeLinecap="round"/>
   <path d={`M ${HX-7} ${HY+36} Q ${HX} ${HY+39} ${HX+7} ${HY+36}`} stroke="#E8A08A" strokeWidth={2} fill="none" strokeLinecap="round"/>
   {[-26,26].map(dx=><circle key={dx} cx={HX+dx} cy={HY+16} r={7} fill={C.pink} opacity={.16}/>)}
   <Eye x={HX-19} y={HY-8} close={close} ring={0} uid={uid}/><Eye x={HX+19} y={HY-8} close={close} ring={v.focus} uid={uid}/>
   {[-1,1].map(s=><polygon key={s} points={P([[s*29,-23],[s*19,-29],[s*8,-27],[s*9,-23],[s*19,-25],[s*28,-20]])} fill={HAIR.base}/>)}
   <polygon points={P([[-52,-6],[-55,-34],[-46,-60],[-26,-74],[0,-78],[26,-74],[46,-60],[55,-34],[52,-6],[46,-20],[44,-40],[32,-50],[18,-38],[8,-50],[-6,-38],[-18,-50],[-30,-38],[-40,-46],[-46,-22]])} fill={HAIR.base}/>
   <polygon points={P([[-46,-60],[-26,-74],[0,-78],[-10,-56],[-30,-50]])} fill={HAIR.hi}/>
   <polygon points={P([[-55,-34],[-46,-60],[-30,-50],[-40,-46]])} fill={HAIR.mid}/>
   <polygon points={P([[0,-78],[26,-74],[18,-56],[-10,-56]])} fill={HAIR.mid}/>
   <polygon points={P([[-18,-50],[-6,-38],[-10,-56]])} fill={HAIR.hi} opacity={.7}/>
  </g>
  {/* blink tally beside the head */}
  {v.focus>.003&&<g opacity={v.focus}>{marks.map(k=>{const {j,gx,gy}=markPos(k),dr=k===tally.n-1?tally.draw:1;
   if(j<4){const x=gx+j*11;return <line key={k} x1={x} y1={gy} x2={x-3} y2={gy+lerp(0,34,dr)} stroke={C.lavender} strokeWidth={4.5} strokeLinecap="round" opacity={dr>.01?1:0}/>;}
   return <line key={k} x1={gx-6} y1={gy+26} x2={lerp(gx-6,gx+38,dr)} y2={lerp(gy+26,gy+6,dr)} stroke={C.yellow} strokeWidth={4.5} strokeLinecap="round" opacity={dr>.01?1:0}/>;})}</g>}
  {/* ECG beside the heart */}
  {v.heart>.003&&<g opacity={v.heart}>
   <path d={rrect(ecgX0,ecgY-42,ecgX1-ecgX0,66,12)} fill="#120C1D" opacity={.8}/>
   {[0,1,2,3].map(k=><line key={k} x1={ecgX0+8} y1={ecgY-30+k*16} x2={ecgX1-8} y2={ecgY-30+k*16} stroke={C.lavender} strokeOpacity={.08} strokeWidth={1.5}/>)}
   <polyline points={pts(trace)} fill="none" stroke={C.pink} strokeWidth={8} strokeOpacity={.22} strokeLinejoin="round"/>
   <polyline points={pts(trace)} fill="none" stroke={C.pink} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round"/>
   <circle cx={trace[70][0]} cy={trace[70][1]} r={4.5} fill="#FFD6E2"/>
   <path d={rrect(ecgX0,ecgY-42,ecgX1-ecgX0,66,12)} fill="none" stroke={C.pink} strokeOpacity={.45} strokeWidth={2}/>
  </g>}
  {/* resting burn: a small flame above the head */}
  <Flame x={40} y={-228} s={60*(.7+.3*v.flame)} t={t} loop={loop} seed={2} k={v.flame} uid={`${uid}-vf`}/>
  {v.flame>.003&&[0,1,2].map(k=>{const u=(loopPhase(t,1.9,loop)+k/3)%1;return <circle key={k} cx={40+10*Math.sin(TAU*(u+k*.3))} cy={-236-60*u} r={2.4} fill={C.yellowLine} opacity={v.flame*Math.sin(Math.PI*u)}/>;})}
 </g>;
}

/* ───────────── counter ───────────── */
/** dim = digits lit, flash = rim flash as the count lands (0.6 at its peak, gone at 1), glow = settled glow. */
export function counterState(a:number){return {dim:smooth(a,0,.25),flash:.6*Math.sin(Math.PI*smooth(a,.7,1)),glow:smooth(a,.85,1)};}
type Tok={num:true;chars:string}|{num:false;text:string};
/** Split a label into number runs (digits with , or . between digits) and other text. */
export function labelTokens(label:string):Tok[]{
 const out:Tok[]=[],isD=(c?:string)=>!!c&&c>="0"&&c<="9";let i=0;
 while(i<label.length){let j=i;
  if(isD(label[i])){while(j<label.length&&(isD(label[j])||((label[j]===","||label[j]===".")&&isD(label[j-1])&&isD(label[j+1]))))j++;out.push({num:true,chars:label.slice(i,j)});}
  else{while(j<label.length&&!isD(label[j]))j++;out.push({num:false,text:label.slice(i,j)});}
  i=j;}
 return out;
}
/** Odometer state of every digit column: pos rolls from 0 up to its digit (a 0 makes one full turn, so every column
 *  moves) as a goes 0 → 1, monotonic; columns settle left to right (the leftmost at a = 0.86, the last at a = 1);
 *  `text` is what the plate shows (equals the label exactly at a = 1). */
export function counterRoll(label:string,a:number){
 const k=clamp01(a),cols:{pos:number;digit:number}[]=[];let text="";
 for(const tk of labelTokens(label)){
  if(!tk.num){text+=tk.text;continue;}
  const n=[...tk.chars].filter(c=>c>="0"&&c<="9").length;let i=0;
  for(const ch of tk.chars){if(ch<"0"||ch>"9"){text+=ch;continue;}const end=n>1?lerp(.86,1,i/(n-1)):1,dig=Number(ch),pos=(dig||10)*clamp01(k/end);cols.push({pos,digit:dig});text+=String(Math.floor(pos+1e-9)%10);i++;}
 }
 return {cols,text};
}
const charEm=(ch:string)=>ch>="0"&&ch<="9"?.64:ch==="."||ch===","?.3:ch===" "?.27:ch==="$"?.6:/[A-Z€£%#]/.test(ch)?.68:/[a-z]/.test(ch)?.57:.6;
const SUFFIX_K=.58;
/** Layout of the label: font size that fits maxW, and x of every character (digits centred in fixed cells). */
export function counterLayout(label:string,maxW:number,base:number){
 const toks=labelTokens(label),words=(s:string)=>/[a-z]/i.test(s);
 const em=toks.reduce((n,tk)=>n+(tk.num?[...tk.chars].reduce((m,c)=>m+charEm(c),0):[...tk.text].reduce((m,c)=>m+charEm(c),0)*(words(tk.text)?SUFFIX_K:1)),0);
 const fs=Math.min(base,maxW/Math.max(em,1e-6));
 return {fs,width:em*fs,toks,words};
}
const ICON_SKIN=["#F2C29C","#C98E68"];
export function CounterGlyph({name,t,loop,uid}:{name:string;t:number;loop?:number;uid:string}){
 const pulse=.5+.5*wave(t,1.6,loop);
 switch(name){
  case "baby":return <g><path d="M -26 30 Q -30 -2 -4 -6 Q 28 -8 28 22 Q 20 34 -26 30 Z" fill={BLANKETS[0][0]}/><path d="M -10 -4 Q 12 8 22 28" stroke={BLANKETS[0][1]} strokeWidth={3} fill="none"/>
   <circle cx={-6} cy={-12} r={16} fill={ICON_SKIN[0]}/><path d="M -22.5 -14 A 16.5 16.5 0 0 1 10.5 -14 Q -6 -21 -22.5 -14 Z" fill={C.yellow}/><circle cx={-4} cy={-32} r={5} fill={C.yellow}/>
   {[-12,0].map(x=><path key={x} d={`M ${x-3} -11 Q ${x} -8.5 ${x+3} -11`} stroke="#4A2C1C" strokeWidth={1.8} fill="none" strokeLinecap="round"/>)}<circle cx={-16} cy={-6} r={3} fill={C.pink} opacity={.4}/></g>;
  case "candle":return <g><Flame x={0} y={-16} s={26} t={t} loop={loop} seed={5} uid={`${uid}-cf`}/><line x1={0} y1={-18} x2={0} y2={-12} stroke={INK} strokeWidth={2}/>
   <Quad p={[[-12,-12],[12,-12],[12,30],[-12,30]]} light={C.ivory} dark="#CFC3E6"/><ellipse cx={0} cy={-12} rx={12} ry={3.5} fill="#F6F1FB"/><path d="M 6 -12 q 3 8 0 14" stroke="#F6F1FB" strokeWidth={4} fill="none" strokeLinecap="round"/><rect x={-18} y={28} width={36} height={6} rx={3} fill={METAL.hi}/></g>;
  case "eye":{const c=blinkAt(t,loop),cy=lerp(-14,14,c);return <g><path d="M -32 0 Q 0 -30 32 0 Q 0 26 -32 0 Z" fill={C.ivory}/><circle cx={0} cy={0} r={12} fill={PURP.light}/><circle cx={0} cy={0} r={5.5} fill={INK}/><circle cx={-4} cy={-4} r={2.5} fill="#FFFFFF"/>
   <path d={`M -32 0 Q 0 -30 32 0 Q 0 ${f1(cy)} -32 0 Z`} fill={LAV.dark}/><path d={`M -33 0 Q 0 ${f1(cy)} 33 0`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round"/></g>;}
  case "heart":{const b=heartBeat(t,loop);return <FacetHeart x={0} y={-2} r={27*(1+.14*b)} light={C.pink} dark={PINK.dark}/>;}
  case "flame":return <Flame x={0} y={30} s={64} t={t} loop={loop} seed={7} uid={`${uid}-ff`}/>;
  case "bolt":return <g><polygon points={pts([[6,-34],[-18,4],[-2,4],[-8,34],[18,-6],[2,-6]])} fill={C.yellow}/><polygon points={pts([[6,-34],[-18,4],[-2,4],[2,-6]])} fill={C.yellowLine}/><polygon points={pts([[6,-34],[-18,4],[-2,4],[-8,34],[18,-6],[2,-6]])} fill="none" stroke="#FFF7D6" strokeWidth={2} opacity={.4+.6*pulse}/></g>;
  case "sun":{const r=loopPhase(t,12,loop)*360;return <g><g transform={`rotate(${f1(r)})`}>{Array.from({length:10},(_,k)=>{const an=k*36*D;return <polygon key={k} points={pts([[Math.cos(an-.16)*20,Math.sin(an-.16)*20],[Math.cos(an)*35,Math.sin(an)*35],[Math.cos(an+.16)*20,Math.sin(an+.16)*20]])} fill={k%2?C.yellow:"#F59A3C"}/>;})}</g>
   <circle r={19} fill={C.yellow}/><path d="M -13 -8 A 15 15 0 0 1 6 -16" stroke="#FFF7D6" strokeWidth={4} fill="none" strokeLinecap="round"/></g>;}
  case "globe":{const r=loopPhase(t,10,loop);return <g><defs><clipPath id={`gl-${uid}`}><circle r={28}/></clipPath></defs><circle r={28} fill="#4F63DA"/>
   <g clipPath={`url(#gl-${uid})`}>{[0,1].map(k=>{const x=-56+((r+k)*56)%112;return <g key={k} fill="#65DA41"><path d={`M ${x} -14 q 12 -10 22 -2 q 4 10 -6 14 q -10 8 -16 -2 Z`}/><path d={`M ${x+30} 4 q 10 -4 14 6 q -2 12 -10 16 q -8 -6 -4 -22 Z`}/><path d={`M ${x+4} 10 q 6 2 4 10 q -6 2 -8 -4 Z`}/></g>;})}
    <circle cx={-10} cy={-12} r={30} fill="#FFFFFF" opacity={.12}/><path d="M 28 -28 A 30 30 0 0 1 28 28 L 40 40 L 40 -40 Z" fill="#000" opacity={.0}/></g>
   <circle r={28} fill="none" stroke="#BFD0FF" strokeWidth={2.5} opacity={.6}/><path d="M 4 -28 A 28 28 0 0 1 4 28 A 18 28 0 0 0 4 -28 Z" fill="#0D0B26" opacity={.35}/></g>;}
  case "coin":return <g><ellipse cx={3} cy={4} rx={28} ry={28} fill={YEL.dark}/><circle r={28} fill={C.yellow}/><circle r={21} fill="none" stroke={YEL.dark} strokeWidth={3}/><Spark x={0} y={0} r={12} light={C.yellowLine} dark={YEL.dark}/><path d="M -18 -14 A 23 23 0 0 1 6 -22" stroke="#FFF7D6" strokeWidth={4} fill="none" strokeLinecap="round" opacity={.8}/></g>;
  case "upload":{const u=loopPhase(t,1.4,loop);return <g><path d="M -26 8 V 26 H 26 V 8" stroke={C.lavender} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
   <g transform={`translate(0,${f1(-6*Math.sin(Math.PI*u))})`}><polygon points={pts([[0,-30],[-16,-12],[-6,-12],[-6,14],[6,14],[6,-12],[16,-12]])} fill={C.yellow}/><polygon points={pts([[0,-30],[-16,-12],[-6,-12],[-6,14],[0,14]])} fill={C.yellowLine}/></g></g>;}
  case "play":return <g><path d={rrect(-30,-26,60,52,14)} fill={C.pink}/><path d={rrect(-30,-26,60,20,10)} fill="#FFFFFF" opacity={.15}/><polygon points={pts([[-8,-13],[-8,13],[14,0]])} fill={C.ivory}/></g>;
  case "search":return <g><circle cx={-6} cy={-6} r={18} fill="#2A2142" stroke={C.lavender} strokeWidth={7}/><path d="M -16 -12 A 11 11 0 0 1 -6 -18" stroke="#FFFFFF" strokeWidth={3} fill="none" opacity={.6}/><line x1={8} y1={8} x2={26} y2={26} stroke={C.lavender} strokeWidth={9} strokeLinecap="round"/></g>;
  case "kiss":return <g><path d="M -30 0 Q -18 -18 -6 -10 Q 0 -6 6 -10 Q 18 -18 30 0 Q 16 4 0 2 Q -16 4 -30 0 Z" fill={C.pink}/><path d="M -30 0 Q -16 4 0 2 Q 16 4 30 0 Q 16 22 0 22 Q -16 22 -30 0 Z" fill={PINK.dark}/><path d="M -14 10 Q 0 15 12 10" stroke="#FFFFFF" strokeOpacity={.35} strokeWidth={3} fill="none" strokeLinecap="round"/>
   <FacetHeart x={24} y={-24} r={8+2*pulse} light={PINK.soft} dark={C.pink}/></g>;
  case "people":return <g>{[[-20,4,.8,C.lavender],[20,4,.8,MINT.light],[0,0,1,C.yellow]].map(([x,y,s,c],k)=><g key={k} transform={`translate(${x},${y}) scale(${s})`}><circle cx={0} cy={-14} r={11} fill={c as string}/><path d="M -18 24 Q -18 0 0 0 Q 18 0 18 24 Z" fill={c as string}/><path d="M -18 24 Q -18 0 0 0 L 0 24 Z" fill="#FFFFFF" opacity={.18}/></g>)}</g>;
 }
 return <g><circle r={26} fill="#4F63DA"/></g>;
}
function Counter({t,a,o,uid,loop}:{t:number;a:number;o:TimedObject;uid:string;loop?:number}){
 const v=counterState(a),compact=o.rows>=2,s=compact?.74:1,label=o.label||"0",roll=counterRoll(label,a);
 const X0=-300,X1=300,Y0=-70,Y1=70,iconX=-232,tx0=-168,maxW=X1-tx0-26;
 const L=counterLayout(label,maxW,88),fs=L.fs,lh=fs*1.04,base=fs*.36,clip=`cn-${uid}`;
 let x=tx0+Math.max(0,(maxW-L.width)/2),col=0;const nodes:React.ReactNode[]=[],slots:[number,number][]=[];
 L.toks.forEach((tk,ti)=>{
  if(tk.num){slots.push([x,x+[...tk.chars].reduce((m,c)=>m+charEm(c),0)*fs]);for(const ch of tk.chars){const w=charEm(ch)*fs;
   if(ch>="0"&&ch<="9"){const c=roll.cols[col++],p=c.pos,lo=Math.floor(p+1e-9),fr=p-lo,cx=x+w/2;
    nodes.push(<g key={`d${col}`} clipPath={`url(#${clip})`}>{[0,1].map(k=>{const y=base-fr*lh+k*lh;return <text key={k} x={f1(cx)} y={f1(y)} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={f1(fs)} fill={C.ivory} opacity={lerp(.3,1,v.dim)}>{(lo+k)%10}</text>;})}</g>);}
   else nodes.push(<text key={`s${ti}${x}`} x={f1(x+w/2)} y={f1(base)} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={f1(fs)} fill={C.ivory} opacity={lerp(.3,1,v.dim)}>{ch}</text>);
   x+=w;}}
  else{const k=L.words(tk.text)?SUFFIX_K:1,w=[...tk.text].reduce((m,c)=>m+charEm(c),0)*fs*k;
   nodes.push(<text key={`t${ti}`} x={f1(x)} y={f1(base)} fontFamily={FONT} fontWeight={800} fontSize={f1(fs*k)} fill={k<1?C.lavender:C.yellow} opacity={smooth(a,.15,.6)} xmlSpace="preserve">{tk.text}</text>);x+=w;}
 });
 const rimC=mix(C.lavender,C.yellow,v.glow*.6+v.flash*.6);
 return <g transform={`scale(${s})`}>
  <defs><clipPath id={clip}><rect x={tx0-6} y={-fs*.52} width={maxW+20} height={fs*1.04}/></clipPath>
   <linearGradient id={`pl-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A2142"/><stop offset="1" stopColor="#120C1D"/></linearGradient>
   <linearGradient id={`sh-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0"/><stop offset=".5" stopColor="#FFFFFF" stopOpacity=".16"/><stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/></linearGradient>
   <radialGradient id={`cg-${uid}`}><stop offset="0" stopColor={C.yellow} stopOpacity=".35"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient>
   <clipPath id={`pc-${uid}`}><path d={rrect(X0,Y0,X1-X0,Y1-Y0,34)}/></clipPath>
   <linearGradient id={`ft-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B0814" stopOpacity=".95"/><stop offset="1" stopColor="#0B0814" stopOpacity="0"/></linearGradient>
   <linearGradient id={`fb-${uid}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#0B0814" stopOpacity=".95"/><stop offset="1" stopColor="#0B0814" stopOpacity="0"/></linearGradient></defs>
  <ellipse cx={0} cy={0} rx={310} ry={84} fill={`url(#cg-${uid})`} opacity={.25*v.glow+.8*v.flash}/>
  <path d={rrect(X0+8,Y0-7,X1-X0,Y1-Y0,34)} fill="#3A2C55"/>
  <path d={rrect(X0,Y0,X1-X0,Y1-Y0,34)} fill={`url(#pl-${uid})`}/>
  <path d={rrect(X0+4,Y0+4,X1-X0-8,26,22)} fill="#FFFFFF" opacity={.04}/>
  <g clipPath={`url(#pc-${uid})`}>{v.flash>.01&&<rect x={lerp(X0-160,X1,smooth(a,.7,1))} y={Y0} width={160} height={Y1-Y0} fill={`url(#sh-${uid})`} opacity={v.flash/.6}/>}</g>
  <path d={rrect(X0,Y0,X1-X0,Y1-Y0,34)} fill="none" stroke={rimC} strokeWidth={9} strokeOpacity={.1+.25*v.glow+.5*v.flash}/>
  <path d={rrect(X0,Y0,X1-X0,Y1-Y0,34)} fill="none" stroke={rimC} strokeWidth={3} strokeOpacity={.45+.45*Math.max(v.glow,v.flash/.6)}/>
  <circle cx={iconX} cy={0} r={50} fill="#1D1628"/><circle cx={iconX} cy={0} r={50} fill="none" stroke={C.lavender} strokeOpacity={.4} strokeWidth={3}/>
  <circle cx={iconX} cy={0} r={44} fill="#2A2142"/><path d={`M ${iconX-40} -14 A 42 42 0 0 1 ${iconX-8} -42`} stroke="#FFFFFF" strokeOpacity={.12} strokeWidth={5} fill="none"/>
  <g transform={`translate(${iconX},0)`} opacity={lerp(.55,1,v.dim)}><CounterGlyph name={o.aim||"globe"} t={t} loop={loop} uid={uid}/></g>
  {slots.map(([x0,x1],k)=><path key={k} d={rrect(x0-8,-fs*.56,x1-x0+16,fs*1.12,12)} fill="#0B0814" stroke={C.lavender} strokeOpacity={.14} strokeWidth={2}/>)}
  {nodes}
  {slots.map(([x0,x1],k)=><g key={k}><rect x={x0-6} y={-fs*.54} width={x1-x0+12} height={fs*.3} fill={`url(#ft-${uid})`}/><rect x={x0-6} y={fs*.24} width={x1-x0+12} height={fs*.3} fill={`url(#fb-${uid})`}/></g>)}
 </g>;
}

/* ───────────── money-stack ───────────── */
export const STACK_FULL=620,STACK_MIN=18;
/** Stack height (px at scale 1) for a label among stacks whose largest amount is stackMax; never below STACK_MIN. */
export function stackHeight(label:string,stackMax?:number){
 const v=parseAmount(label),m=stackMax&&stackMax>0?stackMax:v;
 if(v===null||!m)return STACK_FULL;
 return Math.max(STACK_MIN,Math.min(STACK_FULL,STACK_FULL*v/m));
}
/** Bundles of a stack of height H and where bundle i is at state a (0 = empty pedestal, 1 = complete). */
export function stackBundles(H:number,a:number){
 const N=Math.max(1,Math.round(H/24)),th=H/N,f=Math.min(.6,Math.max(.3,1.6/(N+1.6)));
 return Array.from({length:N},(_,i)=>{const s=N>1?i/(N-1)*(1-f):0,u=clamp01((a-s)/f),drop=50+8*hash(i*1.7);
  const fall=u<.8?drop*(1-Math.pow(u/.8,2)):0,bounce=u>=.8?5*Math.sin(Math.PI*(u-.8)/.2):0;
  return {i,th,top:-(i+1)*th-fall-bounce,o:smooth(u,0,.15),u,dx:(hash(i*4.1+1)-.5)*9};});
}
const STACK_BASE=342;
function Bundle({x,y,th,top,seed=0}:{x:number;y:number;th:number;top:boolean;seed?:number}){
 const w=190,d:[number,number]=[16,-11],x0=x-w/2,lines=Math.max(1,Math.floor(th/3.2)),tint=hash(seed*2.9+.4),bx=(hash(seed*5.3)-.5)*14;
 const face=mix("#ECE4F7","#F4EEDD",tint),faceD=mix("#D5C8EA","#DDD3C4",tint);
 return <g>
  <polygon points={pts([[x0+w,y],[x0+w+d[0],y+d[1]],[x0+w+d[0],y+th+d[1]],[x0+w,y+th]])} fill={mix("#A99BC8","#B8AE9C",tint*.6)}/>
  <Quad p={[[x0,y],[x0+w,y],[x0+w,y+th],[x0,y+th]]} light={face} dark={faceD}/>
  {Array.from({length:lines},(_,k)=><line key={k} x1={x0} y1={y+(k+.5)*th/lines} x2={x0+w+d[0]*.0} y2={y+(k+.5)*th/lines} stroke={k%2?"#B9A8DE":"#FFFFFF"} strokeWidth={1} opacity={.7}/>)}
  <rect x={x+bx-22} y={y} width={44} height={th} fill={MINT.light}/><rect x={x+bx-22} y={y} width={44} height={th} fill="none" stroke={MINT.dark} strokeWidth={1.5}/>
  <rect x={x+bx-22} y={y} width={12} height={th} fill="#FFFFFF" opacity={.25}/>
  <line x1={x0} y1={y+th-.8} x2={x0+w} y2={y+th-.8} stroke="#8E7AB8" strokeWidth={1.6} opacity={.7}/>
  <rect x={x0} y={y} width={6} height={th} fill="#FFFFFF" opacity={.35}/>
  <polygon points={pts([[x0+w,y+2],[x0+w+d[0],y+d[1]+2],[x0+w+d[0],y+th+d[1]-1],[x0+w,y+th-1]])} fill="#8E7AB8" opacity={.35}/>
  {top&&<g>
   <polygon points={pts([[x0,y],[x0+w,y],[x0+w+d[0],y+d[1]],[x0+d[0],y+d[1]]])} fill="#F3EBFD"/>
   <polygon points={pts([[x0+8,y-1.5],[x0+w-6,y-1.5],[x0+w+d[0]-8,y+d[1]+1.5],[x0+d[0]+6,y+d[1]+1.5]])} fill="none" stroke={C.purple} strokeWidth={1.6} opacity={.7}/>
   <polygon points={pts([[x+bx-22,y],[x+bx+22,y],[x+bx+22+d[0],y+d[1]],[x+bx-22+d[0],y+d[1]]])} fill={MINT.light}/>
   <ellipse cx={x-55+d[0]/2} cy={y+d[1]/2} rx={11} ry={4.5} fill={C.yellow} stroke={YEL.dark} strokeWidth={1.2}/>
   <ellipse cx={x+62+d[0]/2} cy={y+d[1]/2} rx={11} ry={4.5} fill={C.yellow} stroke={YEL.dark} strokeWidth={1.2}/>
  </g>}
 </g>;
}
function MoneyStack({t,a,o,uid,loop,stackMax}:{t:number;a:number;o:TimedObject;uid:string;loop?:number;stackMax?:number}){
 const label=o.label||"",H=stackHeight(label,stackMax),bundles=stackBundles(H,a),done=smooth(a,.75,1),lab=smooth(a,.06,.4);
 const topY=STACK_BASE-H,parts=/^(\S*\d\S*)\s+(\S.*)$/.exec(label),two=!!parts&&/[a-z]/i.test(parts[2])&&label.length>7;
 const l1=two?parts![1]:label,l2=two?parts![2]:"",em=(s:string)=>[...s].reduce((m,c)=>m+charEm(c),0);
 const fs1=Math.min(two?50:56,236/Math.max(em(l1),1)),fs2=Math.min(28,230/Math.max(em(l2),1)),pw=Math.max(em(l1)*fs1,two?em(l2)*fs2:0)+40,ph=two?fs1*1.02+fs2*1.1+14:fs1*1.22;
 const py=Math.max(-388,topY-14-ph);
 const glints=[[-70,topY-4],[64,topY+6],[-112,STACK_BASE-6],[104,STACK_BASE-2]];
 return <g>
  <defs><radialGradient id={`mg-${uid}`}><stop offset="0" stopColor={MINT.light} stopOpacity=".4"/><stop offset="1" stopColor={MINT.light} stopOpacity="0"/></radialGradient></defs>
  <Island y={340} rx={116} ry={20} h={12} depth={30} t={t} loop={loop} uid={uid} glow={MINT.light} k={done} seed={7}/>
  {done>.003&&<ellipse cx={0} cy={STACK_BASE-H/2} rx={150} ry={H/2+40} fill={`url(#mg-${uid})`} opacity={done*.8}/>}
  <ellipse cx={4} cy={STACK_BASE-2} rx={104} ry={13} fill="#000" opacity={.3*smooth(a,0,.2)}/>
  {bundles.map(b=>b.o>.003&&<g key={b.i} opacity={b.o}><Bundle seed={b.i} x={b.dx} y={STACK_BASE+b.top} th={b.th} top={b.i===bundles.length-1||b.u<1||bundles[b.i+1]?.u<.8}/></g>)}
  {done>.003&&<g opacity={done}>
   {[[-92,348,0],[-74,350,1],[-84,343,2],[92,349,3]].map(([x,y,k])=><g key={k}><ellipse cx={x} cy={y+3} rx={14} ry={5.5} fill={YEL.dark}/><ellipse cx={x} cy={y} rx={14} ry={5.5} fill={C.yellow}/><ellipse cx={x-3} cy={y-1} rx={6} ry={2} fill="#FFF7D6" opacity={.7}/></g>)}
   {glints.map(([x,y],k)=><Spark key={k} x={x} y={y} r={9} light="#FFFFFF" dark={C.yellow} k={Math.pow(.5+.5*wave(t,2.3+.4*k,loop,k*.27),6)}/>)}
  </g>}
  {label&&lab>.003&&<g opacity={lab} transform={`translate(0,${f1(py+ph/2)}) scale(${(.9+.1*lab).toFixed(3)}) translate(0,${f1(-(py+ph/2))})`}>
   <path d={rrect(-pw/2,py,pw,ph,Math.min(22,ph/2))} fill="#1D1628" opacity={.92}/>
   <path d={rrect(-pw/2,py,pw,ph,Math.min(22,ph/2))} fill="none" stroke={C.yellow} strokeOpacity={.55+.4*done} strokeWidth={3}/>
   <text x={0} y={f1(py+(two?fs1*.88:ph/2+fs1*.36))} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={f1(fs1)} fill={C.yellow}>{l1}</text>
   {two&&<text x={0} y={f1(py+fs1*1.02+fs2*.92)} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={f1(fs2)} fill={C.lavender}>{l2}</text>}
  </g>}
 </g>;
}

/* ───────────── minute-earth ───────────── */
export function earthState(a:number){return {k:smooth(a,0,1)};}
const ER=230;
/** Lightning sites on the night side (screen space inside the disc), each with its own period and threshold. */
const STORMS=[[46,-24],[96,14],[150,-46],[188,24],[124,66],[62,92],[176,-96],[104,-96],[206,92],[34,46],[150,128],[80,-58],[214,-30],[20,-80]].map(([x,y])=>({x,y}));
const FLASHES=Array.from({length:48},(_,k)=>{const st=STORMS[k%STORMS.length],x=st.x+(hash(k*3.1)-.5)*44,y=st.y+(hash(k*7.7)-.5)*26;return {x,y,p:.75+1.15*hash(k*5.3),off:hash(k*2.9),th:hash(k*9.1)*.9,big:hash(k*1.7)<.5,fork:hash(k*8.3)};});
/** Flash envelope 0..1 of site k: rises over ~0.08 s, decays over ~0.3 s, density ∝ a. */
export function flashAt(t:number,k:number,a:number,loop?:number){
 const f=FLASHES[k],u=(loopPhase(t,f.p,loop)+f.off)%1,rw=.08/f.p,dw=.34/f.p,e=smooth(u,0,rw)*(1-smooth(u,rw,rw+dw));
 return e*smooth(a,f.th,f.th+.1);
}
/** Distance travelled along the orbit (px), integrated over the keyed speed from when the object enters. rows 4 passes
 *  its orbit-layer weight, so the planet only flies while the orbit overlay is on. */
export function orbitTravel(t:number,o:Keyed,speed:(a:number)=>number=a=>a){
 const keys=o.activeKeys??[],dur=MINUTE_KEY_SECONDS["minute-earth"],start=Math.min(t,o.enterAt??0),dt=1/30;let x=0;
 for(let s=start;s<t-1e-9;s+=dt){const h=Math.min(dt,t-s);x+=260*speed(keyed(s+h/2,keys,0,dur,easeSine))*h;}
 return x;
}
/** rows 4 (2026-10-22, «One minute on Earth»): one persistent planet whose overlays follow active — lightning around 0.33,
 *  the orbit flight around 0.6, sunlight at 1 — so the story moves on without swapping planets in the frame. */
export function earthLayers(a:number){return {wL:win(a,.06,.26,.45,.62),wO:win(a,.42,.56,.76,.9),wS:smooth(a,.72,.95)};}
const ORB_C=[-640,-1520],ORB_R=Math.hypot(640,1520);
/** Dashed orbit, motion trail, speed lines and the heading arrow around a planet of radius R (weight w, arc opacity arcO). */
function OrbitLayer({s,w,arcO,R,uid}:{s:number;w:number;arcO:number;R:number;uid:string}){
 const th0=Math.atan2(-ORB_C[1],-ORB_C[0]);
 const at=(d:number)=>{const th=th0-d/ORB_R;return [ORB_C[0]+Math.cos(th)*ORB_R,ORB_C[1]+Math.sin(th)*ORB_R];};
 const arc=Array.from({length:61},(_,k)=>at(lerp(-420,420,k/60)));
 const trail=Array.from({length:31},(_,k)=>at(lerp(0,-520,k/30)));
 const tan=[Math.sin(th0),-Math.cos(th0)],nrm=[Math.cos(th0),Math.sin(th0)];
 const lines=Array.from({length:16},(_,k)=>{const off=(k%2?1:-1)*(R+18+hash(k*3.3)*90),W=720,u=((-s*1.6+hash(k*5.1)*W)%W+W)%W/W,along=lerp(-360,360,u),len=(50+60*hash(k*2.2))*w;
  const cx=tan[0]*along+nrm[0]*off,cy=tan[1]*along+nrm[1]*off,x1=cx-tan[0]*len,y1=cy-tan[1]*len,edge=1-smooth(Math.max(Math.abs(cx),Math.abs(cy),Math.abs(x1),Math.abs(y1)),290,336);return {x0:cx,y0:cy,x1,y1,o:Math.sin(Math.PI*u)*w*edge};});
 const side=(sg:number)=>trail.map((p,k)=>{const u=k/30,wd=R*.98*Math.pow(1-u,1.3);return [p[0]+nrm[0]*wd*sg,p[1]+nrm[1]*wd*sg];});
 const tail=[...side(1),...side(-1).reverse()];
 return <g>
  <defs><linearGradient id={`tr-${uid}`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={f1(trail[30][0])} y2={f1(trail[30][1])}><stop offset="0" stopColor={C.lavender} stopOpacity=".55"/><stop offset=".55" stopColor={C.lavender} stopOpacity=".2"/><stop offset="1" stopColor={C.lavender} stopOpacity="0"/></linearGradient>
   <clipPath id={`tc-${uid}`}><rect x={-345} y={-345} width={690} height={690}/></clipPath></defs>
  <g clipPath={`url(#tc-${uid})`}>
   {arcO>.004&&<polyline points={pts(arc)} fill="none" stroke={C.lavender} strokeOpacity={.6*arcO} strokeWidth={4} strokeDasharray="14 16" strokeDashoffset={f1(s)}/>}
   <polygon points={pts(tail)} fill={`url(#tr-${uid})`} opacity={w}/>
   {[-.55,0,.55].map((q0,q)=><polyline key={q} points={pts(trail.slice(0,24-Math.abs(q-1)*6).map((p,k)=>[p[0]+nrm[0]*R*q0*(1-k/30),p[1]+nrm[1]*R*q0*(1-k/30)]))} fill="none" stroke={q===1?C.ivory:C.lavender} strokeOpacity={.55*w} strokeWidth={q===1?5:3} strokeLinecap="round"/>)}
   {lines.map((l,k)=>l.o>.004&&<line key={k} x1={l.x0} y1={l.y0} x2={l.x1} y2={l.y1} stroke={k%3?C.lavender:C.ivory} strokeWidth={4} strokeLinecap="round" opacity={.85*l.o}/>)}
  </g>
 </g>;
}
function OrbitArrow({w,R}:{w:number;R:number}){
 const th0=Math.atan2(-ORB_C[1],-ORB_C[0]),tan=[Math.sin(th0),-Math.cos(th0)],nrm=[Math.cos(th0),Math.sin(th0)];
 return w>.01?<polygon points={pts([[tan[0]*(R+30)+nrm[0]*-18,tan[1]*(R+30)+nrm[1]*-18],[tan[0]*(R+64),tan[1]*(R+64)],[tan[0]*(R+30)+nrm[0]*18,tan[1]*(R+30)+nrm[1]*18]])} fill={C.yellow} opacity={w}/>:null;
}
const SUN_RAYS=Array.from({length:9},(_,j)=>{const y=lerp(-196,196,j/8)+(hash(j*2.2)-.5)*14,hit=-Math.sqrt(Math.max(0,ER*ER-y*y))+6;return {y,hit};});
/** Golden rays from the left (behind the planet). */
function SunRays({k,uid}:{k:number;uid:string}){
 return <g><defs><linearGradient id={`ry-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.yellow} stopOpacity="0"/><stop offset=".6" stopColor={C.yellow} stopOpacity=".35"/><stop offset="1" stopColor={C.yellowLine} stopOpacity=".7"/></linearGradient></defs>
  {SUN_RAYS.map((r,j)=><polygon key={j} points={pts([[-350,r.y-12],[r.hit,r.y-5],[r.hit,r.y+5],[-350,r.y+12]])} fill={`url(#ry-${uid})`} opacity={k*.9}/>)}</g>;
}
/** Warm day side, charge ring and light particles landing on the planet (above it). */
function SunGlow({t,k,uid,loop}:{t:number;k:number;uid:string;loop?:number}){
 return <g>
  <defs><radialGradient id={`dw-${uid}`} cx=".25" cy=".38" r=".75"><stop offset="0" stopColor="#FFD27A" stopOpacity=".6"/><stop offset=".55" stopColor="#F59A3C" stopOpacity=".2"/><stop offset="1" stopColor="#F59A3C" stopOpacity="0"/></radialGradient>
   <radialGradient id={`ch-${uid}`}><stop offset=".8" stopColor={C.yellow} stopOpacity="0"/><stop offset=".9" stopColor={C.yellow} stopOpacity=".45"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient>
   <clipPath id={`dc-${uid}`}><circle r={ER}/></clipPath></defs>
  <circle r={ER} fill={`url(#dw-${uid})`} clipPath={`url(#dc-${uid})`} opacity={k}/>
  <circle r={ER*1.25} fill={`url(#ch-${uid})`} opacity={k*(.7+.3*wave(t,2.6,loop))}/>
  {SUN_RAYS.flatMap((r,j)=>[0,1,2,3].map(q=>{const u=(loopPhase(t,1.5,loop)+q/4+hash(j*3.7))%1,x=lerp(-350,r.hit,u),o=k*Math.sin(Math.PI*Math.min(1,u*1.15));
   return o>.01&&<g key={`${j}-${q}`}><circle cx={x} cy={r.y} r={7} fill={C.yellow} opacity={.25*o}/><circle cx={x} cy={r.y} r={3} fill="#FFF3C0" opacity={o}/></g>;}))}
  {SUN_RAYS.map((r,j)=>{const g=k*(.5+.5*wave(t,1.5,loop,hash(j*3.7)));return <circle key={`h${j}`} cx={r.hit-2} cy={r.y} r={9} fill={C.yellowLine} opacity={.5*g}/>;})}
 </g>;
}
/** Storm cells over the tropics on the night side, flashes lighting them from inside (k = layer opacity, density = rate). */
function Storms({t,k,density,uid,loop}:{t:number;k:number;density:number;uid:string;loop?:number}){
 const fore=(x:number)=>Math.sqrt(Math.max(.05,1-(x/ER)**2));
 // Daylight on a screen point of the sphere (same light as the planet): storms on the day side are white tops.
 const L0=[-.86,-.22,.46],LL=Math.hypot(L0[0],L0[1],L0[2]),day=(x:number,y:number)=>{const z=Math.sqrt(Math.max(0,ER*ER-x*x-y*y));return smooth((x*L0[0]+y*L0[1]+z*L0[2])/ER/LL,-.12,.32);};
 return <g>
  <defs><radialGradient id={`fl-${uid}`}><stop offset="0" stopColor="#FFFFFF" stopOpacity=".95"/><stop offset=".25" stopColor="#E6DCFF" stopOpacity=".65"/><stop offset="1" stopColor="#B9A8FF" stopOpacity="0"/></radialGradient>
   <clipPath id={`lc-${uid}`}><circle r={ER-2}/></clipPath></defs>
  <g clipPath={`url(#lc-${uid})`} opacity={k}>
   {STORMS.map((c,j)=>{const f=fore(c.x),dl=day(c.x,c.y);return <g key={j} transform={`translate(${f1(c.x)},${f1(c.y)}) scale(${f1(f*100/100)},1)`}>
    {[[-18,5,15],[0,-4,21],[20,3,15],[8,10,12]].map(([dx,dy,r],q)=>{const P=Array.from({length:6},(_,m)=>{const an=m/6*TAU+j;return [dx+Math.cos(an)*r,dy+Math.sin(an)*r*.6];});
     return <g key={q}>{P.map((p,m)=>{const n=P[(m+1)%P.length],lit=clamp01(.5-.5*Math.cos(Math.atan2((p[1]+n[1])/2-dy,(p[0]+n[0])/2-dx)+135*D)),col=mix(mix("#2A2856","#45427A",lit),mix("#B9B6D2","#F6F3FC",lit),dl);return <polygon key={m} points={pts([[dx,dy],p,n])} fill={col} stroke={col} strokeWidth={.6} opacity={.85}/>;})}</g>;})}
   </g>;})}
   {FLASHES.map((f,j)=>{const e=flashAt(t,j,density,loop)*(1-.75*day(f.x,f.y));if(e<=.01)return null;const ff=fore(f.x);
    return <g key={j} opacity={e}><ellipse cx={f.x} cy={f.y} rx={(f.big?74:50)*ff} ry={f.big?60:40} fill={`url(#fl-${uid})`}/>
     <ellipse cx={f.x} cy={f.y} rx={7*ff} ry={6} fill="#FFFFFF"/>
     {f.big&&<g stroke="#FFFFFF" strokeLinejoin="round" strokeLinecap="round" fill="none"><polyline points={pts([[f.x,f.y],[f.x+6*ff,f.y+9],[f.x-2*ff,f.y+14],[f.x+5*ff,f.y+26]])} strokeWidth={3}/><polyline points={pts([[f.x-2*ff,f.y+14],[f.x-10*ff,f.y+20]])} strokeWidth={2} opacity={f.fork>.4?1:0}/></g>}</g>;})}
  </g>
 </g>;
}
function MinuteEarth({t,a,o,uid,loop}:{t:number;a:number;o:TimedObject;uid:string;loop?:number}){
 const rows=o.rows||1,tE=loopPhase(t,180,loop)*90,cl=`me-${uid}`;
 if(rows===4){
  const {wL,wO,wS}=earthLayers(a),s=orbitTravel(t,o,v=>earthLayers(v).wO);
  return <g>
   {wO>.004&&<OrbitLayer s={s} w={wO} arcO={wO} R={ER} uid={uid}/>}
   {wS>.004&&<SunRays k={wS} uid={uid}/>}
   <Earth t={tE} a={0} r={ER} step={8} uid={cl}/>
   {wS>.004&&<SunGlow t={t} k={wS} uid={uid} loop={loop}/>}
   {wL>.004&&<Storms t={t} k={wL} density={wL} uid={uid} loop={loop}/>}
   <OrbitArrow w={wO} R={ER}/>
  </g>;
 }
 if(rows===3){
  const s=orbitTravel(t,o),sp=smooth(a,0,.6);
  return <g>
   <OrbitLayer s={s} w={sp} arcO={1} R={196} uid={uid}/>
   <Earth t={tE} a={0} r={196} step={8} uid={cl}/>
   <OrbitArrow w={sp} R={196}/>
  </g>;
 }
 if(rows===2){
  const k=smooth(a,0,1);
  return <g><SunRays k={k} uid={uid}/><Earth t={tE} a={0} r={ER} step={8} uid={cl}/><SunGlow t={t} k={k} uid={uid} loop={loop}/></g>;
 }
 // rows 1: lightning
 return <g><Earth t={tE} a={0} r={ER} step={8} uid={cl}/><Storms t={t} k={smooth(a,0,.4)} density={a} uid={uid} loop={loop}/></g>;
}

/* ───────────── upload-phone ───────────── */
export function uploadState(a:number){return {screen:.55+.45*smooth(a,0,.5),rate:a*(1+9*a)};}
const FLIGHT=2.2;
/** Emitted cards still in flight at t: emission is the integral of the keyed rate (stepped 1/30 s from entry, crossing
 *  times interpolated), so a rate change never moves a card that is already flying. */
export function uploadCards(t:number,o:Keyed){
 const keys=o.activeKeys??[],dur=MINUTE_KEY_SECONDS["upload-phone"],start=Math.min(t,o.enterAt??0),dt=1/30,out:{j:number;age:number}[]=[];let E=0;
 for(let s=start;s<t-1e-9;s+=dt){const h=Math.min(dt,t-s),r=uploadState(keyed(s+h/2,keys,0,dur,easeSine)).rate,E1=E+r*h;
  for(let j=Math.floor(E)+1;j<=E1;j++){const tau=s+h*(j-E)/(E1-E||1);if(t-tau<FLIGHT)out.push({j,age:t-tau});}E=E1;}
 return out;
}
const PHN={x:-104,y:-170,w:208,h:420},SCR={x:-94,y:-158,w:188,h:396};
function Thumb({x,y,s,seed,t,loop}:{x:number;y:number;s:number;seed:number;t:number;loop?:number}){
 const kind=Math.floor(hash(seed*3.7)*4),bg=[["#5B3A94","#B4407A"],["#2E4A6A","#4F63DA"],["#8A6418","#E2704A"],["#3F9A28","#A8E8C4"]][kind],u=s/10;
 return <g>
  <rect x={x} y={y} width={s} height={s} rx={u} fill={bg[0]}/><rect x={x} y={y+s*.55} width={s} height={s*.45} fill={bg[1]} opacity={.7}/>
  {kind===0&&<g><circle cx={x+s*.68} cy={y+s*.32} r={s*.14} fill={C.yellow}/><polygon points={pts([[x,y+s*.8],[x+s*.35,y+s*.42],[x+s*.6,y+s*.75],[x+s*.78,y+s*.55],[x+s,y+s*.8],[x+s,y+s],[x,y+s]])} fill="#3A2264"/></g>}
  {kind===1&&<g><circle cx={x+s/2} cy={y+s*.42} r={s*.18} fill="#F2C29C"/><path d={`M ${x+s*.28} ${y+s} Q ${x+s*.28} ${y+s*.62} ${x+s/2} ${y+s*.62} Q ${x+s*.72} ${y+s*.62} ${x+s*.72} ${y+s} Z`} fill={C.yellow}/><path d={`M ${x+s*.31} ${y+s*.4} A ${s*.19} ${s*.19} 0 0 1 ${x+s*.69} ${y+s*.4} Q ${x+s/2} ${y+s*.3} ${x+s*.31} ${y+s*.4} Z`} fill="#3A2416"/></g>}
  {kind===2&&<g><ellipse cx={x+s/2} cy={y+s*.6} rx={s*.36} ry={s*.2} fill={C.ivory}/><circle cx={x+s*.42} cy={y+s*.55} r={s*.1} fill={C.pink}/><circle cx={x+s*.58} cy={y+s*.58} r={s*.09} fill={C.green}/><circle cx={x+s*.5} cy={y+s*.5} r={s*.07} fill={C.yellow}/></g>}
  {kind===3&&<g>{[0,1,2,3].map(k=>{const top=.3+hash(seed+k)*.3;return <polygon key={k} points={pts([[x+s*(.1+k*.21),y+s],[x+s*(.18+k*.21),y+s*top],[x+s*(.26+k*.21),y+s]])} fill={k%2?"#1D3A2A":"#2F5A40"}/>;})}<circle cx={x+s*.8} cy={y+s*.2} r={s*.08} fill={C.ivory}/></g>}
  <rect x={x} y={y} width={s} height={s} rx={u} fill="none" stroke="#FFFFFF" strokeOpacity={.12+.08*wave(t,3,loop,seed*.13)} strokeWidth={1.5}/>
 </g>;
}
function UploadPhone({t,a,o,uid,loop}:{t:number;a:number;o:TimedObject;uid:string;loop?:number}){
 const v=uploadState(a),rows=o.rows||1,cards=uploadCards(t,o),scr=`up-${uid}`,emit:[number,number]=rows===3?[0,-108]:rows===2?[0,40]:[0,190];
 const card=(j:number,age:number)=>{const q=age/FLIGHT,sx=(((j*.618034+.2*hash(j*3.3))%1)-.5)*(rows===3?320:350),yTop=-290,y=emit[1]+(yTop-emit[1])*q*(1.4-.4*q),x=emit[0]+sx*(1-(1-q)*(1-q)),rot=(hash(j*5.7)-.5)*30*q,sc=lerp(.3,rows===3?.82:1,smooth(q,0,.22))*(1-.15*q),op=smooth(q,0,.12)*(1-smooth(q,.72,1));
  const body=rows===1?<g><path d={rrect(-38,-38,76,76,8)} fill={C.ivory}/><Thumb x={-32} y={-32} s={64} seed={j} t={t} loop={loop}/></g>:
   rows===2?<g><path d={rrect(-28,-48,56,96,10)} fill={["#5B3A94","#B4407A","#2E4A6A","#8A6418"][j%4]}/><path d={rrect(-28,-48,56,40,10)} fill="#FFFFFF" opacity={.1}/><circle cx={0} cy={-2} r={13} fill="#FFFFFF" opacity={.25}/><polygon points={pts([[-5,-9],[-5,5],[8,-2]])} fill={C.ivory}/><rect x={-20} y={36} width={40} height={4} rx={2} fill="#FFFFFF" opacity={.3}/><rect x={-20} y={36} width={40*hash(j*1.9)} height={4} rx={2} fill={C.pink}/></g>:
   <g><path d={rrect(-58,-17,116,34,17)} fill="#F3EBFD"/><circle cx={-38} cy={-1} r={8} fill="none" stroke={PURP.light} strokeWidth={3.5}/><line x1={-32} y1={5} x2={-27} y2={10} stroke={PURP.light} strokeWidth={4} strokeLinecap="round"/>{Array.from({length:3+Math.floor(hash(j)*4)},(_,k)=><circle key={k} cx={-16+k*12} cy={0} r={4} fill={k%2?C.purple:"#7A64A6"}/>)}</g>;
  return op>.004&&<g key={j} opacity={op} transform={`translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${sc.toFixed(3)})`}><ellipse cx={4} cy={8} rx={40} ry={12} fill="#000" opacity={.25}/>{body}</g>;};
 const typed=loopPhase(t,3,loop),dots=Math.floor(typed*7),dotFade=1-smooth(typed,.86,.98);
 return <g>
  <defs><clipPath id={scr}><path d={rrect(SCR.x,SCR.y,SCR.w,SCR.h,26)}/></clipPath>
   <linearGradient id={`${scr}-bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A2142"/><stop offset="1" stopColor="#120C1D"/></linearGradient>
   <radialGradient id={`${scr}-gl`}><stop offset="0" stopColor={C.lavender} stopOpacity=".4"/><stop offset="1" stopColor={C.lavender} stopOpacity="0"/></radialGradient>
   <linearGradient id={`${scr}-vid`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3A2264"/><stop offset=".6" stopColor="#B4407A"/><stop offset="1" stopColor="#F59A3C"/></linearGradient></defs>
  <Island y={262} rx={150} ry={26} h={14} depth={40} t={t} loop={loop} uid={uid} seed={9} k={smooth(a,.3,1)}/>
  <ellipse cx={0} cy={20} rx={200} ry={260} fill={`url(#${scr}-gl)`} opacity={.3+.5*v.screen*smooth(a,0,1)}/>
  <polygon points={pts([[-70,236],[70,236],[78,266],[-78,266]])} fill={METAL.mid}/><polygon points={pts([[-70,236],[0,236],[-6,266],[-78,266]])} fill={METAL.top}/>
  <path d={rrect(PHN.x,PHN.y,PHN.w,PHN.h,34)} fill="#45465A"/>
  <path d={`M ${PHN.x+PHN.w} ${PHN.y+34} V ${PHN.y+PHN.h-34} A 34 34 0 0 1 ${PHN.x+PHN.w-34} ${PHN.y+PHN.h} H ${PHN.x+34} Z`} fill="#26273A"/>
  <path d={rrect(PHN.x,PHN.y,PHN.w,PHN.h,34)} fill="none" stroke={C.purpleStroke} strokeOpacity={.55} strokeWidth={3}/>
  <rect x={PHN.x-5} y={PHN.y+90} width={6} height={42} rx={3} fill="#5E5F74"/><rect x={PHN.x+PHN.w-1} y={PHN.y+110} width={6} height={64} rx={3} fill="#2E2F42"/>
  <path d={rrect(SCR.x,SCR.y,SCR.w,SCR.h,26)} fill="#07050B"/>
  <g clipPath={`url(#${scr})`} opacity={v.screen}>
   <rect x={SCR.x} y={SCR.y} width={SCR.w} height={SCR.h} fill={`url(#${scr}-bg)`}/>
   {rows===1&&<g>
    <circle cx={-66} cy={-112} r={13} fill={C.yellow}/><rect x={-46} y={-120} width={70} height={7} rx={3.5} fill={C.ivory} opacity={.8}/><rect x={-46} y={-108} width={44} height={6} rx={3} fill={C.lavender} opacity={.5}/>
    {Array.from({length:12},(_,k)=><Thumb key={k} x={-84+(k%3)*58} y={-86+Math.floor(k/3)*58} s={52} seed={k+40} t={t} loop={loop}/>)}
    <rect x={SCR.x} y={170} width={SCR.w} height={70} fill="#120C1D" opacity={.9}/>
    <circle cx={0} cy={190} r={22+3*(.5+.5*wave(t,1.2,loop))*smooth(a,0,.3)} fill={C.yellow} opacity={.25}/><circle cx={0} cy={190} r={18} fill={C.yellow}/><path d="M -8 190 H 8 M 0 182 V 198" stroke={INK} strokeWidth={4} strokeLinecap="round"/>
    {[-64,-34,34,64].map(x=><rect key={x} x={x-8} y={184} width={16} height={12} rx={4} fill={C.lavender} opacity={.4}/>)}
   </g>}
   {rows===2&&<g>
    <rect x={SCR.x} y={SCR.y} width={SCR.w} height={SCR.h} fill={`url(#${scr}-vid)`}/>
    <circle cx={10} cy={-10} r={60} fill={C.yellow} opacity={.85}/>
    {[0,1,2].map(k=><path key={k} d={`M ${SCR.x} ${80+k*28} Q -40 ${66+k*28+6*wave(t,2.4,loop,k*.2)} 0 ${80+k*28} T ${SCR.x+SCR.w} ${80+k*28} V 260 H ${SCR.x} Z`} fill={["#5B3A94","#3A2264","#1D1628"][k]} opacity={.9}/>)}
    {[-40,10,60].map((y,k)=><g key={k}><circle cx={68} cy={y} r={12} fill="#FFFFFF" opacity={.3}/></g>)}
    <rect x={-80} y={150} width={110} height={7} rx={3.5} fill={C.ivory} opacity={.8}/><rect x={-80} y={164} width={70} height={6} rx={3} fill={C.ivory} opacity={.5}/>
    <rect x={SCR.x+10} y={220} width={SCR.w-20} height={4} rx={2} fill="#FFFFFF" opacity={.3}/><rect x={SCR.x+10} y={220} width={(SCR.w-20)*loopPhase(t,5,loop)} height={4} rx={2} fill={C.ivory}/>
    <circle cx={0} cy={40} r={26} fill="#000" opacity={.25}/><polygon points={pts([[-9,26],[-9,54],[15,40]])} fill={C.ivory} opacity={.85}/>
   </g>}
   {rows===3&&<g>
    <path d={rrect(-82,-128,164,40,20)} fill="#F3EBFD"/><circle cx={-60} cy={-110} r={9} fill="none" stroke={PURP.light} strokeWidth={3.5}/><line x1={-53} y1={-103} x2={-47} y2={-97} stroke={PURP.light} strokeWidth={4} strokeLinecap="round"/>
    {Array.from({length:7},(_,k)=><circle key={k} cx={-38+k*14} cy={-108} r={4.5} fill={C.purple} opacity={(k<dots?1:smooth(typed*7-k,0,1))*dotFade*(k<dots+1?1:0)}/>)}
    {Array.from({length:5},(_,k)=>{const y=-62+k*56,ap=smooth(a,.05*k,.05*k+.3);return <g key={k} opacity={.25+.75*ap}><rect x={-80} y={y} width={120} height={9} rx={4.5} fill={C.lavender}/><rect x={-80} y={y+16} width={160} height={6} rx={3} fill="#FFFFFF" opacity={.25}/><rect x={-80} y={y+28} width={130} height={6} rx={3} fill="#FFFFFF" opacity={.18}/></g>;})}
   </g>}
   <polygon points={pts([[SCR.x+SCR.w*.55,SCR.y],[SCR.x+SCR.w,SCR.y],[SCR.x+SCR.w,SCR.y+SCR.h*.2]])} fill="#FFFFFF" opacity={.06}/>
  </g>
  <rect x={-30} y={SCR.y+10} width={60} height={16} rx={8} fill="#000"/>
  {cards.map(c=>card(c.j,c.age))}
 </g>;
}

/* ───────────── kiss-couple ───────────── */
export function kissState(a:number){return {lean:smooth(a,.02,.5),eyes:smooth(a,.22,.5),heart:smooth(a,.25,.5),burn:smooth(a,.55,1)};}
/** Hip x and torso angle (deg) of the left person (the right one mirrors it): the lips meet at x≈0 when lean = 1. */
export function kissPose(lean:number){return {hip:lerp(-66,-52,lean),ang:lerp(0,9,lean),tilt:lerp(0,-9,lean),shift:lerp(0,2,lean)};}
const SEAT=110;
function Person({flip,lean,eyes,shirt,pants,hair,longHair,tone,reach}:{flip:number;lean:number;eyes:number;shirt:[string,string];pants:[string,string];hair:string;longHair:boolean;tone:[string,string];reach:number}){
 // flip 1 = sits on the left and faces right; -1 = mirrored. Torso, head and arms lean toward the partner.
 const P=kissPose(lean),x=flip*P.hip*-1*-1,X=flip>0?P.hip:-P.hip,ang=flip*P.ang,tilt=flip*P.tilt*(longHair?-1:1),hx=flip*P.shift,f=flip;
 const knees=[-16,16].map(d=>X+d);
 return <g>
  <g transform={`rotate(${f1(ang)} ${f1(X)} ${SEAT})`}>
   {longHair&&<g transform={`translate(${f1(hx)},0) rotate(${f1(tilt)} ${f1(X)} 4)`}><path d={`M ${X+f*6} -58 Q ${X-f*44} -56 ${X-f*46} -14 Q ${X-f*48} 30 ${X-f*30} 46 Q ${X-f*14} 26 ${X-f*10} -6 Z`} fill={hair}/><path d={`M ${X-f*30} -40 Q ${X-f*40} 0 ${X-f*30} 36`} stroke="#FFFFFF" strokeOpacity={.12} strokeWidth={4} fill="none"/></g>}
   <polygon points={pts([[X-30,SEAT+2],[X+30,SEAT+2],[X+35,26],[X+22,10],[X-22,10],[X-35,26]])} fill={shirt[1]}/>
   <polygon points={pts([[X-30,SEAT+2],[X-f*2,SEAT+2],[X-4,10],[X-22,10],[X-35,26]])} fill={shirt[0]}/>
   <path d={`M ${X-14} 12 Q ${X} 22 ${X+14} 12`} stroke={mix(shirt[1],"#000000",.3)} strokeWidth={4} fill="none"/>
   <rect x={X-8} y={-4} width={16} height={18} fill={tone[1]}/>
   <g transform={`translate(${f1(hx)},0) rotate(${f1(tilt)} ${f1(X)} 4)`}>
    <circle cx={X} cy={-30} r={30} fill={tone[0]}/>
    <polygon points={pts([[X+f*22,-50],[X+f*29,-38],[X+f*31,-33],[X+f*40,-24],[X+f*31,-20],[X+f*32,-14],[X+f*29,-11],[X+f*31,-7],[X+f*26,1],[X+f*12,5],[X-f*4,-2],[X-f*6,-30]])} fill={tone[0]}/>
    <polygon points={pts([[X+f*31,-33],[X+f*40,-24],[X+f*31,-20]])} fill={mix(tone[0],"#FFFFFF",.15)}/>
    <polygon points={pts([[X-f*30,-30],[X-f*6,-30],[X-f*4,-2],[X+f*12,5],[X-f*4,6],[X-f*22,-8]])} fill={tone[1]} opacity={.45}/>
    <path d={`M ${X+f*30} -15 Q ${X+f*34} -13 ${X+f*30} -11 Q ${X+f*33} -9 ${X+f*30} -6 Q ${X+f*27} -10 ${X+f*30} -15 Z`} fill="#C2526A"/>
    <ellipse cx={X-f*9} cy={-24} rx={5.5} ry={8} fill={mix(tone[0],tone[1],.6)}/><path d={`M ${X-f*7} -29 Q ${X-f*11} -24 ${X-f*7} -19`} stroke={tone[1]} strokeWidth={1.6} fill="none"/>
    {longHair?<path d={`M ${X-f*33} -24 Q ${X-f*32} -66 ${X+f*8} -62 Q ${X+f*32} -58 ${X+f*31} -38 Q ${X+f*8} -50 ${X-f*10} -38 Q ${X-f*20} -28 ${X-f*33} -24 Z`} fill={hair}/>
     :<path d={`M ${X-f*33} -22 Q ${X-f*34} -64 ${X+f*6} -62 Q ${X+f*30} -60 ${X+f*31} -44 Q ${X+f*12} -48 ${X-f*2} -42 Q ${X-f*14} -38 ${X-f*16} -20 Z`} fill={hair}/>}
    <path d={`M ${X-f*22} -50 Q ${X-f*8} -62 ${X+f*10} -58`} stroke="#FFFFFF" strokeOpacity={.2} strokeWidth={4} fill="none" strokeLinecap="round"/>
    <g opacity={1-eyes}><ellipse cx={X+f*17} cy={-30} rx={3.2} ry={4.2} fill="#2A160E"/><circle cx={X+f*16} cy={-31.5} r={1.3} fill="#FFFFFF"/></g>
    <path d={`M ${X+f*13} -29 Q ${X+f*17} -26 ${X+f*21} -29`} stroke="#2A160E" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={eyes}/>
    <path d={`M ${X+f*12} -39 Q ${X+f*18} -42 ${X+f*24} -39`} stroke={mix(hair,"#000000",.2)} strokeWidth={2.6} fill="none" strokeLinecap="round"/>
    <circle cx={X+f*16} cy={-16} r={6.5} fill={C.pink} opacity={.16+.3*lean}/>
   </g>
   {reach<=.01&&<polyline points={pts([[X-f*26,26],[X-f*32,72],[X+f*6,96]])} fill="none" stroke={shirt[f>0?0:1]} strokeWidth={19} strokeLinecap="round" strokeLinejoin="round"/>}
   {reach<=.01&&<circle cx={X+f*10} cy={98} r={8} fill={tone[0]}/>}
   {reach>.01&&<g><polyline points={pts([[X+f*20,28],[X+f*lerp(30,48,reach),lerp(74,40,reach)],[X+f*lerp(12,52,reach),lerp(98,4,reach)]])} fill="none" stroke={shirt[0]} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={X+f*lerp(12,54,reach)} cy={lerp(100,2,reach)} r={8} fill={tone[0]}/></g>}
  </g>
  <ellipse cx={X} cy={SEAT+8} rx={38} ry={16} fill={pants[0]}/>
  {knees.map((kx,k)=><g key={k}>
   <polygon points={pts([[kx-11,SEAT+20],[kx+11,SEAT+20],[kx+9+f*2,222],[kx-9+f*2,222]])} fill={k?pants[1]:pants[0]}/>
   <ellipse cx={kx} cy={SEAT+20} rx={16} ry={11} fill={pants[0]}/><ellipse cx={kx-3} cy={SEAT+17} rx={8} ry={5} fill="#FFFFFF" opacity={.1}/>
   <ellipse cx={kx+f*4} cy={226} rx={15} ry={7} fill={k?"#D9D2E6":C.ivory}/><rect x={kx-12+f*4} y={226} width={24} height={4} rx={2} fill={METAL.hi}/>
  </g>)}
 </g>;
}
function KissCouple({t,a,uid,loop}:{t:number;a:number;uid:string;loop?:number}){
 const v=kissState(a),lampFl=.93+.07*wave(t,3.3,loop),lean=v.lean;
 const flies=Array.from({length:14},(_,k)=>{const bx=-320+hash(k*3.1)*640,byy=-260+hash(k*5.7)*340,x=bx+26*wave(t,6+2*hash(k),loop,hash(k*2.2)),y=byy+18*wave(t,4.4+1.6*hash(k*1.3),loop,hash(k*4.4)),g=Math.pow(.5+.5*wave(t,1.8+hash(k*9)*1.4,loop,hash(k*7.3)),3);return {x,y,g};});
 const hearts=Array.from({length:9},(_,k)=>{const u=(loopPhase(t,3.4,loop)+k/9)%1,side=k%2?1:-1,x=side*(70+150*hash(k*2.9))+16*Math.sin(TAU*(u+hash(k))),y=60-330*u;return {k,x,y,o:win(u,0,.12,.7,.95),r:10+8*hash(k*4.1)};});
 const stones=[[-236,272],[-170,282],[-96,288],[-20,290],[56,288],[130,280],[200,268]];
 return <g>
  <defs><radialGradient id={`kl-${uid}`}><stop offset="0" stopColor="#FFF1C2" stopOpacity=".8"/><stop offset=".3" stopColor={C.yellow} stopOpacity=".25"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient>
   <linearGradient id={`kc-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.yellow} stopOpacity=".2"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></linearGradient>
   <radialGradient id={`kb-${uid}`}><stop offset="0" stopColor="#FFB060" stopOpacity=".55"/><stop offset=".6" stopColor="#E2563A" stopOpacity=".2"/><stop offset="1" stopColor="#E2563A" stopOpacity="0"/></radialGradient>
   <radialGradient id={`ff-${uid}`}><stop offset="0" stopColor={C.yellowLine} stopOpacity=".9"/><stop offset="1" stopColor={C.yellowLine} stopOpacity="0"/></radialGradient></defs>
  <Island y={236} rx={346} ry={56} h={18} depth={54} t={t} loop={loop} uid={uid} top="#2F6B4A" topDark="#1E4A36" rim={["#6A4A2E","#3A2416"]} glow={mix(C.lavender,"#FFB060",v.burn)} k={v.burn} seed={11}/>
  <ellipse cx={-30} cy={240} rx={300} ry={42} fill="#3F8A5C" opacity={.55}/>
  {Array.from({length:26},(_,k)=>{const x=-320+hash(k*2.7)*640,y=200+hash(k*5.3)*70;if(((x/340)**2+((y-236)/56)**2)>.85)return null;return <polygon key={k} points={pts([[x-4,y],[x-1,y-11],[x+1,y],[x+3,y-8],[x+5,y]])} fill={k%2?"#4C9A6A":"#65B07A"} opacity={.8}/>;})}
  {stones.map(([x,y],k)=><g key={k}><ellipse cx={x} cy={y+3} rx={27} ry={8} fill="#1E3A2A"/><ellipse cx={x} cy={y} rx={27} ry={8} fill="#8C8AA2"/><ellipse cx={x-6} cy={y-2} rx={14} ry={4} fill="#B9B6D2" opacity={.6}/></g>)}
  {/* tree */}
  <polygon points={pts([[262,240],[296,240],[286,-40],[276,-40]])} fill="#4A3020"/><polygon points={pts([[262,240],[279,240],[278,-40],[276,-40]])} fill="#6A4A30"/>
  <polyline points={pts([[280,40],[230,-40]])} stroke="#4A3020" strokeWidth={10} strokeLinecap="round"/>
  {[[236,-150,92,0],[312,-110,62,1],[292,-228,72,2],[200,-70,56,3]].map(([cx,cy,r,sd])=>{const Q=Array.from({length:8},(_,k)=>{const an=k/8*TAU+sd;return [cx+Math.cos(an)*r*(1+.08*Math.sin(k*2.1+sd)),cy+Math.sin(an)*r*.92];});
   return <g key={sd}>{Q.map((p,k)=>{const q=Q[(k+1)%Q.length],l=clamp01(.5-.5*Math.cos(Math.atan2((p[1]+q[1])/2-cy,(p[0]+q[0])/2-cx)+135*D)),c=mix("#1E4A36","#4C9A6A",l*.9+.05*sd);return <polygon key={k} points={pts([[cx,cy],p,q])} fill={c} stroke={c} strokeWidth={.6}/>;})}</g>;})}
  {[[-330,232,34],[-292,240,26],[330,236,30]].map(([x,y,r],k)=><g key={k}><ellipse cx={x} cy={y-r*.4} rx={r} ry={r*.75} fill="#2F6B4A"/><ellipse cx={x-r*.3} cy={y-r*.6} rx={r*.55} ry={r*.45} fill="#4C9A6A"/></g>)}
  {/* street lamp */}
  <ellipse cx={-160} cy={246} rx={200} ry={30} fill={C.yellow} opacity={.13*lampFl}/>
  <polygon points={pts([[-282,-232],[-242,-232],[-40,236],[-300,236]])} fill={`url(#kc-${uid})`} opacity={lampFl}/>
  <ellipse cx={-262} cy={-252} rx={112} ry={66} fill={`url(#kl-${uid})`} opacity={lampFl}/>
  <rect x={-268} y={-232} width={12} height={472} fill="#2A2238"/><rect x={-268} y={-232} width={4} height={472} fill="#4E4F62"/>
  <path d={rrect(-278,226,32,16,4)} fill="#2A2238"/>
  <polygon points={pts([[-284,-282],[-240,-282],[-246,-236],[-278,-236]])} fill="#FFE7A0" opacity={.95*lampFl}/>
  <polygon points={pts([[-284,-282],[-262,-282],[-264,-236],[-278,-236]])} fill="#FFF7D6" opacity={.6}/>
  <polygon points={pts([[-292,-282],[-232,-282],[-262,-300]])} fill="#2A2238"/><rect x={-282} y={-238} width={40} height={6} rx={2} fill="#2A2238"/>
  {[-270,-262,-254].map(x=><line key={x} x1={x} y1={-282} x2={x} y2={-236} stroke="#2A2238" strokeWidth={1.5} opacity={.5}/>)}
  {/* heat aura and big flames behind the couple */}
  {v.burn>.003&&(()=>{const g=.3+.7*v.burn;return <g opacity={smooth(v.burn,0,.35)}>
   <ellipse cx={0} cy={-30} rx={250} ry={250} fill={`url(#kb-${uid})`} opacity={v.burn}/>
   <g transform="rotate(-14 -110 104)"><Flame x={-110} y={104} s={210*g} t={t} loop={loop} seed={21} uid={`${uid}-k1`}/></g>
   <g transform="rotate(14 110 104)"><Flame x={110} y={104} s={220*g} t={t} loop={loop} seed={22} uid={`${uid}-k2`}/></g>
   <Flame x={0} y={100} s={320*g} t={t} loop={loop} seed={25} uid={`${uid}-k5`}/>
  </g>;})()}
  {/* bench: back slats, then the couple, then the seat edge they sit on */}
  {[0,1].map(k=><Quad key={k} p={[[-176,32+k*28],[176,32+k*28],[176,52+k*28],[-176,52+k*28]]} light="#B07A3A" dark="#7A5226"/>)}
  {[-120,120].map(x=><rect key={x} x={x-5} y={30} width={10} height={80} fill="#2A2238"/>)}
  <polygon points={pts([[-182,SEAT+2],[182,SEAT+2],[188,SEAT-8],[-176,SEAT-8]])} fill="#D9A060"/>
  <Person flip={1} lean={lean} eyes={v.eyes} shirt={["#9C80CC","#6B4FA0"]} pants={["#3B3F6E","#2E3260"]} hair="#2A1A12" longHair={false} tone={["#D9A07A","#A86E4C"]} reach={0}/>
  <Person flip={-1} lean={lean} eyes={v.eyes} shirt={["#F07A8E","#B4407A"]} pants={["#4A3F7A","#3A2F66"]} hair="#6A2A1E" longHair tone={["#F2C29C","#C98E68"]} reach={lean}/>
  <Quad p={[[-182,SEAT+2],[182,SEAT+2],[176,SEAT+20],[-176,SEAT+20]]} light="#C98E4A" dark="#8A5A2A"/>
  {[-1,1].map(s=><g key={s}><path d={`M ${s*172} 30 Q ${s*196} 72 ${s*178} ${SEAT+2} L ${s*186} 236 L ${s*170} 236 L ${s*164} ${SEAT+6}`} fill="none" stroke="#2A2238" strokeWidth={10} strokeLinejoin="round"/><path d={`M ${s*166} ${SEAT-12} Q ${s*200} ${SEAT-20} ${s*192} ${SEAT+6}`} stroke="#2A2238" strokeWidth={8} fill="none" strokeLinecap="round"/></g>)}
  {v.heart>.003&&(()=>{const u=loopPhase(t,2.6,loop);return <g>
   <FacetHeart x={0} y={-104-6*wave(t,2.6,loop)} r={20*v.heart} light={C.pink} dark={PINK.dark} k={v.heart*(1-.6*v.burn)}/>
   {[0,1].map(q=>{const w=(u+q/2)%1;return <FacetHeart key={q} x={(q?14:-14)+8*Math.sin(TAU*w)} y={-122-120*w} r={9} light={PINK.soft} dark="#C25A80" k={v.heart*win(w,0,.15,.6,.95)}/>;})}
  </g>;})()}
  {v.burn>.003&&<g opacity={v.burn}>
   {hearts.map(h=>h.o>.004&&<FacetHeart key={h.k} x={h.x} y={h.y} r={h.r} light={h.k%3?C.pink:PINK.soft} dark={PINK.dark} k={h.o}/>)}
   {[0,1,2,3,4].map(k=>{const u=(loopPhase(t,2.2,loop)+k/5)%1,x=-120+k*60,y0=10-160*u;return <path key={k} d={`M ${x} ${f1(y0)} q 10 -14 0 -28 q -10 -14 0 -28`} stroke="#FFD27A" strokeOpacity={.35*Math.sin(Math.PI*u)} strokeWidth={3} fill="none" strokeLinecap="round"/>;})}
  </g>}
  {flies.map((f,k)=><g key={k}><circle cx={f.x} cy={f.y} r={12} fill={`url(#ff-${uid})`} opacity={.6*f.g}/><circle cx={f.x} cy={f.y} r={2.4} fill={C.yellowLine} opacity={.4+.6*f.g}/></g>)}
 </g>;
}

export function MinuteArt({kind,o,t,a,uid,overlay,loop,stackMax}:MinuteArtProps){
 if(overlay)return null;
 switch(kind as MinuteKind){
  case "maternity-ward":return <MaternityWard t={t} a={a} uid={uid} loop={loop}/>;
  case "viewer":return <Viewer t={t} a={a} o={o} uid={uid} loop={loop}/>;
  case "counter":return <Counter t={t} a={a} o={o} uid={uid} loop={loop}/>;
  case "money-stack":return <MoneyStack t={t} a={a} o={o} uid={uid} loop={loop} stackMax={stackMax}/>;
  case "minute-earth":return <MinuteEarth t={t} a={a} o={o} uid={uid} loop={loop}/>;
  case "upload-phone":return <UploadPhone t={t} a={a} o={o} uid={uid} loop={loop}/>;
  case "kiss-couple":return <KissCouple t={t} a={a} uid={uid} loop={loop}/>;
 }
 return null;
}
