import React from "react";
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame} from "remotion";
import "@fontsource-variable/manrope";
import {MODE_FRAMES,resolvePreset} from "thinking-orbs/engine";
import story from "../../../work/style-lab/story.json";
import brand from "../../../video-design/brand.json";
import {StudioBackground} from "../../StudioBackground";
import {
 FPS,LAP,SRV,ROUTERS,ROW_Y,rowX,SLOT_Y,slotX,ORB,routerNode,BUTTON,PIECES,wordLayout,ROUTES,routeAt,routeU,routePath,
 stateAt,clamp01,lerp,smooth,hash,E,type State,type P,
} from "./scene";

// «Иллюстрированная сцена 2.0» — persistent low-poly world, camera moves, packets on curved routes.
// Everything derives from useCurrentFrame(); no Math.random, Date or timers.
const C=brand.colors;
const W=1080,H=1920,STAGE_CY=880;
const FONT="'Manrope Variable',sans-serif";
const pts=(p:number[][])=>p.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const TRAIL=[C.lavender,C.yellow,"#B48CF2",C.ivory];
const ORB_PRESET=resolvePreset("solving",64);

/* ───────────── Shared defs ───────────── */
function Defs(){
 const lg=(id:string,a:string,b:string,x2=0,y2=1)=><linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}><stop offset="0" stopColor={a}/><stop offset="1" stopColor={b}/></linearGradient>;
 const rg=(id:string,c:string,o:number)=><radialGradient id={id}><stop offset="0" stopColor={c} stopOpacity={o}/><stop offset=".55" stopColor={c} stopOpacity={o*.35}/><stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient>;
 return <defs>
  {lg("il-metalTop","#62637A","#3A3B4C")}{lg("il-metalFront","#3E3F52","#202130")}{lg("il-metalSide","#262738","#121219")}
  {lg("il-purple","#A57AE8","#6A45A8")}{lg("il-purpleDeep","#4E3184","#2E1C52")}{lg("il-screen","#1B1331","#0A0711")}
  {lg("il-pedTop","#30273F","#1A1426",.4,1)}{lg("il-pedFront","#1A1426","#0C0912")}{lg("il-pedSide","#120E1B","#07050B")}
  {lg("il-yellow","#FBE681","#E0B53C")}{lg("il-green","#8BE86A","#46A02D")}{lg("il-key","#2C2D3C","#1C1D28")}
  {rg("il-ao","#000",.75)}{rg("il-glowLav",C.lavender,.5)}{rg("il-glowPur",C.purple,.55)}{rg("il-glowYel",C.yellow,.5)}{rg("il-glowGreen",C.green,.5)}{rg("il-bokeh",C.lavender,.2)}
  <radialGradient id="il-vignette" cx=".5" cy=".45" r=".75"><stop offset=".55" stopColor="#000" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".7"/></radialGradient>
  <filter id="il-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="il-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="il-bokehBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
 </defs>;
}

/* ───────────── Low-poly pedestal («island») ───────────── */
function Pedestal({w,d,glow=C.purple,glowA=.25}:{w:number;d:number;glow?:string;glowA?:number}){
 const hw=w/2,q=w/4,hy=w*.15,c=[-q*.25,-hy*.15];
 const top=[[-hw,0],[-q,-hy],[q,-hy],[hw,0],[q,hy],[-q,hy]];
 const shades=["#352B47","#30273F","#2A2238","#221B2E","#1E1829","#2B2339"];
 return <g>
  <ellipse cx={8} cy={hy+d+16} rx={hw*1.02} ry={hy*.75+6} fill="#000" opacity={.6} filter="url(#il-soft)"/>
  <polygon points={pts([[-hw,0],[-q,hy],[-q,hy+d],[-hw,d]])} fill="url(#il-pedFront)"/>
  <polygon points={pts([[-q,hy],[q,hy],[q,hy+d],[-q,hy+d]])} fill="url(#il-pedFront)" opacity={.9}/>
  <polygon points={pts([[q,hy],[hw,0],[hw,d],[q,hy+d]])} fill="url(#il-pedSide)"/>
  {top.map((p,i)=>{const n=top[(i+1)%6];return <polygon key={i} points={pts([c,p,n])} fill={shades[i]}/>;})}
  <ellipse cx={0} cy={0} rx={hw*.62} ry={hy*.62} fill={glow} opacity={glowA*.5} filter="url(#il-glow)"/>
  <polyline points={pts([[-hw,0],[-q,hy],[q,hy],[hw,0]])} fill="none" stroke={C.lavender} strokeOpacity={.28} strokeWidth={2}/>
  <polyline points={pts([[-hw,0],[-q,-hy],[q,-hy]])} fill="none" stroke={C.lavender} strokeOpacity={.12} strokeWidth={1.5}/>
 </g>;
}
const Grow=({v,children,origin=0}:{v:number;children:React.ReactNode;origin?:number})=>{
 if(v<=.002)return null;const s=.82+.18*v;
 return <g opacity={clamp01(v*1.6)} transform={`translate(0,${origin+(1-clamp01(v))*24}) scale(${s}) translate(0,${-origin})`}>{children}</g>;
};

/* ───────────── Laptop ───────────── */
function Laptop({st,t}:{st:State;t:number}){
 const press=st.press,curP=st.cur,curA=st.curIn,scr=st.scr;
 const ripple=t>2.62&&t<3.25?(t-2.62)/.63:-1;
 const cur={x:lerp(-40,BUTTON.x-LAP.x+6,curP),y:lerp(-96,BUTTON.y-LAP.y+8,curP)};
 return <g>
  <ellipse cx={0} cy={4} rx={200} ry={26} fill="url(#il-ao)"/>
  {/* lid */}
  <rect x={-152} y={-236} width={304} height={200} rx={13} fill="url(#il-metalFront)"/>
  <rect x={-152} y={-236} width={304} height={200} rx={13} fill="none" stroke={C.lavender} strokeOpacity={.18} strokeWidth={2}/>
  <rect x={-139} y={-224} width={278} height={170} rx={7} fill="url(#il-screen)"/>
  <g opacity={scr}>
   <ellipse cx={0} cy={-140} rx={150} ry={95} fill="url(#il-glowPur)" opacity={.35}/>
   <circle cx={-118} cy={-205} r={8} fill={C.lavender} opacity={.75}/>
   <rect x={-104} y={-209} width={58} height={8} rx={4} fill={C.muted} opacity={.45}/>
   <line x1={-132} y1={-191} x2={132} y2={-191} stroke={C.purpleStroke} strokeOpacity={.25} strokeWidth={1.5}/>
   <rect x={-128} y={-86} width={208} height={28} rx={14} fill="#1D1628" stroke={C.purpleStroke} strokeOpacity={.4} strokeWidth={1.5}/>
   <rect x={-116} y={-75} width={70} height={7} rx={3.5} fill={C.muted} opacity={.3}/>
   {ripple>=0&&<circle cx={104} cy={-72} r={18+26*E.outCubic(ripple)} fill="none" stroke={C.lavender} strokeWidth={3} opacity={.8*(1-ripple)}/>}
   <g transform={`translate(104,-72) scale(${1-.16*press})`}>
    <circle r={20} fill="#000" opacity={.35} cy={3}/>
    <circle r={19} fill="url(#il-purple)"/>
    <circle r={19} fill={C.lavender} opacity={.35*press}/>
    <polygon points={pts([[-8,-7],[10,0],[-8,7],[-4,0]])} fill={C.ivory}/>
   </g>
  </g>
  <polygon points={pts([[-139,-224],[-60,-224],[-139,-110]])} fill="#fff" opacity={.04}/>
  <circle cx={0} cy={-230} r={2.5} fill="#000" opacity={.6}/>
  {/* hinge + deck */}
  <rect x={-124} y={-42} width={248} height={8} rx={4} fill="#15151F"/>
  <polygon points={pts([[-170,0],[170,0],[148,-38],[-148,-38]])} fill="url(#il-metalTop)"/>
  <polygon points={pts([[0,0],[170,0],[148,-38],[0,-38]])} fill="#000" opacity={.12}/>
  {[0,1,2].map(r=>{const y=-33+r*10.5,sc=.86+.05*r;return Array.from({length:12},(_,k)=>{const x=(-121+k*22)*sc;return <rect key={`${r}-${k}`} x={x} y={y} width={18*sc} height={7.5} rx={2} fill="url(#il-key)"/>;});})}
  <polygon points={pts([[-170,0],[170,0],[166,11],[-166,11]])} fill="#1A1B25"/>
  <line x1={-168} y1={0} x2={168} y2={0} stroke={C.lavender} strokeOpacity={.25} strokeWidth={1.5}/>
  {/* cursor */}
  {curA>.002&&<g opacity={curA} transform={`translate(${cur.x},${cur.y}) scale(${1-.12*press})`}>
   <polygon points={pts([[0,0],[0,26],[7,20],[12,31],[17,29],[12,18],[21,18]])} fill={C.ivory} stroke="#120C1D" strokeWidth={2.5} strokeLinejoin="round"/>
  </g>}
 </g>;
}

/* ───────────── Router ───────────── */
function Router({flash,t,idx}:{flash:number;t:number;idx:number}){
 const wob=(k:number)=>Math.sin(t*2.1+k+idx)*1.5+flash*6*Math.sin(t*19+k);
 return <g>
  <ellipse cx={4} cy={2} rx={100} ry={16} fill="url(#il-ao)"/>
  {[-42,0,42].map((x,k)=><g key={k} transform={`translate(${x+10},-54) rotate(${wob(k)})`}>
   <line x1={0} y1={0} x2={0} y2={-46} stroke="#4E4F62" strokeWidth={6} strokeLinecap="round"/>
   <circle cy={-48} r={7} fill={C.lavender} opacity={.55+.45*flash}/>
  </g>)}
  <polygon points={pts([[-70,-46],[70,-46],[92,-62],[-48,-62]])} fill="url(#il-metalTop)"/>
  <polygon points={pts([[70,-46],[92,-62],[92,-16],[70,0]])} fill="url(#il-metalSide)"/>
  <rect x={-70} y={-46} width={140} height={46} fill="url(#il-metalFront)"/>
  <line x1={-70} y1={-46} x2={70} y2={-46} stroke={C.lavender} strokeOpacity={.3} strokeWidth={2}/>
  {Array.from({length:5},(_,k)=>{const b=.35+.3*(.5+.5*Math.sin(t*(3+k*.7)+k*2+idx));return <g key={k}>
   <circle cx={-50+k*20} cy={-22} r={4.5} fill={k===4?C.green:C.lavender} opacity={Math.min(1,b+flash*.7)}/>
   <circle cx={-50+k*20} cy={-22} r={10} fill={C.lavender} opacity={.18*flash}/></g>;})}
  <ellipse cx={11} cy={-58} rx={60} ry={22} fill="url(#il-glowLav)" opacity={.2+.8*flash}/>
 </g>;
}

/* ───────────── Server ───────────── */
function Server({st,t,flash}:{st:State;t:number;flash:number}){
 const ok=st.ok,think=clamp01(st.orb);
 return <g>
  <ellipse cx={8} cy={2} rx={130} ry={20} fill="url(#il-ao)"/>
  <polygon points={pts([[-85,-270],[85,-270],[113,-290],[-57,-290]])} fill="url(#il-metalTop)"/>
  <polygon points={pts([[85,-270],[113,-290],[113,-22],[85,0]])} fill="url(#il-metalSide)"/>
  <rect x={-85} y={-270} width={170} height={270} fill="url(#il-metalFront)"/>
  <polygon points={pts([[-85,-270],[0,-270],[-85,-120]])} fill="#fff" opacity={.035}/>
  <line x1={-85} y1={-270} x2={85} y2={-270} stroke={C.lavender} strokeOpacity={.3} strokeWidth={2}/>
  <rect x={-70} y={-262} width={140} height={6} rx={3} fill={C.lavender} opacity={.25+.5*think}/>
  <rect x={-70} y={-262} width={140} height={6} rx={3} fill={C.green} opacity={ok}/>
  {Array.from({length:4},(_,k)=>{const y=-246+k*60;return <g key={k}>
   <rect x={-70} y={y} width={140} height={50} rx={7} fill="#120C1D" stroke={C.purpleStroke} strokeOpacity={.35} strokeWidth={1.5}/>
   {[0,1,2,3].map(v=><line key={v} x1={-58} y1={y+12+v*8.5} x2={-18} y2={y+12+v*8.5} stroke="#3A3B4C" strokeWidth={3} strokeLinecap="round"/>)}
   {[0,1,2].map(j=>{const chase=.5+.5*Math.sin(t*(2.4+think*6)-k*1.1-j*.8);const b=.3+.5*chase;return <g key={j}>
    <circle cx={14+j*18} cy={y+25} r={5} fill={C.lavender} opacity={Math.min(1,b+flash*.6)*(1-ok)}/>
    <circle cx={14+j*18} cy={y+25} r={5} fill={C.green} opacity={ok*(.7+.3*chase)}/></g>;})}
  </g>;})}
  <rect x={-85} y={-270} width={170} height={270} fill={C.lavender} opacity={.08*flash}/>
 </g>;
}

/* ───────────── Packet / card piece ───────────── */
type PieceGeo={tx:number;x:number;y:number;w:number;h:number;rx:number;fs:number;rot:number;sx:number;sy:number;flap:number;badge:number;body:number;hl:number;checked:number;elev:number};
function Piece({g,i,typed}:{g:PieceGeo;i:number;typed:number}){
 const chars=[...PIECES[i]],start=PIECES.slice(0,i).join("").length;
 return <g transform={`translate(${g.x},${g.y}) rotate(${g.rot}) scale(${g.sx},${g.sy})`}>
  {g.body>.002&&<g opacity={g.body}>
   <ellipse cx={8} cy={g.h/2+12+g.elev} rx={g.w*.46} ry={8+g.elev*.08} fill="#000" opacity={.42*g.flap/(1+g.elev*.02)} filter="url(#il-soft)"/>
   <rect x={-g.w/2} y={-g.h/2+5*g.flap} width={g.w} height={g.h} rx={g.rx} fill="url(#il-purpleDeep)"/>
   <rect x={-g.w/2} y={-g.h/2} width={g.w} height={g.h} rx={g.rx} fill="url(#il-purple)"/>
   {g.flap>.01&&<g opacity={g.flap}>
    <polygon points={pts([[-g.w/2+g.rx*.4,-g.h/2+1.5],[g.w/2-g.rx*.4,-g.h/2+1.5],[0,-g.h/2+g.h*.42]])} fill={C.lavender} opacity={.24}/>
    <polygon points={pts([[0,-g.h/2+g.h*.42],[g.w/2,-g.h/2],[g.w/2,g.h/2-g.rx*.5],[0,g.h/2]])} fill="#000" opacity={.12}/>
    <line x1={-g.w/2+g.rx} y1={-g.h/2+1.5} x2={g.w/2-g.rx} y2={-g.h/2+1.5} stroke="#fff" strokeOpacity={.3} strokeWidth={2}/>
   </g>}
  </g>}
  <text x={g.tx} y={g.fs*.36+g.h*.1*g.flap} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={g.fs} fill={C.ivory}>
   {chars.map((c,k)=><tspan key={k} fillOpacity={clamp01(typed-(start+k))}>{c}</tspan>)}
  </text>
  {g.badge>.002&&<g transform={`translate(${-g.w/2+6},${-g.h/2+4}) scale(${g.badge*(1+.18*g.hl)})`}>
   <circle r={26} fill={C.yellow} opacity={.35*g.hl}/>
   <circle r={23} fill="none" stroke={C.lavender} strokeWidth={3} opacity={g.checked}/>
   <circle r={17} fill="#000" opacity={.3} cy={2.5}/>
   <circle r={17} fill="url(#il-yellow)"/>
   <path d="M -17 0 A 17 17 0 0 0 17 0 Z" fill="#C99A2E" opacity={.45}/>
   <text y={7} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={20} fill="#120C1D">{i+1}</text>
  </g>}
 </g>;
}

/* ───────────── Thinking orb (thinking-orbs engine geometry, frame-driven) ───────────── */
function Orb({t,size}:{t:number;size:number}){
 const frame=MODE_FRAMES[ORB_PRESET.mode](64,(t+1.6)*ORB_PRESET.speed,{...ORB_PRESET.opts,rSizeMul:(ORB_PRESET.opts.rSizeMul??1)*1.75});
 const k=size/64,[lr,lg,lb]=[0xE0,0xCD,0xF8];
 return <g>
  <circle r={size*.8} fill="url(#il-glowPur)" opacity={.7}/>
  <circle r={size*.56} fill="#0B0812" opacity={.55}/>
  <circle r={size*.56} fill="none" stroke={C.purpleStroke} strokeOpacity={.35} strokeWidth={2}/>
  {frame.lines.map((l,n)=><line key={`l${n}`} x1={(l.x1-32)*k} y1={(l.y1-32)*k} x2={(l.x2-32)*k} y2={(l.y2-32)*k} stroke={C.lavender} strokeOpacity={(l.a??1)*.6} strokeWidth={l.w*k}/>)}
  {frame.dots.map((d,n)=>{const w=1-clamp01(d.white);return <circle key={n} cx={(d.x-32)*k} cy={(d.y-32)*k} r={d.r*k} fill={`rgb(${Math.round(lr*w)},${Math.round(lg*w)},${Math.round(lb*w)})`} opacity={d.a??1}/>;})}
 </g>;
}

/* ───────────── Packet geometry over the whole film ───────────── */
const CARD0={x:LAP.x+12,y:LAP.y-140},LIFT={x:LAP.x,y:ROW_Y};
const FINAL_FS=52,FINAL=wordLayout(FINAL_FS);
function routerFlash(r:number,t:number){let f=0;ROUTES.forEach(rt=>rt.passes.forEach(p=>{if(p.router===r)f=Math.max(f,Math.exp(-(((t-p.at)/.16)**2)));}));return f;}
function serverFlash(t:number){let f=0;ROUTES.forEach(rt=>{f=Math.max(f,Math.exp(-(((t-rt.arrive)/.14)**2)));});return f;}
function cardStage(st:State,t:number){
 const lift=st.lift,lp=Math.max(0,lift),dip=Math.max(0,-lift);
 const shakeT=t-2.62,shake=shakeT>0?10*Math.exp(-shakeT*6.5)*Math.sin(shakeT*Math.PI*2*6.5):0;
 const pop=shakeT>0?.07*Math.exp(-shakeT*9)*Math.sin(Math.min(shakeT*14,Math.PI)):0;
 const fs=lerp(30,40,lp),L=wordLayout(fs);
 const c={x:lerp(CARD0.x,LIFT.x,lp)+shake,y:lerp(CARD0.y,LIFT.y,lp)+dip*30};
 return {c,L,fs,sx:1+dip*.7+pop,sy:1-dip*.9+pop,tail:1-smooth(lp*2.5)};
}
function pieceAt(st:State,t:number,i:number):PieceGeo{
 const route=ROUTES[i],pk=[st.pk0,st.pk1,st.pk2,st.pk3][i],bd=[st.bd0,st.bd1,st.bd2,st.bd3][i],re=[st.re0,st.re1,st.re2,st.re3][i];
 const cs=cardStage(st,t),s=st.sep;
 const m=pk,fsPk=30;
 // A: card → pieces → packets on the row
 const ax=cs.c.x+lerp(cs.L.centers[i]*cs.sx,(i-1.5)*105,s),wob=clamp01((t-5.62)/1.2);
 const rotA=(i-1.5)*10*Math.sin(wob*Math.PI*2)*(1-wob)**1.6;
 const bob=Math.sin(t*3.1+i*1.4)*5*smooth((t-6.9)/.5)*(1-smooth((t-(route.launch-.45))/.3));
 const pre=t>route.launch-.22&&t<route.launch?Math.sin(Math.PI*(t-(route.launch-.22))/.22):0;
 let g:PieceGeo={tx:cs.L.textOff[i]*(1-m),x:ax,y:cs.c.y+bob+pre*7,w:lerp(cs.L.spans[i],92,m),h:lerp(cs.L.h,70,m),rx:lerp(0,14,m),fs:lerp(cs.fs,fsPk,m),rot:rotA,
  sx:(1+pre*.08)*cs.sx,sy:(1-pre*.12)*cs.sy,flap:clamp01(m),badge:bd,body:smooth((t-5.5)/.15),hl:0,checked:0,elev:0};
 if(t>=route.launch){
  const u=routeU(i,t),p=routeAt(route,u),pPrev=routeAt(route,routeU(i,t-1/60));
  const vx=(p.x-pPrev.x)*60,vy=(p.y-pPrev.y)*60,v=Math.hypot(vx,vy);
  const squeeze=Math.max(0,...route.passes.map(q=>Math.exp(-(((t-q.at)/.12)**2))));
  const land=t>route.arrive?Math.exp(-(t-route.arrive)*8)*Math.sin((t-route.arrive)*Math.PI*2*2.6)*.2:0;
  const st2=1+Math.min(v/2600,.22);
  g={...g,x:p.x,y:p.y,rot:Math.max(-16,Math.min(16,vx*.014)),sx:st2*(1-.16*squeeze)*(1+land),sy:(1/st2)*(1-.16*squeeze)*(1-land),elev:Math.min(30,v*.03)*(t<route.arrive?1:0)};
 }
 if(t>=route.arrive){
  const from=slotX(route.slot),to=slotX(i),dir=to>from?-1:1,arc=(55+28*Math.abs(to-from)/104)*dir;
  const idle=Math.sin(t*2.6+i*1.7)*3*smooth((t-route.arrive-.3)/.5)*(1-st.merge);
  const rp=clamp01(re),hop=Math.sin(Math.PI*rp);
  let x=lerp(from,to,re),y=SLOT_Y+arc*hop+idle;
  const tx=SRV.x+FINAL.centers[i],mg=st.merge;
  x=lerp(x,tx,mg);
  const scan=st.scan,hl=Math.exp(-(((scan-(i+.35))/.32)**2))*(scan>0&&scan<4.2?1:0);
  g={...g,x,y,rot:g.rot*(1-rp)+dir*-1*hop*12,
   tx:FINAL.textOff[i]*mg,w:lerp(92,FINAL.spans[i],mg),h:lerp(70,FINAL.h,mg),rx:lerp(14,0,mg),fs:lerp(fsPk,FINAL_FS,mg),flap:1-mg,
   sx:g.sx*(1+.08*hop*(1-rp)),sy:g.sy,hl,checked:smooth((scan-i-.3)/.2)*(1-mg),body:1-smooth((mg-.82)/.18)};
 }
 return g;
}

/* ───────────── World ───────────── */
function Cable({a,b,p,sag=50}:{a:P;b:P;p:number;sag?:number}){
 if(p<=.002)return null;
 const mx=(a.x+b.x)/2,my=(a.y+b.y)/2+sag,d=`M${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
 return <g><path d={d} stroke="#07050B" strokeWidth={10} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1-p} opacity={.9}/>
  <path d={d} stroke={C.purpleStroke} strokeOpacity={.3} strokeWidth={2.5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1-p}/></g>;
}
function World({st,t}:{st:State;t:number}){
 const LAPN={x:LAP.x,y:LAP.y-236},SRVN={x:SRV.x-40,y:SRV.y+50};
 const cables:[P,P,number][]=[[LAPN,routerNode(0),0],[LAPN,routerNode(1),1],[LAPN,routerNode(2),2],[routerNode(0),routerNode(1),3],[routerNode(1),routerNode(2),4],[routerNode(0),SRVN,5],[routerNode(1),SRVN,6],[routerNode(2),SRVN,7]];
 const rv=[st.r0,st.r1,st.r2],sf=serverFlash(t),dim=1-.6*smooth((t-11.1)/.8);
 const cs=cardStage(st,t),pieces=[0,1,2,3].map(i=>pieceAt(st,t,i));
 const cardIn=E.outBack(1.6)(clamp01((t-.62)/.4)),wholeA=clamp01(cardIn)*(1-smooth((t-5.55)/.15)),cardFinal=smooth((st.merge-.82)/.18);
 const typed=st.type;
 // caret position: advance of typed characters
 const caretX=(()=>{const L=cs.L;let x=-L.w/2+.62*cs.fs;const word=PIECES.join("");const adv=[.735,.63,.625,.6,.59,.54,.3];for(let k=0;k<Math.min(7,Math.floor(typed));k++)x+=adv[k]*cs.fs;void word;return x;})();
 const caretA=smooth((t-.9)/.15)*(1-smooth((t-2.3)/.25))*(.55+.45*Math.cos(t*9));
 const orbT=clamp01(st.orb),exitP=smooth((t-13.5)/.5),orbPos={x:ORB.x,y:lerp(ORB.y,SRV.y-280,exitP)};
 const scan=st.scan,beamA=smooth((t-11.7)/.15)*(1-smooth((t-12.5)/.25));
 const order=[0,1,2,3];// scan visits numbers 1..4
 const n=Math.min(3,Math.floor(scan)),f=scan-n,next=Math.min(3,n+1);
 const beamTo={x:lerp(pieces[order[n]].x,pieces[order[next]].x,smooth((f-.6)/.4)),y:SLOT_Y-40};
 return <g>
  {/* pedestals & their glows (back to front) */}
  <g transform={`translate(${SRV.x},${SRV.y})`}><Grow v={st.srv}><Pedestal w={330} d={36} glow={st.ok>0?C.green:C.purple} glowA={.3+.4*st.ok}/></Grow></g>
  {ROUTERS.map((r,k)=><g key={k} transform={`translate(${r.x},${r.y})`} opacity={dim}><Grow v={rv[k]}><Pedestal w={230} d={28} glowA={.25+.5*routerFlash(k,t)}/></Grow></g>)}
  <g transform={`translate(${LAP.x},${LAP.y})`} opacity={dim}><Grow v={st.pedLap}><Pedestal w={420} d={40}/></Grow></g>
  {/* cables */}
  {cables.map(([a,b,k])=><g key={k} opacity={dim}><Cable key={k} a={a} b={b} p={smooth(st.net*1.6-k*.08)}/></g>)}
  {/* objects */}
  {ROUTERS.map((r,k)=><g key={k} transform={`translate(${r.x},${r.y})`} opacity={dim}><Grow v={rv[k]}><Router flash={routerFlash(k,t)} t={t} idx={k}/></Grow></g>)}
  <g transform={`translate(${SRV.x},${SRV.y})`}><Grow v={st.srv}><Server st={st} t={t} flash={sf}/></Grow></g>
  {/* arrival shelf: a thin hovering glass plate in front of the server */}
  {(()=>{const x0=slotX(0)-66,x1=slotX(3)+66,y=SLOT_Y+44;return <Grow v={smooth((t-9.15)/.6)}>
   <ellipse cx={SRV.x+8} cy={y+34} rx={230} ry={14} fill="#000" opacity={.5} filter="url(#il-soft)"/>
   <polygon points={pts([[x0+24,y-14],[x1+24,y-14],[x1,y+6],[x0,y+6]])} fill={C.lavender} opacity={.07+.08*sf}/>
   <polygon points={pts([[x0,y+6],[x1,y+6],[x1,y+13],[x0,y+13]])} fill="#2A2238"/>
   <polygon points={pts([[x0+24,y-14],[x1+24,y-14],[x1,y+6],[x0,y+6]])} fill={C.green} opacity={.16*st.ok}/>
   <line x1={x0} y1={y+6} x2={x1} y2={y+6} stroke={C.lavender} strokeOpacity={.45*(1-st.ok)} strokeWidth={2}/>
   <line x1={x0} y1={y+6} x2={x1} y2={y+6} stroke={C.green} strokeOpacity={.8*st.ok} strokeWidth={2}/>
   <ellipse cx={SRV.x} cy={y} rx={220} ry={16} fill={C.purple} opacity={.12+.3*sf} filter="url(#il-glow)"/>
  </Grow>;})()}
  <g transform={`translate(${LAP.x},${LAP.y})`} opacity={dim}><Grow v={st.lapIn} origin={0}><Laptop st={st} t={t}/></Grow></g>
  {/* route previews: dotted search path + lit traversed part */}
  {ROUTES.map((r,i)=>{const pv=[st.pv0,st.pv1,st.pv2,st.pv3][i];if(pv<=.002)return null;const reveal=t<r.launch+.3?pv:1,u=t>=r.launch?routeU(i,t):0;
   return <g key={i} opacity={t>r.arrive?pv:1}><path d={routePath(r,0,reveal)} stroke={TRAIL[i]} strokeOpacity={.5} strokeWidth={5} strokeDasharray="0.1 16" strokeLinecap="round" fill="none"/>
    {u>.01&&<path d={routePath(r,0,u)} stroke={TRAIL[i]} strokeOpacity={.22} strokeWidth={4} fill="none" strokeLinecap="round"/>}</g>;})}
  {/* trails */}
  {ROUTES.map((r,i)=>{if(t<r.launch||t>r.arrive+.5)return null;const seg:React.ReactNode[]=[],N=24;
   const tp=Array.from({length:N+1},(_,j)=>routeAt(r,routeU(i,t-j*.013)));
   for(let j=0;j<N;j++){const a=tp[j],b=tp[j+1];if(Math.hypot(a.x-b.x,a.y-b.y)<.3)continue;const k=1-j/N;seg.push(<line key={j} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={TRAIL[i]} strokeWidth={40*k**1.3} strokeLinecap="round" opacity={.7*k}/>);}
   const fade=1-smooth((t-r.arrive)/.4);
   return <g key={i} opacity={fade}><g filter="url(#il-glow)">{seg}</g><g opacity={.9}>{seg.map((s,j)=>React.cloneElement(s as React.ReactElement<React.SVGProps<SVGLineElement>>,{key:`c${j}`,strokeWidth:Math.max(1,10*(1-j/N)),stroke:C.ivory,opacity:.75*(1-j/N)}))}</g></g>;})}
  {/* scan beam from the orb */}
  {beamA>.002&&<g opacity={beamA}>
   <polygon points={pts([[orbPos.x-14,orbPos.y+60],[orbPos.x+14,orbPos.y+60],[beamTo.x+46,beamTo.y],[beamTo.x-46,beamTo.y]])} fill={C.lavender} opacity={.1}/>
   <line x1={orbPos.x} y1={orbPos.y+60} x2={beamTo.x} y2={beamTo.y} stroke={C.lavender} strokeOpacity={.55} strokeWidth={2.5} strokeDasharray="3 9"/>
  </g>}
  {/* card body (before split and after merge) */}
  {wholeA>.002&&<g transform={`translate(${cs.c.x},${cs.c.y}) scale(${cs.sx*(.85+.15*cardIn)},${cs.sy*(.85+.15*cardIn)})`} opacity={wholeA}>
   <ellipse cx={8} cy={cs.L.h/2+14} rx={cs.L.w*.45} ry={8} fill="#000" opacity={.35*smooth(st.lift*2)} filter="url(#il-soft)"/>
   <rect x={-cs.L.w/2} y={-cs.L.h/2} width={cs.L.w} height={cs.L.h} rx={cs.L.h*.42} fill="url(#il-purple)"/>
   <polygon points={pts([[cs.L.w/2-30,cs.L.h/2-6],[cs.L.w/2+2,cs.L.h/2+12],[cs.L.w/2-12,cs.L.h/2-14]])} fill="#7550B5" opacity={cs.tail}/>
   <rect x={-cs.L.w/2+cs.L.h*.3} y={-cs.L.h/2+3} width={cs.L.w-cs.L.h*.6} height={2.5} rx={1.2} fill="#fff" opacity={.3}/>
   {/* "sending" dots */}
   {[0,1,2].map(k=>{const b=Math.sin(t*9-k*.9);return <circle key={k} cx={cs.L.w/2-34+k*13} cy={cs.L.h/2+22-Math.max(0,b)*5} r={4} fill={C.lavender} opacity={st.dots*(.5+.4*b)}/>;})}
  </g>}
  {cardFinal>.002&&<g transform={`translate(${SRV.x},${SLOT_Y})`} opacity={cardFinal}>
   <ellipse cx={8} cy={FINAL.h/2+16} rx={FINAL.w*.46} ry={9} fill="#000" opacity={.45} filter="url(#il-soft)"/>
   <rect x={-FINAL.w/2} y={-FINAL.h/2} width={FINAL.w} height={FINAL.h} rx={FINAL.h*.42} fill="url(#il-purple)"/>
   <rect x={-FINAL.w/2} y={-FINAL.h/2} width={FINAL.w} height={FINAL.h} rx={FINAL.h*.42} fill="none" stroke={C.green} strokeWidth={3} opacity={st.ok*.8}/>
   <rect x={-FINAL.w/2+FINAL.h*.3} y={-FINAL.h/2+3} width={FINAL.w-FINAL.h*.6} height={2.5} rx={1.2} fill="#fff" opacity={.3}/>
  </g>}
  {/* cut lines */}
  {[st.cut0,st.cut1,st.cut2].map((cp,k)=>{if(cp<=.002)return null;const out=1-smooth((t-5.62)/.3);if(out<=.002)return null;const bx=cs.c.x+(cs.L.centers[k]+cs.L.spans[k]/2)*cs.sx,top=cs.c.y-cs.L.h/2-16,len=(cs.L.h+32)*cp;
   return <g key={k} opacity={out}><line x1={bx} y1={top} x2={bx} y2={top+len} stroke={C.yellow} strokeWidth={10} opacity={.35} filter="url(#il-glow)"/><line x1={bx} y1={top} x2={bx} y2={top+len} stroke={C.yellowLine} strokeWidth={3.5} strokeLinecap="round"/>{cp<1&&<circle cx={bx} cy={top+len} r={6} fill={C.ivory}/>}</g>;})}
  {/* packets: draw by y so later arrivals sit in front */}
  {pieces.map((g,i)=><Piece key={i} g={g} i={i} typed={typed}/>)}
  {/* caret while typing */}
  {caretA>.002&&<rect x={cs.c.x+caretX+2} y={cs.c.y-cs.fs*.5} width={3} height={cs.fs} rx={1.5} fill={C.ivory} opacity={caretA}/>}
  {/* check badge on the final card */}
  {st.check>.002&&<g transform={`translate(${SRV.x+FINAL.w/2+14},${SLOT_Y-FINAL.h/2-10}) scale(${st.check})`}>
   {t>14.05&&<circle r={26+60*E.outCubic(clamp01((t-14.05)/.7))} fill="none" stroke={C.green} strokeWidth={3} opacity={.7*(1-clamp01((t-14.05)/.7))}/>}
   <circle r={30} fill="#000" opacity={.35} cy={4}/>
   <circle r={28} fill="url(#il-green)"/>
   <path d="M -28 0 A 28 28 0 0 0 28 0 Z" fill="#3F9A28" opacity={.35}/>
   <path d="M -12 1 L -3 10 L 13 -9" stroke={C.ivory} strokeWidth={6.5} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1-st.tick}/>
  </g>}
  {/* orb */}
  {orbT>.002&&<g transform={`translate(${orbPos.x},${orbPos.y}) scale(${Math.max(0,st.orb)})`} opacity={clamp01(st.orb*1.5)}><Orb t={t} size={150}/></g>}
 </g>;
}

/* ───────────── Parallax layers ───────────── */
const FAR=Array.from({length:54},(_,k)=>({x:-700+hash(k+3)*2500,y:-300+hash(k+91)*2500,r:2+hash(k+17)*4}));
function FarLayer({cam}:{cam:{x:number;y:number;z:number}}){
 const z=1+(cam.z-1)*.3,f=.38;
 return <g transform={`translate(${W/2},${STAGE_CY}) scale(${z}) translate(${-cam.x*f-330},${-cam.y*f-430})`}>
  {FAR.map((a,k)=>{const b=FAR[(k*7+3)%FAR.length],d=Math.hypot(a.x-b.x,a.y-b.y);return d<520?<line key={`l${k}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.purpleStroke} strokeOpacity={.13} strokeWidth={1.5}/>:null;})}
  {FAR.map((a,k)=><circle key={k} cx={a.x} cy={a.y} r={a.r} fill={k%3?C.purple:C.lavender} opacity={.28}/>)}
 </g>;
}
const BOKEH=[{x:-60,y:420,r:90},{x:1150,y:640,r:120},{x:980,y:1500,r:70},{x:80,y:1350,r:110},{x:620,y:220,r:60},{x:1240,y:1200,r:80}];
function NearLayer({cam}:{cam:{x:number;y:number;z:number}}){
 const z=1+(cam.z-1)*1.3,f=1.4;
 return <g transform={`translate(${W/2},${STAGE_CY}) scale(${z}) translate(${-cam.x*f+190},${-cam.y*f+340})`}>
  {BOKEH.map((b,k)=><circle key={k} cx={b.x} cy={b.y} r={b.r} fill="url(#il-bokeh)" opacity={.9}/>)}
 </g>;
}

/* ───────────── Captions, header ───────────── */
const KEYWORDS=["«Отправить»","пакеты","свой","путь","номера","номерам"];
function Caption({t}:{t:number}){
 return <div style={{position:"absolute",left:78,right:78,top:1408,height:170,overflow:"hidden"}}>
  {story.beats.map((b,bi)=>{const last=bi===story.beats.length-1;const words=b.caption.split(" ");
   const outP=last?0:E.inOutCubic(clamp01((t-(b.to-.22))/.22));
   if(t<b.from-.05||outP>=1)return null;
   return <div key={b.id} style={{position:"absolute",left:0,top:0,width:"100%",fontSize:60,lineHeight:1.12,fontWeight:800,letterSpacing:-1.5,color:C.ivory,transform:`translateY(${-64*outP}px)`,opacity:1-outP}}>
    {words.map((w,k)=>{const p=E.outCubic(clamp01((t-b.from-k*.045)/.26));const key=KEYWORDS.includes(w);
     return <span key={k} style={{display:"inline-block",marginRight:16,transform:`translateY(${(1-p)*64}px)`,opacity:p,color:key?C.yellow:C.ivory}}>{w}</span>;})}
   </div>;})}
 </div>;
}
function Header({t}:{t:number}){
 const beats=story.beats,total=story.durationInFrames/FPS;
 return <>
  <div style={{position:"absolute",left:78,right:78,top:108,display:"flex",alignItems:"center",gap:18}}>
   <div style={{width:56,height:56,borderRadius:"50%",background:"#000",border:`2px solid ${C.purpleStroke}`}}/>
   <span style={{fontSize:29,fontWeight:750,color:C.text}}>{story.handle}</span>
   <span style={{marginLeft:"auto",fontSize:23,color:C.muted}}>{Math.round(total)} с</span>
  </div>
  <div style={{position:"absolute",left:78,right:78,top:182,fontSize:34,fontWeight:750,letterSpacing:-1,lineHeight:1.12,color:C.text,whiteSpace:"nowrap"}}>{story.title}</div>
  <div style={{position:"absolute",left:78,right:78,top:236,display:"flex",gap:8}}>{beats.map((b,i)=>{const p=clamp01((t-b.from)/(b.to-b.from));const cur=smooth((t-b.from)/.3)*(1-smooth((t-b.to)/.3));
   return <div key={b.id} style={{flex:b.to-b.from,height:6,background:C.surfaceTop,borderRadius:4,overflow:"hidden",position:"relative"}}>
    <div style={{position:"absolute",left:0,top:0,height:6,width:`${p*100}%`,background:C.purple}}/>
    <div style={{position:"absolute",left:0,top:0,height:6,width:`${p*100}%`,background:C.yellow,opacity:i===beats.length-1?smooth((t-b.from)/.3):cur}}/></div>;})}</div>
 </>;
}

/* ───────────── Film ───────────── */
const Film:React.FC=()=>{
 const frame=useCurrentFrame(),t=frame/FPS,st=stateAt(t);
 const cam={x:st.camX,y:st.camY,z:st.camZ};
 const world=`translate(${W/2},${STAGE_CY}) scale(${cam.z}) translate(${-cam.x},${-cam.y})`;
 const mask="linear-gradient(to bottom, transparent 0px, transparent 252px, black 336px, black 1318px, transparent 1392px)";
 return <AbsoluteFill style={{background:C.background,fontFamily:FONT,overflow:"hidden"}}>
  <StudioBackground design={{version:1,id:"01",opacity:.5}}/>
  <div style={{position:"absolute",inset:0,maskImage:mask,WebkitMaskImage:mask}}>
   <svg width={W} height={H} style={{position:"absolute",inset:0}}>
    <Defs/>
    <FarLayer cam={cam}/>
    <g transform={world}><World st={st} t={t}/></g>
    <NearLayer cam={cam}/>
    <rect width={W} height={H} fill="url(#il-vignette)"/>
   </svg>
  </div>
  <Header t={t}/>
  <Caption t={t}/>
 </AbsoluteFill>;
};

registerRoot(()=><Composition id="StyleLab" component={Film} durationInFrames={story.durationInFrames} fps={story.fps} width={story.width} height={story.height}/>);
