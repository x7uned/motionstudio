import React from 'react';
import {BACKGROUND_OPACITY,type BackgroundDesign} from '../src/lib/backgrounds';

// Frozen background catalog v1, matching approved studies 01–06 and08–10. No frame-time state.
export function StudioBackground({design}:{design?:BackgroundDesign}){
 if(!design)return null;
 return <div style={{position:'absolute',inset:0,opacity:design.opacity??BACKGROUND_OPACITY,pointerEvents:'none'}}><BackgroundV1 i={Number(design.id)-1}/></div>;
}
const W=1080,H=1920,P='#8D59DA',L='#E0CDF8';
const random=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const line=(points:string,opacity=.2,width=1)=><path d={points} fill="none" stroke={P} strokeWidth={width} opacity={opacity}/>;
function BackgroundV1({i}:{i:number}){
 const stars=Array.from({length:250},(_,n)=>({x:random(n+1)*W,y:random(n+1001)*H,r:.5+random(n+231)*1.6,a:.12+random(n+551)*.4}));
 return <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:0,pointerEvents:'none'}} aria-hidden="true">
  <defs>
   <linearGradient id="base" x2=".7" y2="1"><stop stopColor="#08060D"/><stop offset=".5" stopColor="#030304"/><stop offset="1" stopColor="#120C1D"/></linearGradient>
   <radialGradient id="light"><stop stopColor={P} stopOpacity=".42"/><stop offset=".5" stopColor={P} stopOpacity=".12"/><stop offset="1" stopColor={P} stopOpacity="0"/></radialGradient>
   <radialGradient id="lavender"><stop stopColor={L} stopOpacity=".25"/><stop offset=".4" stopColor={P} stopOpacity=".13"/><stop offset="1" stopColor={P} stopOpacity="0"/></radialGradient>
   <radialGradient id="quiet"><stop stopColor="black" stopOpacity=".6"/><stop offset=".6" stopColor="black" stopOpacity=".35"/><stop offset="1" stopColor="black" stopOpacity="0"/></radialGradient>
   <pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="18" cy="18" r="1.35" fill={L} opacity=".37"/></pattern>
   <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke={P} strokeWidth="1" opacity=".25"/><path d="M0 27V37M-5 32H5" stroke={L} strokeWidth="1" opacity=".13"/></pattern>
   <pattern id="diagonal" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M-7 7L7-7M0 28L28 0M21 35L35 21" stroke={P} strokeWidth="1" opacity=".23"/></pattern>
   <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="3" seed="23" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
   <filter id="blur"><feGaussianBlur stdDeviation="62"/></filter>
  </defs>
  <rect width={W} height={H} fill="url(#base)"/>
  {i===0&&<><ellipse cx="990" cy="1750" rx="820" ry="900" fill="url(#light)" opacity=".6"/><rect width={W} height={H} fill="url(#dots)"/></>}
  {i===1&&<><rect width={W} height={H} fill="url(#grid)"/><rect x="32" y="32" width="1016" height="1856" fill="none" stroke={P} opacity=".12"/>{[360,720,1080,1440,1800].map(y=><path key={y} d={`M0 ${y}h13M1067 ${y}h13`} stroke={L} opacity=".38"/>)}</>}
  {i===2&&<><ellipse cx="1060" cy="1720" rx="720" ry="700" fill="url(#light)" opacity=".7"/>{stars.map((s,n)=><circle key={n} cx={s.x} cy={s.y} r={s.r} fill={n%4?P:L} opacity={s.a}/>)}{[19,82,142,210].map(n=>{const s=stars[n];return <path key={n} d={`M${s.x-5} ${s.y}h10M${s.x} ${s.y-5}v10`} stroke={L} strokeWidth=".7" opacity=".37"/>;})}</>}
  {i===3&&<>{Array.from({length:38},(_,n)=>{const points=Array.from({length:91},(_,k)=>{const x=k*12,y=320+n*46+Math.sin(x/210+n*.15)*105+Math.sin(x/390-n*.3)*72;return `${k?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`;}).join('');return <React.Fragment key={n}>{line(points,n%5===0?.36:.18,n%5===0?1.4:.8)}</React.Fragment>;})}</>}
  {i===4&&<><ellipse cx="-80" cy="240" rx="850" ry="870" fill="url(#light)"/><ellipse cx="1150" cy="1720" rx="1000" ry="1100" fill="url(#light)"/><ellipse cx="950" cy="1910" rx="500" ry="570" fill="url(#lavender)" opacity=".5"/></>}
  {i===5&&<><ellipse cx="50" cy="1930" rx="1000" ry="700" fill="url(#light)" opacity=".7"/><rect width={W} height={H} fill="url(#diagonal)"/>{line('M790 0L1080 290M0 1580L340 1920',.42,2)}</>}
  {i===7&&<><g filter="url(#blur)"><ellipse cx="960" cy="500" rx="230" ry="680" fill={P} opacity=".28"/><ellipse cx="30" cy="1550" rx="220" ry="450" fill={P} opacity=".3"/></g><path d="M-150 1940L450-20H800L200 1940Z" fill={L} opacity=".025"/><path d="M-150 1940L450-20M200 1940L800-20" stroke={L} opacity=".11"/><rect width={W} height={H} filter="url(#grain)" opacity=".06"/></>}
  {i===8&&<><ellipse cx="1100" cy="1700" rx="800" ry="600" fill="url(#light)" opacity=".7"/>{Array.from({length:22},(_,n)=><React.Fragment key={n}>{line(`M${-200+n*8} 1920C${-100+n*12} ${1180+n*8} ${1050+n*5} ${1720+n*10} 1280 ${630+n*25}`,n%4===0?.43:.18,n%4===0?1.5:.8)}</React.Fragment>)}</>}
  {i===9&&<>{Array.from({length:12},(_,n)=>{const left=n%2===0,x=left?24+n*12:W-20-n*9,y=300+n*117,dir=left?1:-1;return <g key={n}><path d={`M${x} 1920V${y+260}l${dir*70} -70V${y}h${dir*(90+n*3)}`} fill="none" stroke={n%3?P:L} strokeWidth={n%3?1:1.5} opacity=".28"/><circle cx={x+dir*(160+n*3)} cy={y} r="3" fill="#08060D" stroke={P} opacity=".6"/></g>;})}</>}
  <ellipse cx="540" cy="820" rx="600" ry="780" fill="url(#quiet)" opacity={i===4?.35:.66}/>
  <rect width={W} height={H} filter="url(#grain)" opacity={.028} style={{mixBlendMode:'soft-light'}}/>
 </svg>;
}
