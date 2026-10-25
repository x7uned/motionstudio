import React from "react";
import {AbsoluteFill,Audio,Img,staticFile,useCurrentFrame,useVideoConfig} from "remotion";
import {StudioBackground} from "./StudioBackground";
import {Captions,type SpeechAlignment} from "./Explainer";
import {StyledCaptions,CaptionShade,type CaptionStyleId} from "./CaptionStyles";
import {MediaTiles} from "./IllustratedMedia";
import {sceneClock,type Storyboard,type StyleProfile} from "../src/lib/model";
import {timeline,keyed,easeSine,cameraAt,placeAt,footprint,toScreen,ease,easeOut,VIEW,SAFE,LOOP_START,type IllustratedObject,type IllustratedTimeline,type Pose} from "../src/lib/illustrated";
import {illustratedLayout} from "../src/lib/illustrated-layout";
import brand from "../video-design/brand.json";
import {Cat,ChronoStrip,InnerEar,SpinStool} from "./IllustratedCat";
import {Ship,Globe,ClockFace,PendulumClock,SeaClock,PocketWatch,LeaningTower} from "./IllustratedHistory";
import {QrArt} from "./IllustratedQr";
import {NetArt} from "./IllustratedNet";
import {TunnelArt} from "./IllustratedTunnel";
import {QR_KEY_SECONDS,QR_CALLOUT_ANCHOR,QR_XRAY_OVERLAY} from "../src/lib/illustrated-catalog-qr";
import {NET_KEY_SECONDS,NET_CALLOUT_ANCHOR,NET_XRAY_OVERLAY} from "../src/lib/illustrated-catalog-net";
import {TUNNEL_KEY_SECONDS,TUNNEL_CALLOUT_ANCHOR,TUNNEL_XRAY_OVERLAY} from "../src/lib/illustrated-catalog-tunnel";
import {FaceidArt} from "./IllustratedFaceid";
import {FACEID_KEY_SECONDS,FACEID_CALLOUT_ANCHOR,FACEID_XRAY_OVERLAY} from "../src/lib/illustrated-catalog-faceid";
import {PwArt} from "./IllustratedPasswords";
import {PW_KEY_SECONDS,PW_CALLOUT_ANCHOR,PW_XRAY_OVERLAY} from "../src/lib/illustrated-catalog-passwords";
import {ShazamArt} from "./IllustratedShazam";
import {SHAZAM_KEY_SECONDS,SHAZAM_CALLOUT_ANCHOR} from "../src/lib/illustrated-catalog-shazam";
import {MinuteArt} from "./IllustratedMinute";
import {MINUTE_KEY_SECONDS,MINUTE_CALLOUT_ANCHOR,moneyStackMax} from "../src/lib/illustrated-catalog-minute";
import {Sun,Earth,Moon,Orbit,LightFront,PlanetRow,NightSky,Thermometer,Leaf,SpaceBackdrop,SpaceDust,SpinEarth,WindSurface,DayYear,SPIN_EARTH_KEY} from "./IllustratedSpace";

// illustrated/v1 — prepared low-poly objects in one persistent world. Every value derives from the frame time.
const C=brand.colors;
// captionStyle: preview override of the caption look (work/caption-styles); otherwise profile.production.captionStyle, absent = classic.
type Props={plan:Storyboard;profile:StyleProfile;format:string;audio?:string;alignment?:SpeechAlignment[];captionStyle?:CaptionStyleId};
const TONE={info:C.lavender,ok:C.green,warn:C.pink,number:C.yellow} as const;
const LAVA=[C.pink,C.yellow,C.purple];
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const pts=(p:number[][])=>p.map(([x,y])=>`${x},${y}`).join(" ");
/** Two-tone facet split: light from the top-left, as in the low-poly references. */
function Facets({poly,light,dark,split=0}:{poly:number[][];light:string;dark:string;split?:number}){
 const left=poly.map(([x,y])=>[Math.min(x,split),y]),right=poly.map(([x,y])=>[Math.max(x,split),y]);
 return <><polygon points={pts(left)} fill={light}/><polygon points={pts(right)} fill={dark}/></>;
}
const Shadow=({w,y}:{w:number;y:number})=><ellipse cx={0} cy={y} rx={w*.46} ry={w*.07} fill="#000" opacity={.45}/>;

type ObjProps={o:IllustratedObject;t:number;a:number;uid:string};
function LavaLamp({t,a,uid,variant=0,detail=1}:{t:number;a:number;uid:string;variant?:number;detail?:number}){
 const color=LAVA[variant%3],glass=[[-40,-160],[40,-160],[62,20],[48,90],[-48,90],[-62,20]];
 const blobs=Array.from({length:detail>.5?5:3},(_,k)=>{const sp=.32+hash(variant*7+k)*.3,ph=hash(variant*13+k)*6.3;const u=.5+.5*Math.sin(t*sp+ph);return {x:Math.sin(t*sp*.7+ph*2)*18,y:70-215*u,r:16+10*hash(variant+k*3)+6*Math.sin(t*.9+k)};});
 return <g>
  <circle cx={0} cy={-30} r={190} fill={`url(#glow-${variant%3})`} opacity={.3+.7*a}/>
  <Shadow w={150} y={224}/>
  <ellipse cx={0} cy={226} rx={130} ry={22} fill={color} opacity={.12+.2*a}/>
  <Facets poly={[[-28,-220],[28,-220],[40,-160],[-40,-160]]} light="#666882" dark="#26273A"/>
  <polygon points={pts([[-28,-220],[28,-220],[22,-212],[-22,-212]])} fill="#8A8CA6"/>
  <clipPath id={`glass-${uid}`}><polygon points={pts(glass)}/></clipPath>
  <Facets poly={glass} light="#2E1A46" dark="#170D26"/>
  <g clipPath={`url(#glass-${uid})`}>
   <rect x={-70} y={-170} width={140} height={270} fill={`url(#liquid-${variant%3})`} opacity={.55+.35*a}/>
   {detail>.5&&<g filter="url(#bloom)" opacity={.55*a}>{blobs.map((b,k)=><circle key={k} cx={b.x} cy={b.y} r={b.r*1.25} fill={color}/>)}</g>}
   <g filter="url(#goo)" opacity={.82+.18*a}>{blobs.map((b,k)=><circle key={k} cx={b.x} cy={b.y} r={b.r} fill={color}/>)}<rect x={-70} y={74} width={140} height={30} fill={color}/></g>
   {blobs.map((b,k)=><circle key={k} cx={b.x-b.r*.35} cy={b.y-b.r*.35} r={b.r*.28} fill="#fff" opacity={.28}/>)}
  </g>
  <polygon points={pts([[-34,-150],[-24,-150],[-46,30],[-54,22]])} fill="#fff" opacity={.2}/>
  <polygon points={pts([[30,-150],[36,-150],[56,18],[50,24]])} fill="#fff" opacity={.07}/>
  <Facets poly={[[-48,90],[48,90],[70,200],[60,222],[-60,222],[-70,200]]} light="#4E4F62" dark="#26273A"/>
  <polygon points={pts([[-48,90],[48,90],[52,108],[-52,108]])} fill={color} opacity={.35+.5*a}/>
  <line x1={-64} y1={176} x2={64} y2={176} stroke={C.lavender} strokeOpacity={.22} strokeWidth={3}/>
 </g>;
}
function LampWall({o,t,a,uid}:ObjProps){
 const cols=o.cols,rows=o.rows,w=cols*120,h=rows*330;
 return <g>
  <rect x={-w/2-34} y={-h/2-30} width={w+68} height={h+52} rx={18} fill="#0E0A16" stroke={C.purpleStroke} strokeOpacity={.25} strokeWidth={3}/>
  {Array.from({length:rows},(_,r)=>{const y=(r-(rows-1)/2)*330;return <g key={r}>
   {Array.from({length:cols},(_,c)=>{const x=(c-(cols-1)/2)*120,v=Math.floor(hash(r*17+c*5)*3)+r+c;return <g key={c} transform={`translate(${x},${y-6}) scale(.68)`}><LavaLamp t={t+hash(r*9+c)*7} a={a} uid={`${uid}-${r}-${c}`} variant={v} detail={0}/></g>;})}
   <polygon points={pts([[-w/2-20,y+148],[w/2+20,y+148],[w/2+10,y+164],[-w/2-10,y+164]])} fill="#4E4F62"/>
   <rect x={-w/2-10} y={y+164} width={w+20} height={8} fill="#26273A"/>
  </g>;})}
 </g>;
}
function Camera({o,t,a,flip,xray}:ObjProps&{flip:boolean;xray:number}){
 const rec=a>.5&&Math.floor(t*2)%2===0;
 return <g transform={flip?"scale(-1,1)":undefined}>
  <Shadow w={240} y={212}/>
  {[[-96,210],[96,210],[0,214]].map(([x,y],i)=><line key={i} x1={0} y1={10} x2={x} y2={y} stroke="#3A3B4C" strokeWidth={14} strokeLinecap="round"/>)}
  <rect x={-14} y={-14} width={28} height={40} fill="#26273A"/>
  <polygon points={pts([[-110,-130],[60,-130],[84,-150],[-86,-150]])} fill="#666882"/>
  <Facets poly={[[-110,-130],[60,-130],[60,-20],[-110,-20]]} light="#4E4F62" dark="#2E2F42" split={-30}/>
  <Facets poly={[[60,-120],[150,-140],[150,-10],[60,-30]]} light="#3A3B4C" dark="#26273A" split={105}/>
  <circle cx={150} cy={-75} r={46} fill="#120C1D" stroke="#666882" strokeWidth={10}/>
  <circle cx={150} cy={-75} r={26} fill={C.purple} opacity={.55+.35*a}/>
  <circle cx={140} cy={-86} r={9} fill="#fff" opacity={.5}/>
  <circle cx={-82} cy={-104} r={10} fill={rec?C.pink:"#4E4F62"}/>
  {xray>.01&&<g opacity={xray}><rect x={-96} y={-118} width={140} height={86} rx={6} fill="#0A0D1F" stroke={C.lavender} strokeWidth={3}/>
   {Array.from({length:6},(_,r)=>Array.from({length:10},(_,c)=>{const n=hash(Math.floor(t*12)*97+r*13+c);return <rect key={`${r}-${c}`} x={-90+c*13.4} y={-112+r*12.6} width={11} height={10.6} fill={n>.66?C.pink:n>.33?C.purple:C.lavender} opacity={.35+.65*n}/>;}))}</g>}
 </g>;
}
function Monitor({t,a}:ObjProps){
 const tick=Math.floor(t*6);
 return <g>
  <Shadow w={300} y={176}/>
  <polygon points={pts([[-40,120],[40,120],[70,170],[-70,170]])} fill="#3A3B4C"/>
  <Facets poly={[[-210,-170],[210,-170],[210,120],[-210,120]]} light="#4E4F62" dark="#2E2F42"/>
  <rect x={-188} y={-150} width={376} height={244} rx={10} fill="#07050B"/>
  {Array.from({length:4},(_,r)=>Array.from({length:6},(_,c)=>{const pred=String((c%3)+1),rnd=String(Math.floor(hash(tick*31+r*7+c)*10)),x=-150+c*60,y=-96+r*56;
   return <g key={`${r}-${c}`} fontFamily="'Manrope Variable',sans-serif" fontWeight={800} fontSize={38} textAnchor="middle">
    <text x={x} y={y} fill={C.muted} opacity={1-a}>{pred}</text>
    <text x={x} y={y} fill={LAVA[(r+c+tick)%3]} opacity={a}>{rnd}</text></g>;}))}
 </g>;
}
function Server({t,a}:ObjProps){
 return <g>
  <Shadow w={260} y={196}/>
  <Facets poly={[[-150,-190],[150,-190],[150,190],[-150,190]]} light="#3A3B4C" dark="#1D1628" split={-20}/>
  {Array.from({length:5},(_,i)=>{const y=-160+i*68;return <g key={i}>
   <rect x={-126} y={y} width={252} height={52} rx={8} fill="#120C1D" stroke={C.purpleStroke} strokeOpacity={.3}/>
   {Array.from({length:4},(_,k)=>{const on=hash(Math.floor(t*5)*13+i*4+k)>.45;return <circle key={k} cx={-96+k*26} cy={y+26} r={7} fill={on&&a>.2?C.lavender:"#4E4F62"} opacity={on?.4+.6*a:1}/>;})}
   <rect x={20} y={y+20} width={84} height={12} rx={6} fill="#3A3B4C"/></g>;})}
 </g>;
}
function PixelGrid({t,a}:ObjProps){
 const n=7,cell=52,half=n*cell/2;
 return <g>
  <rect x={-half-22} y={-half-22} width={n*cell+44} height={n*cell+44} rx={16} fill={C.ivory}/>
  <rect x={-half} y={-half} width={n*cell} height={n*cell} fill="#140B22"/>
  {Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>{
   const d=clamp01((a*1.6-(r+c)/(2*n))*2.2),x=-half+c*cell,y=-half+r*cell,lava=LAVA[(c+Math.floor(r/3))%3],blob=(.5+.5*Math.sin(c*1.3+r*.7+t*.8))*(c%2?1:.6);
   return <g key={`${r}-${c}`}>
    <rect x={x+1} y={y+1} width={cell-2} height={cell-2} fill={lava} opacity={(1-d)*blob*.85}/>
    <rect x={x+2} y={y+2} width={cell-4} height={cell-4} fill="#120C1D" opacity={d}/>
    <text x={x+cell/2} y={y+cell/2+8} textAnchor="middle" fontFamily="'Manrope Variable',sans-serif" fontWeight={800} fontSize={20} fill={C.lavender} opacity={d}>{Math.floor(hash(r*31+c*7)*256)}</text></g>;}))}
 </g>;
}
function HashPress({t,a}:ObjProps){
 const press=ease(a),plate=-150+130*press,out=clamp01((a-.55)/.45);
 return <g>
  <Shadow w={320} y={224}/>
  <Facets poly={[[-170,-210],[-130,-210],[-130,200],[-170,200]]} light="#4E4F62" dark="#2E2F42" split={-150}/>
  <Facets poly={[[130,-210],[170,-210],[170,200],[130,200]]} light="#4E4F62" dark="#2E2F42" split={150}/>
  <polygon points={pts([[-180,-230],[180,-230],[170,-200],[-170,-200]])} fill="#666882"/>
  <rect x={-12} y={-200} width={24} height={plate+190} fill="#3A3B4C"/>
  <Facets poly={[[-120,plate-20],[120,plate-20],[110,plate+16],[-110,plate+16]]} light={C.purple} dark="#5B3A94"/>
  <polygon points={pts([[-130,120],[130,120],[150,200],[-150,200]])} fill="#3A3B4C"/>
  <rect x={-90} y={plate+22} width={180} height={Math.max(4,96-60*press)} rx={6} fill="#140B22" stroke={C.lavender} strokeOpacity={.4}/>
  <g opacity={out} transform={`translate(${40+120*out},150)`}><rect x={-118} y={-38} width={236} height={76} rx={14} fill={C.yellow}/>
   <text x={0} y={16} textAnchor="middle" fontFamily="'Manrope Variable',sans-serif" fontWeight={800} fontSize={44} fill="#120C1D">9F 3A 71</text></g>
 </g>;
}
function Mixer({t,a}:ObjProps){
 const spin=t*80;
 return <g>
  <Shadow w={300} y={176}/>
  <Facets poly={[[-190,-120],[190,-120],[110,110],[-110,110]]} light="#3A3B4C" dark="#1D1628"/>
  <ellipse cx={0} cy={-120} rx={190} ry={40} fill="#120C1D" stroke={C.purpleStroke} strokeWidth={4}/>
  <g transform={`translate(0,-120) scale(1,.21) rotate(${spin})`} opacity={.35+.65*a}>{[0,1,2].map(k=><path key={k} d={`M0 0 Q ${90} ${-60} ${150} 0`} transform={`rotate(${k*120})`} stroke={[C.yellow,C.lavender,C.purple][k]} strokeWidth={22} fill="none" strokeLinecap="round"/>)}</g>
  <polygon points={pts([[-36,110],[36,110],[22,168],[-22,168]])} fill="#4E4F62"/>
  <circle cx={0} cy={-120} r={30+14*a} fill={C.yellow} opacity={.15*a}/>
 </g>;
}
function Seed({t,a}:ObjProps){
 const p=1+.05*Math.sin(t*4);
 return <g transform={`scale(${p})`}>
  <circle r={60+40*a} fill="url(#glow-1)" opacity={.1+.9*a}/>
  <g opacity={.35+.65*a}>
  <polygon points={pts([[0,-56],[38,-8],[0,52],[-38,-8]])} fill={C.yellow}/>
  <polygon points={pts([[0,-56],[-38,-8],[0,4]])} fill={C.yellowLine}/>
  <polygon points={pts([[0,4],[38,-8],[0,52]])} fill="#C99A2E"/></g>
  <polygon points={pts([[0,-56],[38,-8],[0,52],[-38,-8]])} fill="none" stroke={C.yellow} strokeWidth={4} strokeDasharray="8 8" opacity={.7*(1-a)}/>
 </g>;
}
function Gear({x,y,r,angle}:{x:number;y:number;r:number;angle:number}){
 const teeth=10,p:number[][]=[];for(let i=0;i<teeth*2;i++){const an=i*Math.PI/teeth,rr=i%2?r:r*1.18;p.push([Math.cos(an)*rr,Math.sin(an)*rr]);}
 return <g transform={`translate(${x},${y}) rotate(${angle})`}><polygon points={pts(p)} fill="#666882"/><circle r={r*.35} fill="#26273A"/></g>;
}
function Generator({t,a}:ObjProps){
 const sprout=easeOut(a);
 return <g>
  <Shadow w={340} y={214}/>
  <Facets poly={[[-180,-120],[180,-120],[180,210],[-180,210]]} light="#3A3B4C" dark="#1D1628" split={-40}/>
  <Gear x={-80} y={40} r={62} angle={t*40}/><Gear x={40} y={100} r={44} angle={-t*56+12}/>
  <rect x={70} y={-60} width={86} height={120} rx={12} fill="#120C1D" stroke={C.yellow} strokeOpacity={.3+.6*a} strokeWidth={4}/>
  <circle cx={113} cy={0} r={22} fill={C.yellow} opacity={.25+.75*a}/>
  <g transform={`translate(-20,-120) scale(1,${sprout})`}>
   <path d="M0 0 C 0 -60, 8 -110, 0 -170" stroke={C.green} strokeWidth={10} fill="none" strokeLinecap="round"/>
   <path d="M2 -90 C 40 -120, 70 -110, 86 -140 C 50 -150, 20 -130, 2 -90 Z" fill={C.green}/>
   <path d="M0 -130 C -40 -160, -64 -150, -80 -178 C -44 -186, -16 -168, 0 -130 Z" fill="#4FAE33"/>
  </g>
 </g>;
}
function NumberStream({t,a}:ObjProps){
 const w=620,len=w*easeOut(a);
 return <g>
  <clipPath id="stream-clip"><rect x={-w/2} y={-55} width={len} height={110}/></clipPath>
  <rect x={-w/2} y={-38} width={w} height={76} rx={38} fill="#120C1D" stroke={C.purpleStroke} strokeOpacity={.35} strokeWidth={3}/>
  <g clipPath="url(#stream-clip)">{Array.from({length:14},(_,i)=>{const x=-w/2+((i*48+t*140)%(w+40))-20;return <text key={i} x={x} y={14} fontFamily="'Manrope Variable',sans-serif" fontWeight={800} fontSize={36} fill={LAVA[i%3]}>{Math.floor(hash(i*11+Math.floor((t*140+i*48)/(w+40)))*10)}</text>;})}</g>
 </g>;
}
function Key({t,a}:ObjProps){
 const shape=<><circle cx={-70} cy={0} r={42} fill={C.ivory}/><circle cx={-70} cy={0} r={16} fill="#120C1D"/><polygon points={pts([[-30,-14],[110,-14],[110,14],[-30,14]])} fill={C.ivory}/><polygon points={pts([[60,14],[80,14],[80,40],[60,40]])} fill="#D9D2C0"/><polygon points={pts([[90,14],[108,14],[108,32],[90,32]])} fill="#D9D2C0"/></>;
 const fan=easeOut(a);
 return <g>{[-1,1].map(s=><g key={s} transform={`rotate(${s*22*fan}) translate(0,${-6*fan})`} opacity={fan*.85}>{shape}</g>)}{shape}
  <rect x={-110} y={-40} width={30} height={80} fill="#fff" opacity={.35*Math.max(0,Math.sin(t*2.4))} transform={`translate(${((t*160)%300)},0) skewX(-20)`}/></g>;
}
function Padlock({a}:{a:number}){
 const shut=ease(clamp01((a-.35)/.4));
 return <g><path d={`M -50 ${-30-40*(1-shut)} V -70 A 50 50 0 0 1 50 -70 V ${-30-40*(1-shut)*.2}`} stroke="#B8B6C8" strokeWidth={22} fill="none"/>
  <Facets poly={[[-80,-30],[80,-30],[80,110],[-80,110]]} light={C.yellow} dark="#C99A2E"/><g opacity={shut}><Facets poly={[[-80,-30],[80,-30],[80,110],[-80,110]]} light={C.green} dark="#3F9A28"/></g><circle cx={0} cy={30} r={14} fill="#120C1D"/><rect x={-5} y={30} width={10} height={36} fill="#120C1D"/></g>;
}
function Browser({a}:ObjProps){
 const shut=clamp01((a-.35)/.4);
 return <g>
  <Facets poly={[[-260,-180],[260,-180],[260,180],[-260,180]]} light="#3A3B4C" dark="#1D1628"/>
  <rect x={-260} y={-180} width={520} height={56} fill="#4E4F62"/>{[0,1,2].map(i=><circle key={i} cx={-226+i*30} cy={-152} r={9} fill={[C.pink,C.yellow,C.green][i]}/>)}
  <rect x={-220} y={-100} width={440} height={54} rx={27} fill="#120C1D" stroke={shut>.5?C.green:C.purpleStroke} strokeWidth={4}/>
  <g transform="translate(-182,-73) scale(.22)"><Padlock a={a}/></g>
  <text x={-150} y={-62} fontFamily="'Manrope Variable',sans-serif" fontWeight={700} fontSize={28} fill={shut>.5?C.green:C.muted}>https://</text>
  {[0,1,2,3].map(i=><rect key={i} x={-220} y={-10+i*44} width={[400,320,360,240][i]} height={18} rx={9} fill="#4E4F62"/>)}
 </g>;
}
/** Long labels shrink to stay inside the 540-wide frame (Manrope 800 ≈ 0.62 em per character). */
export const plaqueFontSize=(label:string)=>Math.min(44,Math.floor(492/(Math.max(1,[...label].length)*.62)));
function Plaque({o,a}:ObjProps){
 return <g><rect x={-270} y={-60} width={540} height={120} rx={16} fill="#120C1D" stroke={C.purpleStroke} strokeWidth={4}/><rect x={-270} y={-60} width={540} height={120} rx={16} fill={C.purple} opacity={.15*a}/>
  <text x={0} y={plaqueFontSize(o.label)*.36} textAnchor="middle" fontFamily="'Manrope Variable',sans-serif" fontWeight={800} fontSize={plaqueFontSize(o.label)} fill={C.ivory}>{o.label}</text></g>;
}
function CloudSign({o,a}:ObjProps){
 return <g><circle cx={0} cy={-30} r={120} fill="url(#glow-2)" opacity={.2+.5*a}/>
  <g transform="translate(0,-40)"><Facets poly={[[-120,30],[-90,-20],[-40,-40],[0,-70],[50,-50],[90,-20],[120,30]]} light={C.lavender} dark="#B7A3D6"/><rect x={-120} y={28} width={240} height={10} rx={5} fill="#B7A3D6"/></g>
  <text x={0} y={86} textAnchor="middle" fontFamily="'Manrope Variable',sans-serif" fontWeight={800} fontSize={54} letterSpacing={-1} fill={C.ivory}>{o.label}</text></g>;
}
function Person({t,a,walking}:ObjProps&{walking:number}){
 const swing=Math.sin(t*7)*24*walking;
 return <g><Shadow w={140} y={190}/>
  <line x1={-14} y1={60} x2={-14-swing} y2={186} stroke="#3A3B4C" strokeWidth={24} strokeLinecap="round"/><line x1={14} y1={60} x2={14+swing} y2={186} stroke="#4E4F62" strokeWidth={24} strokeLinecap="round"/>
  {[-1,1].map(s=><g key={s}><line x1={s*44} y1={-88} x2={s*60+s*swing*.4} y2={24} stroke={s<0?C.purple:"#5B3A94"} strokeWidth={20} strokeLinecap="round"/><circle cx={s*60+s*swing*.4} cy={30} r={11} fill="#E8C9A8"/></g>)}
  <Facets poly={[[-48,-100],[48,-100],[36,70],[-36,70]]} light={C.purple} dark="#5B3A94"/>
  <circle cx={0} cy={-140} r={36} fill="#E8C9A8"/><path d="M -36 -144 A 36 36 0 0 1 36 -144 Q 0 -166 -36 -144 Z" fill="#3A2416"/>
  {[-1,1].map(s=><circle key={s} cx={s*12} cy={-138} r={4.5} fill="#120C1D"/>)}</g>;
}
/** Star → atmosphere → shower; the pink secondary ends on the footprint's bottom edge, where its target stands. */
function CosmicRay({t,a}:ObjProps){
 const p1=ease(clamp01(a/.4)),p2=easeOut(clamp01((a-.4)/.45)),hit=clamp01((a-.85)/.15),top=-360,air=-110,tw=.75+.25*Math.sin(t*3.1);
 const ends=[[-150,290],[-84,350],[0,400],[92,330],[160,270]],head=top+36+(air-top-36)*p1;
 return <g>
  <circle cx={0} cy={top} r={80} fill="url(#glow-1)" opacity={.45*tw}/>
  <polygon points={pts([[0,top-36],[8,top-8],[36,top],[8,top+8],[0,top+36],[-8,top+8],[-36,top],[-8,top-8]])} fill={C.yellow} opacity={.55+.45*tw}/>
  <path d={`M -180 ${air+26} Q 0 ${air-24} 180 ${air+26} L 180 ${air+60} Q 0 ${air+10} -180 ${air+60} Z`} fill={C.lavender} opacity={.14}/>
  <path d={`M -180 ${air+26} Q 0 ${air-24} 180 ${air+26}`} stroke={C.lavender} strokeOpacity={.5} strokeWidth={3} fill="none"/>
  <g opacity={clamp01(a*6)}>
   <line x1={0} y1={top+36} x2={0} y2={head} stroke={C.yellow} strokeWidth={22} strokeOpacity={.22} strokeLinecap="round"/>
   <line x1={0} y1={top+36} x2={0} y2={head} stroke={C.yellow} strokeWidth={8} strokeLinecap="round"/>
   {p1<1&&<circle cx={0} cy={head} r={13} fill={C.ivory}/>}
  </g>
  <circle cx={0} cy={air} r={30+30*p2} fill={C.yellow} opacity={.35*p2*(1-hit*.6)}/>
  {ends.map(([ex,ey],i)=>{const hot=i===2,x=ex*p2,y=air+(ey-air)*p2,c=hot?C.pink:C.lavender;if(p2<=.002)return null;
   return <g key={i}><line x1={0} y1={air} x2={x} y2={y} stroke={c} strokeWidth={hot?9:5} strokeOpacity={hot?1:.75} strokeLinecap="round"/>
    <line x1={0} y1={air} x2={x} y2={y} stroke={C.ivory} strokeWidth={hot?5:3} strokeDasharray="5 42" strokeDashoffset={-t*150-i*13} strokeLinecap="round" opacity={.7*p2}/>
    {p2<1&&<circle cx={x} cy={y} r={hot?11:7} fill={c}/>}</g>;})}
  {hit>0&&<g>
   <circle cx={0} cy={400} r={46} fill={C.pink} opacity={.25*hit}/>
   {[0,.5].map(k=>{const f=(t*1.1+k)%1;return <circle key={k} cx={0} cy={400} r={14+58*f} fill="none" stroke={C.pink} strokeWidth={4} opacity={hit*(1-f)}/>;})}
   <circle cx={0} cy={400} r={12} fill={C.ivory} opacity={hit}/>
  </g>}
 </g>;
}
/** Chip on top (the particle strikes its upper edge), magnified 16-bit row below; the fourth bit from the left is the 2¹² place.
 *  active 0→.5 flips that bit, .5→1 shows error-correction check bits restoring it. */
function MemoryChip({t,a,xray}:ObjProps&{xray:number}){
 const flip=ease(clamp01(a/.5)),fix=ease(clamp01((a-.5)/.5)),bad=flip*(1-fix),BITS="0000001001101011",cell=26,step=30,row=16*step-4,x0=-(row+72)/2,y=128,spot={x:0,y:-160};
 return <g>
  <Shadow w={420} y={194}/>
  {Array.from({length:6},(_,i)=><g key={i}><rect x={-176} y={-172+i*28} width={30} height={10} rx={3} fill="#C99A2E"/><rect x={146} y={-172+i*28} width={30} height={10} rx={3} fill="#C99A2E"/></g>)}
  <Facets poly={[[-150,-196],[150,-196],[150,-12],[-150,-12]]} light="#3A3B4C" dark="#1D1628" split={-10}/>
  <circle cx={-124} cy={-172} r={8} fill="#26273A"/>
  {Array.from({length:5},(_,r)=>Array.from({length:9},(_,c)=><rect key={`${r}-${c}`} x={-114+c*26} y={-170+r*30} width={18} height={20} rx={3} fill={C.lavender} opacity={.12+.08*hash(r*9+c)}/>))}
  <rect x={spot.x-12} y={spot.y-10} width={22} height={20} rx={4} fill={C.pink} opacity={.85*bad}/>
  <rect x={spot.x-12} y={spot.y-10} width={22} height={20} rx={4} fill={C.green} opacity={.8*fix}/>
  <polygon points={pts([[spot.x-12,spot.y+10],[spot.x+10,spot.y+10],[x0+row,y-12],[x0,y-12]])} fill={C.lavender} opacity={.06+.08*bad}/>
  <rect x={x0-12} y={y-12} width={row+24} height={cell+36} rx={10} fill="#120C1D" stroke={C.purpleStroke} strokeOpacity={.5} strokeWidth={3}/>
  {[...BITS].map((b,i)=>{const x=x0+i*step,odd=i===3;return <g key={i} fontFamily="'Manrope Variable',sans-serif" fontWeight={800} fontSize={22} textAnchor="middle">
   <rect x={x} y={y} width={cell} height={cell+12} rx={5} fill={odd?C.pink:C.purple} opacity={odd?.18+.8*bad:b==="1"?.55:.2}/>
   {odd&&<rect x={x} y={y} width={cell} height={cell+12} rx={5} fill="none" stroke={C.green} strokeWidth={3} opacity={fix}/>}
   <text x={x+cell/2} y={y+cell} fill={C.ivory} opacity={odd?1-bad:1}>{b}</text>
   {odd&&<text x={x+cell/2} y={y+cell} fill={C.ivory} opacity={bad}>1</text>}</g>;})}
  {bad>.01&&<circle cx={x0+3*step+cell/2} cy={y+(cell+12)/2} r={30+6*Math.sin(t*6)} fill="none" stroke={C.pink} strokeWidth={3} opacity={bad*.8}/>}
  {xray>.01&&<g opacity={xray} fontFamily="'Manrope Variable',sans-serif" fontWeight={800} textAnchor="middle">
   <rect x={x0+3*step-3} y={y-3} width={cell+6} height={cell+18} rx={7} fill="none" stroke={C.yellow} strokeWidth={3} opacity={1-bad}/>
   {[[15,"1"],[14,"2"],[13,"4"],[12,"8"],[3,"4096"]].map(([i,w])=><text key={i} x={x0+Number(i)*step+cell/2} y={y+cell+42} fontSize={22} fill={Number(i)===3?C.yellow:C.ivory}>{w}</text>)}
   <text x={x0+8*step} y={y+cell+42} fontSize={22} fill={C.ivory} opacity={.6}>· · ·</text>
  </g>}
  {[0,1].map(k=>{const x=x0+row+14+k*step;return <g key={k} opacity={fix}><rect x={x} y={y} width={cell} height={cell+12} rx={5} fill={C.green} opacity={.75}/>
   <polyline points={pts([[x+6,y+19],[x+11,y+26],[x+20,y+11]])} stroke="#120C1D" strokeWidth={4} fill="none" strokeLinecap="round"/></g>;})}
 </g>;
}
function MagneticCard({stripe}:{stripe:number}){
 return <g><rect x={-60} y={-38} width={120} height={76} rx={8} fill={C.ivory}/><rect x={-60} y={-22} width={120} height={16} fill="#120C1D"/><rect x={-60} y={-22} width={120} height={16} fill={C.purple} opacity={stripe}/><rect x={-48} y={10} width={58} height={8} rx={4} fill="#D9D2C0"/></g>;
}
function VotingBooth({t,a}:ObjProps){
 const pen=ease(clamp01(a/.5)),card=ease(clamp01((a-.5)/.5)),tip={x:150+(46-150)*pen,y:70+(-72-70)*pen};
 return <g>
  <Shadow w={400} y={226}/>
  <rect x={-196} y={-236} width={392} height={12} rx={6} fill="#666882"/>
  <Facets poly={[[-190,-224],[190,-224],[190,214],[-190,214]]} light="#2E2F42" dark="#1D1628"/>
  {[-1,1].map(s=><polygon key={s} points={pts([[s*190,-224],[s*150,-224],[s*158,214],[s*190,214]])} fill={s<0?C.purple:"#5B3A94"} opacity={.85}/>)}
  <polygon points={pts([[-118,-170],[118,-170],[118,20],[-118,20]])} fill="#4E4F62"/>
  <rect x={-104} y={-156} width={208} height={162} rx={6} fill="#07050B"/>
  {Array.from({length:5},(_,i)=>{const y=-140+i*30,sel=i===2;return <g key={i}><rect x={-90} y={y} width={180} height={22} rx={5} fill={sel?C.yellow:C.lavender} opacity={sel?.15+.75*pen*(.85+.15*Math.sin(t*5)):.18+.12*a}/><rect x={-82} y={y+6} width={[90,120,70,104,80][i]} height={10} rx={5} fill={sel&&pen>.5?"#120C1D":C.muted} opacity={.6}/></g>;})}
  <Facets poly={[[-150,28],[150,28],[170,64],[-170,64]]} light="#4E4F62" dark="#3A3B4C"/>
  <rect x={-50} y={40} width={100} height={10} rx={5} fill="#07050B"/>
  <g transform={`translate(${30*card},${44+70*card})`} opacity={card}><MagneticCard stripe={.4+.6*card}/></g>
  <path d={`M 118 0 C 170 20, 180 80, ${tip.x+18} ${tip.y+30}`} stroke="#26273A" strokeWidth={5} fill="none"/>
  <line x1={tip.x} y1={tip.y} x2={tip.x+22} y2={tip.y+40} stroke={C.ivory} strokeWidth={12} strokeLinecap="round"/>
  <circle cx={tip.x} cy={tip.y} r={6} fill={pen>.9?C.yellow:"#120C1D"}/>
 </g>;
}
function BallotBox({t,a}:ObjProps){
 const fall=(t%2.2)/2.2,dropY=-250+150*ease(fall),dropO=a*Math.sin(Math.PI*fall),scan=-40+170*(.5+.5*Math.sin(t*2.2));
 return <g>
  <Shadow w={320} y={202}/>
  <g transform={`translate(0,${dropY}) rotate(90) scale(.7)`} opacity={dropO}><MagneticCard stripe={1}/></g>
  <Facets poly={[[-150,-110],[150,-110],[150,196],[-150,196]]} light="#3A3B4C" dark="#1D1628" split={-20}/>
  <polygon points={pts([[-160,-128],[160,-128],[150,-104],[-150,-104]])} fill="#666882"/>
  <rect x={-50} y={-122} width={100} height={12} rx={6} fill="#07050B"/>
  <rect x={-112} y={-70} width={224} height={220} rx={12} fill="#0A0D1F" stroke={C.purpleStroke} strokeOpacity={.4} strokeWidth={3}/>
  {Array.from({length:9},(_,k)=>{const x=(hash(k)-.5)*40;return <g key={k} opacity={clamp01(a*9-k)}><rect x={x-74} y={128-k*15} width={148} height={11} rx={3} fill={C.ivory}/><rect x={x-74} y={128-k*15} width={22} height={11} rx={2} fill={C.purple}/></g>;})}
  <g opacity={a}><rect x={-104} y={scan} width={208} height={4} fill={C.green}/><rect x={-104} y={scan-14} width={208} height={30} fill={C.green} opacity={.12}/></g>
  <circle cx={112} cy={170} r={9} fill={a>.5?C.green:"#4E4F62"} opacity={.5+.5*a}/>
 </g>;
}
/** Left: list total; right: one candidate. A candidate above its own list is impossible — the overshoot turns pink. */
function TallyBoard({o,a}:ObjProps){
 const g=ease(a),base=110,list=170,cand=100+150*g,over=clamp01((cand-list)/40);
 return <g>
  <Shadow w={480} y={232}/>
  {[-180,180].map(x=><rect key={x} x={x-8} y={170} width={16} height={60} fill="#3A3B4C"/>)}
  <Facets poly={[[-260,-220],[260,-220],[260,176],[-260,176]]} light="#2E2F42" dark="#1D1628"/>
  <rect x={-260} y={-220} width={520} height={64} fill="#4E4F62"/>
  {o.label&&<text x={0} y={-174} textAnchor="middle" fontFamily="'Manrope Variable',sans-serif" fontWeight={800} fontSize={36} fill={C.ivory}>{o.label}</text>}
  <line x1={-220} y1={base} x2={220} y2={base} stroke={C.lavender} strokeOpacity={.35} strokeWidth={3}/>
  <Facets poly={[[-170,base-list],[-50,base-list],[-50,base],[-170,base]]} light={C.lavender} dark="#B7A3D6" split={-110}/>
  <Facets poly={[[50,base-cand],[170,base-cand],[170,base],[50,base]]} light={C.purple} dark="#5B3A94" split={110}/>
  <g opacity={over}><rect x={50} y={base-cand} width={120} height={Math.max(0,cand-list)} fill={C.pink}/>
   <line x1={-220} y1={base-list} x2={220} y2={base-list} stroke={C.pink} strokeWidth={5} strokeDasharray="16 12"/></g>
  {[0,1,2].map(i=><rect key={i} x={-136} y={126+i*12} width={52} height={6} rx={3} fill={C.lavender} opacity={.7}/>)}
  <circle cx={110} cy={130} r={10} fill={C.lavender} opacity={.7}/><path d="M 92 164 Q 110 138 128 164 Z" fill={C.lavender} opacity={.7}/>
 </g>;
}
function ObjectArt(p:ObjProps&{walking:number;flip:boolean;xray:number;loop?:number;stackMax?:number}){
 switch(p.o.kind){
  case "lava-lamp":return <LavaLamp t={p.t} a={p.a} uid={p.uid} variant={Math.floor(hash(p.o.id.length)*3)}/>;
  case "lamp-wall":return <LampWall {...p}/>;case "camera":return <Camera {...p} flip={p.flip} xray={p.xray}/>;case "monitor":return <Monitor {...p}/>;case "server":return <Server {...p}/>;
  case "pixel-grid":return <PixelGrid {...p}/>;case "hash-press":return <HashPress {...p}/>;case "mixer":return <Mixer {...p}/>;case "seed":return <Seed {...p}/>;
  case "generator":return <Generator {...p}/>;case "number-stream":return <NumberStream {...p}/>;case "key":return <Key {...p}/>;case "browser":return <Browser {...p}/>;
  case "padlock":return <Padlock a={p.a}/>;case "plaque":return <Plaque {...p}/>;case "cloud-sign":return <CloudSign {...p}/>;case "person":return <Person {...p}/>;
  case "cosmic-ray":return <CosmicRay {...p}/>;case "memory-chip":return <MemoryChip {...p} xray={p.xray}/>;case "voting-booth":return <VotingBooth {...p}/>;
  case "ballot-box":return <BallotBox {...p}/>;case "tally-board":return <TallyBoard {...p}/>;
  case "cat":return <Cat t={p.t} a={p.a} xray={p.xray}/>;case "chrono-strip":return <ChronoStrip t={p.t} a={p.a}/>;
  case "inner-ear":return <InnerEar t={p.t} a={p.a}/>;case "spin-stool":return <SpinStool t={p.t} a={p.a} o={p.o as any}/>;
  case "ship":return <Ship t={p.t} a={p.a}/>;case "globe":return <Globe t={p.t} a={p.a}/>;case "clock-face":return <ClockFace t={p.t} a={p.a} label={p.o.label}/>;
  case "pendulum-clock":return <PendulumClock t={p.t} a={p.a}/>;case "sea-clock":return <SeaClock t={p.t} a={p.a} xray={p.xray}/>;case "pocket-watch":return <PocketWatch t={p.t} a={p.a} xray={p.xray}/>;
  case "leaning-tower":return <LeaningTower t={p.t} a={p.a} xray={p.xray}/>;
  case "sun":return <Sun t={p.t} a={p.a} uid={p.uid}/>;case "earth":return <Earth t={p.t} a={p.a} uid={p.uid}/>;case "moon":return <Moon t={p.t} a={p.a}/>;
  case "orbit":return <Orbit t={p.t} a={p.a}/>;case "light-front":return <LightFront t={p.t} a={p.a} returning={p.o.rows>=2} uid={p.uid}/>;case "planet-row":return <PlanetRow t={p.t} a={p.a}/>;
  case "night-sky":return <NightSky t={p.t} a={p.a} uid={p.uid}/>;case "thermometer":return <Thermometer t={p.t} a={p.a}/>;case "leaf":return <Leaf t={p.t} a={p.a}/>;
  case "spin-earth":return <SpinEarth t={p.t} a={p.a} o={p.o as any} uid={p.uid}/>;case "wind-surface":return <WindSurface t={p.t} a={p.a}/>;case "day-year":return <DayYear t={p.t} a={p.a}/>;
  // Topic catalogs (2026-10-20): one case label per kind, drawn by the topic file.
  case "qr-code":case "qr-scanner":case "codeword-row":case "rs-curve":case "ec-levels":case "scratched-disc":case "parts-crate":
   return <QrArt kind={p.o.kind} o={p.o as any} t={p.t} a={p.a} xray={p.xray} uid={p.uid}/>;
  case "net-globe":case "sea-cable":case "smartphone":case "card-terminal":case "airport":case "cargo-port":case "gps-satellite":case "day-dial":
   return <NetArt kind={p.o.kind} o={p.o as any} t={p.t} a={p.a} xray={p.xray} uid={p.uid}/>;
  case "tunnel-earth":case "gravity-shells":case "stopwatch":case "depth-gauge":case "orbit-shadow":
   return <TunnelArt kind={p.o.kind} o={p.o as any} t={p.t} a={p.a} xray={p.xray} uid={p.uid}/>;
  case "truedepth-phone":case "face-scan":case "flat-photo":case "face-network":case "secure-enclave":case "gaze-eyes":case "odds-board":
   return <FaceidArt kind={p.o.kind} o={p.o as any} t={p.t} a={p.a} xray={p.xray} uid={p.uid}/>;
  case "login-phone":case "hash-grinder":case "hash-vault":case "guess-wall":case "lookup-table":case "salt-shaker":case "slow-hourglass":case "reset-letter":
   return <PwArt kind={p.o.kind} o={p.o as any} t={p.t} a={p.a} xray={p.xray} uid={p.uid}/>;
  case "listen-phone":case "noisy-bar":case "sound-wave":case "spectrogram":case "fingerprint-card":case "song-shelves":case "offset-histogram":case "track-card":
   return <ShazamArt kind={p.o.kind} o={p.o as any} t={p.t} a={p.a} xray={p.xray} uid={p.uid}/>;
  // «One minute on Earth» (2026-10-22): loop-aware ambient motion; money stacks scale to the tallest stack in their row.
  case "maternity-ward":case "viewer":case "counter":case "money-stack":case "minute-earth":case "upload-phone":case "kiss-couple":
   return <MinuteArt kind={p.o.kind} o={p.o as any} t={p.t} a={p.a} xray={p.xray} uid={p.uid} loop={p.loop} stackMax={p.stackMax}/>;
  // Real logo / photo tiles are drawn by MediaTiles in the HTML layer above the world (Remotion <Img> waits for decoding).
  case "logo-tile":case "person-tile":return null;
 }
}
/** Largest size whose longest line fits the safe text column x 78..938 (Manrope ≈0.66 em per letter). */
export function bigWordSize(text:string){const longest=Math.max(...text.split(" ").map(w=>w.length),1),line=text.length<=9?text.length:longest;return Math.floor(Math.min(150,(SAFE.right-SAFE.left)/(line*.66)));}
type Live={o:IllustratedTimeline["objects"][number];place:{x:number;y:number;scale:number};vis:number;a:number;walking:number};
function port(l:Live,toward:{x:number;y:number}){const [w,h]=footprint(l.o,l.place.scale),dx=toward.x-l.place.x,dy=toward.y-l.place.y;return Math.abs(dx)/w>Math.abs(dy)/h?{x:l.place.x+Math.sign(dx)*w/2,y:l.place.y}:{x:l.place.x,y:l.place.y+Math.sign(dy)*h/2};}
/** Object kinds whose x-ray details (bones, axes) are drawn once more above both world layers, unfiltered. */
const QR_OVER=new Set<string>(QR_XRAY_OVERLAY),NET_OVER=new Set<string>(NET_XRAY_OVERLAY),TUNNEL_OVER=new Set<string>(TUNNEL_XRAY_OVERLAY),FACEID_OVER=new Set<string>(FACEID_XRAY_OVERLAY),PW_OVER=new Set<string>(PW_XRAY_OVERLAY);
const XRAY_OVERLAY=new Set(["cat","sea-clock","pocket-watch","leaning-tower","earth",...QR_OVER,...NET_OVER,...TUNNEL_OVER,...FACEID_OVER,...PW_OVER]);
function OverlayArt({kind,t,a,xray,o}:{kind:string;t:number;a:number;xray:number;o:Live["o"]}){
 if(QR_OVER.has(kind))return <QrArt kind={kind} o={o} t={t} a={a} xray={xray} uid={o.id} overlay/>;
 if(NET_OVER.has(kind))return <NetArt kind={kind} o={o} t={t} a={a} xray={xray} uid={o.id} overlay/>;
 if(TUNNEL_OVER.has(kind))return <TunnelArt kind={kind} o={o} t={t} a={a} xray={xray} uid={o.id} overlay/>;
 if(FACEID_OVER.has(kind))return <FaceidArt kind={kind} o={o} t={t} a={a} xray={xray} uid={o.id} overlay/>;
 if(PW_OVER.has(kind))return <PwArt kind={kind} o={o} t={t} a={a} xray={xray} uid={o.id} overlay/>;
 switch(kind){case "cat":return <Cat t={t} a={a} xray={xray} overlay/>;case "sea-clock":return <SeaClock t={t} a={a} xray={xray} overlay/>;case "pocket-watch":return <PocketWatch t={t} a={a} xray={xray} overlay/>;
  case "earth":return <Earth t={t} a={a} xray={xray} overlay/>;default:return <LeaningTower t={t} a={a} xray={xray} overlay/>;}
}
/** Callout anchors for tall objects whose footprint edge is empty air: the tower's side anchors sit at its base, above the soil. */
const CALLOUT_ANCHOR:Record<string,Partial<Record<string,[number,number]>>>={"leaning-tower":{left:[-150,345],right:[150,345]},
 // The orbit's footprint edge is empty dashed ellipse: "top" points far ahead on Earth's straight line, "bottom" at the gravity line.
 orbit:{top:[481,-445],bottom:[300,-21]},
 // spin-earth "right" points at the ocean bulge where the tilted equator meets the shell.
 "spin-earth":{right:[233,-58]},
 ...QR_CALLOUT_ANCHOR,...NET_CALLOUT_ANCHOR,...TUNNEL_CALLOUT_ANCHOR,...FACEID_CALLOUT_ANCHOR,...PW_CALLOUT_ANCHOR,...SHAZAM_CALLOUT_ANCHOR,...MINUTE_CALLOUT_ANCHOR};
/** State changes that are the explanation itself run slower than the default 0.45 s: the cat turns in readable slow motion. */
export const KEY_SECONDS:Record<string,number>={cat:1.4,"chrono-strip":1.6,"spin-stool":.9,"leaning-tower":1.8,"clock-face":1.6,globe:1.2,ship:1.2,
 sun:1.8,earth:1.6,moon:1.4,orbit:2.2,"light-front":2.6,"planet-row":3.2,"night-sky":1.8,thermometer:1.6,leaf:1.4,
 "spin-earth":SPIN_EARTH_KEY,"wind-surface":1.6,"day-year":2,
 ...QR_KEY_SECONDS,...NET_KEY_SECONDS,...TUNNEL_KEY_SECONDS,...FACEID_KEY_SECONDS,...PW_KEY_SECONDS,...SHAZAM_KEY_SECONDS,...MINUTE_KEY_SECONDS} as Record<string,number>;
function World({tl,t,floorY,xray,overlay=false,space=false,loop}:{tl:IllustratedTimeline;t:number;floorY:number;xray:number;overlay?:boolean;space?:boolean;loop?:number}){
 // Loop ending (2026-10-22): objects on stage in the first frame are already there (the last frame showed them), no entrance.
 const live:Live[]=tl.objects.map(o=>{const enter=loop!==undefined&&o.enterAt<=LOOP_START?1:easeOut((t-o.enterAt)/.5),exit=o.exitAt===Infinity?0:ease((t-o.exitAt)/.45),place=placeAt(t,o,o.moveKeys);
  const moving=o.moveKeys.reduce((m,k)=>Math.max(m,t>=k.at&&t<k.at+.9?Math.sin(Math.PI*(t-k.at)/.9):0),0);
  return {o,place,vis:enter*(1-exit),a:o.kind in KEY_SECONDS?keyed(t,o.activeKeys,0,KEY_SECONDS[o.kind],easeSine):keyed(t,o.activeKeys),walking:moving};});
 const byId=new Map(live.map(l=>[l.o.id,l]));
 if(overlay)return <g>{live.filter(l=>l.vis>.002&&XRAY_OVERLAY.has(l.o.kind)).map(l=><g key={l.o.id} opacity={l.vis} transform={`translate(${l.place.x},${l.place.y}) scale(${l.place.scale*(.86+.14*l.vis)})`}><OverlayArt kind={l.o.kind} t={t} a={l.a} xray={xray} o={l.o}/></g>)}</g>;
 return <g>
  {!space&&<>
  <rect x={-2000} y={-2000} width={8000} height={floorY+2000} fill="url(#wall)"/>
  {Array.from({length:30},(_,i)=><rect key={i} x={-600+i*240} y={-2000} width={2} height={floorY+2000} fill={C.lavender} opacity={.035}/>)}
  <rect x={-2000} y={floorY-26} width={8000} height={26} fill="#120C1D"/>
  <rect x={-2000} y={floorY} width={8000} height={3000} fill="url(#floor)"/><line x1={-2000} y1={floorY} x2={6000} y2={floorY} stroke={C.lavender} strokeOpacity={.22} strokeWidth={4}/>
  </>}
  {live.filter(l=>l.vis>0&&["lava-lamp","lamp-wall"].includes(l.o.kind)).map(l=>{const [w]=footprint(l.o,l.place.scale);return <g key={`pool-${l.o.id}`} opacity={l.vis*(.35+.65*l.a)}><ellipse cx={l.place.x} cy={floorY+60} rx={w*1.1} ry={90} fill="url(#glow-0)" opacity={.5}/><ellipse cx={l.place.x} cy={l.place.y} rx={w*1.6} ry={w*1.3} fill="url(#glow-2)" opacity={.35}/></g>;})}
  {live.filter(l=>l.o.kind==="camera"&&l.o.aim&&l.vis>0&&l.a>0).map(l=>{const target=byId.get(l.o.aim);if(!target||target.vis<=0)return null;const side=Math.sign(target.place.x-l.place.x)||1,lens={x:l.place.x+side*150*l.place.scale,y:l.place.y-75*l.place.scale};const [tw,th]=footprint(target.o,target.place.scale);const near={x:target.place.x-side*tw/2,y:target.place.y};
   const flash=Math.max(0,...l.o.activeKeys.filter(k=>k.value>=.5).map(k=>t>=k.at&&t<k.at+.4?1-(t-k.at)/.4:0));
   return <g key={`cone-${l.o.id}`} opacity={l.vis*l.a}><polygon points={pts([[lens.x,lens.y],[near.x,near.y-th*.42],[near.x,near.y+th*.42]])} fill={C.lavender} opacity={.08}/><circle cx={lens.x} cy={lens.y} r={70} fill="#fff" opacity={flash*.8}/></g>;})}
  {tl.flows.map((f,i)=>{const a=byId.get(f.from),b=byId.get(f.to);if(!a||!b)return null;const o=easeOut((t-f.enterAt)/.5)*(f.exitAt===Infinity?1:1-ease((t-f.exitAt)/.45))*Math.min(a.vis,b.vis);if(o<=.005)return null;
   const p=port(a,b.place),q=port(b,a.place),mx=(p.x+q.x)/2,d=`M${p.x} ${p.y} C ${mx} ${p.y}, ${mx} ${q.y}, ${q.x} ${q.y}`,c=TONE[f.tone],dotted=f.style==="dotted";
   return <g key={`flow-${i}`} opacity={o}><path d={d} stroke={c} strokeOpacity={.25} strokeWidth={dotted?6:14} fill="none" strokeDasharray={dotted?"4 18":undefined} strokeLinecap="round"/>
    <path d={d} stroke={c} strokeWidth={dotted?6:10} fill="none" strokeDasharray={dotted?"4 30":"10 46"} strokeDashoffset={-t*(dotted?40:120)} strokeLinecap="round"/></g>;})}
  {live.filter(l=>l.vis>.002).map(l=><g key={l.o.id} opacity={l.vis} transform={`translate(${l.place.x},${l.place.y}) scale(${l.place.scale*(.86+.14*l.vis)})`}><ObjectArt o={l.o} t={t} a={l.a} uid={l.o.id} walking={l.walking} xray={xray} loop={loop} stackMax={l.o.kind==="money-stack"?moneyStackMax(tl.objects,l.o.id):undefined} flip={l.o.kind==="camera"&&!!byId.get(l.o.aim)&&byId.get(l.o.aim)!.place.x<l.place.x}/></g>)}
 </g>;
}
function Callout({text,tone,side,anchor,progress,opacity}:{text:string;tone:keyof typeof TONE;side:string;anchor:{x:number;y:number};progress:number;opacity:number}){
 const shown=text.slice(0,Math.ceil(text.length*progress)),color=TONE[tone],w=Math.min(SAFE.right-SAFE.left,46+text.length*22.5),off=110;
 let x=side==="left"?anchor.x-off-w:side==="right"?anchor.x+off:anchor.x-w/2,y=side==="top"?anchor.y-off-58:side==="bottom"?anchor.y+off:anchor.y-29;
 x=Math.max(SAFE.left,Math.min(SAFE.right-w,x));y=Math.max(20,Math.min(VIEW.height-78,y));
 const ex=Math.max(x,Math.min(x+w,anchor.x)),ey=anchor.y<y?y:anchor.y>y+58?y+58:y+29;
 return <div style={{position:"absolute",inset:0,opacity}}>
  <svg width={VIEW.width} height={VIEW.height} style={{position:"absolute",inset:0}}><line x1={ex} y1={ey} x2={anchor.x} y2={anchor.y} stroke={color} strokeWidth={3} strokeOpacity={.8}/><circle cx={anchor.x} cy={anchor.y} r={8} fill={color}/></svg>
  <div style={{position:"absolute",left:x,top:y,width:w,height:58,boxSizing:"border-box",padding:"0 20px",display:"flex",alignItems:"center",background:"#120C1DF2",border:`3px solid ${color}`,borderRadius:10,color,fontSize:30,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden"}}>{shown}{progress<1&&<span style={{display:"inline-block",width:14,height:30,marginLeft:4,background:color}}/>}</div>
 </div>;
}
export function IllustratedFilm({plan,profile,audio,alignment=[],captionStyle}:Props){
 const frame=useCurrentFrame(),{width}=useVideoConfig(),t=frame/30,clock=sceneClock(plan),L=illustratedLayout(profile.production?.portraitLayout,profile.production?.overlayVersion);
 // Overlay v2: the stage window is taller than the 1080×900 director view, which stays centred (dy) inside it.
 // Overlay v3: the stage is the whole frame; the view keeps its v2 place (dy = its top inside the stage).
 const dy=L.viewTop-L.stage,inStage=(n:React.ReactNode)=>dy?<div style={{position:"absolute",left:0,top:dy,width:VIEW.width,height:VIEW.height}}>{n}</div>:n;
 const tl=React.useMemo(()=>timeline(plan.illustrated!,plan.scenes,alignment),[plan,alignment]);
 const cam:Pose=cameraAt(t,tl.camera),xray=keyed(t,tl.mode,0,.6),world=`translate(${VIEW.width/2},${VIEW.height/2}) scale(${cam.zoom}) translate(${-cam.x},${-cam.y})`;
 const grid=120*cam.zoom,gx=((VIEW.width/2-cam.x*cam.zoom)%grid+grid)%grid,gy=((VIEW.height/2-cam.y*cam.zoom)%grid+grid)%grid;
 const current=clock.findIndex(s=>t>=s.start&&t<s.end),last=clock.at(-1)!.end,loop=plan.loopEnding?last:undefined;
 const defs=<defs>
  <filter id="goo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="7"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/></filter>
  {LAVA.map((c,i)=><radialGradient key={i} id={`glow-${i}`}><stop offset="0" stopColor={c} stopOpacity=".55"/><stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient>)}
  {LAVA.map((c,i)=><linearGradient key={i} id={`liquid-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#120C1D"/><stop offset=".7" stopColor={c} stopOpacity=".35"/><stop offset="1" stopColor={c} stopOpacity=".75"/></linearGradient>)}
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#07050B"/><stop offset=".75" stopColor="#141020"/><stop offset="1" stopColor="#1D1628"/></linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1A1424"/><stop offset=".35" stopColor="#0B0812"/><stop offset="1" stopColor="#000"/></linearGradient>
  <filter id="bloom" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="xray"><feColorMatrix type="saturate" values=".25"/><feComponentTransfer><feFuncR type="linear" slope=".7"/><feFuncG type="linear" slope=".7"/><feFuncB type="linear" slope=".9"/></feComponentTransfer></filter>
 </defs>;
 const space=plan.illustrated!.backdrop==="space",liveWorld=<World tl={tl} t={t} floorY={plan.illustrated!.floorY} xray={xray} space={space} loop={loop}/>;
 return <AbsoluteFill style={{background:C.background,color:profile.foreground,fontFamily:`'${profile.font} Variable',sans-serif`,overflow:"hidden"}}>
  <StudioBackground design={profile.backgroundDesign}/>
  {audio&&<Audio src={staticFile(audio)}/>}
  <div style={{position:"absolute",top:L.stage,left:0,width,height:L.stageHeight,overflow:"hidden",maskImage:L.bare?undefined:dy?`linear-gradient(to bottom, transparent 0px, black 54px, black ${L.stageHeight-90}px, transparent ${L.stageHeight}px)`:"linear-gradient(to bottom, transparent 0%, black 6%, black 90%, transparent 100%)"}}>
   <svg width={VIEW.width} height={L.stageHeight} viewBox={dy?`0 ${-dy} ${VIEW.width} ${L.stageHeight}`:undefined} style={{position:"absolute",inset:0}}>
    {defs}
    {space&&(dy?<g transform={`translate(0,${-dy})`}><SpaceBackdrop cam={cam} t={t} width={VIEW.width} height={L.stageHeight} loop={loop}/></g>:<SpaceBackdrop cam={cam} t={t} width={VIEW.width} height={VIEW.height} loop={loop}/>)}
    <pattern id="grid" width={grid} height={grid} patternUnits="userSpaceOnUse" x={gx} y={gy}><path d={`M ${grid} 0 L 0 0 0 ${grid}`} fill="none" stroke={C.purpleStroke} strokeWidth={1.5}/></pattern>
    <rect y={dy?-dy:undefined} width={VIEW.width} height={L.stageHeight} fill="#0A0D1F" opacity={.82*xray}/>
    <rect y={dy?-dy:undefined} width={VIEW.width} height={L.stageHeight} fill="url(#grid)" opacity={.05+.25*xray}/>
    {xray<.999&&<g transform={world} opacity={1-xray*.55}>{liveWorld}</g>}
    {xray>.001&&<g transform={world} opacity={xray*.55} filter="url(#xray)">{liveWorld}</g>}
    {xray>.01&&<g transform={world}><World tl={tl} t={t} floorY={plan.illustrated!.floorY} xray={xray} overlay loop={loop}/></g>}
    {space&&(dy?<g transform={`translate(0,${-dy})`}><SpaceDust cam={cam} width={VIEW.width} height={L.stageHeight}/></g>:<SpaceDust cam={cam} width={VIEW.width} height={VIEW.height}/>)}
   </svg>
   {inStage(<><MediaTiles tl={tl} t={t} cam={cam} media={plan.media} xray={xray}/>{tl.callouts.map((c,i)=>{const o=tl.objects.find(x=>x.id===c.target)!;const vis=easeOut((t-c.from)/.3)*(c.to===Infinity?1:1-ease((t-c.to)/.3));if(vis<=.005)return null;
    const place=placeAt(t,o,o.moveKeys),[w,h]=footprint(o,place.scale),anchor0=CALLOUT_ANCHOR[o.kind]?.[c.side],edge=anchor0?{x:place.x+anchor0[0]*place.scale,y:place.y+anchor0[1]*place.scale}:{top:{x:place.x,y:place.y-h/2},bottom:{x:place.x,y:place.y+h/2},left:{x:place.x-w/2,y:place.y},right:{x:place.x+w/2,y:place.y}}[c.side];
    const anchor=toScreen(edge,cam),outside=Math.max(0,-anchor.x,anchor.x-VIEW.width,-anchor.y,anchor.y-VIEW.height),inView=clamp01(1-outside/80);
    return inView>.005?<Callout key={i} text={c.text} tone={c.tone} side={c.side} anchor={anchor} progress={clamp01((t-c.from)/c.typing)} opacity={vis*inView}/>:null;})}
   {tl.bigWords.map((b,i)=>{const out=ease((t-b.exitAt)/.4);if(t<b.enterAt-.05||out>=1)return null;return <div key={i} style={{position:"absolute",left:SAFE.left,right:VIEW.width-SAFE.right,top:70,textAlign:"center",fontSize:bigWordSize(b.text),lineHeight:1.02,fontWeight:850,letterSpacing:-3,color:C.ivory,opacity:1-out,textShadow:"0 10px 40px #000",whiteSpace:"pre-wrap"}}>
    {(()=>{let k=0;return b.text.split(" ").map((w,wi)=><React.Fragment key={wi}>{wi>0&&" "}<span style={{display:"inline-block",whiteSpace:"nowrap"}}>{[...w].map(ch=>{const n=k++,m=easeOut((t-b.enterAt-n*.06)/.35);return <span key={n} style={{display:"inline-block",opacity:m,transform:`translateY(${(1-m)*-70}px) rotate(${(1-m)*(n%2?8:-8)}deg)`}}>{ch}</span>;})}</span></React.Fragment>);})()}</div>;})}</>)}
  </div>
  {L.bare&&<CaptionShade top={L.captions}/>}
  {!L.bare&&<div style={{position:"absolute",left:78,right:140,top:L.header,display:"flex",alignItems:"center",gap:18}}><div style={{width:56,height:56,borderRadius:"50%",background:"#000",border:`2px solid ${C.purpleStroke}`,overflow:"hidden"}}>{(plan.headerAvatar??profile.headerAvatar)&&<Img src={staticFile((plan.headerAvatar??profile.headerAvatar)!.file)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</div><span style={{fontSize:29,fontWeight:750}}>{profile.username??"@xtuned"}</span><span style={{marginLeft:"auto",fontSize:23,color:C.muted}}>{Math.round(last)} {profile.production?.language==="en"?"s":"с"}</span></div>}
  {!L.bare&&<div style={{position:"absolute",left:78,right:140,top:L.title,fontSize:34,fontWeight:750,letterSpacing:-1,lineHeight:1.12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{plan.title}</div>}
  {L.chrome&&<div style={{position:"absolute",left:78,right:140,top:L.progress,display:"flex",gap:8}}>{clock.map((s,i)=>{const p=clamp01((t-s.start)/s.seconds);return <div key={i} style={{flex:1,height:6,background:C.surfaceTop,borderRadius:4,overflow:"hidden"}}><div style={{height:6,width:`${p*100}%`,background:i===current?C.yellow:C.purple}}/></div>;})}</div>}
  {L.chrome&&clock.map((s,i)=>{const o=easeOut((t-s.start-.05)/.35)*(i===clock.length-1?1:1-easeOut((t-(s.end-.32))/.3));if(o<=.005)return null;return <div key={s.id} style={{position:"absolute",left:78,right:140,top:L.chapter,opacity:o,color:C.lavender,fontSize:26,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.title}</div>;})}
  {(captionStyle??profile.production?.captionStyle)?<StyledCaptions styleId={(captionStyle??profile.production?.captionStyle)!} alignment={alignment} t={t} lang={profile.production?.language} top={L.captions}/>:alignment.map((a,i)=><Captions key={i} a={a} t={t} lang={profile.production?.language} qualityMode={profile.production?.version===2} nextStart={alignment[i+1]?.words?.[0]?.start??alignment[i+1]?.start} top={L.captions}/>)}
 </AbsoluteFill>;
}
