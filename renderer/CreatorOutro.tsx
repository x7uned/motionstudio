import React from "react";
import {Img,staticFile} from "remotion";
import {creatorOutroState,type CreatorBranding} from "../src/lib/creator-branding";
import brand from "../video-design/brand.json";
import type {BackgroundDesign} from "../src/lib/backgrounds";
import {StudioBackground} from "./StudioBackground";
const C=brand.colors;
export function CreatorOutro({branding,t,start,portrait,backgroundDesign}:{branding:CreatorBranding;t:number;start:number;portrait:boolean;backgroundDesign?:BackgroundDesign}){
 const s=creatorOutroState(t,start,branding.outro.motion),size=branding.outro.motion.avatarSize;
 return <div style={{position:"absolute",inset:0,opacity:s.opacity,pointerEvents:"none",background:C.background}}>
  <StudioBackground design={backgroundDesign}/>
  {!backgroundDesign&&<div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 46% 58%, ${C.card} 0%, ${C.background} 66%)`}}/>}
  <div style={{position:"absolute",left:78,right:portrait?140:78,top:portrait?365:195,textAlign:"center"}}>
   <div style={{fontSize:portrait?49:43,fontWeight:650,color:C.lavender,letterSpacing:-1,lineHeight:1.2}}>{branding.outro.question}</div>
   <div style={{fontSize:portrait?68:58,fontWeight:800,letterSpacing:-2,marginTop:28,color:C.text}}>{branding.outro.callToAction}</div>
   <div style={{marginTop:28,opacity:s.nameOpacity,transform:`translateY(${s.nameY}px)`}}><span style={{display:"inline-block",fontSize:portrait?108:96,fontWeight:850,letterSpacing:-4,lineHeight:1.08,color:C.ivory,background:C.purple,padding:"9px 24px 18px",borderRadius:14}}>{branding.username.toUpperCase()}</span></div>
  </div>
  <div style={{position:"absolute",left:portrait?510:960,top:portrait?840:490,width:size,height:size,opacity:s.avatarOpacity,transform:`translateX(-50%) translateY(${s.avatarY}px) scale(${.94+.06*s.avatarOpacity})`}}><Img src={staticFile(branding.avatarFile)} style={{width:"100%",height:"100%",objectFit:"contain"}}/></div>
 </div>;
}
