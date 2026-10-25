import React from "react";
import brand from "../video-design/brand.json";
import {keyed,easeSine,type IllustratedTimeline} from "../src/lib/illustrated";
import {NET_KEY_SECONDS,type NetKind} from "../src/lib/illustrated-catalog-net";

// Prepared objects for the "what if the internet went dark for 24 hours" explainer (2026-10-20): a faceted
// network globe, an undersea cable diorama, a smartphone with three screens, a card terminal and a cash register,
// an airport and a container port dioramas, a navigation satellite and a 24-hour dial. Illustrations, not to scale.
// Every value derives from the frame time t and the keyed state a; processes that stop (packets, light pulses,
// chat scroll, taxiing planes, the crane and trucks) integrate their speed over time, so stopping never jumps.
// No randomness, no text, no logos.
const C=brand.colors;
export type TimedObject=IllustratedTimeline["objects"][number];
export type NetArtProps={kind:string;o:TimedObject;t:number;a:number;xray:number;uid:string;overlay?:boolean};
type Keyed={activeKeys?:{at:number;value:number}[];enterAt?:number};
type V3=[number,number,number];
const D=Math.PI/180;
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number,a:number,b:number)=>{const x=clamp01((v-a)/(b-a));return x*x*(3-2*x);};
const bump=(v:number,a:number,b:number,c:number,d:number)=>smooth(v,a,b)*(1-smooth(v,c,d));
const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
const inOut=(v:number)=>{const x=clamp01(v);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
/** Gentle in-out (peak speed π/2 × average) for machines that must read as heavy and slow. */
const sine=(v:number)=>.5-.5*Math.cos(Math.PI*clamp01(v));
const frac=(v:number)=>v-Math.floor(v);
const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const pts=(p:number[][])=>p.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const rgb=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const hex=(v:number[])=>"#"+v.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,"0")).join("");
const mix=(a:string,b:string,k:number)=>{const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v+(y[i]-v)*clamp01(k)));};
const unit=(a:V3):V3=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const keySeconds=(kind:NetKind)=>NET_KEY_SECONDS[kind]??.45;

/** Two-tone facet split: light from the top left, as in the low-poly references. */
function Two({poly,light,dark,split=0}:{poly:number[][];light:string;dark:string;split?:number}){
 const l=poly.map(([x,y])=>[Math.min(x,split),y]),r=poly.map(([x,y])=>[Math.max(x,split),y]);
 return <><polygon points={pts(l)} fill={light}/><polygon points={pts(r)} fill={dark}/></>;
}
/** Soft floor shadow centred at y; keep y + 8 inside the footprint bottom. */
const Shadow=({w,y,o=.45}:{w:number;y:number;o?:number})=><ellipse cx={0} cy={y} rx={w*.46} ry={8} fill="#000" opacity={o}/>;
/** Low-poly box in oblique projection (depth goes up and to the right): front, top and right faces. (x,y) = front top-left. */
function Box({x,y,w,h,d=0,front,top,side}:{x:number;y:number;w:number;h:number;d?:number;front:string;top?:string;side?:string}){
 const dx=d*.5,dy=-d*.42;
 return <g>
  {d>0&&<polygon points={pts([[x,y],[x+dx,y+dy],[x+w+dx,y+dy],[x+w,y]])} fill={top??front}/>}
  {d>0&&<polygon points={pts([[x+w,y],[x+w+dx,y+dy],[x+w+dx,y+h+dy],[x+w,y+h]])} fill={side??front}/>}
  <rect x={x} y={y} width={w} height={h} fill={front}/>
 </g>;
}

/* ───────────── Integrated processes ───────────── */
/** dτ/ds = v(a(s), τ) integrated from the object's entrance to t with fixed 1/30 s midpoint steps (the same keyed
 *  curve as the renderer). Deterministic per frame and continuous in t, so a process that slows down to a stop,
 *  or restarts, never jumps. v may depend on τ (a cycle may finish its current move before it rests). */
export function integrate(t:number,o:Keyed,dur:number,v:(a:number,tau:number)=>number){
 const keys=o.activeKeys??[],start=Math.min(t,o.enterAt??0),dt=1/30;let tau=0,s=start;
 while(s<t-1e-9){const h=Math.min(dt,t-s),a=keyed(s+h/2,keys,0,dur,easeSine);tau+=v(a,tau)*h;s+=h;}
 return tau;
}
/** Several independent speeds over the same keyed curve (one loop for all arcs of the globe). */
export function integrateMany(t:number,o:Keyed,dur:number,speeds:((a:number)=>number)[]){
 const keys=o.activeKeys??[],start=Math.min(t,o.enterAt??0),dt=1/30,tau=speeds.map(()=>0);let s=start;
 while(s<t-1e-9){const h=Math.min(dt,t-s),a=keyed(s+h/2,keys,0,dur,easeSine);for(let i=0;i<speeds.length;i++)tau[i]+=speeds[i](a)*h;s+=h;}
 return tau;
}

/* ───────────── Faceted sphere (copied from IllustratedSpace) ───────────── */
/** Light from the top left of the world, slightly toward the viewer (same as the space catalog's SUN_LIGHT). */
const LIGHT=unit([-.86,-.22,.46]);
type Face={p:number[][];n:V3;lon:number;lat:number;i:number};
/** Visible triangles of a unit sphere: lon/lat quads split in two, spun by rot (deg), pitched toward the viewer
 *  so the north cap shows, tilted in the picture plane. Sorted back to front. */
function sphere(step:number,rot:number,pitch=-18,tilt=0,latMin=-90):Face[]{
 const cq=Math.cos(pitch*D),sq=Math.sin(pitch*D),ct=Math.cos(tilt*D),st=Math.sin(tilt*D);
 const at=(lon:number,lat:number):V3=>{const l=(lon+rot)*D,b=lat*D,x=Math.cos(b)*Math.sin(l),y=-Math.sin(b),z=Math.cos(b)*Math.cos(l);
  const y2=y*cq-z*sq,z2=y*sq+z*cq;return [x*ct-y2*st,x*st+y2*ct,z2];};
 const faces:Face[]=[];let i=0;
 for(let lat=-90;lat<90;lat+=step)for(let lon=-180;lon<180;lon+=step){
  if(lat+step<=latMin){i++;continue;}
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
const tone=(m:readonly [string,string],n:V3,jitter:number)=>mix(m[1],m[0],clamp01(.28+.78*dot(n,LIGHT)+jitter));
type LL=[number,number][];
// Rough low-poly continents in (longitude, latitude) degrees: illustrative outlines only (as in the space catalog).
const CONTINENTS:LL[]=[
 [[-165,64],[-140,70],[-95,72],[-75,62],[-60,50],[-80,30],[-97,17],[-106,22],[-124,40],[-130,56]],
 [[-81,9],[-60,9],[-35,-6],[-40,-23],[-58,-38],[-69,-55],[-75,-40],[-72,-15],[-81,-4]],
 [[-10,36],[-9,58],[20,70],[60,72],[100,77],[140,72],[172,66],[160,58],[141,47],[125,35],[121,22],[106,9],[99,20],[80,8],[72,22],[57,25],[48,30],[36,36],[26,40],[12,44],[0,41]],
 [[-17,15],[-10,32],[10,37],[32,31],[43,12],[51,11],[40,-15],[32,-29],[20,-35],[13,-20],[9,4],[-8,5]],
 [[114,-22],[130,-12],[143,-11],[153,-27],[146,-39],[135,-35],[115,-34]],
 [[-56,60],[-44,60],[-20,72],[-30,82],[-60,80],[-70,76]],
 [[95,-5],[120,-3],[141,-6],[130,-9],[105,-8]],
];
function inside(poly:LL,lon:number,lat:number){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)c=!c;}return c;}
const wrap=(lon:number)=>((lon+180)%360+360)%360-180;
type Ground="ocean"|"land"|"ice";
const groundCache=new Map<string,Ground>();
function ground(lon:number,lat:number):Ground{
 const key=`${lon.toFixed(2)}:${lat.toFixed(2)}`,hit=groundCache.get(key);if(hit)return hit;
 const l=wrap(lon);const g:Ground=lat<-70||lat>80?"ice":CONTINENTS.some(p=>inside(p,l,lat))?"land":"ocean";
 groundCache.set(key,g);return g;
}
/** Earth-frame unit vector of (lon, lat), the same convention as sphere(): y points down, so north is up. */
const geo=(lon:number,lat:number):V3=>[Math.cos(lat*D)*Math.sin(lon*D),-Math.sin(lat*D),Math.cos(lat*D)*Math.cos(lon*D)];
/** Rotation (spin about the polar axis), pitch and picture-plane tilt of sphere(), for any Earth-frame vector. */
function viewer(rot:number,pitch:number,tilt:number){
 const cr=Math.cos(rot*D),sr=Math.sin(rot*D),cq=Math.cos(pitch*D),sq=Math.sin(pitch*D),ct=Math.cos(tilt*D),st=Math.sin(tilt*D);
 return (v:V3):V3=>{const x=v[0]*cr+v[2]*sr,z=v[2]*cr-v[0]*sr,y=v[1],y2=y*cq-z*sq,z2=y*sq+z*cq;return [x*ct-y2*st,x*st+y2*ct,z2];};
}
const slerp=(a:V3,b:V3,s:number):V3=>{const w=Math.acos(Math.max(-1,Math.min(1,dot(a,b))));if(w<1e-5)return a;const k0=Math.sin((1-s)*w)/Math.sin(w),k1=Math.sin(s*w)/Math.sin(w);return [a[0]*k0+b[0]*k1,a[1]*k0+b[1]*k1,a[2]*k0+b[2]*k1];};
/** Visible runs of a projected 3D polyline in front of (or outside the silhouette of) a unit sphere. Run ends are
 *  interpolated where the line crosses the limb, so arcs slide behind the planet instead of popping. */
function visibleRuns(p:V3[]){
 const g=(q:V3)=>Math.max(q[2],q[0]*q[0]+q[1]*q[1]-1);
 const runs:number[][][]=[];let cur:number[][]|null=null;
 for(let i=0;i<p.length;i++){const gi=g(p[i]);
  if(gi>0){if(!cur){if(i>0){const gp=g(p[i-1]),k=gp/(gp-gi);cur=[[lerp(p[i-1][0],p[i][0],k),lerp(p[i-1][1],p[i][1],k)]];}else cur=[];runs.push(cur);}cur.push([p[i][0],p[i][1]]);}
  else if(cur){const gp=g(p[i-1]),k=gp/(gp-gi);cur.push([lerp(p[i-1][0],p[i][0],k),lerp(p[i-1][1],p[i][1],k)]);cur=null;}
 }
 return runs.filter(r=>r.length>1);
}
const limbVis=(q:V3)=>clamp01(Math.max(q[2],q[0]*q[0]+q[1]*q[1]-1)*10);

/* ───────────── Network globe ───────────── */
// Cities (lon, lat) and the links drawn as glowing arcs: illustrative, not a map of real routes.
const CITIES:[number,number][]=[[-74,40.7],[-.1,51.5],[8.7,50.1],[139.7,35.7],[103.8,1.3],[72.9,19.1],[-46.6,-23.5],[-118.2,34],[151.2,-33.9],[28,-26.2],[3.4,6.5],[55.3,25.2],[37.6,55.8],[114.2,22.3],[-87.6,41.9],[-99.1,19.4],[31.2,30],[126.9,37.5],[-58.4,-34.6],[-122.4,37.8],[77.2,28.6],[18.4,-33.9],[-79.4,43.7],[-3.7,40.4]];
const LINKS:[number,number][]=[[0,1],[0,6],[1,2],[2,12],[2,11],[11,5],[5,4],[4,3],[3,19],[7,3],[4,8],[13,3],[13,4],[0,7],[14,0],[15,7],[6,10],[10,1],[16,1],[9,10],[11,16],[17,13],[20,11],[18,6],[19,14],[21,9],[22,1],[0,15],[8,7],[12,13],[23,10],[2,16],[20,13],[6,21]];
// Undersea cable routes (lon, lat waypoints), shown in x-ray: illustrative paths, not surveyed routes.
const CABLES:LL[]=[
 [[-74,40.3],[-50,45],[-20,50],[-5.5,50.1]],[[-73.5,39.6],[-40,38],[-9.2,38.7]],[[-71,41.5],[-35,55],[-10,52.2]],
 [[-80,26],[-60,15],[-38.5,-3.7],[-43.2,-22.9],[-46.3,-24]],[[-38.5,-3.7],[-10,-5],[13.2,-8.8]],
 [[5.4,43.3],[15,37],[30,31.6],[32.5,29.9],[38,20],[43.5,12.5],[55,13],[72.8,19],[78,6],[95,5.5],[103.8,1.3]],
 [[-118.2,33.8],[-155,25],[-180,30],[140,35]],[[-122.4,37.8],[-157.8,21.3],[178,-18],[151.2,-33.9]],
 [[103.8,1.3],[110,-10],[115.8,-32]],[[103.8,1.3],[110,10],[114.2,22.3],[125,28],[139.7,35.7]],
 [[-9.2,38.7],[-17,20],[-17.4,14.7],[3.4,6.4],[9,0],[13,-15],[18.4,-33.9]],[[18.4,-33.9],[32,-29.5],[39.7,-4],[55,13]],
];
const GLOBE={r:180,cy:-40,pitch:-16,tilt:-10,spin:5};
const GLOBE_MAT={ocean:["#3A4DC4","#100E38"],land:["#9A8CD6","#2E2557"],ice:["#DDD6F2","#6E68A0"]} as const;
const globeRot=(t:number)=>-20-t*GLOBE.spin;
/** First moment the network starts to fail (the first key above zero): the darkness wave is ranked by the arcs'
 *  screen x at that moment, so it sweeps across the visible face from left to right. */
const waveRef=(o:Keyed)=>{const k=(o.activeKeys??[]).find(k=>k.value>.01);return k?k.at:(o.enterAt??0);};
type Arc={pts:V3[];th:number;k:number;from:number;to:number};
const ARC_CACHE=new Map<number,Arc[]>();
/** Arc geometry in the Earth frame and each arc's wave threshold (0.02..0.4 by its screen x at the reference time). */
function globeArcs(ref:number):Arc[]{
 const key=Math.round(ref*30),hit=ARC_CACHE.get(key);if(hit)return hit;
 const view=viewer(globeRot(ref),GLOBE.pitch,GLOBE.tilt);
 const arcs=LINKS.map(([i,j],k)=>{const A=geo(...CITIES[i]),B=geo(...CITIES[j]),w=Math.acos(Math.max(-1,Math.min(1,dot(A,B)))),H=Math.min(.22,.05+.1*w);
  const p=Array.from({length:29},(_,n)=>{const s=n/28,v=slerp(A,B,s),h=1+H*Math.sin(Math.PI*s);return [v[0]*h,v[1]*h,v[2]*h] as V3;});
  const mid=view(p[14]);return {pts:p,th:.02+.38*clamp01((mid[0]+1.15)/2.3),k,from:i,to:j};});
 if(ARC_CACHE.size>64)ARC_CACHE.clear();ARC_CACHE.set(key,arcs);return arcs;
}
const arcDark=(a:number,th:number)=>smooth(a,th,th+.2);
/** Pure globe state (tested): per-arc darkness and the integrated packet travel (arc lengths per second). */
export function globeState(t:number,a:number,o:Keyed){
 const arcs=globeArcs(waveRef(o)),dur=keySeconds("net-globe");
 const travel=integrateMany(t,o,dur,arcs.map(arc=>(v:number)=>1-arcDark(v,arc.th)));
 return {arcs,dark:arcs.map(arc=>arcDark(a,arc.th)),travel,ghost:1-smooth(a,.6,.95),front:Math.sin(Math.PI*clamp01(a/.62)),frontX:(a-.12)/.38*2.3-1.15};
}
/** The cable network for the x-ray overlay: yellow paths on the ocean floor with data dashes that stop with the net. */
function GlobeCables({t,a,o,r,view}:{t:number;a:number;o:Keyed;r:number;view:(v:V3)=>V3}){
 const flow=integrate(t,o,keySeconds("net-globe"),v=>1-smooth(v,.05,.6)),lit=1-.55*smooth(a,.1,.6);
 return <g strokeLinecap="round" strokeLinejoin="round">{CABLES.map((route,k)=>{
  const p:V3[]=[];for(let s=0;s<route.length-1;s++){const A=geo(...route[s]),B=geo(...route[s+1]);for(let n=0;n<8;n++){const v=slerp(A,B,n/8);p.push(view([v[0]*1.004,v[1]*1.004,v[2]*1.004]));}}
  const last=geo(...route[route.length-1]);p.push(view([last[0]*1.004,last[1]*1.004,last[2]*1.004]));
  return visibleRuns(p).map((run,i)=><g key={`${k}-${i}`}>
   <polyline points={pts(run.map(([x,y])=>[x*r,y*r]))} fill="none" stroke={C.yellow} strokeWidth={7} opacity={.22*lit}/>
   <polyline points={pts(run.map(([x,y])=>[x*r,y*r]))} fill="none" stroke={C.yellowLine} strokeWidth={2.6} opacity={.9*lit}/>
   <polyline points={pts(run.map(([x,y])=>[x*r,y*r]))} fill="none" stroke="#FFFBEA" strokeWidth={3} strokeDasharray="3 22" strokeDashoffset={-flow*60-k*7} opacity={(1-smooth(a,.3,.6))*.95}/>
  </g>);})}</g>;
}
/** A faceted planet laced with glowing network arcs between city hubs; yellow packets run along the arcs.
 *  a: 0 the net is alive → 0..0.6 a darkness wave sweeps the face left to right: arcs fade to grey ghosts, their
 *  packets slow, freeze and melt → 0.6..1 the ghosts vanish too; city lights stay on all the time (power is on).
 *  rows 2 drops the projector stand (free-floating, for the space backdrop). x-ray overlay: undersea cables. */
export function NetGlobe({t,a,o,xray=0,overlay=false,uid="globe",stand=true}:{t:number;a:number;o:Keyed;xray?:number;overlay?:boolean;uid?:string;stand?:boolean}){
 const {r,cy}=GLOBE,rot=globeRot(t),view=viewer(rot,GLOBE.pitch,GLOBE.tilt);
 if(overlay)return <g transform={`translate(0,${cy})`} opacity={xray}><circle r={r} fill="none" stroke={C.ivory} strokeOpacity={.3} strokeWidth={3}/><GlobeCables t={t} a={a} o={o} r={r} view={view}/></g>;
 const faces=sphere(10,rot,GLOBE.pitch,GLOBE.tilt),st=globeState(t,a,o);
 const surface=(f:Face)=>tone(GLOBE_MAT[ground(f.lon,f.lat)],f.n,(hash(f.i)-.5)*.08);
 const cityOn=(f:Face)=>ground(f.lon,f.lat)==="land"&&hash(f.i*3.1)<.36&&f.n[2]>.12;
 const live=1-smooth(a,.55,.8);
 const hubs=CITIES.map((c,i)=>{const q=view(geo(...c)),touching=st.arcs.filter(arc=>arc.from===i||arc.to===i),alive=Math.max(0,...touching.map(arc=>1-st.dark[arc.k]));return {q,i,alive};}).filter(h=>h.q[2]>0);
 return <g>
  <defs>
   <radialGradient id={`gatm-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={r*1.2}><stop offset=".8" stopColor="#8F9BFF" stopOpacity=".5"/><stop offset=".88" stopColor="#8F7CFF" stopOpacity=".2"/><stop offset="1" stopColor="#8F7CFF" stopOpacity="0"/></radialGradient>
   <linearGradient id={`gbeam-${uid}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={C.lavender} stopOpacity=".35"/><stop offset="1" stopColor={C.lavender} stopOpacity="0"/></linearGradient>
   <linearGradient id={`grim-${uid}`} x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stopColor="#D5DAFF" stopOpacity=".9"/><stop offset=".55" stopColor="#D5DAFF" stopOpacity=".05"/><stop offset="1" stopColor="#D5DAFF" stopOpacity="0"/></linearGradient>
  </defs>
  {stand&&<g>
   <Shadow w={300} y={244}/>
   <polygon points={pts([[-40,206],[40,206],[160,cy+40],[-160,cy+40]])} fill={`url(#gbeam-${uid})`} opacity={.5+.2*Math.sin(t*1.7)}/>
   <polygon points={pts([[-120,206],[-84,194],[84,194],[120,206],[84,218],[-84,218]])} fill="#4E4F62"/>
   <polygon points={pts([[-120,206],[-84,218],[-84,238],[-120,226]])} fill="#3A3B4C"/><polygon points={pts([[-84,218],[84,218],[84,238],[-84,238]])} fill="#2E2F42"/><polygon points={pts([[84,218],[120,206],[120,226],[84,238]])} fill="#1D1628"/>
   <ellipse cx={0} cy={206} rx={70} ry={7} fill={C.lavender} opacity={.45+.2*Math.sin(t*1.7)}/>
   <ellipse cx={0} cy={206} rx={44} ry={4} fill="#FFFFFF" opacity={.5}/>
  </g>}
  <g transform={`translate(0,${cy})`}>
   <circle r={r*1.2} fill={`url(#gatm-${uid})`}/>
   <Facets faces={faces} r={r} fill={surface}/>
   <g>{faces.filter(cityOn).map(f=>{const [x,y]=f.p.reduce((m,q)=>[m[0]+q[0]/3,m[1]+q[1]/3],[0,0]),tw=.75+.25*Math.sin(t*2.3+f.i);
    return <g key={f.i} opacity={tw*clamp01(f.n[2]*3)}><circle cx={x*r} cy={y*r} r={6+2*smooth(a,.6,1)} fill={C.yellow} opacity={.2}/><circle cx={x*r} cy={y*r} r={2.3} fill={C.yellowLine}/></g>;})}</g>
   <circle r={r} fill="none" stroke={`url(#grim-${uid})`} strokeWidth={6}/>
   {/* Arcs: grey ghosts where the link went dark, glowing lavender where it lives. */}
   <g strokeLinecap="round" strokeLinejoin="round" fill="none">{st.arcs.map(arc=>{const d=st.dark[arc.k],p=arc.pts.map(view),runs=visibleRuns(p);if(!runs.length)return null;
    const sc=runs.map(run=>pts(run.map(([x,y])=>[x*r,y*r])));
    return <g key={arc.k}>
     {d>.01&&st.ghost>.01&&sc.map((s,i)=><polyline key={`g${i}`} points={s} stroke="#7C7896" strokeWidth={2.4} strokeDasharray="5 9" opacity={.55*d*st.ghost}/>)}
     {d<.99&&sc.map((s,i)=><g key={`l${i}`} opacity={1-d}><polyline points={s} stroke={C.purple} strokeWidth={10} opacity={.28}/><polyline points={s} stroke={C.lavender} strokeWidth={3.2} opacity={.95}/></g>)}
    </g>;})}</g>
   {/* Packets: integrated travel, so a link that goes dark slows them to a stop; then they shrink and fade. */}
   <g>{st.arcs.flatMap(arc=>[0,.5].map(ph=>{const d=st.dark[arc.k],melt=1-smooth(d,.35,.95);if(melt<.01)return null;
    const s=frac(hash(arc.k*7.3)+ph+st.travel[arc.k]*.3),f=s*28,i=Math.min(27,Math.floor(f)),q0=view(arc.pts[i]),q1=view(arc.pts[i+1]),k=f-i,q:V3=[lerp(q0[0],q1[0],k),lerp(q0[1],q1[1],k),lerp(q0[2],q1[2],k)];
    const vis=limbVis(q)*Math.sin(Math.PI*s)**.35;if(vis<.01)return null;
    return <g key={`${arc.k}-${ph}`} opacity={vis*melt}><circle cx={q[0]*r} cy={q[1]*r} r={11*(.5+.5*melt)} fill={C.yellow} opacity={.25}/><circle cx={q[0]*r} cy={q[1]*r} r={4.6*(.55+.45*melt)} fill="#FFF3C0"/></g>;}))}</g>
   {/* Hubs: city light always on; a lavender node ring while its links live. */}
   <g>{hubs.map(h=><g key={h.i} opacity={clamp01(h.q[2]*4)}><circle cx={h.q[0]*r} cy={h.q[1]*r} r={9} fill={C.yellow} opacity={.3}/><circle cx={h.q[0]*r} cy={h.q[1]*r} r={3.6} fill="#FFF3C0"/>
    <circle cx={h.q[0]*r} cy={h.q[1]*r} r={8} fill="none" stroke={C.lavender} strokeWidth={2.4} opacity={h.alive*live}/></g>)}</g>
   {/* The darkness front sweeping across the face. */}
   {st.front>.01&&Math.abs(st.frontX)<.98&&(()=>{const x=st.frontX*r,h=Math.sqrt(1-st.frontX*st.frontX)*r;
    return <g opacity={st.front}><line x1={x} y1={-h} x2={x} y2={h} stroke={C.pink} strokeWidth={16} opacity={.18}/><line x1={x} y1={-h} x2={x} y2={h} stroke={C.pink} strokeWidth={3.5} strokeDasharray="10 8" strokeDashoffset={-t*30} opacity={.9}/></g>;})()}
   <ellipse cx={-r*.42} cy={-r*.4} rx={r*.2} ry={r*.11} transform={`rotate(-35,${-r*.42},${-r*.4})`} fill="#fff" opacity={.09}/>
  </g>
 </g>;
}

/* ───────────── Undersea cable ───────────── */
const CABLE={y:56,r:26,cut:[-322,-268,-222,-180,52],rep:[146,250]};
const FIBERS=[C.lavender,C.yellow,C.green,"#7FA6FF",C.ivory,"#F59A3C"];
const seabed=(x:number)=>88+7*Math.sin(x/80+.6)+4*Math.sin(x/27+1);
/** Pure cable state (tested): integrated pulse travel in px, pulse brightness. */
export function cableState(t:number,a:number,o:Keyed){
 const travel=integrate(t,o,keySeconds("sea-cable"),v=>170*(1-smooth(v,.05,.6)));
 return {travel,glow:1-smooth(a,.3,.95)};
}
function fiberPulses(x0:number,x1:number,travel:number,glow:number,ys:number[],key:string){
 if(glow<.01)return null;
 return <g strokeLinecap="round">{ys.map((y,f)=>{const ph=hash(f*5.1)*130,out=[];
  for(let k=-1;k<Math.ceil((x1-x0)/130)+1;k++){const x=x0+((travel+ph)%130+130)%130+k*130;const l=Math.max(x0,x-30),r=Math.min(x1,x);if(r-l<1)continue;
   out.push(<g key={k}><line x1={l} y1={y} x2={r} y2={y} stroke={FIBERS[f%FIBERS.length]} strokeWidth={8} opacity={.32*glow}/><line x1={l} y1={y} x2={r} y2={y} stroke="#FFFBEA" strokeWidth={2.8} opacity={.95*glow}/></g>);}
  return <g key={`${key}${f}`}>{out}</g>;})}</g>;
}
function Jacket({x0,x1,y,r}:{x0:number;x1:number;y:number;r:number}){
 return <g><rect x={x0} y={y-r} width={x1-x0} height={r*2} fill="#1C1A2A"/><rect x={x0} y={y-r} width={x1-x0} height={r*.75} fill="#2E2F42"/>
  <rect x={x0} y={y-r+5} width={x1-x0} height={4} fill="#666882" opacity={.7}/><rect x={x0} y={y+r*.55} width={x1-x0} height={r*.45} fill="#120C1D" opacity={.6}/></g>;
}
/** A slice of ocean as a glass diorama: a water column darkening with depth (light rays, fish, bubbles), the seabed
 *  in cross-section (sand, silt, rock) and a fibre-optic cable lying on it, with a cut-away (jacket, steel armour,
 *  copper, fibres) and a repeater. a: 0 light pulses run along the fibres and the repeater glows → 1 the pulses
 *  slow, stop and fade (integrated, no jump). x-ray: the whole cable turns transparent, every fibre and the
 *  repeater's amplifier coil show. */
export function SeaCable({t,a,o,xray=0,overlay=false,uid="cable"}:{t:number;a:number;o:Keyed;xray?:number;overlay?:boolean;uid?:string}){
 const {y,r,cut,rep}=CABLE,st=cableState(t,a,o),fy=[-7.5,-4.5,-1.5,1.5,4.5,7.5].map(v=>y+v),W=372,top=-178,rc=(rep[0]+rep[1])/2;
 if(overlay)return <g opacity={xray}>
  <rect x={-W} y={y-r} width={2*W} height={r*2} rx={6} fill="none" stroke={C.lavender} strokeWidth={2} strokeDasharray="8 8" opacity={.6}/>
  {fy.map((fy1,f)=><g key={f}><line x1={-W} y1={fy1} x2={rep[0]+8} y2={fy1} stroke={FIBERS[f]} strokeWidth={1.8} opacity={.6}/><line x1={rep[1]-8} y1={fy1} x2={W} y2={fy1} stroke={FIBERS[f]} strokeWidth={1.8} opacity={.6}/></g>)}
  <g transform={`translate(${rc},${y})`}>{Array.from({length:6},(_,k)=><ellipse key={k} cx={-30+k*12} cy={0} rx={10} ry={22} fill="none" stroke={C.yellowLine} strokeWidth={2.2} opacity={.8}/>)}
   <circle cx={36} cy={0} r={9} fill={C.pink} opacity={.3+.5*st.glow}/><circle cx={36} cy={0} r={4} fill="#FFE0E8" opacity={st.glow}/></g>
  {fiberPulses(-W,rep[0],st.travel,st.glow,fy,"xa")}{fiberPulses(rep[1],W,st.travel,st.glow,fy,"xb")}
 </g>;
 const wave=(ph:number,amp:number,y0:number)=>Array.from({length:25},(_,i)=>{const x=-W+i*31;return [x,y0+Math.sin(x/46+t*1.4+ph)*amp];});
 const prof=(dy:number)=>Array.from({length:32},(_,i)=>{const x=-W-4+i*(2*W+8)/31;return [x,seabed(x)+dy];});
 const rays=[-270,-120,30,190].map((x,i)=>({x,w:44+18*hash(i),o:.55+.45*Math.sin(t*1.1+i*1.7)}));
 const fish=Array.from({length:7},(_,i)=>{const lane=-120+(i%3)*30+hash(i*3)*14,x=-440+frac(t*.045+hash(i*7)*.6+(i<4?0:.5))*880;return {x,y:lane+Math.sin(t*1.6+i)*5,s:.8+.4*hash(i),i};});
 const bubbles=Array.from({length:14},(_,i)=>{const src=[-120,96,300][i%3],u=frac(t*(.16+.06*hash(i))+hash(i*9));return {x:src+Math.sin(u*9+i)*7+hash(i*2)*14,y:70-u*(70-top-12),r:2+3*hash(i*4)*(.4+.6*u),o:Math.sin(Math.PI*u)*.6,i};});
 const weeds=[[-350,1],[-250,0],[-110,1],[90,0],[290,1],[330,0],[-356,2],[346,2]].map(([x,f],i)=>({x,f,h:46+40*hash(i*6),i}));
 const weed=(w:{x:number;h:number;i:number})=>{const sw=Math.sin(t*1.2+w.i)*12,b=seabed(w.x)-(w.i>5?0:14);
  return <g key={w.i}><path d={`M ${w.x} ${b} Q ${w.x+sw*.5} ${b-w.h*.5} ${w.x+sw} ${b-w.h}`} stroke={w.i%2?"#2F8A5A":"#3FA36A"} strokeWidth={7} fill="none" strokeLinecap="round"/>
   <path d={`M ${w.x+4} ${b} Q ${w.x+4+sw*.4} ${b-w.h*.35} ${w.x+8+sw*.8} ${b-w.h*.7}`} stroke="#2A7A50" strokeWidth={5} fill="none" strokeLinecap="round"/></g>;};
 const rock=(x:number,s:number,k:number)=>{const b=seabed(x)+6;return <g key={`r${k}`}><polygon points={pts([[x-22*s,b],[x-14*s,b-18*s],[x+2*s,b-26*s],[x+20*s,b-12*s],[x+24*s,b]])} fill="#6E6B84"/><polygon points={pts([[x+2*s,b-26*s],[x+20*s,b-12*s],[x+24*s,b],[x+4*s,b]])} fill="#4E4F62"/></g>;};
 return <g>
  <defs>
   <clipPath id={`tank-${uid}`}><rect x={-W} y={-196} width={2*W} height={372} rx={16}/></clipPath>
   <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3550B4"/><stop offset=".4" stopColor="#1A1F64"/><stop offset="1" stopColor="#090820"/></linearGradient>
   <linearGradient id={`ray-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CFE0FF" stopOpacity=".2"/><stop offset="1" stopColor="#CFE0FF" stopOpacity="0"/></linearGradient>
  </defs>
  <ellipse cx={0} cy={198} rx={360} ry={9} fill="#000" opacity={.45}/>
  <g clipPath={`url(#tank-${uid})`}>
   <polygon points={pts([...wave(0,5,top),[W,180],[-W,180]])} fill={`url(#water-${uid})`}/>
   {rays.map((p,i)=><polygon key={i} points={pts([[p.x,top],[p.x+p.w,top],[p.x+p.w*.4+70,60],[p.x-30,60]])} fill={`url(#ray-${uid})`} opacity={p.o}/>)}
   <polygon points={pts([[-W,40],[-260,18],[-170,30],[-60,8],[60,26],[170,4],[280,22],[W,12],[W,180],[-W,180]])} fill="#141048" opacity={.85}/>
   {fish.map(f=><g key={f.i} transform={`translate(${f.x},${f.y}) scale(${f.s})`} opacity={.85}><polygon points={pts([[14,0],[0,-8],[-14,0],[0,8]])} fill={f.i%2?C.lavender:"#9CC4FF"}/><polygon points={pts([[14,0],[0,-8],[0,0]])} fill="#fff" opacity={.3}/><polygon points={pts([[-12,0],[-22,-7],[-22,7]])} fill={f.i%2?"#B7A3D6":"#6F8FE0"}/></g>)}
   {bubbles.map(b=><circle key={b.i} cx={b.x} cy={b.y} r={b.r} fill="none" stroke="#DCE6FF" strokeWidth={1.5} opacity={b.o}/>)}
   <polygon points={pts([...prof(-16),[W+4,180],[-W-4,180]])} fill="#2E2658"/>
   {weeds.filter(w=>w.f===0||w.f===1).map(weed)}
   {/* Cable: jacket, stepped cut-away (steel armour, copper sheath, fibre tube), repeater. */}
   <Jacket x0={-W-6} x1={cut[0]} y={y} r={r}/>
   <ellipse cx={cut[0]} cy={y} rx={8} ry={r} fill="#3A3B4C"/><ellipse cx={cut[0]} cy={y} rx={6} ry={r*.82} fill="#26273A"/>
   <rect x={cut[0]} y={y-r*.82} width={cut[1]-cut[0]} height={r*1.64} fill="#A6A3B8"/>
   {Array.from({length:Math.floor((cut[1]-cut[0])/8)+1},(_,k)=><line key={k} x1={cut[0]+k*8-4} y1={y+r*.82} x2={cut[0]+k*8+8} y2={y-r*.82} stroke="#5E5B74" strokeWidth={2.6}/>)}
   <rect x={cut[0]} y={y-r*.82} width={cut[1]-cut[0]} height={6} fill="#fff" opacity={.25}/>
   <ellipse cx={cut[1]} cy={y} rx={6} ry={r*.82} fill="#7C7896"/>
   <rect x={cut[1]} y={y-r*.6} width={cut[2]-cut[1]} height={r*1.2} fill="#C98A4A"/><rect x={cut[1]} y={y-r*.6} width={cut[2]-cut[1]} height={6} fill="#F2B87A" opacity={.85}/><rect x={cut[1]} y={y+r*.32} width={cut[2]-cut[1]} height={r*.28} fill="#8A5A2E" opacity={.7}/>
   <ellipse cx={cut[2]} cy={y} rx={5} ry={r*.6} fill="#8A5A2E"/>
   <rect x={cut[2]} y={y-r*.42} width={cut[4]-cut[2]} height={r*.84} rx={5} fill="#120C1D" stroke="#4E4F62" strokeWidth={1.5}/>
   {fy.map((fy1,f)=><line key={f} x1={cut[2]} y1={fy1} x2={cut[4]} y2={fy1} stroke={FIBERS[f]} strokeWidth={2} opacity={.4+.35*st.glow}/>)}
   {fiberPulses(cut[2],cut[4],st.travel,st.glow,fy,"c")}
   <Jacket x0={cut[4]} x1={rep[0]} y={y} r={r}/>
   <ellipse cx={cut[4]} cy={y} rx={8} ry={r} fill="#2E2F42" stroke="#666882" strokeWidth={2}/><ellipse cx={cut[4]} cy={y} rx={4} ry={r*.42} fill="#120C1D"/>
   <Jacket x0={rep[1]} x1={W+6} y={y} r={r}/>
   <polygon points={pts([[rep[0],y-r],[rep[0]+26,y-44],[rep[1]-26,y-44],[rep[1],y-r],[rep[1],y+r],[rep[1]-26,y+44],[rep[0]+26,y+44],[rep[0],y+r]])} fill="#3A3B4C"/>
   <polygon points={pts([[rep[0],y-r],[rep[0]+26,y-44],[rep[1]-26,y-44],[rep[1],y-r],[rep[1],y-4],[rep[0],y-4]])} fill="#666882"/>
   <polygon points={pts([[rep[0]+26,y-44],[rep[1]-26,y-44],[rep[1]-34,y-36],[rep[0]+34,y-36]])} fill="#9A97AC"/>
   <rect x={rc-16} y={y-44} width={32} height={88} fill={C.purple}/><rect x={rc-16} y={y-44} width={10} height={88} fill="#B08AEA"/>
   <circle cx={rc} cy={y} r={24} fill={C.yellow} opacity={.2*st.glow*(.6+.4*Math.sin(st.travel*.05))}/>
   <circle cx={rc} cy={y} r={7} fill={mix("#3A3B4C",C.yellowLine,st.glow)}/>
   {/* Seabed in cross-section: sand, silt, rock, pebbles, then rocks and weeds in front. */}
   <polygon points={pts([...prof(0),[W+4,180],[-W-4,180]])} fill="#8C7CB0"/>
   <polygon points={pts([...prof(10),[W+4,180],[-W-4,180]])} fill="#6E5F96"/>
   <polygon points={pts([...prof(34).map(([x,v])=>[x,v+5*Math.sin(x/40)]),[W+4,180],[-W-4,180]])} fill="#4A3F72"/>
   <polygon points={pts([...prof(62).map(([x,v])=>[x,v+6*Math.sin(x/33+2)]),[W+4,180],[-W-4,180]])} fill="#2E2654"/>
   {Array.from({length:16},(_,i)=>{const x=-W+20+i*47+hash(i*3)*20,yy=seabed(x)+44+hash(i*7)*50,s=4+hash(i*5)*5;return <polygon key={i} points={pts([[x-s,yy],[x,yy-s*.8],[x+s,yy],[x,yy+s*.6]])} fill="#9C8CC0" opacity={.45}/>;})}
   {[[-200,1],[-40,.7],[330,1.1]].map(([x,s],k)=>rock(x,s,k))}
   {weeds.filter(w=>w.f===2).map(weed)}
   <polyline points={pts(wave(0,5,top))} fill="none" stroke="#DCE6FF" strokeWidth={4} opacity={.7}/>
   <polyline points={pts(wave(1.3,3,top+12))} fill="none" stroke="#DCE6FF" strokeWidth={2} opacity={.25}/>
  </g>
  <rect x={-W} y={-196} width={2*W} height={372} rx={16} fill="none" stroke={C.lavender} strokeOpacity={.35} strokeWidth={4}/>
  <polygon points={pts([[-W+30,-190],[-W+70,-190],[-W+10,40],[-W+4,10]])} fill="#fff" opacity={.06}/>
  <polygon points={pts([[-W-6,184],[W+6,184],[W-6,196],[-W+6,196]])} fill="#26273A"/><rect x={-W-6} y={174} width={2*W+12} height={12} rx={4} fill="#3A3B4C"/>
 </g>;
}

/* ───────────── Smartphone ───────────── */
const PH={x:103,top:-227,bot:185};
/** Chat scroll (tested): messages per second integrated; once stopped, a scroll step in progress completes first. */
export function chatScroll(t:number,o:Keyed){
 const tau=integrate(t,o,keySeconds("smartphone"),(a,tau)=>{const stop=smooth(a,.02,.3),u=frac(tau);return .42*lerp(1,smooth(u,.6,.68),stop);});
 const n=Math.floor(tau),u=frac(tau);return {tau,shown:n+inOut((u-.68)/.32)};
}
function StatusBar({lost,grey}:{lost:number;grey:number}){
 const ink=mix(C.ivory,"#6E6B80",grey*.7);
 return <g>
  <rect x={-86} y={-202} width={30} height={8} rx={4} fill={ink} opacity={.85}/>
  {[0,1,2,3].map(i=><rect key={i} x={34+i*7} y={-190-(4+i*3.2)} width={5} height={4+i*3.2} rx={1} fill={mix(ink,"#5A5670",lost)}/>)}
  <g opacity={1-.6*lost}>{[4,8,12].map(r=><path key={r} d={`M ${74-r*.707} ${-190-r*.707} A ${r} ${r} 0 0 1 ${74+r*.707} ${-190-r*.707}`} fill="none" stroke={mix(ink,"#5A5670",lost)} strokeWidth={2.4} strokeLinecap="round"/>)}<circle cx={74} cy={-190} r={1.8} fill={mix(ink,"#5A5670",lost)}/></g>
  <rect x={86} y={-204} width={14} height={9} rx={2.5} fill="none" stroke={ink} strokeWidth={1.8}/><rect x={88} y={-202} width={8} height={5} rx={1} fill={ink}/>
  <g opacity={lost}><line x1={30} y1={-186} x2={84} y2={-206} stroke={C.pink} strokeWidth={4} strokeLinecap="round"/></g>
 </g>;
}
function Spinner({x,y,r,t,o,color=C.lavender}:{x:number;y:number;r:number;t:number;o:number;color?:string}){
 if(o<.01)return null;
 return <g opacity={o} transform={`translate(${x},${y})`}><circle r={r} fill="none" stroke={color} strokeOpacity={.2} strokeWidth={r*.24}/>
  <circle r={r} fill="none" stroke={color} strokeWidth={r*.24} strokeLinecap="round" strokeDasharray={`${r*2.2} ${r*6.3}`} transform={`rotate(${t*300})`}/></g>;
}
function ChatScreen({t,a,o}:{t:number;a:number;o:Keyed}){
 const {shown}=chatScroll(t,o),pend=smooth(a,.18,.45),g=smooth(a,.55,.9),pitch=50,yb=96;
 const grey=(c:string)=>mix(c,"#4A4858",g*.8);
 const bubble=(j:number,y:number,op:number,sc:number,pending=false)=>{const out=pending||[1,0,0,1,1,0,1,0][((j%8)+8)%8]===1,w=pending?118:74+70*hash(j*1.3),x=out?92-w:-92,two=!pending&&hash(j*4.7)>.55;
  const fill=pending?mix(C.purple,"#5A5670",.45):out?C.purple:"#2C2840",ink=out?C.ivory:C.lavender;
  return <g key={pending?"pend":j} opacity={op} transform={`translate(${x+w/2},${y}) scale(${sc}) translate(${-x-w/2},${-y})`}>
   <rect x={x} y={y-19} width={w} height={38} rx={16} fill={grey(fill)}/>
   <rect x={x+14} y={two?y-9:y-3.5} width={w-30} height={7} rx={3.5} fill={grey(ink)} opacity={.75}/>
   {two&&<rect x={x+14} y={y+3} width={(w-30)*.6} height={6} rx={3} fill={grey(ink)} opacity={.55}/>}
   {out&&!pending&&<path d={`M ${x+w-24} ${y+10} l 4 4 l 8 -8`} stroke={grey(C.green)} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={.9}/>}
   {pending&&<g transform={`translate(${x-16},${y})`}><circle r={10} fill="none" stroke={grey(C.lavender)} strokeWidth={2.4}/><line x1={0} y1={0} x2={0} y2={-6} stroke={grey(C.lavender)} strokeWidth={2.4} strokeLinecap="round" transform={`rotate(${t*40})`}/><line x1={0} y1={0} x2={4} y2={0} stroke={grey(C.lavender)} strokeWidth={2.4} strokeLinecap="round"/></g>}
  </g>;};
 const list=[];const n=Math.floor(shown);
 for(let j=n+1;j>=n-6;j--){const d=shown-j,y=yb-Math.max(0,d)*pitch-pend*pitch;if(d<=-1)continue;
  const e=d<0?d+1:1;list.push(bubble(j,y+(1-e)*36,e*clamp01((y+140)/30),.85+.15*e));}
 return <g>
  <rect x={-103} y={-184} width={206} height={46} fill={grey("#16112A")}/>
  <path d="M -86 -168 l -7 7 l 7 7" stroke={grey(C.lavender)} strokeWidth={3} fill="none" strokeLinecap="round"/>
  <circle cx={-60} cy={-161} r={14} fill={grey(C.purple)}/><circle cx={-64} cy={-165} r={5} fill={grey(C.lavender)} opacity={.6}/>
  <rect x={-38} y={-170} width={64} height={9} rx={4.5} fill={grey(C.lavender)}/><rect x={-38} y={-156} width={40} height={6} rx={3} fill="#6E6B80"/>
  <g>{list}</g>
  {pend>.01&&bubble(0,yb+(1-pend)*36,pend,.85+.15*pend,true)}
  <rect x={-103} y={124} width={206} height={56} fill={grey("#16112A")}/>
  <rect x={-92} y={134} width={140} height={32} rx={16} fill="#241E36"/><rect x={-78} y={147} width={60} height={6} rx={3} fill="#5A5670"/>
  <circle cx={74} cy={150} r={18} fill={grey(C.purple)}/><path d="M 66 150 L 82 150 M 75 143 L 82 150 L 75 157" stroke={C.ivory} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  <rect x={-103} y={-184} width={206} height={370} fill="#0B0814" opacity={.45*g}/>
  <Spinner x={0} y={-20} r={28} t={t} o={g}/>
 </g>;
}
const MAP_TILES=Array.from({length:24},(_,i)=>({c:i%4,r:Math.floor(i/4),th:.04+.26*hash(i*7.7+3.1)}));
function MapScreen({t,a}:{t:number;a:number}){
 const route=1-smooth(a,.18,.45),fade=smooth(a,.62,.95),compass=smooth(a,.55,.9),tw=206/4,th=(PH.bot-(-184))/6;
 const blocks=Array.from({length:40},(_,i)=>({x:-200+(i%8)*58+hash(i)*10,y:-260+Math.floor(i/8)*96+hash(i*3)*12,w:30+hash(i*5)*14,h:34+hash(i*7)*22,i}));
 return <g>
  <g transform="rotate(-14)">
   <rect x={-240} y={-300} width={480} height={600} fill="#221C36"/>
   {blocks.map(b=><rect key={b.i} x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={hash(b.i*9)<.15?"#2E6B3E":"#2C2546"}/>)}
   {Array.from({length:9},(_,i)=><line key={`v${i}`} x1={-216+i*58} y1={-300} x2={-216+i*58} y2={300} stroke="#3D3656" strokeWidth={8}/>)}
   {Array.from({length:7},(_,i)=><line key={`h${i}`} x1={-240} y1={-268+i*96} x2={240} y2={-268+i*96} stroke="#3D3656" strokeWidth={8}/>)}
   <path d="M -240 120 C -120 60 -40 160 60 90 S 200 40 240 70" stroke="#2F4FB8" strokeWidth={26} fill="none"/>
   <path d="M -240 120 C -120 60 -40 160 60 90 S 200 40 240 70" stroke="#4C6AD8" strokeWidth={6} fill="none" opacity={.5}/>
   <line x1={-100} y1={-300} x2={-100} y2={300} stroke="#6B5E92" strokeWidth={13}/>
   <line x1={-240} y1={-76} x2={240} y2={-76} stroke="#6B5E92" strokeWidth={13}/>
  </g>
  <g opacity={route}>
   <polyline points={pts([[0,60],[0,14],[38,-4],[38,-80],[52,-118]])} fill="none" stroke="#120C1D" strokeWidth={13} strokeLinejoin="round" strokeLinecap="round"/>
   <polyline points={pts([[0,60],[0,14],[38,-4],[38,-80],[52,-118]])} fill="none" stroke={C.yellow} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round"/>
   <polyline points={pts([[0,60],[0,14],[38,-4],[38,-80],[52,-118]])} fill="none" stroke="#FFF3C0" strokeWidth={3} strokeDasharray="4 14" strokeDashoffset={-t*30} strokeLinecap="round"/>
   <g transform="translate(52,-118)"><path d="M 0 0 C -12 -14 -12 -30 0 -30 C 12 -30 12 -14 0 0 Z" fill={C.pink}/><circle cx={0} cy={-20} r={4.5} fill={C.ivory}/></g>
  </g>
  {/* Missing tiles: grey placeholders replace the map tile by tile, then fade to an empty screen. */}
  {MAP_TILES.map((m,i)=>{const gone=smooth(a,m.th,m.th+.16)*(1-fade);if(gone<.01)return null;const x=-103+m.c*tw,y=-184+m.r*th;
   return <g key={i} opacity={gone}><rect x={x} y={y} width={tw} height={th} fill="#34323F"/><rect x={x+1.5} y={y+1.5} width={tw-3} height={th-3} fill="none" stroke="#46444F" strokeWidth={2}/>
    {[1,2].map(k=><line key={k} x1={x+k*tw/3} y1={y} x2={x+k*tw/3} y2={y+th} stroke="#3E3C4A" strokeWidth={1.5}/>)}{[1,2].map(k=><line key={`h${k}`} x1={x} y1={y+k*th/3} x2={x+tw} y2={y+k*th/3} stroke="#3E3C4A" strokeWidth={1.5}/>)}</g>;})}
  <rect x={-103} y={-184} width={206} height={370} fill="#0B0814" opacity={fade}/>
  {/* GPS still works: the location dot keeps pulsing on every state. */}
  <g transform="translate(0,60)">
   <path d="M 0 0 L -22 -54 A 58 58 0 0 1 22 -54 Z" fill="#5B8CFF" opacity={.22}/>
   {[0,.5].map(k=>{const p=frac(t*.7+k);return <circle key={k} r={12+40*p} fill="none" stroke="#7FA6FF" strokeWidth={3} opacity={.7*(1-p)}/>;})}
   <circle r={26} fill="#5B8CFF" opacity={.18}/><circle r={12} fill="#4F7BFF" stroke={C.ivory} strokeWidth={3.5}/>
  </g>
  <g opacity={compass} transform="translate(66,-150)"><circle r={21} fill="#1E1830" stroke={C.lavender} strokeWidth={2.5}/>
   <g transform={`rotate(${8*Math.sin(t*1.3)})`}><polygon points={pts([[0,-16],[5,0],[-5,0]])} fill={C.pink}/><polygon points={pts([[0,16],[5,0],[-5,0]])} fill={C.ivory}/></g><circle r={2.5} fill="#120C1D"/></g>
 </g>;
}
function BankScreen({t,a,uid}:{t:number;a:number;uid:string}){
 const load=smooth(a,.15,.45)*(1-smooth(a,.62,.85)),err=smooth(a,.6,.9),dim=smooth(a,.15,.45),grey=(c:string)=>mix(c,"#4A4858",dim*.65);
 const sheen=-180+frac(t/3.6)*480;
 return <g>
  <rect x={-103} y={-184} width={206} height={40} fill="#16112A"/><circle cx={-80} cy={-164} r={11} fill={grey(C.purple)}/><rect x={-62} y={-168} width={56} height={8} rx={4} fill={grey(C.lavender)}/>
  <clipPath id={`bank-${uid}`}><rect x={-88} y={-136} width={176} height={100} rx={14}/></clipPath>
  <g clipPath={`url(#bank-${uid})`}>
   <rect x={-88} y={-136} width={176} height={100} fill={grey("#5B3A94")}/><polygon points={pts([[-88,-136],[60,-136],[-20,-36],[-88,-36]])} fill={grey(C.purple)}/>
   <polygon points={pts([[sheen,-136],[sheen+30,-136],[sheen-50,-36],[sheen-80,-36]])} fill="#fff" opacity={.18*(1-dim)}/>
  </g>
  <rect x={-72} y={-118} width={28} height={21} rx={4} fill={grey(C.yellow)}/><path d="M -72 -108 h 28 M -58 -118 v 21" stroke={grey("#B8862A")} strokeWidth={1.5}/>
  {[0,1,2].map(i=><path key={i} d={`M ${56+i*7} -116 a ${6+i*5} ${6+i*5} 0 0 1 0 ${12+i*10}`} transform={`translate(0,${-i*5})`} fill="none" stroke={grey(C.ivory)} strokeWidth={2.4} opacity={.8}/>)}
  {[0,1,2,3].map(g=><g key={g}>{[0,1,2,3].map(k=><circle key={k} cx={-70+g*40+k*7} cy={-62} r={2.3} fill={grey(C.ivory)} opacity={.8}/>)}</g>)}
  <rect x={-88} y={-24} width={56} height={6} rx={3} fill="#6E6B80"/><rect x={-88} y={-12} width={110} height={16} rx={5} fill={grey(C.ivory)}/>
  {[0,1,2,3].map(i=>{const y=24+i*30,c=[C.green,C.yellow,C.lavender,"#7FA6FF"][i];return <g key={i}><circle cx={-76} cy={y} r={11} fill={grey(c)} opacity={.85}/><rect x={-58} y={y-7} width={70+hash(i)*30} height={6} rx={3} fill={grey(C.lavender)} opacity={.75}/><rect x={-58} y={y+3} width={40} height={5} rx={2.5} fill="#5A5670"/><rect x={56} y={y-4} width={32} height={8} rx={4} fill={grey(C.ivory)} opacity={.7}/></g>;})}
  <rect x={-88} y={140} width={176} height={34} rx={17} fill={mix(grey(C.green),C.pink,err)}/><rect x={-26} y={154} width={52} height={7} rx={3.5} fill={C.ivory} opacity={.85}/>
  <rect x={-103} y={-184} width={206} height={370} fill="#0B0814" opacity={.5*dim}/>
  <Spinner x={0} y={-20} r={28} t={t} o={load}/>
  {err>.01&&<g opacity={err} transform={`translate(0,-20) scale(${.85+.15*err})`}><circle r={40} fill={C.pink} opacity={.25}/><circle r={30} fill={C.pink}/><rect x={-3.5} y={-17} width={7} height={22} rx={3.5} fill={C.ivory}/><circle cx={0} cy={13} r={4.2} fill={C.ivory}/></g>}
 </g>;
}
/** A smartphone on a small stand. rows 1 messages: bubbles keep sending → 0.5 the scroll stops, the newest bubble
 *  hangs with a clock and the signal icon is crossed out → 1 the screen greys out with a waiting ring. rows 2 map:
 *  map tiles and a route → 0.5 tiles turn into an empty grey grid while the blue location dot keeps pulsing (GPS
 *  works) → 1 only the dot and a compass. rows 3 bank/payment app: account card → 0.5 waiting ring → 1 pink error. */
export function Smartphone({t,a,o,rows=1,uid="phone"}:{t:number;a:number;o:Keyed;rows?:number;uid?:string}){
 const lost=smooth(a,.15,.45),greyBar=rows===1?smooth(a,.55,.9):0;
 return <g>
  <Shadow w={230} y={240}/>
  <polygon points={pts([[-92,204],[92,204],[104,236],[-104,236]])} fill="#2E2F42"/><polygon points={pts([[-92,204],[0,204],[0,236],[-104,236]])} fill="#3A3B4C"/>
  <clipPath id={`ph-${uid}`}><rect x={-114} y={-238} width={228} height={434} rx={34}/></clipPath>
  <g clipPath={`url(#ph-${uid})`}><rect x={-114} y={-238} width={228} height={434} fill="#2E2F42"/><polygon points={pts([[-114,-238],[40,-238],[-114,120]])} fill="#4E4F62"/></g>
  <rect x={-114} y={-238} width={228} height={434} rx={34} fill="none" stroke={C.lavender} strokeOpacity={.35} strokeWidth={3}/>
  <rect x={114} y={-130} width={4} height={50} rx={2} fill="#4E4F62"/><rect x={-118} y={-160} width={4} height={30} rx={2} fill="#4E4F62"/><rect x={-118} y={-120} width={4} height={30} rx={2} fill="#4E4F62"/>
  <clipPath id={`scr-${uid}`}><rect x={-PH.x} y={PH.top} width={2*PH.x} height={PH.bot-PH.top} rx={26}/></clipPath>
  <g clipPath={`url(#scr-${uid})`}>
   <rect x={-PH.x} y={PH.top} width={2*PH.x} height={PH.bot-PH.top} fill="#0B0814"/>
   {rows===2?<MapScreen t={t} a={a}/>:rows>=3?<BankScreen t={t} a={a} uid={uid}/>:<ChatScreen t={t} a={a} o={o}/>}
   <rect x={-PH.x} y={PH.top} width={2*PH.x} height={44} fill="#0B0814" opacity={.92}/>
   <StatusBar lost={lost} grey={greyBar}/>
   <rect x={-28} y={-219} width={56} height={17} rx={8.5} fill="#000"/>
   <polygon points={pts([[-PH.x,PH.top],[-20,PH.top],[-PH.x,40]])} fill="#fff" opacity={.05}/>
  </g>
  <polygon points={pts([[-100,186],[100,186],[106,206],[-106,206]])} fill="#4E4F62"/><rect x={-106} y={204} width={212} height={5} fill="#26273A"/>
 </g>;
}

/* ───────────── Card terminal and cash register ───────────── */
/** Pure terminal state (tested). rows 1: 0 idle → 0.33 card tapped, processing → 0.66 green check → 1 pink cross
 *  and a no-network icon. rows 3 (outage only): 0 idle → 0.5 processing that never ends → 1 pink cross. */
export function terminalState(a:number,rows:number){
 if(rows>=3){const tap=smooth(a,.04,.34);return {tap,idle:1-smooth(a,.06,.3),proc:smooth(a,.2,.42)*(1-smooth(a,.7,.92)),ok:0,fail:smooth(a,.7,.98)};}
 return {tap:smooth(a,.04,.3),idle:1-smooth(a,.05,.26),proc:smooth(a,.18,.33)*(1-smooth(a,.45,.6)),ok:smooth(a,.48,.65)*(1-smooth(a,.74,.9)),fail:smooth(a,.78,.98)};
}
function Card({x,y,rot,s=1}:{x:number;y:number;rot:number;s?:number}){
 return <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
  <rect x={-56} y={-35} width={112} height={70} rx={9} fill="#5B3A94"/><polygon points={pts([[-56,-26],[-47,-35],[30,-35],[-20,35],[-47,35],[-56,26]])} fill={C.purple}/>
  <rect x={-56} y={-35} width={112} height={70} rx={9} fill="none" stroke={C.lavender} strokeOpacity={.5} strokeWidth={2}/>
  <rect x={-42} y={-16} width={22} height={17} rx={3} fill={C.yellow}/><path d="M -42 -8 h 22 M -31 -16 v 17" stroke="#B8862A" strokeWidth={1.4}/>
  {[0,1,2].map(i=><path key={i} d={`M ${26+i*6} -12 a ${5+i*5} ${5+i*5} 0 0 1 0 ${10+i*10}`} transform={`translate(0,${-i*5})`} fill="none" stroke={C.ivory} strokeWidth={2.2} opacity={.85}/>)}
  {[0,1,2,3].map(g=><rect key={g} x={-42+g*22} y={14} width={16} height={5} rx={2.5} fill={C.ivory} opacity={.75}/>)}
 </g>;
}
function NoNet({x,y,s=1,color=C.pink}:{x:number;y:number;s?:number;color?:string}){
 return <g transform={`translate(${x},${y}) scale(${s})`}>{[0,1,2,3].map(i=><rect key={i} x={-13+i*7} y={6-(4+i*3.5)} width={5} height={4+i*3.5} rx={1} fill={color} opacity={.55}/>)}
  <line x1={-16} y1={8} x2={16} y2={-14} stroke={color} strokeWidth={3.5} strokeLinecap="round"/></g>;
}
function PaymentTerminal({t,a,rows,uid}:{t:number;a:number;rows:number;uid:string}){
 const s=terminalState(a,rows),k=inOut(s.tap),lift=Math.sin(Math.PI*k)*-34;
 const cx=lerp(88,34,k),cy=lerp(124,-150,k)+lift,rot=lerp(10,-8,k);
 const led=(i:number)=>mix(mix(mix("#3A3B4C",C.lavender,s.proc*(.5+.5*Math.sin(t*8-i*1.4))),C.green,s.ok),C.pink,s.fail);
 return <g>
  <Shadow w={290} y={190}/>
  <polygon points={pts([[-120,150],[120,150],[132,184],[-132,184]])} fill="#2E2F42"/><polygon points={pts([[-120,150],[0,150],[0,184],[-132,184]])} fill="#3A3B4C"/>
  <polygon points={pts([[84,-140],[100,-152],[114,150],[98,158]])} fill="#1D1628"/>
  <polygon points={pts([[-84,-140],[84,-140],[100,-152],[-68,-152]])} fill="#666882"/>
  <Two poly={[[-84,-140],[84,-140],[98,158],[-98,158]]} light="#4E4F62" dark="#3A3B4C" split={-8}/>
  <rect x={-70} y={-122} width={140} height={112} rx={12} fill="#26273A"/>
  <clipPath id={`tscr-${uid}`}><rect x={-62} y={-114} width={124} height={96} rx={8}/></clipPath>
  <g clipPath={`url(#tscr-${uid})`}>
   <rect x={-62} y={-114} width={124} height={96} fill="#0B0814"/>
   <g opacity={s.idle}>{[0,1,2,3].map(i=><path key={i} d={`M ${-6+i*8} -80 a ${6+i*7} ${6+i*7} 0 0 1 0 ${12+i*14}`} transform={`translate(0,${-i*7})`} fill="none" stroke={C.lavender} strokeWidth={3} opacity={.35+.65*clamp01(Math.sin(t*2.4-i*.7))}/>)}
    <rect x={-30} y={-38} width={60} height={9} rx={4.5} fill={C.ivory} opacity={.6}/></g>
   <g opacity={s.proc}>{[0,1,2].map(i=><circle key={i} cx={-20+i*20} cy={-62-9*Math.max(0,Math.sin(t*6-i*.8))} r={6.5} fill={C.lavender}/>)}<rect x={-30} y={-38} width={60} height={9} rx={4.5} fill={C.ivory} opacity={.35}/></g>
   {s.ok>.01&&<g opacity={s.ok}><circle cx={0} cy={-66} r={34} fill={C.green} opacity={.2}/><circle cx={0} cy={-66} r={26} fill={C.green}/>
    <path d="M -12 -66 l 8 9 l 16 -18" stroke={C.ivory} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="44" strokeDashoffset={44*(1-smooth(s.ok,.2,1))}/></g>}
   {s.fail>.01&&<g opacity={s.fail}><circle cx={0} cy={-72} r={30} fill={C.pink} opacity={.22}/><circle cx={0} cy={-72} r={22} fill={C.pink}/>
    <path d="M -9 -81 L 9 -63 M 9 -81 L -9 -63" stroke={C.ivory} strokeWidth={5.5} strokeLinecap="round"/><NoNet x={0} y={-32} s={.8}/></g>}
   <polygon points={pts([[-62,-114],[-20,-114],[-62,-40]])} fill="#fff" opacity={.06}/>
  </g>
  {[0,1,2,3].map(i=><circle key={i} cx={-27+i*18} cy={-131} r={4.2} fill={led(i)}/>)}
  {Array.from({length:12},(_,i)=>{const c=i%3,r=Math.floor(i/3),x=-50+c*50,y=10+r*26;return <g key={i}><rect x={x-19} y={y} width={38} height={19} rx={6} fill="#26273A"/><rect x={x-19} y={y} width={38} height={6} rx={3} fill="#4E4F62" opacity={.6}/></g>;})}
  {[C.pink,C.yellow,C.green].map((c,i)=><rect key={i} x={-69+i*50} y={116} width={38} height={18} rx={6} fill={c} opacity={.85}/>)}
  <rect x={-46} y={142} width={92} height={5} rx={2.5} fill="#120C1D"/>
  {s.tap>.6&&s.proc>.01&&<g opacity={s.proc*smooth(s.tap,.6,1)}>{[0,1,2].map(i=>{const p=frac(t*1.4+i/3);return <path key={i} d={`M ${cx-40-p*16} ${cy+40+p*18} Q ${cx} ${cy+58+p*26} ${cx+40+p*16} ${cy+40+p*18}`} fill="none" stroke={C.lavender} strokeWidth={3} opacity={1-p}/>;})}</g>}
  <Card x={cx} y={cy} rot={rot}/>
 </g>;
}
/** A cash register on a counter: rows 2 of card-terminal. a: 0 drawer closed → 1 the drawer slides out: bills and
 *  coins, a coin sparkle; the customer display shows bars, no digits. */
function CashRegister({t,a}:{t:number;a:number}){
 const open=inOut(smooth(a,.08,.8)),dy=48*open,sp=1+.07*open;
 const bills=[C.green,"#8FD07A",C.ivory,"#A6E28A"];
 return <g>
  <Shadow w={300} y={192}/>
  <Box x={-146} y={150} w={292} h={38} d={0} front="#26273A"/><polygon points={pts([[-146,150],[146,150],[134,136],[-134,136]])} fill="#4E4F62"/>
  <polygon points={pts([[-8,-108],[8,-108],[8,-40],[-8,-40]])} fill="#3A3B4C"/>
  <g transform="rotate(-4,0,-140)"><Two poly={[[-74,-172],[74,-172],[74,-106],[-74,-106]]} light="#4E4F62" dark="#3A3B4C" split={-10}/>
   <rect x={-62} y={-162} width={124} height={46} rx={6} fill="#0B0814"/>{[0,1,2].map(i=><rect key={i} x={-50+i*36} y={-145} width={26} height={12} rx={3} fill={C.lavender} opacity={.5+.4*Math.sin(t*1.5+i)}/>)}</g>
  <Two poly={[[-96,-40],[96,-40],[112,84],[-112,84]]} light="#4E4F62" dark="#3A3B4C" split={-6}/>
  <polygon points={pts([[-96,-40],[96,-40],[90,-52],[-90,-52]])} fill="#666882"/>
  <rect x={-74} y={-70} width={36} height={22} fill={C.ivory}/><rect x={-70} y={-64} width={28} height={3} fill="#9A97AC"/><rect x={-70} y={-58} width={20} height={3} fill="#9A97AC"/>
  {Array.from({length:16},(_,i)=>{const c=i%4,r=Math.floor(i/4),x=-70+c*40+r*-2,y=-26+r*26;return <rect key={i} x={x} y={y} width={30} height={18} rx={5} fill={i===15?C.yellow:"#26273A"} opacity={i===15?.9:1}/>;})}
  <Box x={-128} y={84} w={256} h={56} d={0} front="#3A3B4C"/><rect x={-128} y={84} width={256} height={8} fill="#4E4F62"/>
  <rect x={-114} y={96} width={228} height={4} fill="#120C1D"/>
  {/* Open drawer: the tray comes toward the viewer, so its front drops and widens; compartments show between. */}
  <polygon points={pts([[-114,98],[114,98],[118*sp,98+dy],[-118*sp,98+dy]])} fill="#120C1D"/>
  {open>.02&&<g opacity={smooth(open,.05,.4)}>{bills.map((c,i)=>{const x0=-110+i*48,x1=x0+42;return <polygon key={i} points={pts([[x0,100],[x1,100],[x1*sp+(i-1.5)*2,96+dy*.7],[x0*sp+(i-1.5)*2,96+dy*.7]])} fill={c} opacity={.9}/>;})}
   {Array.from({length:5},(_,i)=><ellipse key={i} cx={(-96+i*48)*sp} cy={98+dy*.86} rx={15} ry={5} fill={C.yellow}/>)}
   {Array.from({length:5},(_,i)=><ellipse key={`h${i}`} cx={(-100+i*48)*sp} cy={96+dy*.84} rx={5} ry={1.6} fill="#FFF3C0"/>)}</g>}
  <Two poly={[[-118*sp,100+dy],[118*sp,100+dy],[118*sp,140+dy],[-118*sp,140+dy]]} light="#4E4F62" dark="#3A3B4C" split={-10}/>
  <rect x={-24} y={114+dy} width={48} height={8} rx={4} fill="#26273A"/>
  {open>.6&&[0,1,2].map(i=>{const p=frac(t*.8+i/3);return <path key={i} d="M 0 -7 L 2 -2 L 7 0 L 2 2 L 0 7 L -2 2 L -7 0 L -2 -2 Z" fill={C.yellowLine} opacity={smooth(open,.6,1)*Math.sin(Math.PI*p)} transform={`translate(${-70+i*70},${90+dy*.8-18*p}) scale(${.6+.6*p})`}/>;})}
 </g>;
}
export function CardTerminal({t,a,rows=1,uid="term"}:{t:number;a:number;rows?:number;uid?:string}){
 return rows===2?<CashRegister t={t} a={a}/>:<PaymentTerminal t={t} a={a} rows={rows} uid={uid}/>;
}

/* ───────────── Airport ───────────── */
const AIR={gateY:128,taxiY:190,gateX:92,entry:-620,exit:560,taxiS:.96,gateS:.8,farX:-168,farY:100,farS:.62};
/** Path through gate B (p 0..3.1): roll in along the gate line from behind the hangar → parked with the stairs on
 *  (1.2..2) → push back onto the front taxiway → taxi out to the right behind the tower. Arrivals and departures use
 *  different lanes and planes are 1.6 apart in p, so two planes never overlap. */
const TAXI_GAP=1.6,TAXI_END=3.1;
function taxiPose(p:number){
 const {gateY,taxiY,gateX,entry,exit,taxiS,gateS}=AIR,out=gateX+40;
 if(p<1.2)return {x:lerp(entry,gateX,sine(p/1.2)),y:gateY,s:gateS,dock:0};
 if(p<2)return {x:gateX,y:gateY,s:gateS,dock:smooth(p,1.22,1.38)*(1-smooth(p,1.84,1.98))};
 if(p<2.35){const k=sine((p-2)/.35);return {x:lerp(gateX,out,k),y:lerp(gateY,taxiY,k),s:lerp(gateS,taxiS,k),dock:0};}
 return {x:lerp(out,exit,sine((p-2.35)/.75)),y:taxiY,s:taxiS,dock:0};
}
/** Pure airport state (tested): taxi phase (integrated), the moving planes and the board colour per row. */
export function airportState(t:number,a:number,o:Keyed){
 const tau=integrate(t,o,keySeconds("airport"),v=>.2*(1-smooth(v,.04,.4)));
 const planes:{x:number;y:number;s:number;dock:number;k:number}[]=[];
 for(let k=Math.floor(tau/TAXI_GAP)-2;k<=Math.floor(tau/TAXI_GAP)+1;k++){const p=tau-k*TAXI_GAP;if(p<0||p>TAXI_END)continue;planes.push({...taxiPose(p),k});}
 const board=Array.from({length:5},(_,i)=>({warn:smooth(a,.08+i*.045,.34+i*.045),stop:smooth(a,.56+i*.045,.8+i*.045)}));
 return {tau,planes,board,chock:smooth(a,.72,.92),queue:Array.from({length:12},(_,i)=>smooth(a,.44+i*.038,.58+i*.038))};
}
/** Side view of an airliner, nose right, wheels on y=0 (no logos). stairs 0..1 rolls a boarding stair to the door. */
function Plane({x,y,s,chock,t,stairs=0,tint=0}:{x:number;y:number;s:number;chock:number;t:number;stairs?:number;tint?:number}){
 const hull=mix("#F3F0FA","#B9B3CE",tint),belly=mix("#BDB4D8","#857E9E",tint),tail=mix(C.purple,"#5B3A94",tint);
 const wheels=[[96,-4],[-6,-4],[8,-4]];
 return <g transform={`translate(${x},${y}) scale(${s})`}>
  <ellipse cx={0} cy={2} rx={130} ry={7} fill="#000" opacity={.35}/>
  <polygon points={pts([[-30,-28],[48,-28],[18,-6],[-54,-6]])} fill={mix("#8C86A8","#5A5670",tint)}/>
  <polygon points={pts([[-118,-48],[-96,-48],[-128,-112],[-146,-112]])} fill={tail}/><polygon points={pts([[-118,-48],[-107,-48],[-137,-112],[-146,-112]])} fill={mix("#B08AEA","#7A5AB0",tint)}/>
  <path d="M -122 -52 Q -122 -54 -110 -54 L 108 -54 Q 140 -52 146 -34 Q 140 -18 112 -16 L -100 -16 Q -128 -24 -138 -44 Z" fill={hull}/>
  <path d="M -138 -44 Q -128 -24 -100 -16 L 112 -16 Q 140 -18 146 -34 L -130 -34 Z" fill={belly}/>
  <rect x={-104} y={-34} width={212} height={4} fill={tail} opacity={.85}/>
  {Array.from({length:22},(_,i)=><rect key={i} x={-88+i*8.4} y={-45} width={4.4} height={5.4} rx={2} fill="#3A3B4C"/>)}
  <polygon points={pts([[124,-48],[138,-46],[141,-40],[128,-40]])} fill="#26273A"/>
  <rect x={98} y={-50} width={10} height={24} rx={2} fill="none" stroke="#9A97AC" strokeWidth={1.8}/>
  <polygon points={pts([[-132,-58],[-104,-56],[-100,-50],[-136,-52]])} fill={mix("#B08AEA","#7A5AB0",tint)}/>
  <polygon points={pts([[-36,-30],[34,-30],[10,-6],[-48,-6]])} fill={mix("#A6A0BE","#77718F",tint)}/>
  <rect x={-14} y={-18} width={46} height={16} rx={8} fill="#666882"/><rect x={-14} y={-18} width={46} height={5} rx={2.5} fill="#8C86A8"/><ellipse cx={32} cy={-10} rx={4} ry={8} fill="#26273A"/>
  {wheels.map(([wx,wy],i)=><g key={i}><line x1={wx} y1={-16} x2={wx} y2={wy} stroke="#4E4F62" strokeWidth={3}/><circle cx={wx} cy={wy} r={5.5} fill="#1E1A2A"/><circle cx={wx} cy={wy} r={2} fill="#666882"/></g>)}
  {chock>.01&&wheels.map(([wx],i)=><g key={`c${i}`} opacity={chock} transform={`translate(${(1-chock)*16},0)`}><polygon points={pts([[wx+6,2],[wx+15,2],[wx+6,-7]])} fill={C.yellow}/><polygon points={pts([[wx-6,2],[wx-15,2],[wx-6,-7]])} fill={C.yellow}/></g>)}
  {stairs>.01&&<g opacity={stairs} transform={`translate(${(1-stairs)*40},0)`}>
   <rect x={108} y={-14} width={46} height={10} rx={3} fill={C.lavender}/><rect x={108} y={-14} width={46} height={3} fill="#fff" opacity={.5}/><circle cx={116} cy={-3} r={4} fill="#1E1A2A"/><circle cx={146} cy={-3} r={4} fill="#1E1A2A"/>
   <polygon points={pts([[106,-30],[116,-30],[150,-14],[136,-14]])} fill="#9A97AC"/>
   {Array.from({length:5},(_,k)=><line key={k} x1={116+k*6.8} y1={-30+k*3.2} x2={108+k*6.8} y2={-30+k*3.2} stroke="#666882" strokeWidth={1.6}/>)}
   <line x1={110} y1={-42} x2={146} y2={-24} stroke={C.yellow} strokeWidth={2.4}/><line x1={110} y1={-42} x2={110} y2={-30} stroke={C.yellow} strokeWidth={2}/><line x1={146} y1={-24} x2={146} y2={-14} stroke={C.yellow} strokeWidth={2}/>
  </g>}
  <circle cx={-140} cy={-112} r={2.5} fill={C.pink} opacity={.5+.5*Math.max(0,Math.sin(t*4))}/>
 </g>;
}
/** An airport diorama: a terminal with a glass departure lounge, a departures board of coloured bars on the roof (no
 *  words), a hangar, a control tower, a far gate and gate B. a: 0 flights leave: a plane rolls in from behind the
 *  hangar, parks at gate B (boarding stairs roll up), pushes back and taxis out behind the tower (cycle integrated by
 *  speed), the board is green → 0.5 the board turns yellow (delays), planes stand where they are → 1 everything
 *  red, chocks under the wheels, a queue of small people grows in the lounge. */
export function Airport({t,a,o,uid="air"}:{t:number;a:number;o:Keyed;uid?:string}){
 const st=airportState(t,a,o),W=372;
 const people=st.queue.map((v,i)=>({v,x:200-i*18+(i%2)*2,c:[C.lavender,C.yellow,"#7FA6FF",C.ivory,C.purple,"#F59A3C",C.green][i%7],h:22+4*hash(i*3),i}));
 const gate=st.planes.filter(p=>p.y<160).sort((p,q)=>p.y-q.y),front=st.planes.filter(p=>p.y>=160);
 return <g>
  <defs><clipPath id={`air-${uid}`}><rect x={-W} y={-270} width={2*W} height={472}/></clipPath>
   <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3B3F86"/><stop offset="1" stopColor="#1B1840"/></linearGradient>
   <linearGradient id={`apron-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#242036"/><stop offset="1" stopColor="#3A3550"/></linearGradient></defs>
  <ellipse cx={0} cy={240} rx={360} ry={8} fill="#000" opacity={.45}/>
  <polygon points={pts([[-W,202],[W,202],[W-8,232],[-W+8,232]])} fill="#26273A"/><polygon points={pts([[-W,202],[0,202],[0,232],[-W+8,232]])} fill="#2E2F42"/>
  <g clipPath={`url(#air-${uid})`}>
   <rect x={-W} y={36} width={2*W} height={166} fill={`url(#apron-${uid})`}/>
   <line x1={-W} y1={AIR.taxiY+4} x2={W} y2={AIR.taxiY+4} stroke={C.yellow} strokeWidth={3} strokeDasharray="22 16" opacity={.7}/>
   <path d={`M ${AIR.gateX+40} ${AIR.taxiY+4} Q ${AIR.gateX+10} ${AIR.taxiY} ${AIR.gateX} ${AIR.gateY+4}`} stroke={C.yellow} strokeWidth={2.5} fill="none" opacity={.55}/>
   <line x1={-W} y1={AIR.gateY+4} x2={AIR.gateX} y2={AIR.gateY+4} stroke={C.yellow} strokeWidth={2} strokeDasharray="10 12" opacity={.4}/>
   <line x1={AIR.farX-60} y1={AIR.farY+3} x2={AIR.farX+80} y2={AIR.farY+3} stroke={C.yellow} strokeWidth={2} opacity={.4}/>
   {Array.from({length:16},(_,i)=><circle key={i} cx={-W+20+i*48} cy={198} r={2.6} fill={C.green} opacity={.55+.35*Math.sin(t*2+i)}/>)}
   {/* Terminal with the glass departure lounge */}
   <rect x={-W} y={-146} width={610} height={184} fill="#26273A"/>
   <rect x={-W} y={-140} width={610} height={80} fill={`url(#glass-${uid})`}/>
   {people.map(p=>p.v>.01&&<g key={p.i} opacity={p.v} transform={`translate(${p.x-(1-p.v)*14},${-62+Math.sin(t*1.4+p.i)*.8})`}><rect x={-5} y={-p.h} width={10} height={p.h-8} rx={4} fill={p.c}/><circle cx={0} cy={-p.h-5} r={5} fill={p.c}/><rect x={-4} y={-8} width={3} height={8} fill={mix(p.c,"#000000",.4)}/><rect x={1} y={-8} width={3} height={8} fill={mix(p.c,"#000000",.4)}/>{p.i%3===1&&<rect x={6} y={-12} width={8} height={11} rx={2} fill="#9A97AC"/>}</g>)}
   {Array.from({length:16},(_,i)=><rect key={i} x={-W+i*40} y={-140} width={3} height={80} fill="#4E4F62" opacity={.9}/>)}
   <polygon points={pts([[-W,-140],[-W+120,-140],[-W+40,-60],[-W,-60]])} fill="#fff" opacity={.05}/><polygon points={pts([[-60,-140],[20,-140],[-60,-60],[-90,-60]])} fill="#fff" opacity={.04}/>
   <rect x={-W} y={-62} width={610} height={6} fill="#4E4F62"/>
   <rect x={-W} y={-56} width={610} height={94} fill="#2E2F42"/>
   {Array.from({length:7},(_,i)=><rect key={i} x={-330+i*82} y={-44} width={56} height={30} rx={3} fill="#1B1840" stroke="#4E4F62" strokeWidth={2}/>)}
   {[AIR.farX+60,AIR.gateX+80].map((x,i)=><g key={i}><rect x={x-22} y={-6} width={44} height={44} fill="#1B1840" stroke="#4E4F62" strokeWidth={2}/><circle cx={x} cy={-14} r={4} fill={mix(C.green,C.pink,st.chock)}/></g>)}
   <polygon points={pts([[-W-6,-160],[244,-160],[250,-146],[-W,-146]])} fill="#666882"/>
   <Plane x={AIR.farX} y={AIR.farY} s={AIR.farS} chock={st.chock} t={t} stairs={1} tint={.18}/>
   {gate.map(p=><Plane key={p.k} x={p.x} y={p.y} s={p.s} chock={st.chock} t={t} stairs={p.dock}/>)}
   {front.map(p=><Plane key={p.k} x={p.x} y={p.y} s={p.s} chock={st.chock} t={t} stairs={p.dock}/>)}
   {/* Hangar (left) hides arriving planes; the tower base (right) hides departing ones. */}
   <g><path d={`M ${-W} 214 L ${-W} 86 Q ${-W+66} 34 ${-232} 86 L -232 214 Z`} fill="#3A3B4C"/><path d={`M ${-W} 214 L ${-W} 86 Q ${-W+40} 50 ${-W+70} 52 L ${-W+70} 214 Z`} fill="#4E4F62"/>
    <rect x={-350} y={118} width={96} height={84} fill="#1B1840"/>{[0,1,2,3,4].map(k=><line key={k} x1={-350+k*24} y1={118} x2={-350+k*24} y2={202} stroke="#3A3B4C" strokeWidth={3}/>)}
    <path d={`M ${-W} 86 Q ${-W+66} 34 ${-232} 86`} fill="none" stroke="#666882" strokeWidth={5}/></g>
   <rect x={286} y={-160} width={34} height={284} fill="#3A3B4C"/><rect x={286} y={-160} width={14} height={284} fill="#4E4F62"/>
   <polygon points={pts([[262,-186],[346,-186],[336,-160],[272,-160]])} fill="#26273A"/>
   <polygon points={pts([[258,-222],[350,-222],[346,-186],[262,-186]])} fill={`url(#glass-${uid})`}/>{[0,1,2,3].map(i=><line key={i} x1={272+i*22} y1={-222} x2={274+i*21} y2={-186} stroke="#4E4F62" strokeWidth={3}/>)}
   <polygon points={pts([[254,-230],[354,-230],[350,-222],[258,-222]])} fill="#666882"/><line x1={304} y1={-230} x2={304} y2={-240} stroke="#9A97AC" strokeWidth={3}/>
   <circle cx={304} cy={-241} r={5} fill={mix(C.green,C.pink,st.chock)} opacity={.5+.5*Math.max(0,Math.sin(t*3))}/>
   <Two poly={[[242,64],[W,64],[W,214],[242,214]]} light="#3A3B4C" dark="#2E2F42" split={300}/>
   <polygon points={pts([[236,64],[W,64],[W,54],[242,54]])} fill="#4E4F62"/>{[0,1].map(i=><rect key={i} x={258+i*56} y={92} width={40} height={26} rx={3} fill="#1B1840" stroke="#4E4F62" strokeWidth={2}/>)}
  </g>
  {/* Departures board on the roof: rows of coloured status bars, no words. */}
  <g>
   <rect x={-300} y={-160} width={8} height={14} fill="#3A3B4C"/><rect x={-80} y={-160} width={8} height={14} fill="#3A3B4C"/>
   <rect x={-356} y={-246} width={340} height={88} rx={8} fill="#120C1D" stroke="#4E4F62" strokeWidth={4}/>
   {st.board.map((r,i)=>{const y=-235+i*15.4,c=mix(mix(C.green,C.yellow,r.warn),C.pink,r.stop),blink=lerp(1,.6+.4*Math.sin(t*5+i),r.warn);
    return <g key={i}><g transform={`translate(-336,${y+5})`}><polygon points={pts([[-6,0],[6,-2],[9,0],[6,2]])} fill={C.ivory} opacity={.8}/><polygon points={pts([[-1,0],[3,-5],[4,-5],[3,0]])} fill={C.ivory} opacity={.8}/></g>
     <rect x={-322} y={y} width={90+60*hash(i*3)} height={10} rx={3} fill={C.lavender} opacity={.45}/><rect x={-160} y={y} width={36} height={10} rx={3} fill={C.ivory} opacity={.35}/>
     <rect x={-110} y={y} width={78} height={10} rx={5} fill={c} opacity={blink}/></g>;})}
  </g>
 </g>;
}

/* ───────────── Container port ───────────── */
const PORT={xc:-14,shipX:-186,deck:30,spUp:-118,road:196,cycle:1/10};
const BOX_COLORS=[C.purple,"#4F7ADB",C.yellow,"#D9653B","#3FA37A",C.lavender,"#B23A5A","#8C86A8"];
const boxColor=(j:number)=>BOX_COLORS[Math.floor(hash(j*3.17+1)*BOX_COLORS.length)];
function Container({x,y,w=50,h=26,color}:{x:number;y:number;w?:number;h?:number;color:string}){
 return <g><rect x={x} y={y} width={w} height={h} fill={color}/><rect x={x} y={y} width={w} height={4} fill={mix(color,"#ffffff",.3)}/>
  {Array.from({length:Math.floor(w/6)-1},(_,i)=><line key={i} x1={x+5+i*6} y1={y+5} x2={x+5+i*6} y2={y+h-2} stroke={mix(color,"#000000",.28)} strokeWidth={1.6}/>)}
  <rect x={x+w-6} y={y} width={6} height={h} fill={mix(color,"#000000",.35)}/><rect x={x} y={y+h-3} width={w} height={3} fill={mix(color,"#000000",.4)}/></g>;
}
/** Pure port state (tested): crane cycle (integrated), trolley and spreader, the carried box and the truck queue. */
export function portState(t:number,a:number,o:Keyed){
 const {xc,shipX,deck,spUp,road,cycle}=PORT;
 const tau=integrate(t,o,keySeconds("cargo-port"),v=>cycle*(1-smooth(v,.04,.42))),n=Math.floor(tau),u=tau-n;
 const onTruck=road-50;// container top on a truck chassis
 // Cycle (10 s at full speed): lower onto the ship's hatch box, lift, travel to the road, lower onto the truck,
 // release and lift, travel back while the next box rises from the hold and the trucks advance one place.
 const trolley=u<.22?shipX:u<.42?lerp(shipX,xc,sine((u-.22)/.2)):u<.66?xc:u<.88?lerp(xc,shipX,sine((u-.66)/.22)):shipX;
 const slot=deck-26;
 const sp=u<.12?lerp(spUp,slot,sine(u/.12)):u<.22?lerp(slot,spUp,sine((u-.12)/.1)):u<.42?spUp:u<.58?lerp(spUp,onTruck,sine((u-.42)/.16)):u<.7?lerp(onTruck,spUp,sine((u-.58)/.12)):spUp;
 // The queue closes up toward its target at a limited rate (integrated), so trucks roll up instead of sliding all at once.
 const close=integrate(t,o,keySeconds("cargo-port"),(v,q)=>Math.max(-.28,Math.min(.28,(smooth(v,.35,1)-q)*1.6)));
 const carrying=u>=.12&&u<.58,rise=smooth(u,.66,.9),m=n+sine((u-.62)/.33),gap=lerp(250,104,clamp01(close));
 const trucks:{x:number;j:number;loaded:boolean}[]=[];
 for(let j=n-4;j<=n+6;j++){const x=xc+(j-m)*gap;if(x<-500||x>520)continue;trucks.push({x,j,loaded:j<n||(j===n&&u>=.58)});}
 return {tau,n,u,trolley,sp,carrying,rise,trucks,pile:Array.from({length:6},(_,k)=>smooth(a,.4+k*.075,.62+k*.075)),wait:smooth(a,.6,.9),stopped:smooth(a,.04,.42)};
}
function Truck({x,j,loaded,y}:{x:number;j:number;loaded:boolean;y:number}){
 const cab=[C.lavender,C.yellow,"#7FA6FF",C.ivory,"#F59A3C"][Math.floor(hash(j*1.7+5)*5)];
 return <g transform={`translate(${x},${y})`}>
  <ellipse cx={-14} cy={1} rx={50} ry={5} fill="#000" opacity={.35}/>
  <rect x={-27} y={-24} width={56} height={7} fill="#3A3B4C"/><rect x={-27} y={-24} width={56} height={2.5} fill="#666882"/>
  {loaded&&<Container x={-23} y={-50} w={46} h={26} color={boxColor(j)}/>}
  <polygon points={pts([[-60,-6],[-60,-32],[-53,-44],[-30,-44],[-30,-6]])} fill={cab}/><polygon points={pts([[-44,-6],[-44,-44],[-30,-44],[-30,-6]])} fill={mix(cab,"#000000",.25)}/>
  <polygon points={pts([[-57,-32],[-51,-41],[-44,-41],[-44,-30]])} fill="#1B1840"/>
  {[-47,-6,18].map((wx,i)=><g key={i}><circle cx={wx} cy={-6} r={7.5} fill="#1E1A2A"/><circle cx={wx} cy={-6} r={2.8} fill="#666882"/></g>)}
 </g>;
}
/** A container port diorama: ship-to-shore crane, a container ship at the quay, a stack yard, trucks on the quay
 *  road. a: 0 the crane lifts boxes from the ship onto trucks that drive off (cycle integrated by speed) → 0.5 the
 *  crane stops where it is, trucks start to bunch up → 1 a long queue bumper to bumper, more boxes pile up in the
 *  yard, the ship waits (pink clock, pink beacon). No logos on the boxes. */
export function CargoPort({t,a,o,uid="port"}:{t:number;a:number;o:Keyed;uid?:string}){
 const st=portState(t,a,o),W=372,{xc,shipX,deck,road}=PORT,cols=[-302,-256,-210,-164];
 const wave=(ph:number,amp:number,y0:number,x1=-96)=>[...Array.from({length:12},(_,i)=>{const x=-W+i*(x1+W)/11;return [x,y0+Math.sin(x/30+t*1.5+ph)*amp];}),[x1,240],[-W,240]];
 const yard=[[150,3],[206,4],[262,2],[318,3]] as [number,number][],extra=[262,150,318,262,318,206];
 const beacon=mix(C.green,C.pink,st.wait);
 return <g>
  <defs><clipPath id={`port-${uid}`}><rect x={-W} y={-260} width={2*W} height={460}/></clipPath></defs>
  <ellipse cx={0} cy={231} rx={360} ry={8} fill="#000" opacity={.45}/>
  <polygon points={pts([[-W,204],[W,204],[W-8,232],[-W+8,232]])} fill="#26273A"/><polygon points={pts([[-W,204],[0,204],[0,232],[-W+8,232]])} fill="#2E2F42"/>
  <g clipPath={`url(#port-${uid})`}>
   <polygon points={pts(wave(0,3,52))} fill="#161A56"/>
   {/* Ship: active hatch column at shipX, boxes stacked on deck. */}
   {st.rise>0&&st.rise<1&&<Container x={shipX-23} y={deck-26+(1-st.rise)*32} w={46} color={boxColor(st.n+1)}/>}
   {(st.u<.12||st.rise>=1)&&<Container x={shipX-23} y={deck-26} w={46} color={boxColor(st.rise>=1?st.n+1:st.n)}/>}
   {cols.map((cx,c)=>c===2?null:Array.from({length:c===0?2:3},(_,k)=><Container key={`${c}-${k}`} x={cx} y={deck-26*(k+1)} w={44} color={boxColor(100+c*7+k)}/>))}
   <polygon points={pts([[-W,30],[-106,30],[-118,92],[-150,112],[-W,112]])} fill="#3A2F5A"/><polygon points={pts([[-W,30],[-230,30],[-230,112],[-W,112]])} fill="#4A3D70"/>
   <rect x={-W} y={30} width={266} height={6} fill={C.lavender} opacity={.55}/><rect x={-W} y={78} width={258} height={4} fill={C.ivory} opacity={.3}/>
   <Box x={-364} y={-64} w={46} h={94} d={0} front={C.ivory}/><rect x={-364} y={-64} width={16} height={94} fill="#fff" opacity={.4}/>
   {[0,1,2,3].map(i=><rect key={i} x={-358} y={-56+i*20} width={34} height={7} fill="#3A3B4C"/>)}
   <rect x={-356} y={-86} width={18} height={22} fill="#4E4F62"/><rect x={-356} y={-80} width={18} height={4} fill={C.yellow}/>
   {[0,1,2].map(i=>{const p=frac(t*.25+i/3);return <circle key={i} cx={-347+p*40} cy={-92-p*60} r={6+10*p} fill="#9A97AC" opacity={.35*(1-p)}/>;})}
   <polygon points={pts(wave(1.2,4,100))} fill="#232A86" opacity={.95}/>
   <polyline points={pts(wave(1.2,4,100).slice(0,12))} fill="none" stroke="#9CC4FF" strokeWidth={3} opacity={.5}/>
   {/* Ship waiting: pink clock badge. */}
   {st.wait>.01&&<g opacity={st.wait} transform={`translate(-250,-84) scale(${.8+.2*st.wait})`}><circle r={26} fill={C.pink} opacity={.25}/><circle r={18} fill={C.pink}/><circle r={12} fill="none" stroke={C.ivory} strokeWidth={2.5}/><path d="M 0 0 V -8 M 0 0 L 6 3" stroke={C.ivory} strokeWidth={2.5} strokeLinecap="round"/></g>}
   {/* Quay and yard */}
   <polygon points={pts([[-104,140],[W,140],[W,204],[-104,204]])} fill="#3A3B4C"/><polygon points={pts([[-104,134],[W,134],[W,140],[-104,140]])} fill="#4E4F62"/>
   {[-96,-60].map((x,i)=><g key={`b${i}`}><rect x={x-5} y={126} width={10} height={10} rx={3} fill="#26273A"/><rect x={x-7} y={124} width={14} height={4} rx={2} fill="#4E4F62"/></g>)}
   {[112,352].map((x,i)=><g key={`l${i}`}><rect x={x-2.5} y={-20} width={5} height={156} fill="#4E4F62"/><rect x={x-12} y={-24} width={24} height={6} rx={2} fill="#666882"/><ellipse cx={x} cy={-14} rx={26} ry={10} fill={C.yellow} opacity={.12+.04*Math.sin(t*2+i)}/><rect x={x-9} y={-19} width={18} height={3} fill={C.yellowLine}/></g>)}
   {yard.map(([x,h],c)=>Array.from({length:h},(_,k)=><Container key={`y${c}-${k}`} x={x} y={134-26*(k+1)} w={52} color={boxColor(200+c*9+k)}/>))}
   {extra.map((x,i)=>{const level=yardHeight(yard,x)+extra.slice(0,i).filter(e=>e===x).length;return st.pile[i]>.01&&<g key={`e${i}`} opacity={st.pile[i]} transform={`translate(0,${-(1-st.pile[i])*40})`}><Container x={x} y={134-26*(level+1)} w={52} color={boxColor(300+i*5)}/></g>;})}
   {/* Crane: legs, portal, boom with back-reach, A-frame apex with stays, trolley and spreader. */}
   <g>
    <polygon points={pts([[-86,150],[-70,150],[-54,-116],[-68,-116]])} fill="#8E7CC8"/><polygon points={pts([[-86,150],[-80,150],[-64,-116],[-68,-116]])} fill="#B9A6E8"/>
    <polygon points={pts([[48,150],[64,150],[48,-116],[34,-116]])} fill="#6E58A8"/>
    <line x1={-76} y1={24} x2={54} y2={24} stroke="#6E58A8" strokeWidth={9}/><line x1={-72} y1={24} x2={46} y2={-108} stroke="#6E58A8" strokeWidth={4} opacity={.75}/><line x1={-64} y1={-108} x2={52} y2={24} stroke="#6E58A8" strokeWidth={4} opacity={.75}/>
    <line x1={-78} y1={90} x2={56} y2={90} stroke="#6E58A8" strokeWidth={5} opacity={.8}/>
    <rect x={-92} y={146} width={38} height={10} rx={3} fill="#3A3B4C"/><rect x={34} y={146} width={38} height={10} rx={3} fill="#3A3B4C"/>
    <rect x={-80} y={-128} width={140} height={16} fill="#8E7CC8"/>
    <line x1={-364} y1={-144} x2={120} y2={-144} stroke="#B9A6E8" strokeWidth={6}/><line x1={-352} y1={-122} x2={120} y2={-122} stroke="#8E7CC8" strokeWidth={6}/>
    {Array.from({length:20},(_,k)=>{const x=-352+k*24;return <line key={k} x1={x} y1={-122} x2={x+12} y2={-144} stroke="#8E7CC8" strokeWidth={3}/>;})}
    {Array.from({length:20},(_,k)=>{const x=-340+k*24;return <line key={`b${k}`} x1={x} y1={-144} x2={x+12} y2={-122} stroke="#6E58A8" strokeWidth={3}/>;})}
    <polygon points={pts([[-372,-146],[-352,-146],[-352,-120],[-364,-120]])} fill="#B9A6E8"/>
    <Box x={-58} y={-168} w={72} h={24} d={14} front={C.ivory} top="#FFFFFF" side="#C9C3DC"/><rect x={-50} y={-160} width={56} height={6} fill="#9A97AC"/>
    <polygon points={pts([[-30,-128],[-14,-220],[0,-220],[10,-128]])} fill="#8E7CC8"/><polygon points={pts([[-14,-220],[0,-220],[10,-128],[-6,-128]])} fill="#6E58A8"/>
    <line x1={-10} y1={-218} x2={-362} y2={-140} stroke="#B9A6E8" strokeWidth={3}/><line x1={-10} y1={-218} x2={-200} y2={-140} stroke="#B9A6E8" strokeWidth={2.5}/><line x1={-4} y1={-218} x2={118} y2={-140} stroke="#B9A6E8" strokeWidth={3}/>
    <circle cx={-7} cy={-224} r={7} fill={beacon} opacity={lerp(.4+.6*Math.max(0,Math.sin(t*4)),.9,st.wait)}/><circle cx={-7} cy={-224} r={13} fill={beacon} opacity={.2}/>
    <rect x={40} y={-116} width={30} height={22} rx={3} fill="#4E4F62"/><rect x={44} y={-112} width={22} height={10} fill="#1B1840"/>
    <rect x={st.trolley-18} y={-128} width={36} height={14} rx={2} fill="#4E4F62"/><rect x={st.trolley-14} y={-114} width={28} height={10} rx={2} fill="#3A3B4C"/>
    <line x1={st.trolley-10} y1={-104} x2={st.trolley-18} y2={st.sp} stroke="#9A97AC" strokeWidth={2}/><line x1={st.trolley+10} y1={-104} x2={st.trolley+18} y2={st.sp} stroke="#9A97AC" strokeWidth={2}/>
    {st.carrying&&<Container x={st.trolley-23} y={st.sp} w={46} color={boxColor(st.n)}/>}
    <rect x={st.trolley-26} y={st.sp-6} width={52} height={7} rx={2} fill={C.yellow}/>
   </g>
   {/* Road with trucks (front layer). */}
   <rect x={-W} y={176} width={2*W} height={28} fill="#26273A"/><line x1={-W} y1={190} x2={W} y2={190} stroke={C.ivory} strokeWidth={2.5} strokeDasharray="18 18" opacity={.25}/>
   {st.trucks.map(k=><Truck key={k.j} x={k.x} j={k.j} loaded={k.loaded} y={road}/>)}
  </g>
 </g>;
}
const yardHeight=(yard:[number,number][],x:number)=>yard.find(y=>y[0]===x)?.[1]??0;

/* ───────────── GPS satellite ───────────── */
/** A navigation satellite (gold body, two solar wings, antenna array facing Earth) over the curve of the planet;
 *  signal rings run down to a small phone. a: 0 flying (the surface drifts below) → 0.5 the signal goes → 1 the
 *  phone has its position: green pin and check, faint lines from two far satellites. rows 2: no plinth, the
 *  planet fades out at the bottom (space backdrop). */
export function GpsSatellite({t,a,rows=1,uid="gps"}:{t:number;a:number;rows?:number;uid?:string}){
 const sig=smooth(a,.15,.5),got=smooth(a,.6,.95),room=rows!==2,bob=5*Math.sin(t*.9),R=270,ecy=100+R;
 const faces=sphere(6,t*3+10,70,0).filter(f=>f.p.some(([,y])=>y*R+ecy<(room?176:214)));
 const fill=(f:Face)=>tone(GLOBE_MAT[ground(f.lon,f.lat)==="ice"?"ice":ground(f.lon,f.lat)],f.n,(hash(f.i)-.5)*.08);
 const ant=[0,-50+bob],phone=[0,96];
 const rings=[0,1,2,3].map(k=>{const p=frac(t*.55+k/4),rr=18+p*132;return {rr,o:sig*(1-p)*Math.min(1,p*6),k};});
 const ringC=mix(C.lavender,C.green,got);
 const panel=(side:number)=>{const fold=Math.cos(14*Math.sin(t*.3)*D),w=150*fold,x0=side>0?44:-44-w;
  return <g>
   <rect x={side>0?20:-44} y={-96+bob} width={24} height={4} fill="#9A97AC"/>
   <rect x={x0} y={-122+bob} width={w} height={54} fill="#1E2260" stroke={C.ivory} strokeWidth={2}/>
   {Array.from({length:6},(_,c)=>Array.from({length:2},(_,r)=><rect key={`${c}-${r}`} x={x0+3+c*(w-6)/6} y={-119+bob+r*25} width={(w-6)/6-3} height={22} fill={(c+r)%2?"#3F4CC4":"#3346B0"}/>))}
   <polygon points={pts([[x0+w*(.1+.15*frac(t*.07)),-122+bob],[x0+w*(.18+.15*frac(t*.07)),-122+bob],[x0+w*(.1+.15*frac(t*.07)),-68+bob],[x0+w*(.02+.15*frac(t*.07)),-68+bob]])} fill="#fff" opacity={.12}/>
  </g>;};
 const small=(x:number,y:number)=><g transform={`translate(${x},${y}) scale(.32)`} opacity={.75}><rect x={-120} y={-14} width={88} height={28} fill="#2A2F80" stroke={C.ivory} strokeWidth={4}/><rect x={32} y={-14} width={88} height={28} fill="#2A2F80" stroke={C.ivory} strokeWidth={4}/><rect x={-26} y={-24} width={52} height={48} fill={C.yellow}/></g>;
 return <g>
  <defs><radialGradient id={`gatm2-${uid}`} gradientUnits="userSpaceOnUse" cx={0} cy={ecy} r={R*1.14}><stop offset=".86" stopColor="#8F9BFF" stopOpacity=".6"/><stop offset=".93" stopColor="#8F7CFF" stopOpacity=".18"/><stop offset="1" stopColor="#8F7CFF" stopOpacity="0"/></radialGradient>
   <clipPath id={`gcap-${uid}`}><rect x={-230} y={-60} width={460} height={room?236:270}/></clipPath>
   <linearGradient id={`gfade-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0A0718" stopOpacity="0"/><stop offset="1" stopColor="#0A0718" stopOpacity="1"/></linearGradient></defs>
  {room&&<><Shadow w={440} y={200}/><rect x={-40} y={-80} width={5} height={170} fill={C.lavender} opacity={.22}/></>}
  {/* Far satellites and their lines once the position is fixed. */}
  {small(-176,-188)}{small(176,-176)}
  <g opacity={got*.55}><line x1={-176} y1={-188} x2={phone[0]} y2={phone[1]-30} stroke={C.green} strokeWidth={2.5} strokeDasharray="6 8" strokeDashoffset={-t*20}/><line x1={176} y1={-176} x2={phone[0]} y2={phone[1]-30} stroke={C.green} strokeWidth={2.5} strokeDasharray="6 8" strokeDashoffset={-t*20}/></g>
  <g clipPath={`url(#gcap-${uid})`}>
   <circle cx={0} cy={ecy} r={R*1.14} fill={`url(#gatm2-${uid})`}/>
   <g transform={`translate(0,${ecy})`}><Facets faces={faces} r={R} fill={fill}/></g>
   <circle cx={0} cy={ecy} r={R} fill="none" stroke="#BFD0FF" strokeWidth={4} opacity={.5}/>
   {!room&&<rect x={-230} y={140} width={460} height={74} fill={`url(#gfade-${uid})`}/>}
  </g>
  {room&&<g><polygon points={pts([[-224,176],[224,176],[214,198],[-214,198]])} fill="#26273A"/><polygon points={pts([[-224,176],[0,176],[0,198],[-214,198]])} fill="#2E2F42"/><rect x={-226} y={170} width={452} height={8} rx={3} fill="#3A3B4C"/></g>}
  {/* Signal rings: arcs below the antenna, toward the phone. */}
  <g fill="none" strokeLinecap="round">{rings.map(g=>{const a0=58*D,a1=122*D;return <path key={g.k} d={`M ${ant[0]+Math.cos(a0)*g.rr} ${ant[1]+Math.sin(a0)*g.rr} A ${g.rr} ${g.rr} 0 0 1 ${ant[0]+Math.cos(a1)*g.rr} ${ant[1]+Math.sin(a1)*g.rr}`} stroke={ringC} strokeWidth={5} opacity={g.o*.9}/>;})}</g>
  {/* Phone on the planet's curve. */}
  <g transform={`translate(${phone[0]},${phone[1]})`}>
   {got>.01&&[0,.5].map(k=>{const p=frac(t*.8+k);return <circle key={k} cy={-30} r={24+30*p} fill="none" stroke={C.green} strokeWidth={3} opacity={got*(1-p)*.8}/>;})}
   <rect x={-19} y={-64} width={38} height={66} rx={8} fill="#2E2F42" stroke={C.lavender} strokeOpacity={.5} strokeWidth={2}/>
   <rect x={-15} y={-58} width={30} height={54} rx={5} fill={mix("#0B0814","#123A1E",got)}/>
   <Spinner x={0} y={-31} r={9} t={t} o={sig*(1-got)*.9}/>
   {got>.01&&<g opacity={got}><path d="M 0 -20 C -9 -30 -9 -44 0 -44 C 9 -44 9 -30 0 -20 Z" fill={C.green}/><circle cx={0} cy={-36} r={3.5} fill="#0B0814"/></g>}
  </g>
  {/* Satellite */}
  <g>{panel(-1)}{panel(1)}
   <polygon points={pts([[-28,-124+bob],[22,-124+bob],[32,-134+bob],[-18,-134+bob]])} fill="#FFE08A"/>
   <polygon points={pts([[22,-124+bob],[32,-134+bob],[32,-74+bob],[22,-64+bob]])} fill="#B8862A"/>
   <Two poly={[[-28,-124+bob],[22,-124+bob],[22,-64+bob],[-28,-64+bob]]} light={C.yellow} dark="#D9A93A" split={-6}/>
   {[[-24,-118,10],[-10,-100,12],[4,-114,9],[-20,-84,11],[8,-88,10]].map(([x,y,s],i)=><polygon key={i} points={pts([[x,y+bob],[x+s,y+bob-3],[x+s+2,y+bob+s-2],[x+2,y+bob+s]])} fill="#FFF3C0" opacity={.25+.15*Math.sin(t*1.3+i)}/>)}
   <rect x={-20} y={-64+bob} width={40} height={8} fill="#666882"/>
   {[-14,-5,4,13].map((x,i)=><rect key={i} x={x-3} y={-56+bob} width={6} height={9} rx={2} fill={C.ivory}/>)}
   <line x1={-3} y1={-134+bob} x2={-3} y2={-156+bob} stroke="#9A97AC" strokeWidth={3}/><circle cx={-3} cy={-158+bob} r={4} fill={C.lavender}/>
   <circle cx={ant[0]} cy={ant[1]} r={10} fill={ringC} opacity={.25*sig}/>
  </g>
 </g>;
}

/* ───────────── 24-hour dial ───────────── */
/** Pure dial state (tested): hand angle (deg, 0 = top, clockwise) and sector colour mix for the share of a day. */
export function dialState(a:number){return {angle:360*clamp01(a),warm:smooth(a,.3,1)};}
/** A 24-hour dial on a stand: 24 ticks without digits, a sun and a moon riding the rim (the sun with the hand, the
 *  moon opposite), a hand and a growing sector of elapsed time that warms from lavender to pink. a = share of a day. */
export function DayDial({t,a}:{t:number;a:number}){
 const R=150,cy=-14,{angle,warm}=dialState(a),th=(angle-90)*D,sec=mix(C.lavender,C.pink,warm),big=angle>180?1:0;
 const at=(deg:number,r:number)=>[Math.cos((deg-90)*D)*r,cy+Math.sin((deg-90)*D)*r];
 const sector=angle<.5?"":angle>359.5?`M 0 ${cy-118} A 118 118 0 1 1 -0.01 ${cy-118} Z`:`M 0 ${cy} L 0 ${cy-118} A 118 118 0 ${big} 1 ${at(angle,118)[0]} ${at(angle,118)[1]} Z`;
 const bezel=Array.from({length:24},(_,i)=>{const a0=(i*15-90)*D,a1=((i+1)*15-90)*D,m=(i*15+7.5-90)*D,l=clamp01(.5-.5*(Math.cos(m)*-.7+Math.sin(m)*-.7));
  return <polygon key={i} points={pts([[Math.cos(a0)*R,cy+Math.sin(a0)*R],[Math.cos(a1)*R,cy+Math.sin(a1)*R],[Math.cos(a1)*136,cy+Math.sin(a1)*136],[Math.cos(a0)*136,cy+Math.sin(a0)*136]])} fill={mix("#3A2F5A","#B9A6E8",l*.85)}/>;});
 const [sx,sy]=at(angle,143),[mx,my]=at(angle+180,143);
 return <g>
  <Shadow w={250} y={171}/>
  <polygon points={pts([[-30,cy+R-6],[30,cy+R-6],[40,150],[-40,150]])} fill="#3A3B4C"/>
  <polygon points={pts([[-96,150],[96,150],[110,170],[-110,170]])} fill="#2E2F42"/><polygon points={pts([[-96,150],[0,150],[0,170],[-110,170]])} fill="#3A3B4C"/>
  <circle cx={0} cy={cy} r={R+4} fill="#120C1D"/>
  {bezel}
  <circle cx={0} cy={cy} r={136} fill="#120C1D"/>
  <path d={`M -136 ${cy} A 136 136 0 0 1 136 ${cy} Z`} fill="#1E1838"/>
  {Array.from({length:14},(_,i)=>{const x=(hash(i*3)-.5)*200,y=cy+20+hash(i*7)*90;return Math.hypot(x,y-cy)<126?<circle key={i} cx={x} cy={y} r={1.2+hash(i)*1.4} fill={C.ivory} opacity={.25+.35*(.5+.5*Math.sin(t*2+i))}/>:null;})}
  {sector&&<path d={sector} fill={sec} opacity={.5}/>}
  {Array.from({length:24},(_,i)=>{const major=i%6===0,[x0,y0]=at(i*15,major?104:112),[x1,y1]=at(i*15,128),done=smooth(angle-i*15,0,12)*smooth(angle,0,2);
   return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={mix(major?C.ivory:C.lavender,mix(sec,C.ivory,.3),done)} strokeWidth={major?6:3.5} strokeLinecap="round" opacity={lerp(major?.95:.6,.95,done)}/>;})}
  <polygon points={pts([[0,cy-132],[-8,cy-146],[8,cy-146]])} fill={C.yellow}/>
  {angle>.5&&<line x1={0} y1={cy} x2={at(angle,118)[0]} y2={at(angle,118)[1]} stroke={sec} strokeWidth={10} opacity={.25}/>}
  {/* Sun with the hand, moon opposite, on the rim. */}
  <g transform={`translate(${sx},${sy})`}><g transform={`rotate(${t*30})`}>{Array.from({length:8},(_,i)=><line key={i} x1={0} y1={-13} x2={0} y2={-18} stroke={C.yellow} strokeWidth={3} strokeLinecap="round" transform={`rotate(${i*45})`}/>)}</g>
   <circle r={16} fill={C.yellow} opacity={.25}/><circle r={10} fill="#FFE08A"/><circle r={6} fill="#FFF3C0"/></g>
  <g transform={`translate(${mx},${my})`}><circle r={14} fill={C.lavender} opacity={.18}/><circle r={10} fill={C.ivory}/><circle cx={5} cy={-3} r={9} fill="#3A2F5A"/></g>
  <g transform={`rotate(${angle},0,${cy})`}>
   <polygon points={pts([[0,cy-120],[7,cy-20],[0,cy+26],[-7,cy-20]])} fill={C.ivory}/><polygon points={pts([[0,cy-120],[7,cy-20],[0,cy+26]])} fill="#C9C3DC"/>
  </g>
  <circle cx={0} cy={cy} r={14} fill={C.purple}/><circle cx={0} cy={cy} r={6} fill={C.lavender}/>
  <circle cx={0} cy={cy} r={R} fill="none" stroke="#fff" strokeOpacity={.08} strokeWidth={2}/>
  <path d={`M ${-R*.72} ${cy-R*.5} A ${R*.88} ${R*.88} 0 0 1 ${-R*.2} ${cy-R*.84}`} fill="none" stroke="#fff" strokeOpacity={.12} strokeWidth={8} strokeLinecap="round"/>
 </g>;
}

/* ───────────── Dispatcher ───────────── */
export function NetArt({kind,o,t,a,xray,uid,overlay}:NetArtProps){
 const rows=o?.rows??1;
 switch(kind){
  case "net-globe":return <NetGlobe t={t} a={a} o={o} xray={xray} overlay={overlay} uid={uid} stand={rows!==2}/>;
  case "sea-cable":return <SeaCable t={t} a={a} o={o} xray={xray} overlay={overlay} uid={uid}/>;
  case "smartphone":return overlay?null:<Smartphone t={t} a={a} o={o} rows={rows} uid={uid}/>;
  case "card-terminal":return overlay?null:<CardTerminal t={t} a={a} rows={rows} uid={uid}/>;
  case "airport":return overlay?null:<Airport t={t} a={a} o={o} uid={uid}/>;
  case "cargo-port":return overlay?null:<CargoPort t={t} a={a} o={o} uid={uid}/>;
  case "gps-satellite":return overlay?null:<GpsSatellite t={t} a={a} rows={rows} uid={uid}/>;
  case "day-dial":return overlay?null:<DayDial t={t} a={a}/>;
 }
 return null;
}
