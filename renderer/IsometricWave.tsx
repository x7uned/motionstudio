// isometric/v1 · ring road with backward braking waves (prepared object, src/lib/isometric-wave.ts).
// A closed one-way loop around city blocks: asphalt band, lane edges, a glowing lane ribbon coloured by the local
// slowdown (lavender free · yellow slow · pink stopped), low-poly cars with wheels, cabins, head/tail lights and brake
// glow, highlighted role cars (you · the driver who eased off · the computer-controlled car with its roof sensor),
// backward chevrons under a labelled wave and HTML tags that follow their car. Every value is a function of the frame
// time through the precomputed, deterministic ring timeline; no randomness, no generated code.
import React,{useEffect,useMemo} from "react";
import * as THREE from "three";
import {project,type IsoPose} from "../src/lib/isometric";
import {
 RING,ringAlong,ringSigma,ringDrawn,ringShown,ringLead,ringCarState,ringCarRoles,ringTagState,waveLabelState,waveAt,clamp01,
 type RingTl,
} from "../src/lib/isometric-wave";
import brand from "../video-design/brand.json";

const C=brand.colors;
const col=(hex:string)=>new THREE.Color(hex);
const LAV=col(C.lavender),PURPLE=col(C.purple),YELLOW=col(C.yellow),PINK=col(C.pink),GREEN=col(C.green);
const smoothstep=(x:number)=>{const t=clamp01(x);return t*t*(3-2*t);};
/** Slowdown σ → lane colour: free keeps the base, half speed turns yellow, standing still turns pink. */
function laneColor(sigma:number,base:THREE.Color,out=new THREE.Color()){
 const y=smoothstep(sigma/.5)*(1-smoothstep((sigma-.5)/.4)),p=smoothstep((sigma-.45)/.45),g=Math.max(0,1-y-p);
 return out.setRGB(base.r*g+YELLOW.r*y+PINK.r*p,base.g*g+YELLOW.g*y+PINK.g*p,base.b*g+YELLOW.b*y+PINK.b*p);
}

// ---- Road -----------------------------------------------------------------------------------------------------------
type Layer={width:number;lift:number;base:THREE.Color|null;gain:number;additive:boolean;flat?:string};
const LAYERS:Layer[]=[
 {width:1.12,lift:.012,base:null,gain:1,additive:false,flat:"#1B1726"},
 {width:.86,lift:.016,base:PURPLE,gain:.13,additive:true},
 {width:.3,lift:.022,base:PURPLE,gain:.38,additive:true},
 {width:.1,lift:.028,base:LAV,gain:1,additive:false},
];
function bandGeometry(r:RingTl,end:number,layer:Layer,t:number,fade:number,offset=0,width=layer.width){
 const pos:number[]=[],cols:number[]=[],idx:number[]=[],c=new THREE.Color(),flat=layer.flat?col(layer.flat):null;
 const samples:number[]=[];
 for(let s=0;s<end;s+=.08)samples.push(s);
 samples.push(end);
 for(const s of samples){
  const {p,side}=ringAlong(r.path,s),w=width/2,cx=p[0]+side[0]*offset,cz=p[2]+side[1]*offset;
  if(flat)c.copy(flat);else laneColor(ringSigma(r.waves,r.path.L,s,t),layer.base!,c);
  // The drawing tip tapers over the last 0.5 units so the ribbon grows instead of appearing as a slab.
  const k=layer.gain*fade*(end<r.path.L-1e-6?smoothstep((end-s)/.5):1);
  pos.push(cx+side[0]*w,p[1]+layer.lift,cz+side[1]*w,cx-side[0]*w,p[1]+layer.lift,cz-side[1]*w);
  const kk=flat?1:k;cols.push(c.r*kk,c.g*kk,c.b*kk,c.r*kk,c.g*kk,c.b*kk);
 }
 for(let i=1;i<samples.length;i++){const o=(i-1)*2;idx.push(o,o+1,o+2,o+1,o+3,o+2);}
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));geo.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));geo.setIndex(idx);
 return geo;
}
function Band({r,t,layer,offset=0,width}:{r:RingTl;t:number;layer:Layer;offset?:number;width?:number}){
 const end=ringDrawn(r,t),fade=ringShown(r,t);
 const geo=useMemo(()=>end>.02&&fade>.002?bandGeometry(r,end,layer,t,fade,offset,width):null,[r,end,t,layer,fade,offset,width]);
 useEffect(()=>()=>geo?.dispose(),[geo]);
 if(!geo)return null;
 // The asphalt band fades with the ribbon (transparent only while leaving), the glow layers blend additively.
 const blend=layer.additive||fade<.999;
 return <mesh geometry={geo} renderOrder={layer.additive?3:2} receiveShadow={!!layer.flat}>
  <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} fog={false} transparent={blend} opacity={layer.flat?fade:1} blending={layer.additive?THREE.AdditiveBlending:THREE.NormalBlending} depthWrite={!blend}/>
 </mesh>;
}
const EDGE:Layer={width:.035,lift:.018,base:null,gain:1,additive:false,flat:"#3A3346"};
function Lead({r,t}:{r:RingTl;t:number}){
 const k=ringLead(r,t);if(k<=.001)return null;
 const {p}=ringAlong(r.path,ringDrawn(r,t));
 return <group position={[p[0],p[1]+.09,p[2]]} scale={k}>
  <mesh><sphereGeometry args={[.1,20,14]}/><meshBasicMaterial color={C.yellow} toneMapped={false} fog={false}/></mesh>
  <mesh renderOrder={5}><sphereGeometry args={[.3,20,14]}/><meshBasicMaterial color={C.yellow} transparent opacity={.28} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
 </group>;
}

// ---- Backward chevrons under a labelled wave -----------------------------------------------------------------------
const chevron=(()=>{const s=new THREE.Shape();s.moveTo(-.16,0);s.lineTo(.1,-.2);s.lineTo(.2,-.2);s.lineTo(-.06,0);s.lineTo(.2,.2);s.lineTo(.1,.2);s.closePath();return s;})();
function Chevrons({r,t}:{r:RingTl;t:number}){
 const geo=useMemo(()=>new THREE.ShapeGeometry(chevron),[]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 return <>{r.waves.map((w,j)=>{
  const l=waveLabelState(w,r.path.L,t);if(l.k<=.002)return null;
  // Three chevrons ride the wave centre and point against the traffic (the direction the jam travels).
  return <group key={j}>{[-1,0,1].map(o=>{
   const s=l.s+o*.75,{p,yaw}=ringAlong(r.path,s),pulse=.55+.45*Math.sin((t-w.at)*4-o*1.4);
   return <mesh key={o} geometry={geo} position={[p[0],.05,p[2]]} rotation={[-Math.PI/2,0,yaw]} scale={(.88+.12*l.k)*1.25} renderOrder={6}>
    <meshBasicMaterial color={C.pink} transparent opacity={l.k*(.45+.45*pulse)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} side={THREE.DoubleSide}/>
   </mesh>;})}</group>;
 })}</>;
}

// ---- Cars -----------------------------------------------------------------------------------------------------------
const BODY_COLORS=["#3A3346","#4A4060","#2C2D28","#5B4A7A","#FDFEED","#3A3346","#433B54","#2A2536","#E0CDF8","#4A4060","#2C2D28"];
const WHEELS=[[.16,.14],[.16,-.14],[-.16,.14],[-.16,-.14]] as const;
function RingCar({r,i,t}:{r:RingTl;i:number;t:number}){
 const c=ringCarState(r,i,t);if(c.k<=.001)return null;
 const roles=ringCarRoles(r,i,t),{p,yaw}=ringAlong(r.path,c.s);
 const body=col(BODY_COLORS[i%BODY_COLORS.length]).lerp(LAV,roles.hero).lerp(YELLOW,roles.starter).lerp(GREEN,roles.auto);
 const cabin=col(C.card).lerp(PURPLE,roles.hero*.8);
 const tail=col("#5A1424").lerp(PINK,.35+.65*c.brake);
 const spin=(t-r.goAt)*3.2;
 return <group position={[p[0],.02,p[2]]} rotation={[0,yaw,0]}>
  <group scale={RING.carScale*Math.max(.001,c.k)}>
   <mesh position={[0,.1,0]} castShadow><boxGeometry args={[.5,.12,.27]}/><meshStandardMaterial color={body} roughness={.55}/></mesh>
   <mesh position={[-.03,.205,0]} castShadow><boxGeometry args={[.27,.09,.23]}/><meshStandardMaterial color={cabin} roughness={.4}/></mesh>
   <mesh position={[.105,.205,0]}><boxGeometry args={[.012,.07,.2]}/><meshBasicMaterial color="#5B4A7A" toneMapped={false}/></mesh>
   {WHEELS.map(([x,z],k)=><mesh key={k} position={[x,.045,z]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.045,.045,.04,10]}/><meshStandardMaterial color="#0E0B14" roughness={.9}/></mesh>)}
   {[-1,1].map(sd=><mesh key={`h${sd}`} position={[.252,.1,.08*sd]}><boxGeometry args={[.02,.04,.06]}/><meshBasicMaterial color={C.ivory} toneMapped={false}/></mesh>)}
   {[-1,1].map(sd=><mesh key={`t${sd}`} position={[-.252,.1,.08*sd]}><boxGeometry args={[.02,.045,.065]}/><meshBasicMaterial color={tail} toneMapped={false}/></mesh>)}
   {roles.auto>.001&&<group position={[-.03,.27,0]} rotation={[0,spin,0]} scale={Math.max(.001,roles.auto)}>
    <mesh><cylinderGeometry args={[.06,.07,.05,12]}/><meshBasicMaterial color={C.green} toneMapped={false}/></mesh>
    <mesh position={[.05,0,0]}><boxGeometry args={[.03,.03,.03]}/><meshBasicMaterial color={C.ivory} toneMapped={false}/></mesh>
   </group>}
  </group>
  {c.brake>.01&&<>
   <mesh position={[-.36*RING.carScale,.12,0]} renderOrder={5}><sphereGeometry args={[.17,16,10]}/><meshBasicMaterial color={C.pink} transparent opacity={.42*c.brake*c.k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
   <mesh position={[-.62*RING.carScale,.03,0]} rotation={[-Math.PI/2,0,0]} scale={[1.6,1,1]} renderOrder={4}><circleGeometry args={[.22,24]}/><meshBasicMaterial color={C.pink} transparent opacity={.22*c.brake*c.k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
  </>}
  {roles.hero>.001&&<mesh position={[0,.03,0]} rotation={[-Math.PI/2,0,0]} renderOrder={4}><circleGeometry args={[.66,40]}/><meshBasicMaterial color={C.purple} transparent opacity={.42*roles.hero*c.k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>}
  {roles.starter>.001&&<mesh position={[0,.03,0]} rotation={[-Math.PI/2,0,0]} renderOrder={4}><circleGeometry args={[.62,40]}/><meshBasicMaterial color={C.yellow} transparent opacity={.3*roles.starter*c.k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>}
  {roles.auto>.001&&<>
   <mesh position={[0,.035,0]} rotation={[-Math.PI/2,0,0]} scale={.88+.12*roles.auto}><ringGeometry args={[.5,.58,48]}/><meshBasicMaterial color={C.green} transparent opacity={.9*roles.auto*c.k} toneMapped={false} fog={false}/></mesh>
   {[0,1].map(o=>{const ph=((((t-r.goAt)/1.4+o/2)%1)+1)%1;return <mesh key={o} position={[0,.035,0]} rotation={[-Math.PI/2,0,0]} renderOrder={4}><ringGeometry args={[.58+.6*ph-.03,.58+.6*ph,48]}/><meshBasicMaterial color={C.green} transparent opacity={Math.sin(Math.PI*ph)*.45*roles.auto*c.k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>;})}
  </>}
 </group>;
}

export function RingScene({r,t}:{r:RingTl;t:number}){
 if(ringShown(r,t)<=.001)return null;
 const edge=(1.12/2-.06);
 return <group>
  <Band r={r} t={t} layer={LAYERS[0]}/>
  <Band r={r} t={t} layer={EDGE} offset={edge}/>
  <Band r={r} t={t} layer={EDGE} offset={-edge}/>
  {LAYERS.slice(1).map((l,i)=><Band key={i} r={r} t={t} layer={l}/>)}
  <Lead r={r} t={t}/>
  <Chevrons r={r} t={t}/>
  {Array.from({length:r.N},(_,i)=><RingCar key={i} r={r} i={i} t={t}/>)}
 </group>;
}

// ---- Overlay tags ---------------------------------------------------------------------------------------------------
const ROLE_COLOR={hero:C.lavender,starter:C.yellow,auto:C.green} as const;
const enterStyle=(k:number):React.CSSProperties=>({opacity:k,transform:`translateY(${(1-k)*18}px) scale(${.88+.12*k})`});
function Tag({x,y,text,color,k,width,top,bottom}:{x:number;y:number;text:string;color:string;k:number;width:number;top:number;bottom:number}){
 // Same tag as the city markers: it fades when its anchor leaves the stage instead of clipping (continuous in time).
 const outside=Math.max(0,-x,x-width,top-(y-86),y-bottom),inView=clamp01(1-outside/70);if(k*inView<=.005)return null;
 return <div style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-100%)",pointerEvents:"none",opacity:inView}}>
  <div style={{...enterStyle(k),transformOrigin:"50% 100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
   <div style={{padding:"10px 20px",background:"#120C1DEB",border:`2px solid ${color}`,borderRadius:14,color,fontSize:30,fontWeight:800,letterSpacing:1.5,whiteSpace:"nowrap",textTransform:"uppercase"}}>{text}</div>
   <div style={{width:2,height:26,background:color}}/>
  </div>
 </div>;
}
export function RingTags({rings,t,pose,width,height,top,bottom}:{rings:RingTl[];t:number;pose:IsoPose;width:number;height:number;top:number;bottom:number}){
 return <>{rings.flatMap(r=>[
  ...r.tags.map((g,j)=>{const k=ringTagState(g,t);if(k<=.002)return null;const c=ringCarState(r,g.car,t),{p}=ringAlong(r.path,c.s),q=project([p[0],.62,p[2]],pose,width,height);
   return <Tag key={`${r.id}-t${j}`} x={q.x} y={q.y} text={g.text} color={ROLE_COLOR[g.role]} k={k*c.k} width={width} top={top} bottom={bottom}/>;}),
  ...r.waves.map((w,j)=>{if(!w.label)return null;const l=waveLabelState(w,r.path.L,t);if(l.k<=.002)return null;const {p}=ringAlong(r.path,l.s),q=project([p[0],.75,p[2]],pose,width,height);
   return <Tag key={`${r.id}-w${j}`} x={q.x} y={q.y} text={w.label.text} color={C.pink} k={l.k*clamp01(waveAt(w,t).A*3)} width={width} top={top} bottom={bottom}/>;}),
 ])}</>;
}
