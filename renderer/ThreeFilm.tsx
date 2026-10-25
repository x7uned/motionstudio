import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from "react";
import {AbsoluteFill,Audio,Img,staticFile,useCurrentFrame,useVideoConfig,delayRender,continueRender,cancelRender} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import * as THREE from "three";
import {GLTFLoader,type GLTF} from "three/examples/jsm/loaders/GLTFLoader.js";
import {clone as cloneSkeleton} from "three/examples/jsm/utils/SkeletonUtils.js";
import {cameraState,objectState,anchorTime,clipProgressAt,smooth3d,articulationState,type World3D} from "../src/lib/scene3d";
import DetailedMachine from "./DetailedMachines";
import {sceneClock,type Storyboard,type StyleProfile} from "../src/lib/model";
import {Captions,type SpeechAlignment} from "./Explainer";
import {seekModelAnimation} from "../src/lib/three-animation";
import brand from "../video-design/brand.json";
import {CreatorOutro} from "./CreatorOutro";
import {creatorOutroState} from "../src/lib/creator-branding";
import {threeLayout} from "../src/lib/three-layout";
import {StudioBackground} from "./StudioBackground";
const C=brand.colors;
type Asset={id:string;file:string;animations:string[]};
type Props={plan:Storyboard;profile:StyleProfile;format:string;audio?:string;alignment?:SpeechAlignment[];models?:Asset[];modelBase?:string};
function CanvasReady({ready,release}:{ready:boolean;release:()=>void}){
 const {gl,scene,camera,advance}=useThree(),released=useRef(false),releaseRef=useRef(release);releaseRef.current=release;
 useLayoutEffect(()=>{if(!ready||released.current)return;const frame=requestAnimationFrame(()=>{advance(performance.now());gl.render(scene,camera);gl.getContext().finish();released.current=true;releaseRef.current();});return()=>cancelAnimationFrame(frame);},[ready,gl,scene,camera,advance]);return null;
}
function Camera({world,t,plan,alignment}:{world:World3D;t:number;plan:Storyboard;alignment:SpeechAlignment[]}){
 const {camera}=useThree();const s=cameraState(world,t,plan.scenes,alignment);
 useLayoutEffect(()=>{camera.position.set(...s.position);camera.lookAt(...s.target);(camera as THREE.PerspectiveCamera).fov=s.fov;camera.updateProjectionMatrix();},[camera,...s.position,...s.target,s.fov]);return null;
}
function revealDepthMaterial(){
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 depth.userData.studioReveal={value:1};
 depth.onBeforeCompile=shader=>{shader.uniforms.studioReveal=depth.userData.studioReveal;shader.fragmentShader="uniform float studioReveal;\n"+shader.fragmentShader.replace("#include <clipping_planes_fragment>","#include <clipping_planes_fragment>\nfloat revealNoise=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);\nif(revealNoise>=studioReveal) discard;");};
 return depth;
}
function LoadedModel({source,clip,t,opacity,progress}:{source:GLTF;clip:string;t:number;opacity:number;progress?:number}){
 const instance=useMemo(()=>{const scene=cloneSkeleton(source.scene);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.receiveShadow=true;o.customDepthMaterial=revealDepthMaterial();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=!(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.opacity<.98||(((m as THREE.MeshStandardMaterial).emissive?.getHex()||0)!==0&&((m as THREE.MeshStandardMaterial).emissiveIntensity||0)>.01));for(const m of Array.isArray(o.material)?o.material:[o.material])m.userData={...m.userData,studioOpacity:m.opacity,studioTransparent:m.transparent,studioDepthWrite:m.depthWrite};}});const box=new THREE.Box3().setFromObject(scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());return {scene,size:2/Math.max(size.x,size.y,size.z,.001),center,mixer:new THREE.AnimationMixer(scene)};},[source]);
 const selected=clip?source.animations.find(a=>a.name===clip):null;
 if(clip&&!selected)throw new Error(`У модели нет анимации «${clip}».`);
 useLayoutEffect(()=>{if(selected)seekModelAnimation(instance.mixer,selected,progress===undefined?t:progress*selected.duration);instance.scene.traverse(o=>{if(o instanceof THREE.Mesh){if(o.customDepthMaterial)o.customDepthMaterial.userData.studioReveal.value=opacity;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.opacity=m.userData.studioOpacity*opacity;m.transparent=m.userData.studioTransparent||opacity<.999;m.depthWrite=m.userData.studioDepthWrite&&opacity>=.999;}}});},[instance,t,opacity,selected,progress]);
 useEffect(()=>()=>{instance.mixer.stopAllAction();instance.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.customDepthMaterial?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});},[instance]);
 return <group scale={instance.size}><group position={instance.center.clone().multiplyScalar(-1)}><primitive object={instance.scene}/></group></group>;
}
function WorldObject({o,t,plan,alignment,loaded}:{o:World3D["objects"][number];t:number;plan:Storyboard;alignment:SpeechAlignment[];loaded:Record<string,GLTF>}){
 const s=objectState(o,t,plan.scenes,alignment),material={color:o.color,metalness:o.metalness,roughness:o.roughness,transparent:s.opacity<.999,opacity:s.opacity,depthWrite:s.opacity>=.999};
 const mat=(color=o.color)=><meshStandardMaterial {...material} color={color}/>;
 const box=(size:[number,number,number],position:[number,number,number],color=o.color)=><mesh position={position}><boxGeometry args={size}/>{mat(color)}</mesh>;
 const ball=(r:number,position:[number,number,number],color=o.color)=><mesh position={position}><sphereGeometry args={[r,48,32]}/>{mat(color)}</mesh>;
 let content:React.ReactNode;
 switch(o.model){
  case "assembly":{const spec=plan.assemblies?.assets.find(a=>a.id===o.assetId);if(!spec)throw new Error("Нет подготовленной детальной сборки.");content=<DetailedMachine spec={spec} channels={articulationState(o,t,plan.scenes,alignment)} t={t} opacity={s.opacity} groundY={(-1.6-s.position[1])/s.scale}/>;break;}
  case "asset":content=loaded[o.assetId]?<LoadedModel source={loaded[o.assetId]} clip={o.animationClip} progress={clipProgressAt(o,t,plan.scenes,alignment)} t={Math.max(0,t-anchorTime(o.enter,plan.scenes,alignment))} opacity={s.opacity}/>:null;break;
  case "sphere":content=ball(1,[0,0,0]);break;
  case "globe":content=<>{ball(1,[0,0,0],"#173D74")}{[[.27,.44,.84,.23],[-.35,.25,.87,.28],[-.42,-.16,.85,.24],[.23,-.46,.85,.21],[.66,.14,.66,.14]].map((p,i)=><mesh key={i} position={p.slice(0,3) as [number,number,number]} scale={[1,.7,.18]}><sphereGeometry args={[p[3],24,16]}/>{mat(C.lavender)}</mesh>)}<mesh rotation={[.15,0,-.15]}><torusGeometry args={[1.065,.012,8,96]}/>{mat(C.lavender)}</mesh></>;break;
  case "moon":content=<>{ball(1,[0,0,0],"#86838E")}{Array.from({length:26},(_,i)=>{const y=1-2*(i+.5)/26,r=Math.sqrt(1-y*y),a=i*2.399963;return <mesh key={i} position={[r*Math.cos(a),y,r*Math.sin(a)]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(r*Math.cos(a),y,r*Math.sin(a)))}><torusGeometry args={[.05+(i%4)*.016,.012,6,20]}/>{mat("#ABA7B4")}</mesh>;})}</>;break;
  case "box":content=box([1.6,1.6,1.6],[0,0,0]);break;
  case "cylinder":content=<mesh><cylinderGeometry args={[.8,.8,1.8,48]}/>{mat()}</mesh>;break;
  case "arrow":content=<><mesh position={[0,-.15,0]}><cylinderGeometry args={[.055,.055,1.5,24]}/>{mat()}</mesh><mesh position={[0,.65,0]}><coneGeometry args={[.2,.5,32]}/>{mat()}</mesh></>;break;
  case "torus":content=<mesh><torusGeometry args={[.9,.18,24,96]}/>{mat()}</mesh>;break;
  case "phone":content=<>{box([1.05,2.05,.18],[0,0,0])}{box([.91,1.83,.03],[0,.01,.109],"#191625")}{box([.3,.04,.02],[0,.84,.13],C.lavender)}{box([.52,.6,.02],[0,.22,.13],C.purple)}{box([.52,.04,.02],[0,-.28,.13],C.lavender)}{box([.4,.04,.02],[-.06,-.43,.13],C.yellow)}</>;break;
  case "server":content=<>{box([1.25,1.9,1],[0,0,0])}{Array.from({length:4},(_,i)=><group key={i}>{box([1.1,.3,.08],[0,.62-i*.42,.54],"#24202F")}{ball(.035,[.4,.62-i*.42,.59],i%2?C.yellow:C.lavender)}</group>)}</>;break;
  case "chip":content=<>{box([1.25,.22,1.25],[0,0,0])}{box([.85,.1,.85],[0,.16,0],C.lavender)}{Array.from({length:6},(_,i)=><group key={i}>{box([.12,.06,.2],[-.5+i*.2,0,.7],C.yellow)}{box([.12,.06,.2],[-.5+i*.2,0,-.7],C.yellow)}{box([.2,.06,.12],[.7,0,-.5+i*.2],C.yellow)}{box([.2,.06,.12],[-.7,0,-.5+i*.2],C.yellow)}</group>)}</>;break;
  case "satellite":content=<>{box([.65,.65,.65],[0,0,0],C.lavender)}{box([1.2,.045,.72],[-1.05,0,0],C.purple)}{box([1.2,.045,.72],[1.05,0,0],C.purple)}{box([2.8,.03,.025],[0,.028,0],C.yellow)}<mesh position={[0,.5,0]} rotation={[0,0,.3]}><coneGeometry args={[.32,.3,32]}/>{mat(C.yellow)}</mesh></>;break;
 }
 return <group position={s.position} rotation={s.rotation} scale={s.scale}>{content}</group>;
}
function GroundReference(){
 return <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.62,0]}><planeGeometry args={[12,12]}/><meshBasicMaterial color="#15101C"/></mesh><gridHelper args={[12,24,C.purpleStroke,"#645070"]} position={[0,-1.61,0]}><lineBasicMaterial transparent opacity={.3} vertexColors depthWrite={false}/></gridHelper></group>;
}
function World({world,t,plan,alignment,loaded}:{world:World3D;t:number;plan:Storyboard;alignment:SpeechAlignment[];loaded:Record<string,GLTF>}){
 return <><Camera world={world} t={t} plan={plan} alignment={alignment}/><ambientLight intensity={world.lighting.fillIntensity}/><directionalLight castShadow={!!world.shadows} shadow-mapSize={[2048,2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={.5} shadow-camera-far={60} shadow-bias={-.0003} position={world.lighting.keyPosition} color={world.lighting.keyColor} intensity={world.lighting.keyIntensity}/><directionalLight position={[-5,3,-6]} color={world.lighting.rimColor} intensity={3}/>{world.objects.map(o=><WorldObject key={o.id} o={o} t={t} plan={plan} alignment={alignment} loaded={loaded}/>)}{world.ground&&plan.assemblies&&<GroundReference/>}{world.ground&&<mesh receiveShadow={!!plan.assemblies} rotation={[-Math.PI/2,0,0]} position={[0,-1.6,0]}><planeGeometry args={[200,200]}/>{plan.assemblies?<shadowMaterial opacity={.3} transparent/>:<meshBasicMaterial color="#120C1D"/>}</mesh>}</>;
}
function WorldLabels({world,t,plan,alignment,width,height}:{world:World3D;t:number;plan:Storyboard;alignment:SpeechAlignment[];width:number;height:number}){
 const state=cameraState(world,t,plan.scenes,alignment),camera=new THREE.PerspectiveCamera(state.fov,width/height,.05,300);camera.position.set(...state.position);camera.lookAt(...state.target);camera.updateMatrixWorld();camera.updateProjectionMatrix();
 return <>{world.objects.filter(o=>o.labelStyle==="pin").map(o=>{const s=objectState(o,t,plan.scenes,alignment),v=new THREE.Vector3(s.position[0],s.position[1]+s.scale*1.12,s.position[2]).project(camera);if(!Number.isFinite(v.x)||!Number.isFinite(v.y)||!Number.isFinite(v.z))return null;const x=(v.x+1)*width/2,y=(1-v.y)*height/2,labelWidth=Math.max(84,Array.from(o.label).length*23*.8+28);const inView=smooth3d((x-labelWidth/2-24)/48)*smooth3d((width-24-labelWidth/2-x)/48)*smooth3d((y-90)/40)*smooth3d((height-35-y)/40)*smooth3d((v.z+1)/.05)*smooth3d((1-v.z)/.0005);return <div key={o.id} style={{position:"absolute",left:x,top:y,transform:"translate(-50%,-100%)",opacity:s.opacity*inView,color:C.lavender,textAlign:"center",fontSize:23,fontWeight:700,whiteSpace:"nowrap",pointerEvents:"none"}}><div style={{padding:"7px 13px",background:"#120C1DE8",border:`1px solid ${C.purpleStroke}`,borderRadius:7}}>{o.label}</div><div style={{height:19,width:1,background:C.lavender,margin:"0 auto"}}/></div>;})}</>;
}
export function ThreeFilm({plan,profile,format,audio,alignment=[],models=[],modelBase=""}:Props){
 const frame=useCurrentFrame(),{width,height}=useVideoConfig(),t=frame/30,portrait=format==="9:16",world=plan.world3d!;
 const [hold]=useState(()=>delayRender("Загружаем 3D-модели и текстуры")),[loaded,setLoaded]=useState<Record<string,GLTF>>({});
 useEffect(()=>{let live=true;Promise.all(models.map(async m=>[m.id,await new GLTFLoader().loadAsync(staticFile(`${modelBase}/${m.file}`))] as const)).then(entries=>{if(live){setLoaded(Object.fromEntries(entries));}}).catch(e=>cancelRender(e));return()=>{live=false;};},[hold]);
 const clock=sceneClock(plan),last=clock.at(-1)!.end;
 const branding=plan.creatorBranding,outroScene=branding?clock.find(s=>s.id===branding.outro.sceneId):undefined;
 const bodyOpacity=branding&&outroScene?creatorOutroState(t,outroScene.start,branding.outro.motion).contentOpacity:1;
 // A persistent world: chapter changes never remount the canvas or its objects.
 const {stageTop,stageHeight,chapterTop,captionTop}=threeLayout(portrait,profile.production?.version===2);
 return <AbsoluteFill style={{background:profile.background,color:profile.foreground,fontFamily:`'${profile.font} Variable',sans-serif`,overflow:"hidden"}}>
  <StudioBackground design={profile.backgroundDesign}/>
  {audio&&<Audio src={staticFile(audio)}/>}
  <div style={{position:"absolute",inset:0,opacity:bodyOpacity}}>
  <div style={{position:"absolute",top:stageTop,left:0,width,height:stageHeight,overflow:"hidden",maskImage:"linear-gradient(to bottom, transparent, black 8%, black 72%, transparent 100%)"}}><ThreeCanvas shadows={!!world.shadows} width={width} height={stageHeight} camera={{position:world.camera[0].position,fov:world.camera[0].fov,near:.05,far:300}} gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}} dpr={1} style={{background:"transparent"}}><World world={world} t={t} plan={plan} alignment={alignment} loaded={loaded}/><CanvasReady ready={Object.keys(loaded).length===models.length} release={()=>continueRender(hold)}/></ThreeCanvas><WorldLabels world={world} t={t} plan={plan} alignment={alignment} width={width} height={stageHeight}/></div>
  <div style={{position:"absolute",left:78,right:portrait?140:78,top:portrait?190:105,fontSize:portrait?38:32,fontWeight:700,letterSpacing:-1,lineHeight:1.12}}>{plan.title}</div>
  <div style={{position:"absolute",left:78,right:portrait?140:78,top:portrait?248:151,display:"flex",gap:8}}>{clock.map((s,i)=><div key={i} style={{flex:1,height:5,background:C.surfaceTop,borderRadius:4,overflow:"hidden"}}><div style={{height:5,width:`${Math.max(0,Math.min(1,(t-s.start)/s.seconds))*100}%`,background:C.purple}}/></div>)}</div>
  {clock.map((s,i)=>{const quality=profile.production?.version===2,enter=quality?smooth3d((t-s.start)/.35):smooth3d((t-s.start+(i===0?0:.2))/.4),exit=i===clock.length-1?0:quality?smooth3d((t-(s.end-.35))/.35):smooth3d((t-(s.end-.2))/.4),opacity=enter*(1-exit);return <div key={s.id} style={{position:"absolute",left:78,right:portrait?140:78,top:chapterTop,opacity,transform:`translateY(${(1-enter)*16}px)`,pointerEvents:"none"}}><div style={{color:C.yellow,fontSize:22,letterSpacing:2,marginBottom:12}}>{String(i+1).padStart(2,"0")} / {String(clock.length).padStart(2,"0")}</div><div style={{fontSize:portrait?49:42,fontWeight:750,lineHeight:1.13,letterSpacing:-1.5,maxWidth:1000}}>{s.title}</div><div style={{fontSize:28,color:C.lavender,lineHeight:1.4,marginTop:16,maxWidth:1100}}>{s.subtitle}</div></div>;})}
  {portrait&&alignment.map((a,i)=><Captions key={i} a={a} t={t} lang={profile.production?.language} top={captionTop} qualityMode={profile.production?.version===2} nextStart={alignment[i+1]?.words?.[0]?.start??alignment[i+1]?.start}/>)}
  {plan.assemblies&&!branding?.hideSchematicNote&&<div style={{position:"absolute",left:78,right:140,top:portrait?1320:975,fontSize:portrait?32:25,lineHeight:1.25,color:C.lavender,opacity:.72}}>{profile.production?.language==="en"?"Schematic 3D · not factory CAD":"Условная 3D-схема · не заводская CAD"}<div style={{fontSize:portrait?28:22}}>{profile.production?.language==="en"?"Approximate layout · exploded view":"Компоновка приблизительна · разнесённый вид"}</div></div>}
  {!alignment.some(a=>a.words?.length)&&<div style={{position:"absolute",left:78,right:140,top:portrait?1240:940,fontSize:24,color:C.muted}}>{profile.production?.language==="en"?"Spatial illustration · @xtuned":"Пространственная иллюстрация · @xtuned"}</div>}
  </div>
  {branding&&outroScene&&<CreatorOutro branding={branding} t={t} start={outroScene.start} portrait={portrait} backgroundDesign={profile.backgroundDesign}/>}
  <div style={{position:"absolute",left:78,right:portrait?140:78,top:portrait?108:44,display:"flex",alignItems:"center",gap:20}}><div style={{width:54,height:54,borderRadius:"50%",background:"#000",border:`2px solid ${C.surfaceTop}`,overflow:"hidden"}}>{branding&&<Img src={staticFile(branding.avatarFile)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</div><span style={{fontSize:28,fontWeight:700}}>{branding?.username??profile.username??"@xtuned"}</span><span style={{marginLeft:"auto",fontSize:22,color:C.muted}}>3D · {Math.round(last)} c</span></div>
 </AbsoluteFill>;
}
