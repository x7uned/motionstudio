import {StudioBackground} from "./StudioBackground";
import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from "react";
import {AbsoluteFill,Audio,staticFile,useCurrentFrame,useVideoConfig,delayRender,continueRender,cancelRender} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";
import {GLTFLoader,type GLTF} from "three/examples/jsm/loaders/GLTFLoader.js";
import {clone as cloneSkeleton} from "three/examples/jsm/utils/SkeletonUtils.js";
import {sceneClock,type Storyboard,type StyleProfile} from "../src/lib/model";
import {anchorTime} from "../src/lib/scene3d";
import {NETCODE_MODELS,eventTimes,gameClock,hookRunEnd,pathAt,pointAt,wallEntry,ARENA,LAG,FREEZE,ease,easeOut,ramp,pulse,type NetcodePlan} from "../src/lib/netcode";
import {seekModelAnimation} from "../src/lib/three-animation";
import {Captions,type SpeechAlignment} from "./Explainer";
import brand from "../video-design/brand.json";
const C=brand.colors;
type V3=[number,number,number];
type Asset={id:string;file:string;animations:string[]};
type Props={plan:Storyboard;profile:StyleProfile;format:string;audio?:string;alignment?:SpeechAlignment[];models?:Asset[];modelBase?:string};
const STAGE={top:262,height:800};
const SIGHT=ARENA.wall.h+.06,FIGURE=.8,PATH_LEN=5.8,STRIDE=1.5;
const lerp=(a:number,b:number,m:number)=>a+(b-a)*m;
const lerp3=(a:readonly number[],b:readonly number[],m:number):V3=>[lerp(a[0],b[0],m),lerp(a[1],b[1],m),lerp(a[2],b[2],m)];
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));

// ---- deterministic story state -------------------------------------------------
type E=ReturnType<typeof eventTimes>;
const faceEnemy=(p:readonly number[])=>Math.atan2(ARENA.enemy[0]-p[0],ARENA.enemy[2]-p[2]);
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
function rotationAt(g:number){const p=pointAt(pathAt(g)),run=Math.PI/2;return run+wrap(faceEnemy(p)-run)*ease((g-1.12)/.3);}
/** Moment in the hook when the shooter fires at the still-visible runner. */
function hookShotTime(e:E){const a=e.hookRun,b=hookRunEnd(e);let lo=a,hi=b;for(let i=0;i<30;i++){const m=(lo+hi)/2;if(gameClock(m,e)<.3)lo=m;else hi=m;}return lo;}
function distanceAt(g:number){return PATH_LEN*(Math.min(Math.max(g,0),1)+(g>1.3?1-pathAt(g):0));}
function serverCopyU(t:number,g:number,e:E){
 const normal=pathAt(g-LAG.server),target=pathAt(FREEZE-LAG.enemy);
 const back=ease((t-e.rollback)/1.2),forward=ease((t-(e.peek===Infinity?Infinity:e.peek-.2))/1);
 return lerp(normal,lerp(normal,target,back),1-forward);
}
type Shot={position:V3;target:V3;fov:number};
const SHOTS:Record<string,Shot>={
 hook:{position:[-2.0,5.0,7.0],target:[-.5,.6,-1.0],fov:42},
 server:{position:[-.3,6.6,10.4],target:[.4,2.0,-1.8],fov:44},
 arena:{position:[.2,7.4,7.2],target:[.4,.85,-1.3],fov:41},
 rollback:{position:[-1.6,6.4,7.4],target:[.1,1.5,-1.9],fov:44},
 peek:{position:[-2.0,6.0,7.0],target:[.2,.6,-1.3],fov:41},
 outro:{position:[.2,8.6,9.6],target:[.4,1.0,-1.6],fov:45},
};
function cameraAt(t:number,plan:NetcodePlan,scenes:Storyboard["scenes"],alignment:SpeechAlignment[]):Shot{
 const keys=plan.camera.map(c=>({t:anchorTime(c.at,scenes,alignment),s:SHOTS[c.shot]}));
 let cur=keys[0].s;
 for(let i=1;i<keys.length;i++){const m=ease((t-keys[i].t)/1.6);if(m<=0)break;cur={position:lerp3(cur.position,keys[i].s.position,m),target:lerp3(cur.target,keys[i].s.target,m),fov:lerp(cur.fov,keys[i].s.fov,m)};}
 const drift=Math.sin(t*.21)*.22;
 return {...cur,position:[cur.position[0]+drift,cur.position[1],cur.position[2]-drift*.4]};
}

// ---- 3D building blocks ------------------------------------------------------
function CanvasReady({ready,release}:{ready:boolean;release:()=>void}){
 const {gl,scene,camera,advance}=useThree(),done=useRef(false),ref=useRef(release);ref.current=release;
 useLayoutEffect(()=>{if(!ready||done.current)return;const f=requestAnimationFrame(()=>{advance(performance.now());gl.render(scene,camera);gl.getContext().finish();done.current=true;ref.current();});return()=>cancelAnimationFrame(f);},[ready,gl,scene,camera,advance]);return null;
}
function CameraRig({shot}:{shot:Shot}){
 const {camera}=useThree();
 useLayoutEffect(()=>{camera.position.set(...shot.position);camera.lookAt(...shot.target);(camera as THREE.PerspectiveCamera).fov=shot.fov;camera.updateProjectionMatrix();},[camera,...shot.position,...shot.target,shot.fov]);return null;
}
type Look={opacity:number;tint?:string;tintAmount?:number;flash?:number;ghost?:boolean};
function Figure({source,clip,clipTime,position,rotation,look}:{source:GLTF;clip:string;clipTime:number;position:V3;rotation:number;look:Look}){
 const inst=useMemo(()=>{
  const scene=cloneSkeleton(source.scene);
  scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const c=(m as THREE.MeshStandardMaterial).clone();c.userData.base=c.color?.clone();return c;});if((o.material as THREE.Material[]).length===1)o.material=(o.material as THREE.Material[])[0];}});
  const box=new THREE.Box3().setFromObject(scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  return {scene,scale:2/Math.max(size.x,size.y,size.z),center,mixer:new THREE.AnimationMixer(scene)};
 },[source]);
 const action=source.animations.find(a=>a.name===clip);
 useLayoutEffect(()=>{
  if(action)seekModelAnimation(inst.mixer,action,((clipTime%action.duration)+action.duration)%action.duration);
  const tint=look.tint?new THREE.Color(look.tint):null,flash=new THREE.Color(C.pink);
  inst.scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;o.castShadow=!look.ghost&&look.opacity>.5;for(const m of (Array.isArray(o.material)?o.material:[o.material]) as THREE.MeshStandardMaterial[]){
   const base=(m.userData.base as THREE.Color)??new THREE.Color("#fff");
   m.color.copy(base);if(tint)m.color.lerp(tint,look.tintAmount??0);
   m.emissive=m.emissive??new THREE.Color(0);m.emissive.set(look.ghost&&tint?tint:"#000");m.emissiveIntensity=look.ghost?.35:0;
   if(look.flash){m.emissive.copy(flash);m.emissiveIntensity=look.flash*.9;m.color.lerp(flash,look.flash*.5);}
   m.transparent=look.opacity<.999||!!look.ghost;m.opacity=look.opacity*(look.ghost?.42:1);m.depthWrite=!look.ghost&&look.opacity>.95;
  }});
 },[inst,action,clipTime,look.opacity,look.tint,look.tintAmount,look.flash,look.ghost]);
 useEffect(()=>()=>{inst.mixer.stopAllAction();},[inst]);
 if(look.opacity<=.001)return null;
 // Normalized GLB is 2 units tall; FIGURE scales to arena height, feet rest on the floor.
 return <group position={position} rotation={[0,rotation,0]} scale={FIGURE*(.9+.1*Math.min(1,look.opacity*1.2))}><group position={[0,1,0]}><group scale={inst.scale}><group position={inst.center.clone().multiplyScalar(-1)}><primitive object={inst.scene}/></group></group></group></group>;
}
function Ring({position,color,opacity,radius=.42,dashed=false}:{position:V3;color:string;opacity:number;radius?:number;dashed?:boolean}){
 if(opacity<=.001)return null;
 return <group position={[position[0],.012,position[2]]} rotation={[-Math.PI/2,0,0]}>
  {dashed?Array.from({length:12},(_,i)=><mesh key={i} rotation={[0,0,i*Math.PI/6]}><ringGeometry args={[radius-.035,radius,8,1,0,Math.PI/10]}/><meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false}/></mesh>)
  :<mesh><ringGeometry args={[radius-.04,radius,48]}/><meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false}/></mesh>}
  <mesh><circleGeometry args={[radius-.04,48]}/><meshBasicMaterial color={color} transparent opacity={opacity*.14} depthWrite={false}/></mesh>
 </group>;
}
function Tube({from,to,lift,color,opacity,radius=.022,draw=1,glow=0}:{from:V3;to:V3;lift:number;color:string;opacity:number;radius?:number;draw?:number;glow?:number}){
 const key=[...from,...to].map(v=>v.toFixed(3)).join()+lift+draw.toFixed(3);
 const geo=useMemo(()=>{const mid=new THREE.Vector3((from[0]+to[0])/2,(from[1]+to[1])/2+lift,(from[2]+to[2])/2);const full=new THREE.QuadraticBezierCurve3(new THREE.Vector3(...from),mid,new THREE.Vector3(...to));const pts=full.getPoints(48).slice(0,Math.max(2,Math.round(48*clamp01(draw))+1));return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),64,radius,8,false);},[key,radius]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 if(opacity<=.001||draw<=.001)return null;
 return <mesh geometry={geo}><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.6+glow} transparent opacity={opacity} depthWrite={false} toneMapped={false}/></mesh>;
}
const arc=(from:V3,to:V3,lift:number,u:number):V3=>{const m=1-u,mid=[(from[0]+to[0])/2,(from[1]+to[1])/2+lift,(from[2]+to[2])/2];return [0,1,2].map(i=>m*m*from[i]+2*m*u*mid[i]+u*u*to[i]) as V3;};
function Packet({t,start,dur,from,to,lift,color,size=.13}:{t:number;start:number;dur:number;from:V3;to:V3;lift:number;color:string;size?:number}){
 if(!(t>start-.001&&t<start+dur+.18))return null;
 const u=clamp01((t-start)/dur),fade=Math.min(easeOut((t-start)/.14),1-clamp01((t-start-dur)/.18));
 return <>{[0,.05,.1,.15].map((d,i)=>{const p=arc(from,to,lift,clamp01(u-d));return <mesh key={i} position={p} scale={size*(1-i*.22)*fade}><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={i?1.2:2.2} transparent opacity={(i?.45-i*.1:1)*fade} toneMapped={false} depthWrite={false}/></mesh>;})}</>;
}
function Wall(){
 const {x,z,h}=ARENA.wall,w=x[1]-x[0],d=z[1]-z[0],cx=(x[0]+x[1])/2,cz=(z[0]+z[1])/2;
 return <group>
  <mesh position={[cx,h/2,cz]} castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color="#2B2536" roughness={.85}/></mesh>
  <mesh position={[cx,h+.008,cz]}><boxGeometry args={[w,.016,d]}/><meshStandardMaterial color="#3A2F52" roughness={.7}/></mesh>
  {[[w,.035,.035,cx,z[0]],[w,.035,.035,cx,z[1]],[.035,.035,d,x[0],cz],[.035,.035,d,x[1],cz]].map(([a,b,c,px,pz],i)=><mesh key={i} position={[px,h+.02,pz]}><boxGeometry args={[a,b,c]}/><meshStandardMaterial color={C.lavender} emissive={C.purple} emissiveIntensity={.9}/></mesh>)}
  {[[x[0],z[0]],[x[1],z[0]],[x[0],z[1]],[x[1],z[1]]].map(([px,pz],i)=><mesh key={i} position={[px,h/2,pz]}><boxGeometry args={[.03,h,.03]}/><meshStandardMaterial color={C.lavender} emissive={C.purple} emissiveIntensity={.3} transparent opacity={.55}/></mesh>)}
  <mesh position={[.4,.3,-4.3]} castShadow receiveShadow><boxGeometry args={[9,.6,.45]}/><meshStandardMaterial color="#1D1828"/></mesh>
  <mesh position={[-4.6,.3,-1.6]} castShadow receiveShadow><boxGeometry args={[.45,.6,5.4]}/><meshStandardMaterial color="#1D1828"/></mesh>
 </group>;
}
function Floor(){
 const grid=useMemo(()=>{const g=new THREE.GridHelper(26,26,new THREE.Color(C.purple),new THREE.Color("#2A2236"));(g.material as THREE.Material).transparent=true;(g.material as THREE.Material).opacity=.55;return g;},[]);
 return <><mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[60,60]}/><meshStandardMaterial color="#100B18" roughness={1}/></mesh><primitive object={grid} position={[0,.004,0]}/></>;
}
function RouteDashes({opacity}:{opacity:number}){
 if(opacity<=.001)return null;
 return <>{Array.from({length:13},(_,i)=>{const p=pointAt(i/12.5);return <mesh key={i} position={[p[0],.02,p[2]]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.07,.17]}/><meshBasicMaterial color={C.yellow} transparent opacity={opacity*(.35+.3*(i%2))} depthWrite={false}/></mesh>;})}</>;
}
function HistoryTicks({t,e}:{t:number;e:E}){
 const from=pathAt(FREEZE-LAG.server),to=pathAt(FREEZE-LAG.enemy),n=7,vis=1-ramp(t,e.peek,.6);
 if(t<e.rollback||vis<=0)return null;
 return <>{Array.from({length:n},(_,i)=>{const u=lerp(from,to,i/(n-1)),p=pointAt(u),a=ramp(t,e.rollback+i*.13,.3)*vis;return <group key={i} position={[p[0],.03,p[2]+.62]}><mesh rotation={[-Math.PI/2,0,0]} scale={.6+.4*a}><circleGeometry args={[.07,20]}/><meshBasicMaterial color={C.lavender} transparent opacity={a*.85} depthWrite={false}/></mesh></group>;})}</>;
}

// ---- world --------------------------------------------------------------------
type World={t:number;e:E;g:number;you:V3;yourRot:number;sCopy:V3;sRot:number;eCopy:V3;eRot:number;serverPos:V3};
function worldState(t:number,e:E):World{
 const g=gameClock(t,e),you=pointAt(pathAt(g)),eg=g-LAG.enemy,sU=serverCopyU(t,g,e);
 return {t,e,g,you,yourRot:rotationAt(g),sCopy:pointAt(sU),sRot:rotationAt(g-LAG.server),eCopy:pointAt(pathAt(eg)),eRot:rotationAt(eg),serverPos:[...ARENA.server] as V3};
}
const head=(p:V3,h=1.05):V3=>[p[0],h,p[2]];
function Scene({w,loaded}:{w:World;loaded:Record<string,GLTF>}){
 const {t,e,g}=w,inHook=t<e.rewind;
 const serverIn=ramp(t,e.server,.6);
 const sOn=ramp(t,e.serverCopy)*(1-ramp(t,e.outro+1.2,.6)),eOn=ramp(t,e.enemyCopy)*(1-ramp(t,e.outro+1.6,.6));
 const youClip="Walk cycle · 2s",youTime=distanceAt(g)/STRIDE*2;
 const enemyClip=t>=e.shot&&t<e.shot+1.4?"Single shot":(t>=e.hookRun&&t<e.rewind&&t>=hookShotTime(e)-.3&&t<hookShotTime(e)+1.1?"Single shot":"Walk cycle · 2s");
 const enemyTime=enemyClip==="Single shot"?(t>=e.shot?t-e.shot:t-(hookShotTime(e)-.3)):0;
 const hookShot=hookShotTime(e),hookTarget=pointAt(pathAt(gameClock(hookShot,e)));
 const enemyAim=t<e.rewind?Math.atan2(hookTarget[0]-ARENA.enemy[0],hookTarget[2]-ARENA.enemy[2]):Math.atan2(w.eCopy[0]-ARENA.enemy[0],w.eCopy[2]-ARENA.enemy[2]);
 const youFlash=Math.max(pulse(t,e.hookDeath,.15,.7,.6),pulse(t,e.death,.15,1.1,.7));
 const enemyFlash=0,spotted=ramp(t,e.peekShot,.35)*(1-ramp(t,e.outro+1.4,.6));
 const enemyPos=[...ARENA.enemy] as V3;
 const tracer=(at:number,from:V3,to:V3)=>{const a=ramp(t,at,.18),out=1-ramp(t,at+.9,.6);return a*out>0?<Tube from={from} to={to} lift={0} color={C.yellow} opacity={a*out} radius={.03} draw={a} glow={1.5}/>:null;};
 const gun=(p:V3,toward:V3):V3=>{const d=Math.hypot(toward[0]-p[0],toward[2]-p[2])||1;return [p[0]+(toward[0]-p[0])/d*.38,.92,p[2]+(toward[2]-p[2])/d*.38];};
 const blockedAt=wallEntry(enemyPos,w.you),sight=(t>=e.enemyCopy&&t<e.rollback+.6)?ramp(t,e.enemyCopy+.9,.5)*(1-ramp(t,e.rollback,.5)):0;
 // Soft line-of-sight over the last few game-clock samples, so sight lines never pop in one frame.
 const seenAt=(lag:number)=>Array.from({length:8},(_,k)=>wallEntry(enemyPos,pointAt(pathAt(g-lag-k*.012)))===null?1:0).reduce((a:number,b:number)=>a+b,0)/8;
 const peekSee=ramp(t,e.peek,.5)*(1-ramp(t,e.outro+1.4,.6)),youVisible=seenAt(0),copyHidden=1-seenAt(LAG.enemy),peekBlock=wallEntry(enemyPos,w.eCopy);
 const linkA=serverIn*(inHook?0:1)*(1-ramp(t,e.outro+1,.8))*.3;
 const stream=(from:()=>V3,to:V3,start:number,end:number,color:string)=>start===Infinity?null:Array.from({length:Math.max(0,Math.ceil((Math.min(end,t)-start)/.55))},(_,i)=>start+i*.55).filter(s=>t<s+1.1).map(s=><Packet key={s} t={t} start={s} dur={.95} from={from()} to={to} lift={1.2} color={color} size={.07}/>);
 return <>
  <Floor/><Wall/>
  <RouteDashes opacity={ramp(t,e.move,.6)*(1-ramp(t,e.outro,.8))}/>
  {/* You (true position: your own screen) */}
  {loaded[NETCODE_MODELS.you]&&<Figure source={loaded[NETCODE_MODELS.you]} clip={youClip} clipTime={youTime} position={w.you} rotation={w.yourRot} look={{opacity:1,flash:youFlash}}/>}
  <Ring position={w.you} color={C.purple} opacity={1}/>
  {/* Server copy: where the server thinks you are */}
  {loaded[NETCODE_MODELS.you]&&<Figure source={loaded[NETCODE_MODELS.you]} clip="Walk cycle · 2s" clipTime={distanceAt(g-LAG.server)/STRIDE*2} position={w.sCopy} rotation={w.sRot} look={{opacity:sOn,tint:C.lavender,tintAmount:.85,ghost:true,flash:pulse(t,e.hit,.12,.8,.5)*.8}}/>}
  <Ring position={w.sCopy} color={C.lavender} opacity={sOn*.8} dashed/>
  {/* Enemy-screen copy: what the shooter sees */}
  {loaded[NETCODE_MODELS.you]&&<Figure source={loaded[NETCODE_MODELS.you]} clip="Walk cycle · 2s" clipTime={distanceAt(g-LAG.enemy)/STRIDE*2} position={w.eCopy} rotation={w.eRot} look={{opacity:eOn,tint:C.purple,tintAmount:.45,ghost:true,flash:pulse(t,e.hit,.12,.8,.5)*.6}}/>}
  <Ring position={w.eCopy} color={C.yellow} opacity={eOn*.85} dashed/>
  {/* Enemy */}
  {loaded[NETCODE_MODELS.enemy]&&<Figure source={loaded[NETCODE_MODELS.enemy]} clip={enemyClip} clipTime={enemyTime} position={enemyPos} rotation={enemyAim} look={{opacity:1,flash:enemyFlash}}/>}
  <Ring position={enemyPos} color={C.yellow} opacity={1}/>
  {/* Server */}
  {loaded[NETCODE_MODELS.server]&&serverIn>0&&<group position={w.serverPos} scale={.85*(.88+.12*serverIn)}><group position={[0,-.2,0]}><ServerModel source={loaded[NETCODE_MODELS.server]} opacity={serverIn} glow={pulse(t,e.hit,.15,.8,.5)+pulse(t,e.rollback,.2,1.2,.5)*.6}/></group></group>}
  {/* Links */}
  {linkA>0&&<Tube from={head(w.you,.9)} to={[w.serverPos[0],w.serverPos[1]-.6,w.serverPos[2]]} lift={1.4} color={C.purple} opacity={linkA}/>}
  {linkA>0&&<Tube from={[w.serverPos[0],w.serverPos[1]-.6,w.serverPos[2]]} to={head(enemyPos,.9)} lift={1.4} color={C.purple} opacity={linkA*ramp(t,e.enemyCopy-.3,.6)/.3*.3}/>}
  {/* Packets */}
  {e.pingOut!==Infinity&&<Packet t={t} start={e.pingOut} dur={Math.max(.6,Math.min(1.4,(e.pingBack===Infinity?e.pingOut+1:e.pingBack)-e.pingOut-.1))} from={head(w.you,.9)} to={[w.serverPos[0],w.serverPos[1]-.6,w.serverPos[2]]} lift={1.4} color={C.yellow}/>}
  {e.pingBack!==Infinity&&<Packet t={t} start={e.pingBack} dur={1} from={[w.serverPos[0],w.serverPos[1]-.6,w.serverPos[2]]} to={head(w.you,.9)} lift={1.4} color={C.lavender}/>}
  {stream(()=>head(w.you,.9),[w.serverPos[0],w.serverPos[1]-.6,w.serverPos[2]],e.serverCopy,e.shot,C.purpleStroke)}
  {stream(()=>[w.serverPos[0],w.serverPos[1]-.6,w.serverPos[2]],head(enemyPos,.9),e.enemyCopy,e.shot,C.lavender)}
  <Packet t={t} start={e.shotPacket} dur={1.1} from={head(enemyPos,.95)} to={[w.serverPos[0],w.serverPos[1]-.6,w.serverPos[2]]} lift={1.4} color={C.yellow} size={.17}/>
  <Packet t={t} start={e.damagePacket} dur={1.15} from={[w.serverPos[0],w.serverPos[1]-.6,w.serverPos[2]]} to={head(w.you,.95)} lift={1.4} color={C.pink} size={.17}/>
  {/* Shots and the blocked line of sight */}
  {inHook&&tracer(hookShot,gun(enemyPos,hookTarget),head(hookTarget,.95))}
  {tracer(e.shot,gun(enemyPos,w.eCopy),head(w.eCopy,.95))}
  {/* peekShot marks the moment you spot the defender first: a detection ring, not a shot */}
  <Ring position={enemyPos} color={C.green} opacity={spotted} radius={.42+.2*easeOut((t-e.peekShot)/.5)}/>
  {sight>0&&blockedAt!==null&&<Tube from={head(enemyPos,SIGHT)} to={lerp3(head(enemyPos,SIGHT),head(w.you,SIGHT),blockedAt)} lift={0} color={C.pink} opacity={sight*.85} radius={.016}/>}
  {sight>0&&blockedAt!==null&&<mesh position={lerp3(head(enemyPos,SIGHT),head(w.you,SIGHT),blockedAt)} scale={.11*sight}><sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={C.pink} emissive={C.pink} emissiveIntensity={1.5} toneMapped={false}/></mesh>}
  {peekSee>0&&<Tube from={head(w.you,SIGHT)} to={head(enemyPos,SIGHT)} lift={0} color={C.green} opacity={peekSee*youVisible*(.55+.45*spotted)} radius={.02+.012*spotted}/>}
  {peekSee>0&&peekBlock!==null&&<Tube from={head(enemyPos,SIGHT)} to={lerp3(head(enemyPos,SIGHT),head(w.eCopy,SIGHT),peekBlock)} lift={0} color={C.pink} opacity={peekSee*copyHidden*.85} radius={.016}/>}
  {peekSee>0&&peekBlock!==null&&<mesh position={lerp3(head(enemyPos,SIGHT),head(w.eCopy,SIGHT),peekBlock)} scale={.11*peekSee*copyHidden}><sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={C.pink} emissive={C.pink} emissiveIntensity={1.5} toneMapped={false}/></mesh>}
  <HistoryTicks t={t} e={e}/>
 </>;
}
function ServerModel({source,opacity,glow}:{source:GLTF;opacity:number;glow:number}){
 const inst=useMemo(()=>{const s=source.scene.clone(true);s.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.material=(o.material as THREE.MeshStandardMaterial).clone();}});const box=new THREE.Box3().setFromObject(s),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());return {s,scale:2/Math.max(size.x,size.y,size.z),c};},[source]);
 useLayoutEffect(()=>{inst.s.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshStandardMaterial;m.transparent=opacity<.999;m.opacity=opacity;m.depthWrite=opacity>.95;if(glow>0){m.emissive=new THREE.Color(C.lavender);m.emissiveIntensity=glow*.35;}else m.emissiveIntensity=0;}});},[inst,opacity,glow]);
 return <group scale={inst.scale}><group position={inst.c.clone().multiplyScalar(-1)}><primitive object={inst.s}/></group></group>;
}

// ---- 2D overlay ---------------------------------------------------------------
function project(p:V3,shot:Shot,width:number,height:number){
 const cam=new THREE.PerspectiveCamera(shot.fov,width/height,.05,300);cam.position.set(...shot.position);cam.lookAt(...shot.target);cam.updateMatrixWorld();cam.updateProjectionMatrix();
 const v=new THREE.Vector3(...p).project(cam);return {x:(v.x+1)*width/2,y:(1-v.y)*height/2,ok:v.z<1&&Number.isFinite(v.x)};
}
function Pin({x,y,text,color,opacity,width}:{x:number;y:number;text:string;color:string;opacity:number;width:number}){
 const w=Array.from(text).length*17+38,edge=clamp01((x-w/2-20)/40)*clamp01((width-150-x-w/2)/40)*clamp01((y-110)/40);
 const a=opacity*edge;if(a<=.01)return null;
 return <div style={{position:"absolute",left:x,top:y,transform:`translate(-50%,-100%) translateY(${(1-a)*14}px) scale(${.9+.1*a})`,opacity:a,textAlign:"center",whiteSpace:"nowrap",pointerEvents:"none"}}>
  <div style={{padding:"9px 17px",background:"#120C1DEE",border:`2px solid ${color}`,borderRadius:12,color:"#fff",fontSize:30,fontWeight:800,letterSpacing:-.4}}>{text}</div>
  <div style={{height:22,width:2,background:color,margin:"0 auto"}}/>
 </div>;
}
function Chip({text,color,opacity,top,icon}:{text:string;color:string;opacity:number;top:number;icon?:string}){
 if(opacity<=.01)return null;
 return <div style={{position:"absolute",left:"50%",top,transform:`translate(-50%,${(1-opacity)*16}px) scale(${.92+.08*opacity})`,opacity,display:"flex",alignItems:"center",gap:12,padding:"12px 22px",borderRadius:16,background:"#120C1DF2",border:`2px solid ${color}`,fontSize:30,fontWeight:800,whiteSpace:"nowrap",color:"#fff"}}>{icon&&<span style={{color}}>{icon}</span>}{text}</div>;
}
function Ruler({t,e,plan}:{t:number;e:E;plan:NetcodePlan}){
 const at=e.ruler===Infinity?e.enemyCopy+1.2:e.ruler,on=ramp(t,at,.5)*(1-ramp(t,e.rollback,.5));
 if(on<=.01)return null;
 const colors=[C.purple,C.lavender,C.yellow];
 // Compact delay legend in the empty upper-left of the arena: one row per copy, revealed in causal order.
 return <div style={{position:"absolute",left:78,top:44,display:"flex",flexDirection:"column",gap:10,opacity:on}}>
  {plan.ruler.map((r,i)=>{const a=ramp(t,at+i*.45,.4)*on;return <div key={i} style={{display:"flex",alignItems:"center",gap:14,opacity:a,transform:`translateX(${(1-a)*-18}px)`,padding:"8px 16px 8px 12px",borderRadius:12,background:"#120C1DE6",border:`1px solid ${colors[i]}66`}}>
   <div style={{width:18,height:18,borderRadius:9,background:i===0?colors[i]:"transparent",border:`3px ${i===0?"solid":"dashed"} ${colors[i]}`}}/>
   <span style={{fontSize:31,fontWeight:800,color:"#fff",whiteSpace:"nowrap"}}>{r.label}</span>
   {r.value&&<span style={{fontSize:30,fontWeight:750,color:colors[i],whiteSpace:"nowrap"}}>{r.value}</span>}
  </div>;})}
 </div>;
}
export function NetcodeFilm({plan,profile,audio,alignment=[],models=[],modelBase=""}:Props){
 const frame=useCurrentFrame(),{width}=useVideoConfig(),t=frame/30,net=plan.netcode!;
 const needed=Object.values(NETCODE_MODELS);
 const [hold]=useState(()=>delayRender("Загружаем модели арены")),[loaded,setLoaded]=useState<Record<string,GLTF>>({});
 useEffect(()=>{let live=true;const missing=needed.filter(id=>!models.some(m=>m.id===id));if(missing.length){cancelRender(new Error(`В снимке проекта нет моделей: ${missing.join(", ")}`));return;}
  Promise.all(needed.map(async id=>{const m=models.find(x=>x.id===id)!;return [id,await new GLTFLoader().loadAsync(staticFile(`${modelBase}/${m.file}`))] as const;})).then(x=>{if(live)setLoaded(Object.fromEntries(x));}).catch(err=>cancelRender(err));return()=>{live=false;};},[hold]);
 const scenes=plan.scenes,e=useMemo(()=>eventTimes(net,scenes,alignment),[net,scenes,alignment]);
 const clock=sceneClock(plan),last=clock.at(-1)!.end,w=worldState(t,e),shot=cameraAt(t,net,scenes,alignment);
 const L=net.labels,pins:{p:V3;text:string;color:string;on:number}[]=[];
 const pinH=1.72;
 const inHook=t<e.rewind;
 pins.push({p:head(w.you,pinH),text:L.you,color:C.purple,on:ramp(t,.15,.5)*(1-pulse(t,e.hookDeath,.2,1.4,.4))*(1-pulse(t,e.death,.2,1.6,.4)) *(1-ramp(t,e.peek,.4))+ramp(t,e.outro+.8,.5)});
 pins.push({p:head(w.you,pinH),text:L.damage,color:C.pink,on:Math.max(pulse(t,e.hookDeath,.2,1.4,.4),pulse(t,e.death,.2,1.6,.4))});
 pins.push({p:head(w.you,pinH),text:L.peek,color:C.green,on:ramp(t,e.peek+.5,.45)*(1-ramp(t,e.outro+.8,.5))});
 pins.push({p:head(ARENA.enemy as unknown as V3,pinH),text:L.enemy,color:C.yellow,on:ramp(t,.6,.5)*(1-ramp(t,e.hookDeath-.6,.4))+ramp(t,e.server+.6,.5)*(1-ramp(t,e.serverCopy,.4))});
 const pingChip0=e.pingOut===Infinity?0:ramp(t,e.pingOut,.4)*(1-ramp(t,e.move,.5));
 pins.push({p:[w.serverPos[0],w.serverPos[1]+.95,w.serverPos[2]],text:L.server,color:C.lavender,on:ramp(t,e.server+.3,.5)*(1-ramp(t,e.serverCopy,.4))*(1-pingChip0)});
 pins.push({p:head(w.sCopy,pinH+.5),text:L.serverCopy,color:C.lavender,on:ramp(t,e.serverCopy+.25,.5)*(1-ramp(t,e.peek,.4))});
 pins.push({p:head(w.eCopy,pinH+1+.5*ease((1-Math.abs(w.eCopy[0]-w.sCopy[0]))/.5)),text:L.enemyCopy,color:C.yellow,on:ramp(t,e.enemyCopy+.25,.5)*(1-ramp(t,e.peek,.4))});
 const rtt=e.pingOut===Infinity?0:clamp01((t-e.pingOut)/Math.max(.8,(e.pingBack===Infinity?e.pingOut+1:e.pingBack)+1-e.pingOut));
 const pingChip=e.pingOut===Infinity?0:ramp(t,e.pingOut,.4)*(1-ramp(t,e.move,.5));
 const rewindChip=Math.max(pulse(t,e.rewind,.2,.9,.4),pulse(t,e.rollback,.2,1.3,.4));
 const hookLabel=pulse(t,e.hookDeath+.4,.25,1.6,.5);
 const segs=clock.slice(1);
 return <AbsoluteFill style={{background:C.background,color:profile.foreground,fontFamily:`'${profile.font} Variable',sans-serif`,overflow:"hidden"}}>
  <StudioBackground design={profile.backgroundDesign}/>
  {audio&&<Audio src={staticFile(audio)}/>}
  <div style={{position:"absolute",top:STAGE.top,left:0,width,height:STAGE.height,overflow:"hidden",maskImage:"linear-gradient(to bottom, transparent 0%, black 7%, black 78%, transparent 100%)"}}>
   <ThreeCanvas shadows width={width} height={STAGE.height} camera={{position:SHOTS.hook.position,fov:SHOTS.hook.fov,near:.05,far:120}} gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}} dpr={1} style={{background:"transparent"}}>
    <CameraRig shot={shot}/>
    <fog attach="fog" args={["#000000",13,25]}/>
    <ambientLight intensity={.55}/>
    <hemisphereLight args={[C.lavender,"#120C1D",.55]}/>
    <directionalLight castShadow position={[5,9,6]} intensity={2.6} shadow-mapSize={[2048,2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-bias={-.0004}/>
    <directionalLight position={[-6,4,-5]} intensity={1.6} color={C.purple}/>
    <Scene w={w} loaded={loaded}/>
    <CanvasReady ready={Object.keys(loaded).length===needed.length} release={()=>continueRender(hold)}/>
   </ThreeCanvas>
   {pins.map((p,i)=>{const s=project(p.p,shot,width,STAGE.height);return s.ok?<Pin key={i} x={s.x} y={s.y} text={p.text} color={p.color} opacity={p.on} width={width}/>:null;})}
   {(()=>{const s=project([w.serverPos[0],w.serverPos[1]+.75,w.serverPos[2]],shot,width,STAGE.height);const ms=net.pingMs?`${Math.round(net.pingMs*ease(rtt))} ${profile.production?.language==="en"?"ms":"мс"}`:"";return pingChip>.01&&s.ok?<div style={{position:"absolute",left:s.x,top:s.y-8,transform:`translate(-50%,-100%) translateY(${(1-pingChip)*12}px)`,opacity:pingChip,textAlign:"center",whiteSpace:"nowrap"}}><div style={{padding:"10px 18px",borderRadius:14,background:"#120C1DF2",border:`2px solid ${C.yellow}`,fontSize:30,fontWeight:800}}>{L.server}{ms&&<span style={{color:C.yellow}}> · {ms}</span>}</div><div style={{marginTop:8,fontSize:22,color:C.lavender,fontWeight:700}}>туда и обратно</div></div>:null;})()}
   <Chip text={t<e.move?L.rewind:(profile.production?.language==="en"?"server rewinds time":"сервер откатывает время")} color={C.lavender} opacity={rewindChip} top={STAGE.height-150} icon="◀◀"/>
   <Chip text={L.shot} color={C.yellow} opacity={pulse(t,e.shotPacket,.2,1.2,.4)} top={STAGE.height-150} icon="●"/>
   <Chip text={L.hit} color={C.green} opacity={pulse(t,e.hit+.1,.2,1.1,.4)} top={STAGE.height-150} icon="✓"/>
   {inHook&&<Chip text={L.damage} color={C.pink} opacity={hookLabel} top={STAGE.height-150} icon="✕"/>}
   <Chip text={L.summary} color={C.green} opacity={ramp(t,e.outro+.3,.5)} top={STAGE.height-150} icon="◉"/>
   <Ruler t={t} e={e} plan={net}/>
  </div>
  {/* Persistent header: avatar, author, topic, chapter progress */}
  <div style={{position:"absolute",left:78,right:140,top:108,display:"flex",alignItems:"center",gap:18}}><div style={{width:56,height:56,borderRadius:"50%",background:"#000",border:`2px solid ${C.purpleStroke}`}}/><span style={{fontSize:29,fontWeight:750}}>{profile.username??"@xtuned"}</span><span style={{marginLeft:"auto",fontSize:23,color:C.muted}}>{Math.round(last)} c</span></div>
  <div style={{position:"absolute",left:78,right:140,top:182,fontSize:34,fontWeight:750,letterSpacing:-1,lineHeight:1.12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{plan.title}</div>
  <div style={{position:"absolute",left:78,right:140,top:236,display:"flex",gap:8}}>{segs.map((s,i)=>{const p=clamp01((t-s.start)/s.seconds),cur=t>=s.start&&t<s.end;return <div key={i} style={{flex:1,height:6,background:C.surfaceTop,borderRadius:4,overflow:"hidden"}}><div style={{height:6,width:`${p*100}%`,background:cur?C.yellow:C.purple}}/></div>;})}</div>
  {clock.map((s,i)=>{const enter=easeOut((t-s.start+(i===0?.5:.15))/.45),exit=i===clock.length-1?0:easeOut((t-(s.end-.15))/.4),o=enter*(1-exit);if(o<=.005)return null;return <div key={s.id} style={{position:"absolute",left:78,right:140,top:965,opacity:o,transform:`translateY(${(1-enter)*16-exit*10}px)`}}><div style={{color:i===0?C.pink:C.yellow,fontSize:23,fontWeight:750,letterSpacing:2,marginBottom:10}}>{i===0?(profile.production?.language==="en"?"HOOK":"ХУК"):`${String(i).padStart(2,"0")} / ${String(clock.length-1).padStart(2,"0")}`}</div><div style={{fontSize:52,fontWeight:800,lineHeight:1.08,letterSpacing:-2}}>{s.title}</div></div>;})}
  {alignment.map((a,i)=><Captions key={i} a={a} t={t} lang={profile.production?.language} qualityMode={profile.production?.version===2} nextStart={alignment[i+1]?.words?.[0]?.start??alignment[i+1]?.start}/>)}
 </AbsoluteFill>;
}
