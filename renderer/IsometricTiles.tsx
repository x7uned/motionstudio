import React from "react";
import {Img,staticFile} from "remotion";
import brand from "../video-design/brand.json";
import {project,tileState,clamp01,type IsoPose,type IsoTimeline} from "../src/lib/isometric";
import {findMedia,type MediaAsset} from "../src/lib/media-contract";

// Logo / flag / portrait tiles over the isometric city (user decision 2026-10-21): a light rounded tile with the
// snapshotted picture on a thin stem down to its point in the city, the name under it. HTML above the canvas so
// Remotion's <Img> holds the frame until the picture is decoded. Enter/exit are eased (0.45 s), never one frame.
const C=brand.colors;
export function IsometricTiles({tl,t,pose,width,height,top,bottom,media}:{tl:IsoTimeline;t:number;pose:IsoPose;width:number;height:number;top:number;bottom:number;media?:readonly MediaAsset[]}){
 return <>{(tl.tiles??[]).map(x=>{
  const s=tileState(x,t);if(s.k<=.002)return null;
  const asset=findMedia(media,x.subject,x.kind);if(!asset)return null;
  const ground=project(x.point,pose,width,height),head=project([x.point[0],x.point[1]+x.lift,x.point[2]],pose,width,height);
  // Fade (not clip) when the tile's head leaves the stage during a camera move.
  const outside=Math.max(0,-head.x+90,head.x-width+90,top-(head.y-230),head.y-bottom),inView=clamp01(1-outside/80);if(s.k*inView<=.005)return null;
  const size=x.kind==="flag"?{w:220,h:150}:{w:180,h:180};
  return <div key={x.id} style={{position:"absolute",left:0,top:0,width,height,pointerEvents:"none",opacity:inView}}>
   <svg width={width} height={height} style={{position:"absolute",left:0,top:0}}>
    <line x1={ground.x} y1={ground.y} x2={head.x} y2={head.y} stroke={C.lavender} strokeWidth={3} strokeOpacity={.85*s.k} strokeDasharray={`${Math.hypot(head.x-ground.x,head.y-ground.y)*s.k} 9999`}/>
    <circle cx={ground.x} cy={ground.y} r={7*s.k} fill={C.yellow}/>
   </svg>
   <div style={{position:"absolute",left:head.x,top:head.y,transform:`translate(-50%,-100%) translateY(${(1-s.k)*24}px) scale(${.86+.14*s.k})`,transformOrigin:"50% 100%",opacity:s.k,display:"flex",flexDirection:"column",alignItems:"center"}}>
    <div style={{width:size.w,height:size.h,borderRadius:x.kind==="flag"?22:40,background:C.ivory,overflow:"hidden",position:"relative",boxShadow:`0 18px 36px rgba(0,0,0,.6), 0 0 0 5px ${C.lavender}, 0 0 28px rgba(141,89,218,.5)`}}>
     {x.kind==="logo"
      ?<Img src={staticFile(asset.file)} style={{position:"absolute",left:26,top:26,width:size.w-52,height:size.h-52,objectFit:"contain"}}/>
      :<Img src={staticFile(asset.file)} style={{position:"absolute",left:0,top:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
    </div>
    {x.label&&<div style={{marginTop:14,padding:"6px 16px",borderRadius:12,background:"#120C1DE6",fontSize:30,fontWeight:800,color:C.ivory,whiteSpace:"nowrap"}}>{x.subject}</div>}
    <div style={{width:3,height:18,background:C.lavender}}/>
   </div>
  </div>;
 })}</>;
}
