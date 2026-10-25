import React from "react";
import brand from "../video-design/brand.json";
import {keyed,easeSine,type IllustratedTimeline} from "../src/lib/illustrated";
import {PW_KEY_SECONDS,type PwKind} from "../src/lib/illustrated-catalog-passwords";

// Prepared objects for the "why a website never knows your password" explainer (2026-10-22). A password is a card of
// dots, a hash ("fingerprint") is a dark strip with a whorl and 12 bars of one fixed length. Patterns are fixed
// seeds, so the same input always prints the same strip and a changed input a completely different one. Illustrations,
// not to scale, no real hash values, no words or logos. Every value derives from the frame time and the keyed state.
const C=brand.colors;
export type TimedObject=IllustratedTimeline["objects"][number];
export type PwArtProps={kind:string;o:TimedObject;t:number;a:number;xray:number;uid:string;overlay?:boolean};
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
const PURP={light:C.purple,dark:"#5B3A94",top:"#A27BE0",side:"#43296E"};
const LAV={light:C.lavender,dark:"#A68BD0",top:"#F3EBFD"};
const YEL={light:C.yellow,dark:"#C99A2E",top:C.yellowLine};
const PAPER={light:C.ivory,dark:"#E2DCC0",edge:"#B4AE94"};
const rrect=(x:number,y:number,w:number,h:number,r:number)=>{const q=Math.max(0,Math.min(r,w/2,h/2));
 return `M${f1(x+q)} ${f1(y)}H${f1(x+w-q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+w)} ${f1(y+q)}V${f1(y+h-q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+w-q)} ${f1(y+h)}H${f1(x+q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x)} ${f1(y+h-q)}V${f1(y+q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+q)} ${f1(y)}Z`;};

/* ───────────── Shared drawing helpers ───────────── */
function Shadow({w,y,k=1}:{w:number;y:number;k?:number}){return <ellipse cx={0} cy={y} rx={w*.5} ry={Math.min(16,Math.max(7,w*.034))} fill="#000" opacity={.45*k}/>;}
/** Quad (TL, TR, BR, BL) in two tones split along the TR–BL diagonal: light from the top left. */
function Quad({p,light,dark}:{p:number[][];light:string;dark:string}){
 return <><polygon points={pts([p[0],p[1],p[3]])} fill={light} stroke={light} strokeWidth={.7} strokeLinejoin="round"/><polygon points={pts([p[1],p[2],p[3]])} fill={dark} stroke={dark} strokeWidth={.7} strokeLinejoin="round"/></>;
}
/** Box: front rectangle with its top and right faces (depth runs up-right). */
function Box({x,y,w,h,d,front,top,side}:{x:number;y:number;w:number;h:number;d:[number,number];front:{light:string;dark:string};top:string;side:string}){
 return <>
  <polygon points={pts([[x,y],[x+w,y],[x+w+d[0],y+d[1]],[x+d[0],y+d[1]]])} fill={top} stroke={top} strokeWidth={.7}/>
  <polygon points={pts([[x+w,y],[x+w,y+h],[x+w+d[0],y+h+d[1]],[x+w+d[0],y+d[1]]])} fill={side} stroke={side} strokeWidth={.7}/>
  <Quad p={[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]} light={front.light} dark={front.dark}/>
 </>;
}
/** Round badge that pops in: green check, pink cross, block (circle with a slash), equal or not-equal sign. */
function Badge({x,y,k,r=26,kind,color}:{x:number;y:number;k:number;r?:number;kind:"check"|"cross"|"block"|"eq"|"neq"|"warn"|"shield"|"cracked";color?:string}){
 if(k<=.003)return null;
 const c=color??(kind==="check"||kind==="shield"?C.green:kind==="eq"?C.green:C.pink),dark=mix(c,"#000000",.4),w=r*.2;
 const glyph=kind==="check"?<polyline points={pts([[-r*.44,r*.02],[-r*.1,r*.34],[r*.46,-r*.3]])} stroke={INK} strokeWidth={w*1.05} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  :kind==="cross"?<path d={`M${-r*.36} ${-r*.36}L${r*.36} ${r*.36}M${r*.36} ${-r*.36}L${-r*.36} ${r*.36}`} stroke={INK} strokeWidth={w} strokeLinecap="round"/>
  :kind==="block"?<><circle r={r*.52} fill="none" stroke={INK} strokeWidth={w*.9}/><path d={`M${-r*.37} ${r*.37}L${r*.37} ${-r*.37}`} stroke={INK} strokeWidth={w*.9} strokeLinecap="round"/></>
  :kind==="eq"||kind==="neq"?<><path d={`M${-r*.42} ${-r*.17}H${r*.42}M${-r*.42} ${r*.17}H${r*.42}`} stroke={INK} strokeWidth={w} strokeLinecap="round"/>{kind==="neq"&&<path d={`M${r*.24} ${-r*.5}L${-r*.24} ${r*.5}`} stroke={INK} strokeWidth={w*.9} strokeLinecap="round"/>}</>
  :kind==="warn"?<><rect x={-w*.45} y={-r*.42} width={w*.9} height={r*.5} rx={w*.4} fill={INK}/><circle cx={0} cy={r*.34} r={w*.55} fill={INK}/></>
  :kind==="shield"?<><path d={`M0 ${-r*.55}L${r*.44} ${-r*.36}V${r*.02}C${r*.44} ${r*.3} ${r*.2} ${r*.48} 0 ${r*.6}C${-r*.2} ${r*.48} ${-r*.44} ${r*.3} ${-r*.44} ${r*.02}V${-r*.36}Z`} fill={INK}/><polyline points={pts([[-r*.2,r*.02],[-r*.04,r*.18],[r*.22,-r*.14]])} stroke={c} strokeWidth={w*.7} fill="none" strokeLinecap="round"/></>
  :<><path d={rrect(-r*.36,-r*.06,r*.72,r*.56,r*.1)} fill={INK}/><path d={`M${-r*.22} ${-r*.06}V${-r*.24}A${r*.22} ${r*.22} 0 0 1 ${r*.2} ${-r*.36}`} stroke={INK} strokeWidth={w*.7} fill="none" strokeLinecap="round"/><path d={`M${-r*.05} ${r*.04}L${r*.06} ${r*.2}L${-r*.04} ${r*.4}`} stroke={c} strokeWidth={w*.4} fill="none"/></>;
 return <g opacity={clamp01(k*1.6)} transform={`translate(${f1(x)},${f1(y)}) scale(${(.55+.45*k).toFixed(3)})`}>
  <circle r={r*1.32} fill={c} opacity={.18}/>
  {kind==="warn"?<polygon points={pts([[0,-r*1.05],[r*1.02,r*.78],[-r*1.02,r*.78]])} fill={c} stroke={dark} strokeWidth={3} strokeLinejoin="round"/>:<><circle r={r} fill={c}/><path d={`M ${r} 0 A ${r} ${r} 0 0 1 ${-r*.7} ${r*.7}`} fill="none" stroke={dark} strokeWidth={r*.16} opacity={.55}/></>}
  {glyph}
 </g>;
}
/** Gear with square-ish teeth: the teeth and bolt holes turn, the light from the top left stays put. */
function Gear({x,y,r,teeth,angle,light=METAL.hi,dark=METAL.lo,hub=INK}:{x:number;y:number;r:number;teeth:number;angle:number;light?:string;dark?:string;hub?:string}){
 const p:number[][]=[];for(let i=0;i<teeth;i++){const a0=i/teeth*2*Math.PI,s=Math.PI/teeth;
  for(const [an,rad] of [[a0-s*.5,r*.8],[a0-s*.32,r],[a0+s*.32,r],[a0+s*.5,r*.8]] as const)p.push([Math.cos(an)*rad,Math.sin(an)*rad]);}
 const q=r*.8,d=Math.SQRT1_2*q,rot=`rotate(${(angle%360).toFixed(2)})`;
 return <g transform={`translate(${f1(x)},${f1(y)})`}>
  <polygon points={pts(p)} fill={mix(dark,light,.35)} transform={rot}/>
  <path d={`M${f1(d)} ${f1(-d)}A${f1(q)} ${f1(q)} 0 0 0 ${f1(-d)} ${f1(d)}Z`} fill={light}/>
  <path d={`M${f1(-d)} ${f1(d)}A${f1(q)} ${f1(q)} 0 0 0 ${f1(d)} ${f1(-d)}Z`} fill={dark}/>
  <circle r={r*.58} fill={mix(dark,light,.5)}/>
  <g transform={rot}>{[0,1,2,3,4].map(i=>{const an=i/5*2*Math.PI;return <circle key={i} cx={f1(Math.cos(an)*r*.38)} cy={f1(Math.sin(an)*r*.38)} r={f1(r*.1)} fill={dark}/>;})}
   <rect x={-r*.05} y={-r*.58} width={r*.1} height={r*.16} fill={dark}/></g>
  <circle r={r*.2} fill={hub}/>
 </g>;
}

/* ───────────── Fingerprint strips and password cards ───────────── */
export const FP_N=12;
/** The user's password and its fingerprint pattern: shared by the machine, the database and the phone. */
export const SEED_A=7.3,SEED_B=19.9;
export function fpPattern(seed:number){return Array.from({length:FP_N},(_,i)=>.16+.84*hash(seed*17.31+i*5.113+.71));}
/** Bar i of a strip re-rolling from one pattern to another: a wave from left to right. */
export const fpMorph=(m:number,i:number)=>smooth(m,i/FP_N*.5,i/FP_N*.5+.5);
/** How different two patterns look (mean absolute bar difference, 0..1). */
export const fpDistance=(p:number[],q:number[])=>p.reduce((s,v,i)=>s+Math.abs(v-q[i]),0)/p.length;
type StripProps={x:number;y:number;w:number;h:number;from:number[];to?:number[];morph?:number;print?:number;tint?:string;tintK?:number;glow?:number;dim?:number;uid:string;whorl?:number};
/** One fingerprint: a dark strip of one fixed length with a whorl and 12 bars. `print` slides it out of a slot at x. */
function Strip({x,y,w,h,from,to=from,morph=0,print=1,tint=C.green,tintK=0,glow=0,dim=0,uid,whorl=0}:StripProps){
 if(print<=.002)return null;
 const line=mix(C.yellowLine,tint,tintK),x0=x-(1-print)*w,clip=`fpc-${uid}`,cy=y+h/2,R=h*.36,wx=x0+h*.55;
 const bars=from.map((v,i)=>lerp(v,to[i],fpMorph(morph,i)));
 const x1=x0+h*1.05,x2=x0+w-h*.3,pitch=(x2-x1)/FP_N,bw=pitch*.56;
 const tones=[C.yellow,C.yellowLine,YEL.dark].map(c=>mix(c,tint,tintK*.85));
 return <g opacity={clamp01(print*12)*(1-.6*dim)}>
  {print<.999&&<defs><clipPath id={clip}><rect x={x} y={y-14} width={w+12} height={h+28}/></clipPath></defs>}
  <g clipPath={print<.999?`url(#${clip})`:undefined}>
   {glow>.003&&<path d={rrect(x0-10,y-10,w+20,h+20,h*.4)} fill={mix(C.yellow,tint,tintK)} opacity={.28*glow}/>}
   <polygon points={pts([[x0+6,y],[x0+w,y],[x0+w+6,y-5],[x0+12,y-5]])} fill={mix("#3A2C55",line,.25)}/>
   <polygon points={pts([[x0+w,y+2],[x0+w+6,y-4],[x0+w+6,y+h-6],[x0+w,y+h]])} fill="#2A2040"/>
   <path d={rrect(x0,y,w,h,h*.22)} fill={INK} stroke={line} strokeWidth={3}/>
   <g transform={`rotate(${f1(whorl)},${f1(wx)},${f1(cy)})`} stroke={line} strokeWidth={Math.max(2,h*.06)} fill="none" strokeLinecap="round">
    {[.32,.62,.95].map((k,i)=>{const r=R*k,a0=(40+i*70)*D,a1=a0+(260-i*30)*D;
     return <path key={i} d={`M${f1(wx+Math.cos(a0)*r)} ${f1(cy+Math.sin(a0)*r)}A${f1(r)} ${f1(r)} 0 1 1 ${f1(wx+Math.cos(a1)*r)} ${f1(cy+Math.sin(a1)*r)}`}/>;})}
   </g>
   {bars.map((v,i)=>{const bh=Math.max(3,v*(h-14));return <rect key={i} x={x1+i*pitch+(pitch-bw)/2} y={cy-bh/2} width={bw} height={bh} rx={Math.min(bw/2,3)} fill={tones[Math.floor(hash(i*3.1+1.3)*3)]}/>;})}
  </g>
 </g>;
}
type CardProps={x:number;y:number;w?:number;h?:number;n?:number;odd?:number;oddK?:number;squig?:number;k?:number;dot?:string;tone?:string;seed?:number;lock?:boolean};
/** A password: an ivory card with a small lock and n hidden characters (dots). `odd` swaps one dot for a pink
 *  diamond (one changed letter); `squig` turns the dots into handwritten strokes (the password readable). */
function Card({x,y,w=160,h=44,n=8,odd=-1,oddK=0,squig=0,k=1,dot=INK,tone=PAPER.light,seed=0,lock=true}:CardProps){
 if(k<=.003)return null;
 const x1=x+(lock?h*1.0:h*.45),x2=x+w-h*.4,pitch=(x2-x1)/Math.max(1,n),r=Math.min(h*.12,pitch*.3),cy=y+h/2;
 return <g opacity={clamp01(k)}>
  <path d={rrect(x+3,y+4,w,h,h*.3)} fill="#000" opacity={.25}/>
  <path d={rrect(x,y,w,h,h*.3)} fill={tone}/>
  <path d={`M${f1(x+w*.62)} ${f1(y)}H${f1(x+w-h*.3)}A${f1(h*.3)} ${f1(h*.3)} 0 0 1 ${f1(x+w)} ${f1(y+h*.3)}V${f1(y+h-h*.3)}A${f1(h*.3)} ${f1(h*.3)} 0 0 1 ${f1(x+w-h*.3)} ${f1(y+h)}H${f1(x+w*.38)}Z`} fill={PAPER.dark} opacity={.55}/>
  <path d={rrect(x,y,w,h,h*.3)} fill="none" stroke={PAPER.edge} strokeWidth={2}/>
  {lock&&<g transform={`translate(${f1(x+h*.5)},${f1(cy)})`}>
   <path d={`M${-h*.13} ${-h*.02}V${-h*.13}A${h*.13} ${h*.13} 0 0 1 ${h*.13} ${-h*.13}V${-h*.02}`} stroke={C.purple} strokeWidth={h*.07} fill="none"/>
   <path d={rrect(-h*.19,-h*.04,h*.38,h*.27,h*.05)} fill={C.purple}/>
  </g>}
  {Array.from({length:n},(_,i)=>{const cx=x1+pitch*(i+.5),isOdd=i===odd,dk=isOdd?1-oddK:1,dotK=dk*(1-squig);
   const sq=Array.from({length:4},(_,j)=>[cx+(hash(seed*9.1+i*3.7+j)-.5)*pitch*.62,cy+(j/3-.5)*h*.42+(hash(seed*5.3+i*1.9+j*2.1)-.5)*h*.12]);
   return <g key={i}>
    {dotK>.003&&<circle cx={cx} cy={cy} r={r} fill={dot} opacity={dotK}/>}
    {isOdd&&oddK>.003&&<polygon points={pts([[cx,cy-r*1.6],[cx+r*1.3,cy],[cx,cy+r*1.6],[cx-r*1.3,cy]])} fill={C.pink} opacity={oddK} transform={`rotate(${f1(20*(1-oddK))},${f1(cx)},${f1(cy)})`}/>}
    {squig>.003&&<polyline points={pts(sq)} fill="none" stroke={mix(INK,C.pink,.35)} strokeWidth={Math.max(2.5,h*.07)} strokeLinecap="round" strokeLinejoin="round" opacity={squig}/>}
   </g>;})}
 </g>;
}
/** Small person avatar (head and shoulders) in a ring. */
function Avatar({x,y,r,ring=C.lavender,k=1}:{x:number;y:number;r:number;ring?:string;k?:number}){
 if(k<=.003)return null;
 return <g opacity={k}><circle cx={x} cy={y} r={r} fill="#2A2340" stroke={ring} strokeWidth={Math.max(2,r*.12)}/>
  <circle cx={x} cy={y-r*.22} r={r*.3} fill={ring}/><path d={`M${f1(x-r*.55)} ${f1(y+r*.62)}C${f1(x-r*.5)} ${f1(y+r*.12)} ${f1(x+r*.5)} ${f1(y+r*.12)} ${f1(x+r*.55)} ${f1(y+r*.62)}Z`} fill={ring}/></g>;
}
/** Integral of speed(a(s)) from the object's entry to t, using the renderer's keyed curve for this kind. */
export function integrate(t:number,o:Keyed,kind:PwKind,speed:(a:number)=>number){
 const keys=o.activeKeys??[],dur=PW_KEY_SECONDS[kind],start=Math.min(t,o.enterAt??0),dt=1/30;let x=0;
 for(let s=start;s<t;s+=dt){const h=Math.min(dt,t-s),m=s+h/2;x+=speed(keyed(m,keys,0,dur,easeSine))*h;}
 return x;
}

/* ───────────── Login phone ───────────── */
export function phoneState(a:number,rows=1){
 if(rows===2)return {user:smooth(a,.04,.3),type:0,press:win(a,.5,.7,.7,.9),send:0,check:0,paste:smooth(a,.08,.44),reject:smooth(a,.62,.9),shake:win(a,.58,.74,.8,.96)};
 return {user:smooth(a,.02,.2),type:smooth(a,.04,.3),press:win(a,.34,.5,.5,.66),send:smooth(a,.4,.64),check:smooth(a,.7,.94),paste:0,reject:0,shake:0};
}
const PH={x:-118,y:-262,w:236,h:470},SC={x:-104,y:-248,w:208,h:442};
function LoginPhone({t,a,o,uid}:{t:number;a:number;o:TimedObject;uid:string}){
 const rows=Math.max(1,Math.min(2,Math.round(o.rows||1))),v=phoneState(a,rows),scr=`lps-${uid}`;
 const field=mix(mix(C.lavender,C.green,v.check),C.pink,v.reject),shake=9*Math.sin(t*36)*v.shake;
 const typed=v.type*8,caretX=-70+Math.min(8,typed)*18.6+6,blink=.5+.5*Math.sin(t*6.5);
 const cap={x:lerp(40,150,smooth(v.send,.4,.9)),y:lerp(-37,-96,smooth(v.send,.4,.9)),k:smooth(v.send,.08,.3)*(1-smooth(v.send,.72,1))};
 const press=1-.06*v.press,btn=mix(mix(C.purple,"#A880EE",v.press),C.green,v.check);
 const lift=14*v.check;
 return <g>
  <defs><clipPath id={scr}><path d={rrect(SC.x,SC.y,SC.w,SC.h,26)}/></clipPath>
   <linearGradient id={`lpg-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A2340"/><stop offset=".55" stopColor="#1E1832"/><stop offset="1" stopColor="#15102A"/></linearGradient></defs>
  <Shadow w={270} y={258}/>
  <polygon points={pts([[-64,206],[64,206],[86,236],[-86,236]])} fill={METAL.mid}/>
  <polygon points={pts([[-64,206],[0,206],[-20,236],[-86,236]])} fill={METAL.top} opacity={.6}/>
  <Box x={-112} y={236} w={224} h={14} d={[14,-10]} front={{light:METAL.top,dark:METAL.lo}} top={METAL.hi} side={METAL.dark}/>
  <path d={rrect(PH.x+8,PH.y+6,PH.w,PH.h,38)} fill="#000" opacity={.3}/>
  <path d={rrect(PH.x,PH.y,PH.w,PH.h,38)} fill="#45465A"/>
  <path d={`M${PH.x+PH.w-30} ${PH.y}H${PH.x+PH.w-38}A38 38 0 0 1 ${PH.x+PH.w} ${PH.y+38}V${PH.y+PH.h-38}A38 38 0 0 1 ${PH.x+PH.w-38} ${PH.y+PH.h}H${PH.x+40}Z`} fill="#26273A" opacity={.9}/>
  <path d={rrect(PH.x,PH.y,PH.w,PH.h,38)} fill="none" stroke={C.purpleStroke} strokeOpacity={.55} strokeWidth={3}/>
  <rect x={PH.x-5} y={PH.y+96} width={6} height={44} rx={3} fill="#5E5F74"/><rect x={PH.x-5} y={PH.y+150} width={6} height={64} rx={3} fill="#5E5F74"/><rect x={PH.x+PH.w-1} y={PH.y+120} width={6} height={70} rx={3} fill="#2E2F42"/>
  <path d={rrect(SC.x,SC.y,SC.w,SC.h,26)} fill={`url(#lpg-${uid})`}/>
  <g clipPath={`url(#${scr})`}>
   <rect x={SC.x} y={SC.y} width={SC.w} height={SC.h} fill={C.green} opacity={.13*v.check}/>
   <rect x={SC.x} y={SC.y} width={SC.w} height={SC.h} fill={C.pink} opacity={.12*v.reject}/>
   {(()=>{const sx=-300+((t*70)%700);return <polygon points={pts([[sx,SC.y],[sx+50,SC.y],[sx-110,SC.y+SC.h],[sx-160,SC.y+SC.h]])} fill="#FFFFFF" opacity={.05}/>;})()}
   <rect x={-90} y={-238} width={34} height={6} rx={3} fill={C.lavender} opacity={.45}/>
   {[0,1,2].map(i=><circle key={i} cx={58+i*12} cy={-235} r={3.4} fill={C.lavender} opacity={i===2?.35+.3*blink:.5}/>)}
   <circle cx={0} cy={-226} r={5} fill="#07050B"/>
   <Avatar x={0} y={-166} r={36} ring={mix(C.lavender,C.green,v.check)}/>
   <path d={rrect(-86,-114,172,40,10)} fill="#1B1530" stroke={C.lavender} strokeOpacity={.4} strokeWidth={2}/>
   {[[-74,40],[-28,24],[2,34]].map(([x,w],i)=>{const k=smooth(v.user*3-i,0,1);return k>.003?<rect key={i} x={x} y={-98} width={w*k} height={8} rx={4} fill={C.lavender} opacity={.75}/>:null;})}
   <g transform={`translate(${f1(shake)},0)`}>
    <path d={rrect(-86,-60,172,46,10)} fill="#1B1530" stroke={field} strokeOpacity={.55+.45*Math.max(v.check,v.reject)} strokeWidth={2.5+2*Math.max(v.check,v.reject)}/>
    {Array.from({length:8},(_,i)=>{const k=smooth(typed-i,0,1);return k>.003?<circle key={i} cx={-66+i*18.6} cy={-37} r={6.5*(.6+.4*k)} fill={C.ivory} opacity={k}/>:null;})}
    {rows===1&&v.send<.2&&<rect x={caretX} y={-50} width={3} height={26} rx={1.5} fill={C.lavender} opacity={blink*(1-smooth(v.send,0,.2))*(1-v.check)}/>}
    {rows===2&&<rect x={-70} y={-50} width={3} height={26} rx={1.5} fill={C.lavender} opacity={blink*(1-v.paste)}/>}
    {rows===2&&v.paste>.003&&<g opacity={clamp01(v.paste*4)} transform={`translate(${f1(lerp(170,0,v.paste))},0)`}><Strip x={-78} y={-52} w={150} h={30} from={fpPattern(SEED_A)} print={1} tint={C.pink} tintK={v.reject} uid={`${uid}-paste`} glow={.4*v.reject}/></g>}
   </g>
   <g transform={`translate(0,28) scale(${press.toFixed(3)}) translate(0,-28)`}>
    <path d={rrect(-86,4,172,48,24)} fill={btn}/>
    <path d={rrect(-86,4,172,24,12)} fill="#FFFFFF" opacity={.12}/>
    <path d="M -14 28 H 10 M 0 17 L 12 28 L 0 39" stroke={C.ivory} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={1-v.check}/>
    <polyline points="-14,28 -4,38 14,18" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={v.check}/>
   </g>
   <rect x={-34} y={74} width={68} height={4} rx={2} fill={C.lavender} opacity={.4}/>
   <g transform="translate(0,146)">
    <path d={`M -14 -6 V ${-18-lift} A 14 14 0 0 1 14 ${-18-lift} V ${-12-lift}`} stroke={mix(mix(C.lavender,C.green,v.check),C.pink,v.reject)} strokeWidth={6} fill="none" strokeLinecap="round" transform={`rotate(${f1(-18*v.check)},-14,-6)`}/>
    <path d={rrect(-22,-8,44,34,7)} fill={mix(mix(C.lavender,C.green,v.check),C.pink,v.reject)}/>
    <circle cx={0} cy={6} r={5} fill={INK}/><rect x={-2} y={6} width={4} height={10} fill={INK}/>
   </g>
   {cap.k>.003&&<g opacity={cap.k} transform={`translate(${f1(cap.x)},${f1(cap.y)}) scale(${(.7+.3*cap.k).toFixed(3)})`}>
    <path d={rrect(-30,-12,60,24,12)} fill={C.yellow}/><path d={rrect(-30,-12,60,12,6)} fill={C.yellowLine} opacity={.7}/>
    {[0,1,2].map(i=><circle key={i} cx={-12+i*12} cy={0} r={3.5} fill={INK}/>)}
   </g>}
   {v.send>.02&&v.send<.98&&[0,1,2].map(i=>{const u=(t*1.6+i/3)%1;return <circle key={i} cx={lerp(50,150,u)} cy={lerp(-40,-96,u)} r={3} fill={C.yellow} opacity={.6*Math.sin(Math.PI*u)*win(v.send,.3,.45,.8,.95)}/>;})}
  </g>
  <Badge x={84} y={-236} k={v.check} kind="check" r={28}/>
  <Badge x={84} y={-236} k={v.reject} kind="cross" r={28}/>
 </g>;
}

/* ───────────── Hash machine ───────────── */
export function grinderState(a:number){
 return {
  drop1:smooth(a,.02,.12),print1:smooth(a,.09,.23),
  drop2:smooth(a,.27,.37),shift:smooth(a,.27,.37),print2:smooth(a,.34,.47),eq:smooth(a,.4,.49)*(1-smooth(a,.5,.6)),
  drop3:smooth(a,.52,.62),morph:smooth(a,.6,.73),neq:smooth(a,.64,.74)*(1-smooth(a,.76,.86)),
  back:smooth(a,.77,.89),jam:smooth(a,.85,.97),settle:smooth(a,.8,.95),
 };
}
const busy1=(a:number)=>Math.max(win(a,.03,.1,.18,.25),win(a,.28,.35,.43,.5),win(a,.53,.6,.68,.75));
/** Gear speed in °/s for the explanation (rows 1): idle, grinding during each print, a short backwards jerk. */
export const grinderSpeed=(a:number)=>24+170*busy1(a)-160*win(a,.78,.82,.86,.9);
/** Cards per second for the continuous mill (rows 2). */
export const millRate=(a:number)=>2.6*Math.pow(clamp01(a),1.7);
const ROW0=36,ROW1=128,SLOT_X=96,STRIP_W=210,STRIP_H=50,WC={x:-96,y:40,R:86};
const dropPose=(u:number)=>({y:lerp(-256,-150,u*u),s:lerp(1,.62,u),k:smooth(u,0,.12)*(1-smooth(u,.62,.95))});
function HashGrinder({t,a,o,uid,xray,overlay}:{t:number;a:number;o:TimedObject;uid:string;xray:number;overlay?:boolean}){
 const rows=Math.max(1,Math.min(2,Math.round(o.rows||1)));
 if(overlay)return xray>.01?<GrinderXray t={t} xray={xray}/>:null;
 const A=fpPattern(SEED_A),B=fpPattern(SEED_B),win1=`hgw-${uid}`;
 let angle:number,lamp:string,jitter=0;
 const parts:React.ReactNode[]=[],cards:React.ReactNode[]=[];
 if(rows===2){
  const phase=integrate(t,o,"hash-grinder",millRate),n=Math.floor(phase),u=phase-n;
  angle=integrate(t,o,"hash-grinder",x=>24+260*millRate(x));
  const d=dropPose(smooth(u,0,.4));
  cards.push(<g key="c" opacity={d.k} transform={`translate(-105,${f1(d.y)}) scale(${d.s.toFixed(3)})`}><Card x={-80} y={-22} w={160} h={44} n={5+Math.floor(hash(n*1.7)*4)} seed={n}/></g>);
  const pr=smooth(u,.35,.75),off=smooth(u,.78,1);
  parts.push(<g key="s" opacity={1-off} transform={`translate(${f1(40*off)},0)`}><Strip x={SLOT_X} y={ROW0} w={STRIP_W} h={STRIP_H} from={fpPattern(31+n*7.7)} print={pr} uid={`${uid}-m`} glow={win(u,.6,.7,.75,.85)*.6}/></g>);
  lamp=mix(C.lavender,C.yellow,smooth(millRate(a),.05,.4));
 }else{
  const v=grinderState(a);
  angle=integrate(t,o,"hash-grinder",grinderSpeed);
  jitter=3*Math.sin(t*52)*win(a,.85,.89,.93,.99);
  for(const [u,odd] of [[v.drop1,-1],[v.drop2,-1],[v.drop3,3]] as const){const d=dropPose(u);if(d.k>.003)cards.push(<g key={`${u}-${odd}-${cards.length}`} opacity={d.k} transform={`translate(-105,${f1(d.y)}) scale(${d.s.toFixed(3)})`}><Card x={-80} y={-22} w={160} h={44} odd={odd} oddK={odd>=0?1:0}/></g>);}
  const y1=lerp(ROW0,ROW1,v.shift*(1-v.settle));
  parts.push(<Strip key="r1" x={SLOT_X} y={y1} w={STRIP_W} h={STRIP_H} from={A} print={v.print1} uid={`${uid}-r1`} tint={C.green} tintK={v.eq} glow={Math.max(v.eq,win(a,.16,.21,.24,.3))}/>);
  if(v.settle<.999)parts.push(<g key="r2" opacity={1-v.settle}><Strip x={SLOT_X} y={ROW0} w={STRIP_W} h={STRIP_H} from={A} to={B} morph={v.morph} print={v.print2} uid={`${uid}-r2`} tint={v.morph>.5?C.pink:C.green} tintK={Math.max(v.eq,v.neq)} glow={Math.max(v.eq,v.neq)}/></g>);
  parts.push(<Badge key="eq" x={SLOT_X+STRIP_W/2} y={(ROW0+STRIP_H+ROW1)/2} k={v.eq} kind="eq" r={17}/>);
  parts.push(<Badge key="neq" x={SLOT_X+STRIP_W/2} y={(ROW0+STRIP_H+ROW1)/2} k={v.neq} kind="neq" r={17}/>);
  if(v.back>.003){const path="M 236 30 C 250 -150, 30 -238, -100 -236";
   parts.push(<g key="back" opacity={clamp01(v.back*2)}>
    <path d={path} stroke={C.pink} strokeOpacity={.25} strokeWidth={14} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${v.back.toFixed(3)} 2`}/>
    <path d={path} stroke={C.pink} strokeWidth={5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${v.back.toFixed(3)} 2`}/>
    {v.back>.96&&<polygon points={pts([[-100,-236],[-80,-250],[-82,-222]])} fill={C.pink} opacity={smooth(v.back,.96,1)}/>}
   </g>);
   parts.push(<Badge key="block" x={122} y={-171} k={v.jam} kind="block" r={26}/>);}
  lamp=mix(mix(C.lavender,C.yellow,busy1(a)),C.pink,v.jam);
 }
 const g1=angle,g2=-angle*54/32+11;
 return <g>
  <defs><clipPath id={win1}><circle cx={WC.x} cy={WC.y} r={WC.R-6}/></clipPath></defs>
  <Shadow w={600} y={258}/>
  {[-236,34].map(x=><g key={x}><Box x={x} y={186} w={34} h={56} d={[12,-9]} front={{light:METAL.mid,dark:METAL.lo}} top={METAL.top} side={METAL.dark}/><rect x={x-10} y={238} width={54} height={10} rx={4} fill={METAL.dark}/></g>)}
  {/* hopper back opening */}
  <polygon points={pts([[-192,-232],[-18,-232],[-6,-246],[-180,-246]])} fill="#07050B"/>
  <polygon points={pts([[-180,-246],[-6,-246],[-60,-114],[-120,-114]])} fill="#1A1424"/>
  {cards}
  <polygon points={pts([[-192,-232],[-18,-232],[-78,-104],[-132,-104]])} fill={METAL.top}/>
  <polygon points={pts([[-105,-232],[-18,-232],[-78,-104],[-105,-104]])} fill={METAL.lo}/>
  <polygon points={pts([[-18,-232],[-6,-246],[-66,-116],[-78,-104]])} fill={METAL.dark}/>
  <rect x={-196} y={-236} width={182} height={7} rx={3} fill={METAL.hi}/>
  <Box x={-262} y={-104} w={340} h={290} d={[22,-16]} front={PURP} top={PURP.top} side={PURP.side}/>
  <rect x={-262} y={-104} width={340} height={6} fill={C.lavender} opacity={.3}/>
  {[0,1,2,3,4].map(i=><rect key={i} x={6} y={-74+i*16} width={54} height={6} rx={3} fill={INK} opacity={.45}/>)}
  <rect x={-262} y={128} width={340} height={3} fill={INK} opacity={.35}/>
  {[[-250,-92],[66,-92],[-250,174],[66,174]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r={5} fill={PURP.dark}/><circle cx={x-1.2} cy={y-1.2} r={2} fill={PURP.top}/></g>)}
  <g transform="translate(-206,156)">
   <path d={rrect(-36,-16,72,32,8)} fill={INK} stroke={PURP.top} strokeOpacity={.5} strokeWidth={2}/>
   <g stroke={C.yellow} strokeWidth={2.4} fill="none" strokeLinecap="round">{[5,9,13].map((r,i)=><path key={i} d={`M${-20+r*Math.cos((40+i*70)*D)} ${r*Math.sin((40+i*70)*D)}A${r} ${r} 0 1 1 ${-20+r*Math.cos((300+i*40)*D)} ${r*Math.sin((300+i*40)*D)}`}/>)}</g>
   {[0,1,2,3,4,5].map(i=><rect key={i} x={-2+i*6} y={-8+((i*7)%5)*1.6} width={3} height={16-((i*7)%5)*3.2} rx={1.5} fill={C.yellow}/>)}
  </g>
  {/* crank */}
  <rect x={-292} y={34} width={32} height={12} fill={METAL.lo}/>
  <g transform={`translate(-292,40) rotate(${((angle*.5)%360).toFixed(2)})`}>
   <circle r={34} fill={METAL.mid} stroke={METAL.hi} strokeWidth={5}/>
   {[0,1,2,3,4].map(i=><line key={i} x1={0} y1={0} x2={Math.cos(i*72*D)*30} y2={Math.sin(i*72*D)*30} stroke={METAL.lo} strokeWidth={6}/>)}
   <circle r={9} fill={METAL.hi}/>
   <rect x={22} y={-6} width={16} height={12} rx={4} fill={METAL.top}/><circle cx={32} cy={0} r={8} fill={C.lavender}/>
  </g>
  {/* window with gears */}
  <circle cx={WC.x} cy={WC.y} r={WC.R} fill={INK}/>
  <g clipPath={`url(#${win1})`} transform={`translate(${f1(jitter)},0)`}>
   <circle cx={WC.x} cy={WC.y} r={WC.R} fill="#0B0814"/>
   <circle cx={-84} cy={46} r={70} fill={rows===2?C.yellow:mix(C.yellow,C.pink,clamp01((a-.76)*8))} opacity={(rows===2?.18*smooth(millRate(a),.05,.6):.22*Math.max(busy1(a),win(a,.84,.88,.94,.99)))*(.8+.2*Math.sin(t*9))}/>
   <Gear x={-118} y={18} r={54} teeth={12} angle={g1} light={METAL.hi} dark={METAL.mid}/>
   <Gear x={-52} y={74} r={32} teeth={8} angle={g2} light={C.lavender} dark={LAV.dark}/>
   <ellipse cx={-130} cy={-10} rx={70} ry={26} fill="#FFFFFF" opacity={.06} transform={`rotate(-30,-130,-10)`}/>
  </g>
  <circle cx={WC.x} cy={WC.y} r={WC.R} fill="none" stroke={METAL.hi} strokeWidth={10}/>
  <path d={`M${WC.x-WC.R*.85} ${WC.y-WC.R*.5}A${WC.R} ${WC.R} 0 0 1 ${WC.x+WC.R*.3} ${WC.y-WC.R*.95}`} stroke="#FFFFFF" strokeOpacity={.25} strokeWidth={4} fill="none"/>
  {Array.from({length:8},(_,i)=>{const an=i/8*2*Math.PI;return <circle key={i} cx={WC.x+Math.cos(an)*WC.R} cy={WC.y+Math.sin(an)*WC.R} r={3.2} fill={METAL.lo}/>;})}
  {/* slot and lamp */}
  <polygon points={pts([[78,28],[100,12],[100,80],[78,96]])} fill="#07050B"/>
  <polygon points={pts([[78,28],[100,12],[100,18],[78,34]])} fill={C.yellow} opacity={.25+.35*Math.sin(t*2.2)**2}/>
  <circle cx={46} cy={-118} r={22} fill={lamp} opacity={.18}/>
  <path d="M 30 -112 A 16 16 0 0 1 62 -112 Z" fill={lamp}/>
  <rect x={26} y={-114} width={40} height={6} rx={3} fill={METAL.lo}/>
  {parts}
 </g>;
}
/** X-ray: the one-way path (yellow chevrons forward) and the blocked way back. */
function GrinderXray({t,xray}:{t:number;xray:number}){
 const route=[[-105,-226],[-105,-104],[-96,40],[96,60],[300,60]],L:number[]=[0];
 for(let i=1;i<route.length;i++)L.push(L[i-1]+Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]));
 const at=(s:number)=>{const d=s*L.at(-1)!;let i=1;while(i<L.length-1&&L[i]<d)i++;const k=(d-L[i-1])/(L[i]-L[i-1]),p=route[i-1],q=route[i];return {x:lerp(p[0],q[0],k),y:lerp(p[1],q[1],k),an:Math.atan2(q[1]-p[1],q[0]-p[0])};};
 return <g opacity={xray}>
  <polyline points={pts(route)} fill="none" stroke={C.yellow} strokeOpacity={.35} strokeWidth={4} strokeDasharray="6 10"/>
  {Array.from({length:9},(_,k)=>{const s=(t*.18+k/9)%1,p=at(s),fade=Math.sin(Math.PI*s);return <polygon key={k} points={pts([[p.x+Math.cos(p.an)*13,p.y+Math.sin(p.an)*13],[p.x+Math.cos(p.an+2.5)*11,p.y+Math.sin(p.an+2.5)*11],[p.x+Math.cos(p.an-2.5)*11,p.y+Math.sin(p.an-2.5)*11]])} fill={C.yellow} opacity={fade}/>;})}
  <path d="M 250 98 C 120 210, -220 200, -230 -150" fill="none" stroke={C.pink} strokeWidth={4} strokeDasharray="10 12" opacity={.8}/>
  <Badge x={-35} y={147} k={1} kind="block" r={22}/>
 </g>;
}

/* ───────────── Site database ───────────── */
export function vaultState(a:number){
 return {store:smooth(a,.03,.22),storeGlow:win(a,.12,.2,.26,.34),cmp:smooth(a,.28,.4),match:smooth(a,.38,.47)*(1-smooth(a,.52,.6)),merge:smooth(a,.46,.56),
  alarm:smooth(a,.52,.62),sack:smooth(a,.55,.66),steal:[0,1,2,3,4].map(i=>smooth(a,.58+.075*i,.68+.075*i))};
}
const VC={x:-150,top:-196,bot:172,rx:116,ry:32},LEDGER={x:-8,y:-232,w:300,h:354},ROWY=(i:number)=>-196+i*62,SACK={x:226,y:212};
const ellX=(an:number)=>VC.x+Math.cos(an)*VC.rx,ellY=(y:number,an:number)=>y+Math.sin(an)*VC.ry;
function HashVault({t,a,uid}:{t:number;a:number;uid:string}){
 const v=vaultState(a),seam=mix(mix(C.lavender,C.green,v.match),C.pink,v.alarm),pulse=.6+.4*Math.sin(t*(3+5*v.alarm));
 const strips=[11,12,13,14].map(s=>fpPattern(s)),A=fpPattern(SEED_A);
 const facets=Array.from({length:10},(_,i)=>{const a0=Math.PI*i/10,a1=Math.PI*(i+1)/10,mid=(a0+a1)/2,lit=clamp01(.5+.6*Math.cos(mid+.5));
  return <polygon key={i} points={pts([[ellX(Math.PI-a0),ellY(VC.top,a0)],[ellX(Math.PI-a1),ellY(VC.top,a1)],[ellX(Math.PI-a1),ellY(VC.bot,a1)],[ellX(Math.PI-a0),ellY(VC.bot,a0)]])} fill={mix("#3A2C55","#9C88C8",lit)} stroke={mix("#3A2C55","#9C88C8",lit)} strokeWidth={.8}/>;});
 const cap=Array.from({length:20},(_,i)=>{const an=i/20*2*Math.PI;return [ellX(an),ellY(VC.top,an)];});
 const arc=(y:number)=>`M${VC.x-VC.rx} ${y}A${VC.rx} ${VC.ry} 0 0 0 ${VC.x+VC.rx} ${y}`;
 const broken=v.alarm;
 return <g>
  <Shadow w={560} y={262}/>
  {/* cylinder */}
  <ellipse cx={VC.x} cy={VC.bot+16} rx={VC.rx+16} ry={VC.ry+8} fill={METAL.lo}/>
  <path d={`M${VC.x-VC.rx-16} ${VC.bot+16}V${VC.bot+34}A${VC.rx+16} ${VC.ry+8} 0 0 0 ${VC.x+VC.rx+16} ${VC.bot+34}V${VC.bot+16}Z`} fill={METAL.dark}/>
  {facets}
  <polygon points={pts(cap)} fill="#B9A8DE"/>
  <polygon points={pts(cap.slice(0,11).map(([x,y])=>[x,y]).concat([[VC.x,VC.top]]))} fill="#9C88C8" opacity={.5}/>
  {[-74,50].map(y=><g key={y}><path d={arc(y)} stroke={seam} strokeWidth={10} fill="none" opacity={.25*pulse}/><path d={arc(y)} stroke={seam} strokeWidth={4} fill="none" opacity={.75}/></g>)}
  <path d={arc(VC.bot)} stroke="#2A2040" strokeWidth={3} fill="none"/>
  {/* lock emblem on the middle tier */}
  <g transform={`translate(${VC.x},-14)`}>
   <path d={`M -18 -2 V ${-18-12*broken} A 18 18 0 0 1 18 ${-18-12*broken} V ${-8-12*broken}`} stroke={mix(C.ivory,C.pink,broken)} strokeWidth={8} fill="none" strokeLinecap="round" transform={`rotate(${f1(-24*broken)},-18,-2)`}/>
   <path d={rrect(-30,-4,60,46,9)} fill={mix(INK,"#3A1020",broken)} stroke={mix(C.lavender,C.pink,broken)} strokeWidth={3}/>
   <circle cx={0} cy={14} r={6} fill={mix(C.lavender,C.pink,broken)}/><rect x={-2.5} y={14} width={5} height={14} fill={mix(C.lavender,C.pink,broken)}/>
   {broken>.003&&<polyline points="-26,8 -10,18 -16,26 4,34 0,40" stroke={C.pink} strokeWidth={3} fill="none" opacity={broken}/>}
  </g>
  {/* beacon */}
  <g transform={`translate(${VC.x},${VC.top-6})`}>
   {v.alarm>.003&&[0,1,2].map(i=>{const an=(t*160+i*120)*D;return <polygon key={i} points={pts([[0,-14],[Math.cos(an-.25)*120,-14+Math.sin(an-.25)*34],[Math.cos(an+.25)*120,-14+Math.sin(an+.25)*34]])} fill={C.pink} opacity={.16*v.alarm}/>;})}
   <rect x={-22} y={-8} width={44} height={10} rx={3} fill={METAL.lo}/>
   <path d="M -16 -8 A 16 18 0 0 1 16 -8 Z" fill={mix(mix("#6E5A92",C.lavender,.3),C.pink,v.alarm)} opacity={.6+.4*(v.alarm?pulse:.5)}/>
   <circle cx={0} cy={-14} r={26} fill={C.pink} opacity={.25*v.alarm*pulse}/>
  </g>
  {/* ledger */}
  <rect x={128} y={122} width={14} height={70} fill={METAL.lo}/><rect x={98} y={186} width={74} height={10} rx={4} fill={METAL.mid}/>
  <polygon points={pts([[LEDGER.x+8,LEDGER.y],[LEDGER.x+LEDGER.w,LEDGER.y],[LEDGER.x+LEDGER.w+12,LEDGER.y-9],[LEDGER.x+20,LEDGER.y-9]])} fill="#2A2040"/>
  <path d={rrect(LEDGER.x,LEDGER.y,LEDGER.w,LEDGER.h,18)} fill="#120C1DEE" stroke={mix(C.lavender,C.pink,v.alarm)} strokeOpacity={.55+.3*v.alarm} strokeWidth={3}/>
  {[0,1,2].map(i=><circle key={i} cx={LEDGER.x+20+i*14} cy={LEDGER.y+16} r={4} fill={C.lavender} opacity={.45}/>)}
  {[0,1,2,3,4].map(i=>{const y=ROWY(i),s=v.steal[i],empty=smooth(s,.25,.6);
   return <path key={`slot${i}`} d={rrect(LEDGER.x+10,y-2,LEDGER.w-20,48,10)} fill="none" stroke={i===4&&v.store<.5?C.lavender:C.pink} strokeOpacity={i===4?.35*(1-v.store)+.55*empty:.55*empty} strokeWidth={2} strokeDasharray="8 7"/>;})}
  {[0,1,2,3,4].map(i=>{const y=ROWY(i),s=v.steal[i];if(s>=.999)return null;
   const sx=SACK.x-(LEDGER.x+44+114),sy=SACK.y-36-(y+22),lift=-90*Math.sin(Math.PI*s),sc=lerp(1,.32,s),op=1-smooth(s,.78,1);
   const isNew=i===4,inK=isNew?v.store:1;if(inK<=.003)return null;
   const tx=s*sx+(isNew?(1-v.store)*44:0),ty=s*sy+lift,cx=LEDGER.x+44+114,cy=y+22;
   return <g key={i} opacity={op*(isNew?clamp01(v.store*3):1)} transform={`translate(${f1(cx+tx)},${f1(cy+ty)}) scale(${sc.toFixed(3)}) rotate(${f1(-25*s)}) translate(${-cx},${-cy})`}>
    <Avatar x={LEDGER.x+22} y={y+22} r={13} ring={isNew?mix(C.lavender,C.green,v.match):C.lavender}/>
    <Strip x={LEDGER.x+44} y={y+2} w={228} h={40} from={isNew?A:strips[i]} uid={`${uid}-v${i}`} glow={isNew?Math.max(v.storeGlow,v.match):0} tint={isNew&&v.storeGlow<v.match?C.green:C.yellow} tintK={isNew?v.match:0}/>
   </g>;})}
  {v.cmp>.003&&v.merge<.999&&<g opacity={(1-v.merge)*clamp01(v.cmp*3)} transform={`translate(${f1((1-v.cmp)*50)},${f1(-10*(1-v.merge))})`}>
   <Strip x={LEDGER.x+44} y={ROWY(4)-8} w={228} h={40} from={A} uid={`${uid}-fresh`} tint={C.green} tintK={v.match} glow={v.match}/>
  </g>}
  <Badge x={LEDGER.x+LEDGER.w-6} y={ROWY(4)-14} k={v.match} kind="check" r={20}/>
  {/* sack */}
  {v.sack>.003&&<g opacity={v.sack} transform={`translate(${SACK.x},${SACK.y}) scale(${(.7+.3*v.sack).toFixed(3)})`}>
   {[0,1,2,3,4].map(i=>{const k=smooth(v.steal[i],.8,1);return k>.003?<g key={i} opacity={k} transform={`rotate(${f1(-32+i*16)},0,-30)`}><rect x={-8} y={-92} width={16} height={58} rx={3} fill={INK} stroke={C.yellowLine} strokeWidth={2}/>{[0,1,2].map(b=><rect key={b} x={-3} y={-84+b*12} width={6} height={[8,5,9][b]} rx={2} fill={C.yellow}/>)}</g>:null;})}
   <path d="M -30 -40 C -66 -30 -76 10 -66 36 C -60 54 -30 58 0 58 C 30 58 60 54 66 36 C 76 10 66 -30 30 -40 Z" fill="#4A3B5E"/>
   <path d="M 0 -40 H 30 C 66 -30 76 10 66 36 C 60 54 30 58 0 58 Z" fill="#33284A"/>
   <path d="M -44 0 C -30 10 -10 14 4 12 M 20 24 C 34 22 48 16 56 8" stroke="#2A2040" strokeWidth={3} fill="none" strokeLinecap="round"/>
   <path d="M -34 -42 C -20 -30 20 -30 34 -42 L 28 -52 C 14 -44 -14 -44 -28 -52 Z" fill="#5E4C78"/>
   <path d="M -32 -40 C -14 -30 14 -30 32 -40" stroke={C.pink} strokeWidth={5} fill="none" strokeLinecap="round"/>
   <path d="M 20 -34 C 30 -24 36 -14 30 -4" stroke={C.pink} strokeWidth={4} fill="none" strokeLinecap="round"/>
   <path d="M -30 -40 C -66 -30 -76 10 -66 36 C -60 54 -30 58 0 58 C 30 58 60 54 66 36 C 76 10 66 -30 30 -40" fill="none" stroke={C.pink} strokeOpacity={.55} strokeWidth={3}/>
  </g>}
 </g>;
}

/* ───────────── Attacker's guessing wall ───────────── */
/** Guesses per second: 0 stopped, 0.5 fast, 1 slow hash (crawl). Continuous through 0.5. */
export const guessRate=(a:number)=>a<=.5?7*smooth(a,0,.5):lerp(7,.32,smooth(a,.5,1));
export const isMatch=(k:number)=>k>=3&&hash(k*3.71+.2)<.12;
const ROW=64,TARGET=fpPattern(41.7);
function GuessWall({t,a,o,uid}:{t:number;a:number;o:TimedObject;uid:string}){
 const phase=6+integrate(t,o,"guess-wall",guessRate),rate=guessRate(a),slow=smooth(a,.6,.95),blur=clamp01(rate/7)*(1-slow);
 const clip=`gwc-${uid}`,k0=Math.floor(phase);
 const rows:React.ReactNode[]=[];let flash=0;
 for(let k=k0-5;k<=k0+5;k++){if(k<0)continue;const y=(k-phase)*ROW;if(y<-250||y>250)continue;
  const m=isMatch(k),hl=Math.exp(-Math.pow(y/30,2));if(m)flash=Math.max(flash,Math.exp(-Math.pow(y/26,2)));
  const n=5+Math.floor(hash(k*1.37)*5),dot=[INK,"#3A2C55",C.purple][Math.floor(hash(k*.91)*3)];
  rows.push(<g key={k}>
   {hl>.02&&<path d={rrect(-322,y-24,198,48,14)} fill="none" stroke={C.lavender} strokeWidth={3} opacity={hl*.8}/>}
   <Card x={-314} y={y-19} w={182} h={38} n={n} seed={k} dot={dot}/>
   <Strip x={-20} y={y-19} w={220} h={38} from={m?TARGET:fpPattern(100+k*3.3)} uid={`${uid}-g${k}`} tint={C.pink} tintK={m?smooth(-y,-20,10):0} glow={m?Math.exp(-Math.pow(y/26,2)):0}/>
  </g>);}
 const passed:number[]=[];for(let k=3;k<=k0+1;k++)if(isMatch(k)&&(k-phase)*ROW<-10)passed.push(k);
 const gearA=phase*120;
 const sand=phase-Math.floor(phase);
 return <g>
  <defs><clipPath id={clip}><rect x={-340} y={-222} width={570} height={440}/></clipPath>
   <linearGradient id={`gwf-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={INK} stopOpacity="1"/><stop offset=".14" stopColor={INK} stopOpacity="0"/><stop offset=".86" stopColor={INK} stopOpacity="0"/><stop offset="1" stopColor={INK} stopOpacity="1"/></linearGradient></defs>
  <Shadow w={700} y={290}/>
  <rect x={-300} y={250} width={20} height={36} fill={METAL.lo}/><rect x={280} y={250} width={20} height={36} fill={METAL.lo}/>
  <polygon points={pts([[-352,-300],[352,-300],[368,-312],[-336,-312]])} fill="#3A1A2C"/>
  <polygon points={pts([[352,-300],[368,-312],[368,248],[352,260]])} fill="#2A1020"/>
  <path d={rrect(-352,-300,704,560,20)} fill={INK} stroke={C.pink} strokeOpacity={.7} strokeWidth={6}/>
  <path d={rrect(-340,-288,680,536,14)} fill="none" stroke={C.purpleStroke} strokeOpacity={.25} strokeWidth={2}/>
  {/* hood emblem */}
  <g transform="translate(-302,-258)">
   <path d="M -24 18 C -26 -8 -14 -24 0 -24 C 14 -24 26 -8 24 18 Z" fill={C.pink}/>
   <ellipse cx={0} cy={2} rx={13} ry={15} fill={INK}/>
   <circle cx={-5} cy={0} r={2.6} fill={C.lavender} opacity={.6+.4*Math.sin(t*2)**2}/><circle cx={5} cy={0} r={2.6} fill={C.lavender} opacity={.6+.4*Math.sin(t*2)**2}/>
  </g>
  {/* target: the stolen fingerprint */}
  <Strip x={-20} y={-284} w={220} h={44} from={TARGET} uid={`${uid}-tg`} tint={C.pink} tintK={.4+.6*flash} glow={flash}/>
  {[[-26,-288],[196,-288]].map(([x,y],i)=><rect key={i} x={x} y={y} width={34} height={12} rx={3} fill={C.pink} opacity={.85} transform={`rotate(${i?18:-18},${x+17},${y+6})`}/>)}
  <path d={`M 90 -236 V -226`} stroke={C.lavender} strokeWidth={3} opacity={.5}/>
  <g clipPath={`url(#${clip})`}>
   {blur>.01&&[0,1,2,3,4,5].map(i=><line key={i} x1={-300+i*34} y1={-220} x2={-300+i*34} y2={220} stroke={C.lavender} strokeWidth={2} opacity={.12*blur}/>)}
   {rows}
   <rect x={-340} y={-222} width={570} height={440} fill={`url(#gwf-${uid})`}/>
  </g>
  {/* comparison line */}
  <path d="M -30 -27 V -30 H 210 V -27 M -30 27 V 30 H 210 V 27" stroke={mix(C.lavender,C.yellowLine,flash)} strokeWidth={3} fill="none" opacity={.6+.4*flash}/>
  {flash>.01&&<rect x={86} y={-238} width={8} height={208} rx={4} fill={C.yellowLine} opacity={.75*flash}/>}
  {/* press */}
  <path d={rrect(-108,-34,76,68,12)} fill={METAL.mid} stroke={METAL.hi} strokeWidth={3}/>
  <Gear x={-70} y={0} r={24} teeth={9} angle={gearA} light={C.lavender} dark={LAV.dark}/>
  <path d="M -128 0 H -112 M -118 -6 L -112 0 L -118 6" stroke={C.ivory} strokeWidth={3} fill="none" opacity={.6}/>
  <path d="M -30 0 H -24" stroke={C.ivory} strokeWidth={3} opacity={.6}/>
  {slow>.003&&<g opacity={slow} transform="translate(-70,-76)">
   <path d="M -16 -26 H 16 M -16 26 H 16" stroke={METAL.hi} strokeWidth={5} strokeLinecap="round"/>
   <path d="M -12 -24 L 0 0 L 12 -24 Z M -12 24 L 0 0 L 12 24 Z" fill="none" stroke={C.lavender} strokeWidth={2.5}/>
   <path d={`M ${-12*(1-sand)} ${-24*(1-sand)} L 0 0 L ${12*(1-sand)} ${-24*(1-sand)} Z`} fill={C.yellow}/>
   <path d={`M -12 24 L ${-12*sand} ${24-24*sand} L ${12*sand} ${24-24*sand} L 12 24 Z`} fill={C.yellow}/>
   <line x1={0} y1={0} x2={0} y2={22} stroke={C.yellow} strokeWidth={2} opacity={.8}/>
  </g>}
  {/* tally of cracked accounts */}
  <Badge x={296} y={-120} k={1} kind="cracked" r={22+5*flash}/>
  {passed.slice(-12).map((k,j)=>{const op=smooth(-(k-phase)*ROW,10,50);return <circle key={k} cx={296} cy={190-j*24} r={8} fill={C.pink} opacity={op}/>;})}
  {Array.from({length:12},(_,j)=><circle key={`e${j}`} cx={296} cy={190-j*24} r={8} fill="none" stroke={C.pink} strokeOpacity={.25} strokeWidth={2}/>)}
 </g>;
}

/* ───────────── Ready-made (lookup) table ───────────── */
export function tableState(a:number){
 return {unroll:smooth(a,.03,.3),link:smooth(a,.36,.6),crack:smooth(a,.5,.64),salt:smooth(a,.7,.85),morph:smooth(a,.76,.92),snap:smooth(a,.78,.9),dim:smooth(a,.82,.98),safe:smooth(a,.88,1)};
}
const TROW=(r:number)=>-200+r*64,STOLEN=[[1,-150],[3,-50],[5,50]] as const,RAINBOW=[C.pink,C.yellow,C.green,C.lavender,C.purple];
function LookupTable({t,a,uid}:{t:number;a:number;uid:string}){
 const v=tableState(a),yb=-230+470*v.unroll,rTop=14+10*(1-v.unroll);
 return <g>
  <Shadow w={640} y={286}/>
  {[-300,120].map(x=><g key={x}><rect x={x-6} y={-256} width={14} height={520} fill={METAL.mid}/><rect x={x-6} y={-256} width={5} height={520} fill={METAL.top}/><rect x={x-26} y={262} width={54} height={12} rx={4} fill={METAL.dark}/></g>)}
  <rect x={-316} y={-262} width={452} height={16} rx={8} fill={METAL.hi}/><rect x={-316} y={-262} width={452} height={5} rx={2} fill="#FFFFFF" opacity={.2}/>
  {/* paper */}
  {v.unroll>.003&&<g>
   <rect x={-276} y={-232} width={372} height={Math.max(0,yb+232)} fill={PAPER.light}/>
   <rect x={-100} y={-232} width={196} height={Math.max(0,yb+232)} fill={PAPER.dark} opacity={.45}/>
   {Array.from({length:6},(_,i)=>{const y0=-232+i*80,h=Math.min(80,yb-y0);return h>0?<rect key={i} x={-276} y={y0} width={8} height={h} fill={RAINBOW[i%5]} opacity={.9}/>:null;})}
   {Array.from({length:7},(_,r)=>{const y=TROW(r),k=smooth(yb-(y+36),0,30);if(k<=.003)return null;const hit=STOLEN.findIndex(s=>s[0]===r),lk=hit>=0?smooth(v.link,hit*.2,.6+hit*.2)*(1-v.snap):0;
    return <g key={r} opacity={k}>
     {lk>.003&&<path d={rrect(-266,y-6,360,42,10)} fill={C.pink} opacity={.16*lk}/>}
     <Card x={-262} y={y} w={120} h={30} n={4+Math.floor(hash(r*2.3)*5)} seed={r+50}/>
     <path d={`M -134 ${y+15} H -110 M -116 ${y+9} L -110 ${y+15} L -116 ${y+21}`} stroke={C.purple} strokeWidth={3} fill="none"/>
     <Strip x={-100} y={y} w={180} h={30} from={fpPattern(200+r*5)} uid={`${uid}-t${r}`} tint={C.pink} tintK={lk} glow={lk*.7}/>
    </g>;})}
   <rect x={-276} y={-232} width={372} height={Math.max(0,yb+232)} fill={INK} opacity={.5*v.dim}/>
   <rect x={-284} y={yb-12} width={388} height={24} rx={12} fill={METAL.top}/><rect x={-284} y={yb-12} width={388} height={8} rx={4} fill={METAL.hi}/>
  </g>}
  <rect x={-290} y={-246} width={400} height={rTop*2} rx={rTop} fill={PAPER.dark}/>
  <rect x={-290} y={-246} width={400} height={rTop*.8} rx={rTop*.4} fill={PAPER.light} opacity={.8}/>
  {/* stolen board */}
  <path d={rrect(150,-208,172,330,14)} fill={INK} stroke={C.pink} strokeOpacity={.7} strokeWidth={4}/>
  <g transform="translate(236,-186) scale(.6)"><path d="M -24 18 C -26 -8 -14 -24 0 -24 C 14 -24 26 -8 24 18 Z" fill={C.pink}/><ellipse cx={0} cy={2} rx={13} ry={15} fill={INK}/></g>
  {STOLEN.map(([r,y],j)=>{const lk=smooth(v.link,j*.2,.6+j*.2),from=fpPattern(200+r*5),to=fpPattern(300+j*9.1),sx=162,sy=y+16,tx=86,ty=TROW(r)+15;
   const path=`M ${sx} ${sy} C ${sx-50} ${sy}, ${tx+60} ${ty}, ${tx} ${ty}`;
   const grains=Array.from({length:6},(_,g)=>{const e=.7+.1*g/5,u=clamp01((a-e)/.08);return {x:sx+16+g*24+(hash(j*7+g)-.5)*8,u:Math.min(1,u),land:smooth(a,e+.07,e+.09)};});
   return <g key={j}>
    {lk>.003&&v.snap<.999&&<g opacity={1-v.snap}>
     <path d={path} stroke={C.pink} strokeOpacity={.25} strokeWidth={12} fill="none" pathLength={1} strokeDasharray={`${lk.toFixed(3)} 2`} strokeLinecap="round"/>
     <path d={path} stroke={C.pink} strokeWidth={4} fill="none" pathLength={1} strokeDasharray={v.snap>.01?`${(.42-.2*v.snap).toFixed(3)} ${(.16+.4*v.snap).toFixed(3)}`:`${lk.toFixed(3)} 2`} strokeLinecap="round"/>
    </g>}
    <rect x={sx+4} y={y-8} width={14} height={14} rx={3} fill={C.pink}/>
    <Strip x={sx} y={y} w={150} h={32} from={from} to={to} morph={v.morph} uid={`${uid}-s${j}`} tint={v.morph>.5?C.green:C.pink} tintK={v.morph>.5?v.safe:lk} glow={Math.max(lk*v.crack*(1-v.morph),v.safe*.6)}/>
    {grains.map((g,gi)=>g.u>0&&g.u<1?<rect key={gi} x={g.x-3} y={lerp(y-70,y-4,g.u*g.u)-3} width={6} height={6} fill={C.ivory} transform={`rotate(45,${f1(g.x)},${f1(lerp(y-70,y-4,g.u*g.u))})`}/>:null)}
    {grains.map((g,gi)=>g.land>.003?<rect key={`l${gi}`} x={g.x-3.5} y={y-7} width={7} height={7} fill={C.ivory} stroke={C.lavender} strokeWidth={1} opacity={g.land} transform={`rotate(45,${f1(g.x)},${y-3.5})`}/>:null)}
    <Badge x={306} y={y+16} k={v.crack*(1-v.safe)} kind="cracked" r={13}/>
    <Badge x={306} y={y+16} k={v.safe} kind="shield" r={13}/>
   </g>;})}
 </g>;
}

/* ───────────── Salt shaker over two identical passwords ───────────── */
export function saltState(a:number){return {pour:smooth(a,0,.12)*(1-smooth(a,.5,.62)),sweep:smooth(a,.2,.33),morph:smooth(a,.58,.86),swap:smooth(a,.74,.92)};}
const SALT_N=18,SALT_E=(i:number)=>i<9?.12+.08*i/8:.33+.1*(i-9)/8,CARD_Y=-10,SALT_L=fpPattern(61.3),SALT_R=fpPattern(83.9);
function shakerPose(a:number){const v=saltState(a);return {x:lerp(-177,123,v.sweep),y:-176+30*v.pour,ang:165*v.pour};}
function capPoint(a:number){const p=shakerPose(a),an=p.ang*D,lx=0,ly=-86*1.22;return {x:p.x+lx*Math.cos(an)-ly*Math.sin(an),y:p.y+lx*Math.sin(an)+ly*Math.cos(an)};}
function SaltShaker({t,a,uid}:{t:number;a:number;uid:string}){
 const v=saltState(a),p=shakerPose(a),wig=8*Math.sin(t*15)*win(a,.08,.14,.4,.46),A=fpPattern(SEED_A),body=`ssb-${uid}`;
 const grains=Array.from({length:SALT_N},(_,i)=>{const e=SALT_E(i),c=capPoint(e),g=(a-e)/.07,side=c.x<0?-1:1,lx=c.x+(hash(i*4.3)-.5)*70;
  return {i,g,x:lerp(c.x,lx,clamp01(g)),y:lerp(c.y,CARD_Y-4,clamp01(g)**2),side,lx,land:smooth(a,e+.06,e+.085)};});
 return <g>
  <Shadow w={600} y={238}/>
  <Box x={-292} y={196} w={570} h={24} d={[14,-10]} front={{light:METAL.mid,dark:METAL.lo}} top={METAL.top} side={METAL.dark}/>
  {[-1,1].map(s=>{const cx=150*s,pat=s<0?SALT_L:SALT_R;return <g key={s}>
   <Avatar x={cx-133} y={CARD_Y+26} r={20}/>
   <Card x={cx-105} y={CARD_Y} w={210} h={52} n={8} seed={1}/>
   <path d={`M ${cx} ${CARD_Y+56} V ${CARD_Y+70}`} stroke={C.lavender} strokeWidth={3} opacity={.6}/>
   <path d={rrect(cx-38,CARD_Y+70,76,46,10)} fill={METAL.mid} stroke={METAL.hi} strokeWidth={2.5}/>
   <Gear x={cx} y={CARD_Y+93} r={17} teeth={8} angle={t*40*s+380*v.morph*s} light={C.lavender} dark={LAV.dark}/>
   <path d={`M ${cx} ${CARD_Y+118} V ${CARD_Y+130}`} stroke={C.lavender} strokeWidth={3} opacity={.6}/>
   <Strip x={cx-112} y={CARD_Y+134} w={224} h={50} from={A} to={pat} morph={v.morph} uid={`${uid}-${s}`} tint={v.swap>.5?C.green:C.pink} tintK={Math.max(1-v.morph,v.swap)*.8} glow={.4*v.swap}/>
  </g>;})}
  <Badge x={0} y={CARD_Y+159} k={1-v.swap} kind="eq" r={24} color={C.pink}/>
  <Badge x={0} y={CARD_Y+159} k={v.swap} kind="neq" r={24} color={C.green}/>
  {grains.map(g=>g.land>.003?<rect key={`c${g.i}`} x={g.lx-5.5} y={CARD_Y-7.5} width={11} height={11} fill={C.ivory} stroke={C.lavender} strokeWidth={1.2} opacity={g.land*(.75+.25*Math.sin(t*3+g.i))} transform={`rotate(45,${f1(g.lx)},${CARD_Y-2})`}/>:null)}
  {grains.map(g=>g.g>0&&g.g<1?<rect key={`g${g.i}`} x={g.x-3} y={g.y-3} width={6} height={6} fill={C.ivory} opacity={smooth(g.g,0,.15)} transform={`rotate(${f1(45+g.g*90)},${f1(g.x)},${f1(g.y)})`}/>:null)}
  <g transform={`translate(${f1(p.x)},${f1(p.y)}) rotate(${f1(p.ang+wig)}) scale(1.22)`}>
   <defs><clipPath id={body}><polygon points="-46,-58 46,-58 54,58 -54,58"/></clipPath></defs>
   <polygon points="-46,-58 46,-58 54,58 -54,58" fill="#B9C2D8" opacity={.35}/>
   <g clipPath={`url(#${body})`}>
    <g opacity={1-smooth(v.pour,.3,.7)}><rect x={-60} y={lerp(-20,14,v.sweep)} width={120} height={90} fill={C.ivory}/>
     {Array.from({length:10},(_,i)=><rect key={i} x={-48+i*10} y={lerp(-24,10,v.sweep)+hash(i)*6} width={5} height={5} fill="#D9D2C0"/>)}</g>
    <g opacity={smooth(v.pour,.3,.7)}><rect x={-60} y={-70} width={120} height={lerp(54,24,v.sweep)} fill={C.ivory}/>
     {Array.from({length:10},(_,i)=><rect key={i} x={-48+i*10} y={lerp(-18,-48,v.sweep)+hash(i)*6} width={5} height={5} fill="#D9D2C0"/>)}</g>
   </g>
   <polygon points="-46,-58 0,-58 -8,58 -54,58" fill="#FFFFFF" opacity={.12}/>
   <polygon points="-46,-58 46,-58 54,58 -54,58" fill="none" stroke="#E6EEFF" strokeOpacity={.7} strokeWidth={3}/>
   <line x1={-30} y1={-46} x2={-36} y2={44} stroke="#FFFFFF" strokeOpacity={.5} strokeWidth={4}/>
   <path d="M -50 -58 C -50 -92 50 -92 50 -58 Z" fill={METAL.hi}/>
   <path d="M 0 -84 C 30 -82 50 -74 50 -58 H 0 Z" fill={METAL.mid}/>
   <rect x={-52} y={-62} width={104} height={8} rx={3} fill={METAL.lo}/>
   {[-22,-8,8,22].map((x,i)=><circle key={i} cx={x} cy={-74+Math.abs(x)*.12} r={3.2} fill={INK}/>)}
  </g>
 </g>;
}

/* ───────────── Slow hash hourglass ───────────── */
export const sandRate=(a:number)=>.2*smooth(a,0,.33);
export function hourglassState(a:number){return {memory:Array.from({length:24},(_,i)=>smooth(a,.34+.008*i,.46+.008*i)),ghosts:Array.from({length:6},(_,g)=>smooth(a,.7+.045*g,.82+.045*g))};}
const HG=-40,GHOSTS=[[-262,-190],[262,-190],[-262,0],[262,0],[-262,190],[262,190]];
/** One hourglass at the origin of its own frame (neck at HG): flow phase u in [0,1) of a cycle with a flip at the end. */
function Glass({u,uid,tint=0,detail=1}:{u:number;uid:string;tint?:number;detail?:number}){
 const flow=clamp01(u/.82),flip=180*smooth(u,.82,1),top=1-flow,bot=flow,ct=`hgt-${uid}`,cb=`hgb-${uid}`;
 const capF=mix(PURP.light,C.pink,tint),capD=mix(PURP.dark,"#8E1C38",tint),sand=mix(C.yellow,"#F28A9E",tint*.6);
 const topBulb=`M -82 ${HG-166} C -82 ${HG-80} -10 ${HG-30} -8 ${HG} L 8 ${HG} C 10 ${HG-30} 82 ${HG-80} 82 ${HG-166} Z`;
 const botBulb=`M -82 ${HG+166} C -82 ${HG+80} -10 ${HG+30} -8 ${HG} L 8 ${HG} C 10 ${HG+30} 82 ${HG+80} 82 ${HG+166} Z`;
 const cap=(y:number)=><g><Box x={-115} y={y} w={230} h={30} d={[14,-10]} front={{light:capF,dark:capD}} top={mix(PURP.top,"#F28A9E",tint)} side={mix(PURP.side,"#5A1226",tint)}/><rect x={-115} y={y} width={230} height={4} fill={C.yellowLine} opacity={.6}/></g>;
 return <g transform={`rotate(${f1(flip)},0,${HG})`}>
  <defs><clipPath id={ct}><path d={topBulb}/></clipPath><clipPath id={cb}><path d={botBulb}/></clipPath></defs>
  <rect x={-5} y={HG-170} width={10} height={340} fill={METAL.lo} opacity={.3}/>
  <path d={topBulb} fill="#B9C2D8" opacity={.14}/><path d={botBulb} fill="#B9C2D8" opacity={.14}/>
  <g clipPath={`url(#${ct})`}><rect x={-90} y={HG-150*Math.pow(top,.75)} width={180} height={152} fill={sand}/></g>
  <g clipPath={`url(#${cb})`}><rect x={-90} y={HG+166-120*Math.pow(bot,.85)} width={180} height={130} fill={sand}/>
   <polygon points={pts([[-60*bot-6,HG+166-120*Math.pow(bot,.85)+2],[0,HG+166-120*Math.pow(bot,.85)-26*bot],[60*bot+6,HG+166-120*Math.pow(bot,.85)+2]])} fill={sand}/></g>
  {flow>0&&flow<1&&top>.01&&<line x1={0} y1={HG} x2={0} y2={HG+166-120*Math.pow(bot,.85)} stroke={sand} strokeWidth={3}/>}
  <path d={topBulb} fill="none" stroke="#E6EEFF" strokeOpacity={.55} strokeWidth={3}/><path d={botBulb} fill="none" stroke="#E6EEFF" strokeOpacity={.55} strokeWidth={3}/>
  {detail>.5&&<path d={`M -64 ${HG-150} C -62 ${HG-90} -30 ${HG-50} -16 ${HG-26}`} stroke="#FFFFFF" strokeOpacity={.35} strokeWidth={5} fill="none" strokeLinecap="round"/>}
  {[-98,98].map(x=><g key={x}><rect x={x-7} y={HG-166} width={14} height={332} fill={mix(METAL.hi,C.pink,tint*.5)}/><rect x={x-7} y={HG-166} width={5} height={332} fill="#FFFFFF" opacity={.2}/></g>)}
  {cap(HG-196)}{cap(HG+166)}
 </g>;
}
function SlowHourglass({t,a,o,uid}:{t:number;a:number;o:TimedObject;uid:string}){
 const v=hourglassState(a),phase=integrate(t,o,"slow-hourglass",sandRate),u=phase-Math.floor(phase);
 return <g>
  <Shadow w={600} y={270}/>
  {GHOSTS.map(([x,y],g)=>{const k=v.ghosts[g];if(k<=.003)return null;const gu=((t-(o.enterAt??0))*.24+g*.17)%1;
   return <g key={g} opacity={k*.9} transform={`translate(${x},${y}) scale(${(.24+.12*k).toFixed(3)})`}>
    <Glass u={gu} uid={`${uid}-g${g}`} tint={1} detail={0}/>
    <Card x={-100} y={HG-262} w={200} h={52} n={6} seed={g+70} tone="#F7D3DB"/>
   </g>;})}
  <g transform="translate(0,8)"><Glass u={u} uid={`${uid}-m`}/></g>
  <Box x={-150} y={164} w={300} h={86} d={[16,-12]} front={{light:METAL.mid,dark:METAL.lo}} top={METAL.top} side={METAL.dark}/>
  <path d={rrect(-132,174,264,64,8)} fill={INK}/>
  {v.memory.map((k,i)=>{const c=i%8,r=Math.floor(i/8),x=-122+c*31,y=180+r*18,on=k*(.8+.2*Math.sin(t*3+i*1.3));
   return <g key={i}><rect x={x} y={y} width={26} height={13} rx={2} fill="#2A2340"/>{on>.003&&<rect x={x} y={y} width={26} height={13} rx={2} fill={C.lavender} opacity={on}/>}</g>;})}
 </g>;
}

/* ───────────── Forgot-password envelope ───────────── */
export function letterState(a:number){
 return {open1:smooth(a,.03,.14),rise1:smooth(a,.08,.24),squig:smooth(a,.28,.44),warn:smooth(a,.36,.5),away:smooth(a,.53,.68),close:smooth(a,.6,.72),
  open2:smooth(a,.77,.86),rise2:smooth(a,.8,.94),ok:smooth(a,.9,1)};
}
const ENV={x:-190,y:-30,w:380,h:240},LET={w:300,h:250};
function ResetLetter({t,a,uid}:{t:number;a:number;uid:string}){
 const v=letterState(a),open=clamp01(v.open1-v.close+v.open2),tipY=ENV.y+130*Math.cos(Math.PI*open),seal={x:0,y:tipY};
 const back=open>.5,clip=`rlc-${uid}`;
 const flap=<g>
  <polygon points={pts([[ENV.x,ENV.y],[ENV.x+ENV.w,ENV.y],[0,tipY]])} fill={back?"#8F74BC":LAV.light} stroke={back?"#8F74BC":LAV.light} strokeWidth={1}/>
  <polygon points={pts([[0,ENV.y],[ENV.x+ENV.w,ENV.y],[0,tipY]])} fill={back?"#7A62A6":LAV.dark} opacity={.8}/>
  <g transform={`translate(${seal.x},${f1(seal.y)}) scale(1,${(back?-1:1)*Math.max(.15,Math.abs(Math.cos(Math.PI*open)))})`} opacity={1-smooth(open,.3,.5)}>
   <circle r={22} fill={C.purple}/><circle r={22} fill="none" stroke={PURP.dark} strokeWidth={4}/>
   <path d="M -6 -1 V -6 A 6 6 0 0 1 6 -6 V -1" stroke={C.ivory} strokeWidth={3} fill="none"/><rect x={-8} y={-2} width={16} height={11} rx={2} fill={C.ivory}/>
  </g>
 </g>;
 const letterA=v.rise1>.003&&v.away<.999?(()=>{const y=lerp(40,-200,v.rise1),k=v.away;
  return <g opacity={1-smooth(k,.5,1)} transform={`translate(${f1(-110*k)},${f1(60*k)}) rotate(${f1(-28*k)},0,${f1(y+125)}) scale(${(1-.55*k).toFixed(3)})`}>
   <Sheet y={y}/>
   <rect x={-118} y={y+26} width={120} height={9} rx={4} fill={C.lavender} opacity={.8}/><rect x={-118} y={y+44} width={190} height={7} rx={3} fill="#D9D2C0"/>
   {v.squig>.003&&<path d={rrect(-128,y+80,256,62,12)} fill={C.pink} opacity={.28*v.squig}/>}
   <Card x={-120} y={y+86} w={240} h={50} n={8} squig={v.squig} seed={5} tone={mix(PAPER.light,"#FFE3EA",v.squig)}/>
   {[0,1,2].map(i=><rect key={i} x={-118} y={y+170+i*18} width={[220,180,120][i]} height={7} rx={3} fill="#D9D2C0"/>)}
   <Badge x={118} y={y+26} k={v.warn} kind="warn" r={24}/>
  </g>;})():null;
 const letterB=v.rise2>.003?(()=>{const y=lerp(40,-200,v.rise2);
  return <g>
   <Sheet y={y}/>
   <rect x={-118} y={y+26} width={120} height={9} rx={4} fill={C.lavender} opacity={.8}/><rect x={-118} y={y+44} width={190} height={7} rx={3} fill="#D9D2C0"/>
   <g transform={`translate(-30,${y+120}) rotate(-38)`}>
    <path d={rrect(-56,-20,64,40,20)} fill="none" stroke={C.green} strokeWidth={11}/>
    <path d={rrect(-8,-20,64,40,20)} fill="none" stroke={C.purple} strokeWidth={11}/>
   </g>
   <path d={`M 32 ${y+120} H 66 M 56 ${y+110} L 66 ${y+120} L 56 ${y+130}`} stroke={C.purple} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
   <g transform={`translate(98,${y+120})`}><circle cx={0} cy={0} r={14} fill="none" stroke={C.yellow} strokeWidth={6}/><path d="M 14 0 H 38 M 30 0 V 10 M 22 0 V 8" stroke={C.yellow} strokeWidth={6} strokeLinecap="round"/></g>
   {[0,1].map(i=><rect key={i} x={-118} y={y+182+i*18} width={[200,140][i]} height={7} rx={3} fill="#D9D2C0"/>)}
   <Badge x={118} y={y+26} k={v.ok} kind="check" r={24}/>
  </g>;})():null;
 return <g>
  <defs><clipPath id={clip}><rect x={-280} y={-280} width={560} height={ENV.y+ENV.h+280}/></clipPath></defs>
  <Shadow w={480} y={250}/>
  <Box x={-214} y={210} w={428} h={20} d={[14,-10]} front={{light:METAL.mid,dark:METAL.lo}} top={METAL.top} side={METAL.dark}/>
  <rect x={ENV.x} y={ENV.y} width={ENV.w} height={ENV.h} fill="#2A2340"/>
  <polygon points={pts([[ENV.x,ENV.y],[ENV.x+ENV.w,ENV.y],[ENV.x+ENV.w,ENV.y+ENV.h],[ENV.x,ENV.y+ENV.h]])} fill="#3A2C55" opacity={.6}/>
  {back&&flap}
  <g clipPath={`url(#${clip})`}>{letterB}</g>
  <g clipPath={`url(#${clip})`}>{letterA}</g>
  <polygon points={pts([[ENV.x,ENV.y],[0,100],[ENV.x,ENV.y+ENV.h]])} fill={LAV.light}/>
  <polygon points={pts([[ENV.x+ENV.w,ENV.y],[0,100],[ENV.x+ENV.w,ENV.y+ENV.h]])} fill={LAV.dark}/>
  <polygon points={pts([[ENV.x,ENV.y+ENV.h],[0,90],[ENV.x+ENV.w,ENV.y+ENV.h]])} fill="#C6ABF0"/>
  <polygon points={pts([[0,90],[ENV.x+ENV.w,ENV.y+ENV.h],[0,ENV.y+ENV.h]])} fill="#B497E2"/>
  <path d={`M${ENV.x} ${ENV.y+ENV.h}L0 90L${ENV.x+ENV.w} ${ENV.y+ENV.h}`} stroke="#8F74BC" strokeWidth={2} fill="none"/>
  {!back&&flap}
  <rect x={ENV.x} y={ENV.y} width={ENV.w} height={ENV.h} fill="none" stroke="#8F74BC" strokeWidth={2}/>
  {open>.02&&<ellipse cx={0} cy={ENV.y} rx={150} ry={10} fill={C.lavender} opacity={.12*open*(.7+.3*Math.sin(t*2))}/>}
 </g>;
}
function Sheet({y}:{y:number}){
 return <g><path d={rrect(-146,y+4,LET.w,LET.h,10)} fill="#000" opacity={.2}/><path d={rrect(-150,y,LET.w,LET.h,10)} fill={PAPER.light}/>
  <polygon points={pts([[150,y+LET.h-40],[150,y+LET.h-10],[120,y+LET.h]])} fill={PAPER.dark}/><path d={rrect(-150,y,LET.w,LET.h,10)} fill="none" stroke={PAPER.edge} strokeWidth={2}/></g>;
}

export function PwArt({kind,o,t,a,xray,uid,overlay}:PwArtProps){
 if(overlay&&kind!=="hash-grinder")return null;
 switch(kind){
  case "login-phone":return <LoginPhone t={t} a={a} o={o} uid={uid}/>;
  case "hash-grinder":return <HashGrinder t={t} a={a} o={o} uid={uid} xray={xray} overlay={overlay}/>;
  case "hash-vault":return <HashVault t={t} a={a} uid={uid}/>;
  case "guess-wall":return <GuessWall t={t} a={a} o={o} uid={uid}/>;
  case "lookup-table":return <LookupTable t={t} a={a} uid={uid}/>;
  case "salt-shaker":return <SaltShaker t={t} a={a} uid={uid}/>;
  case "slow-hourglass":return <SlowHourglass t={t} a={a} o={o} uid={uid}/>;
  case "reset-letter":return <ResetLetter t={t} a={a} uid={uid}/>;
 }
 return null;
}
