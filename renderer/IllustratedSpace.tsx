import React from "react";
import brand from "../video-design/brand.json";
import {keyed,easeSine} from "../src/lib/illustrated";

// Prepared objects for the "Sun gone for a day" explainer (2026-10-20): faceted low-poly spheres (lon/lat
// triangles lit by one light and painter-sorted), a star with a rotating corona, an orbit diagram, the last light
// front, a city under a sky dome, a thermometer and a leaf, plus a parallax star field that replaces the room.
// Illustrations, not to scale and not photographs. Every value derives from the frame time and the keyed state.
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
/** Sunlight comes from the left of the world (place the Sun left of the planets), slightly from the viewer. */
export const SUN_LIGHT=unit([-.86,-.22,.46]);

/* ───────────── Faceted sphere ───────────── */
type Face={p:number[][];n:V3;lon:number;lat:number;i:number};
/** Visible triangles of a unit sphere: lon/lat quads split in two, spun by rot (deg), pitched toward the viewer
 *  so the north cap shows, tilted in the picture plane. Sorted back to front. */
function sphere(step:number,rot:number,pitch=-18,tilt=0):Face[]{
 const cq=Math.cos(pitch*D),sq=Math.sin(pitch*D),ct=Math.cos(tilt*D),st=Math.sin(tilt*D);
 const at=(lon:number,lat:number):V3=>{const l=(lon+rot)*D,b=lat*D,x=Math.cos(b)*Math.sin(l),y=-Math.sin(b),z=Math.cos(b)*Math.cos(l);
  const y2=y*cq-z*sq,z2=y*sq+z*cq;return [x*ct-y2*st,x*st+y2*ct,z2];};
 const faces:Face[]=[];let i=0;
 for(let lat=-90;lat<90;lat+=step)for(let lon=-180;lon<180;lon+=step){
  const a=at(lon,lat),b=at(lon+step,lat),c=at(lon+step,lat+step),d=at(lon,lat+step);
  for(const [tri,k] of [[[a,b,c],0],[[a,c,d],1]] as [V3[],number][]){
   const n=unit([tri[0][0]+tri[1][0]+tri[2][0],tri[0][1]+tri[1][1]+tri[2][1],tri[0][2]+tri[1][2]+tri[2][2]]);
   if(n[2]<-.02)continue;
   faces.push({p:tri.map(v=>[v[0],v[1]]),n,lon:lon+step*(k?.33:.67),lat:lat+step*(k?.67:.33),i:i*2+k});
  }
  i++;
 }
 return faces.sort((x,y)=>x.n[2]-y.n[2]);
}
function Facets({faces,r,fill}:{faces:Face[];r:number;fill:(f:Face)=>string}){
 return <g strokeLinejoin="round">{faces.map(f=>{const c=fill(f);return <polygon key={f.i} points={pts(f.p.map(([x,y])=>[x*r,y*r]))} fill={c} stroke={c} strokeWidth={1}/>;})}</g>;
}
const lambert=(n:V3,light:V3)=>dot(n,light);
/** Lit share of a face: soft terminator, scaled by how much sunlight still arrives (sun 0..1). */
const litShare=(n:V3,light:V3,sun:number)=>sun*smooth(lambert(n,light),-.12,.32);
const tone=(m:readonly [string,string],n:V3,light:V3,jitter:number)=>mix(m[1],m[0],clamp01(.28+.78*lambert(n,light)+jitter));

/* ───────────── Earth ───────────── */
type LL=[number,number][];
const CONTINENTS:LL[]=[
 [[-165,64],[-140,70],[-95,72],[-75,62],[-60,50],[-80,30],[-97,17],[-106,22],[-124,40],[-130,56]],
 [[-81,9],[-60,9],[-35,-6],[-40,-23],[-58,-38],[-69,-55],[-75,-40],[-72,-15],[-81,-4]],
 [[-10,36],[-9,58],[20,70],[60,72],[100,77],[140,72],[172,66],[160,58],[141,47],[125,35],[121,22],[106,9],[99,20],[80,8],[72,22],[57,25],[48,30],[36,36],[26,40],[12,44],[0,41]],
 [[-17,15],[-10,32],[10,37],[32,31],[43,12],[51,11],[40,-15],[32,-29],[20,-35],[13,-20],[9,4],[-8,5]],
 [[114,-22],[130,-12],[143,-11],[153,-27],[146,-39],[135,-35],[115,-34]],
 [[-56,60],[-44,60],[-20,72],[-30,82],[-60,80],[-70,76]],
 [[95,-5],[120,-3],[141,-6],[130,-9],[105,-8]],
];
const DESERTS:LL[]=[[[-15,16],[-5,22],[10,19],[25,22],[33,20],[34,28],[20,31],[5,30],[-8,27]],[[38,16],[50,15],[56,22],[52,28],[40,29]],[[120,-22],[132,-20],[140,-24],[138,-30],[124,-31]]];
function inside(poly:LL,lon:number,lat:number){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)c=!c;}return c;}
const wrap=(lon:number)=>((lon+180)%360+360)%360-180;
type Ground="ocean"|"land"|"desert"|"ice";
const groundCache=new Map<string,Ground>();
function ground(lon:number,lat:number):Ground{
 const key=`${lon.toFixed(2)}:${lat.toFixed(2)}`,hit=groundCache.get(key);if(hit)return hit;
 const l=wrap(lon);let g:Ground="ocean";
 if(lat<-70||lat>80)g="ice";
 // Deserts are speckled into the land so they read as dry patches, not as a stripe across the continent.
 else if(CONTINENTS.some(p=>inside(p,l,lat)))g=DESERTS.some(p=>inside(p,l,lat))&&hash(lon*7.3+lat*3.1)<.55?"desert":"land";
 groundCache.set(key,g);return g;
}
const EARTH={ocean:["#4F63DA","#1F1C5E"],land:["#67BF57","#245C32"],desert:["#D9B866","#806030"],ice:[C.ivory,"#9A97C0"]} as const;
const NIGHT={ocean:"#0D0B26",land:"#121A1E",desert:"#1C1714",ice:"#262338"} as const;
const FROST=["#E6ECFF","#8D8FC8"] as const;
const CLOUDS:[number,number,number][]=[[-140,42,11],[-100,8,8],[-40,-30,10],[-20,50,12],[30,-5,7],[70,30,10],[110,48,10],[150,-25,11],[175,12,8],[-70,-55,13],[10,-58,14],[95,-48,12],[-150,-10,8],[50,62,10]];
/** Planet Earth. a: 0 normal day and night halves → 0.5 sunlight gone, the whole globe in night with city lights
 *  → 1 frost spreads over the land from the poles while the oceans stay dark blue. xray: heat map. */
export function Earth({t,a,xray=0,overlay=false,r=200,step=10,uid="earth",light=SUN_LIGHT,detail=1}:{t:number;a:number;xray?:number;overlay?:boolean;r?:number;step?:number;uid?:string;light?:V3;detail?:number}){
 const sun=1-smooth(a,0,.5),cold=smooth(a,.55,1),rot=-t*4,faces=sphere(step,rot,-18,-12);
 const frostLat=90-62*cold;
 const surface=(f:Face)=>{const g=ground(f.lon,f.lat),lit=litShare(f.n,light,sun),jit=(hash(f.i)-.5)*.08;
  let day=tone(EARTH[g],f.n,light,jit),night=mix(NIGHT[g],"#2A2A55",.18*clamp01(f.n[2]));
  if((g==="land"||g==="desert")&&Math.abs(f.lat)>frostLat-6){const k=smooth(Math.abs(f.lat),frostLat-6,frostLat+6)*cold;day=mix(day,tone(FROST,f.n,light,jit),k);night=mix(night,"#4A4C7A",k*.85);}
  if(g==="ocean"&&Math.abs(f.lat)>66){const k=cold*smooth(Math.abs(f.lat),66,74);night=mix(night,"#3B3D6A",k);}
  return mix(night,day,lit);};
 if(overlay){
  // Heat map: oceans keep their warmth (yellow), land cools to lavender-blue as the day without the Sun goes on.
  const heat=(f:Face)=>{const g=ground(f.lon,f.lat),polar=smooth(Math.abs(f.lat),45,85);
   const warm=g==="ocean"?.82-.5*polar-.12*cold:.78-.55*polar-.9*cold,c=mix("#5E7BFF",mix(C.pink,C.yellow,clamp01((warm-.5)*2)),clamp01(warm+.15));
   return mix(mix(c,"#0A0D1F",.5),c,clamp01(.35+.75*f.n[2]+(hash(f.i)-.5)*.08));};
  return <g opacity={xray}><Facets faces={faces} r={r} fill={heat}/><circle r={r} fill="none" stroke={C.ivory} strokeOpacity={.35} strokeWidth={3}/></g>;
 }
 const cityOn=(f:Face)=>{const g=ground(f.lon,f.lat);return (g==="land"||g==="desert")&&hash(f.i*3.1)<(g==="desert"?.12:.42)&&f.n[2]>.18;};
 const cloudFaces=detail>.5?sphere(step,rot*1.25+40,-18,-12).filter(f=>CLOUDS.some(([lo,la,s])=>Math.hypot(wrap(f.lon-lo)*Math.cos(f.lat*D),f.lat-la)<s*(.8+.4*hash(f.i*.7))))  :[];
 return <g>
  <defs>
   <radialGradient id={`atm-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={r*1.16}><stop offset=".84" stopColor="#7FA0FF" stopOpacity=".55"/><stop offset=".9" stopColor="#7F8CFF" stopOpacity=".22"/><stop offset="1" stopColor="#7F8CFF" stopOpacity="0"/></radialGradient>
   <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stopColor="#BFD0FF" stopOpacity=".95"/><stop offset=".55" stopColor="#BFD0FF" stopOpacity=".05"/><stop offset="1" stopColor="#BFD0FF" stopOpacity="0"/></linearGradient>
  </defs>
  <circle r={r*1.16} fill={`url(#atm-${uid})`} opacity={.25+.75*sun}/>
  <Facets faces={faces} r={r} fill={surface}/>
  {detail>.5&&<g>{cloudFaces.map(f=>{const lit=litShare(f.n,light,sun),c=mix("#25244A",mix("#B9B6D2",C.ivory,clamp01(lambert(f.n,light))),lit);return <polygon key={f.i} points={pts(f.p.map(([x,y])=>[x*r*1.025,y*r*1.025]))} fill={c} opacity={.38+.27*lit}/>;})}</g>}
  {detail>.5&&<g>{faces.filter(cityOn).map(f=>{const night=1-litShare(f.n,light,sun),[x,y]=f.p.reduce((m,q)=>[m[0]+q[0]/3,m[1]+q[1]/3],[0,0]),tw=.75+.25*Math.sin(t*2.3+f.i);
   return night>.03?<g key={f.i} opacity={night*tw}><circle cx={x*r} cy={y*r} r={6.5} fill={C.yellow} opacity={.22}/><circle cx={x*r} cy={y*r} r={2.4} fill={C.yellowLine}/></g>:null;})}</g>}
  <circle r={r} fill="none" stroke={`url(#rim-${uid})`} strokeWidth={7} opacity={.2+.8*sun}/>
  <ellipse cx={-r*.42} cy={-r*.38} rx={r*.2} ry={r*.12} transform={`rotate(-35,${-r*.42},${-r*.38})`} fill="#fff" opacity={.1*sun}/>
 </g>;
}

/* ───────────── Moon ───────────── */
/** The Moon: grey faceted craters lit from the Sun's side. a: 0 bright → 1 almost invisible, only a faint rim. */
export function Moon({t,a,r=95}:{t:number;a:number;r?:number}){
 const sun=1-smooth(a,0,1),faces=sphere(15,-t*2+30,-10,8);
 const fill=(f:Face)=>{const crater=hash(f.i*1.7)<.22,m:[string,string]=crater?["#A49EB8","#3E3A52"]:["#DCD6EA","#5A5570"];
  return mix("#0E0D16",tone(m,f.n,SUN_LIGHT,(hash(f.i)-.5)*.08),litShare(f.n,SUN_LIGHT,sun));};
 return <g>
  <Facets faces={faces} r={r} fill={fill}/>
  <circle r={r} fill="none" stroke={C.lavender} strokeOpacity={.08+.22*(1-sun)} strokeWidth={2.5} strokeDasharray={a>.5?"6 10":undefined}/>
 </g>;
}

/* ───────────── Sun ───────────── */
/** The Sun: faceted disc with shimmering granulation, a rotating corona and two prominences. a: 0 shining →
 *  0.5 collapses to a bright point → 1 gone, a dashed ghost ring marks where it was. Going back to 0 reignites it. */
export function Sun({t,a,uid="sun"}:{t:number;a:number;uid?:string}){
 const R=170,shrink=smooth(a,0,.5),gone=smooth(a,.42,.72),ghost=smooth(a,.55,.9);
 const s=lerp(1,.035,Math.pow(shrink,1.6)),flash=Math.sin(Math.PI*smooth(a,.3,.62))*(1-gone*.4);
 const rings=[0,.24,.48,.7,.86,1],spin=t*3;
 const disc:{p:number[][];c:string;k:number}[]=[];
 for(let k=0;k<rings.length-1;k++){const n=8+k*6,r0=rings[k]*R,r1=rings[k+1]*R;
  for(let j=0;j<n;j++){const a0=(j/n)*360+spin+k*7,a1=((j+1)/n)*360+spin+k*7,am=(a0+a1)/2,p=(ang:number,r:number)=>[Math.cos(ang*D)*r,Math.sin(ang*D)*r];
   const shimmer=.07*Math.sin(t*(1.3+hash(k*31+j))*2+hash(j*7+k)*9),base=clamp01(1-k/(rings.length-1)*.92+shimmer);
   const c=mix(mix("#E2702A",C.yellow,clamp01(base*1.6)),"#FFF7D6",clamp01(base*1.4-.5));
   if(k===0)disc.push({p:[[0,0],p(a0,r1),p(a1,r1)],c,k});
   else{disc.push({p:[p(a0,r0),p(a1,r0),p(am,r1)],c,k});disc.push({p:[p(a1,r0),p(am+360/n,r1),p(am,r1)],c:mix(c,"#E2702A",.12),k});}}
 }
 const spikes=Array.from({length:22},(_,i)=>{const ang=i*360/22+t*4,len=R*(1.32+.28*hash(i)+.08*Math.sin(t*1.6+i*1.3)),w=11+6*hash(i*5);return {ang,len,w};});
 const prom=(ang:number,size:number,ph:number)=>{const c=Math.cos(ang*D),sn=Math.sin(ang*D),bx=c*R*.96,by=sn*R*.96,ox=c*R*(1+size),oy=sn*R*(1+size),tx=-sn*R*.22,ty=c*R*.22;
  const d=`M ${bx-tx} ${by-ty} Q ${ox-tx*1.4} ${oy-ty*1.4} ${ox} ${oy} T ${bx+tx} ${by+ty}`;
  return <g><path d={d} stroke="#E2702A" strokeWidth={22} fill="none" strokeLinecap="round" opacity={.35}/><path d={d} stroke="#FF9A52" strokeWidth={11} fill="none" strokeLinecap="round"/>
   <path d={d} stroke="#FFE2A8" strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray="10 26" strokeDashoffset={-t*40+ph} opacity={.9}/></g>;};
 return <g>
  <defs><radialGradient id={`sunglow-${uid}`}><stop offset="0" stopColor="#FFF3C0" stopOpacity=".95"/><stop offset=".22" stopColor={C.yellow} stopOpacity=".55"/><stop offset=".55" stopColor="#E2702A" stopOpacity=".16"/><stop offset="1" stopColor="#E2702A" stopOpacity="0"/></radialGradient></defs>
  <g opacity={ghost*.9}>
   <circle r={R} fill="none" stroke={C.lavender} strokeWidth={4} strokeDasharray="16 14" strokeDashoffset={-t*8} opacity={.55}/>
   <circle r={R*1.5} fill="none" stroke={C.lavender} strokeWidth={2} strokeDasharray="4 18" opacity={.25}/>
   <path d="M -16 0 L 16 0 M 0 -16 L 0 16" stroke={C.lavender} strokeWidth={4} strokeLinecap="round" opacity={.7}/>
  </g>
  <g opacity={1-gone}>
   <circle r={R*2.5*(.35+.65*s)+R*1.4*flash} fill={`url(#sunglow-${uid})`} opacity={.85+.15*flash}/>
   <g transform={`scale(${s})`}>
    <g opacity={.75}>{spikes.map((p,i)=>{const c=Math.cos(p.ang*D),sn=Math.sin(p.ang*D),bx=c*R*.9,by=sn*R*.9,tx=-sn*p.w,ty=c*p.w;
     return <polygon key={i} points={pts([[bx-tx,by-ty],[c*p.len,sn*p.len],[bx+tx,by+ty]])} fill={i%2?C.yellow:"#F59A3C"} opacity={.6+.25*hash(i*3)}/>;})}</g>
    {prom(-38,.42,0)}{prom(148,.32,40)}
    <circle r={R} fill="#F2B544"/>
    <g strokeLinejoin="round">{disc.map((f,i)=><polygon key={i} points={pts(f.p)} fill={f.c} stroke={f.c} strokeWidth={1}/>)}</g>
    <circle r={R} fill="none" stroke="#FFE7A0" strokeWidth={5} opacity={.55}/>
   </g>
   <circle r={R*.16*(1-s)+2} fill="#FFFBEA" opacity={clamp01(shrink*1.4)}/>
  </g>
 </g>;
}

/* ───────────── Orbit diagram ───────────── */
const ORB={rx:600,ry:300,from:62,release:-8};
const onOrbit=(th:number,f=1)=>[ORB.rx*f*Math.cos(th*D),ORB.ry*f*Math.sin(th*D)];
/** Pure orbit state for a keyed value (tested for continuity): marker position, velocity and the light/gravity shares. */
export function orbitState(a:number){
 // Earth goes dark when the last light passes (end of the arc); the gravity line fades separately on its own cue.
 const arc=smooth(a,0,.3),fly=smooth(a,.3,.75),back=smooth(a,.75,.85),again=smooth(a,.85,1),dark=smooth(a,.27,.3)*(1-back);
 const th=lerp(ORB.from,ORB.release,arc),[rx0,ry0]=onOrbit(ORB.release),tan=unit([ORB.rx*Math.sin(ORB.release*D),-ORB.ry*Math.cos(ORB.release*D),0]);
 const L=200,end=[rx0+tan[0]*L,ry0+tan[1]*L],f=Math.hypot(end[0]/ORB.rx,end[1]/ORB.ry),th2=Math.atan2(end[1]/(ORB.ry*f),end[0]/(ORB.rx*f))/D;
 const pos=a<.3?onOrbit(th):a<.85?[rx0+tan[0]*L*fly,ry0+tan[1]*L*fly]:onOrbit(th2-24*again,f);
 const pull=a<.75?1-smooth(a,.3,.4):back;
 const vel=a<.3?unit([ORB.rx*Math.sin(th*D),-ORB.ry*Math.cos(th*D),0]):a<.85?tan:unit([ORB.rx*f*Math.sin((th2-24*again)*D),-ORB.ry*f*Math.cos((th2-24*again)*D),0]);
 // Where Earth would be had the pull stayed: it keeps curving along the old orbit while the real Earth goes straight.
 const ghost=onOrbit(ORB.release-32*fly);
 return {fly,back,dark,pull,pos,vel,ghost,start:[rx0,ry0],tan,L,f};
}
/** Earth's orbit around the Sun (the object's centre is the Sun; not to scale). a: 0→0.3 Earth moves along the
 *  dashed orbit, a lavender gravity line ties it to the centre; 0.3→0.4 its light and the gravity line go out
 *  together; 0.3→0.75 it flies straight along the tangent (distance ticks); 0.75→0.85 light and gravity return and
 *  a new, slightly larger orbit appears through Earth; 0.85→1 Earth continues along it. */
export function Orbit({t,a}:{t:number;a:number}){
 const {fly,back,dark,pull,pos,vel,ghost,start:[rx0,ry0],tan,L,f}=orbitState(a);
 const ghostShow=smooth(fly,.05,.3)*(1-back);
 const ellipse=(k:number)=>Array.from({length:97},(_,i)=>onOrbit(i*3.75,k));
 const ticks=Array.from({length:6},(_,i)=>(i+1)/6).filter(k=>k<=fly+.001),path=smooth(a,.3,.42)*(1-.7*smooth(a,.85,1));
 return <g>
  <polyline points={pts(ellipse(1))} fill="none" stroke={C.lavender} strokeWidth={5} strokeDasharray="18 16" strokeDashoffset={t*12} opacity={.55-.25*smooth(a,.4,.75)+.1*back}/>
  <g opacity={back}><polyline points={pts(ellipse(f))} fill="none" stroke={C.yellow} strokeWidth={5} strokeDasharray="10 14" opacity={.8}/></g>
  <line x1={rx0} y1={ry0} x2={rx0+tan[0]*420} y2={ry0+tan[1]*420} stroke={C.pink} strokeWidth={6} strokeDasharray="12 14" strokeLinecap="round" opacity={.8*smooth(a,.36,.5)*(1-back)}/>
  <g opacity={path}>
   <line x1={rx0} y1={ry0} x2={rx0+tan[0]*L*Math.max(fly,.02)} y2={ry0+tan[1]*L*Math.max(fly,.02)} stroke={C.pink} strokeWidth={6} strokeLinecap="round"/>
   {ticks.map(k=>{const x=rx0+tan[0]*L*k,y=ry0+tan[1]*L*k;return <line key={k} x1={x-tan[1]*16} y1={y+tan[0]*16} x2={x+tan[1]*16} y2={y-tan[0]*16} stroke={C.pink} strokeWidth={4}/>;})}
  </g>
  <line x1={0} y1={0} x2={pos[0]} y2={pos[1]} stroke={C.lavender} strokeWidth={4} strokeDasharray="6 12" strokeDashoffset={-t*30} opacity={.6*pull}/>
  {ghostShow>.01&&<g opacity={ghostShow}><line x1={ghost[0]} y1={ghost[1]} x2={pos[0]} y2={pos[1]} stroke={C.lavender} strokeWidth={3} strokeDasharray="3 10" opacity={.45}/>
   <circle cx={ghost[0]} cy={ghost[1]} r={58} fill="none" stroke={C.lavender} strokeWidth={4} strokeDasharray="10 9" opacity={.6}/></g>}
  <line x1={pos[0]+vel[0]*76} y1={pos[1]+vel[1]*76} x2={pos[0]+vel[0]*136} y2={pos[1]+vel[1]*136} stroke={C.yellow} strokeWidth={6} strokeLinecap="round" opacity={.85}/>
  <polygon points={pts([[pos[0]+vel[0]*158,pos[1]+vel[1]*158],[pos[0]+vel[0]*132-vel[1]*14,pos[1]+vel[1]*132+vel[0]*14],[pos[0]+vel[0]*132+vel[1]*14,pos[1]+vel[1]*132-vel[0]*14]])} fill={C.yellow} opacity={.85}/>
  <g transform={`translate(${pos[0]},${pos[1]})`}>
   <circle r={92} fill={C.lavender} opacity={.07+.07*dark}/>
   <Earth t={t} a={.5*dark} r={60} step={20} uid="orbit-earth" light={unit([-pos[0]/ORB.rx,-pos[1]/ORB.ry,.35])} detail={0}/>
   <circle r={64} fill="none" stroke="#BFD0FF" strokeWidth={4} opacity={.25+.5*dark}/>
  </g>
 </g>;
}

/* ───────────── Last light front ───────────── */
/** A front of light expanding from the object's centre (place it on the Sun). rows 1 = the last light leaving:
 *  the ring runs outward and leaves darkness inside; rows 2 = light returning: the glow fills the ring.
 *  a 0..1 = the ring's radius, from the Sun to beyond Earth's orbit (about 820 world px at scale 1). */
export function LightFront({t,a,returning=false,uid="front"}:{t:number;a:number;returning?:boolean;uid?:string}){
 const r=Math.max(2,820*a),show=smooth(a,0,.04)*(1-smooth(a,.96,1)*.6);
 const ripple=Array.from({length:73},(_,i)=>{const ang=i*5*D,rr=r-22+6*Math.sin(i*1.5-t*6);return [Math.cos(ang)*rr,Math.sin(ang)*rr];});
 return <g opacity={show}>
  <defs><radialGradient id={`front-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={r+40}><stop offset="0" stopColor={returning?C.yellow:"#05040B"} stopOpacity={returning?".16":".55"}/><stop offset={Math.max(.01,(r-60)/(r+40))} stopColor={returning?C.yellow:"#05040B"} stopOpacity={returning?".12":".45"}/><stop offset={Math.max(.02,r/(r+40))} stopColor={C.yellowLine} stopOpacity=".55"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient></defs>
  <circle r={r+40} fill={`url(#front-${uid})`}/>
  <circle r={r} fill="none" stroke={C.yellowLine} strokeWidth={8} opacity={.9}/>
  <circle r={r+14} fill="none" stroke={C.yellow} strokeWidth={3} strokeDasharray="2 16" opacity={.6}/>
  {!returning&&<polyline points={pts(ripple)} fill="none" stroke={C.lavender} strokeWidth={3} strokeDasharray="10 12" opacity={.6}/>}
 </g>;
}

/* ───────────── Planets in a row ───────────── */
const PLANETS:{x:number;r:number;m:[string,string];band?:string;ring?:boolean}[]=[
 {x:-440,r:15,m:["#C9C3D6","#4B4658"]},{x:-370,r:25,m:["#F2DFA0","#8A7440"]},{x:-290,r:27,m:["#4F63DA","#1F1C5E"]},{x:-218,r:19,m:["#E9784E","#7A2E1E"]},
 {x:-90,r:66,m:["#ECC890","#8A5A2E"],band:"#B9784A"},{x:100,r:52,m:["#EED79E","#8C7342"],ring:true},{x:262,r:36,m:["#A6E6EC","#3A7A86"]},{x:384,r:35,m:["#6F86F4","#22307A"]},
];
/** Mercury to Neptune left to right (sizes and gaps illustrative). a: 0 all lit from the left → 1 darkness
 *  sweeps outward, each planet going dark after the previous one. */
export function PlanetRow({t,a}:{t:number;a:number}){
 return <g>
  <line x1={-470} y1={0} x2={440} y2={0} stroke={C.lavender} strokeOpacity={.12} strokeWidth={3} strokeDasharray="4 14"/>
  {PLANETS.map((p,k)=>{const dark=smooth(a,.06+k*.105,.16+k*.105),faces=sphere(p.r>40?12:20,-t*(6+k)+k*40,-14,0);
   const fill=(f:Face)=>{let m=p.m;if(p.band&&Math.abs(Math.sin(f.lat*D*5))>.55)m=[p.band,mix(p.band,"#000000",.45)];if(k===2&&ground(f.lon,f.lat)!=="ocean")m=["#6FCB5A","#245C32"];
    return mix("#0B0A14",tone(m,f.n,SUN_LIGHT,(hash(f.i)-.5)*.06),litShare(f.n,SUN_LIGHT,1-dark));};
   const ring=(front:boolean)=><path d={front?`M ${-p.r*1.9} 0 A ${p.r*1.9} ${p.r*.5} 0 0 0 ${p.r*1.9} 0`:`M ${-p.r*1.9} 0 A ${p.r*1.9} ${p.r*.5} 0 0 1 ${p.r*1.9} 0`} fill="none" stroke={mix("#2A2638","#D9C7A0",1-dark)} strokeWidth={9} transform="rotate(-14)"/>;
   return <g key={k} transform={`translate(${p.x},0)`}>
    {p.ring&&ring(false)}
    <Facets faces={faces} r={p.r} fill={fill}/>
    {p.ring&&ring(true)}
    <circle r={p.r} fill="none" stroke={C.lavender} strokeWidth={2} strokeOpacity={.25*dark}/>
   </g>;})}
 </g>;
}

/* ───────────── City under a sky dome ───────────── */
const BUILDINGS=[[-250,70,120],[-185,52,200],[-128,64,150],[-62,48,260],[-10,72,180],[52,56,230],[110,66,140],[170,50,190],[226,62,110]];
const SKY_STARS=Array.from({length:70},(_,i)=>({x:-330+hash(i+5)*660,y:-330+hash(i+41)*300,r:1.4+hash(i+9)*2.6}));
/** A small city on a round plinth under a glass sky dome. a: 0 blue day sky with the Sun → 1 noon turned to
 *  night: black sky full of stars and the Milky Way, no Moon, every window and street lamp lit. */
export function NightSky({t,a,uid="sky"}:{t:number;a:number;uid?:string}){
 const night=smooth(a,.15,.85),R=370,sunUp=1-smooth(a,0,.45);
 const dome=`M ${-R} 120 A ${R} ${R} 0 0 1 ${R} 120 Z`;
 return <g>
  <defs>
   <clipPath id={`dome-${uid}`}><path d={dome}/></clipPath>
   <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={mix("#3E62D8","#05040E",night)}/><stop offset=".75" stopColor={mix("#9EC0F4","#140F2A",night)}/></linearGradient>
  </defs>
  <ellipse cx={0} cy={252} rx={420} ry={44} fill="#000" opacity={.45}/>
  <polygon points={pts([[-400,120],[400,120],[380,190],[330,226],[-330,226],[-380,190]])} fill="#3A3150"/>
  <polygon points={pts([[-400,120],[0,120],[0,226],[-330,226],[-380,190]])} fill="#4E4466"/>
  <polygon points={pts([[-380,190],[380,190],[330,226],[-330,226]])} fill="#251E36"/>
  <g clipPath={`url(#dome-${uid})`}>
   <rect x={-R} y={-R+120} width={2*R} height={R} fill={`url(#sky-${uid})`}/>
   <g opacity={night}>
    <ellipse cx={20} cy={-70} rx={380} ry={60} transform="rotate(-28,20,-70)" fill={C.lavender} opacity={.13}/>
    <ellipse cx={20} cy={-70} rx={300} ry={26} transform="rotate(-28,20,-70)" fill={C.ivory} opacity={.1}/>
    {SKY_STARS.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r*(.8+.25*Math.sin(t*2+i))} fill={i%5?C.ivory:C.yellowLine} opacity={.5+.5*hash(i)}/>)}
   </g>
   <g opacity={sunUp} transform={`translate(0,${-192+60*(1-sunUp)})`}><circle r={78} fill={C.yellow} opacity={.25}/><circle r={46} fill="#FFF3C0"/></g>
   <polygon points={pts([[-R,120],[-R,40],[-260,10],[-170,52],[-60,18],[60,48],[170,8],[290,44],[R,30],[R,120]])} fill={mix("#3E7A44","#0F1418",night)}/>
   {BUILDINGS.map(([x,w,h],i)=>{const top=120-h,lit=Array.from({length:Math.floor(h/34)*2},(_,k)=>({x:x-w/2+12+(k%2)*(w-34),y:top+16+Math.floor(k/2)*34,on:hash(i*13+k)<.25+.7*night}));
    return <g key={i}><polygon points={pts([[x-w/2,120],[x-w/2,top],[x+w/2,top+8],[x+w/2,120]])} fill={mix(i%2?"#8C86A8":"#A39DBD","#1C1830",night*.85)}/>
     <polygon points={pts([[x,120],[x,top+4],[x+w/2,top+8],[x+w/2,120]])} fill="#000" opacity={.25}/>
     {lit.map((l,k)=><rect key={k} x={l.x} y={l.y} width={10} height={14} fill={C.yellowLine} opacity={l.on?(.15+.85*night):.12}/>)}</g>;})}
   {[-210,-30,140,280].map((x,i)=><g key={i}><rect x={x-2} y={74} width={4} height={46} fill="#2A2438"/><circle cx={x} cy={72} r={20} fill={C.yellow} opacity={.22*night}/><circle cx={x} cy={72} r={5} fill={C.yellowLine} opacity={.3+.7*night}/></g>)}
  </g>
  <path d={dome} fill="none" stroke={C.lavender} strokeOpacity={.35} strokeWidth={5}/>
  <path d={`M ${-R*.78} 40 A ${R*.88} ${R*.88} 0 0 1 ${-R*.2} ${-R*.62}`} fill="none" stroke="#fff" strokeOpacity={.18} strokeWidth={10} strokeLinecap="round"/>
 </g>;
}

/* ───────────── Thermometer ───────────── */
/** Glass thermometer on a small stand. a: 0 warm, the column high → 1 cold, the column low, frost on the glass. */
export function Thermometer({t,a}:{t:number;a:number}){
 const level=lerp(.78,.18,a),frost=smooth(a,.4,.8),top=-246,bottom=130,h=bottom-top,y=bottom-h*level,col=mix(C.pink,"#7F9BFF",smooth(a,.2,.9));
 const crystals=Array.from({length:7},(_,i)=>({x:(hash(i*3)-.5)*40,y:top+30+hash(i*5)*300,s:8+10*hash(i*7)}));
 return <g>
  <ellipse cx={0} cy={268} rx={78} ry={12} fill="#000" opacity={.45}/>
  <polygon points={pts([[-60,244],[60,244],[46,264],[-46,264]])} fill="#4E4F62"/>
  <rect x={-36} y={top-14} width={72} height={h+60} rx={36} fill="#1A1530" stroke={C.lavender} strokeOpacity={.4} strokeWidth={4}/>
  <circle cx={0} cy={bottom+56} r={58} fill="#1A1530" stroke={C.lavender} strokeOpacity={.4} strokeWidth={4}/>
  <circle cx={0} cy={bottom+56} r={44} fill={col}/>
  <rect x={-14} y={y} width={28} height={bottom-y+50} rx={14} fill={col}/>
  <circle cx={0} cy={y} r={14} fill={col}/>
  {Array.from({length:9},(_,i)=>{const ty=bottom-i*h/8;return <line key={i} x1={36} y1={ty} x2={i%2?54:66} y2={ty} stroke={C.lavender} strokeWidth={4} strokeOpacity={.6}/>;})}
  <rect x={-24} y={top} width={9} height={h} rx={4} fill="#fff" opacity={.18}/>
  <g opacity={frost}>{crystals.map((c,i)=><g key={i} transform={`translate(${c.x},${c.y}) rotate(${t*6+i*20}) scale(${.6+.4*frost})`}>{[0,60,120].map(r=><line key={r} x1={-c.s} y1={0} x2={c.s} y2={0} transform={`rotate(${r})`} stroke={C.ivory} strokeWidth={3} strokeLinecap="round"/>)}</g>)}
   <rect x={-36} y={top-14} width={72} height={h+60} rx={36} fill={C.ivory} opacity={.12}/></g>
 </g>;
}

/* ───────────── Leaf ───────────── */
/** A large leaf in sunlight. a: 0 photosynthesis: light rays fall on it, its veins glow and yellow sugar flows
 *  down to the stem → 1 no light: the leaf dims and the flow stops (it lives on stored sugar). */
export function Leaf({t,a}:{t:number;a:number}){
 const on=1-smooth(a,0,1),edge=Array.from({length:19},(_,i)=>{const u=i/18,w=Math.sin(Math.PI*u)*(150+12*Math.sin(u*14));return [-180+u*360,w];});
 const top=edge.map(([x,w])=>[x,-w*.62-x*.12]),low=edge.map(([x,w])=>[x,w*.62-x*.12]);
 const veins=[-120,-60,0,60,120].map(x=>({x,y:-x*.12}));
 const light=(c:readonly [string,string])=>[mix("#3A4438",c[0],on),mix("#161C16",c[1],on)];
 const [l1,d1]=light(["#7BE05A","#2E7A1E"]),[l2,d2]=light(["#5CC046","#1F5A18"]);
 return <g>
  <g opacity={on*.8}>{[-150,-40,70].map((x,i)=><polygon key={i} points={pts([[x-30-120,-320],[x+30-120,-320],[x+50,-60],[x+10,-60]])} fill={C.yellow} opacity={.12+.04*Math.sin(t*1.5+i)}/>)}</g>
  <ellipse cx={0} cy={210} rx={180} ry={22} fill="#000" opacity={.4}/>
  <path d="M 180 -22 Q 230 60 210 196" stroke={mix("#3A4438","#2E7A1E",on)} strokeWidth={14} fill="none" strokeLinecap="round"/>
  <polygon points={pts([...top,[180,-22]])} fill={l1} stroke={l1}/>
  <polygon points={pts([...low,[180,-22]])} fill={d1} stroke={d1}/>
  {top.slice(1,-1).map(([x,y],i)=>i%3===1?<polygon key={i} points={pts([[x,y],[x+20,-x*.12],[x-20,-x*.12]])} fill={l2} opacity={.6}/>:null)}
  {low.slice(1,-1).map(([x,y],i)=>i%3===2?<polygon key={i} points={pts([[x,y],[x+20,-x*.12],[x-20,-x*.12]])} fill={d2} opacity={.6}/>:null)}
  <line x1={-180} y1={21.6} x2={180} y2={-21.6} stroke={mix("#3A4438",C.yellowLine,on)} strokeWidth={6} opacity={.55+.35*on}/>
  {veins.map((v,i)=><g key={i} stroke={mix("#3A4438",C.yellowLine,on)} strokeWidth={4} opacity={.35+.45*on}><line x1={v.x} y1={v.y} x2={v.x-60} y2={v.y-82}/><line x1={v.x} y1={v.y} x2={v.x-60} y2={v.y+66}/></g>)}
  <g opacity={on}>{Array.from({length:10},(_,i)=>{const u=((t*.35+i/10)%1),x=-180+u*360,y=-x*.12;return <circle key={i} cx={x} cy={y} r={7} fill={C.yellow} opacity={.9*Math.sin(Math.PI*u)}/>;})}</g>
 </g>;
}

/* ───────────── Rotation catalog: a spinning Earth that stops ───────────── */
type Keyed={activeKeys?:{at:number;value:number}[];enterAt?:number};
/** State change length of spin-earth (also in KEY_SECONDS): the spin angle integrates the same keyed curve. */
export const SPIN_EARTH_KEY=2;
const spinSpeed=(a:number)=>1-smooth(a,.03,.36);
/** Rotation angle in degrees: the integral of the keyed spin speed, so slowing down never jumps (22°/s at full spin). */
export function spinEarthAngle(t:number,o:Keyed){
 const keys=o.activeKeys??[],start=Math.min(t,o.enterAt??0),dt=1/30;let angle=0;
 for(let s=start;s<t;s+=dt){const h=Math.min(dt,t-s);angle+=22*spinSpeed(keyed(s+h/2,keys,0,SPIN_EARTH_KEY,easeSine))*h;}
 return angle;
}
const NEW_LAND=["#D8B46A","#7A5A2E"] as const,HOT=["#FF7A2E","#9A2E12"] as const;
/** Earth whose spin stops. a: 0 spinning east (speed chevrons on the equator) → 0.4 stopped → 0.4–0.6 the day side
 *  roasts, the night side freezes, windy streaks along the border → 0.6–1 the oceans drain toward the poles: a new
 *  continent rises around the equator, high latitudes flood. The pale shell is the ocean bulge, hugely exaggerated:
 *  wide at the equator while spinning, at the poles when the water has moved. */
export function SpinEarth({t,a,o,uid="spin"}:{t:number;a:number;o:Keyed;uid?:string}){
 const R=200,spin=spinSpeed(a),split=smooth(a,.4,.58),calm=smooth(a,.6,.67),oceans=smooth(a,.68,1),bulge=calm*(1-smooth(a,.92,1)),rot=spinEarthAngle(t,o)-30;
 // While the oceans move the globe pitches level, so both polar oceans come into view.
 const pitch=lerp(-16,-3,oceans),faces=sphere(10,rot,pitch,-14),light=SUN_LIGHT;
 const ground2=(f:Face):Ground=>{let g=ground(f.lon,f.lat);const al=Math.abs(f.lat),n=(hash(f.i*.37)-.5)*10;
  if(oceans>0){if(g==="ocean"&&al+n<lerp(-5,32,oceans))g="desert";else if(g!=="ocean"&&al+n>lerp(95,g==="ice"?62:52,oceans))g="ocean";}
  return g;};
 // Roast/freeze tint fades again while the oceans move, so the new map reads in its own colours.
 const heat=split*(1-calm);
 const fill=(f:Face)=>{const g=ground2(f),jit=(hash(f.i)-.5)*.08,lit=litShare(f.n,light,1),mat=g==="desert"&&ground(f.lon,f.lat)==="ocean"?NEW_LAND:EARTH[g];
  let day=tone(mat,f.n,light,jit),night=mix(NIGHT[g],"#2A2A55",.18*clamp01(f.n[2]));
  day=mix(day,tone(HOT,f.n,light,jit),heat*.8);night=mix(night,mix("#41609E","#BFD6FF",clamp01(f.n[2]*.6+(hash(f.i*.9)-.5)*.3)),heat*.8);
  return mix(night,day,lit);};
 // Equator and the speed chevrons, projected with the same rotation as the globe.
 const proj=(lon:number,lat:number):V3=>{const cq=Math.cos(pitch*D),sq=Math.sin(pitch*D),ct=Math.cos(-14*D),st=Math.sin(-14*D),l=(lon+rot)*D,b=lat*D,x=Math.cos(b)*Math.sin(l),y=-Math.sin(b),z=Math.cos(b)*Math.cos(l),y2=y*cq-z*sq,z2=y*sq+z*cq;return [x*ct-y2*st,x*st+y2*ct,z2];};
 const equator=Array.from({length:73},(_,i)=>proj(i*5-rot,0)).filter(p=>p[2]>0).map(p=>[p[0]*R*1.005,p[1]*R*1.005]);
 const chevrons=Array.from({length:12},(_,i)=>{const lon=i*30-rot+((t*40)%30)*spin;const p=proj(lon,0),q=proj(lon+6,0);return {p,q,i};}).filter(c=>c.p[2]>.15);
 // Wind arrows straddle the day/night border and blow from the bright side toward the dark side.
 const border=(y:number)=>{let best=0,prev=NaN;for(let k=0;k<=60;k++){const x=-1+k/30,r2=1-x*x-y*y;if(r2<0)continue;const v=light[0]*x+light[1]*y+light[2]*Math.sqrt(r2);if(prev>0&&v<=0){best=x;break;}prev=v;}return best;};
 const winds=Array.from({length:7},(_,i)=>{const y=-.66+i*.22,bx=border(y),ph=(t*.55+hash(i*1.7))%1;return {y,bx,ph,i};});
 const shellRx=R*lerp(1.2,1.03,oceans),shellRy=R*lerp(1.02,1.18,oceans);
 return <g>
  <defs><radialGradient id={`satm-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={R*1.18}><stop offset=".84" stopColor="#7FA0FF" stopOpacity=".5"/><stop offset="1" stopColor="#7F8CFF" stopOpacity="0"/></radialGradient></defs>
  <circle r={R*1.18} fill={`url(#satm-${uid})`}/>
  <ellipse rx={shellRx} ry={shellRy} transform="rotate(-14)" fill="#6FA8FF" opacity={.13+.22*bulge}/>
  <ellipse rx={shellRx} ry={shellRy} transform="rotate(-14)" fill="none" stroke="#9CC4FF" strokeWidth={3+3*bulge} strokeDasharray="10 10" opacity={.45+.45*bulge}/>
  <line x1={Math.sin(-14*D)*R*1.32} y1={-Math.cos(-14*D)*R*1.32} x2={-Math.sin(-14*D)*R*1.32} y2={Math.cos(-14*D)*R*1.32} stroke={C.lavender} strokeWidth={4} strokeDasharray="12 10" opacity={.45}/>
  <Facets faces={faces} r={R} fill={fill}/>
  {faces.filter(f=>{const g=ground2(f);return (g==="land"||g==="desert")&&hash(f.i*3.1)<.38&&f.n[2]>.18;}).map(f=>{const night=1-litShare(f.n,light,1),[x,y]=f.p.reduce((m,q)=>[m[0]+q[0]/3,m[1]+q[1]/3],[0,0]);
   return night>.05?<circle key={f.i} cx={x*R} cy={y*R} r={2.6} fill={C.yellowLine} opacity={night*(1-.6*split)*(.75+.25*Math.sin(t*2.3+f.i))}/>:null;})}
  <polyline points={pts(equator)} fill="none" stroke={C.yellow} strokeWidth={3} strokeDasharray="6 8" opacity={.35+.4*spin}/>
  <g opacity={spin}>{chevrons.map(c=><polygon key={c.i} points={pts([[c.q[0]*R*1.02,c.q[1]*R*1.02],[c.p[0]*R*1.02-(c.q[1]-c.p[1])*R*.35,c.p[1]*R*1.02+(c.q[0]-c.p[0])*R*.35],[c.p[0]*R*1.02+(c.q[1]-c.p[1])*R*.35,c.p[1]*R*1.02-(c.q[0]-c.p[0])*R*.35]])} fill={C.yellow} opacity={.9*c.p[2]}/>)}</g>
  <g opacity={split*(1-calm)}>{winds.map(w=>{const x=(w.bx-.32+.5*w.ph)*R,y=w.y*R,o=Math.sin(Math.PI*w.ph);
   return <g key={w.i} opacity={.85*o}><line x1={x-46} y1={y} x2={x+18} y2={y} stroke={C.ivory} strokeWidth={5} strokeLinecap="round"/><polygon points={pts([[x+34,y],[x+14,y-11],[x+14,y+11]])} fill={C.ivory}/></g>;})}</g>
  <circle r={R} fill="none" stroke="#BFD0FF" strokeWidth={5} opacity={.35}/>
 </g>;
}

/* ───────────── Surface: what a sudden stop does to everything loose ───────────── */
const HOUSES=[[-250,64,90],[-150,74,120],[40,70,104],[150,60,84]];
/** A small town on a plinth. a: 0 calm (we all move with the ground) → 0.5 sudden stop: everything loose keeps going
 *  east (to the right): streaks of wind, trees bent flat, the car and roof tiles fly off, the flag snaps → 1 a huge
 *  wave rolls in from the left. */
export function WindSurface({t,a}:{t:number;a:number}){
 const storm=smooth(a,.05,.5),wave=smooth(a,.55,1),bend=storm*.9;
 const carX=lerp(60,560,smooth(a,.15,.6)),carOut=1-smooth(a,.4,.6);
 const tiles=Array.from({length:8},(_,i)=>{const k=clamp01(storm*1.6-hash(i)*.6),x=-200+i*55+k*(520+hash(i*3)*200)+Math.sin(t*3+i)*6,y=-40-k*(120+hash(i*7)*120);return {x,y,k,i};});
 const streaks=Array.from({length:16},(_,i)=>{const ph=(t*(1.6+hash(i)*.8)+hash(i*5))%1,y=-260+hash(i*9)*300;return {x:-420+ph*840,y,o:Math.sin(Math.PI*ph),i};});
 // A breaking wave rolling in from the left: a long back, a crest that curls forward, foam and spray.
 const waveX=lerp(-560,60,wave),H=200*wave,base=110,top=base-H;
 const back=Array.from({length:14},(_,i)=>{const x=-400+(waveX-60+400)*i/13;return [x,base-H*.55-H*.4*Math.pow(i/13,2)+Math.sin(i*1.3+t*3)*6*wave];});
 const wavePath=`M -400 ${base} L ${back.map(([x,y])=>`${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Q ${waveX-10} ${top-18} ${waveX+46} ${top+H*.22} Q ${waveX+10} ${top+H*.12} ${waveX+4} ${top+H*.38} Q ${waveX+18} ${base-H*.3} ${waveX+40} ${base} Z`;
 const spray=Array.from({length:10},(_,i)=>({x:waveX+20+hash(i)*60,y:top-10-hash(i*3)*40+Math.sin(t*5+i)*6,r:3+hash(i*7)*4,i}));
 return <g>
  <ellipse cx={0} cy={232} rx={420} ry={40} fill="#000" opacity={.45}/>
  <polygon points={pts([[-400,110],[400,110],[380,180],[330,214],[-330,214],[-380,180]])} fill="#3A3150"/>
  <polygon points={pts([[-400,110],[0,110],[0,214],[-330,214],[-380,180]])} fill="#4E4466"/>
  <polygon points={pts([[-400,110],[400,110],[380,96],[-380,96]])} fill="#3E7A44"/>
  <clipPath id="ws-clip"><rect x={-400} y={-330} width={800} height={440}/></clipPath>
  <g clipPath="url(#ws-clip)">
   <g opacity={storm}>{streaks.map(s=><line key={s.i} x1={s.x} y1={s.y} x2={s.x+70+60*storm} y2={s.y} stroke={C.lavender} strokeWidth={3} strokeLinecap="round" opacity={.55*s.o}/>)}</g>
   {HOUSES.map(([x,w,h],i)=>{const shake=Math.sin(t*20+i)*3*storm;return <g key={i} transform={`translate(${x+shake},0)`}>
    <polygon points={pts([[-w/2,96],[-w/2,96-h],[w/2,96-h],[w/2,96]])} fill={i%2?"#A39DBD":"#8C86A8"}/>
    <polygon points={pts([[0,96],[0,96-h],[w/2,96-h],[w/2,96]])} fill="#000" opacity={.18}/>
    <polygon points={pts([[-w/2-8,96-h],[0,96-h-44*(1-storm*.7)],[w/2+8,96-h]])} fill="#6E3A4A" opacity={1-storm*.6}/>
    {[0,1].map(k=><rect key={k} x={-w/2+12+k*(w-34)} y={96-h+24} width={12} height={16} fill={C.yellowLine} opacity={.7}/>)}</g>;})}
   {[-80,250].map((x,i)=><g key={i} transform={`translate(${x},96) skewX(${-bend*38})`}><rect x={-5} y={-70} width={10} height={70} fill="#5A4030"/><polygon points={pts([[-34,-60],[0,-150],[34,-60]])} fill="#3F8A4A"/><polygon points={pts([[0,-150],[34,-60],[0,-60]])} fill="#000" opacity={.2}/></g>)}
   <g transform="translate(-300,96)"><rect x={-3} y={-150} width={6} height={150} fill="#9A97AC"/><polygon points={pts([[3,-150],[3+lerp(40,90,storm),-150+lerp(28,6,storm)+Math.sin(t*(4+10*storm))*6],[3,-118]])} fill={C.pink}/></g>
   <g opacity={carOut} transform={`translate(${carX},${80-storm*smooth(a,.3,.6)*80}) rotate(${storm*smooth(a,.3,.6)*40})`}><rect x={-40} y={-26} width={80} height={24} rx={6} fill={C.yellow}/><rect x={-24} y={-42} width={44} height={18} rx={5} fill="#E9C46E"/><circle cx={-22} cy={0} r={9} fill="#1E1A2A"/><circle cx={22} cy={0} r={9} fill="#1E1A2A"/></g>
   {tiles.map(p=>p.k>.01?<rect key={p.i} x={p.x} y={p.y} width={18} height={10} fill="#6E3A4A" opacity={Math.sin(Math.PI*clamp01(p.k))} transform={`rotate(${t*200*p.k+p.i*40},${p.x+9},${p.y+5})`}/>:null)}
   <g opacity={smooth(wave,0,.15)}><path d={wavePath} fill="#3D5BD6"/>
    <path d={wavePath} fill="none" stroke="#9CC4FF" strokeWidth={5} strokeLinejoin="round" opacity={.6}/>
    <polyline points={pts(back.slice(-6))} fill="none" stroke={C.ivory} strokeWidth={7} strokeLinecap="round" opacity={.75}/>
    {spray.map(p=><circle key={p.i} cx={p.x} cy={p.y} r={p.r} fill={C.ivory} opacity={.7}/>)}</g>
  </g>
 </g>;
}

/* ───────────── One day lasts a year ───────────── */
/** A year around the Sun for an Earth that no longer spins (not to scale). The yellow pin is one city on the side
 *  that keeps facing the same way in space. a 0..1 = one trip around the Sun: the city sits on the sunlit side for
 *  half the orbit (the trail turns yellow) and on the night side for the other half (the trail turns indigo). */
export function DayYear({t,a}:{t:number;a:number}){
 const RX=360,RY=140,phi0=0,phi=phi0+360*a,pos=(deg:number)=>[RX*Math.cos(deg*D),RY*Math.sin(deg*D)];
 const [ex,ey]=pos(phi),toSun=unit([-ex,-ey,0]),pinDir:[number,number]=[0,-1],day=pinDir[0]*toSun[0]+pinDir[1]*toSun[1];
 const trail=Array.from({length:Math.max(1,Math.round(72*a))},(_,i)=>{const d0=phi0+i*5,d1=Math.min(phi,d0+5),[x0,y0]=pos(d0),[x1,y1]=pos(d1),[mx,my]=pos((d0+d1)/2),ts=unit([-mx,-my,0]);
  return {x0,y0,x1,y1,day:pinDir[0]*ts[0]+pinDir[1]*ts[1]>0,i};});
 const r=46,light=unit([toSun[0],toSun[1],.3]) as V3;
 return <g>
  <ellipse rx={RX} ry={RY} fill="none" stroke={C.lavender} strokeWidth={4} strokeDasharray="12 12" opacity={.45}/>
  {trail.map(s=><line key={s.i} x1={s.x0} y1={s.y0} x2={s.x1} y2={s.y1} stroke={s.day?C.yellow:"#5A5FD8"} strokeWidth={10} strokeLinecap="round" opacity={.85}/>)}
  <circle r={70} fill={C.yellow} opacity={.18}/><circle r={48} fill="#F4B544"/><circle r={34} fill="#FFE7A0"/>
  {Array.from({length:12},(_,i)=>{const an=i*30*D+t*.2;return <line key={i} x1={Math.cos(an)*56} y1={Math.sin(an)*56} x2={Math.cos(an)*76} y2={Math.sin(an)*76} stroke={C.yellow} strokeWidth={6} strokeLinecap="round"/>;})}
  <g transform={`translate(${ex},${ey})`}>
   <Earth t={0} a={0} r={r} step={20} uid="dayyear" light={light} detail={0}/>
   <line x1={0} y1={-r} x2={0} y2={-r-26} stroke={day>0?C.yellow:"#8C90E8"} strokeWidth={5}/>
   <circle cx={0} cy={-r-32} r={11} fill={day>0?C.yellowLine:"#8C90E8"}/>
   <circle cx={0} cy={-r-32} r={22} fill={C.yellow} opacity={day>0?.25:0}/>
  </g>
 </g>;
}

/* ───────────── Space backdrop and near dust (parallax) ───────────── */
const FAR_STARS=Array.from({length:560},(_,i)=>({x:-900+hash(i*1.31+2)*3000,y:-800+hash(i*2.17+9)*2500,r:.9+Math.pow(hash(i*3.7+1),3)*2.6,o:.25+.55*hash(i*5.3+4),tw:hash(i*.73)}));
const DEEP_STARS=Array.from({length:380},(_,i)=>({x:-600+hash(i*4.1+7)*2300,y:-500+hash(i*6.3+3)*1800,r:.7+hash(i*2.9)*1.1,o:.18+.3*hash(i*8.1)}));
const BAND=Array.from({length:260},(_,i)=>{const u=hash(i*9.7+5),v=(hash(i*3.3+8)-.5)*(1-Math.abs(u-.5))*2;return {x:-700+u*2800,y:900-u*1400+v*170,r:.6+hash(i*1.9)*1.6,o:.2+.4*hash(i*7.7)};});
const DUST=Array.from({length:46},(_,i)=>({x:-500+hash(i*2.3+1)*5200,y:-500+hash(i*5.9+2)*3400,r:1.5+hash(i*7.1)*3}));
const BOKEH=[{x:300,y:200,r:120},{x:1800,y:1500,r:150},{x:3100,y:500,r:110},{x:2400,y:2300,r:140},{x:900,y:2000,r:100},{x:3700,y:1600,r:130}];
type Cam={x:number;y:number;zoom:number};
/** Far layers drawn behind the world in stage pixels: deep stars (parallax .15), stars and the Milky Way (.35),
 *  faint nebulae. They move slower than the world, so camera moves read as depth. */
export function SpaceBackdrop({cam,t,width,height,loop}:{cam:Cam;t:number;width:number;height:number;loop?:number}){
 // Loop films (2026-10-22): twinkle rates rounded to whole cycles over the film, so the last frame matches the first.
 const w=(f:number)=>loop?2*Math.PI*Math.max(1,Math.round(loop*f/(2*Math.PI)))/loop:f;
 const layer=(f:number,zf:number)=>`translate(${width/2},${height/2}) scale(${1+(cam.zoom-1)*zf}) translate(${-cam.x*f},${-cam.y*f})`;
 return <g>
  <defs>
   <linearGradient id="space-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#04030A"/><stop offset=".6" stopColor="#0A0718"/><stop offset="1" stopColor="#120C24"/></linearGradient>
   <radialGradient id="nebula-a"><stop offset="0" stopColor={C.purple} stopOpacity=".32"/><stop offset="1" stopColor={C.purple} stopOpacity="0"/></radialGradient>
   <radialGradient id="nebula-b"><stop offset="0" stopColor={C.pink} stopOpacity=".18"/><stop offset="1" stopColor={C.pink} stopOpacity="0"/></radialGradient>
   <radialGradient id="milky"><stop offset="0" stopColor={C.lavender} stopOpacity=".16"/><stop offset=".6" stopColor={C.lavender} stopOpacity=".05"/><stop offset="1" stopColor={C.lavender} stopOpacity="0"/></radialGradient>
  </defs>
  <rect width={width} height={height} fill="url(#space-bg)"/>
  <g transform={layer(.15,.12)}>
   <ellipse cx={200} cy={300} rx={700} ry={420} fill="url(#nebula-a)"/>
   <ellipse cx={1250} cy={900} rx={620} ry={380} fill="url(#nebula-b)"/>
   {DEEP_STARS.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.lavender} opacity={s.o}/>)}
  </g>
  <g transform={layer(.35,.25)}>
   <ellipse cx={700} cy={200} rx={1600} ry={210} transform="rotate(-27,700,200)" fill="url(#milky)"/>
   {BAND.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.ivory} opacity={s.o}/>)}
   {FAR_STARS.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i%9===0?C.yellowLine:i%7===0?C.lavender:C.ivory} opacity={s.o*(s.tw>.85?.65+.35*Math.sin(t*w(2.2)+i):1)}/>)}
   {FAR_STARS.filter(s=>s.r>2.6).map((s,i)=><g key={`g${i}`} opacity={.35+.25*Math.sin(t*w(1.7)+i*2)}><line x1={s.x-10} y1={s.y} x2={s.x+10} y2={s.y} stroke={C.ivory} strokeWidth={1.2}/><line x1={s.x} y1={s.y-10} x2={s.x} y2={s.y+10} stroke={C.ivory} strokeWidth={1.2}/></g>)}
  </g>
 </g>;
}
/** Near dust and soft bokeh in front of the world (parallax 1.3), kept faint so objects stay readable. */
export function SpaceDust({cam,width,height}:{cam:Cam;width:number;height:number}){
 return <g transform={`translate(${width/2},${height/2}) scale(${1+(cam.zoom-1)*1.3}) translate(${-cam.x*1.3+600},${-cam.y*1.3+400})`} pointerEvents="none">
  <defs><radialGradient id="bokeh"><stop offset="0" stopColor={C.lavender} stopOpacity=".07"/><stop offset="1" stopColor={C.lavender} stopOpacity="0"/></radialGradient></defs>
  {BOKEH.map((b,i)=><circle key={i} cx={b.x} cy={b.y} r={b.r} fill="url(#bokeh)"/>)}
  {DUST.map((d,i)=><circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill={C.lavender} opacity={.16}/>)}
 </g>;
}
