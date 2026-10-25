import React,{useEffect,useLayoutEffect,useMemo} from "react";
import * as THREE from "three";
import {nozzleLayout,carAirPlumbing,airJetSample} from "../src/lib/assembly-geometry";
import type {AssemblySpec} from "../src/lib/visual-contract";
type V=[number,number,number];
type Paint={color:string;opacity:number;metal?:number;rough?:number};

function Solid({children,position=[0,0,0],rotation=[0,0,0],scale=1,color,opacity,metal=.45,rough=.4}:{children:React.ReactNode;position?:V;rotation?:V;scale?:number|V}&Paint){
 const depth=useMemo(()=>{const m=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});m.userData.reveal={value:1};m.onBeforeCompile=s=>{s.uniforms.reveal=m.userData.reveal;s.fragmentShader="uniform float reveal;\n"+s.fragmentShader.replace("#include <clipping_planes_fragment>","#include <clipping_planes_fragment>\nif(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)>=reveal) discard;");};return m;},[]);
 useLayoutEffect(()=>{depth.userData.reveal.value=opacity;},[depth,opacity]);useEffect(()=>()=>depth.dispose(),[depth]);
 return <mesh position={position} rotation={rotation} scale={scale} castShadow receiveShadow customDepthMaterial={depth}>{children}<meshStandardMaterial color={color} metalness={metal} roughness={rough} opacity={opacity} transparent={opacity<.999} depthWrite={opacity>=.999}/></mesh>;
}
const Box=({size,...p}:{size:V;position?:V;rotation?:V}&Paint)=><Solid {...p}><boxGeometry args={size}/></Solid>;
const Cylinder=({radius=.2,length=1,...p}:{radius?:number;length?:number;position?:V;rotation?:V}&Paint)=><Solid {...p}><cylinderGeometry args={[radius,radius,length,32]}/></Solid>;
const Ball=({radius=.2,...p}:{radius?:number;position?:V;scale?:V}&Paint)=><Solid {...p}><sphereGeometry args={[radius,24,16]}/></Solid>;
const Torus=({radius=.4,tube=.06,...p}:{radius?:number;tube?:number;position?:V;rotation?:V}&Paint)=><Solid {...p}><torusGeometry args={[radius,tube,12,64]}/></Solid>;
function Pipe({points,radius=.025,...p}:{points:V[];radius?:number}&Paint){
 const geometry=useMemo(()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),32,radius,8,false),[JSON.stringify(points),radius]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);return <Solid {...p}><primitive object={geometry} attach="geometry"/></Solid>;
}
// A faceted loft gives a recognisable low, angular car silhouette without remote CAD.
function loft(rows:number[][]){
 const positions:number[]=[],indices:number[]=[];
 for(const [x,bottom,top,half] of rows)positions.push(x,bottom,-half,x,top,-half,x,top,half,x,bottom,half);
 for(let i=0;i<rows.length-1;i++)for(let edge=0;edge<4;edge++){const a=i*4+edge,b=i*4+(edge+1)%4,c=a+4,d=b+4;indices.push(a,b,c,b,d,c);}
 indices.push(0,2,1,0,3,2);const e=(rows.length-1)*4;indices.push(e,e+1,e+2,e,e+2,e+3);
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function Wheel({x,z,turn,opacity}:{x:number;z:number;turn:number;opacity:number}){
 const black={color:"#16131C",opacity,metal:.05,rough:.8},steel={color:"#A8A3B3",opacity,metal:.8,rough:.22};
 return <group position={[x,.49,z]} rotation={[0,0,turn]}>
  <Torus radius={.37} tube={.13} {...black}/><Torus radius={.34} tube={.028} position={[0,0,z>0?.12:-.12]} {...steel}/>
  <Cylinder radius={.28} length={.035} rotation={[Math.PI/2,0,0]} color="#4F4A5B" opacity={opacity}/>
  {Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return <Box key={i} size={[.27,.028,.035]} position={[Math.cos(a)*.14,Math.sin(a)*.14,z>0?.14:-.14]} rotation={[0,0,a]} {...steel}/>;})}
  <Cylinder radius={.075} length={.1} rotation={[Math.PI/2,0,0]} position={[0,0,z>0?.16:-.16]} {...steel}/>
  {Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return <Box key={i} size={[.055,.014,.21]} position={[Math.cos(a)*.493,Math.sin(a)*.493,0]} rotation={[0,0,a+Math.PI/2]} color="#302A38" opacity={opacity} metal={.1} rough={.85}/>;})}
  <Box size={[.12,.24,.09]} position={[-.24,.05,z>0?.07:-.07]} color="#F4CA50" opacity={opacity}/>
 </group>;
}
function Tank({x=0,y=.8,z=0,length=1.6,opacity}:{x?:number;y?:number;z?:number;length?:number;opacity:number}){
 return <group position={[x,y,z]}>
  <Cylinder radius={.22} length={length} rotation={[0,0,Math.PI/2]} color="#2B2634" opacity={opacity} metal={.3} rough={.48}/>
  {[-1,1].map(sign=><Ball key={sign} radius={.22} position={[sign*length/2,0,0]} scale={[.65,1,1]} color="#37313F" opacity={opacity}/>)}
  {Array.from({length:16},(_,i)=><Torus key={i} radius={.224} tube={.007} position={[-length/2+i*length/15,0,0]} rotation={[0,Math.PI/2,0]} color="#71627F" opacity={opacity}/>)}
  {[-1,1].map(sign=><group key={sign} position={[sign*(length/2+.15),0,0]}><Cylinder radius={.045} length={.16} rotation={[0,0,Math.PI/2]} color="#D9C5F0" opacity={opacity}/><Box size={[.06,.17,.055]} color="#F4CA50" opacity={opacity}/></group>)}
 </group>;
}
function Nozzle({position,rotation=[0,0,Math.PI/2],power,opacity,t,clearance}:{position:V;rotation?:V;power:number;opacity:number;t:number;clearance?:number}){
 const beam=clearance===undefined?0:Math.max(0,Math.min(1.2,clearance-.24));
 return <group position={position} rotation={rotation}>
  <Solid color="#CAB4E0" opacity={opacity} metal={.85} rough={.2}><cylinderGeometry args={[.052,.115,.28,32]}/></Solid>
  <Cylinder radius={.095} length={.01} position={[0,-.147,0]} color="#100D17" opacity={opacity}/>
  {beam>0&&<mesh position={[0,-.2-beam/2,0]}><cylinderGeometry args={[.055,.18,beam,24,1,true]}/><meshBasicMaterial color="#F4CA50" transparent opacity={opacity*power*.14} depthWrite={false} side={THREE.DoubleSide}/></mesh>}
  {Array.from({length:8},(_,i)=>{const phase=((t*1.8+i/8)%1+1)%1,jet=airJetSample(phase,clearance);return <Torus key={i} radius={.08+phase*.2} tube={.014} position={[0,-jet.distance,0]} rotation={[Math.PI/2,0,0]} color="#F4CA50" opacity={opacity*jet.opacity*power*.8}/>;})}
 </group>;
}
function Fan({position,opacity,angle,active,reveal=0}:{position:V;opacity:number;angle:number;active:number;reveal?:number}){
 return <group position={position} rotation={[Math.PI/2*(1-reveal*.8),0,0]} scale={1+reveal*.5}>
  <Torus radius={.24} tube={.045} color="#4B4358" opacity={opacity}/><Torus radius={.25} tube={.012} color="#F4CA50" opacity={opacity*active}/><Torus radius={.19} tube={.016} color="#A89AB9" opacity={opacity}/>
  <group rotation={[0,0,angle]}>{Array.from({length:9},(_,i)=>{const a=i*Math.PI*2/9;return <Box key={i} size={[.17,.055,.018]} position={[Math.cos(a)*.11,Math.sin(a)*.11,0]} rotation={[0,0,a+.35]} color="#8D59DA" opacity={opacity}/>;})}</group>
  <Cylinder radius={.045} length={.06} rotation={[Math.PI/2,0,0]} color="#DDD3E8" opacity={opacity}/>
 </group>;
}
function Gauge({opacity}:{opacity:number}){
 return <group position={[.9,1.2,0]}><Cylinder radius={.16} length={.08} rotation={[Math.PI/2,0,0]} color="#BBA6D0" opacity={opacity}/><Cylinder radius={.135} length={.01} position={[0,0,.05]} rotation={[Math.PI/2,0,0]} color="#171120" opacity={opacity}/><Box size={[.012,.115,.015]} position={[.025,.03,.065]} rotation={[0,0,-.45]} color="#F4CA50" opacity={opacity}/>{Array.from({length:9},(_,i)=>{const a=i*Math.PI/6;return <Box key={i} size={[.008,.025,.01]} position={[Math.cos(a)*.11,Math.sin(a)*.11,.06]} rotation={[0,0,a-Math.PI/2]} color="#DBC8EC" opacity={opacity}/>;})}</group>;
}
function Battery({opacity}:{opacity:number}){
 return <group position={[0,.3,0]}><Box size={[2.55,.17,1.45]} color="#34303C" opacity={opacity}/>{Array.from({length:24},(_,i)=><Box key={i} size={[.28,.12,.28]} position={[-1.08+(i%8)*.31,.12,-.48+Math.floor(i/8)*.47]} color={i%3===0?"#8D59DA":"#BEB1D0"} opacity={opacity}/>)}</group>;
}
function Drive({opacity,cutaway,spin}:{opacity:number;cutaway:number;spin:number}){
 return <group>
  <Cylinder radius={.28} length={.7} rotation={[Math.PI/2,0,0]} color="#A69AAF" opacity={opacity*(1-cutaway*.72)}/>
  <group rotation={[0,0,spin]}>{Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return <Box key={i} size={[.06,.09,.55]} position={[Math.cos(a)*.22,Math.sin(a)*.22,0]} rotation={[0,0,a]} color="#F4CA50" opacity={opacity}/>;})}</group>
  <Cylinder radius={.095} length={1.6} rotation={[Math.PI/2,0,0]} color="#D2C8DD" opacity={opacity}/>
  <Box size={[.47,.2,.5]} position={[.45,.25,0]} color="#8D59DA" opacity={opacity}/>
  <Pipe points={[[.44,.26,.18],[.25,.4,.25],[.05,.3,.2],[0,.25,.15]]} radius={.03} color="#F4CA50" opacity={opacity}/>
 </group>;
}

export type MachineChannels={cutaway:number;thrust:number;lift:number;fan:number;fanAngle?:number;wheels:number};
export default function DetailedMachine({spec,channels,t,opacity,groundY=0}:{spec:AssemblySpec;channels:MachineChannels;t:number;opacity:number;groundY?:number}){
 const body=useMemo(()=>loft([[-2.6,.48,.7,.67],[-2.25,.42,.84,.94],[-1.2,.43,.96,1.01],[.3,.43,.92,1.02],[1.55,.43,.7,.91],[2.35,.48,.59,.76],[2.6,.49,.56,.62]]),[]);
 const glass=useMemo(()=>loft([[-1.27,.94,1.05,.74],[-.7,.96,1.48,.65],[.4,.93,1.43,.62],[1.02,.78,.91,.7]]),[]);
 useEffect(()=>()=>{body.dispose();glass.dispose();},[body,glass]);
 const op=opacity,steel={color:"#8B8098",opacity:op},dark={color:"#211C2A",opacity:op},pressure=spec.system!=="electric-drive";
 if(spec.kind==="pressure-system")return <group><Gauge opacity={op}/><Box size={[.16,.18,1.5]} position={[1.35,.5,0]} color="#A799B6" opacity={op}/><Box size={[3,.14,1.8]} position={[0,.08,0]} {...dark}/>{Array.from({length:spec.tankCount},(_,i)=><Tank key={i} z={(i-(spec.tankCount-1)/2)*.5} y={.5} length={1.6} opacity={op}/>)}<Pipe points={[[1,.5,-.7],[1.4,.5,-.7],[1.4,.5,.7],[1,.5,.7]]} color="#F4CA50" opacity={op}/>{nozzleLayout(spec).map((n,i)=><Nozzle key={i} position={n.position} rotation={n.rotation} power={channels.thrust} opacity={op} t={t}/>)}</group>;
 if(spec.kind==="electric-drive")return <group><Battery opacity={op}/><group position={[-1.15,.7,0]}><Drive opacity={op} cutaway={channels.cutaway} spin={channels.wheels}/></group><Box size={[2.7,.5,1.6]} position={[0,.7+channels.cutaway*1.4,0]} color={spec.color} opacity={op*(1-channels.cutaway*.8)}/></group>;
 return <group>
  <Box size={[4.45,.17,1.68]} position={[0,.3,0]} color="#201B29" opacity={op*(1-channels.cutaway*.88)}/>
  {[-1,1].map(z=><Box key={z} size={[4.2,.14,.12]} position={[0,.41,z*.78]} {...steel}/>)}
  <Battery opacity={op}/>
  {[-1.62,1.62].flatMap(x=>[-1.02,1.02].map(z=><group key={`${x}-${z}`}><Wheel x={x} z={z} turn={channels.wheels} opacity={op}/><Cylinder radius={.035} length={.65} position={[x,.58,z*.6]} rotation={[Math.PI/2,0,.15]} {...steel}/><Pipe points={[[x-.25,.37,z*.7],[x,.64,z*.8],[x+.22,.4,z*.77]]} radius={.04} color="#E0CDF8" opacity={op}/></group>))}
  <group position={[-1.5,.58,0]}><Drive opacity={op} cutaway={channels.cutaway} spin={channels.wheels}/></group>
  {pressure&&<>
   {Array.from({length:spec.tankCount},(_,i)=><Tank key={i} x={.05} y={.74} z={(i-(spec.tankCount-1)/2)*.49} length={1.85} opacity={op}/>)}
   <Box size={[.19,.17,1.55]} position={[-2.15,.58,0]} color="#C5B3D9" opacity={op}/>
   {carAirPlumbing(spec).map((points,i)=><Pipe key={i} points={points} radius={.025} color="#F4CA50" opacity={op}/>)}
   {nozzleLayout(spec).map((n,i)=><Nozzle key={i} position={n.position} rotation={n.rotation} power={n.channel==="control"?0:channels[n.channel]} opacity={op} t={t} clearance={n.channel==='lift'?n.position[1]-groundY:undefined}/>)}
   {[-1,1].map(sign=>{const reveal=channels.cutaway*channels.fan,home:V=[-1.9,.25,sign*.5],shown:V=[-.5,.65,sign*1.55],position=home.map((v,i)=>v+(shown[i]-v)*reveal) as V;return <group key={sign}>{reveal>.001&&<Pipe points={[home,position]} radius={.009} color="#E0CDF8" opacity={op*reveal*.45}/>}<Fan position={position} opacity={op} angle={channels.fanAngle??0} active={channels.fan} reveal={reveal}/></group>;})}
  </>}
  <group position={[0,channels.cutaway*1.35,0]} rotation={[0,0,channels.cutaway*.06]}>
   <Solid color={spec.color} opacity={op*(1-channels.cutaway*.62)} metal={.62} rough={.26}><primitive object={body} attach="geometry"/></Solid>
   <Solid color="#252031" opacity={op*(1-channels.cutaway*.62)*.88} metal={.6} rough={.18}><primitive object={glass} attach="geometry"/></Solid>
   {[-1.62,1.62].flatMap(x=>[-1.02,1.02].map(z=><Solid key={`arch-${x}-${z}`} position={[x,.49,z]} color={spec.color} opacity={op*(1-channels.cutaway*.62)} metal={.6} rough={.3}><torusGeometry args={[.51,.085,12,48,Math.PI]}/></Solid>))}
   {[-1,1].map(z=><group key={z}>
    <Pipe points={[[-1.17,1.03,z*.75],[-.7,1.49,z*.66],[.42,1.44,z*.64],[1.02,.93,z*.72]]} radius={.022} color="#E0CDF8" opacity={op*(1-channels.cutaway*.5)}/>
    <Box size={[.47,.36,.38]} position={[-.28,1.09,z*.35]} color="#B4A0C8" opacity={op}/>
    <Box size={[.5,.025,.055]} position={[2.37,.6,z*.48]} rotation={[0,z*.13,0]} color="#FDFEED" opacity={op}/>
    <Box size={[.022,.14,.14]} position={[-2.59,.67,z*.49]} color="#E03056" opacity={op}/>
    <Box size={[.05,.16,.055]} position={[-2.1,.96,z*.68]} {...dark}/>
    <Box size={[.63,.065,.12]} position={[1.86,.46,z*.61]} rotation={[0,z*.12,0]} {...dark}/>
   </group>)}
   <Box size={[.12,.038,1.65]} position={[-2.16,1.08,0]} color="#292331" opacity={op}/>
   <Box size={[.12,.06,1.63]} position={[-2.61,.6,0]} color="#E03056" opacity={op}/>
  </group>
 </group>;
}
