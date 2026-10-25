// Dispatch catalog of «Изометрия» (src/lib/isometric-hex.ts): hexagon grid on the ground with lit cells, a river with
// bridges, one-way streets with flowing chevrons, driver cars with word-anchored states and tags, crow-flies lines and
// match arcs. Prepared components only; every value is a function of the plan and the frame time (no randomness).
import React,{useEffect,useMemo} from "react";
import * as THREE from "three";
import {project,type IsoPose} from "../src/lib/isometric";
import {
 cellShown,cellMix,hexCorners,hexCenter,HEX_WALL,driverState,lineState,linePoint,oneWayState,oneWayEnds,RIVER_HALF,pingRings,endpoint,
 type DispatchTimeline,
} from "../src/lib/isometric-hex";
import brand from "../video-design/brand.json";

const C=brand.colors;
const TONE={info:C.lavender,ok:C.green,warn:C.pink,number:C.yellow} as const;
const col=(hex:string)=>new THREE.Color(hex);
// State colours of a lit cell: off · ring · focus · supply · demand.
const CELL=[col("#000000"),col(C.lavender),col(C.yellow),col(C.green),col(C.pink)];
const GRID_LINE=col("#7A5CC0");
const clamp01=(x:number)=>Math.min(1,Math.max(0,x));

const additive={transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false,vertexColors:true,side:THREE.DoubleSide} as const;
function useGeo(build:()=>THREE.BufferGeometry|null,deps:unknown[]){const geo=useMemo(build,deps);useEffect(()=>()=>geo?.dispose(),[geo]);return geo;}
function geometry(pos:number[],cols:number[],idx:number[]){const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));g.setIndex(idx);return g;}
/** Thin flat quad from a to b on the plane y (width w), coloured c·k. */
function flatQuad(pos:number[],cols:number[],idx:number[],a:[number,number],b:[number,number],y:number,w:number,c:THREE.Color,k:number){
 const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,sx=-dz/l*w/2,sz=dx/l*w/2,o=pos.length/3;
 pos.push(a[0]+sx,y,a[1]+sz,a[0]-sx,y,a[1]-sz,b[0]+sx,y,b[1]+sz,b[0]-sx,y,b[1]-sz);
 for(let i=0;i<4;i++)cols.push(c.r*k,c.g*k,c.b*k);
 idx.push(o,o+1,o+2,o+1,o+3,o+2);
}

// ---- Hexagon grid -----------------------------------------------------------------------------------------------------
function HexGrid({g,t}:{g:NonNullable<DispatchTimeline["grid"]>;t:number}){
 const key=Math.round(t*30);
 const geos=useMemo(()=>{
  const lp:number[]=[],lc:number[]=[],li:number[]=[],fp:number[]=[],fc:number[]=[],fi:number[]=[],wp:number[]=[],wc:number[]=[],wi:number[]=[];
  const c=new THREE.Color();
  for(const cell of g.cells){
   const k=cellShown(g,cell.d,t);if(k<=.002)continue;
   const v=cellMix(g,cell.q,cell.r,t),lit=1-v[0];
   c.setRGB(0,0,0);for(let j=1;j<5;j++){c.r+=CELL[j].r*v[j];c.g+=CELL[j].g*v[j];c.b+=CELL[j].b*v[j];}
   const corners=hexCorners(g,cell.q,cell.r,.985);
   // Base outline of every cell; lit cells add a brighter inner outline, a fill and a light wall.
   // The outermost ring is drawn fainter, so the grid fades into the city instead of ending on a hard hexagon.
   const rim=cell.d===g.rings?.4:cell.d===g.rings-1?.75:1;
   for(let e=0;e<6;e++)flatQuad(lp,lc,li,corners[e],corners[(e+1)%6],.075,.055,GRID_LINE,.55*k*rim);
   if(lit>.002){
    const inner=hexCorners(g,cell.q,cell.r,.9);
    for(let e=0;e<6;e++)flatQuad(lp,lc,li,inner[e],inner[(e+1)%6],.08,.09,c,1.1*k);
    const [cx,cz]=hexCenter(g,cell.q,cell.r),o=fp.length/3;
    fp.push(cx,.078,cz);fc.push(c.r*.22*k,c.g*.22*k,c.b*.22*k);
    for(const [x,z] of inner){fp.push(x,.078,z);fc.push(c.r*.3*k,c.g*.3*k,c.b*.3*k);}
    for(let e=0;e<6;e++)fi.push(o,o+1+e,o+1+(e+1)%6);
    let h=0;for(let j=1;j<5;j++)h+=HEX_WALL[(["off","ring","focus","supply","demand"] as const)[j]]*v[j];
    // The rider cell breathes slowly (continuous in time).
    h*=1+.08*v[2]*Math.sin(t*2.2);
    for(let e=0;e<6;e++){const a=inner[e],b=inner[(e+1)%6],ow=wp.length/3;
     wp.push(a[0],.08,a[1],b[0],.08,b[1],a[0],.08+h,a[1],b[0],.08+h,b[1]);
     const bottom=.5*k;wc.push(c.r*bottom,c.g*bottom,c.b*bottom,c.r*bottom,c.g*bottom,c.b*bottom,0,0,0,0,0,0);
     wi.push(ow,ow+1,ow+2,ow+1,ow+3,ow+2);}
   }
  }
  return {line:lp.length?geometry(lp,lc,li):null,fill:fp.length?geometry(fp,fc,fi):null,wall:wp.length?geometry(wp,wc,wi):null};
 },[g,key]);
 useEffect(()=>()=>{geos.line?.dispose();geos.fill?.dispose();geos.wall?.dispose();},[geos]);
 return <>
  {geos.fill&&<mesh geometry={geos.fill} renderOrder={3}><meshBasicMaterial {...additive}/></mesh>}
  {geos.line&&<mesh geometry={geos.line} renderOrder={3}><meshBasicMaterial {...additive}/></mesh>}
  {geos.wall&&<mesh geometry={geos.wall} renderOrder={4}><meshBasicMaterial {...additive}/></mesh>}
 </>;
}

// ---- River ------------------------------------------------------------------------------------------------------------
function River({tl,t}:{tl:DispatchTimeline;t:number}){
 const rv=tl.river!,cut=tl.cut!,alongX=rv.axis==="x",c=cut.centre,W=RIVER_HALF*2,LEN=120;
 // Water plane, rotated so that its long side follows the river.
 const place=(along:number,across:number,y:number):[number,number,number]=>alongX?[along,y,c+across]:[c+across,y,along];
 const key=Math.round(t*30);
 const ripples=useGeo(()=>{
  const pos:number[]=[],cols:number[]=[],idx:number[]=[],tint=col(C.lavender);
  // Short wavy strokes drifting downstream: each stroke is two segments of a shallow wave, brightness breathing slowly.
  for(let lane=0;lane<6;lane++){
   const across0=-RIVER_HALF*.78+lane*RIVER_HALF*.31,speed=.3+.1*(lane%3),len=.42+.12*(lane%2);
   for(let i=-44;i<44;i++){
    const along=i*1.7+(lane%2)*.85+((t*speed+lane*.61)%1.7),across=across0+.08*Math.sin(i*1.9+lane);
    const P=(u:number):[number,number]=>{const al=along+len*u,ac=across+.05*Math.sin(u*Math.PI);return alongX?[al,c+ac]:[c+ac,al];};
    const k=.22+.14*Math.sin(t*1.1+i*.7+lane*1.3);
    flatQuad(pos,cols,idx,P(0),P(.5),.012,.04,tint,k);flatQuad(pos,cols,idx,P(.5),P(1),.012,.04,tint,k);
   }
  }
  return geometry(pos,cols,idx);
 },[key,rv.axis,c]);
 return <group>
  <mesh position={place(0,0,.006)} rotation={[-Math.PI/2,0,alongX?0:Math.PI/2]} receiveShadow><planeGeometry args={[LEN,W]}/><meshStandardMaterial color="#2A2160" roughness={.3} metalness={.2}/></mesh>
  <mesh position={place(0,0,.009)} rotation={[-Math.PI/2,0,alongX?0:Math.PI/2]} renderOrder={2}><planeGeometry args={[LEN,W*.55]}/><meshBasicMaterial color="#3A2E7A" transparent opacity={.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
  {ripples&&<mesh geometry={ripples} renderOrder={2}><meshBasicMaterial {...additive}/></mesh>}
  {[-1,1].map(sd=><group key={sd}>
   <mesh position={place(0,sd*(RIVER_HALF+.04),.05)} castShadow receiveShadow><boxGeometry args={alongX?[LEN,.1,.1]:[.1,.1,LEN]}/><meshStandardMaterial color="#2C2540" roughness={.8}/></mesh>
   <mesh position={place(0,sd*(RIVER_HALF-.01),.102)}><boxGeometry args={alongX?[LEN,.006,.03]:[.03,.006,LEN]}/><meshBasicMaterial color="#7A5CC0" toneMapped={false} fog={false}/></mesh>
  </group>)}
  {cut.bridges.map((b,i)=>{
   const p=(across:number,y:number):[number,number,number]=>alongX?[b,y,c+across]:[c+across,y,b];
   const span=W+.5;
   return <group key={i}>
    <mesh position={p(0,-.035)} castShadow receiveShadow><boxGeometry args={alongX?[1.2,.1,span]:[span,.1,1.2]}/><meshStandardMaterial color="#3A3346" roughness={.85}/></mesh>
    {[-1,1].map(sd=><mesh key={sd} position={alongX?[b+sd*.58,.07,c]:[c,.07,b+sd*.58]}><boxGeometry args={alongX?[.05,.1,span]:[span,.1,.05]}/><meshBasicMaterial color={C.lavender} toneMapped={false} fog={false}/></mesh>)}
    {[-.9,.9].map(a=><mesh key={a} position={p(a,-.12)}><boxGeometry args={alongX?[.9,.16,.16]:[.16,.16,.9]}/><meshStandardMaterial color="#2C2540" roughness={.9}/></mesh>)}
   </group>;
  })}
 </group>;
}

// ---- One-way streets ----------------------------------------------------------------------------------------------------
function OneWay({o,t}:{o:DispatchTimeline["oneWay"][number];t:number}){
 const k=oneWayState(o,t).k;
 const key=Math.round(t*30);
 const geo=useGeo(()=>{
  if(k<=.002)return null;
  const [a,b]=oneWayEnds(o),len=Math.hypot(b[0]-a[0],b[2]-a[2]),ux=(b[0]-a[0])/len,uz=(b[2]-a[2])/len,sx=-uz,sz=ux;
  const pos:number[]=[],cols:number[]=[],idx:number[]=[],tint=col(C.yellowLine),gap=.8,phase=(t*.75)%gap;
  for(let d=phase;d<len;d+=gap){
   // Each chevron fades in over the first and out over the last metre, so the flow never pops at the ends.
   const edge=clamp01(d/.9)*clamp01((len-d)/.9),x=a[0]+ux*d,z=a[2]+uz*d,arm=.26;
   for(const sd of [-1,1])flatQuad(pos,cols,idx,[x-ux*arm+sx*arm*sd,z-uz*arm+sz*arm*sd],[x,z],.03,.085,tint,1.1*k*edge);
  }
  return pos.length?geometry(pos,cols,idx):null;
 },[o,key,k>.002]);
 if(k<=.002)return null;
 const [a,b]=oneWayEnds(o),len=Math.hypot(b[0]-a[0],b[2]-a[2]),ux=(b[0]-a[0])/len,uz=(b[2]-a[2])/len;
 const yaw=Math.atan2(-uz,ux);
 // Sign at the entry: pole with a plate carrying an arrow towards the allowed direction.
 const sx=a[0]+ux*.7-uz*.62,sz=a[2]+uz*.7+ux*.62;
 return <group>
  {geo&&<mesh geometry={geo} renderOrder={3}><meshBasicMaterial {...additive}/></mesh>}
  <group position={[sx,0,sz]} scale={[1,Math.max(.001,k),1]}>
   <mesh position={[0,.32,0]} castShadow><boxGeometry args={[.04,.64,.04]}/><meshStandardMaterial color="#5B4A7A" roughness={.7}/></mesh>
   <group position={[0,.66,0]} rotation={[0,yaw,0]}>
    <mesh><boxGeometry args={[.42,.17,.03]}/><meshBasicMaterial color={C.card} toneMapped={false}/></mesh>
    <mesh position={[0,0,.02]}><boxGeometry args={[.4,.15,.01]}/><meshBasicMaterial color="#2C2540" toneMapped={false}/></mesh>
    <mesh position={[-.04,0,.03]}><boxGeometry args={[.2,.035,.01]}/><meshBasicMaterial color={C.yellowLine} toneMapped={false}/></mesh>
    <mesh position={[.1,0,.03]} rotation={[0,0,-Math.PI/2]}><coneGeometry args={[.05,.1,3]}/><meshBasicMaterial color={C.yellowLine} toneMapped={false}/></mesh>
   </group>
  </group>
 </group>;
}

// ---- Drivers ------------------------------------------------------------------------------------------------------------
type Part={x:number;y:number;z:number;sx:number;sy:number;sz:number};
const BODY:Part={x:0,y:.1,z:0,sx:.5,sy:.13,sz:.27},CABIN:Part={x:-.04,y:.215,z:0,sx:.26,sy:.1,sz:.23};
const LIGHTS=[-1,1].flatMap(sd=>[{x:.252,y:.1,z:.08*sd,sx:.02,sy:.045,sz:.06,c:C.ivory},{x:-.252,y:.1,z:.08*sd,sx:.02,sy:.045,sz:.06,c:C.pink}]);
const IVORY=col(C.ivory),LAVENDER=col(C.lavender),DIMC=col("#4A4458"),CARD=col(C.card),PURPLE=col(C.purple);
const hex=(c:THREE.Color)=>`#${c.getHexString()}`;
const pulses=(t:number,period:number,n=2)=>Array.from({length:n},(_,o)=>{const ph=((t/period+o/n)%1+1)%1;return {ph,a:Math.sin(Math.PI*ph)};});
function Driver({v,t}:{v:DispatchTimeline["drivers"][number];t:number}){
 const s=driverState(v,t);if(s.k<=.001)return null;
 const [,cand,chosen,busy,dim]=s.w;
 const body=IVORY.clone().lerp(LAVENDER,chosen).lerp(DIMC,dim),cabin=CARD.clone().lerp(PURPLE,chosen);
 const scale=1.5*s.k*(1+.12*chosen-.06*dim);
 return <group position={[s.p[0],s.p[1],s.p[2]]}>
  <group rotation={[0,s.yaw,0]} scale={Math.max(.001,scale)} position={[0,.02,0]}>
   <mesh position={[BODY.x,BODY.y,BODY.z]} castShadow><boxGeometry args={[BODY.sx,BODY.sy,BODY.sz]}/><meshStandardMaterial color={hex(body)} roughness={.55}/></mesh>
   <mesh position={[CABIN.x,CABIN.y,CABIN.z]} castShadow><boxGeometry args={[CABIN.sx,CABIN.sy,CABIN.sz]}/><meshStandardMaterial color={hex(cabin)} roughness={.55}/></mesh>
   {LIGHTS.map((l,i)=><mesh key={i} position={[l.x,l.y,l.z]}><boxGeometry args={[l.sx,l.sy,l.sz]}/><meshBasicMaterial color={l.c} toneMapped={false} transparent opacity={1-.6*dim}/></mesh>)}
   {busy>.002&&<group position={[-.04,.29,0]} scale={[1,Math.max(.001,busy),1]}>
    <mesh><boxGeometry args={[.12,.06,.1]}/><meshBasicMaterial color={C.pink} toneMapped={false}/></mesh>
    <mesh renderOrder={5}><sphereGeometry args={[.13,14,10]}/><meshBasicMaterial color={C.pink} transparent opacity={.35*busy} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
   </group>}
  </group>
  {cand>.002&&<group position={[0,.04,0]}>
   <mesh rotation={[-Math.PI/2,0,0]} scale={.9+.1*cand}><ringGeometry args={[.52,.6,48]}/><meshBasicMaterial color={C.lavender} transparent opacity={.85*cand*s.k} toneMapped={false} fog={false}/></mesh>
   {pulses(t,1.4).map((p,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} renderOrder={4}><ringGeometry args={[.6+.6*p.ph-.04,.6+.6*p.ph,48]}/><meshBasicMaterial color={C.lavender} transparent opacity={p.a*.45*cand*s.k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>)}
  </group>}
  {chosen>.002&&<group position={[0,.045,0]}>
   <mesh rotation={[-Math.PI/2,0,0]} scale={.88+.12*chosen}><ringGeometry args={[.62,.74,48]}/><meshBasicMaterial color={C.yellow} transparent opacity={chosen*s.k} toneMapped={false} fog={false}/></mesh>
   <mesh rotation={[-Math.PI/2,0,0]} renderOrder={4}><circleGeometry args={[1.15,40]}/><meshBasicMaterial color={C.yellow} transparent opacity={.16*chosen*s.k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
  </group>}
 </group>;
}

// ---- Lines --------------------------------------------------------------------------------------------------------------
function Line({tl,l,t}:{tl:DispatchTimeline;l:DispatchTimeline["lines"][number];t:number}){
 const s=lineState(tl,l,t),color=col(TONE[l.tone]);
 const key=Math.round(t*30);
 const geo=useGeo(()=>{
  if(s.k<=.002||s.draw<=.01)return null;
  if(l.style==="assign"){const pts=Array.from({length:41},(_,i)=>new THREE.Vector3(...linePoint("assign",s.a,s.b,s.draw*i/40)));return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.06,6,false);}
  // Crow: dashes of 0.32 with gaps of 0.2 along the straight segment, drawn from the start.
  const pos:number[]=[],cols:number[]=[],idx:number[]=[],L=Math.hypot(s.b[0]-s.a[0],s.b[2]-s.a[2]),end=L*s.draw,ux=(s.b[0]-s.a[0])/(L||1),uz=(s.b[2]-s.a[2])/(L||1);
  for(let d=0;d<end;d+=.52){const e=Math.min(end,d+.32);
   flatQuad(pos,cols,idx,[s.a[0]+ux*d,s.a[2]+uz*d],[s.a[0]+ux*e,s.a[2]+uz*e],s.a[1],.2,color,.3*s.k);
   flatQuad(pos,cols,idx,[s.a[0]+ux*d,s.a[2]+uz*d],[s.a[0]+ux*e,s.a[2]+uz*e],s.a[1]+.004,.07,color,1.1*s.k);}
  return pos.length?geometry(pos,cols,idx):null;
 },[l,key,s.k>.002]);
 if(!geo)return null;
 const head=linePoint(l.style,s.a,s.b,s.draw);
 const dots=l.style==="assign"&&s.draw>=1?[0,1,2].map(i=>{const ph=(((t-l.enterAt-.8)*.6+i/3)%1+1)%1;return {p:linePoint("assign",s.a,s.b,ph),a:Math.sin(Math.PI*ph)};}):[];
 return <group>
  {l.style==="assign"?<mesh geometry={geo} renderOrder={3}><meshBasicMaterial color={TONE[l.tone]} transparent opacity={.9*s.k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
   :<mesh geometry={geo} renderOrder={3}><meshBasicMaterial {...additive}/></mesh>}
  {[s.a,head].map((p,i)=><mesh key={i} position={p} renderOrder={5}><sphereGeometry args={[.08,14,10]}/><meshBasicMaterial color={TONE[l.tone]} transparent opacity={s.k} toneMapped={false} fog={false}/></mesh>)}
  {dots.map((d,i)=><mesh key={`d${i}`} position={d.p} renderOrder={5}><sphereGeometry args={[.085,14,10]}/><meshBasicMaterial color={C.ivory} transparent opacity={d.a*s.k} toneMapped={false} fog={false}/></mesh>)}
 </group>;
}

function Ping({tl,g,t}:{tl:DispatchTimeline;g:DispatchTimeline["pings"][number];t:number}){
 const rings=pingRings(g,t);if(rings.every(r=>r.a<=.002))return null;
 const p=endpoint(tl,g.target,t,.05),color=TONE[g.tone];
 return <group position={p}>{rings.map((r,i)=>r.a>.002&&<mesh key={i} rotation={[-Math.PI/2,0,0]} renderOrder={4}><ringGeometry args={[Math.max(.01,r.r-.07),r.r,64]}/><meshBasicMaterial color={color} transparent opacity={.8*r.a} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} side={THREE.DoubleSide}/></mesh>)}</group>;
}
/** 3D part of the dispatch layer (inside the Three canvas). */
export function DispatchScene({tl,t}:{tl:DispatchTimeline;t:number}){
 return <>
  {tl.river&&<River tl={tl} t={t}/>}
  {tl.grid&&<HexGrid g={tl.grid} t={t}/>}
  {tl.oneWay.map(o=><OneWay key={o.id} o={o} t={t}/>)}
  {tl.lines.map(l=><Line key={l.id} tl={tl} l={l} t={t}/>)}
  {tl.drivers.map(v=><Driver key={v.id} v={v} t={t}/>)}
  {tl.pings.map((g,i)=><Ping key={i} tl={tl} g={g} t={t}/>)}
 </>;
}

// ---- Overlay tags (studio design code, same look as the core marker tags) --------------------------------------------------
const enterStyle=(k:number):React.CSSProperties=>({opacity:k,transform:`translateY(${(1-k)*18}px) scale(${.88+.12*k})`});
function Tag({x,y,text,color,k,width,top,bottom}:{x:number;y:number;text:string;color:string;k:number;width:number;top:number;bottom:number}){
 const outside=Math.max(0,-x,x-width,top-(y-76),y-bottom),inView=clamp01(1-outside/70);if(k*inView<=.005)return null;
 return <div style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-100%)",pointerEvents:"none",opacity:inView}}>
  <div style={{...enterStyle(k),transformOrigin:"50% 100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
   <div style={{padding:"8px 16px",background:"#120C1DEB",border:`2px solid ${color}`,borderRadius:12,color,fontSize:26,fontWeight:800,letterSpacing:1.2,whiteSpace:"nowrap",textTransform:"uppercase"}}>{text}</div>
   <div style={{width:2,height:18,background:color}}/>
  </div>
 </div>;
}
/** Screen tags of drivers and line labels (projected with the same orthographic camera). */
export function DispatchTags({tl,t,pose,width,height,top,bottom}:{tl:DispatchTimeline;t:number;pose:IsoPose;width:number;height:number;top:number;bottom:number}){
 const out:React.ReactNode[]=[];
 for(const v of tl.drivers){const s=driverState(v,t);if(s.k<=.002)continue;const q=project([s.p[0],s.p[1]+.62,s.p[2]],pose,width,height);
  s.tags.forEach((g,i)=>{if(g.text&&g.k>.002)out.push(<Tag key={`${v.id}-${i}`} x={q.x} y={q.y} text={g.text} color={TONE[g.tone]} k={g.k} width={width} top={top} bottom={bottom}/>);});}
 for(const l of tl.lines){if(!l.text)continue;const s=lineState(tl,l,t),k=s.k*clamp01((s.draw-.6)/.4);if(k<=.002)continue;const m=linePoint(l.style,s.a,s.b,.5),q=project([m[0],m[1]+.15,m[2]],pose,width,height);
  out.push(<Tag key={`line-${l.id}`} x={q.x} y={q.y} text={l.text} color={TONE[l.tone]} k={k} width={width} top={top} bottom={bottom}/>);}
 return <>{out}</>;
}
