import React from "react";
import type {PortraitLayout} from "../src/lib/illustrated-layout";
import {Freeze,Img,staticFile,useCurrentFrame} from "remotion";
import {sceneClock,type Storyboard} from "../src/lib/model";
import {OUTRO_SHEET,outroAnchors,outroPoseKeys,outroSpriteLayers,outroState,type CreatorOutro} from "../src/lib/xtuned-outro";
import type {BackgroundDesign} from "../src/lib/backgrounds";
import {StudioBackground} from "./StudioBackground";
import brand from "../video-design/brand.json";
const C=brand.colors;

type Words={words?:{text:string;start:number;end:number}[]}[];
const SCALE=4,STEP=8;
/** Portrait keeps every word inside x 78…938 and the whole character inside y 108…1420 (feet end ≈1410). */
const LAYOUT={
 portrait:{text:{left:78,width:860,top:300},questionSize:52,plateSize:100,plateTop:150,character:{left:-20,top:606},button:{left:600,top:596,width:338,height:108},cursorFrom:[900,1300] as const},
 landscape:{text:{left:960,width:880,top:330},questionSize:46,plateSize:92,plateTop:130,character:{left:150,top:150},button:{left:760,top:150,width:360,height:108},cursorFrom:[1820,90] as const},
};
const hex=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const mix=(a:string,b:string,k:number)=>`rgb(${hex(a).map((v,i)=>Math.round(v+(hex(b)[i]-v)*k)).join(",")})`;
// Stepped corners keep the button in the same pixel language as the character.
const PIXEL_CORNERS=`polygon(${STEP}px 0,calc(100% - ${STEP}px) 0,calc(100% - ${STEP}px) ${STEP}px,100% ${STEP}px,100% calc(100% - ${STEP}px),calc(100% - ${STEP}px) calc(100% - ${STEP}px),calc(100% - ${STEP}px) 100%,${STEP}px 100%,${STEP}px calc(100% - ${STEP}px),0 calc(100% - ${STEP}px),0 ${STEP}px,${STEP}px ${STEP}px)`;
const CURSOR=["X","XX","X.X","X..X","X...X","X....X","X.....X","X......X","X.......X","X........X","X.....XXXX","X..X..X","X.X X..X","XX  X..X","X    X..X","     XXX"];

function Cursor({x,y,press,opacity}:{x:number;y:number;press:number;opacity:number}){
 const u=5;
 return <svg width={11*u} height={16*u} style={{position:"absolute",left:x,top:y,opacity,transform:`scale(${1-.1*press})`,transformOrigin:"0 0",filter:"drop-shadow(0 6px 10px rgba(0,0,0,.55))"}} shapeRendering="crispEdges" aria-hidden="true">
  {CURSOR.flatMap((row,r)=>[...row].map((ch,c)=>ch==="X"?<rect key={`${r}-${c}`} x={c*u} y={r*u} width={u} height={u} fill={C.background}/>:ch==="."?<rect key={`${r}-${c}`} x={c*u} y={r*u} width={u} height={u} fill={C.ivory}/>:null))}
 </svg>;
}

/**
 * Under the outro the film holds the last frame of its own last chapter: no second copy of the outro text
 * fades in underneath, and the frozen frame equals the one already on screen, so nothing jumps.
 */
export function OutroFreeze({plan,children}:{plan:Storyboard;children:React.ReactNode}){
 const outro=plan.creatorOutro,scene=outro?sceneClock(plan).find(s=>s.id===outro.sceneId):undefined;
 if(!scene)return <>{children}</>;
 return <Freeze frame={Math.max(0,scene.startFrame-1)} active={(f:number)=>f>=scene.startFrame}>{children}</Freeze>;
}
/**
 * 2D explainers draw chapter segments and a persistent system from plan.scenes. They get the film's own chapters
 * only (the last one lasts through the outro, which covers it), so no extra "outro chapter" appears in the header.
 */
export function filmPlan(plan:Storyboard):Storyboard{
 const outro=plan.creatorOutro,i=outro?plan.scenes.findIndex(s=>s.id===outro.sceneId):-1;
 if(i<1)return plan;
 const scenes=plan.scenes.filter((_,k)=>k!==i);scenes[scenes.length-1]={...scenes[scenes.length-1],seconds:scenes[scenes.length-1].seconds+plan.scenes[i].seconds};
 return {...plan,scenes};
}
export function XtunedOutro({plan,alignment,format,backgroundDesign,layout}:{plan:Storyboard;alignment?:Words;format:string;backgroundDesign?:BackgroundDesign;layout?:PortraitLayout}){
 const t=useCurrentFrame()/30,outro=plan.creatorOutro;
 if(!outro)return null;
 const clock=sceneClock(plan),i=clock.findIndex(s=>s.id===outro.sceneId);
 if(i<0||t<clock[i].start)return null;
 return <OutroFrame outro={outro} t={t} anchors={outroAnchors(outro,clock[i].start,clock[i].end,alignment?.[i]?.words)} portrait={format==="9:16"} backgroundDesign={backgroundDesign} layout={layout}/>;
}
/** tiktok-safe films lower the header; the outro moves down with it so its question never crosses the frozen header. */
export function outroLayout(portrait:boolean,layout?:PortraitLayout){
 if(!portrait||layout!=="tiktok-safe")return portrait?LAYOUT.portrait:LAYOUT.landscape;
 const p=LAYOUT.portrait,dy=110;
 return {...p,text:{...p.text,top:p.text.top+dy},character:{...p.character,top:p.character.top+dy},button:{...p.button,top:p.button.top+dy},cursorFrom:[p.cursorFrom[0],p.cursorFrom[1]+dy] as const};
}
function OutroFrame({outro,t,anchors,portrait,backgroundDesign,layout}:{outro:CreatorOutro;t:number;anchors:ReturnType<typeof outroAnchors>;portrait:boolean;backgroundDesign?:BackgroundDesign;layout?:PortraitLayout}){
 const s=outroState(t,anchors),L=outroLayout(portrait,layout),[cw,ch]=OUTRO_SHEET.cell,b=L.button;
 const fill=mix(C.purple,C.green,s.done),shade=mix(mix(C.purple,C.green,s.done),C.background,.35);
 const tip=[b.left+b.width*.62,b.top+b.height*.58],cx=L.cursorFrom[0]+(tip[0]-L.cursorFrom[0])*s.cursorTravel,cy=L.cursorFrom[1]+(tip[1]-L.cursorFrom[1])*s.cursorTravel;
 const part=(p:{opacity:number;scale:number;y:number})=>({opacity:p.opacity,transform:`translateY(${p.y}px) scale(${p.scale})`});
 return <div style={{position:"absolute",inset:0,opacity:s.overlay,background:C.background,pointerEvents:"none",fontFamily:"'Manrope Variable',sans-serif"}}>
  <StudioBackground design={backgroundDesign}/>
  {!backgroundDesign&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 46% 58%, ${C.card} 0%, ${C.background} 66%)`}}/>}
  <div style={{position:"absolute",left:L.text.left,width:L.text.width,top:L.text.top,textAlign:"center"}}>
   <div style={{...part(s.question),fontSize:L.questionSize,fontWeight:650,color:C.lavender,letterSpacing:-1,lineHeight:1.18}}>{outro.question}</div>
   <div style={{...part(s.plate),position:"absolute",left:0,right:0,top:L.plateTop}}><span style={{display:"inline-block",fontSize:L.plateSize,fontWeight:850,letterSpacing:-4,lineHeight:1.08,color:C.ivory,background:C.purple,padding:"9px 24px 18px",borderRadius:14}}>{outro.username}</span></div>
  </div>
  <div style={{position:"absolute",left:L.character.left,top:L.character.top+s.character.y,width:cw*SCALE,height:ch*SCALE,overflow:"hidden",opacity:s.character.opacity}}>
   {outroSpriteLayers(t,outroPoseKeys(anchors)).map((layer,k)=><Img key={k} src={staticFile(outro.sheet)} style={{position:"absolute",opacity:layer.opacity,width:OUTRO_SHEET.size[0]*SCALE,height:OUTRO_SHEET.size[1]*SCALE,left:-layer.frame*cw*SCALE,top:-layer.row*ch*SCALE,imageRendering:"pixelated",maxWidth:"none"}}/>)}
  </div>
  <div style={{position:"absolute",left:b.left,top:b.top,width:b.width,height:b.height,...part(s.button)}}>
   <div style={{position:"absolute",inset:-26,borderRadius:40,background:C.green,filter:"blur(28px)",opacity:.55*s.glow}}/>
   <div style={{position:"absolute",inset:0,clipPath:PIXEL_CORNERS,background:shade,transform:`scale(${s.buttonPress})`}}>
    <div style={{position:"absolute",left:0,right:0,top:0,bottom:STEP,clipPath:PIXEL_CORNERS,background:fill}}/>
    <div style={{position:"absolute",left:STEP*2,right:STEP*2,top:STEP,height:STEP,background:C.ivory,opacity:.28}}/>
    <div style={{position:"absolute",inset:0,bottom:STEP,display:"grid",placeItems:"center",fontSize:38,fontWeight:800,letterSpacing:-1}}>
     <span style={{gridArea:"1/1",color:C.ivory,opacity:1-s.done,transform:`translateY(${-10*s.done}px)`}}>{outro.button}</span>
     <span style={{gridArea:"1/1",color:C.background,opacity:s.done,transform:`translateY(${10*(1-s.done)}px)`}}>{outro.done} ✓</span>
    </div>
   </div>
  </div>
  <Cursor x={cx} y={cy} press={s.cursorPress} opacity={s.cursor}/>
 </div>;
}
