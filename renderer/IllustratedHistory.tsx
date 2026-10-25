import React from "react";
import brand from "../video-design/brand.json";

// Prepared objects for the longitude/chronometer and Leaning Tower explainers (2026-10-20). Flat low-poly
// drawings in the illustrated style: two-tone facets lit from the top left, every value from the frame time and
// the keyed state. No randomness, no generated code.
const C=brand.colors;
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number,a:number,b:number)=>{const x=clamp01((v-a)/(b-a));return x*x*(3-2*x);};
const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
const pts=(p:number[][])=>p.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const FONT="'Manrope Variable',sans-serif";
function Two({poly,light,dark,split=0}:{poly:number[][];light:string;dark:string;split?:number}){
 const l=poly.map(([x,y])=>[Math.min(x,split),y]),r=poly.map(([x,y])=>[Math.max(x,split),y]);
 return <><polygon points={pts(l)} fill={light}/><polygon points={pts(r)} fill={dark}/></>;
}
const Shadow=({w,y}:{w:number;y:number})=><ellipse cx={0} cy={y} rx={w*.46} ry={w*.07} fill="#000" opacity={.45}/>;
const BRASS=["#F4CA50","#B8862A"],SILVER=["#E8E6F0","#9A97AC"],SEA=["#3A2A6E","#1E1640"];

/** Sailing ship on a wave plinth: 0 calm, 0.5 heavy roll in a storm, 1 struck on rocks, heeled and settling. */
export function Ship({t,a}:{t:number;a:number}){
 const storm=smooth(a,0,.5),wreck=smooth(a,.6,1),roll=Math.sin(t*1.3)*(3+13*storm)*(1-wreck*.7)+24*wreck,bob=Math.sin(t*1.1)*(4+9*storm)+34*wreck;
 const wave=(phase:number,amp:number,y:number)=>{const p:number[][]=[[-260,230],[-260,y]];for(let i=0;i<=16;i++){const x=-260+i*32.5;p.push([x,y+Math.sin(x/38+t*1.6+phase)*amp]);}p.push([260,y],[260,230]);return p;};
 const sail=(x:number,top:number,h:number,w:number,k:number)=>{const belly=10+14*storm*(1-wreck);return <path key={k} d={`M ${x-w/2} ${top} L ${x+w/2} ${top} Q ${x+w/2+belly} ${top+h/2} ${x+w/2} ${top+h} L ${x-w/2} ${top+h} Q ${x-w/2+belly} ${top+h/2} ${x-w/2} ${top} Z`} fill={k%2?"#D9D2C0":C.ivory} opacity={1-wreck*.35}/>;};
 return <g>
  <Shadow w={500} y={232}/>
  {storm>.02&&<g opacity={storm*.5}>{Array.from({length:9},(_,i)=>{const x=-240+i*60,y=((t*420+i*97)%380)-260;return <line key={i} x1={x} y1={y} x2={x-28} y2={y+70} stroke={C.lavender} strokeWidth={3} opacity={.5}/>;})}</g>}
  <polygon points={pts(wave(0,6+10*storm,150))} fill={SEA[1]}/>
  <g transform={`translate(0,${bob}) rotate(${roll},0,110)`}>
   {[[-95,-190,210],[10,-250,270],[110,-170,190]].map(([x,top,h],i)=><g key={i}><rect x={x-5} y={top} width={10} height={h+60} fill="#9C7A4A"/>
    {sail(x,top+20,h*.42,i===1?120:100,i*2)}{sail(x,top+30+h*.45,h*.42,i===1?140:118,i*2+1)}
    <polygon points={pts([[x,top-26],[x+34,top-16],[x,top-6]])} fill={C.pink}/></g>)}
   <Two poly={[[-205,30],[-170,40],[175,52],[215,26],[150,128],[-150,128]]} light="#5B3A94" dark="#3A2264" split={-10}/>
   <polygon points={pts([[-180,52],[180,62],[176,72],[-182,62]])} fill={C.yellow} opacity={.85}/>
   {Array.from({length:7},(_,i)=><rect key={i} x={-140+i*42} y={80} width={16} height={14} rx={2} fill="#120C1D"/>)}
  </g>
  <g opacity={wreck}><Two poly={[[120,150],[150,70],[190,40],[235,85],[260,150]]} light="#7C7A92" dark="#4E4F62" split={190}/><Two poly={[[60,160],[88,110],[118,150]]} light="#7C7A92" dark="#4E4F62" split={88}/>
   {[0,.5].map(k=>{const f=(t*1.4+k)%1;return <circle key={k} cx={175} cy={78} r={12+48*f} fill="none" stroke={C.pink} strokeWidth={5} opacity={(1-f)*smooth(wreck,.15,.5)}/>;})}</g>
  <polygon points={pts(wave(1.7,8+12*storm,170+wreck*-30))} fill={SEA[0]} opacity={.9}/>
  <polygon points={pts(wave(1.7,8+12*storm,170+wreck*-30).slice(1,-1).map(([x,y])=>[x,y]))} fill="none" stroke={C.lavender} strokeOpacity={.35} strokeWidth={4}/>
  <g opacity={wreck}><Two poly={[[150,190],[172,120],[205,96],[238,128],[255,190]]} light="#8C8AA2" dark="#55566A" split={205}/>{[0,1,2].map(k=>{const f=(t*.9+k*.33)%1;return <path key={k} d={`M ${140+k*30} ${150-f*40} q 10 -12 20 0`} stroke={C.ivory} strokeWidth={4} fill="none" opacity={(1-f)*.8}/>;})}</g>
  <rect x={-260} y={196} width={520} height={34} rx={8} fill="#26273A"/>
 </g>;
}

// Rough low-poly continents in (longitude, latitude) degrees: illustrative outlines only.
const LAND:number[][][]=[
 [[-10,36],[0,44],[-5,50],[2,52],[10,55],[20,56],[30,60],[40,62],[45,50],[35,42],[25,36],[12,38],[5,43]],
 [[-17,15],[-10,5],[8,4],[12,-5],[18,-30],[27,-34],[35,-25],[40,-10],[50,10],[43,12],[33,30],[20,32],[10,36],[-5,35]],
 [[-80,10],[-75,-5],[-80,-15],[-70,-35],[-60,-45],[-50,-25],[-35,-8],[-50,0],[-60,8]],
 [[-125,48],[-120,35],[-105,22],[-90,18],[-82,25],[-75,38],[-65,45],[-80,52],[-100,58],[-120,58]],
 [[-55,60],[-40,62],[-25,70],[-45,80],[-60,76]],
];
const D=Math.PI/180;
/** Globe on a stand. active 0 plain, 0.5 longitude lines glow, 1 a yellow 15° wedge between the home meridian and the ship. */
export function Globe({t,a}:{t:number;a:number}){
 const r=150,cy=-40,lines=smooth(a,.2,.5),wedge=smooth(a,.6,1),phi=-8*D+.22*Math.sin(t*.3);
 const proj=(lon:number,lat:number)=>{const l=lon*D-phi,b=lat*D,x=r*Math.cos(b)*Math.sin(l),y=cy-r*Math.sin(b),z=Math.cos(b)*Math.cos(l);
  if(z>=0)return [x,y];const k=r/Math.hypot(x,y-cy||1e-6);return [x*k,cy+(y-cy)*k];};
 const meridian=(lon:number)=>Array.from({length:19},(_,i)=>-90+i*10).filter(lat=>Math.cos(lon*D-phi)>-.02).map(lat=>proj(lon,lat));
 const home=0,ship=-15,wedgePoly=[...Array.from({length:13},(_,i)=>proj(home,-60+i*10)),...Array.from({length:13},(_,i)=>proj(ship,60-i*10))];
 return <g>
  <Shadow w={260} y={214}/>
  <ellipse cx={0} cy={206} rx={110} ry={20} fill="#3A3B4C"/><rect x={-12} y={140} width={24} height={66} fill="#4E4F62"/>
  <path d={`M ${-r-26} ${cy} A ${r+26} ${r+26} 0 0 1 ${r+26} ${cy}`} stroke={BRASS[1]} strokeWidth={12} fill="none" transform={`rotate(-20,0,${cy})`}/>
  <clipPath id="globe-disc"><circle cx={0} cy={cy} r={r}/></clipPath>
  <circle cx={0} cy={cy} r={r} fill={SEA[0]}/>
  <g clipPath="url(#globe-disc)">
   <circle cx={-50} cy={cy-60} r={150} fill="#5B3A94" opacity={.35}/>
   {LAND.map((poly,i)=><polygon key={i} points={pts(poly.map(([lo,la])=>proj(lo,la)))} fill={i%2?"#B7A3D6":C.lavender} opacity={.85}/>)}
   {[-60,-30,0,30,60].map(lat=><line key={lat} x1={-r} y1={cy-r*Math.sin(lat*D)} x2={r} y2={cy-r*Math.sin(lat*D)} stroke={C.ivory} strokeOpacity={.12}/>)}
   {Array.from({length:24},(_,i)=>i*15-180).map(lon=>{const m=meridian(lon);return m.length>1?<polyline key={lon} points={pts(m)} fill="none" stroke={C.lavender} strokeWidth={lon===home||lon===ship?3:2} strokeOpacity={.12+.55*lines}/>:null;})}
   <polygon points={pts(wedgePoly)} fill={C.yellow} opacity={.72*wedge} stroke={C.yellowLine} strokeWidth={3}/>
   <circle cx={0} cy={cy} r={r} fill="url(#glow-2)" opacity={.12}/>
  </g>
  <circle cx={0} cy={cy} r={r} fill="none" stroke="#120C1D" strokeWidth={4}/>
  <g opacity={wedge}>{(()=>{const h=proj(home,52),s=proj(ship,48);return <><circle cx={h[0]} cy={h[1]} r={9} fill={C.ivory}/><polygon points={pts([[s[0]-11,s[1]+8],[s[0]+11,s[1]+8],[s[0],s[1]-12]])} fill={C.pink}/></>;})()}</g>
 </g>;
}

/** Clock face: active 0 shows 12:00, 1 shows 1:00 (the minute hand sweeps one full turn); optional label below. */
export function ClockFace({t,a,label}:{t:number;a:number;label:string}){
 const r=118,cy=-50,min=a*360,hour=a*30,sec=Math.floor(t)*6+6*Math.min(1,(t%1)*8);
 const hand=(deg:number,len:number,w:number,c:string)=><line x1={0} y1={cy} x2={Math.sin(deg*D)*len} y2={cy-Math.cos(deg*D)*len} stroke={c} strokeWidth={w} strokeLinecap="round"/>;
 return <g>
  <circle cx={0} cy={cy} r={r+18} fill={BRASS[1]}/><circle cx={-6} cy={cy-6} r={r+12} fill={BRASS[0]}/>
  <circle cx={0} cy={cy} r={r} fill={C.ivory}/>
  {Array.from({length:60},(_,i)=>{const big=i%5===0,an=i*6*D;return <line key={i} x1={Math.sin(an)*(r-(big?22:10))} y1={cy-Math.cos(an)*(r-(big?22:10))} x2={Math.sin(an)*(r-4)} y2={cy-Math.cos(an)*(r-4)} stroke="#120C1D" strokeWidth={big?6:2}/>;})}
  <text x={0} y={cy-r+48} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill="#120C1D">12</text>
  {hand(hour,62,12,"#120C1D")}{hand(min,96,7,"#120C1D")}{hand(sec,100,3,C.pink)}
  <circle cx={0} cy={cy} r={10} fill={BRASS[1]}/>
  {label&&<g><rect x={-150} y={104} width={300} height={74} rx={14} fill="#120C1D" stroke={C.purpleStroke} strokeOpacity={.6} strokeWidth={3}/>
   <text x={0} y={154} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={Math.min(44,Math.floor(276/(Math.max(1,label.length)*.6)))} fill={C.ivory}>{label}</text></g>}
 </g>;
}

/** Longcase pendulum clock: 0 steady swing; 1 on a rolling deck the case rocks, the pendulum goes erratic, the hands drift. */
export function PendulumClock({t,a}:{t:number;a:number}){
 const c=smooth(a,0,1),rock=Math.sin(t*1.3)*12*c,swing=Math.sin(t*Math.PI+.6)*8*(1-c*.4)+(Math.sin(t*2.3)*11+Math.sin(t*3.7+1)*6)*c,min=t*6+c*Math.sin(t*1.7)*80,hr=t*.5+c*Math.sin(t*1.1)*40;
 return <g>
  <Shadow w={200} y={262}/>
  <g transform={`rotate(${rock},0,258)`}>
   <Two poly={[[-90,-150],[90,-150],[90,258],[-90,258]]} light="#5B3A94" dark="#3A2264" split={-20}/>
   <polygon points={pts([[-104,-150],[104,-150],[80,-262],[-80,-262]])} fill="#4E3380"/>
   <circle cx={0} cy={-200} r={52} fill={C.ivory} stroke={BRASS[0]} strokeWidth={8}/>
   <line x1={0} y1={-200} x2={Math.sin(hr*D)*28} y2={-200-Math.cos(hr*D)*28} stroke="#120C1D" strokeWidth={7} strokeLinecap="round"/>
   <line x1={0} y1={-200} x2={Math.sin(min*D)*42} y2={-200-Math.cos(min*D)*42} stroke="#120C1D" strokeWidth={4} strokeLinecap="round"/>
   <rect x={-56} y={-118} width={112} height={320} rx={8} fill="#120C1D" stroke={C.purpleStroke} strokeOpacity={.4} strokeWidth={3}/>
   {/* The pendulum lives inside the case window: an erratic swing hits the walls instead of leaving the clock. */}
   <clipPath id="pendulum-window"><rect x={-54} y={-116} width={108} height={316} rx={7}/></clipPath>
   <g clipPath="url(#pendulum-window)"><g transform={`rotate(${swing},0,-104)`}><line x1={0} y1={-104} x2={0} y2={150} stroke={BRASS[1]} strokeWidth={5}/><circle cx={0} cy={160} r={26} fill={BRASS[0]}/><circle cx={-8} cy={152} r={8} fill="#fff" opacity={.5}/></g></g>
   <rect x={-56} y={-118} width={112} height={320} rx={8} fill="#fff" opacity={.05}/>
   <circle cx={0} cy={-200} r={70} fill={C.pink} opacity={.22*smooth(c,.4,1)*(.6+.4*Math.sin(t*6))}/>
  </g>
 </g>;
}

function Gear({x,y,r,angle,color="#B8862A"}:{x:number;y:number;r:number;angle:number;color?:string}){
 const n=Math.max(8,Math.round(r/4)),p:number[][]=[];for(let i=0;i<n*2;i++){const an=i*Math.PI/n,rr=i%2?r:r*1.16;p.push([Math.cos(an)*rr,Math.sin(an)*rr]);}
 return <g transform={`translate(${x},${y}) rotate(${angle})`}><polygon points={pts(p)} fill={color}/><circle r={r*.32} fill="#26273A"/></g>;
}
/** Harrison-style sea clock: two crossed dumbbell balances swing against each other, linked by springs; active =
 *  running; the x-ray overlay highlights the springs and the wheel train. */
export function SeaClock({t,a,xray,overlay=false}:{t:number;a:number;xray:number;overlay?:boolean}){
 const run=smooth(a,0,1),ang=22*Math.sin(t*Math.PI)*run,spin=t*40*run,cy=-118;
 const dumbbell=(deg:number,k:number)=><g key={k} transform={`translate(0,${cy}) rotate(${deg})`}><rect x={-120} y={-8} width={240} height={16} rx={8} fill={BRASS[1]}/><circle cx={-124} cy={0} r={30} fill={BRASS[0]}/><circle cx={124} cy={0} r={30} fill={BRASS[0]}/><circle cx={-133} cy={-9} r={9} fill="#fff" opacity={.45}/><circle cx={115} cy={-9} r={9} fill="#fff" opacity={.45}/></g>;
 const end=(deg:number,s:number)=>[Math.cos(deg*D)*124*s,cy+Math.sin(deg*D)*124*s];
 const zig=(p:number[],q:number[])=>{const out:number[][]=[];for(let i=0;i<=12;i++){const k=i/12,o=i%2&&i<12?10:-10;out.push([lerp(p[0],q[0],k)+(i&&i<12?o:0),lerp(p[1],q[1],k)]);}return out;};
 const a1=28+ang,a2=-28-ang,springs=[[end(a1,1),end(a2,1)],[end(a1,-1),end(a2,-1)]];
 if(overlay)return <g opacity={xray}>{springs.map(([p,q],i)=><polyline key={i} points={pts(zig(p,q))} fill="none" stroke={C.yellow} strokeWidth={5}/>)}
  {[[-95,60,44],[-20,110,30],[60,56,38],[130,120,26]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r*1.1} fill="none" stroke={C.lavender} strokeWidth={3}/>)}</g>;
 return <g>
  <Shadow w={420} y={214}/>
  <Two poly={[[-200,-30],[200,-30],[200,206],[-200,206]]} light="#3A3B4C" dark="#1D1628" split={-30}/>
  {[-200,186].map(x=><rect key={x} x={x} y={-60} width={14} height={266} rx={5} fill={BRASS[1]}/>)}
  <rect x={-184} y={-14} width={368} height={204} rx={10} fill="#120C1D" stroke={BRASS[1]} strokeOpacity={.6} strokeWidth={4}/>
  <Gear x={-95} y={60} r={44} angle={spin}/><Gear x={-20} y={110} r={30} angle={-spin*1.45+10}/><Gear x={60} y={56} r={38} angle={spin*1.15}/><Gear x={130} y={120} r={26} angle={-spin*1.7}/>
  <circle cx={0} cy={150} r={36} fill={C.ivory}/><line x1={0} y1={150} x2={Math.sin(spin*.2*D)*26} y2={150-Math.cos(spin*.2*D)*26} stroke="#120C1D" strokeWidth={5} strokeLinecap="round"/>
  <rect x={-186} y={-70} width={372} height={18} rx={6} fill={BRASS[1]}/><rect x={-8} y={cy} width={16} height={60} fill={BRASS[1]}/>
  {springs.map(([p,q],i)=><polyline key={i} points={pts(zig(p,q))} fill="none" stroke={BRASS[1]} strokeWidth={4}/>)}
  {dumbbell(a1,0)}{dumbbell(a2,1)}<circle cx={0} cy={cy} r={12} fill="#26273A"/>
 </g>;
}
/** Large marine pocket watch on a stand; active = ticking glow; x-ray reveals the balance wheel and train. */
export function PocketWatch({t,a,xray,overlay=false}:{t:number;a:number;xray:number;overlay?:boolean}){
 const r=118,cy=20,run=smooth(a,0,1),bal=Math.sin(t*2*Math.PI*2.5)*140*run,sec=(Math.floor(t*5)/5)*6;
 if(overlay)return <g opacity={xray}><circle cx={0} cy={cy} r={r-4} fill="#0A0D1F" opacity={.85}/>
   <Gear x={-40} y={cy+30} r={30} angle={t*50} color={C.lavender}/><Gear x={34} y={cy+44} r={22} angle={-t*70} color={C.lavender}/>
   <g transform={`translate(0,${cy-30}) rotate(${bal})`}><circle r={44} fill="none" stroke={C.yellow} strokeWidth={6}/>{[0,60,120].map(d=><line key={d} x1={-44*Math.cos(d*D)} y1={-44*Math.sin(d*D)} x2={44*Math.cos(d*D)} y2={44*Math.sin(d*D)} stroke={C.yellow} strokeWidth={4}/>)}</g>
   <path d={`M 0 ${cy-30} m -16 0 a 16 16 0 1 1 32 0 a 12 12 0 1 1 -24 0 a 8 8 0 1 1 16 0`} fill="none" stroke={C.yellow} strokeWidth={2.5}/></g>;
 return <g>
  <Shadow w={260} y={170}/>
  <circle cx={0} cy={cy} r={r+80} fill="url(#glow-1)" opacity={.35*run}/>
  <rect x={-16} y={cy-r-46} width={32} height={30} rx={6} fill={SILVER[1]}/><circle cx={0} cy={cy-r-58} r={22} fill="none" stroke={SILVER[0]} strokeWidth={9}/>
  <circle cx={0} cy={cy} r={r+16} fill={SILVER[1]}/><circle cx={-5} cy={cy-5} r={r+10} fill={SILVER[0]}/>
  <circle cx={0} cy={cy} r={r} fill={C.ivory}/>
  {Array.from({length:12},(_,i)=>{const an=i*30*D;return <circle key={i} cx={Math.sin(an)*(r-20)} cy={cy-Math.cos(an)*(r-20)} r={i%3?4:7} fill="#120C1D"/>;})}
  <line x1={0} y1={cy} x2={Math.sin(-60*D)*52} y2={cy-Math.cos(-60*D)*52} stroke="#120C1D" strokeWidth={8} strokeLinecap="round"/>
  <line x1={0} y1={cy} x2={Math.sin(40*D)*84} y2={cy-Math.cos(40*D)*84} stroke="#120C1D" strokeWidth={5} strokeLinecap="round"/>
  <line x1={0} y1={cy} x2={Math.sin(sec*D)*90} y2={cy-Math.cos(sec*D)*90} stroke={C.pink} strokeWidth={3} strokeLinecap="round"/>
  <circle cx={0} cy={cy} r={8} fill={SILVER[1]}/>
 </g>;
}

/** Leaning Tower diorama on a cut-away soil block. active runs through its history: 0 foundation → .3 three floors,
 *  lean begins over soft clay → .5 seven floors, upper floors bend back → .62 bell chamber → .66 maximum lean →
 *  .66–.8 stabilisation cables on the north side → .8–.96 soil drawn out from under the north side, the
 *  tower turns back → 1 works removed, smaller lean. x-ray: soil layers and a plumb line from the top. */
export function LeaningTower({t,a,xray,overlay=false}:{t:number;a:number;xray:number;overlay?:boolean}){
 const floors=3*smooth(a,0,.3)+4*smooth(a,.3,.5)+smooth(a,.5,.62),bend=smooth(a,.3,.5),lean=(2.2*smooth(a,.12,.3)+1.3*smooth(a,.3,.5)+2*smooth(a,.5,.66)-1.5*smooth(a,.8,.96))*2;
 const weights=smooth(a,.66,.74)*(1-smooth(a,.96,1)),drills=smooth(a,.78,.84)*(1-smooth(a,.94,1)),soft=smooth(a,.1,.3)*(1-.6*smooth(a,.8,.96));
 const base=320,tiers=[{h:150,r:112},...Array.from({length:6},()=>({h:96,r:112})),{h:104,r:86}];
 // Stack tiers along a bending axis: floors 4–7 lean back by a growing correction (illustrative).
 let x=0,y=base,ang=lean;const drawn:React.ReactNode[]=[];let top={x:0,y:base};
 tiers.forEach((tr,i)=>{const grow=clamp01(floors-i);if(grow<=0)return;const corr=i>=3?bend*(i-2)*.6:0,deg=ang-corr,h=tr.h*grow,rad=deg*D;
  const ux=Math.sin(rad),uy=-Math.cos(rad);const cx=x+ux*h/2,cyy=y+uy*h/2;
  drawn.push(<g key={i} transform={`translate(${cx},${cyy}) rotate(${deg})`} opacity={smooth(grow,0,.25)}>
   <Two poly={[[-tr.r,-h/2],[tr.r,-h/2],[tr.r,h/2],[-tr.r,h/2]]} light={C.ivory} dark="#C9C2A8" split={-tr.r*.25}/>
   <rect x={-tr.r-8} y={-h/2-6} width={tr.r*2+16} height={10} fill="#E6DFC8"/>
   {h>30&&Array.from({length:i===0?4:5},(_,k)=>{const n=i===0?4:5,w=(tr.r*2-16)/n,ax=-tr.r+8+k*w;return <path key={k} d={`M ${ax+w*.18} ${h/2-8} V ${-h/2+w*.5+6} A ${w*.32} ${w*.32} 0 0 1 ${ax+w*.82} ${-h/2+w*.5+6} V ${h/2-8} Z`} fill={i===7?"#3A2264":"#2E2340"} opacity={.85}/>;})}
   {i===7&&grow>.6&&[-30,0,30].map(bx=><circle key={bx} cx={bx} cy={-h/2+34} r={8} fill={C.yellow}/>)}
  </g>);
  x+=ux*h;y+=uy*h;top={x,y};ang=deg;});
 const soilTop=base,soilH=220;
 if(overlay)return <g opacity={xray}><ellipse cx={90} cy={soilTop+105} rx={150} ry={46} fill={C.pink} opacity={.45*soft}/>{[60,150].map(yy=><line key={yy} x1={-280} y1={soilTop+yy} x2={280} y2={soilTop+yy} stroke={C.lavender} strokeWidth={3} strokeDasharray="10 8"/>)}
  {floors>.5&&<><line x1={top.x} y1={top.y} x2={top.x} y2={base} stroke={C.yellow} strokeWidth={4} strokeDasharray="10 8"/><circle cx={top.x} cy={base-8} r={9} fill={C.yellow}/><line x1={0} y1={base-4} x2={top.x} y2={base-4} stroke={C.yellow} strokeWidth={6}/></>}</g>;
 return <g>
  <g>
   <rect x={-280} y={soilTop} width={560} height={soilH} rx={10} fill="#2E2340"/>
   <rect x={-280} y={soilTop} width={560} height={60} fill="#4E3F66"/>
   <rect x={-280} y={soilTop+60} width={560} height={90} fill="#3A2C55"/>
   <ellipse cx={90} cy={soilTop+105} rx={150} ry={46} fill={C.pink} opacity={.35*soft*(.7+.3*xray)}/>
   <ellipse cx={0} cy={soilTop+8} rx={120} ry={16} fill="#1D1628"/>
  </g>
  {drills>.01&&<g opacity={drills}>{[0,1,2].map(k=>{const sx=-270,sy=soilTop+20+k*26,ex=-40+k*14,ey=soilTop+60+k*20,f=(t*.6+k*.33)%1;
   return <g key={k}><line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#7C7A92" strokeWidth={9} strokeLinecap="round"/><circle cx={lerp(ex,sx,f)} cy={lerp(ey,sy,f)} r={7} fill={C.yellow}/></g>;})}
   <rect x={-300} y={soilTop-40} width={50} height={60} rx={6} fill="#4E4F62"/></g>}
  {/* Stabilisation cables cinched around the third level and anchored far to the north (left). */}
  {weights>.01&&<g opacity={weights}><rect x={-296} y={soilTop-26} width={30} height={26} rx={4} fill="#4E4F62"/>
   {[0,1].map(k=><line key={k} x1={-282} y1={soilTop-14-k*8} x2={x*.33-104+k*6} y2={base-330-k*14} stroke="#B8B6C8" strokeWidth={5} strokeLinecap="round"/>)}
   <rect x={x*.33-118} y={base-350} width={236} height={14} rx={7} fill="none" stroke="#B8B6C8" strokeWidth={4} transform={`rotate(${lean},${x*.33},${base-343})`}/></g>}
  {drawn}
 </g>;
}
