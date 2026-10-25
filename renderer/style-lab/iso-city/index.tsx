// Style lab · «Изометрический город»: 5-second test of an isometric low-poly city in the studio palette.
// Orthographic Three.js camera at the true isometric angle, prepared procedural geometry, frame-driven motion only.
import React,{useEffect,useLayoutEffect,useMemo,useRef} from "react";
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,useVideoConfig} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";
import "@fontsource-variable/manrope";
import {
 C,FPS,FRAMES,T,CITY,CARS,PATH,DECK,ZONES,HERO_S,JAM_CARS,START,DEST,
 camState,along,carState,trafficMix,drawnS,sweepWeight,jamCarS,tween,smooth,clamp01,
 type V3,type Building,
} from "./city";

const HANDLE="@kagenami_ai";
const col=(hex:string)=>new THREE.Color(hex);
const YELLOW=col(C.yellow),PINK=col(C.pink),LAV=col(C.lavender),PURPLE=col(C.purple);
// Free-flow parts keep the route colour; only slow (yellow) and jammed (pink) parts are recoloured.
const traffic=(s:number,base:THREE.Color,out=new THREE.Color())=>{const m=trafficMix(s);return out.setRGB(base.r*m.g+YELLOW.r*m.y+PINK.r*m.p,base.g*m.g+YELLOW.g*m.y+PINK.g*m.p,base.b*m.g+YELLOW.b*m.y+PINK.b*m.p);};
const rise=(b:{delay:number},t:number)=>Math.max(.001,tween(t,T.cityRise[0]+b.delay,T.cityRise[0]+b.delay+.55));

// ---- Instancing helper --------------------------------------------------------------------------
const M=new THREE.Matrix4(),L=new THREE.Matrix4(),Q=new THREE.Quaternion(),EU=new THREE.Euler(),V=new THREE.Vector3(),S3=new THREE.Vector3();
const boxAt=(m:THREE.Matrix4,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>m.compose(V.set(x,y,z),Q.identity(),S3.set(sx,sy,sz));
function Inst<Item>({items,geometry,material,color,place,t,shadow=true}:{items:Item[];geometry:THREE.BufferGeometry;material:THREE.Material;color:(it:Item,i:number)=>string;place:(it:Item,m:THREE.Matrix4,i:number)=>void;t:number;shadow?:boolean}){
 const ref=useRef<THREE.InstancedMesh>(null);
 useLayoutEffect(()=>{const mesh=ref.current!,c=new THREE.Color();items.forEach((it,i)=>mesh.setColorAt(i,c.set(color(it,i))));if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;},[items]);
 useLayoutEffect(()=>{const mesh=ref.current!,m=new THREE.Matrix4();items.forEach((it,i)=>{place(it,m,i);mesh.setMatrixAt(i,m);});mesh.instanceMatrix.needsUpdate=true;});
 return <instancedMesh ref={ref} args={[geometry,material,items.length]} frustumCulled={false} castShadow={shadow} receiveShadow/>;
}

// ---- Camera ---------------------------------------------------------------------------------------
function CameraRig({t}:{t:number}){
 const {camera}=useThree();
 useLayoutEffect(()=>{const s=camState(t);camera.position.set(...s.pos);camera.up.set(0,1,0);camera.lookAt(...s.target);(camera as THREE.OrthographicCamera).zoom=s.zoom;camera.updateProjectionMatrix();});
 return null;
}
function project(p:V3,t:number,w:number,h:number){
 const s=camState(t),cam=new THREE.OrthographicCamera(-w/2,w/2,h/2,-h/2,.1,400);
 cam.position.set(...s.pos);cam.lookAt(...s.target);cam.zoom=s.zoom;cam.updateProjectionMatrix();cam.updateMatrixWorld();
 const v=new THREE.Vector3(...p).project(cam);return {x:(v.x+1)/2*w,y:(1-v.y)/2*h};
}

// ---- City -----------------------------------------------------------------------------------------
function City({t}:{t:number}){
 const g=useMemo(()=>{
  const base=new THREE.BoxGeometry(1,1,1).translate(0,.5,0),unit=new THREE.BoxGeometry(1,1,1);
  return {
   base,unit,cone:new THREE.ConeGeometry(.26,.62,6).translate(0,.31,0),
   solid:new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.9,metalness:0}),
   tree:new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.9,flatShading:true}),
   glow:new THREE.MeshBasicMaterial({color:"#ffffff",toneMapped:false}),
  };
 },[]);
 useEffect(()=>()=>{for(const v of Object.values(g))v.dispose();},[g]);
 const {buildings,roofs,windows,plates,trees,dashes}=CITY;
 const top=(b:Building)=>b.h*rise(b,t);
 return <>
  <Inst items={plates} geometry={g.base} material={g.solid} t={t} shadow={false} color={p=>p.park?"#13210F":"#17131F"} place={(p,m)=>boxAt(m,p.x,0,p.z,3,.06,3)}/>
  <Inst items={dashes} geometry={g.unit} material={g.glow} t={t} shadow={false} color={()=>"#241E33"} place={(d,m)=>boxAt(m,d.x,.006,d.z,d.axis==="x"?.38:.045,.01,d.axis==="x"?.045:.38)}/>
  <Inst items={buildings} geometry={g.base} material={g.solid} t={t} color={b=>b.color} place={(b,m)=>boxAt(m,b.x,.06,b.z,b.w,b.hb*rise(b,t),b.d)}/>
  <Inst items={buildings.filter(b=>b.tw>0)} geometry={g.base} material={g.solid} t={t} color={b=>b.color} place={(b,m)=>{const r=rise(b,t);boxAt(m,b.x,.06+b.hb*r,b.z,b.tw,(b.h-b.hb)*r,b.td);}}/>
  <Inst items={roofs} geometry={g.base} material={g.solid} t={t} color={()=>"#433B54"} place={(r,m)=>{const b=buildings[r.b],k=rise(b,t);boxAt(m,r.x,.06+top(b),r.z,r.s*k,r.h*k,r.s*k);}}/>
  <Inst items={windows} geometry={g.unit} material={g.glow} t={t} shadow={false} color={w=>w.color} place={(w,m)=>{const k=rise(buildings[w.b],t);boxAt(m,w.x,.06+w.y*k,w.z,w.face==="x"?.012:w.len,.045*k,w.face==="x"?w.len:.012);}}/>
  <Inst items={trees} geometry={g.cone} material={g.tree} t={t} color={(_,i)=>i%3?"#2E5A25":"#3F7232"} place={(tr,m)=>{const k=Math.max(.001,tween(t,tr.delay,tr.delay+.55))*tr.s;boxAt(m,tr.x,.06,tr.z,k,k,k);}}/>
 </>;
}

// ---- Elevated deck ---------------------------------------------------------------------------------
function deckGeometry(){
 const pos:number[]=[],idx:number[]=[],w=DECK.width/2,th=.14;
 const ring:number[][]=[];
 for(let s=ZONES.deckIn;s<=ZONES.deckOut+1e-6;s+=.1){
  const {p,side}=along(s),y=p[1];
  const l=[p[0]+side[0]*w,p[2]+side[1]*w],r=[p[0]-side[0]*w,p[2]-side[1]*w];
  ring.push([l[0],y,l[1],r[0],y,r[1],l[0],y-th,l[1],r[0],y-th,r[1]]);
 }
 // separate vertices per side so flat normals stay crisp
 const quad=(a:number[],b:number[],c:number[],d:number[])=>{const o=pos.length/3;pos.push(...a,...b,...c,...d);idx.push(o,o+2,o+1,o+1,o+2,o+3);};
 const v=(r:number[],k:number)=>r.slice(k*3,k*3+3);
 for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i];
  quad(v(a,1),v(a,0),v(b,1),v(b,0));       // top
  quad(v(a,0),v(a,2),v(b,0),v(b,2));       // left side
  quad(v(a,3),v(a,1),v(b,3),v(b,1));       // right side
  quad(v(a,2),v(a,3),v(b,2),v(b,3));       // underside
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 return geo;
}
const PYLONS=[3.4,1,-1,-3.4];
function Deck({t}:{t:number}){
 const geo=useMemo(deckGeometry,[]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 const k=Math.max(.001,tween(t,T.deckRise[0],T.deckRise[1]));
 return <group scale={[1,k,1]}>
  <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color="#3A3346" roughness={.85} side={THREE.DoubleSide}/></mesh>
  {PYLONS.map(z=>{const h=Math.max(.05,DECK.h*smooth((DECK.z0-z)/2)*smooth((z-DECK.z3)/2)-.14);return <group key={z}>
   <mesh position={[DECK.x,h/2,z]} castShadow><boxGeometry args={[.08,h,.08]}/><meshBasicMaterial color="#7A5CC0" toneMapped={false}/></mesh>
   <mesh position={[DECK.x,h-.03,z]}><boxGeometry args={[.7,.06,.09]}/><meshBasicMaterial color="#7A5CC0" toneMapped={false}/></mesh>
  </group>;})}
 </group>;
}

// ---- Route ribbons --------------------------------------------------------------------------------
type Layer={width:number;lift:number;base:THREE.Color;gain:number;taper:number};
const LAYERS:Layer[]=[
 {width:.75,lift:.022,base:PURPLE,gain:.16,taper:.7},
 {width:.32,lift:.028,base:PURPLE,gain:.42,taper:.35},
 {width:.11,lift:.034,base:LAV,gain:1,taper:0},
];
function ribbonGeometry(end:number,layer:Layer,t:number){
 const pos:number[]=[],cols:number[]=[],idx:number[]=[],c=new THREE.Color(),tc=new THREE.Color();
 const samples:number[]=[];
 for(let i=0;i<PATH.S.length&&PATH.S[i]<end;i++)samples.push(PATH.S[i]);
 samples.push(end);
 for(const s of samples){
  const {p,side}=along(s),w=layer.width/2;
  traffic(s,layer.base,tc);c.copy(layer.base).lerp(tc,sweepWeight(s,t));
  const fade=layer.taper?smooth((end-s)/layer.taper):1,k=layer.gain*fade;
  pos.push(p[0]+side[0]*w,p[1]+layer.lift,p[2]+side[1]*w,p[0]-side[0]*w,p[1]+layer.lift,p[2]-side[1]*w);
  cols.push(c.r*k,c.g*k,c.b*k,c.r*k,c.g*k,c.b*k);
 }
 for(let i=1;i<samples.length;i++){const o=(i-1)*2;idx.push(o,o+1,o+2,o+1,o+3,o+2);}
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));geo.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));geo.setIndex(idx);
 return geo;
}
function Ribbon({t,layer}:{t:number;layer:Layer}){
 const end=drawnS(t);
 const geo=useMemo(()=>end>.02?ribbonGeometry(end,layer,t):null,[end,t,layer]);
 useEffect(()=>()=>geo?.dispose(),[geo]);
 if(!geo)return null;
 const additive=layer.taper>0;
 return <mesh geometry={geo} renderOrder={additive?3:2}><meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} fog={false} transparent={additive} blending={additive?THREE.AdditiveBlending:THREE.NormalBlending} depthWrite={!additive}/></mesh>;
}
function Halo({r,color,opacity}:{r:number;color:string;opacity:number}){
 return <mesh rotation={[-Math.PI/2,0,0]} renderOrder={4}><circleGeometry args={[r,40]}/><meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>;
}
function LeadDot({t}:{t:number}){
 const k=tween(t,T.draw[0],T.draw[0]+.18)*(1-tween(t,T.draw[1]-.05,T.draw[1]+.25));
 if(k<=.001)return null;
 const {p}=along(drawnS(t));
 return <group position={[p[0],p[1]+.09,p[2]]} scale={k}>
  <mesh><sphereGeometry args={[.1,20,14]}/><meshBasicMaterial color={C.yellow} toneMapped={false} fog={false}/></mesh>
  <mesh renderOrder={5}><sphereGeometry args={[.3,20,14]}/><meshBasicMaterial color={C.yellow} transparent opacity={.28} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>
 </group>;
}
function Destination({t}:{t:number}){
 const k=tween(t,T.destIn[0],T.destIn[1]);
 if(k<=.001)return null;
 const pulses=[0,.5].map(o=>{const ph=(((t-T.destIn[0])/1.3+o)%1+1)%1;return {r:.4+.85*ph,a:Math.sin(Math.PI*ph)*.55*k};});
 return <group position={[DEST[0],.03,DEST[2]]}>
  <mesh rotation={[-Math.PI/2,0,0]} scale={.88+.12*k}><ringGeometry args={[.32,.42,48]}/><meshBasicMaterial color={C.yellow} transparent opacity={k} toneMapped={false} fog={false}/></mesh>
  {pulses.map((p,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} renderOrder={4}><ringGeometry args={[p.r-.03,p.r,48]}/><meshBasicMaterial color={C.yellow} transparent opacity={p.a} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>)}
  <group scale={[1,Math.max(.001,k),1]}><mesh position={[0,.7,0]}><cylinderGeometry args={[.022,.022,1.4,8]}/><meshBasicMaterial color={C.lavender} transparent opacity={.75} toneMapped={false} fog={false}/></mesh></group>
  <Halo r={.7} color={C.yellow} opacity={.18*k}/>
 </group>;
}

// ---- Cars ------------------------------------------------------------------------------------------
type Part={x:number;y:number;z:number;sx:number;sy:number;sz:number};
const BODY:Part={x:0,y:.1,z:0,sx:.5,sy:.13,sz:.27},CABIN:Part={x:-.04,y:.215,z:0,sx:.26,sy:.1,sz:.23};
const HEAD:Part[]=[-1,1].map(sd=>({x:.252,y:.1,z:.08*sd,sx:.02,sy:.045,sz:.06}));
const TAIL:Part[]=[-1,1].map(sd=>({x:-.252,y:.1,z:.08*sd,sx:.02,sy:.045,sz:.06}));
const carMatrix=(m:THREE.Matrix4,x:number,y:number,z:number,yaw:number,pitch:number,s:number,part:Part)=>{
 M.compose(V.set(x,y,z),Q.setFromEuler(EU.set(0,yaw,pitch,"YZX")),S3.set(s,s,s));
 L.compose(V.set(part.x,part.y,part.z),Q.identity(),S3.set(part.sx,part.sy,part.sz));
 m.multiplyMatrices(M,L);
};
function Traffic({t}:{t:number}){
 const g=useMemo(()=>({box:new THREE.BoxGeometry(1,1,1),solid:new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.6}),light:new THREE.MeshBasicMaterial({color:"#ffffff",toneMapped:false})}),[]);
 useEffect(()=>()=>{for(const v of Object.values(g))v.dispose();},[g]);
 const lights=useMemo(()=>CARS.flatMap((car,i)=>[0,1].map(k=>({i,k}))),[]);
 const state=CARS.map(c=>carState(c,t));
 const put=(i:number,m:THREE.Matrix4,p:Part)=>{const s=state[i];carMatrix(m,s.x,0,s.z,s.yaw,0,Math.max(.001,s.s),p);};
 return <>
  <Inst items={CARS} geometry={g.box} material={g.solid} t={t} color={c=>c.color} place={(_,m,i)=>put(i,m,BODY)}/>
  <Inst items={CARS} geometry={g.box} material={g.solid} t={t} color={()=>C.card} place={(_,m,i)=>put(i,m,CABIN)}/>
  <Inst items={lights} geometry={g.box} material={g.light} t={t} shadow={false} color={()=>C.ivory} place={(l,m)=>put(l.i,m,HEAD[l.k])}/>
  <Inst items={lights} geometry={g.box} material={g.light} t={t} shadow={false} color={()=>C.pink} place={(l,m)=>put(l.i,m,TAIL[l.k])}/>
 </>;
}
function RouteCar({s,scale,body,cabin,brake}:{s:number;scale:number;body:string;cabin:string;brake:number}){
 const {p,yaw,pitch}=along(s);
 return <group position={[p[0],p[1]+.02,p[2]]} rotation={[0,yaw,pitch,"YZX"]} scale={Math.max(.001,scale)}>
  {[[BODY,body],[CABIN,cabin]].map(([q,c],i)=>{const pt=q as Part;return <mesh key={i} position={[pt.x,pt.y,pt.z]} castShadow><boxGeometry args={[pt.sx,pt.sy,pt.sz]}/><meshStandardMaterial color={c as string} roughness={.55}/></mesh>;})}
  {HEAD.map((h,i)=><mesh key={`h${i}`} position={[h.x,h.y,h.z]}><boxGeometry args={[h.sx,h.sy,h.sz]}/><meshBasicMaterial color={C.ivory} toneMapped={false}/></mesh>)}
  {TAIL.map((h,i)=><mesh key={`t${i}`} position={[h.x,h.y,h.z]}><boxGeometry args={[h.sx,h.sy,h.sz]}/><meshBasicMaterial color={C.pink} toneMapped={false}/></mesh>)}
  {brake>0&&<mesh position={[-.3,.1,0]} renderOrder={5}><sphereGeometry args={[.16,16,10]}/><meshBasicMaterial color={C.pink} transparent opacity={.35*brake} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false}/></mesh>}
 </group>;
}
function Hero({t,frame}:{t:number;frame:number}){
 const k=tween(t,T.heroIn[0],T.heroIn[1]),s=HERO_S[Math.min(frame,FRAMES)],{p}=along(s);
 return <>
  <group position={[START[0],.03,START[2]]}><mesh rotation={[-Math.PI/2,0,0]} scale={.88+.12*k}><ringGeometry args={[.36,.44,48]}/><meshBasicMaterial color={C.lavender} transparent opacity={k*.9} toneMapped={false} fog={false}/></mesh></group>
  <group position={[p[0],p[1]+.025,p[2]]}><Halo r={.62} color={C.purple} opacity={.42*k}/></group>
  <group scale={1}><RouteCar s={s} scale={1.3*k} body={C.lavender} cabin={C.purple} brake={0}/></group>
 </>;
}
function Jam({t}:{t:number}){
 return <>{Array.from({length:JAM_CARS},(_,i)=>{const k=tween(t,.95+i*.06,1.45+i*.06),brake=tween(t,T.sweep[0]+.5,T.sweep[0]+.9)*(.75+.25*Math.sin(t*5+i));return <RouteCar key={i} s={jamCarS(i,t)} scale={k} body={["#3A3346","#2C2D28","#4A4060","#3A3346","#2C2D28"][i]} cabin={C.card} brake={brake}/>;})}</>;
}

function Scene({t,frame}:{t:number;frame:number}){
 return <>
  <CameraRig t={t}/>
  <fog attach="fog" args={["#040308",84,124]}/>
  <ambientLight color="#A68BDB" intensity={.9}/>
  <hemisphereLight args={["#E0CDF8","#120C1D",.9]}/>
  <directionalLight position={[19,47,31]} intensity={4} color="#F6F0FF" castShadow shadow-mapSize={[4096,4096]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-near={1} shadow-camera-far={140} shadow-bias={-.0004} shadow-normalBias={.02}/>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[240,240]}/><meshStandardMaterial color="#0A0910" roughness={1}/></mesh>
  <City t={t}/>
  <Deck t={t}/>
  <Traffic t={t}/>
  <Jam t={t}/>
  {LAYERS.map((l,i)=><Ribbon key={i} t={t} layer={l}/>)}
  <LeadDot t={t}/>
  <Destination t={t}/>
  <Hero t={t} frame={frame}/>
 </>;
}

// ---- Overlay (studio design code) -----------------------------------------------------------------
const enterStyle=(k:number):React.CSSProperties=>({opacity:k,transform:`translateY(${(1-k)*18}px) scale(${.88+.12*k})`});
function Pin({t,at,p,text,tone=C.lavender,border=C.purpleStroke,w,h}:{t:number;at:number;p:V3;text:string;tone?:string;border?:string;w:number;h:number}){
 const k=tween(t,at,at+.45);if(k<=0)return null;
 const q=project(p,t,w,h);
 return <div style={{position:"absolute",left:q.x,top:q.y,transform:"translate(-50%,-100%)",pointerEvents:"none"}}>
  <div style={{...enterStyle(k),transformOrigin:"50% 100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
   <div style={{padding:"9px 18px",background:"#120C1DEB",border:`2px solid ${border}`,borderRadius:14,color:tone,fontSize:26,fontWeight:800,letterSpacing:1.5,whiteSpace:"nowrap"}}>{text}</div>
   <div style={{width:2,height:26,background:border}}/>
  </div>
 </div>;
}
function Odometer({value,color}:{value:number;color:string}){
 // Rolling digits: a digit strip moves continuously, the carry rolls in only while the ones pass 9→10.
 const ones=((value%10)+10)%10,tens=Math.floor(value/10)+Math.max(0,ones-9);
 const strip=(v:number)=><div style={{height:92,overflow:"hidden",width:50}}><div style={{transform:`translateY(${-v*92}px)`}}>{Array.from({length:11},(_,i)=><div key={i} style={{height:92,lineHeight:"92px",textAlign:"center"}}>{i%10}</div>)}</div></div>;
 return <div style={{display:"flex",color,fontSize:88,fontWeight:800,letterSpacing:-2,fontVariantNumeric:"tabular-nums"}}>{strip(tens%10)}{strip(ones)}</div>;
}
function Card({t}:{t:number}){
 const k=tween(t,T.card[0],T.card[1]),eta=tween(t,T.eta[0],T.eta[1]),value=18+7*eta;
 const numberColor=`#${LAV.clone().lerp(YELLOW,eta).getHexString()}`;
 const chip=tween(t,T.eta[1]-.2,T.eta[1]+.25);
 return <div style={{position:"absolute",left:78,right:140,top:426,height:124,...enterStyle(k),transformOrigin:"50% 0%",display:"flex",alignItems:"center",gap:24,padding:"0 26px",background:"#120C1DE6",border:`2px solid ${C.purpleStroke}`,borderRadius:28}}>
  <div style={{width:84,height:84,borderRadius:22,background:C.surfaceBottom,border:`2px solid ${C.purpleStroke}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
   <svg width="44" height="54" viewBox="0 0 44 54"><path d="M22 2C11 2 3 10 3 21c0 14 19 31 19 31s19-17 19-31C41 10 33 2 22 2z" fill={C.purple} stroke={C.lavender} strokeWidth="3"/><circle cx="22" cy="21" r="7" fill={C.yellow}/></svg>
  </div>
  <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
   <div style={{fontSize:21,fontWeight:700,letterSpacing:5,color:C.lavender,opacity:.8}}>ARRIVE IN</div>
   <div style={{display:"flex",alignItems:"baseline",gap:10,marginTop:-8}}>
    <Odometer value={value} color={numberColor}/>
    <span style={{fontSize:34,fontWeight:700,color:C.lavender}}>min</span>
    <span style={{marginLeft:10,alignSelf:"center",padding:"5px 12px",borderRadius:10,background:`${C.pink}26`,border:`2px solid ${C.pink}`,color:C.pink,fontSize:22,fontWeight:800,opacity:chip,transform:`translateY(${(1-chip)*18}px) scale(${.88+.12*chip})`}}>+7</span>
   </div>
  </div>
  <div style={{marginLeft:"auto",display:"flex",alignItems:"flex-end",gap:8,height:76}}>
   {[0,1,2,3,4].map(i=>{const s=PATH.L*(i+.5)/5,c=LAV.clone().lerp(traffic(s,LAV),sweepWeight(s,t)),g=tween(t,.65+i*.1,1.1+i*.1);return <div key={i} style={{width:15,height:(24+i*13)*Math.max(.02,g),borderRadius:5,background:`#${c.getHexString()}`,opacity:g}}/>;})}
  </div>
 </div>;
}
const WORDS=[
 [{w:"Maps",a:.4,b:.7},{w:"plans",a:.7,b:1.05},{w:"your",a:1.05,b:1.25},{w:"route",a:1.25,b:1.8}],
 [{w:"and",a:2.55,b:2.75},{w:"sees",a:2.75,b:3.05},{w:"the",a:3.05,b:3.2},{w:"jam",a:3.2,b:3.6},{w:"ahead",a:3.6,b:4.15}],
];
const GROUPS=[[.3,2.5],[2.5,99]];
function Captions({t}:{t:number}){
 return <div style={{position:"absolute",left:78,right:140,top:1360,height:145,overflow:"hidden"}}>
  {WORDS.map((words,n)=>{const [a,b]=GROUPS[n],enter=tween(t,a,a+.2),exit=tween(t,b,b+.2),o=enter*(1-exit);if(o<=0)return null;
   return <div key={n} style={{position:"absolute",inset:0,display:"flex",justifyContent:"center",alignItems:"center",flexWrap:"wrap",gap:"8px 9px",fontSize:48,fontWeight:800,lineHeight:1.3,letterSpacing:-1.5,opacity:o,transform:`translateY(${(1-enter)*64-exit*64}px) scale(${.98+.02*enter})`}}>
    {words.map((w,j)=>{const hl=clamp01((t-w.a)/.1)*(1-clamp01((t-w.b)/.1));return <span key={j} style={{position:"relative",padding:"0 7px",borderRadius:9,color:C.text}}><span style={{position:"absolute",inset:0,borderRadius:9,background:C.purple,opacity:hl,transform:`scaleX(${.9+.1*hl})`}}/><span style={{position:"relative"}}>{w.w}</span></span>;})}
   </div>;})}
 </div>;
}
const SEGMENTS=[[0,1.4],[1.4,3.1],[3.1,5]];
function Header({t}:{t:number}){
 return <>
  <div style={{position:"absolute",left:78,right:140,top:256,display:"flex",alignItems:"center",gap:20}}>
   <div style={{width:54,height:54,borderRadius:"50%",background:"#000",border:`2px solid ${C.purpleStroke}`}}/>
   <span style={{fontSize:28,fontWeight:700}}>{HANDLE}</span>
   <span style={{marginLeft:"auto",fontSize:22,color:C.muted}}>ISO 3D · test</span>
  </div>
  <div style={{position:"absolute",left:78,right:140,top:328,fontSize:38,fontWeight:700,letterSpacing:-1}}>How maps predict traffic</div>
  <div style={{position:"absolute",left:78,right:140,top:394,display:"flex",gap:8}}>
   {SEGMENTS.map(([a,b],i)=><div key={i} style={{flex:1,height:5,background:C.surfaceTop,borderRadius:4,overflow:"hidden"}}><div style={{height:5,width:`${clamp01((t-a)/(b-a))*100}%`,background:C.purple}}/></div>)}
  </div>
 </>;
}

function Film(){
 const frame=useCurrentFrame(),{width,height}=useVideoConfig(),t=frame/FPS;
 const deckMid=along((ZONES.jamIn+ZONES.jamOut)/2).p;
 return <AbsoluteFill style={{background:C.background,color:C.text,fontFamily:"'Manrope Variable',sans-serif",overflow:"hidden"}}>
  <ThreeCanvas orthographic flat shadows width={width} height={height} camera={{position:camState(0).pos,zoom:camState(0).zoom,near:.1,far:400}} gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}} dpr={1} style={{position:"absolute",inset:0}}>
   <Scene t={t} frame={frame}/>
  </ThreeCanvas>
  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, #000000F5 0px, #000000E0 300px, #00000000 640px, #00000000 1240px, #000000D9 1430px, #000000 1700px)"}}/>
  <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 90% 60% at 50% 50%, transparent 55%, #00000099 100%)"}}/>
  <Pin t={t} at={T.heroIn[0]+.1} p={[START[0],.55,START[2]]} text="NOW" w={width} h={height}/>
  <Pin t={t} at={T.destIn[0]+.15} p={[DEST[0],1.45,DEST[2]]} text="ARRIVE" tone={C.yellow} border={C.yellow} w={width} h={height}/>
  <Pin t={t} at={T.jamPill[0]} p={[deckMid[0],deckMid[1]+.6,deckMid[2]]} text="JAM · +7 MIN" tone={C.pink} border={C.pink} w={width} h={height}/>
  <Header t={t}/>
  <Card t={t}/>
  <Captions t={t}/>
 </AbsoluteFill>;
}
registerRoot(()=><Composition id="StyleLab" component={Film} durationInFrames={FRAMES} fps={FPS} width={1080} height={1920}/>);
