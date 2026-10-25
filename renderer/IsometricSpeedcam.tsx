// isometric speedcam catalog — prepared road-enforcement objects for the «Изометрия» city (src/lib/isometric-speedcam.ts):
// ANPR gantry with a scanning beam and plate-read flash, spot speed camera on a pole with a radar cone, section bracket,
// word-driven cars with plates and automatic brake lights, lane flows braking for pole cameras, uplink arcs and the
// recorded speed curtain with average/limit guides and the mean-value point. Pure functions of the frame time.
import React,{useEffect,useMemo} from "react";
import * as THREE from "three";
import {project,type IsoPose,type RoutePath,type V3} from "../src/lib/isometric";
import {
 frameOn,speedcamCarState,cameraState,flowCars,sectionState,uplinkState,traceState,traceSpeedAt,plateGlow,
 LANE,GANTRY,POLE,RADAR,type SpeedcamTimeline,
} from "../src/lib/isometric-speedcam";
import brand from "../video-design/brand.json";

const C=brand.colors;
const TONE={info:C.lavender,ok:C.green,warn:C.pink,number:C.yellow} as const;
const clamp01=(x:number)=>Math.min(1,Math.max(0,x));
const smooth=(x:number)=>{const t=clamp01(x);return t*t*(3-2*t);};
const easeEnter=(x:number)=>1-(1-clamp01(x))**3;
const ADD={transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false} as const;
type Tl=SpeedcamTimeline;

/** Point on the route at distance s, shifted across the road by `off` (local +Z). */
const lanePoint=(path:RoutePath,s:number,off:number,lift=0):V3=>{const {p,side}=frameOn(path,s);return [p[0]+side[0]*off,p[1]+lift,p[2]+side[1]*off];};

// ---- Cars -----------------------------------------------------------------------------------------------------------
const WHEELS=[[.18,.145],[.18,-.145],[-.18,.145],[-.18,-.145]] as const;
function headBeamGeometry(){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute([.3,.012,.09, .3,.012,-.09, 1.15,.012,.32, 1.15,.012,-.32],3));
 g.setAttribute("color",new THREE.Float32BufferAttribute([.32,.31,.26, .32,.31,.26, 0,0,0, 0,0,0],3));
 g.setIndex([0,2,1,1,2,3]);return g;
}
export function SpeedCar({path,s,dir=1,lane,scale,body,cabin,brake,plate,ghost=1}:{path:RoutePath;s:number;dir?:1|-1;lane:number;scale:number;body:string;cabin:string;brake:number;plate:number;ghost?:number}){
 const beam=useMemo(headBeamGeometry,[]);useEffect(()=>()=>beam.dispose(),[beam]);
 if(scale<=.001)return null;
 const {p,yaw,pitch,side}=frameOn(path,s),x=p[0]+side[0]*lane,z=p[2]+side[1]*lane;
 const ry=dir>0?yaw:yaw+Math.PI,rp=dir>0?pitch:-pitch;
 const glass="#4B3A73";
 return <group position={[x,p[1]+.02,z]} rotation={[0,ry,rp,"YZX"]} scale={scale}>
  <mesh position={[0,.095,0]} castShadow><boxGeometry args={[.56,.1,.29]}/><meshStandardMaterial color={body} roughness={.5}/></mesh>
  <mesh position={[.19,.152,0]} castShadow><boxGeometry args={[.17,.03,.27]}/><meshStandardMaterial color={body} roughness={.45}/></mesh>
  <mesh position={[-.04,.2,0]} castShadow><boxGeometry args={[.27,.1,.25]}/><meshStandardMaterial color={cabin} roughness={.4}/></mesh>
  <mesh position={[-.04,.26,0]}><boxGeometry args={[.2,.012,.21]}/><meshStandardMaterial color={body} roughness={.5}/></mesh>
  {[1,-1].map(sd=><mesh key={sd} position={[-.04,.205,.126*sd]}><boxGeometry args={[.21,.06,.006]}/><meshBasicMaterial color={glass} toneMapped={false}/></mesh>)}
  <mesh position={[.096,.205,0]}><boxGeometry args={[.006,.07,.21]}/><meshBasicMaterial color={glass} toneMapped={false}/></mesh>
  <mesh position={[-.176,.205,0]}><boxGeometry args={[.006,.065,.21]}/><meshBasicMaterial color={glass} toneMapped={false}/></mesh>
  {WHEELS.map(([wx,wz],i)=><mesh key={i} position={[wx,.055,wz]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.056,.056,.045,12]}/><meshStandardMaterial color="#141018" roughness={.9}/></mesh>)}
  {[1,-1].map(sd=><mesh key={`h${sd}`} position={[.282,.105,.095*sd]}><boxGeometry args={[.014,.034,.06]}/><meshBasicMaterial color={C.ivory} toneMapped={false}/></mesh>)}
  {[1,-1].map(sd=><mesh key={`t${sd}`} position={[-.282,.11,.095*sd]}><boxGeometry args={[.014,.03,.06]}/><meshBasicMaterial color={new THREE.Color("#5A1426").lerp(new THREE.Color(C.pink),.45+.55*brake)} toneMapped={false}/></mesh>)}
  {[.284,-.284].map(px=><mesh key={px} position={[px,.068,0]}><boxGeometry args={[.008,.038,.1]}/><meshBasicMaterial color={C.ivory} toneMapped={false}/></mesh>)}
  {[.284,-.284].map(px=><mesh key={`d${px}`} position={[px+Math.sign(px)*.002,.068,0]}><boxGeometry args={[.006,.012,.07]}/><meshBasicMaterial color="#2A2536" toneMapped={false}/></mesh>)}
  <mesh geometry={beam} renderOrder={3}><meshBasicMaterial vertexColors side={THREE.DoubleSide} {...ADD} opacity={ghost}/></mesh>
  {brake>.01&&<mesh position={[-.34,.11,0]} renderOrder={5}><sphereGeometry args={[.17,16,10]}/><meshBasicMaterial color={C.pink} {...ADD} opacity={.42*brake*ghost}/></mesh>}
  {plate>.01&&[.29,-.29].map(px=><group key={`p${px}`}>
   <mesh position={[px,.068,0]} renderOrder={6}><boxGeometry args={[.02,.075,.16]}/><meshBasicMaterial color={C.yellow} {...ADD} opacity={.95*plate}/></mesh>
   <mesh position={[px+Math.sign(px)*.04,.07,0]} renderOrder={6}><sphereGeometry args={[.13,14,10]}/><meshBasicMaterial color={C.yellow} {...ADD} opacity={.3*plate}/></mesh>
  </group>)}
 </group>;
}
function Cars({tl,t}:{tl:Tl;t:number}){
 return <>{tl.cars.map(c=>{
  const st=speedcamCarState(c,t);if(st.k<=.001)return null;
  const hero=c.tone==="hero";
  // The plate glows after each camera that reads this car.
  const plate=Math.max(0,...tl.cameras.filter(k=>k.reads===c.id&&Number.isFinite(k.readAt)).map(k=>plateGlow(t-k.readAt)*clamp01(cameraState(k,t,tl).k*2)));
  const {p}=frameOn(c.path,st.s),q=lanePoint(c.path,st.s,LANE);
  return <group key={c.id}>
   {hero&&<mesh position={[q[0],p[1]+.03,q[2]]} rotation={[-Math.PI/2,0,0]} renderOrder={4}><circleGeometry args={[.72,40]}/><meshBasicMaterial color={C.purple} {...ADD} opacity={.36*st.k}/></mesh>}
   <SpeedCar path={c.path} s={st.s} lane={LANE} scale={(hero?1.6:1.3)*(.88+.12*st.k)} body={hero?C.lavender:C.ivory} cabin={hero?C.purple:C.card} brake={st.brake} plate={plate}/>
  </group>;
 })}</>;
}
const FLOW_BODY=["#3A3346","#4A4060","#2C2D28","#5B4A7A","#3A3346","#FDFEED","#4A4060"];
function Flows({tl,t}:{tl:Tl;t:number}){
 return <>{tl.flows.flatMap((f,fi)=>flowCars(f,t).map(c=>c.k<=.001?null:
  <SpeedCar key={`${fi}-${c.i}`} path={f.path} s={c.s} dir={f.dir} lane={f.dir>0?LANE:-LANE} scale={1.25*c.k} body={FLOW_BODY[(c.i+fi*3)%FLOW_BODY.length]} cabin={C.card} brake={c.brake} plate={0} ghost={.8}/>))}</>;
}

// ---- Cameras --------------------------------------------------------------------------------------------------------
const STEEL="#5B4A7A",DARK="#2A2536";
function pyramid(apex:V3,quad:V3[]){
 const g=new THREE.BufferGeometry(),pos=[...apex,...quad.flat()];
 g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setIndex([0,1,2,0,2,3,0,3,4,0,4,1]);return g;
}
function Housing({face,flash,scan,tone}:{face:1|-1;flash:number;scan:number;tone:string}){
 // A boxy ANPR camera pitched down towards the lane: sun hood, glowing lens, infrared illuminator dots, status light.
 return <group rotation={[0,face>0?0:Math.PI,0]}>
  <mesh position={[0,.09,0]}><boxGeometry args={[.03,.12,.03]}/><meshStandardMaterial color={STEEL} roughness={.6}/></mesh>
  <group rotation={[0,0,-.42]}>
   <mesh castShadow><boxGeometry args={[.26,.1,.12]}/><meshStandardMaterial color="#3A3346" roughness={.55}/></mesh>
   <mesh position={[.02,.056,0]}><boxGeometry args={[.32,.012,.15]}/><meshStandardMaterial color="#4A4060" roughness={.5}/></mesh>
   <mesh position={[.02,.064,0]}><boxGeometry args={[.22,.006,.02]}/><meshBasicMaterial color={tone} toneMapped={false}/></mesh>
   <mesh position={[.135,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.036,.036,.02,18]}/><meshBasicMaterial color={new THREE.Color("#3C2D5E").lerp(new THREE.Color(C.lavender),.35+.5*scan)} toneMapped={false}/></mesh>
   {[-1,0,1].map(i=><mesh key={i} position={[.131,-.032,.022*i]}><boxGeometry args={[.006,.012,.012]}/><meshBasicMaterial color={new THREE.Color("#4A1424").lerp(new THREE.Color(C.pink),.4+.6*scan)} toneMapped={false}/></mesh>)}
   <mesh position={[-.12,.03,.05]}><sphereGeometry args={[.012,8,6]}/><meshBasicMaterial color={new THREE.Color(C.purple).lerp(new THREE.Color(C.yellow),flash)} toneMapped={false}/></mesh>
   {flash>.005&&<mesh position={[.16,0,0]} renderOrder={6}><sphereGeometry args={[.06+.2*flash,16,12]}/><meshBasicMaterial color={C.ivory} {...ADD} opacity={.9*flash}/></mesh>}
  </group>
 </group>;
}
function Gantry({c,t,tl}:{c:Tl["cameras"][number];t:number;tl:Tl}){
 const st=cameraState(c,t,tl),w=c.deck?GANTRY.deckPost:GANTRY.post,H=GANTRY.top;
 // Footprint of the scan fan on the lane the camera reads (local −X = upstream of the driven lane).
 const fan=useMemo(()=>pyramid([-.18,GANTRY.camY-.1,LANE],[[-1.25,.02,LANE-.3],[.08,.02,LANE-.3],[.08,.02,LANE+.3],[-1.25,.02,LANE+.3]]),[]);
 const fan2=useMemo(()=>pyramid([.18,GANTRY.camY-.1,-LANE],[[1.25,.02,-LANE-.3],[-.08,.02,-LANE-.3],[-.08,.02,-LANE+.3],[1.25,.02,-LANE+.3]]),[]);
 useEffect(()=>()=>{fan.dispose();fan2.dispose();},[fan,fan2]);
 if(st.k<=.001)return null;
 const k=Math.max(.001,st.k),grow=easeEnter(st.k),scanX=-.58-.55*Math.sin(t*2*Math.PI/1.25),tone=TONE[c.tone],B=GANTRY.bar;
 const n=7,lattice=Array.from({length:n},(_,i)=>{const z0=-w+2*w*i/n,z1=-w+2*w*(i+1)/n,dz=z1-z0,len=Math.hypot(dz,GANTRY.bar),a=Math.atan2(GANTRY.bar,dz)*(i%2?-1:1);return {z:(z0+z1)/2,len,a};});
 return <group position={c.point} rotation={[0,c.yaw,0]}>
  <group scale={[1,k,1]}>
   {[1,-1].map(sd=><group key={sd}>
    <mesh position={[0,.025,w*sd]}><boxGeometry args={[.26,.05,.26]}/><meshStandardMaterial color="#3A3346" roughness={.8}/></mesh>
    <mesh position={[0,H/2,w*sd]} castShadow><boxGeometry args={[.1,H,.1]}/><meshStandardMaterial color={STEEL} roughness={.6}/></mesh>
    <mesh position={[0,H*.42,w*sd]}><boxGeometry args={[.12,.016,.12]}/><meshBasicMaterial color={tone} toneMapped={false}/></mesh>
    <mesh position={[0,H*.42+.05,w*sd]}><boxGeometry args={[.115,.012,.115]}/><meshBasicMaterial color={tone} toneMapped={false}/></mesh>
   </group>)}
   <mesh position={[0,GANTRY.beam,0]} castShadow><boxGeometry args={[.08,.07,2*w+.16]}/><meshStandardMaterial color={STEEL} roughness={.6}/></mesh>
   <mesh position={[0,GANTRY.beam+B,0]} castShadow><boxGeometry args={[.08,.07,2*w+.16]}/><meshStandardMaterial color={STEEL} roughness={.6}/></mesh>
   {lattice.map((b,i)=><mesh key={i} position={[0,GANTRY.beam+B/2,b.z]} rotation={[b.a,0,0]}><boxGeometry args={[.035,.035,b.len]}/><meshStandardMaterial color="#6D5A8E" roughness={.6}/></mesh>)}
   <mesh position={[0,GANTRY.beam+B/2,0]}><boxGeometry args={[.1,.16,2*w*.5]}/><meshStandardMaterial color="#1D1628" roughness={.7}/></mesh>
   <mesh position={[-.052,GANTRY.beam+B/2,0]}><boxGeometry args={[.004,.045,2*w*.42]}/><meshBasicMaterial color={tone} toneMapped={false}/></mesh>
   <mesh position={[.052,GANTRY.beam+B/2,0]}><boxGeometry args={[.004,.045,2*w*.42]}/><meshBasicMaterial color={tone} toneMapped={false}/></mesh>
   <group position={[0,GANTRY.camY,LANE]} scale={GANTRY.housing}><Housing face={-1} flash={st.flash} scan={st.scan} tone={tone}/></group>
   <group position={[0,GANTRY.camY,-LANE]} scale={GANTRY.housing}><Housing face={1} flash={0} scan={st.scan*.6} tone={tone}/></group>
  </group>
  <mesh geometry={fan} renderOrder={3}><meshBasicMaterial color={new THREE.Color(C.purple).lerp(new THREE.Color(C.yellow),st.flash)} side={THREE.DoubleSide} {...ADD} opacity={(.12*st.scan+.3*st.flash)*grow}/></mesh>
  <mesh geometry={fan2} renderOrder={3}><meshBasicMaterial color={C.purple} side={THREE.DoubleSide} {...ADD} opacity={.06*st.scan*grow}/></mesh>
  <mesh position={[scanX,.03,LANE]} renderOrder={4}><boxGeometry args={[.05,.008,.58]}/><meshBasicMaterial color={C.lavender} {...ADD} opacity={.85*st.scan*grow}/></mesh>
  <mesh position={[-.58,.025,LANE]} rotation={[-Math.PI/2,0,0]} renderOrder={4}><planeGeometry args={[1.33,.6]}/><meshBasicMaterial color={C.yellow} {...ADD} opacity={.35*st.flash}/></mesh>
  {Number.isFinite(c.readAt)&&t>=c.readAt&&<mesh position={[-.1,.03,LANE]} rotation={[-Math.PI/2,0,0]} renderOrder={5}><ringGeometry args={[.3+1.5*clamp01((t-c.readAt)/.9)-.05,.3+1.5*clamp01((t-c.readAt)/.9),48]}/><meshBasicMaterial color={C.yellow} {...ADD} opacity={.7*(1-smooth((t-c.readAt)/.9))*grow}/></mesh>}
 </group>;
}
/** Ring-geometry angles of the radar cone (the ring lies in XY and is turned flat: (x,y) → (x,0,−y)). */
function radarArc(side:number){
 const dx=RADAR.x1-RADAR.x0,a=Math.atan2(-(RADAR.half-(side-.15)),dx),b=Math.atan2(-(-RADAR.half-(side-.15)),dx);
 let lo=Math.min(a,b),len=Math.abs(a-b);if(len>Math.PI){lo=Math.max(a,b);len=2*Math.PI-len;}
 return {start:lo,length:len};
}
function Pole({c,t,tl}:{c:Tl["cameras"][number];t:number;tl:Tl}){
 const st=cameraState(c,t,tl),side=c.deck?.5:POLE.side,h=c.deck?1.2:POLE.height;
 const cone=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute([RADAR.x0,.022,side-.15, RADAR.x1,.022,RADAR.half, RADAR.x1,.022,-RADAR.half],3));g.setIndex([0,1,2]);return g;},[side]);
 useEffect(()=>()=>cone.dispose(),[cone]);
 if(st.k<=.001)return null;
 const k=Math.max(.001,st.k),grow=easeEnter(st.k),tone=TONE[c.tone];
 const waves=[0,1,2].map(i=>((t*.9+i/3)%1+1)%1),arc=radarArc(side);
 return <group position={c.point} rotation={[0,c.yaw,0]}>
  <group scale={[1,k,1]}>
   <mesh position={[0,.025,side]}><boxGeometry args={[.22,.05,.22]}/><meshStandardMaterial color="#3A3346" roughness={.8}/></mesh>
   <mesh position={[0,h/2,side]} castShadow><cylinderGeometry args={[.045,.058,h,10]}/><meshStandardMaterial color={STEEL} roughness={.55}/></mesh>
   <mesh position={[0,h*.55,side]}><cylinderGeometry args={[.06,.06,.04,10]}/><meshBasicMaterial color={tone} toneMapped={false}/></mesh>
   <mesh position={[0,h*.55+.08,side]}><cylinderGeometry args={[.06,.06,.03,10]}/><meshBasicMaterial color={tone} toneMapped={false}/></mesh>
   <group position={[0,h+.06,side-.06]} scale={POLE.housing}>
    <mesh castShadow><boxGeometry args={[.24,.17,.15]}/><meshStandardMaterial color="#3A3346" roughness={.5}/></mesh>
    <mesh position={[-.124,0,0]}><boxGeometry args={[.012,.16,.14]}/><meshStandardMaterial color={C.yellow} roughness={.5}/></mesh>
    <mesh position={[-.133,.035,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.03,.03,.012,16]}/><meshBasicMaterial color={DARK} toneMapped={false}/></mesh>
    <mesh position={[-.136,.035,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.018,.018,.008,16]}/><meshBasicMaterial color={new THREE.Color("#3C2D5E").lerp(new THREE.Color(C.lavender),.4+.6*st.scan)} toneMapped={false}/></mesh>
    <mesh position={[-.135,-.04,0]}><boxGeometry args={[.01,.04,.09]}/><meshBasicMaterial color={new THREE.Color(DARK).lerp(new THREE.Color(C.pink),.3+.7*st.scan)} toneMapped={false}/></mesh>
    <mesh position={[.02,.095,0]}><boxGeometry args={[.28,.014,.17]}/><meshStandardMaterial color="#4A4060" roughness={.5}/></mesh>
    {st.flash>.005&&<mesh position={[-.16,.02,0]} renderOrder={6}><sphereGeometry args={[.06+.22*st.flash,16,12]}/><meshBasicMaterial color={C.ivory} {...ADD} opacity={.9*st.flash}/></mesh>}
   </group>
  </group>
  <mesh geometry={cone} renderOrder={3}><meshBasicMaterial color={new THREE.Color(C.pink).lerp(new THREE.Color(C.yellow),st.flash)} side={THREE.DoubleSide} {...ADD} opacity={(.1*st.scan+.28*st.flash)*grow}/></mesh>
  {waves.map((ph,i)=><mesh key={i} position={[RADAR.x0,.026,side-.15]} rotation={[-Math.PI/2,0,0]} renderOrder={4}><ringGeometry args={[.2+2.1*ph-.04,.2+2.1*ph,40,1,arc.start,arc.length]}/><meshBasicMaterial color={C.pink} {...ADD} opacity={.5*Math.sin(Math.PI*ph)*st.scan*grow} side={THREE.DoubleSide}/></mesh>)}
 </group>;
}

// ---- Sections, uplinks, trace ---------------------------------------------------------------------------------------
function strip(path:RoutePath,s0:number,s1:number,off:number,lift:number,width:number,height=0){
 // A flat ribbon on the road edge (height 0) or a vertical band (width 0) between route distances s0 and s1.
 const pos:number[]=[],idx:number[]=[],n=Math.max(2,Math.ceil(Math.abs(s1-s0)/.12));
 for(let i=0;i<=n;i++){const s=s0+(s1-s0)*i/n,{p,side}=frameOn(path,s);
  if(height){pos.push(p[0]+side[0]*off,p[1]+lift,p[2]+side[1]*off,p[0]+side[0]*off,p[1]+lift+height,p[2]+side[1]*off);}
  else pos.push(p[0]+side[0]*(off-width/2),p[1]+lift,p[2]+side[1]*(off-width/2),p[0]+side[0]*(off+width/2),p[1]+lift,p[2]+side[1]*(off+width/2));
  if(i)idx.push((i-1)*2,(i-1)*2+1,i*2,(i-1)*2+1,i*2+1,i*2);}
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);return g;
}
const sectionSide=(path:RoutePath,s:number)=>frameOn(path,s).p[1]>.3?-.53:-.66;
function Section({s,t}:{s:Tl["sections"][number];t:number}){
 const st=sectionState(s,t),off=sectionSide(s.path,(s.s0+s.s1)/2),lift=.035;
 const a=s.forward?s.s0:s.s1,b=s.forward?s.s1:s.s0,end=a+(b-a)*st.draw;
 const geo=useMemo(()=>st.k>.002&&Math.abs(end-a)>.02?strip(s.path,a,end,off,lift,.05):null,[s,end,st.k>.002,off]);
 const glow=useMemo(()=>st.k>.002&&Math.abs(end-a)>.02?strip(s.path,a,end,off,lift-.004,.22):null,[s,end,st.k>.002,off]);
 useEffect(()=>()=>{geo?.dispose();glow?.dispose();},[geo,glow]);
 if(st.k<=.002)return null;
 const color=TONE[s.tone],tick=(at:number,k:number)=>{if(k<=.001)return null;const q=lanePoint(s.path,at,off,lift);return <group key={at} position={q}><mesh position={[0,.16*k,0]}><boxGeometry args={[.05,.32*k,.05]}/><meshBasicMaterial color={color} toneMapped={false} transparent opacity={st.k}/></mesh><mesh renderOrder={4} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.16,24]}/><meshBasicMaterial color={color} {...ADD} opacity={.4*st.k*k}/></mesh></group>;};
 const mid=(s.s0+s.s1)/2,midK=smooth((st.draw-.45)/.2);
 return <group>
  {geo&&<mesh geometry={geo} renderOrder={3}><meshBasicMaterial color={color} side={THREE.DoubleSide} {...ADD} opacity={.95*st.k}/></mesh>}
  {glow&&<mesh geometry={glow} renderOrder={3}><meshBasicMaterial color={color} side={THREE.DoubleSide} {...ADD} opacity={.18*st.k}/></mesh>}
  {tick(a,easeEnter(st.k))}{tick(b,smooth((st.draw-.9)/.1))}
  {midK>.001&&<group position={lanePoint(s.path,mid,off,lift+.02)} scale={midK}><mesh rotation={[0,Math.PI/4,0]}><boxGeometry args={[.12,.04,.12]}/><meshBasicMaterial color={C.yellow} toneMapped={false} transparent opacity={st.k}/></mesh></group>}
 </group>;
}
function arcPoint(a:V3,b:V3,u:number):V3{
 const d=Math.hypot(b[0]-a[0],b[2]-a[2]),lift=1+.3*d,mid:V3=[(a[0]+b[0])/2,Math.max(a[1],b[1])+lift,(a[2]+b[2])/2];
 const w0=(1-u)**2,w1=2*(1-u)*u,w2=u*u;
 return [w0*a[0]+w1*mid[0]+w2*b[0],w0*a[1]+w1*mid[1]+w2*b[1],w0*a[2]+w1*mid[2]+w2*b[2]];
}
function Uplink({u,t}:{u:Tl["uplinks"][number];t:number}){
 const st=uplinkState(u,t),color=TONE[u.tone];
 const geo=useMemo(()=>{if(st.draw<=.01||st.k<=.002)return null;const pts=Array.from({length:41},(_,i)=>new THREE.Vector3(...arcPoint(u.a,u.b,st.draw*i/40)));return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.03,6,false);},[st.draw,st.k>.002,u]);
 useEffect(()=>()=>geo?.dispose(),[geo]);
 if(!geo)return null;
 const packets=st.draw>=1?[0,1,2].map(i=>{const ph=(((t-u.enterAt-.8)*.6+i/3)%1+1)%1;return {p:arcPoint(u.a,u.b,ph),a:Math.sin(Math.PI*ph)};}):[];
 return <group>
  <mesh geometry={geo} renderOrder={3}><meshBasicMaterial color={color} {...ADD} opacity={.8*st.k}/></mesh>
  {packets.map((p,i)=><mesh key={i} position={p.p} renderOrder={5}><boxGeometry args={[.13,.08,.04]}/><meshBasicMaterial color={C.yellow} transparent opacity={p.a*st.k} toneMapped={false} fog={false}/></mesh>)}
 </group>;
}
function curtainGeometry(tr:Tl["traces"][number],end:number,limitK:number){
 const pos:number[]=[],cols:number[]=[],idx:number[]=[],n=Math.max(2,Math.ceil((end-tr.s0)/.08));
 const lav=new THREE.Color(C.purple).lerp(new THREE.Color(C.lavender),.35),pink=new THREE.Color(C.pink),c=new THREE.Color();
 for(let i=0;i<=n;i++){
  const s=tr.s0+(end-tr.s0)*i/n,h=traceSpeedAt(tr,s)*tr.scale,{p,side}=frameOn(tr.path,s),x=p[0]+side[0]*LANE,z=p[2]+side[1]*LANE;
  const over=limitK*smooth((h-tr.limitH)/.04+.5);c.copy(lav).lerp(pink,over);
  pos.push(x,p[1]+.05,z,x,p[1]+.05+h,z);cols.push(c.r*.04,c.g*.04,c.b*.04,c.r*.55,c.g*.55,c.b*.55);
  if(i)idx.push((i-1)*2,(i-1)*2+1,i*2,(i-1)*2+1,i*2+1,i*2);
 }
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));g.setIndex(idx);return g;
}
function edgeGeometry(tr:Tl["traces"][number],end:number,limitK:number){
 const pos:number[]=[],cols:number[]=[],idx:number[]=[],n=Math.max(2,Math.ceil((end-tr.s0)/.08)),c=new THREE.Color();
 const lav=new THREE.Color(C.lavender),pink=new THREE.Color(C.pink);
 for(let i=0;i<=n;i++){
  const s=tr.s0+(end-tr.s0)*i/n,h=traceSpeedAt(tr,s)*tr.scale,{p,side}=frameOn(tr.path,s),x=p[0]+side[0]*LANE,z=p[2]+side[1]*LANE;
  c.copy(lav).lerp(pink,limitK*smooth((h-tr.limitH)/.04+.5));
  pos.push(x,p[1]+.05+h-.022,z,x,p[1]+.05+h+.022,z);cols.push(c.r,c.g,c.b,c.r,c.g,c.b);
  if(i)idx.push((i-1)*2,(i-1)*2+1,i*2,(i-1)*2+1,i*2+1,i*2);
 }
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));g.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));g.setIndex(idx);return g;
}
function Dashes({tr,h,draw,k,color}:{tr:Tl["traces"][number];h:number;draw:number;k:number;color:string}){
 if(k<=.002)return null;
 const out:React.ReactNode[]=[],L=tr.s1-tr.s0;
 for(let s=tr.s0+.1,i=0;s<tr.s0+L*draw-.05;s+=.36,i++){const q=lanePoint(tr.path,s,LANE,.05+h),{yaw}=frameOn(tr.path,s);
  out.push(<mesh key={i} position={q} rotation={[0,yaw,0]} renderOrder={5}><boxGeometry args={[.2,.035,.035]}/><meshBasicMaterial color={color} transparent opacity={k} toneMapped={false} fog={false}/></mesh>);}
 return <>{out}</>;
}
function Trace({tr,t}:{tr:Tl["traces"][number];t:number}){
 const st=traceState(tr,t),end=tr.s0+(tr.s1-tr.s0)*st.reveal,lk=Math.round(st.limit*20)/20;
 const curtain=useMemo(()=>st.k>.002&&end-tr.s0>.05?curtainGeometry(tr,end,lk):null,[tr,end,st.k>.002,lk]);
 const edge=useMemo(()=>st.k>.002&&end-tr.s0>.05?edgeGeometry(tr,end,lk):null,[tr,end,st.k>.002,lk]);
 useEffect(()=>()=>{curtain?.dispose();edge?.dispose();},[curtain,edge]);
 if(st.k<=.002)return null;
 const lead=st.reveal>0&&st.reveal<1?lanePoint(tr.path,end,LANE,.05+traceSpeedAt(tr,end)*tr.scale):null;
 const m=lanePoint(tr.path,tr.match.s,LANE,.05+tr.avgH),ground=lanePoint(tr.path,tr.match.s,LANE,.03),mk=st.match;
 const pulse=((t*.8)%1+1)%1;
 return <group>
  {curtain&&<mesh geometry={curtain} renderOrder={3}><meshBasicMaterial vertexColors side={THREE.DoubleSide} {...ADD} opacity={st.k}/></mesh>}
  {edge&&<mesh geometry={edge} renderOrder={4}><meshBasicMaterial vertexColors side={THREE.DoubleSide} {...ADD} opacity={st.k}/></mesh>}
  {lead&&<mesh position={lead} renderOrder={5}><sphereGeometry args={[.07,14,10]}/><meshBasicMaterial color={C.yellow} toneMapped={false} fog={false} transparent opacity={st.k*easeEnter(st.reveal*8)*(1-smooth((st.reveal-.92)/.08))}/></mesh>}
  <Dashes tr={tr} h={tr.limitH} draw={st.limitDraw} k={st.limit} color={C.ivory}/>
  <Dashes tr={tr} h={tr.avgH} draw={st.avgDraw} k={st.avg} color={C.yellow}/>
  {mk>.002&&<group>
   <mesh position={m} scale={.88+.12*mk} renderOrder={6}><sphereGeometry args={[.08,16,12]}/><meshBasicMaterial color={C.yellow} toneMapped={false} fog={false} transparent opacity={mk}/></mesh>
   <mesh position={m} renderOrder={6}><sphereGeometry args={[.14+.3*pulse,16,12]}/><meshBasicMaterial color={C.yellow} {...ADD} opacity={.35*(1-pulse)*mk}/></mesh>
   <mesh position={[(m[0]+ground[0])/2,(m[1]+ground[1])/2,(m[2]+ground[2])/2]} renderOrder={5}><boxGeometry args={[.02,Math.max(.01,m[1]-ground[1])*mk,.02]}/><meshBasicMaterial color={C.yellow} transparent opacity={.8*mk} toneMapped={false} fog={false}/></mesh>
   <mesh position={ground} rotation={[-Math.PI/2,0,0]} renderOrder={5}><ringGeometry args={[.18+.5*pulse-.03,.18+.5*pulse,40]}/><meshBasicMaterial color={C.yellow} {...ADD} opacity={.6*(1-pulse)*mk}/></mesh>
  </group>}
 </group>;
}

/** Everything of the catalog inside the Three canvas. */
export function SpeedcamScene({tl,t}:{tl:Tl;t:number}){
 return <>
  {tl.sections.map(s=><Section key={s.id} s={s} t={t}/>)}
  {tl.traces.map(tr=><Trace key={tr.id} tr={tr} t={t}/>)}
  {tl.cameras.map(c=>c.kind==="gantry"?<Gantry key={c.id} c={c} t={t} tl={tl}/>:<Pole key={c.id} c={c} t={t} tl={tl}/>)}
  <Flows tl={tl} t={t}/>
  <Cars tl={tl} t={t}/>
  {tl.uplinks.map((u,i)=><Uplink key={i} u={u} t={t}/>)}
 </>;
}

// ---- Overlay tags (same look as the core marker tags) ---------------------------------------------------------------
const enterStyle=(k:number):React.CSSProperties=>({opacity:k,transform:`translateY(${(1-k)*18}px) scale(${.88+.12*k})`});
function Tag({x,y,text,color,k,width,top,bottom,badge=0}:{x:number;y:number;text:string;color:string;k:number;width:number;top:number;bottom:number;badge?:number}){
 const outside=Math.max(0,-x,x-width,top-(y-86),y-bottom),inView=clamp01(1-outside/70);if(k*inView<=.005||!text)return null;
 return <div style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-100%)",pointerEvents:"none",opacity:inView}}>
  <div style={{...enterStyle(k),transformOrigin:"50% 100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
   <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 20px",background:"#120C1DEB",border:`2px solid ${color}`,borderRadius:14,color,fontSize:30,fontWeight:800,letterSpacing:1.5,whiteSpace:"nowrap",textTransform:"uppercase"}}>
    {badge>.005&&<svg width={30*badge} height="30" viewBox="0 0 30 30" style={{opacity:badge}}><circle cx="15" cy="15" r="12" fill="none" stroke={C.yellow} strokeWidth="3"/><path d="M15 8v8l5 3" stroke={C.yellow} strokeWidth="3" fill="none" strokeLinecap="round"/></svg>}
    {text}
   </div>
   <div style={{width:2,height:26,background:color}}/>
  </div>
 </div>;
}
/** Tags of the catalog belong to close views: they fade out on wide establishing shots (zoom 40 → 33), following the
 *  continuous camera, so nothing pops. */
export const tagZoomFade=(zoom:number)=>smooth((zoom-33)/7);
export const tagExitFade=(t:number,exitAt:number)=>exitAt===Infinity?1:1-smooth((t-exitAt)/.45);
export function SpeedcamOverlay({tl,t,pose,width,height,top,bottom}:{tl:Tl;t:number;pose:IsoPose;width:number;height:number;top:number;bottom:number}){
 const tags:React.ReactNode[]=[],zf=tagZoomFade(pose.zoom);
 if(zf<=.002)return null;
 const at=(p:V3)=>project(p,pose,width,height);
 for(const c of tl.cameras){const st=cameraState(c,t,tl),k=st.k*zf*tagExitFade(t,c.textExitAt);if(!c.text||k<=.002)continue;
  const q=at([c.point[0],c.point[1]+(c.kind==="gantry"?GANTRY.top+.12:POLE.height+.45),c.point[2]]);
  const badge=Number.isFinite(c.readAt)?easeEnter((t-c.readAt)/.35):0;
  tags.push(<Tag key={`c-${c.id}`} x={q.x} y={q.y} text={c.text} color={TONE[c.tone]} k={k} width={width} top={top} bottom={bottom} badge={badge}/>);}
 for(const s of tl.sections){const st=sectionState(s,t),k=st.k*smooth((st.draw-.5)/.25)*zf;if(!s.text||k<=.002)continue;
  const mid=(s.s0+s.s1)/2,q=at(lanePoint(s.path,mid,sectionSide(s.path,mid),.06));
  tags.push(<Tag key={`s-${s.id}`} x={q.x} y={q.y} text={s.text} color={TONE[s.tone]} k={k} width={width} top={top} bottom={bottom}/>);}
 for(const tr of tl.traces){const st=traceState(tr,t);
  // Guide tags sit a third of the way along the section (clear of the camera tags at both ends) and give way to the
  // mean-value tag when it appears; the dashed lines themselves stay.
  const along=tr.s0+(tr.s1-tr.s0)*.34,guideAt=(h:number)=>at(lanePoint(tr.path,along,LANE,.05+h+.06)),yieldK=1-st.match;
  if(tr.avg&&st.avg*yieldK*zf>.002){const q=guideAt(tr.avgH);tags.push(<Tag key={`a-${tr.id}`} x={q.x+60} y={q.y-10} text={tr.avg.text} color={C.yellow} k={st.avg*yieldK*zf} width={width} top={top} bottom={bottom}/>);}
  if(tr.limit&&st.limit*yieldK*zf>.002){const q=guideAt(tr.limitH);tags.push(<Tag key={`l-${tr.id}`} x={q.x-150} y={q.y+90} text={tr.limit.text} color={C.ivory} k={st.limit*yieldK*zf} width={width} top={top} bottom={bottom}/>);}
  if(tr.matchShow&&st.match*zf>.002){const q=at(lanePoint(tr.path,tr.match.s,LANE,.05+tr.avgH+.18));tags.push(<Tag key={`m-${tr.id}`} x={q.x} y={q.y} text={tr.matchShow.text} color={C.yellow} k={st.match*zf} width={width} top={top} bottom={bottom}/>);}
 }
 return <>{tags}</>;
}
