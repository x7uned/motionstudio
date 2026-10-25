import React from "react";
import brand from "../video-design/brand.json";
import {keyed,easeSine,type IllustratedTimeline} from "../src/lib/illustrated";
import {SHAZAM_KEY_SECONDS,type ShazamKind} from "../src/lib/illustrated-catalog-shazam";

// Prepared objects for the "how Shazam knows a song from a few seconds of noise" explainer (2026-10-22).
// Illustrations, not to scale: the spectrogram is drawn from a small made-up melody (notes, bass, drums, bar noise),
// its peaks are the true local maxima of that model, and pairs/fingerprints/offsets follow the method described by
// Avery Wang (2003) only schematically. No letters, numbers or logos inside the objects. Every value derives from
// the frame time and the keyed state; no randomness.
const C=brand.colors;
export type TimedObject=IllustratedTimeline["objects"][number];
export type ShazamArtProps={kind:string;o:TimedObject;t:number;a:number;xray:number;uid:string;overlay?:boolean};
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
const D=Math.PI/180;
type Keyed={activeKeys?:{at:number;value:number}[];enterAt?:number};
const INK="#120C1D";
const METAL={hi:"#7C7A92",top:"#666882",mid:"#4E4F62",lo:"#3A3B4C",dark:"#26273A",deep:"#1D1628"};
const YEL={light:C.yellow,dark:"#C99A2E",top:C.yellowLine};
const LAV={light:C.lavender,dark:"#A68BD0",top:"#F3EBFD"};
const PINK={light:C.pink,dark:"#8E1C38"};
const GRN={light:C.green,dark:"#3F9A28"};
const PURP={light:C.purple,dark:"#5B3A94",deep:"#3A2264"};
/** Rounded rectangle path. */
const rrect=(x:number,y:number,w:number,h:number,r:number)=>{const q=Math.max(0,Math.min(r,w/2,h/2));
 return `M${f1(x+q)} ${f1(y)}H${f1(x+w-q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+w)} ${f1(y+q)}V${f1(y+h-q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+w-q)} ${f1(y+h)}H${f1(x+q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x)} ${f1(y+h-q)}V${f1(y+q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+q)} ${f1(y)}Z`;};
/** Seconds-based pulse that never jumps: 0..1, peaky, period p. */
const pulse=(t:number,p:number,sharp=4,phase=0)=>Math.pow(.5+.5*Math.cos(2*Math.PI*(t/p+phase)),sharp);

/* ───────────── Shared drawing helpers ───────────── */
function Shadow({w,y,k=1}:{w:number;y:number;k?:number}){return <ellipse cx={0} cy={y} rx={w*.5} ry={Math.min(16,Math.max(7,w*.034))} fill="#000" opacity={.45*k}/>;}
/** Quad (TL, TR, BR, BL) in two tones split along the TR–BL diagonal: light from the top left. */
function Quad({p,light,dark}:{p:number[][];light:string;dark:string}){
 return <><polygon points={pts([p[0],p[1],p[3]])} fill={light} stroke={light} strokeWidth={.7} strokeLinejoin="round"/><polygon points={pts([p[1],p[2],p[3]])} fill={dark} stroke={dark} strokeWidth={.7} strokeLinejoin="round"/></>;
}
/** Extruded polygon (front face clockwise on screen) whose depth runs up-right. */
function Prism({poly,d,face,top,side}:{poly:number[][];d:[number,number];face:string;top:string;side:string}){
 const walls=poly.map((p,i)=>{const q=poly[(i+1)%poly.length],ex=q[0]-p[0],ey=q[1]-p[1],len=Math.hypot(ex,ey)||1,nx=ey/len,ny=-ex/len;
  if(nx*d[0]+ny*d[1]<=.01)return null;const c=mix(side,top,clamp01(-ny*1.2));
  return <polygon key={i} points={pts([p,q,[q[0]+d[0],q[1]+d[1]],[p[0]+d[0],p[1]+d[1]]])} fill={c} stroke={c} strokeWidth={.7} strokeLinejoin="round"/>;});
 return <>{walls}<polygon points={pts(poly)} fill={face}/></>;
}
/** Box: front rectangle with its top and right faces. */
function Box({x,y,w,h,d,front,top,side}:{x:number;y:number;w:number;h:number;d:[number,number];front:{light:string;dark:string};top:string;side:string}){
 return <>
  <polygon points={pts([[x,y],[x+w,y],[x+w+d[0],y+d[1]],[x+d[0],y+d[1]]])} fill={top} stroke={top} strokeWidth={.7}/>
  <polygon points={pts([[x+w,y],[x+w,y+h],[x+w+d[0],y+h+d[1]],[x+w+d[0],y+d[1]]])} fill={side} stroke={side} strokeWidth={.7}/>
  <Quad p={[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]} light={front.light} dark={front.dark}/>
 </>;
}
function Check({x,y,k,r=30}:{x:number;y:number;k:number;r?:number}){
 if(k<=.003)return null;
 return <g opacity={clamp01(k*1.6)} transform={`translate(${f1(x)},${f1(y)}) scale(${(.55+.45*k).toFixed(3)})`}>
  <circle r={r*1.3} fill={C.green} opacity={.2}/><circle r={r} fill={C.green}/>
  <path d={`M ${r} 0 A ${r} ${r} 0 0 1 ${-r*.7} ${r*.7}`} fill="none" stroke={GRN.dark} strokeWidth={r*.16} opacity={.6}/>
  <polyline points={pts([[-r*.44,r*.02],[-r*.1,r*.34],[r*.46,-r*.3]])} stroke={INK} strokeWidth={r*.21} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
 </g>;
}
/** Four-point faceted star (a spectrogram peak): eight facets lit from the top left. */
function Spark({x,y,r,light,dark,k=1}:{x:number;y:number;r:number;light:string;dark:string;k?:number}){
 if(k<=.003||r<=.2)return null;
 const out=[0,1,2,3].map(i=>[x+Math.cos((i*90-90)*D)*r,y+Math.sin((i*90-90)*D)*r]),inn=[0,1,2,3].map(i=>[x+Math.cos((i*90-45)*D)*r*.3,y+Math.sin((i*90-45)*D)*r*.3]);
 const c=[x,y],hi=mix(light,"#FFFFFF",.45);
 return <g opacity={k}>
  {[0,1,2,3].map(i=>{const o=out[i],prev=inn[(i+3)%4],next=inn[i];const lit=i===0||i===3;
   return <React.Fragment key={i}><polygon points={pts([c,prev,o])} fill={lit?hi:mix(light,dark,.35)}/><polygon points={pts([c,o,next])} fill={lit?light:dark}/></React.Fragment>;})}
 </g>;
}
/** Dark display board on two splayed legs, standing on the floor at y=floor. */
function Board({x0,y0,x1,y1,floor,inset=18}:{x0:number;y0:number;x1:number;y1:number;floor:number;inset?:number}){
 const legs=[x0+90,x1-90];
 return <>
  <Shadow w={(x1-x0)*.9} y={floor-16}/>
  {legs.map((lx,i)=>{const s=i?1:-1;return <g key={i}><polygon points={pts([[lx-9,y1-4],[lx+9,y1-4],[lx+s*16+10,floor-8],[lx+s*16-12,floor-8]])} fill={i?METAL.lo:METAL.mid}/>
   <rect x={lx+s*16-20} y={floor-12} width={40} height={9} rx={4} fill={METAL.dark}/></g>;})}
  <Prism poly={[[x0,y0],[x1,y0],[x1,y1],[x0,y1]]} d={[12,-10]} face={METAL.lo} top={METAL.hi} side={METAL.dark}/>
  <Quad p={[[x0,y0],[x1,y0],[x1,y1],[x0,y1]]} light="#4A4060" dark="#2E2742"/>
  <rect x={x0+inset} y={y0+inset} width={x1-x0-2*inset} height={y1-y0-2*inset} rx={10} fill="#0E0A18"/>
  <polygon points={pts([[x0+inset,y0+inset],[x0+inset+190,y0+inset],[x0+inset,y0+inset+190]])} fill="#FFFFFF" opacity={.025}/>
 </>;
}
/** Generic album art (no letters, no logo): a retro sunset over faceted mountains and water. */
function CoverArt({x,y,s,t,uid,k=1}:{x:number;y:number;s:number;t:number;uid:string;k?:number}){
 const id=`cv-${uid}`,u=s/100;
 const mts=[[[0,72],[18,48],[34,66],[52,40],[70,62],[86,46],[100,60],[100,74],[0,74]]];
 return <g opacity={k}>
  <defs><clipPath id={id}><path d={rrect(x,y,s,s,u*7)}/></clipPath>
   <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1D1628"/><stop offset=".45" stopColor="#5B3A94"/><stop offset=".72" stopColor="#B4407A"/></linearGradient></defs>
  <g clipPath={`url(#${id})`}>
   <rect x={x} y={y} width={s} height={s} fill={`url(#${id}-sky)`}/>
   {[[12,14],[26,8],[64,12],[82,22],[44,20],[90,9]].map(([sx,sy],i)=><circle key={i} cx={x+sx*u} cy={y+sy*u} r={u*.9} fill={C.ivory} opacity={.35+.35*Math.sin(t*1.7+i*2.1)}/>)}
   <circle cx={x+50*u} cy={y+50*u} r={22*u} fill={C.yellow}/>
   <circle cx={x+50*u} cy={y+50*u} r={22*u} fill={C.yellowLine} opacity={.35} clipPath={`url(#${id})`}/>
   {[0,1,2,3].map(i=><rect key={i} x={x+26*u} y={y+(52+i*4.6)*u} width={48*u} height={(1.2+i*.55)*u} fill="#B4407A"/>)}
   {mts.map((m,j)=><g key={j}>{m.slice(0,-2).map((p,i)=>{const q=m[i+1];if(!q||i>=m.length-3)return null;const up=q[1]<p[1];
    return <polygon key={i} points={pts([[x+p[0]*u,y+p[1]*u],[x+q[0]*u,y+q[1]*u],[x+q[0]*u,y+74*u],[x+p[0]*u,y+74*u]])} fill={up?"#A68BD0":"#6B4FA0"}/>;})}</g>)}
   <polygon points={pts([[x,y+72*u],[x+18*u,y+48*u],[x+34*u,y+66*u],[x+52*u,y+40*u],[x+70*u,y+62*u],[x+86*u,y+46*u],[x+s,y+60*u],[x+s,y+74*u],[x,y+74*u]])} fill="#3A2264" opacity={.35}/>
   <rect x={x} y={y+74*u} width={s} height={26*u} fill="#1D1628"/>
   {[0,1,2,3,4].map(i=>{const w=(18-i*3)*u,yy=y+(78+i*4.4)*u,dx=Math.sin(t*1.1+i)*2*u;return <rect key={i} x={x+50*u-w/2+dx} y={yy} width={w} height={1.4*u} rx={.7*u} fill={C.yellow} opacity={.75-i*.11}/>;})}
   <polygon points={pts([[x,y],[x+s*.5,y],[x,y+s*.42]])} fill="#FFFFFF" opacity={.05}/>
  </g>
  <path d={rrect(x,y,s,s,u*7)} fill="none" stroke={C.lavender} strokeOpacity={.35} strokeWidth={Math.max(1.5,u*.8)}/>
 </g>;
}
/** Small generic sleeve art for the database shelves: seeded geometry in the palette, no words. */
function MiniCover({x,y,s,seed}:{x:number;y:number;s:number;seed:number}){
 const bgs=[["#5B3A94","#3A2264"],["#2A1B4A","#120C1D"],["#8E1C38","#5A1024"],["#3A3B4C","#26273A"],["#7A64A6","#4E3D74"],["#C99A2E","#8A6418"]];
 const fgs=[C.yellow,C.lavender,C.pink,C.ivory,C.green,C.purple];
 const b=bgs[Math.floor(hash(seed*3.3)*bgs.length)],fg=fgs[Math.floor(hash(seed*5.9)*fgs.length)],kind=Math.floor(hash(seed*7.7)*6),u=s/10;
 const cx=x+s/2,cy=y+s/2;
 const shape=kind===0?<circle cx={cx} cy={cy} r={u*2.8} fill={fg}/>:
  kind===1?<polygon points={pts([[x+u*1.5,y+u*8],[cx,y+u*2],[x+u*8.5,y+u*8]])} fill={fg}/>:
  kind===2?<>{[0,1,2].map(i=><rect key={i} x={x+u*1.5} y={y+u*(2.4+i*2)} width={u*7} height={u*1.1} fill={fg} opacity={1-i*.25}/>)}</>:
  kind===3?<polygon points={pts([[cx,y+u*1.8],[x+u*8.2,cy],[cx,y+u*8.2],[x+u*1.8,cy]])} fill={fg}/>:
  kind===4?<>{[3.4,2.2,1].map((r,i)=><circle key={i} cx={cx} cy={cy} r={u*r} fill="none" stroke={fg} strokeWidth={u*.6} opacity={1-i*.2}/>)}</>:
  <path d={`M ${x+u*1.5} ${cy+u*1.5} A ${u*3.5} ${u*3.5} 0 0 1 ${x+u*8.5} ${cy+u*1.5} Z`} fill={fg}/>;
 return <g>
  <Quad p={[[x,y],[x+s,y],[x+s,y+s],[x,y+s]]} light={b[0]} dark={b[1]}/>
  {shape}
  <polygon points={pts([[x,y],[x+s*.55,y],[x,y+s*.5]])} fill="#FFFFFF" opacity={.06}/>
 </g>;
}
/** Round faceted podium (top centre at y) with a rim light; objects hover above it. */
function Podium({y,rx,ry,h,glow,k=0}:{y:number;rx:number;ry:number;h:number;glow:string;k?:number}){
 const n=18,arc=(yy:number)=>Array.from({length:n+1},(_,i)=>{const an=Math.PI*i/n;return [Math.cos(an)*rx,yy+Math.sin(an)*ry];});
 const top=arc(y),bot=arc(y+h);
 return <g>
  {top.slice(0,-1).map((p,i)=>{const q=top[i+1],an=Math.PI*(i+.5)/n,lit=clamp01(.5-.5*Math.cos(an));const c=mix(METAL.lo,METAL.top,lit);
   return <polygon key={i} points={pts([p,q,bot[i+1],bot[i]])} fill={c} stroke={c} strokeWidth={.6}/>;})}
  <ellipse cx={0} cy={y} rx={rx} ry={ry} fill={METAL.hi}/>
  <ellipse cx={-rx*.12} cy={y-ry*.1} rx={rx*.82} ry={ry*.72} fill="#8C8AA2" opacity={.5}/>
  <ellipse cx={0} cy={y} rx={rx*.62} ry={ry*.55} fill={glow} opacity={.18+.5*k}/>
  <ellipse cx={0} cy={y} rx={rx} ry={ry} fill="none" stroke={glow} strokeOpacity={.35+.5*k} strokeWidth={3}/>
 </g>;
}
/** Microphone glyph (capsule, cradle, stem). */
function Mic({x,y,s,color}:{x:number;y:number;s:number;color:string}){
 return <g transform={`translate(${f1(x)},${f1(y)}) scale(${s})`}>
  <rect x={-9} y={-24} width={18} height={30} rx={9} fill={color}/>
  {[-14,-8,-2].map(yy=><rect key={yy} x={-9} y={yy} width={18} height={2.2} fill={INK} opacity={.25}/>)}
  <path d="M -15 -2 A 15 15 0 0 0 15 -2" fill="none" stroke={color} strokeWidth={3.6} strokeLinecap="round"/>
  <rect x={-1.8} y={12} width={3.6} height={8} fill={color}/><rect x={-8} y={19} width={16} height={3.6} rx={1.8} fill={color}/>
 </g>;
}
/** Integral of a keyed speed over time, from when the object enters (1/30 s steps): stops never jump. */
export function integrate(t:number,o:Keyed,kind:ShazamKind,speed:(a:number)=>number){
 const keys=o.activeKeys??[],dur=SHAZAM_KEY_SECONDS[kind],start=Math.min(t,o.enterAt??0),dt=1/30;let x=0;
 for(let s=start;s<t-1e-9;s+=dt){const h=Math.min(dt,t-s);x+=speed(keyed(s+h/2,keys,0,dur,easeSine))*h;}
 return x;
}

/* ───────────── listen-phone ───────────── */
export function phoneState(a:number){return {on:smooth(a,.03,.22),listen:win(a,.1,.3,.44,.62),think:win(a,.44,.62,.8,.98),found:smooth(a,.8,1)};}
const PH={x:-112,y:-262,w:224,h:420},SC={x:-100,y:-246,w:200,h:356},MIC=[0,134];
/** Sound rings converging on the microphone: k-th ring radius and opacity at time t (loops fade at both ends). */
export function ringAt(t:number,k:number,n=6){const u=((t*.5+k/n)%1+1)%1;return {r:118+92*(1-u),o:Math.sin(Math.PI*u)};}
function ListenPhone({t,a,uid}:{t:number;a:number;uid:string}){
 const v=phoneState(a),scr=`ph-${uid}`,cx=0,cy=-104;
 const rings=Array.from({length:6},(_,k)=>{const {r,o}=ringAt(t,k),noise=k%2===1,op=o*v.listen;if(op<=.004)return null;
  const arc=(a0:number,a1:number)=>{const n=noise?28:16,p=Array.from({length:n+1},(_,i)=>{const an=(a0+(a1-a0)*i/n)*D,rr=r+(noise?(i%2?4.5:-4.5):0);return [MIC[0]+Math.cos(an)*rr,MIC[1]+Math.sin(an)*rr];});return p;};
  const col=noise?C.pink:C.yellow;
  return <g key={k} opacity={op*(noise?.75:.9)}>{[arc(146,214),arc(-34,34)].map((p,j)=><g key={j}><polyline points={pts(p)} fill="none" stroke={col} strokeWidth={12} strokeOpacity={.18} strokeLinecap="round" strokeLinejoin="round"/>
   <polyline points={pts(p)} fill="none" stroke={col} strokeWidth={noise?3.5:5} strokeLinecap="round" strokeLinejoin="round"/></g>)}</g>;});
 const bars=Array.from({length:11},(_,i)=>{const h=6+38*v.listen*Math.abs(Math.sin(t*6.1+i*1.7)*Math.sin(t*2.3+i*.9+1));return <rect key={i} x={-78+i*15-4} y={18-h/2} width={8} height={h} rx={4} fill={i%3===1?C.pink:C.yellow} opacity={.25+.75*v.listen}/>;});
 const btnR=60*(1-.28*v.think),btnO=v.on*(1-v.found);
 return <g>
  <defs><clipPath id={scr}><path d={rrect(SC.x,SC.y,SC.w,SC.h,26)}/></clipPath>
   <linearGradient id={`${scr}-bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A2142"/><stop offset=".6" stopColor="#1C1630"/><stop offset="1" stopColor="#120C1D"/></linearGradient>
   <radialGradient id={`${scr}-btn`} cx=".38" cy=".32"><stop offset="0" stopColor="#B48CF2"/><stop offset=".6" stopColor={C.purple}/><stop offset="1" stopColor="#4B2C80"/></radialGradient></defs>
  <Shadow w={260} y={252}/>
  {rings}
  <path d={rrect(PH.x,PH.y,PH.w,PH.h,36)} fill="#45465A"/>
  <path d={`M ${PH.x+PH.w} ${PH.y+36} V ${PH.y+PH.h-36} A 36 36 0 0 1 ${PH.x+PH.w-36} ${PH.y+PH.h} H ${PH.x+36} Z`} fill="#26273A"/>
  <path d={rrect(PH.x,PH.y,PH.w,PH.h,36)} fill="none" stroke={C.purpleStroke} strokeOpacity={.55} strokeWidth={3}/>
  <rect x={PH.x-5} y={PH.y+96} width={6} height={44} rx={3} fill="#5E5F74"/><rect x={PH.x-5} y={PH.y+150} width={6} height={64} rx={3} fill="#5E5F74"/><rect x={PH.x+PH.w-1} y={PH.y+120} width={6} height={70} rx={3} fill="#2E2F42"/>
  <path d={rrect(SC.x,SC.y,SC.w,SC.h,26)} fill="#07050B"/>
  <g clipPath={`url(#${scr})`}>
   <g opacity={v.on}>
    <rect x={SC.x} y={SC.y} width={SC.w} height={SC.h} fill={`url(#${scr}-bg)`}/>
    {[0,1,2].map(i=><rect key={i} x={SC.x+20+i*12} y={SC.y+16} width={8} height={4+i*2} rx={2} y2={0} fill={C.lavender} opacity={.5}/>)}
    <rect x={SC.x+SC.w-44} y={SC.y+15} width={24} height={9} rx={3} fill="none" stroke={C.lavender} strokeOpacity={.5} strokeWidth={2}/>
    <rect x={SC.x+SC.w-42} y={SC.y+17} width={14} height={5} rx={1.5} fill={C.lavender} opacity={.5}/>
   </g>
   {btnO>.003&&<g opacity={btnO}>
    {[0,1,2].map(k=>{const u=((t*.7+k/3)%1+1)%1,o=v.listen*Math.sin(Math.PI*u);return o>.004&&<circle key={k} cx={cx} cy={cy} r={btnR+8+70*u} fill="none" stroke={C.lavender} strokeWidth={3} opacity={o*.7}/>;})}
    <circle cx={cx} cy={cy} r={btnR+14} fill={C.purple} opacity={.18+.12*v.listen*pulse(t,.9)}/>
    <circle cx={cx} cy={cy} r={btnR} fill={`url(#${scr}-btn)`}/>
    <circle cx={cx} cy={cy} r={btnR} fill="none" stroke={C.lavender} strokeOpacity={.55} strokeWidth={3}/>
    <path d={`M ${cx-btnR*.7} ${cy-btnR*.35} A ${btnR*.8} ${btnR*.8} 0 0 1 ${cx+btnR*.1} ${cy-btnR*.78}`} fill="none" stroke="#FFFFFF" strokeOpacity={.3} strokeWidth={4} strokeLinecap="round"/>
    <g opacity={1-v.think}><Mic x={cx} y={cy+4} s={btnR/48} color={C.ivory}/></g>
    {v.think>.003&&<g opacity={v.think}>
     {Array.from({length:12},(_,i)=>{const an=(i*30+t*160)*D;return <circle key={i} cx={cx+Math.cos(an)*(btnR+22)} cy={cy+Math.sin(an)*(btnR+22)} r={4.5} fill={C.lavender} opacity={.15+.85*(i/11)}/>;})}
     {[[-14,-12],[10,-20],[18,6],[-8,14],[2,-2]].map(([dx,dy],i)=><Spark key={i} x={cx+dx} y={cy+dy} r={7+3*Math.sin(t*3+i)} light={C.yellow} dark={YEL.dark} k={.5+.5*Math.sin(t*2.4+i*1.3)}/>)}
    </g>}
    <g opacity={1-v.think}>{bars}</g>
   </g>}
   {v.found>.003&&<g opacity={v.found} transform={`translate(0,${f1((1-v.found)*24)})`}>
    <CoverArt x={-75} y={-204} s={150} t={t} uid={`${uid}-ph`}/>
    <rect x={-75} y={-36} width={130} height={14} rx={7} fill={C.ivory}/>
    <rect x={-75} y={-13} width={86} height={10} rx={5} fill={C.lavender} opacity={.7}/>
    <rect x={-75} y={14} width={150} height={6} rx={3} fill="#3A3B4C"/>
    <rect x={-75} y={14} width={150*(.12+.18*v.found)} height={6} rx={3} fill={C.green}/>
    {Array.from({length:7},(_,i)=>{const h=8+22*Math.abs(Math.sin(t*5.3+i*1.4));return <rect key={i} x={-60+i*20} y={74-h} width={11} height={h} rx={3} fill={C.green} opacity={.8}/>;})}
    <Check x={62} y={-190} k={v.found} r={22}/>
   </g>}
   <polygon points={pts([[SC.x+SC.w*.55,SC.y],[SC.x+SC.w,SC.y],[SC.x+SC.w,SC.y+SC.h*.22]])} fill="#FFFFFF" opacity={.06}/>
  </g>
  <rect x={-34} y={SC.y+10} width={68} height={18} rx={9} fill="#000"/>
  {[-30,-18,-6,6,18,30].map(x=><rect key={x} x={x-3.5} y={MIC[1]-3} width={7} height={6} rx={3} fill="#0B0A12" opacity={.9}/>)}
  {v.listen>.003&&<circle cx={MIC[0]} cy={MIC[1]} r={40} fill={C.yellow} opacity={.12*v.listen*(.6+.4*pulse(t,.6))}/>}
  <polygon points={pts([[-126,150],[126,150],[132,178],[-132,178]])} fill={METAL.top}/>
  <polygon points={pts([[-126,150],[0,150],[-14,178],[-132,178]])} fill={METAL.hi} opacity={.5}/>
  <polygon points={pts([[-60,178],[60,178],[74,232],[-74,232]])} fill={METAL.mid}/>
  <polygon points={pts([[-60,178],[0,178],[-12,232],[-74,232]])} fill={METAL.top} opacity={.6}/>
  <polygon points={pts([[-118,232],[118,232],[128,248],[-128,248]])} fill={METAL.lo}/>
  <rect x={-130} y={246} width={260} height={6} rx={3} fill={METAL.dark}/>
 </g>;
}

/* ───────────── noisy-bar ───────────── */
export function barState(a:number){return {loud:smooth(a,.05,.95)};}
const BOTTLES:[number,number,number,string][]=[// x, shelf (0 top, 1 low), height, colour
 [-30,0,74,"#7A64A6"],[2,0,92,C.yellow],[34,0,66,C.green],[66,0,84,"#B48CF2"],[100,0,58,C.pink],[134,0,96,"#C99A2E"],[168,0,70,C.lavender],[200,0,88,"#5FB4E0"],[232,0,62,C.yellow],[266,0,80,"#7A64A6"],[300,0,94,C.green],
 [-20,1,86,C.pink],[14,1,64,"#B48CF2"],[46,1,90,"#C99A2E"],[80,1,70,C.green],[114,1,98,C.lavender],[150,1,60,C.yellow],[184,1,84,"#7A64A6"],[220,1,72,C.pink],[254,1,92,"#5FB4E0"],[290,1,66,"#C99A2E"]];
const SHELF_Y=[-138,-52];
function Bottle({x,y,h,color}:{x:number;y:number;h:number;color:string}){
 const w=h*.28,neck=h*.32,body=h-neck,dark=mix(color,"#000000",.45);
 return <g>
  <Quad p={[[x-w/2,y-body],[x+w/2,y-body],[x+w/2,y],[x-w/2,y]]} light={color} dark={dark}/>
  <polygon points={pts([[x-w/2,y-body],[x-w*.18,y-body-w*.35],[x+w*.18,y-body-w*.35],[x+w/2,y-body]])} fill={mix(color,"#FFFFFF",.25)}/>
  <rect x={x-w*.16} y={y-h} width={w*.32} height={neck-w*.3} fill={dark}/>
  <rect x={x-w*.16} y={y-h} width={w*.16} height={neck-w*.3} fill={color}/>
  <rect x={x-w*.2} y={y-h-4} width={w*.4} height={6} rx={2} fill="#26273A"/>
  <rect x={x-w/2+3} y={y-body*.62} width={w-6} height={body*.3} fill={C.ivory} opacity={.18}/>
  <rect x={x-w/2+3} y={y-body+4} width={3} height={body-10} fill="#FFFFFF" opacity={.35}/>
 </g>;
}
function Patron({x,y,t,loud,phase,lean,shirt}:{x:number;y:number;t:number;loud:number;phase:number;lean:number;shirt:[string,string]}){
 const bob=Math.sin(t*(2.4+phase)+phase*6)*(1.5+4*loud),hx=x+lean*8,hy=y-118+bob;
 const head=Array.from({length:9},(_,i)=>{const an=(i/9)*2*Math.PI;return [hx+Math.cos(an)*24*(1+.05*Math.sin(i*2.3)),hy+Math.sin(an)*27];});
 return <g>
  <polygon points={pts([[x-58,y],[x-46,y-70],[x-18,y-86],[x+18,y-86],[x+46,y-70],[x+58,y]])} fill={shirt[1]}/>
  <polygon points={pts([[x-58,y],[x-46,y-70],[x-18,y-86],[x+4,y-86],[x-6,y]])} fill={shirt[0]}/>
  <rect x={hx-9} y={y-96+bob*.4} width={18} height={14} fill="#2A2238"/>
  {head.map((p,i)=>{const q=head[(i+1)%head.length];const lit=Math.cos(Math.atan2((p[1]+q[1])/2-hy,(p[0]+q[0])/2-hx)+135*D);return <polygon key={i} points={pts([[hx,hy],p,q])} fill={mix("#3A2C55","#7A64A6",clamp01(.5+.5*lit))}/>;})}
  <path d={`M ${hx-24} ${hy-6} Q ${hx} ${hy-40} ${hx+24} ${hy-6} Q ${hx} ${hy-22} ${hx-24} ${hy-6} Z`} fill="#1D1628"/>
  <path d={`M ${hx-26} ${hy} A 26 28 0 0 1 ${hx-8} ${hy-26}`} fill="none" stroke={C.lavender} strokeOpacity={.45} strokeWidth={2.5}/>
 </g>;
}
/** Speech bubble filled with a jagged line (chatter, no words). */
function Chatter({x,y,s,k}:{x:number;y:number;s:number;k:number}){
 if(k<=.004)return null;
 const zig=Array.from({length:9},(_,i)=>[x-26*s+i*6.5*s,y+(i%2?-7:7)*s]);
 return <g opacity={k}>
  <path d={rrect(x-38*s,y-20*s,76*s,40*s,18*s)} fill="#3A1426" stroke={C.pink} strokeWidth={4}/>
  <polygon points={pts([[x-14*s,y+18*s],[x-26*s,y+34*s],[x-2*s,y+19*s]])} fill="#3A1426" stroke={C.pink} strokeWidth={4} strokeLinejoin="round"/>
  <rect x={x-12*s} y={y+15*s} width={12*s} height={6*s} fill="#3A1426"/>
  <polyline points={pts(zig)} fill="none" stroke={C.pink} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"/>
 </g>;
}
function Stool({x,t}:{x:number;t:number}){
 const seat=Array.from({length:10},(_,i)=>{const an=(i/10)*2*Math.PI;return [x+Math.cos(an)*42,148+Math.sin(an)*12];});
 return <g>
  <ellipse cx={x} cy={238} rx={34} ry={7} fill="#000" opacity={.4}/>
  <rect x={x-5} y={160} width={10} height={74} fill={METAL.mid}/><rect x={x-5} y={160} width={4} height={74} fill={METAL.hi}/>
  <ellipse cx={x} cy={204} rx={24} ry={6} fill="none" stroke={METAL.hi} strokeWidth={4}/>
  <ellipse cx={x} cy={234} rx={28} ry={6} fill={METAL.lo}/>
  <polygon points={pts([[x-42,148],[x+42,148],[x+40,164],[x-40,164]])} fill="#5A1024"/>
  <polygon points={pts([[x-42,148],[x,148],[x-6,164],[x-40,164]])} fill="#8E1C38"/>
  {seat.map((p,i)=>{const q=seat[(i+1)%seat.length],lit=clamp01(.5-.5*Math.cos(Math.atan2((p[1]+q[1])/2-148,(p[0]+q[0])/2-x)+.6));return <polygon key={i} points={pts([[x,148],p,q])} fill={mix("#8E1C38","#D2557D",lit)}/>;})}
 </g>;
}
function NoisyBar({t,a,uid}:{t:number;a:number;uid:string}){
 const {loud}=barState(a),beat=pulse(t,.5,6),cone=1+(.03+.07*loud)*beat;
 const SP=[-298,-60],TOP=80;
 return <g>
  <defs><linearGradient id={`bw-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1D1628"/><stop offset="1" stopColor="#34264A"/></linearGradient>
   <radialGradient id={`lamp-${uid}`}><stop offset="0" stopColor={C.yellow} stopOpacity=".75"/><stop offset=".5" stopColor={C.yellow} stopOpacity=".2"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient>
   <linearGradient id={`cone-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.yellow} stopOpacity=".2"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></linearGradient></defs>
  <Shadow w={740} y={246}/>
  <rect x={-370} y={-250} width={740} height={TOP+250} rx={8} fill={`url(#bw-${uid})`}/>
  {Array.from({length:12},(_,i)=><rect key={i} x={-370+i*62} y={-250} width={2} height={TOP+250} fill={C.lavender} opacity={.05}/>)}
  <rect x={-370} y={-250} width={740} height={10} fill="#3A2C55"/>
  {/* neon note (no letters) */}
  <g opacity={.75+.25*Math.sin(t*5.3)*Math.sin(t*1.7)}>
   {[12,4].map((w,i)=><path key={i} d="M -222 -150 L -222 -196 L -184 -205 L -184 -160 M -222 -186 L -184 -195" fill="none" stroke={C.pink} strokeWidth={w} strokeOpacity={i?1:.25} strokeLinecap="round" strokeLinejoin="round"/>)}
   {[[-231,-150],[-193,-160]].map(([nx,ny],i)=><ellipse key={i} cx={nx} cy={ny} rx={10} ry={7.5} fill="none" stroke={C.pink} strokeWidth={4} transform={`rotate(-20 ${nx} ${ny})`}/>)}
  </g>
  {/* shelves with bottles */}
  {[-132,-48].map((sy,i)=><g key={i}><rect x={-80} y={sy} width={420} height={9} fill="#4E3D74"/><rect x={-80} y={sy} width={420} height={3} fill={C.lavender} opacity={.3}/></g>)}
  {BOTTLES.map(([x,s,h,c],i)=><Bottle key={i} x={x-10} y={[-132,-48][s]} h={h*(s?.82:.72)} color={c}/>)}
  {/* wall speaker and music */}
  <Box x={SP[0]-46} y={SP[1]-70} w={92} h={136} d={[12,-9]} front={{light:"#3A3B4C",dark:"#26273A"}} top="#4E4F62" side="#1D1628"/>
  <g transform={`translate(${SP[0]},${SP[1]+16}) scale(${cone.toFixed(3)})`}>
   <circle r={34} fill="#1D1628"/><circle r={34} fill="none" stroke="#666882" strokeWidth={3}/>
   <circle r={24} fill="#2E2742"/><circle r={14} fill="#4E4F62"/><circle r={6} fill={C.purple}/>
  </g>
  <circle cx={SP[0]} cy={SP[1]-40} r={12} fill="#1D1628"/><circle cx={SP[0]} cy={SP[1]-40} r={6} fill="#666882"/>
  {Array.from({length:4},(_,k)=>{const u=((t*.45+k/4)%1+1)%1,r=50+240*u,o=Math.sin(Math.PI*u)*(.45+.55*loud);
   const p=Array.from({length:13},(_,i)=>{const an=(-40+80*i/12)*D;return [SP[0]+Math.cos(an)*r,SP[1]+16+Math.sin(an)*r*.8];});
   return <g key={k} opacity={o}><polyline points={pts(p)} fill="none" stroke={C.yellow} strokeWidth={12} strokeOpacity={.15} strokeLinecap="round"/><polyline points={pts(p)} fill="none" stroke={C.yellow} strokeWidth={4.5} strokeLinecap="round"/></g>;})}
  {[0,1,2].map(k=>{const u=((t*.3+k/3)%1+1)%1,x=SP[0]+70+170*u,y=SP[1]-40-80*u+Math.sin(t*2+k)*8,o=Math.sin(Math.PI*u)*(.55+.45*loud);
   return <g key={k} opacity={o} transform={`translate(${f1(x)},${f1(y)}) rotate(${(Math.sin(t*1.5+k)*12).toFixed(1)})`}><ellipse cx={0} cy={0} rx={9} ry={7} fill={C.yellow} transform="rotate(-20)"/><rect x={7} y={-32} width={4} height={32} fill={C.yellow}/><path d="M 11 -32 Q 22 -26 18 -13" fill="none" stroke={C.yellow} strokeWidth={4}/></g>;})}
  {/* patrons behind the counter */}
  <Patron x={-150} y={TOP} t={t} loud={loud} phase={.3} lean={1} shirt={["#7A64A6","#4E3D74"]}/>
  <Patron x={-30} y={TOP} t={t} loud={loud} phase={.8} lean={-1} shirt={["#B4407A","#8E1C38"]}/>
  <Patron x={190} y={TOP} t={t} loud={loud} phase={.55} lean={0} shirt={["#4E7FA6","#2E4A6A"]}/>
  {/* pendant lamps (in front of the shelves) */}
  {[-110,80,270].map((lx,i)=>{const sw=Math.sin(t*.8+i*1.7)*2.5,bx=lx+Math.sin(sw*D)*40,by=-232;
   return <g key={i}>
    <polygon points={pts([[bx-36,by+24],[bx+36,by+24],[bx+110,TOP],[bx-110,TOP]])} fill={`url(#cone-${uid})`}/>
    <line x1={lx} y1={-250} x2={bx} y2={by} stroke="#4E4F62" strokeWidth={2.5}/>
    <ellipse cx={bx} cy={by+28} rx={42} ry={22} fill={`url(#lamp-${uid})`}/>
    <polygon points={pts([[bx-14,by],[bx+14,by],[bx+36,by+24],[bx-36,by+24]])} fill={PURP.dark}/>
    <polygon points={pts([[bx-14,by],[bx,by],[bx-8,by+24],[bx-36,by+24]])} fill={C.purple}/>
    <ellipse cx={bx} cy={by+25} rx={13} ry={5} fill={C.yellowLine}/>
   </g>;})}
  {[0,1].map(k=>{const u=((t*.42+k*.5)%1+1)%1,o=loud*Math.sin(Math.PI*u);return <Chatter key={k} x={k?-6:-176} y={-112-34*u} s={1.05+.15*u} k={o}/>;})}
  {(()=>{const u=((t*.42+.25)%1+1)%1;return <Chatter x={214} y={-118-34*u} s={1} k={loud*Math.sin(Math.PI*u)*.95}/>;})()}
  {/* counter */}
  <polygon points={pts([[-372,TOP],[372,TOP],[380,TOP-10],[-364,TOP-10]])} fill="#7A64A6"/>
  <polygon points={pts([[-372,TOP],[372,TOP],[372,TOP+6],[-372,TOP+6]])} fill="#B9A8DE" opacity={.6}/>
  {Array.from({length:8},(_,i)=>{const x=-372+i*93;return <Quad key={i} p={[[x,TOP+6],[x+93,TOP+6],[x+93,238],[x,238]]} light={i%2?"#4E3D74":"#5B4683"} dark={i%2?"#3A2C55":"#45366A"}/>;})}
  <polygon points={pts([[372,TOP],[380,TOP-10],[380,230],[372,238]])} fill="#2A2040"/>
  {Array.from({length:8},(_,i)=><rect key={i} x={-372+i*93} y={TOP+6} width={2} height={232-TOP} fill="#1D1628" opacity={.6}/>)}
  <rect x={-372} y={TOP+18} width={744} height={4} fill={C.lavender} opacity={.12}/>
  <rect x={-372} y={196} width={744} height={8} rx={4} fill={YEL.dark}/><rect x={-372} y={196} width={744} height={3} rx={1.5} fill={C.yellowLine} opacity={.8}/>
  <rect x={-372} y={238} width={744} height={8} fill="#1D1628"/>
  {/* glasses on the counter */}
  {[[-250,0],[-96,1],[-4,2],[110,0],[264,1]].map(([gx,kind],i)=>{const y=TOP-4;
   if(kind===0)return <g key={i}><path d={`M ${gx-16} ${y-56} L ${gx+16} ${y-56} L ${gx+13} ${y} L ${gx-13} ${y} Z`} fill={C.yellow} opacity={.85}/>
    <rect x={gx-17} y={y-64} width={34} height={10} rx={5} fill={C.ivory}/><path d={`M ${gx+16} ${y-46} q 14 4 12 18 q -2 12 -14 12`} fill="none" stroke={C.lavender} strokeOpacity={.6} strokeWidth={4}/>
    {[0,1,2].map(b=>{const u=((t*.8+b/3+i*.2)%1+1)%1;return <circle key={b} cx={gx-6+b*6} cy={y-4-48*u} r={2} fill={C.ivory} opacity={.7*Math.sin(Math.PI*u)}/>;})}</g>;
   if(kind===1)return <g key={i}><polygon points={pts([[gx-26,y-58],[gx+26,y-58],[gx,y-30]])} fill={C.pink} opacity={.75}/><polygon points={pts([[gx-26,y-58],[gx+26,y-58],[gx,y-30]])} fill="none" stroke={C.lavender} strokeOpacity={.6} strokeWidth={2}/>
    <rect x={gx-2} y={y-30} width={4} height={26} fill={C.lavender} opacity={.6}/><rect x={gx-14} y={y-5} width={28} height={5} rx={2.5} fill={C.lavender} opacity={.6}/><circle cx={gx+12} cy={y-60} r={5} fill={C.green}/></g>;
   return <g key={i}><rect x={gx-12} y={y-40} width={24} height={40} rx={3} fill={C.lavender} opacity={.25}/><rect x={gx-12} y={y-20} width={24} height={20} rx={3} fill="#C99A2E" opacity={.8}/><rect x={gx-9} y={y-24} width={10} height={10} fill={C.ivory} opacity={.6} transform={`rotate(20 ${gx-4} ${y-19})`}/></g>;})}
  {(()=>{const k=loud*pulse(t,2.6,24,.1);return k>.01&&<Spark x={-84} y={TOP-70} r={20*k+6} light={C.ivory} dark={C.yellow} k={k}/>;})()}
  {[-250,-80,110,280].map(x=><Stool key={x} x={x} t={t}/>)}
  {/* bar noise: pink grain and ripples */}
  {loud>.004&&<g opacity={loud}>
   {Array.from({length:30},(_,i)=>{const x=-350+hash(i*3.1)*700,y=-230+hash(i*7.3)*300,o=.5+.5*Math.sin(t*(4+hash(i)*5)+i*2);return <rect key={i} x={x} y={y} width={5} height={5} rx={1} fill={C.pink} opacity={.5*o}/>;})}
   {[0,1].map(k=>{const u=((t*.6+k*.5)%1+1)%1,r=40+160*u;return <ellipse key={k} cx={-90} cy={-40} rx={r} ry={r*.55} fill="none" stroke={C.pink} strokeWidth={3} strokeDasharray="6 9" opacity={.5*Math.sin(Math.PI*u)}/>;})}
  </g>}
 </g>;
}

/* ───────────── sound-wave ───────────── */
export function waveState(a:number){return {draw:smooth(a,.08,.45),noise:smooth(a,.15,.5),compare:smooth(a,.6,.95)};}
const WV={x0:-262,x1:322,yA:-108,yB:22,half:50};
const melody=(s:number)=>(.52*Math.sin(2*Math.PI*s)+.3*Math.sin(2*Math.PI*2.3*s+1)+.16*Math.sin(2*Math.PI*4.7*s+2))*(.72+.28*Math.sin(2*Math.PI*.37*s));
const barNoise=(s:number,t:number)=>.5*Math.sin(2*Math.PI*(17.3*s+1.9*t)+.4)+.32*Math.sin(2*Math.PI*(29.1*s-2.7*t)+2.2)+.26*Math.sin(2*Math.PI*(41.7*s+3.3*t)+4.1)+.3*Math.sin(2*Math.PI*(7.9*s-1.1*t)+1.3)*Math.sin(2*Math.PI*(.9*s+.4*t));
function SoundWave({t,a,uid}:{t:number;a:number;uid:string}){
 const v=waveState(a),N=160,scroll=t*.32,clip=`wv-${uid}`;
 const lane=(y:number,fn:(s:number)=>number,upto=1)=>Array.from({length:Math.max(2,Math.round(N*upto))+1},(_,i)=>{const u=i/N,x=lerp(WV.x0,WV.x1,u);return [x,y-fn(u*8+scroll)*WV.half*.9];});
 const studio=lane(WV.yA,melody),bar=(s:number)=>.78*melody(s-.13)*(1-.25*v.noise)+v.noise*.62*barNoise(s,t);
 const barPts=lane(WV.yB,bar,v.draw),ghostY=lerp(WV.yA,WV.yB,v.compare);
 const ghost=lane(ghostY,melody);
 return <g>
  <defs><clipPath id={clip}><rect x={WV.x0} y={-190} width={WV.x1-WV.x0} height={300}/></clipPath></defs>
  <Board x0={-368} y0={-196} x1={354} y1={122} floor={210}/>
  {[WV.yA,WV.yB].map((y,i)=><g key={i}><path d={rrect(WV.x0-8,y-WV.half-6,WV.x1-WV.x0+16,2*WV.half+12,12)} fill="#15102A" stroke={i&&v.compare>.01?mix(C.lavender,C.pink,v.compare):C.lavender} strokeOpacity={.18+.4*(i?v.compare:0)} strokeWidth={2.5}/>
   <line x1={WV.x0} y1={y} x2={WV.x1} y2={y} stroke={C.lavender} strokeOpacity={.12} strokeWidth={2}/></g>)}
  {/* studio icon: a vinyl record */}
  <g transform={`translate(-310,${WV.yA}) rotate(${(t*40)%360})`}><circle r={28} fill="#07050B"/>{[24,19,14].map(r=><circle key={r} r={r} fill="none" stroke="#3A3B4C" strokeWidth={1.5}/>)}<circle r={9} fill={C.lavender}/><circle r={2.5} fill={INK}/><path d="M -20 -14 A 24 24 0 0 1 -4 -24" stroke="#FFFFFF" strokeOpacity={.25} strokeWidth={3} fill="none"/></g>
  {/* bar icon: a cocktail glass */}
  <g transform={`translate(-310,${WV.yB})`}><polygon points={pts([[-22,-24],[22,-24],[0,4]])} fill={C.pink} opacity={.8}/><polygon points={pts([[-22,-24],[22,-24],[0,4]])} fill="none" stroke={C.lavender} strokeOpacity={.6} strokeWidth={2.5}/>
   <rect x={-2} y={4} width={4} height={16} fill={C.lavender}/><rect x={-12} y={19} width={24} height={4} rx={2} fill={C.lavender}/><circle cx={12} cy={-27} r={5} fill={C.green}/></g>
  <g clipPath={`url(#${clip})`}>
   <polyline points={pts(studio)} fill="none" stroke={C.lavender} strokeWidth={14} strokeOpacity={.16} strokeLinejoin="round"/>
   <polyline points={pts(studio)} fill="none" stroke={C.lavender} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round"/>
   {v.draw>.004&&<g>
    <polyline points={pts(barPts)} fill="none" stroke={C.pink} strokeWidth={14} strokeOpacity={.14*v.noise} strokeLinejoin="round"/>
    <polyline points={pts(barPts)} fill="none" stroke={mix(C.ivory,C.pink,.15+.45*v.noise)} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round"/>
    {v.draw<.995&&<circle cx={barPts.at(-1)![0]} cy={barPts.at(-1)![1]} r={7} fill={C.ivory}/>}
   </g>}
   {v.compare>.004&&<g opacity={v.compare}>
    {(()=>{const full=lane(WV.yB,bar),gap=[...ghost,...[...full].reverse()];return <polygon points={pts(gap)} fill={C.pink} opacity={.28*v.compare}/>;})()}
    <polyline points={pts(ghost)} fill="none" stroke={C.lavender} strokeWidth={10} strokeOpacity={.18} strokeLinejoin="round"/>
    <polyline points={pts(ghost)} fill="none" stroke={C.lavender} strokeWidth={4.5} strokeDasharray="12 9" strokeLinejoin="round"/>
   </g>}
  </g>
  {v.compare>.004&&<g opacity={v.compare} transform={`translate(296,-43) scale(${(.6+.4*v.compare).toFixed(3)})`}>
   <circle r={34} fill={C.pink} opacity={.2}/><circle r={26} fill={C.pink}/><circle r={26} fill="none" stroke={PINK.dark} strokeWidth={4}/>
   <path d="M -10 -10 L 10 10 M 10 -10 L -10 10" stroke={INK} strokeWidth={6} strokeLinecap="round"/>
  </g>}
 </g>;
}

/* ───────────── spectrogram (hero) ───────────── */
export const SPEC={x0:-306,x1:326,y0:-244,y1:104,cols:40,rows:18};
const CW=(SPEC.x1-SPEC.x0)/SPEC.cols,RH=(SPEC.y1-SPEC.y0)/SPEC.rows;
const MEL=[5,7,9,7,10,12,9,7,5,8,10,12,14,11,8,6,4,6,9,13];
/** Loudness 0..1 of the made-up song at column c (any integer) and pitch row r (0 = lowest). */
export function songAmp(c:number,r:number){
 const n=Math.floor(c/4),p=((c%4)+4)%4,env=[1,.8,.6,.42][p],f0=MEL[((n%MEL.length)+MEL.length)%MEL.length];
 let v=Math.exp(-((r-f0)**2)/.4)*env*.98+Math.exp(-((r-f0-4)**2)/.5)*env*.4;
 const bass=((Math.floor(c/8)%2)+2)%2?1:2;v+=Math.exp(-((r-bass)**2)/.45)*(p<3?.62:.4);
 const b=((c%8)+8)%8;if(b===0)v+=.78*Math.exp(-r/3.2);if(b===4)v+=r>=6&&r<=16?.34*(.6+.4*hash(c*1.7+r)):0;
 v+=.1+.12*hash(c*13.1+r*7.7);
 return clamp01(v);
}
const AMP=new Map<number,number>();const amp=(c:number,r:number)=>{const k=c*64+r;let v=AMP.get(k);if(v===undefined){v=songAmp(c,r);AMP.set(k,v);}return v;};
/** True local maxima of the song model (5×5 neighbourhood, loud enough): the "stars". */
export function isPeak(c:number,r:number){const v=amp(c,r);if(v<.62)return false;
 for(let dc=-2;dc<=2;dc++)for(let dr=-2;dr<=2;dr++){if(!dc&&!dr)continue;const rr=r+dr;if(rr<0||rr>=SPEC.rows)continue;const w=amp(c+dc,rr);if(w>v||(w===v&&(dc<0||dc===0&&dr<0)))return false;}
 return true;}
/** Bar noise in cell (screen column j, row r): pink chatter energy, mostly in the middle pitches. */
const noiseAmp=(c:number,r:number,t:number)=>{const mid=Math.exp(-((r-9)**2)/26);return mid*(.25+.5*hash(c*3.7+r*11.3))*(.55+.45*Math.sin(t*2.6+hash(c+r*40)*6.28));};
export function spectroState(a:number){
 return {heat:smooth(a,.02,.15),write:smooth(a,.03,.15)*(1-smooth(a,.26,.36)),dim:smooth(a,.24,.36),noise:smooth(a,.44,.56),
  sweep:win(a,.42,.47,.53,.58),anchor:smooth(a,.62,.7),zone:smooth(a,.64,.72),links:smooth(a,.66,.79),web:smooth(a,.7,.8),
  pitch1:smooth(a,.81,.89),pitch2:smooth(a,.905,.945),gap:smooth(a,.955,.995)};
}
/** Recorded columns (scroll): 16 columns per second while recording, integrated, so the stop never jumps. */
export const spectroScroll=(t:number,o:Keyed)=>integrate(t,o,"spectrogram",a=>16*smooth(a,.03,.15)*(1-smooth(a,.26,.36)));
const REC0=60;
const heatColor=(v:number)=>v<.3?mix("#120C1D","#2A1B4A",v/.3):v<.55?mix("#2A1B4A",C.purple,(v-.3)/.25):v<.78?mix(C.purple,C.lavender,(v-.55)/.23):mix(C.lavender,C.yellow,(v-.78)/.22);
type Star={c:number;r:number;x:number;y:number;v:number;i:number};
/** Visible stars for a scroll position, with stable indices (song column based). */
export function visibleStars(rec:number):Star[]{
 const fc=REC0+rec-SPEC.cols,first=Math.floor(fc),out:Star[]=[];
 for(let c=first;c<=first+SPEC.cols;c++)for(let r=0;r<SPEC.rows;r++)if(isPeak(c,r)){const x=SPEC.x0+(c-fc+.5)*CW,y=SPEC.y1-(r+.5)*RH;
  if(x>SPEC.x0+CW*.4&&x<SPEC.x1-CW*.4)out.push({c,r,x,y,v:amp(c,r),i:c*64+r});}
 return out;
}
/** Lost stars (the noise hides them): a stable hash of the star's song position. */
const lostStar=(s:{c:number;r:number})=>hash(s.c*.731+s.r*1.37)<.13;
/** The anchor the pair story is told on: the star nearest 32 % across, mid-height; its targets ahead in time. */
export function pairOf(stars:Star[]){
 const ok=stars.filter(s=>!lostStar(s)&&s.r>=3);if(!ok.length)return null;
 const want={x:lerp(SPEC.x0,SPEC.x1,.3),y:lerp(SPEC.y0,SPEC.y1,.55)};
 const ahead=(an:Star)=>ok.filter(s=>s.c-an.c>=2&&s.c-an.c<=10&&Math.abs(s.r-an.r)<=5).sort((p,q)=>p.c-q.c).slice(0,3);
 // Nearest star to the spot that has at least two stars ahead of it (else one): the pair always has a partner.
 const byDist=[...ok].sort((p,q)=>Math.hypot(p.x-want.x,(p.y-want.y)*.6)-Math.hypot(q.x-want.x,(q.y-want.y)*.6));
 const anchor=byDist.find(s=>ahead(s).length>=2)??byDist.find(s=>ahead(s).length>=1)??byDist[0],targets=ahead(anchor);
 return {anchor,targets,zone:{x0:anchor.x+CW*1.5,x1:anchor.x+CW*10.5,y0:anchor.y-RH*5.5,y1:anchor.y+RH*5.5}};
}
function Spectrogram({t,a,o,uid,rows}:{t:number;a:number;o:Keyed;uid:string;rows:number}){
 const v=spectroState(a),rec=spectroScroll(t,o),fc=REC0+rec-SPEC.cols,first=Math.floor(fc),clip=`sp-${uid}`,noisy=rows!==2;
 const stars=visibleStars(rec),pair=pairOf(stars),measure=Math.max(v.pitch1,v.pitch2,v.gap);
 const cells:React.ReactNode[]=[];
 if(v.heat>.003)for(let j=0;j<=SPEC.cols;j++){const c=first+j,x=SPEC.x0+(c-fc)*CW;
  for(let r=0;r<SPEC.rows;r++){const s=amp(c,r),peak=isPeak(c,r),n=noisy?noiseAmp(c,r,t):0,y=SPEC.y1-(r+1)*RH;
   const base=heatColor(s),col=n>.05?mix(base,C.pink,clamp01(n*.55)*(1-s*.6)):base,gone=peak&&noisy&&lostStar({c,r})?v.noise:0,op=v.heat*(peak?(1-.35*v.dim)*(1-.8*gone):1-.9*v.dim);
   cells.push(<rect key={`${j}-${r}`} x={f1(x+.6)} y={f1(y+.6)} width={f1(CW-1.2)} height={f1(RH-1.2)} rx={2.5} fill={col} opacity={op.toFixed(3)}/>);}}
 const starK=(s:Star)=>smooth(a,.26+.06*(s.x-SPEC.x0)/(SPEC.x1-SPEC.x0),.34+.06*(s.x-SPEC.x0)/(SPEC.x1-SPEC.x0));
 const inPair=(s:Star)=>pair&&(s.i===pair.anchor.i||pair.targets.some(q=>q.i===s.i));
 const web:React.ReactNode[]=[];
 if(v.web>.003)stars.forEach((s,k)=>{if(k%2||lostStar(s)||(pair&&s.i===pair.anchor.i))return;
  stars.filter(q=>!lostStar(q)&&q.c-s.c>=2&&q.c-s.c<=9&&Math.abs(q.r-s.r)<=5).slice(0,2).forEach((q,m)=>web.push(<line key={`${k}-${m}`} x1={s.x} y1={s.y} x2={q.x} y2={q.y} stroke={C.lavender} strokeWidth={2} opacity={.32*v.web*(1-.6*measure)}/>));});
 const sel=pair?.targets[0];
 return <g>
  <defs><clipPath id={clip}><rect x={SPEC.x0} y={SPEC.y0} width={SPEC.x1-SPEC.x0} height={SPEC.y1-SPEC.y0}/></clipPath>
   <radialGradient id={`${clip}-star`}><stop offset="0" stopColor={C.yellow} stopOpacity=".55"/><stop offset=".5" stopColor={C.yellow} stopOpacity=".16"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient>
   <linearGradient id={`${clip}-head`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.lavender} stopOpacity="0"/><stop offset="1" stopColor={C.lavender} stopOpacity=".5"/></linearGradient>
   <linearGradient id={`${clip}-haze`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.pink} stopOpacity="0"/><stop offset=".5" stopColor={C.pink} stopOpacity=".28"/><stop offset="1" stopColor={C.pink} stopOpacity="0"/></linearGradient></defs>
  <Board x0={-368} y0={-276} x1={354} y1={176} floor={290}/>
  {/* axes: pitch up (note-ladder icon), time right (clock icon); no numbers */}
  <line x1={-324} y1={SPEC.y1+4} x2={-324} y2={SPEC.y0-2} stroke={C.lavender} strokeOpacity={.7} strokeWidth={4} strokeLinecap="round"/>
  <polygon points={pts([[-324,SPEC.y0-16],[-333,SPEC.y0-1],[-315,SPEC.y0-1]])} fill={C.lavender} opacity={.7}/>
  <line x1={-324} y1={SPEC.y1+22} x2={SPEC.x1-4} y2={SPEC.y1+22} stroke={C.lavender} strokeOpacity={.7} strokeWidth={4} strokeLinecap="round"/>
  <polygon points={pts([[SPEC.x1+10,SPEC.y1+22],[SPEC.x1-5,SPEC.y1+13],[SPEC.x1-5,SPEC.y1+31]])} fill={C.lavender} opacity={.7}/>
  {[0,1,2].map(i=><rect key={i} x={-341+i*9} y={SPEC.y1-8-i*12} width={7} height={8+i*12} rx={2} fill={C.lavender} opacity={.5}/>)}
  <g transform={`translate(${SPEC.x1-6},${SPEC.y1+44})`}><circle r={9} fill="none" stroke={C.lavender} strokeOpacity={.6} strokeWidth={2.5}/><path d="M 0 -5 V 0 H 4" stroke={C.lavender} strokeOpacity={.6} strokeWidth={2.5} fill="none" strokeLinecap="round"/></g>
  {Array.from({length:9},(_,i)=><line key={i} x1={SPEC.x0+i*CW*5} y1={SPEC.y1+17} x2={SPEC.x0+i*CW*5} y2={SPEC.y1+27} stroke={C.lavender} strokeOpacity={.4} strokeWidth={2}/>)}
  <g clipPath={`url(#${clip})`}>
   {cells}
   {v.write>.003&&<g opacity={v.write}><rect x={SPEC.x1-70} y={SPEC.y0} width={70} height={SPEC.y1-SPEC.y0} fill={`url(#${clip}-head)`}/><rect x={SPEC.x1-4} y={SPEC.y0} width={4} height={SPEC.y1-SPEC.y0} fill={C.ivory} opacity={.8}/></g>}
   {v.sweep>.003&&<rect x={lerp(SPEC.x0-200,SPEC.x1,smooth(a,.42,.58))} y={SPEC.y0} width={200} height={SPEC.y1-SPEC.y0} fill={`url(#${clip}-haze)`} opacity={v.sweep}/>}
   {/* noise: faint pink stars that are not peaks of the song */}
   {noisy&&v.noise>.003&&Array.from({length:12},(_,i)=>{const x=lerp(SPEC.x0+12,SPEC.x1-12,hash(i*3.13+.5)),y=lerp(SPEC.y0+14,SPEC.y1-14,hash(i*7.71+.2));
    return <Spark key={`n${i}`} x={x} y={y} r={7+2*Math.sin(t*3+i)} light={mix(C.pink,C.ivory,.25)} dark={PINK.dark} k={v.noise*(.45+.25*Math.sin(t*2.2+i*1.9))*(1-.4*measure)}/>;})}
   {web}
   {pair&&v.zone>.003&&<g opacity={v.zone*(1-.5*v.gap)}><path d={rrect(pair.zone.x0,pair.zone.y0,pair.zone.x1-pair.zone.x0,pair.zone.y1-pair.zone.y0,12)} fill={C.lavender} fillOpacity={.06} stroke={C.lavender} strokeWidth={3} strokeDasharray="10 8"/></g>}
   {pair&&v.links>.003&&pair.targets.map((q,i)=>{const k=smooth(a,.66+.035*i,.72+.035*i),x=lerp(pair.anchor.x,q.x,k),y=lerp(pair.anchor.y,q.y,k),hi=q===sel?1:1-.55*measure;
    return k>.003&&<g key={i} opacity={hi}><line x1={pair.anchor.x} y1={pair.anchor.y} x2={x} y2={y} stroke={C.lavender} strokeWidth={10} strokeOpacity={.18}/><line x1={pair.anchor.x} y1={pair.anchor.y} x2={x} y2={y} stroke={q===sel?mix(C.ivory,C.green,v.gap):C.ivory} strokeWidth={4} strokeLinecap="round"/></g>;})}
   {stars.map(s=>{const k=starK(s);if(k<=.003)return null;const lost=noisy&&lostStar(s)?v.noise:0,tw=.85+.15*Math.sin(t*2.5+s.i*.37),focus=measure>0&&!inPair(s)?1-.45*measure:1;
    const r=(8+7*s.v)*(.5+.5*k);
    return <g key={s.i}>
     {lost>.003&&<g opacity={lost*k}><circle cx={s.x} cy={s.y} r={r+4} fill="none" stroke={C.pink} strokeWidth={2.5} strokeDasharray="4 5"/></g>}
     <g opacity={(1-lost)*focus}>
      <circle cx={s.x} cy={s.y} r={r*2.6} fill={`url(#${clip}-star)`} opacity={k*tw}/>
      <Spark x={s.x} y={s.y} r={r} light={C.yellow} dark={YEL.dark} k={k}/>
     </g>
    </g>;})}
   {pair&&v.anchor>.003&&<g opacity={v.anchor}><circle cx={pair.anchor.x} cy={pair.anchor.y} r={22+3*Math.sin(t*3)} fill="none" stroke={C.lavender} strokeWidth={4}/><circle cx={pair.anchor.x} cy={pair.anchor.y} r={32} fill="none" stroke={C.lavender} strokeWidth={2} opacity={.4}/></g>}
   {sel&&measure>.003&&<g>
    {v.pitch1>.003&&<g opacity={v.pitch1}><line x1={lerp(pair!.anchor.x,SPEC.x0,v.pitch1)} y1={pair!.anchor.y} x2={pair!.anchor.x} y2={pair!.anchor.y} stroke={C.yellow} strokeWidth={3} strokeDasharray="7 6"/></g>}
    {v.pitch2>.003&&<g opacity={v.pitch2}><line x1={lerp(sel.x,SPEC.x0,v.pitch2)} y1={sel.y} x2={sel.x} y2={sel.y} stroke={C.lavender} strokeWidth={3} strokeDasharray="7 6"/><circle cx={sel.x} cy={sel.y} r={20} fill="none" stroke={C.lavender} strokeWidth={3}/></g>}
    {v.gap>.003&&(()=>{const by=Math.max(pair!.anchor.y,sel.y)+30,x0=pair!.anchor.x,x1=lerp(x0,sel.x,v.gap);return <g opacity={v.gap}>
     <line x1={x0} y1={pair!.anchor.y+14} x2={x0} y2={by+8} stroke={C.green} strokeWidth={3} strokeDasharray="4 5"/><line x1={sel.x} y1={sel.y+14} x2={sel.x} y2={by+8} stroke={C.green} strokeWidth={3} strokeDasharray="4 5" opacity={v.gap}/>
     <line x1={x0} y1={by} x2={x1} y2={by} stroke={C.green} strokeWidth={5} strokeLinecap="round"/>
     <polygon points={pts([[x1+2,by],[x1-10,by-8],[x1-10,by+8]])} fill={C.green}/><polygon points={pts([[x0-2,by],[x0+10,by-8],[x0+10,by+8]])} fill={C.green}/>
    </g>;})()}
   </g>}
  </g>
  {/* axis ticks of the measured pair, outside the plot clip */}
  {sel&&v.pitch1>.003&&<rect x={-338} y={pair!.anchor.y-4} width={28} height={8} rx={4} fill={C.yellow} opacity={v.pitch1}/>}
  {sel&&v.pitch2>.003&&<rect x={-338} y={sel.y-4} width={28} height={8} rx={4} fill={C.lavender} opacity={v.pitch2}/>}
  {sel&&v.gap>.003&&<rect x={pair!.anchor.x} y={SPEC.y1+18} width={Math.max(0,(sel.x-pair!.anchor.x)*v.gap)} height={8} rx={4} fill={C.green} opacity={v.gap}/>}
 </g>;
}

/* ───────────── fingerprint-card ───────────── */
export function cardState(a:number){return {anchor:smooth(a,.05,.16),target:smooth(a,.12,.24),link:smooth(a,.18,.3),slot:[0,1,2].map(i=>smooth(a,.33+.09*i,.45+.09*i)),
 fly:win(a,.66,.8,.82,.96),stamp:smooth(a,.7,.92),glow:smooth(a,.86,1)};}
const HASH_RAW=Array.from({length:14},(_,i)=>({w:8+Math.floor(hash(i*2.9)*3)*5,c:[INK,C.purple,C.yellow,INK,"#A68BD0",INK,C.green][Math.floor(hash(i*5.1)*7)]}));
const HASH_SCALE=(232-4*13)/HASH_RAW.reduce((n,b)=>n+b.w,0),HASH_BLOCKS=HASH_RAW.map(b=>({...b,w:b.w*HASH_SCALE}));
function CardFace({t,v,uid,front}:{t:number;v:ReturnType<typeof cardState>;uid:string;front:boolean}){
 const A=[-80,-126],B=[66,-172],m1=-4,m2=-34;
 let hx=-140;const blocks=HASH_BLOCKS.map((b,i)=>{const x=hx;hx+=b.w+4;return {...b,x,k:front?smooth(v.stamp,.08+.05*i,.25+.05*i):1};});
 return <g>
  <Prism poly={[[-165,-235],[165,-235],[165,140],[-165,140]]} d={[14,-12]} face={C.ivory} top="#F3EBFD" side="#A68BD0"/>
  <path d={rrect(-165,-235,330,375,14)} fill={C.ivory}/>
  <polygon points={pts([[-165,40],[165,-160],[165,140],[-165,140]])} fill="#E9E2D2" opacity={.55}/>
  <path d={rrect(-165,-235,330,375,14)} fill="none" stroke={front?mix("#C9B8E6",C.purple,v.glow):"#C9B8E6"} strokeWidth={front?3+3*v.glow:3}/>
  <path d={rrect(-142,-214,284,134,10)} fill={INK}/>
  {[0,1,2,3].map(i=><line key={i} x1={-142+i*71} y1={-214} x2={-142+i*71} y2={-80} stroke={C.lavender} strokeOpacity={.08} strokeWidth={2}/>)}
  {front&&v.link>.003&&<g opacity={v.link}><path d={rrect(-40,-206,166,108,10)} fill="none" stroke={C.lavender} strokeOpacity={.35} strokeWidth={2} strokeDasharray="6 6"/>
   <line x1={A[0]} y1={A[1]} x2={lerp(A[0],B[0],v.link)} y2={lerp(A[1],B[1],v.link)} stroke={C.ivory} strokeWidth={3.5} strokeLinecap="round"/></g>}
  {front&&<Spark x={A[0]} y={A[1]} r={16} light={C.yellow} dark={YEL.dark} k={v.anchor}/>}
  {front&&<Spark x={B[0]} y={B[1]} r={13} light={C.lavender} dark={LAV.dark} k={v.target}/>}
  {front&&v.link>.003&&<g opacity={v.link}><line x1={A[0]} y1={-96} x2={lerp(A[0],B[0],v.link)} y2={-96} stroke={C.green} strokeWidth={4} strokeLinecap="round"/><line x1={A[0]} y1={-102} x2={A[0]} y2={-90} stroke={C.green} strokeWidth={3}/><line x1={B[0]} y1={-102} x2={B[0]} y2={-90} stroke={C.green} strokeWidth={3} opacity={v.link}/></g>}
  {[-98,0,98].map((x,i)=><g key={i}><path d={rrect(x-42,-62,84,104,10)} fill="#EFE8F8"/><path d={rrect(x-42,-62,84,104,10)} fill="none" stroke="#C9B8E6" strokeWidth={2}/></g>)}
  {[-98,0].map((x,i)=><g key={i}><rect x={x-3} y={-50} width={6} height={80} rx={3} fill="#C9B8E6"/>{[0,1,2,3,4].map(k=><rect key={k} x={x+8} y={-48+k*19} width={10} height={2.5} fill="#C9B8E6"/>)}</g>)}
  {front&&[0,1].map(i=>{const k=v.slot[i],y=lerp(30,i?m2:m1,k);return k>.003&&<g key={i} opacity={clamp01(k*2)}><rect x={(i?0:-98)-17} y={y-7} width={34} height={14} rx={7} fill={i?C.lavender:C.yellow} stroke={i?LAV.dark:YEL.dark} strokeWidth={2}/></g>;})}
  {front&&v.slot[2]>.003&&(()=>{const k=v.slot[2],w=64*k;return <g opacity={clamp01(k*2)}><line x1={98-w/2} y1={-8} x2={98+w/2} y2={-8} stroke={GRN.dark} strokeWidth={5} strokeLinecap="round"/>
   <polygon points={pts([[98-w/2-4,-8],[98-w/2+8,-16],[98-w/2+8,0]])} fill={GRN.dark}/><polygon points={pts([[98+w/2+4,-8],[98+w/2-8,-16],[98+w/2-8,0]])} fill={GRN.dark}/>
   <line x1={98-w/2-4} y1={-26} x2={98-w/2-4} y2={10} stroke={GRN.dark} strokeWidth={3}/><line x1={98+w/2+4} y1={-26} x2={98+w/2+4} y2={10} stroke={GRN.dark} strokeWidth={3}/></g>;})()}
  <path d={rrect(-146,62,248,58,8)} fill="#EFE8F8"/>
  {blocks.map((b,i)=>b.k>.003&&<rect key={i} x={b.x} y={70+44*(1-b.k)} width={b.w} height={42*b.k} rx={2} fill={b.c} opacity={front?1:.5}/>)}
  <g transform="translate(134,88)">{[24,18,12,6].map((r,i)=><path key={r} d={`M ${-r} ${4} A ${r} ${r+2} 0 0 1 ${r} ${4}`} fill="none" stroke={front?mix("#A68BD0",C.purple,v.glow):"#A68BD0"} strokeWidth={3} strokeLinecap="round" opacity={.9-i*.1}/>)}<path d="M -22 10 Q 0 18 22 10" fill="none" stroke="#A68BD0" strokeWidth={3} strokeLinecap="round" opacity={.6}/></g>
  {front&&v.fly>.003&&[[-98,lerp(30,m1,1),C.yellow],[0,m2,C.lavender],[98,-8,C.green]].map(([x,y,c],i)=>{const k=smooth(v.stamp,0,.6);return <circle key={i} cx={lerp(x as number,-100+i*80,k)} cy={lerp(y as number,90,k)} r={8} fill={c as string} opacity={v.fly}/>;})}
 </g>;
}
function FingerprintCard({t,a,uid,rows}:{t:number;a:number;uid:string;rows:number}){
 const v=cardState(a),done=cardState(1);
 return <g>
  <defs><radialGradient id={`fg-${uid}`}><stop offset="0" stopColor={C.purple} stopOpacity=".55"/><stop offset="1" stopColor={C.purple} stopOpacity="0"/></radialGradient></defs>
  <Shadow w={300} y={254}/>
  <Podium y={208} rx={140} ry={22} h={26} glow={C.lavender} k={v.glow}/>
  {v.glow>.003&&<ellipse cx={0} cy={-40} rx={225} ry={200} fill={`url(#fg-${uid})`} opacity={v.glow*(.75+.25*Math.sin(t*2))}/>}
  <polygon points={pts([[-120,148],[120,148],[96,206],[-96,206]])} fill={C.lavender} opacity={.07+.12*v.glow}/>
  <g transform={`translate(0,${f1(Math.sin(t*1.3)*5-8)})`}>
   {rows>=2&&[-1,1].map(s=><g key={s} transform={`translate(${s*28},0) rotate(${s*2.5} 0 140)`} opacity={.8}><CardFace t={t} v={done} uid={`${uid}${s}`} front={false}/></g>)}
   <CardFace t={t} v={v} uid={uid} front/>
  </g>
 </g>;
}

/* ───────────── song-shelves ───────────── */
export function shelvesState(a:number){return {sweep:win(a,.05,.2,.5,.62),hits:smooth(a,.36,.58),one:smooth(a,.66,.9),dim:smooth(a,.7,.95)};}
const SH={x0:-300,x1:300,boards:[-196,-92,12,116,220],slot:64,size:56};
export const SHELF_WIN={row:1,slot:6};
const HITS=Array.from({length:12},(_,i)=>({row:Math.floor(hash(i*4.7+1)*5),slot:Math.floor(hash(i*8.3+2)*9),n:1+Math.floor(hash(i*2.2)*3)})).filter(h=>!(h.row===SHELF_WIN.row&&h.slot===SHELF_WIN.slot));
function SongShelves({t,a,uid}:{t:number;a:number;uid:string}){
 const v=shelvesState(a),beamU=((t*.42)%1+1)%1,beamX=lerp(SH.x0-20,SH.x1+20,beamU),beamO=v.sweep*Math.sin(Math.PI*beamU);
 const side=(s:number)=>{const xo=s<0?-378:378,xi=s<0?-312:322;return <g opacity={.75}>
  <polygon points={pts([[xo,-240],[xi,-276],[xi,246],[xo,214]])} fill="#120C1D"/>
  {[0,1,2,3,4].map(k=>{const yi=-232+k*100,yo=-200+k*88;return <g key={k}><polygon points={pts([[xo,yo],[xi,yi],[xi,yi+5],[xo,yo+4]])} fill="#3A2C55"/>
   {[0,1,2].map(m=>{const u=(m+.2)/3.3,x=lerp(xi,xo,u),y=lerp(yi,yo,u),h=lerp(46,34,u),w=lerp(16,10,u);return <rect key={m} x={s<0?x-w:x} y={y-h} width={w} height={h} fill={["#5B3A94","#8E1C38","#3A3B4C"][(k+m)%3]} opacity={.8}/>;})}</g>;})}
  <line x1={xi} y1={-276} x2={xi} y2={246} stroke={C.lavender} strokeOpacity={.15} strokeWidth={2}/>
 </g>;};
 return <g>
  <defs><radialGradient id={`win-${uid}`}><stop offset="0" stopColor={C.green} stopOpacity=".6"/><stop offset="1" stopColor={C.green} stopOpacity="0"/></radialGradient>
   <linearGradient id={`beam-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.lavender} stopOpacity="0"/><stop offset=".5" stopColor={C.lavender} stopOpacity=".35"/><stop offset="1" stopColor={C.lavender} stopOpacity="0"/></linearGradient></defs>
  <Shadow w={740} y={284}/>
  {side(-1)}{side(1)}
  <Prism poly={[[SH.x0-12,-286],[SH.x1+12,-286],[SH.x1+12,278],[SH.x0-12,278]]} d={[16,-12]} face="#2A2040" top="#4E3D74" side="#1D1628"/>
  <rect x={SH.x0} y={-272} width={SH.x1-SH.x0} height={540} fill="#140F22"/>
  {[SH.x0-12,SH.x1].map((x,i)=><rect key={i} x={x} y={-286} width={12} height={564} fill={i?"#3A2C55":"#5B4683"}/>)}
  {SH.boards.map((by,row)=><g key={row}>
   {Array.from({length:9},(_,s)=>{const isWin=row===SHELF_WIN.row&&s===SHELF_WIN.slot,x=SH.x0+12+s*SH.slot+(SH.slot-SH.size)/2,y=by-SH.size-2,seed=row*9+s+1;
    const lean=(hash(seed*1.9)-.5)*7,disc=hash(seed*2.7)<.38,dimK=isWin?0:v.dim*.6;
    if(isWin)return null;
    return <g key={s} opacity={1-dimK} transform={`rotate(${lean.toFixed(1)} ${x+SH.size/2} ${by})`}>
     {disc&&<g><circle cx={x+SH.size/2} cy={y+4} r={SH.size*.46} fill="#07050B"/><circle cx={x+SH.size/2} cy={y+4} r={SH.size*.16} fill={C.yellow} opacity={.7}/></g>}
     <MiniCover x={x} y={y} s={SH.size} seed={seed}/>
    </g>;})}
   <polygon points={pts([[SH.x0,by],[SH.x1,by],[SH.x1+16,by-12],[SH.x0+16,by-12]])} fill="#5B4683" opacity={.55}/>
   <Quad p={[[SH.x0,by],[SH.x1,by],[SH.x1,by+12],[SH.x0,by+12]]} light="#7A64A6" dark="#4E3D74"/>
   <rect x={SH.x0} y={by} width={SH.x1-SH.x0} height={2.5} fill={C.lavender} opacity={.35}/>
  </g>)}
  <rect x={SH.x0} y={-272} width={SH.x1-SH.x0} height={540} fill="#07050B" opacity={.18}/>
  {beamO>.003&&<rect x={beamX-60} y={-272} width={120} height={540} fill={`url(#beam-${uid})`} opacity={beamO}/>}
  {v.hits>.003&&HITS.map((h,i)=>{const k=smooth(v.hits,i/HITS.length*.6,i/HITS.length*.6+.4)*(1-.7*v.dim),x=SH.x0+12+h.slot*SH.slot+SH.slot/2,y=SH.boards[h.row]-SH.size/2-2;
   return k>.003&&<g key={i} opacity={k}><path d={rrect(x-SH.size/2-4,y-SH.size/2-4,SH.size+8,SH.size+8,6)} fill="none" stroke={C.lavender} strokeWidth={3} opacity={.55+.25*Math.sin(t*3+i)}/>
    {Array.from({length:h.n},(_,m)=>{const dx=(hash(i*3+m)-.5)*28,dy=(hash(i*7+m)-.5)*28,p=.65+.35*Math.sin(t*4+i+m);return <g key={m}><circle cx={x+dx} cy={y+dy} r={15} fill={C.lavender} opacity={.3*p}/><circle cx={x+dx} cy={y+dy} r={6.5} fill={C.ivory} opacity={p}/><circle cx={x+dx} cy={y+dy} r={6.5} fill="none" stroke={C.purple} strokeWidth={2}/></g>;})}</g>;})}
  {(()=>{const x0=SH.x0+12+SHELF_WIN.slot*SH.slot+(SH.slot-SH.size)/2,by=SH.boards[SHELF_WIN.row],y0=by-SH.size-2,k=v.one,s=1+.7*k,cx=x0+SH.size/2,cy=y0+SH.size/2+14*k-10*k;
   const dots=Math.round(2+v.hits*5);
   return <g>
    {k>.003&&<ellipse cx={cx} cy={cy} rx={110} ry={110} fill={`url(#win-${uid})`} opacity={k*(.8+.2*Math.sin(t*2.5))}/>}
    <g transform={`translate(${f1(cx)},${f1(cy)}) scale(${s.toFixed(3)}) translate(${f1(-cx)},${f1(-cy)})`}>
     <MiniCover x={x0} y={y0} s={SH.size} seed={SHELF_WIN.row*9+SHELF_WIN.slot+1}/>
     {k>.003&&<path d={rrect(x0-3,y0-3,SH.size+6,SH.size+6,4)} fill="none" stroke={C.green} strokeWidth={4} opacity={k}/>}
     {v.hits>.003&&Array.from({length:dots},(_,m)=>{const an=m*2.4,rr=8+3*m;return <circle key={m} cx={cx+Math.cos(an)*rr*.9} cy={cy-SH.size*0+Math.sin(an)*rr*.9} r={3.5} fill={mix(C.yellow,C.green,k)} opacity={v.hits*(.7+.3*Math.sin(t*4+m))}/>;})}
    </g>
   </g>;})()}
 </g>;
}

/* ───────────── offset-histogram ───────────── */
export function histState(a:number){return {strips:smooth(a,.05,.25),lines:smooth(a,.15,.33),drops:smooth(a,.36,.55),spike:smooth(a,.58,.8),win:smooth(a,.84,1)};}
const HB={n:15,x0:-284,w:38,base:132,target:9};
const HB_X=(i:number)=>HB.x0+i*HB.w+HB.w/2;
const HB_H=Array.from({length:HB.n},(_,i)=>10+52*hash(i*5.31+.7));
const CLIP_U=[.1,.28,.43,.6,.77,.92],RAND_U=[.18,.36,.52,.69,.85],SONG={x0:-286,x1:286,y:-206},CLIPY=-132,CLIPW=170,ALIGN=-8;
/** Clip strip left edge: it scans along the song, then settles exactly where the clip sits in the song. */
export const clipLeft=(t:number,spike:number)=>lerp(-60+150*Math.sin(t*.55),ALIGN,spike);
export function histBars(v:ReturnType<typeof histState>){return HB_H.map((h,i)=>v.drops*h+(i===HB.target?v.spike*172:0));}
function OffsetHistogram({t,a,uid}:{t:number;a:number;uid:string}){
 const v=histState(a),bars=histBars(v),cl=clipLeft(t,v.spike),songTick=(u:number)=>ALIGN+CLIPW*u;
 const randX=(k:number)=>lerp(SONG.x0+20,SONG.x1-20,hash(k*3.77+.3));
 const dots=Array.from({length:18},(_,k)=>{const P=1.5,u=((t/P+hash(k*1.3))%1+1)%1,w=smooth(v.spike,hash(k*7.1)*.7,hash(k*7.1)*.7+.3);
  const bin=Math.floor(hash(k*9.7+.4)*HB.n),x=lerp(HB_X(bin),HB_X(HB.target),w),top=HB.base-lerp(bars[bin],bars[HB.target],w),y=lerp(CLIPY+20,top-8,u*u);
  return {x,y,o:v.drops*Math.sin(Math.PI*u),c:mix(mix(C.lavender,C.pink,.45),C.yellow,w)};});
 const tc=mix(mix(C.lavender,C.yellow,v.spike),C.green,v.win);
 return <g>
  <defs><radialGradient id={`hg-${uid}`}><stop offset="0" stopColor={C.green} stopOpacity=".5"/><stop offset="1" stopColor={C.green} stopOpacity="0"/></radialGradient></defs>
  <Board x0={-338} y0={-266} x1={326} y1={170} floor={280}/>
  {/* time strips: the song (long) and your clip (short) */}
  <g opacity={v.strips}>
   <path d={rrect(SONG.x0,SONG.y-17,SONG.x1-SONG.x0,34,17)} fill="#2E2742"/>
   {Array.from({length:40},(_,i)=>{const h=8+18*Math.abs(Math.sin(i*1.7)*Math.sin(i*.43+1));return <rect key={i} x={SONG.x0+12+i*13.7} y={SONG.y-h/2} width={8} height={h} rx={3} fill={C.lavender} opacity={.4+.25*hash(i*1.9)}/>;})}
   <path d={rrect(SONG.x0,SONG.y-17,SONG.x1-SONG.x0,34,17)} fill="none" stroke={C.lavender} strokeOpacity={.6} strokeWidth={3}/>
   <g transform={`translate(${SONG.x0-22},${SONG.y}) rotate(${(t*40)%360})`}><circle r={13} fill="#07050B"/><circle r={9} fill="none" stroke="#3A3B4C" strokeWidth={1.5}/><circle r={4.5} fill={C.lavender}/></g>
   <g transform={`translate(${f1(cl)},0)`}>
    <path d={rrect(0,CLIPY-15,CLIPW,30,15)} fill={mix("#4A3A12",C.yellow,.25)}/>
    {Array.from({length:11},(_,i)=>{const h=6+14*Math.abs(Math.sin(i*2.3+.5));return <rect key={i} x={10+i*14.6} y={CLIPY-h/2} width={8} height={h} rx={3} fill={C.yellow} opacity={.75}/>;})}
    <path d={rrect(0,CLIPY-15,CLIPW,30,15)} fill="none" stroke={C.yellow} strokeWidth={3}/>
    <g transform={`translate(${CLIPW+20},${CLIPY})`}><polygon points={pts([[-9,-12],[9,-12],[0,2]])} fill={C.pink} opacity={.85}/><rect x={-1.5} y={2} width={3} height={8} fill={C.lavender}/><rect x={-6} y={9} width={12} height={2.5} fill={C.lavender}/></g>
   </g>
  </g>
  {v.lines>.003&&<g opacity={v.lines}>
   {RAND_U.map((u,k)=>{const x0=cl+CLIPW*u,o=(1-.75*v.spike);return o>.003&&<line key={`r${k}`} x1={x0} y1={CLIPY-15} x2={randX(k)} y2={SONG.y+17} stroke={C.pink} strokeWidth={2.5} strokeDasharray="5 6" opacity={o*.8}/>;})}
   {CLIP_U.map((u,k)=>{const x0=cl+CLIPW*u,x1=songTick(u);return <g key={k}><line x1={x0} y1={CLIPY-15} x2={x1} y2={SONG.y+17} stroke={mix(C.ivory,C.yellow,v.spike)} strokeWidth={3}/>
    <circle cx={x1} cy={SONG.y} r={5} fill={C.yellow}/><circle cx={x0} cy={CLIPY} r={4.5} fill={C.ivory}/></g>;})}
   {RAND_U.map((_,k)=><circle key={`d${k}`} cx={randX(k)} cy={SONG.y} r={4} fill={C.pink} opacity={1-.75*v.spike}/>)}
  </g>}
  {/* histogram of differences */}
  <line x1={HB.x0-10} y1={HB.base} x2={HB.x0+HB.n*HB.w+12} y2={HB.base} stroke={C.lavender} strokeOpacity={.7} strokeWidth={4} strokeLinecap="round"/>
  <polygon points={pts([[HB.x0+HB.n*HB.w+26,HB.base],[HB.x0+HB.n*HB.w+12,HB.base-9],[HB.x0+HB.n*HB.w+12,HB.base+9]])} fill={C.lavender} opacity={.7}/>
  {Array.from({length:HB.n},(_,i)=><line key={i} x1={HB_X(i)} y1={HB.base+4} x2={HB_X(i)} y2={HB.base+12} stroke={C.lavender} strokeOpacity={.4} strokeWidth={2}/>)}
  {v.win>.003&&<ellipse cx={HB_X(HB.target)} cy={HB.base-bars[HB.target]/2} rx={70} ry={bars[HB.target]/2+50} fill={`url(#hg-${uid})`} opacity={v.win}/>}
  {bars.map((h,i)=>{if(h<=.5)return null;const x=HB_X(i)-14,isT=i===HB.target,c=isT?tc:mix(C.lavender,C.pink,.35);
   return <Box key={i} x={x} y={HB.base-h} w={28} h={h} d={[8,-6]} front={{light:c,dark:mix(c,"#000000",.35)}} top={mix(c,"#FFFFFF",.3)} side={mix(c,"#000000",.5)}/>;})}
  {dots.map((d,k)=>d.o>.004&&<circle key={k} cx={d.x} cy={d.y} r={6} fill={d.c} opacity={d.o}/>)}
  <Check x={HB_X(HB.target)+56} y={HB.base-bars[HB.target]+24} k={v.win} r={22}/>
 </g>;
}

/* ───────────── track-card ───────────── */
export function trackState(a:number){return {reveal:smooth(a,.05,.5),check:smooth(a,.55,.9),play:smooth(a,.6,1)};}
function TrackCard({t,a,uid}:{t:number;a:number;uid:string}){
 const v=trackState(a),shU=((t*.55)%1+1)%1,shO=(1-v.reveal)*Math.sin(Math.PI*shU),sk=`tk-${uid}`;
 return <g>
  <defs><clipPath id={sk}><path d={rrect(-136,-212,272,272,18)}/></clipPath>
   <linearGradient id={`${sk}-sh`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0"/><stop offset=".5" stopColor="#FFFFFF" stopOpacity=".18"/><stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/></linearGradient>
   <radialGradient id={`${sk}-g`}><stop offset="0" stopColor={C.green} stopOpacity=".45"/><stop offset="1" stopColor={C.green} stopOpacity="0"/></radialGradient></defs>
  <Shadow w={300} y={248}/>
  <Podium y={208} rx={140} ry={22} h={26} glow={mix(C.lavender,C.green,v.check)} k={v.check}/>
  {v.check>.003&&<ellipse cx={0} cy={-60} rx={200} ry={230} fill={`url(#${sk}-g)`} opacity={v.check*(.7+.3*Math.sin(t*2))}/>}
  <polygon points={pts([[-120,152],[120,152],[96,206],[-96,206]])} fill={mix(C.lavender,C.green,v.check)} opacity={.07+.12*v.check}/>
  <g transform={`translate(0,${f1(Math.sin(t*1.3+1)*5-8)})`}>
  <Prism poly={[[-160,-236],[160,-236],[160,150],[-160,150]]} d={[14,-12]} face="#120C1D" top="#4E3D74" side="#2A2040"/>
  <path d={rrect(-160,-236,320,386,18)} fill="#1A1426"/>
  <path d={rrect(-160,-236,320,386,18)} fill="none" stroke={mix(C.lavender,C.green,v.check)} strokeOpacity={.5+.4*v.check} strokeWidth={3}/>
  <path d={rrect(-136,-212,272,272,18)} fill="#2A2238"/>
  <g clipPath={`url(#${sk})`}>{shO>.003&&<rect x={-136-120+392*shU} y={-212} width={120} height={272} fill={`url(#${sk}-sh)`} opacity={shO}/>}</g>
  <g transform={`translate(0,${f1(-76)}) scale(${(.92+.08*v.reveal).toFixed(3)}) translate(0,${f1(76)})`}><CoverArt x={-136} y={-212} s={272} t={t} uid={sk} k={v.reveal}/></g>
  {v.play>.003&&<g opacity={v.play}>{Array.from({length:6},(_,i)=>{const h=10+30*Math.abs(Math.sin(t*4.7+i*1.3));return <rect key={i} x={-120+i*15} y={44-h} width={10} height={h} rx={3} fill={C.ivory} opacity={.85}/>;})}</g>}
  <rect x={-136} y={74} width={190} height={17} rx={8.5} fill={mix("#3A3B4C",C.ivory,v.reveal)}/>
  <rect x={-136} y={102} width={124} height={12} rx={6} fill={mix("#3A3B4C",C.lavender,v.reveal)} opacity={.8}/>
  <rect x={-136} y={128} width={272} height={6} rx={3} fill="#3A3B4C"/>
  <rect x={-136} y={128} width={272*(.06+.3*v.play)} height={6} rx={3} fill={mix(C.lavender,C.green,v.check)}/>
  <circle cx={-136+272*(.06+.3*v.play)} cy={131} r={7} fill={C.ivory} opacity={v.reveal}/>
  <circle cx={112} cy={90} r={24} fill={mix("#3A3B4C",C.purple,v.reveal)}/><polygon points={pts([[104,78],[104,102],[124,90]])} fill={C.ivory} opacity={.4+.6*v.reveal}/>
  <Check x={140} y={-214} k={v.check} r={26}/>
  </g>
 </g>;
}

export function ShazamArt({kind,o,t,a,uid,overlay}:ShazamArtProps){
 if(overlay)return null;
 switch(kind){
  case "listen-phone":return <ListenPhone t={t} a={a} uid={uid}/>;
  case "noisy-bar":return <NoisyBar t={t} a={a} uid={uid}/>;
  case "sound-wave":return <SoundWave t={t} a={a} uid={uid}/>;
  case "spectrogram":return <Spectrogram t={t} a={a} o={o} uid={uid} rows={o.rows}/>;
  case "fingerprint-card":return <FingerprintCard t={t} a={a} uid={uid} rows={o.rows}/>;
  case "song-shelves":return <SongShelves t={t} a={a} uid={uid}/>;
  case "offset-histogram":return <OffsetHistogram t={t} a={a} uid={uid}/>;
  case "track-card":return <TrackCard t={t} a={a} uid={uid}/>;
 }
 return null;
}
