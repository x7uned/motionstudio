// isometric/v1 — «Изометрия»: one persistent isometric low-poly city driven by a validated JSON plan.
// Built from the style sample renderer/style-lab/iso-city: orthographic Three.js camera at the true isometric angle,
// flat colours, PCF shadows, instanced procedural city with the occlusion guard, additive route ribbons, traffic recolour
// waves, prepared markers and screen cards. Every value is a function of the frame time; no randomness, no generated code.
import React,{useEffect,useLayoutEffect,useMemo,useRef} from "react";
import {AbsoluteFill,Audio,Img,staticFile,useCurrentFrame,useVideoConfig} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";
import {Captions,type SpeechAlignment} from "./Explainer";
import {CaptionShade} from "./CaptionStyles";
import {sceneClock,type Storyboard,type StyleProfile} from "../src/lib/model";
import {
 isoWorld,isoTimeline,isoLayout,cameraAt,cameraPosition,project,along,carState,trafficAt,jamCarState,vehicleState,markerState,
 districtMix,linkState,cardState,chapterAccent,routeDrawn,routeShown,leadDot,riseAt,tween,smooth,clamp01,easeEnter,easeInOut,DECK_W,DECK_H,DECK_RISE,MARKER_TOP,
 type IsoWorld,type IsoTimeline,type IsoPose,type RoutePath,type Building,type V3,
} from "../src/lib/isometric";
import {DispatchScene,DispatchTags} from "./IsometricHex";
import brand from "../video-design/brand.json";
import {RingScene,RingTags} from "./IsometricWave";
import {SpeedcamScene,SpeedcamOverlay} from "./IsometricSpeedcam";
import {IsometricTiles} from "./IsometricTiles";

const C=brand.colors;
const TONE={info:C.lavender,ok:C.green,warn:C.pink,number:C.yellow} as const;
const col=(hex:string)=>new THREE.Color(hex);
const YELLOW=col(C.yellow),PINK=col(C.pink),LAV=col(C.lavender),PURPLE=col(C.purple);
type Props={plan:Storyboard;profile:StyleProfile;format:string;audio?:string;alignment?:SpeechAlignment[]};
type Tl=IsoTimeline;type TlRoute=Tl["routes"][number];
// Free-flow parts keep the route colour; only slow (yellow) and jammed (pink) parts are recoloured.
const traffic=(m:{g:number;y:number;p:number},base:THREE.Color,out=new THREE.Color())=>out.setRGB(base.r*m.g+YELLOW.r*m.y+PINK.r*m.p,base.g*m.g+YELLOW.g*m.y+PINK.g*m.p,base.b*m.g+YELLOW.b*m.y+PINK.b*m.p);

// ---- Instancing helper --------------------------------------------------------------------------------------------
const M=new THREE.Matrix4(),L=new THREE.Matrix4(),Q=new THREE.Quaternion(),EU=new THREE.Euler(),V=new THREE.Vector3(),S3=new THREE.Vector3();
const boxAt=(m:THREE.Matrix4,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>m.compose(V.set(x,y,z),Q.identity(),S3.set(sx,sy,sz));
/** colorKey changes only when colours depend on time (district light states); otherwise colours are set once. */
function Inst<Item>({items,geometry,material,color,place,colorKey=0,shadow=true}:{items:Item[];geometry:THREE.BufferGeometry;material:THREE.Material;color:(it:Item,i:number,c:THREE.Color)=>THREE.Color;place:(it:Item,m:THREE.Matrix4,i:number)=>void;colorKey?:number;shadow?:boolean}){
 const ref=useRef<THREE.InstancedMesh>(null);
 useLayoutEffect(()=>{const mesh=ref.current;if(!mesh||!items.length)return;const c=new THREE.Color();items.forEach((it,i)=>mesh.setColorAt(i,color(it,i,c)));if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;},[items,colorKey]);
 useLayoutEffect(()=>{const mesh=ref.current;if(!mesh||!items.length)return;const m=new THREE.Matrix4();items.forEach((it,i)=>{place(it,m,i);mesh.setMatrixAt(i,m);});mesh.instanceMatrix.needsUpdate=true;});
 if(!items.length)return null;
 return <instancedMesh ref={ref} args={[geometry,material,items.length]} frustumCulled={false} castShadow={shadow} receiveShadow/>;
}

// ---- Camera ---------------------------------------------------------------------------------------------------------
function CameraRig({pose}:{pose:IsoPose}){
 const {camera}=useThree();
 useLayoutEffect(()=>{const p=cameraPosition(pose);camera.position.set(...p);camera.up.set(0,1,0);camera.lookAt(pose.x,.4,pose.z);(camera as THREE.OrthographicCamera).zoom=pose.zoom;camera.updateProjectionMatrix();});
 return null;
}

// ---- City -----------------------------------------------------------------------------------------------------------
const DISTRICT=[null,col("#F4CA50"),col("#0E0B14"),col("#E03056")] as const;
function City({world,tl,t}:{world:IsoWorld;tl:Tl;t:number}){
 const g=useMemo(()=>{
  const base=new THREE.BoxGeometry(1,1,1).translate(0,.5,0),unit=new THREE.BoxGeometry(1,1,1);
  return {base,unit,cone:new THREE.ConeGeometry(.26,.62,6).translate(0,.31,0),
   solid:new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.9,metalness:0}),
   tree:new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.9,flatShading:true}),
   glow:new THREE.MeshBasicMaterial({color:"#ffffff",toneMapped:false})};
 },[]);
 useEffect(()=>()=>{for(const v of Object.values(g))v.dispose();},[g]);
 const {buildings,roofs,windows,plates,trees,dashes}=world;
 const top=(b:Building)=>b.h*riseAt(b.delay,t);
 // Districts recolour windows (lit · dark · warn) as a wave from their centre; the keyed mix is continuous in time.
 const live=tl.districts.length>0;
 const mix=(b:Building,base:THREE.Color,out:THREE.Color,body=false)=>{
  out.copy(base);
  for(const d of tl.districts){const s=districtMix(d,b.x,b.z,t);if(s.inside<=0)continue;
   for(let j=1;j<4;j++){const w=s.v[j]*s.inside;if(w<=0)continue;const target=body?(j===2?base.clone().multiplyScalar(.62):base):DISTRICT[j]!;out.lerp(target,w);}}
  return out;
 };
 const colorKey=live?Math.round(t*30):0;
 return <>
  <Inst items={plates} geometry={g.base} material={g.solid} shadow={false} color={(p,_,c)=>c.set(p.plaza?"#211B2E":p.park?"#13210F":"#17131F")} place={(p,m)=>boxAt(m,p.x,0,p.z,3,.06,3)}/>
  <Inst items={dashes} geometry={g.unit} material={g.glow} shadow={false} color={(_,__,c)=>c.set("#241E33")} place={(d,m)=>boxAt(m,d.x,.006,d.z,d.axis==="x"?.38:.045,.01,d.axis==="x"?.045:.38)}/>
  <Inst items={buildings} geometry={g.base} material={g.solid} colorKey={colorKey} color={(b,_,c)=>mix(b,col(b.color),c,true)} place={(b,m)=>boxAt(m,b.x,.06,b.z,b.w,b.hb*riseAt(b.delay,t),b.d)}/>
  <Inst items={buildings.filter(b=>b.tw>0)} geometry={g.base} material={g.solid} colorKey={colorKey} color={(b,_,c)=>mix(b,col(b.color),c,true)} place={(b,m)=>{const r=riseAt(b.delay,t);boxAt(m,b.x,.06+b.hb*r,b.z,b.tw,(b.h-b.hb)*r,b.td);}}/>
  <Inst items={roofs} geometry={g.base} material={g.solid} color={(_,__,c)=>c.set("#433B54")} place={(r,m)=>{const b=buildings[r.b],k=riseAt(b.delay,t);boxAt(m,r.x,.06+top(b),r.z,r.s*k,r.h*k,r.s*k);}}/>
  <Inst items={windows} geometry={g.unit} material={g.glow} shadow={false} colorKey={colorKey} color={(w,_,c)=>mix(buildings[w.b],col(w.color),c)} place={(w,m)=>{const k=riseAt(buildings[w.b].delay,t);boxAt(m,w.x,.06+w.y*k,w.z,w.face==="x"?.012:w.len,.045*k,w.face==="x"?w.len:.012);}}/>
  <Inst items={trees} geometry={g.cone} material={g.tree} color={(_,i,c)=>c.set(i%3?"#2E5A25":"#3F7232")} place={(tr,m)=>{const k=riseAt(tr.delay,t)*tr.s;boxAt(m,tr.x,.06,tr.z,k,k,k);}}/>
 </>;
}

// ---- Elevated decks -------------------------------------------------------------------------------------------------
function deckGeometry(path:RoutePath){
 const pos:number[]=[],idx:number[]=[],w=DECK_W/2,th=.14,ring:number[][]=[];
 for(let s=path.deck!.from;s<=path.deck!.to+1e-6;s+=.1){
  const {p,side}=along(path,s),y=p[1];
  const l=[p[0]+side[0]*w,p[2]+side[1]*w],r=[p[0]-side[0]*w,p[2]-side[1]*w];
  ring.push([l[0],y,l[1],r[0],y,r[1],l[0],y-th,l[1],r[0],y-th,r[1]]);
 }
 // Separate vertices per side so flat normals stay crisp.
 const quad=(a:number[],b:number[],c:number[],d:number[])=>{const o=pos.length/3;pos.push(...a,...b,...c,...d);idx.push(o,o+2,o+1,o+1,o+2,o+3);};
 const v=(r:number[],k:number)=>r.slice(k*3,k*3+3);
 for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i];quad(v(a,1),v(a,0),v(b,1),v(b,0));quad(v(a,0),v(a,2),v(b,0),v(b,2));quad(v(a,3),v(a,1),v(b,3),v(b,1));quad(v(a,2),v(a,3),v(b,2),v(b,3));}
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 return geo;
}
function Deck({path,t}:{path:RoutePath;t:number}){
 const geo=useMemo(()=>deckGeometry(path),[path]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 const pylons=useMemo(()=>{const out:{p:V3;h:number}[]=[];for(let s=path.deck!.from+.6;s<path.deck!.to-.4;s+=2.4){const p=along(path,s).p;if(p[1]>.5)out.push({p,h:p[1]-.14});}return out;},[path]);
 const k=Math.max(.001,tween(t,DECK_RISE[0],DECK_RISE[1],easeEnter));
 return <group scale={[1,k,1]}>
  <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color="#3A3346" roughness={.85} side={THREE.DoubleSide}/></mesh>
  {pylons.map((q,i)=><group key={i}>
   <mesh position={[q.p[0],q.h/2,q.p[2]]} castShadow><boxGeometry args={[.08,q.h,.08]}/><meshBasicMaterial color="#7A5CC0" toneMapped={false}/></mesh>
   <mesh position={[q.p[0],q.h-.03,q.p[2]]}><boxGeometry args={[.6,.06,.09]}/><meshBasicMaterial color="#7A5CC0" toneMapped={false}/></mesh>
  </group>)}
 </group>;
}

// ---- Route ribbons --------------------------------------------------------------------------------------------------
type Layer={width:number;lift:number;base:THREE.Color;gain:number;taper:number};
const LAYERS:Record<"main"|"alt",Layer[]>={
 main:[{width:.75,lift:.022,base:PURPLE,gain:.16,taper:.7},{width:.32,lift:.028,base:PURPLE,gain:.42,taper:.35},{width:.11,lift:.034,base:LAV,gain:1,taper:0}],
 alt:[{width:.42,lift:.02,base:PURPLE,gain:.14,taper:.5},{width:.07,lift:.03,base:PURPLE,gain:.9,taper:0}],
};
function ribbonGeometry(r:TlRoute,end:number,layer:Layer,t:number,fade:number){
 const pos:number[]=[],cols:number[]=[],idx:number[]=[],c=new THREE.Color();
 const samples:number[]=[];
 for(let i=0;i<r.path.S.length&&r.path.S[i]<end;i++)samples.push(r.path.S[i]);
 samples.push(end);
 for(const s of samples){
  const {p,side}=along(r.path,s),w=layer.width/2;
  traffic(trafficAt(r.zones,s,t),layer.base,c);
  const k=layer.gain*fade*(layer.taper?smooth((end-s)/layer.taper):1);
  pos.push(p[0]+side[0]*w,p[1]+layer.lift,p[2]+side[1]*w,p[0]-side[0]*w,p[1]+layer.lift,p[2]-side[1]*w);
  cols.push(c.r*k,c.g*k,c.b*k,c.r*k,c.g*k,c.b*k);
 }
 for(let i=1;i<samples.length;i++){const o=(i-1)*2;idx.push(o,o+1,o+2,o+1,o+3,o+2);}
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));geo.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));geo.setIndex(idx);
 return geo;
}
function Ribbon({r,t,layer}:{r:TlRoute;t:number;layer:Layer}){
 const end=routeDrawn(r,t),fade=routeShown(r,t);
 const geo=useMemo(()=>end>.02&&fade>.002?ribbonGeometry(r,end,layer,t,fade):null,[r,end,t,layer,fade]);
 useEffect(()=>()=>geo?.dispose(),[geo]);
 if(!geo)return null;
 const additive=layer.taper>0;
 // The core is opaque only while fully shown; during the exit it blends additively like the glow so it can fade.
 const blend=additive||fade<.999;
 return <mesh geometry={geo} renderOrder={additive?3:2}><meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} fog={false} transparent={blend} blending={blend?THREE.AdditiveBlending:THREE.NormalBlending} depthWrite={!blend}/></mesh>;
}
function Halo({r,color,opacity}:{r:number;color:string;opacity:number}){
 return <mesh rotation={[-Math.PI/2,0,0]} renderOrder={4}><circleGeometry args={[r,40]}/><meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>;
}
function LeadDot({r,t}:{r:TlRoute;t:number}){
 const k=leadDot(r,t);if(k<=.001)return null;
 const {p}=along(r.path,routeDrawn(r,t));
 return <group position={[p[0],p[1]+.09,p[2]]} scale={k}>
  <mesh><sphereGeometry args={[.1,20,14]}/><meshBasicMaterial color={C.yellow} toneMapped={false} fog={false}/></mesh>
  <mesh renderOrder={5}><sphereGeometry args={[.3,20,14]}/><meshBasicMaterial color={C.yellow} transparent opacity={.28} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
 </group>;
}

// ---- Cars -----------------------------------------------------------------------------------------------------------
type Part={x:number;y:number;z:number;sx:number;sy:number;sz:number};
const BODY:Part={x:0,y:.1,z:0,sx:.5,sy:.13,sz:.27},CABIN:Part={x:-.04,y:.215,z:0,sx:.26,sy:.1,sz:.23};
const HEAD:Part[]=[-1,1].map(sd=>({x:.252,y:.1,z:.08*sd,sx:.02,sy:.045,sz:.06}));
const TAIL:Part[]=[-1,1].map(sd=>({x:-.252,y:.1,z:.08*sd,sx:.02,sy:.045,sz:.06}));
const carMatrix=(m:THREE.Matrix4,x:number,y:number,z:number,yaw:number,pitch:number,s:number,part:Part)=>{
 M.compose(V.set(x,y,z),Q.setFromEuler(EU.set(0,yaw,pitch,"YZX")),S3.set(s,s,s));
 L.compose(V.set(part.x,part.y,part.z),Q.identity(),S3.set(part.sx,part.sy,part.sz));
 m.multiplyMatrices(M,L);
};
function Traffic({world,t}:{world:IsoWorld;t:number}){
 const g=useMemo(()=>({box:new THREE.BoxGeometry(1,1,1),solid:new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.6}),light:new THREE.MeshBasicMaterial({color:"#ffffff",toneMapped:false})}),[]);
 useEffect(()=>()=>{for(const v of Object.values(g))v.dispose();},[g]);
 const lights=useMemo(()=>world.cars.flatMap((_,i)=>[0,1].map(k=>({i,k}))),[world]);
 const state=world.cars.map(c=>carState(c,t));
 const put=(i:number,m:THREE.Matrix4,p:Part)=>{const s=state[i];carMatrix(m,s.x,0,s.z,s.yaw,0,Math.max(.001,s.s),p);};
 return <>
  <Inst items={world.cars} geometry={g.box} material={g.solid} color={(c,_,o)=>o.set(c.color)} place={(_,m,i)=>put(i,m,BODY)}/>
  <Inst items={world.cars} geometry={g.box} material={g.solid} color={(_,__,o)=>o.set(C.card)} place={(_,m,i)=>put(i,m,CABIN)}/>
  <Inst items={lights} geometry={g.box} material={g.light} shadow={false} color={(_,__,o)=>o.set(C.ivory)} place={(l,m)=>put(l.i,m,HEAD[l.k])}/>
  <Inst items={lights} geometry={g.box} material={g.light} shadow={false} color={(_,__,o)=>o.set(C.pink)} place={(l,m)=>put(l.i,m,TAIL[l.k])}/>
 </>;
}
function RouteCar({path,s,scale,body,cabin,brake}:{path:RoutePath;s:number;scale:number;body:string;cabin:string;brake:number}){
 const {p,yaw,pitch}=along(path,s);
 return <group position={[p[0],p[1]+.02,p[2]]} rotation={[0,yaw,pitch,"YZX"]} scale={Math.max(.001,scale)}>
  {([[BODY,body],[CABIN,cabin]] as const).map(([q,c],i)=><mesh key={i} position={[q.x,q.y,q.z]} castShadow><boxGeometry args={[q.sx,q.sy,q.sz]}/><meshStandardMaterial color={c} roughness={.55}/></mesh>)}
  {HEAD.map((h,i)=><mesh key={`h${i}`} position={[h.x,h.y,h.z]}><boxGeometry args={[h.sx,h.sy,h.sz]}/><meshBasicMaterial color={C.ivory} toneMapped={false}/></mesh>)}
  {TAIL.map((h,i)=><mesh key={`t${i}`} position={[h.x,h.y,h.z]}><boxGeometry args={[h.sx,h.sy,h.sz]}/><meshBasicMaterial color={C.pink} toneMapped={false}/></mesh>)}
  {brake>.001&&<mesh position={[-.3,.1,0]} renderOrder={5}><sphereGeometry args={[.16,16,10]}/><meshBasicMaterial color={C.pink} transparent opacity={.35*brake} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>}
 </group>;
}
const JAM_BODY=["#3A3346","#2C2D28","#4A4060","#3A3346","#2C2D28","#4A4060","#3A3346"];
function Jams({tl,t}:{tl:Tl;t:number}){
 return <>{tl.routes.flatMap(r=>r.jams.map((c,i)=>{const j=jamCarState(c,t);if(j.k<=.001)return null;return <RouteCar key={`${r.id}-${i}`} path={r.path} s={j.s} scale={j.k} body={JAM_BODY[c.k%JAM_BODY.length]} cabin={C.card} brake={j.brake*(.75+.25*Math.sin(t*5+i))}/>;}))}</>;
}
function Vehicles({tl,t}:{tl:Tl;t:number}){
 return <>{tl.vehicles.map(v=>{
  const r=tl.routes.find(x=>x.id===v.route)!,st=vehicleState(v,t);if(st.k<=.001)return null;
  const hero=v.tone==="hero",start=along(r.path,0).p,{p}=along(r.path,st.s);
  return <group key={v.id}>
   {hero&&<group position={[start[0],start[1]+.03,start[2]]}><mesh rotation={[-Math.PI/2,0,0]} scale={.88+.12*st.k}><ringGeometry args={[.36,.44,48]}/><meshBasicMaterial color={C.lavender} transparent opacity={st.k*.9} toneMapped={false} fog={false}/></mesh></group>}
   {hero&&<group position={[p[0],p[1]+.025,p[2]]}><Halo r={.62} color={C.purple} opacity={.42*st.k}/></group>}
   <RouteCar path={r.path} s={st.s} scale={(hero?1.3:1.1)*st.k} body={hero?C.lavender:C.ivory} cabin={hero?C.purple:C.card} brake={0}/>
  </group>;
 })}</>;
}

// ---- Markers --------------------------------------------------------------------------------------------------------
const pulses=(t:number,from:number,period:number,n=2)=>Array.from({length:n},(_,o)=>{const ph=((((t-from)/period+o/n)%1)+1)%1;return {ph,a:Math.sin(Math.PI*ph)};});
function Beacon({k,t,from,color}:{k:number;t:number;from:number;color:string}){
 return <group>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.03,0]} scale={.88+.12*k}><ringGeometry args={[.32,.42,48]}/><meshBasicMaterial color={color} transparent opacity={k} toneMapped={false} fog={false}/></mesh>
  {pulses(t,from,1.3).map((p,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,.03,0]} renderOrder={4}><ringGeometry args={[.4+.85*p.ph-.03,.4+.85*p.ph,48]}/><meshBasicMaterial color={color} transparent opacity={p.a*.55*k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>)}
  <group scale={[1,Math.max(.001,k),1]}><mesh position={[0,.7,0]}><cylinderGeometry args={[.022,.022,1.4,8]}/><meshBasicMaterial color={C.lavender} transparent opacity={.75} toneMapped={false} fog={false}/></mesh></group>
  <group position={[0,.03,0]}><Halo r={.7} color={color} opacity={.18*k}/></group>
 </group>;
}
function Tower({k,a,t,from,color}:{k:number;a:number;t:number;from:number;color:string}){
 const h=3,legs=[[-1,-1],[1,-1],[1,1],[-1,1]];
 return <group>
  <group scale={[1,Math.max(.001,k),1]}>
   {legs.map(([x,z],i)=>{const b=new THREE.Vector3(x*.32,0,z*.32),top=new THREE.Vector3(x*.05,h,z*.05),mid=b.clone().add(top).multiplyScalar(.5),len=b.distanceTo(top);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),top.clone().sub(b).normalize());
    return <mesh key={i} position={mid.toArray()} quaternion={q} castShadow><boxGeometry args={[.05,len,.05]}/><meshStandardMaterial color="#5B4A7A" roughness={.7}/></mesh>;})}
   {[.7,1.4,2.1].map(y=>{const w=.64*(1-y/h)+.1;return <mesh key={y} position={[0,y,0]}><boxGeometry args={[w,.04,w]}/><meshBasicMaterial color="#7A5CC0" toneMapped={false}/></mesh>;})}
   <mesh position={[0,h+.06,0]}><sphereGeometry args={[.09,16,10]}/><meshBasicMaterial color={color} toneMapped={false} fog={false}/></mesh>
  </group>
  {a>.001&&pulses(t,from,1.1,3).map((p,i)=><mesh key={i} position={[0,h+.06,0]} rotation={[-Math.PI/2,0,0]} renderOrder={4}><ringGeometry args={[.25+2.6*p.ph-.05,.25+2.6*p.ph,64]}/><meshBasicMaterial color={color} transparent opacity={p.a*.6*a*k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} side={THREE.DoubleSide}/></mesh>)}
 </group>;
}
function HubBuilding({k,a,w,h,color}:{k:number;a:number;w:number;h:number;color:string}){
 const y=h*Math.max(.001,k),trim=.05;
 return <group>
  <mesh position={[0,.06+y/2,0]} castShadow receiveShadow><boxGeometry args={[w,y,w]}/><meshStandardMaterial color="#3A3346" roughness={.8}/></mesh>
  {[0,1,2,3].map(i=>{const along=i<2,o=(i%2?1:-1)*(w/2);return <mesh key={i} position={[along?0:o,.06+y+trim/2,along?o:0]}><boxGeometry args={[along?w+trim:trim,trim,along?trim:w+trim]}/><meshBasicMaterial color={color} toneMapped={false} transparent opacity={(.45+.55*a)*k} fog={false}/></mesh>;})}
  {/* MOTION-RULES: the roof trim fades with the building and each window band fades in/out as the roof passes it
      (before 2026-10-21 the trim stayed at full opacity and popped out with the marker; bands toggled in one frame). */}
  {[.3,.55,.8].map(f=>{const o=Math.min(1,Math.max(0,(y-.1-f*h)/.15));if(o<=.002)return null;return <group key={f}>
   <mesh position={[w/2+.006,.06+f*h,0]}><boxGeometry args={[.012,.06,w*.8]}/><meshBasicMaterial color={new THREE.Color("#3A2F54").lerp(YELLOW,a)} toneMapped={false} transparent opacity={o}/></mesh>
   <mesh position={[0,.06+f*h,w/2+.006]}><boxGeometry args={[w*.8,.06,.012]}/><meshBasicMaterial color={new THREE.Color("#3A2F54").lerp(YELLOW,a)} toneMapped={false} transparent opacity={o}/></mesh>
  </group>;})}
  <group position={[0,.08+y,0]}><Halo r={w*.6} color={color} opacity={.25*a*k}/></group>
 </group>;
}
function Alert({k,a,t,from}:{k:number;a:number;t:number;from:number}){
 const spin=(t-from)*1.2;
 return <group>
  <mesh position={[0,1+.06*Math.sin((t-from)*2.4),0]} rotation={[0,spin,0]} scale={.22*Math.max(.001,k)}><octahedronGeometry args={[1,0]}/><meshBasicMaterial color={C.pink} toneMapped={false} fog={false}/></mesh>
  {pulses(t,from,1.4-.6*a).map((p,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,.04,0]} renderOrder={4}><ringGeometry args={[.3+1.1*p.ph-.04,.3+1.1*p.ph,48]}/><meshBasicMaterial color={C.pink} transparent opacity={p.a*(.35+.4*a)*k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>)}
 </group>;
}
function Markers({tl,world,t}:{tl:Tl;world:IsoWorld;t:number}){
 return <>{tl.markers.map(m=>{
  const s=markerState(m,t);if(s.k<=.001)return null;
  const color=TONE[m.tone],[x,y,z]=m.point;
  return <group key={m.id} position={[x,y,z]}>
   {m.kind==="pin"&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.035,0]} scale={.88+.12*s.k}><ringGeometry args={[.2,.28,40]}/><meshBasicMaterial color={color} transparent opacity={s.k} toneMapped={false} fog={false}/></mesh>}
   {m.kind==="beacon"&&<Beacon k={s.k} t={t} from={m.enterAt} color={m.tone==="info"?C.yellow:color}/>}
   {m.kind==="tower"&&<Tower k={s.k} a={s.active} t={t} from={m.enterAt} color={color}/>}
   {m.kind==="hub"&&(()=>{const h=world.hubs.find(q=>q.id===m.id);return h?<HubBuilding k={s.k} a={s.active} w={h.w} h={h.h} color={color}/>:null;})()}
   {m.kind==="alert"&&<Alert k={s.k} a={s.active} t={t} from={m.enterAt}/>}
  </group>;
 })}</>;
}

// ---- Links ----------------------------------------------------------------------------------------------------------
function arcPoint(a:V3,b:V3,u:number):V3{
 const d=Math.hypot(b[0]-a[0],b[2]-a[2]),lift=1.2+.35*d,mid:V3=[(a[0]+b[0])/2,Math.max(a[1],b[1])+lift,(a[2]+b[2])/2];
 const w0=(1-u)**2,w1=2*(1-u)*u,w2=u*u;
 return [w0*a[0]+w1*mid[0]+w2*b[0],w0*a[1]+w1*mid[1]+w2*b[1],w0*a[2]+w1*mid[2]+w2*b[2]];
}
const linkEnds=(l:Tl["links"][number]):[V3,V3]=>[[l.a.point[0],l.a.point[1]+MARKER_TOP[l.a.kind]*.7,l.a.point[2]],[l.b.point[0],l.b.point[1]+MARKER_TOP[l.b.kind]*.7,l.b.point[2]]];
function Link({l,t}:{l:Tl["links"][number];t:number}){
 const s=linkState(l,t),[a,b]=linkEnds(l),color=TONE[l.tone];
 const geo=useMemo(()=>{if(s.draw<=.01||s.k<=.002)return null;const pts=Array.from({length:41},(_,i)=>new THREE.Vector3(...arcPoint(a,b,s.draw*i/40)));return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.035,6,false);},[s.draw,s.k>.002,l]);
 useEffect(()=>()=>geo?.dispose(),[geo]);
 if(!geo)return null;
 const packets=s.draw>=1?[0,1,2].map(i=>{const ph=(((t-l.enterAt-.8)*.55+i/3)%1+1)%1;return {p:arcPoint(a,b,ph),a:Math.sin(Math.PI*ph)};}):[];
 return <group>
  <mesh geometry={geo} renderOrder={3}><meshBasicMaterial color={color} transparent opacity={.85*s.k} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
  {packets.map((p,i)=><mesh key={i} position={p.p} renderOrder={5}><sphereGeometry args={[.09,14,10]}/><meshBasicMaterial color={C.ivory} transparent opacity={p.a*s.k} toneMapped={false} fog={false}/></mesh>)}
 </group>;
}

function Scene({world,tl,t,pose}:{world:IsoWorld;tl:Tl;t:number;pose:IsoPose}){
 return <>
  <CameraRig pose={pose}/>
  <fog attach="fog" args={["#040308",84,124]}/>
  <ambientLight color="#A68BDB" intensity={.9}/>
  <hemisphereLight args={["#E0CDF8","#120C1D",.9]}/>
  <directionalLight position={[19,47,31]} intensity={4} color="#F6F0FF" castShadow shadow-mapSize={[4096,4096]} shadow-camera-left={-46} shadow-camera-right={46} shadow-camera-top={46} shadow-camera-bottom={-46} shadow-camera-near={1} shadow-camera-far={150} shadow-bias={-.0004} shadow-normalBias={.02}/>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[260,260]}/><meshStandardMaterial color="#0A0910" roughness={1}/></mesh>
  <City world={world} tl={tl} t={t}/>
  {[...world.routes.values()].filter(p=>p.deck).map((p,i)=><Deck key={i} path={p} t={t}/>)}
  <Traffic world={world} t={t}/>
  <Jams tl={tl} t={t}/>
  {tl.routes.flatMap(r=>LAYERS[r.style].map((l,i)=><Ribbon key={`${r.id}-${i}`} r={r} t={t} layer={l}/>))}
  {tl.routes.map(r=><LeadDot key={r.id} r={r} t={t}/>)}
  <Markers tl={tl} world={world} t={t}/>
  {tl.links.map((l,i)=><Link key={i} l={l} t={t}/>)}
  <Vehicles tl={tl} t={t}/>
  {(tl.rings??[]).map(r=><RingScene key={r.id} r={r} t={t}/>)}
  {tl.dispatch&&<DispatchScene tl={tl.dispatch} t={t}/>}
  {tl.speedcam&&<SpeedcamScene tl={tl.speedcam} t={t}/>}
 </>;
}

// ---- Overlay (studio design code) -----------------------------------------------------------------------------------
const enterStyle=(k:number):React.CSSProperties=>({opacity:k,transform:`translateY(${(1-k)*18}px) scale(${.88+.12*k})`});
function Tag({x,y,text,color,k,width,top,bottom}:{x:number;y:number;text:string;color:string;k:number;width:number;top:number;bottom:number}){
 // Tags fade as their anchor leaves the stage (frame edge, card above, chapter label below) during a camera move
 // instead of clipping or covering the card; the fade follows the continuous camera, so it never pops.
 const outside=Math.max(0,-x,x-width,top-(y-86),y-bottom),inView=clamp01(1-outside/70);if(k*inView<=.005)return null;
 return <div style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-100%)",pointerEvents:"none",opacity:inView}}>
  <div style={{...enterStyle(k),transformOrigin:"50% 100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
   <div style={{padding:"10px 20px",background:"#120C1DEB",border:`2px solid ${color}`,borderRadius:14,color,fontSize:30,fontWeight:800,letterSpacing:1.5,whiteSpace:"nowrap",textTransform:"uppercase"}}>{text}</div>
   <div style={{width:2,height:26,background:color}}/>
  </div>
 </div>;
}
function Odometer({value,digits,color}:{value:number;digits:number;color:string}){
 // Rolling digits (iso-city): the ones strip moves continuously; a higher digit rolls only while the digits below it
 // pass …9→…0, so a carry never jumps. Leading digits fade in as the value reaches them; the width stays fixed.
 const v=Math.max(0,value),strip=(pos:number,opacity:number,key:number)=><div key={key} style={{height:92,overflow:"hidden",width:50,opacity}}><div style={{transform:`translateY(${-pos*92}px)`}}>{Array.from({length:11},(_,i)=><div key={i} style={{height:92,lineHeight:"92px",textAlign:"center"}}>{i%10}</div>)}</div></div>;
 return <div style={{display:"flex",color,fontSize:88,fontWeight:800,letterSpacing:-2,fontVariantNumeric:"tabular-nums"}}>{Array.from({length:digits},(_,i)=>{
  const d=digits-1-i,p=10**d,below=v%p,pos=d===0?v%10:Math.floor(v/p)%10+Math.max(0,below-(p-1));
  return strip(pos,d===0?1:clamp01(v-(p-1)),i);})}</div>;
}
const ICONS:Record<string,React.ReactNode>={
 pin:<svg width="44" height="54" viewBox="0 0 44 54"><path d="M22 2C11 2 3 10 3 21c0 14 19 31 19 31s19-17 19-31C41 10 33 2 22 2z" fill={C.purple} stroke={C.lavender} strokeWidth="3"/><circle cx="22" cy="21" r="7" fill={C.yellow}/></svg>,
 clock:<svg width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="21" fill={C.purple} stroke={C.lavender} strokeWidth="3"/><path d="M25 12v14l9 6" stroke={C.yellow} strokeWidth="4" fill="none" strokeLinecap="round"/></svg>,
 car:<svg width="56" height="40" viewBox="0 0 56 40"><path d="M6 24l6-12c1-3 3-4 6-4h20c3 0 5 1 6 4l6 12v9H6z" fill={C.purple} stroke={C.lavender} strokeWidth="3"/><circle cx="16" cy="33" r="5" fill={C.yellow}/><circle cx="40" cy="33" r="5" fill={C.yellow}/></svg>,
 signal:<svg width="52" height="48" viewBox="0 0 52 48"><rect x="4" y="30" width="8" height="14" rx="2" fill={C.purple}/><rect x="17" y="21" width="8" height="23" rx="2" fill={C.purple}/><rect x="30" y="12" width="8" height="32" rx="2" fill={C.lavender}/><rect x="43" y="3" width="8" height="41" rx="2" fill={C.yellow}/></svg>,
 bolt:<svg width="40" height="54" viewBox="0 0 40 54"><path d="M24 2L4 32h14l-4 20 22-32H22z" fill={C.yellow} stroke={C.lavender} strokeWidth="3" strokeLinejoin="round"/></svg>,
 box:<svg width="52" height="52" viewBox="0 0 52 52"><path d="M26 4l20 10v24L26 48 6 38V14z" fill={C.purple} stroke={C.lavender} strokeWidth="3" strokeLinejoin="round"/><path d="M6 14l20 10 20-10M26 24v24" stroke={C.yellow} strokeWidth="3" fill="none"/></svg>,
};
function Card({c,tl,t,top}:{c:Tl["cards"][number];tl:Tl;t:number;top:number}){
 const s=cardState(c,t);if(s.k<=.002)return null;
 const route=c.route?tl.routes.find(r=>r.id===c.route):undefined;
 const current=[...c.keys].reverse().find(k=>t>=k.at)??c.keys[0],prev=c.keys[c.keys.indexOf(current)-1];
 const mixK=prev?easeInOut(clamp01((t-current.at)/.6)):1,numberColor=`#${col(TONE[prev?.tone??current.tone]).lerp(col(TONE[current.tone]),mixK).getHexString()}`;
 return <div style={{position:"absolute",left:78,right:140,top,height:124,...enterStyle(s.k),transformOrigin:"50% 0%",display:"flex",alignItems:"center",gap:24,padding:"0 26px",background:"#120C1DE6",border:`2px solid ${C.purpleStroke}`,borderRadius:28}}>
  <div style={{width:84,height:84,flexShrink:0,borderRadius:22,background:C.surfaceBottom,border:`2px solid ${C.purpleStroke}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{ICONS[c.icon]}</div>
  <div style={{display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0}}>
   <div style={{fontSize:21,fontWeight:700,letterSpacing:5,color:C.lavender,opacity:.8,textTransform:"uppercase",whiteSpace:"nowrap"}}>{c.label}</div>
   <div style={{display:"flex",alignItems:"baseline",gap:10,marginTop:-8}}>
    <Odometer value={s.value} digits={String(Math.max(...c.keys.map(k=>k.value),1)).length} color={numberColor}/>
    {c.unit&&<span style={{fontSize:34,fontWeight:700,color:C.lavender}}>{c.unit}</span>}
    <span style={{position:"relative",marginLeft:10,alignSelf:"center",height:40,minWidth:10}}>
     {s.chips.map((ch,i)=>ch.text&&ch.k>.002?<span key={i} style={{position:"absolute",left:0,top:0,padding:"5px 12px",borderRadius:10,background:`${TONE[ch.tone]}26`,border:`2px solid ${TONE[ch.tone]}`,color:TONE[ch.tone],fontSize:22,fontWeight:800,whiteSpace:"nowrap",opacity:ch.k,transform:`translateY(${(1-ch.k)*18}px) scale(${.88+.12*ch.k})`}}>{ch.text}</span>:null)}
    </span>
   </div>
  </div>
  {route&&<div style={{marginLeft:"auto",display:"flex",alignItems:"flex-end",gap:8,height:76}}>
   {[0,1,2,3,4].map(i=>{const sAt=route.path.L*(i+.5)/5,cc=traffic(trafficAt(route.zones,sAt,t),LAV),g=tween(t,c.enterAt+.3+i*.1,c.enterAt+.75+i*.1,easeEnter);return <div key={i} style={{width:15,height:(24+i*13)*Math.max(.02,g),borderRadius:5,background:`#${cc.getHexString()}`,opacity:g}}/>;})}
  </div>}
 </div>;
}

export function IsometricFilm({plan,profile,audio,alignment=[]}:Props){
 const frame=useCurrentFrame(),{width,height}=useVideoConfig(),t=frame/30,clock=sceneClock(plan),Lay=isoLayout(profile.production?.portraitLayout,profile.production?.overlayVersion);
 const world=useMemo(()=>isoWorld(plan.isometric!),[plan]);
 const tl=useMemo(()=>isoTimeline(plan.isometric!,world,plan.scenes,alignment),[plan,world,alignment]);
 const pose=cameraAt(t,tl.camera),last=clock.at(-1)!.end,lang=profile.production?.language;
 const avatar=plan.headerAvatar??profile.headerAvatar;
 return <AbsoluteFill style={{background:C.background,color:profile.foreground,fontFamily:`'${profile.font} Variable',sans-serif`,overflow:"hidden"}}>
  {audio&&<Audio src={staticFile(audio)}/>}
  <ThreeCanvas orthographic flat shadows width={width} height={height} camera={{position:cameraPosition(pose),zoom:pose.zoom,near:.1,far:400}} gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}} dpr={1} style={{position:"absolute",inset:0}}>
   <Scene world={world} tl={tl} t={t} pose={pose}/>
  </ThreeCanvas>
  {/* Overlay v3: the city runs to every edge — no header/footer fades, no vignette; only a soft shade under the captions. */}
  {!Lay.bare&&<div style={{position:"absolute",inset:0,background:`linear-gradient(to bottom, #000000F5 0px, #000000E0 ${Lay.header+44}px, #00000000 ${Lay.header+384}px, #00000000 ${Lay.chapter-72}px, #000000D9 ${Lay.captions+70}px, #000000 ${Math.min(height,Lay.captions+340)}px)`}}/>}
  {!Lay.bare&&<div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 90% 60% at 50% 50%, transparent 55%, #00000099 100%)"}}/>}
  {tl.markers.map(m=>{if(!m.text)return null;const s=markerState(m,t);if(s.k<=.002)return null;const q=project([m.point[0],m.point[1]+MARKER_TOP[m.kind]+(m.kind==="pin"?0:.1),m.point[2]],pose,width,height);
   return <Tag key={m.id} x={q.x} y={q.y} text={m.text} color={m.kind==="beacon"&&m.tone==="info"?C.yellow:TONE[m.tone]} k={s.k} width={width} top={tl.cards.length?Lay.card+Lay.cardHeight+8:Lay.labelsTop} bottom={(Lay.chrome?Lay.chapter:Lay.captions)-8}/>;})}
  {tl.dispatch&&<DispatchTags tl={tl.dispatch} t={t} pose={pose} width={width} height={height} top={tl.cards.length?Lay.card+Lay.cardHeight+8:Lay.labelsTop} bottom={(Lay.chrome?Lay.chapter:Lay.captions)-8}/>}
  <RingTags rings={tl.rings??[]} t={t} pose={pose} width={width} height={height} top={tl.cards.length?Lay.card+Lay.cardHeight+8:Lay.labelsTop} bottom={(Lay.chrome?Lay.chapter:Lay.captions)-8}/>
  <IsometricTiles tl={tl} t={t} pose={pose} width={width} height={height} top={tl.cards.length?Lay.card+Lay.cardHeight+8:Lay.labelsTop} bottom={(Lay.chrome?Lay.chapter:Lay.captions)-8} media={plan.media}/>
  {tl.speedcam&&<SpeedcamOverlay tl={tl.speedcam} t={t} pose={pose} width={width} height={height} top={tl.cards.length?Lay.card+Lay.cardHeight+8:Lay.labelsTop} bottom={(Lay.chrome?Lay.chapter:Lay.captions)-8}/>}
  {!Lay.bare&&<div style={{position:"absolute",left:78,right:140,top:Lay.header,display:"flex",alignItems:"center",gap:18}}><div style={{width:56,height:56,borderRadius:"50%",background:"#000",border:`2px solid ${C.purpleStroke}`,overflow:"hidden"}}>{avatar&&<Img src={staticFile(avatar.file)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</div><span style={{fontSize:29,fontWeight:750}}>{profile.username??"@xtuned"}</span><span style={{marginLeft:"auto",fontSize:23,color:C.muted}}>{Math.round(last)} {lang==="en"?"s":"с"}</span></div>}
  {!Lay.bare&&<div style={{position:"absolute",left:78,right:140,top:Lay.title,fontSize:34,fontWeight:750,letterSpacing:-1,lineHeight:1.12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{plan.title}</div>}
  {Lay.chrome&&<div style={{position:"absolute",left:78,right:140,top:Lay.progress,display:"flex",gap:8}}>{clock.map((s,i)=>{const p=clamp01((t-s.start)/s.seconds);return <div key={i} style={{flex:1,height:6,background:C.surfaceTop,borderRadius:4,overflow:"hidden"}}><div style={{height:6,width:`${p*100}%`,background:`#${PURPLE.clone().lerp(YELLOW,chapterAccent(t,s.start,s.end)).getHexString()}`}}/></div>;})}</div>}
  {tl.cards.map(c=><Card key={c.id} c={c} tl={tl} t={t} top={Lay.card}/>)}
  {Lay.chrome&&clock.map((s,i)=>{const o=easeEnter((t-s.start-.05)/.35)*(i===clock.length-1?1:1-easeEnter((t-(s.end-.32))/.3));if(o<=.005)return null;return <div key={s.id} style={{position:"absolute",left:78,right:140,top:Lay.chapter,opacity:o,color:C.lavender,fontSize:26,fontWeight:800,letterSpacing:2.5,textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.title}</div>;})}
  {Lay.bare&&<CaptionShade top={Lay.captions}/>}
  {alignment.map((a,i)=><Captions key={i} a={a} t={t} lang={lang} qualityMode={profile.production?.version===2} nextStart={alignment[i+1]?.words?.[0]?.start??alignment[i+1]?.start} top={Lay.captions}/>)}
 </AbsoluteFill>;
}
