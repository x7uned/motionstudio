import React from "react";
import {Img,staticFile} from "remotion";
import brand from "../video-design/brand.json";
import {keyed,placeAt,toScreen,ease,easeOut,easeSine,type IllustratedTimeline,type Pose} from "../src/lib/illustrated";
import {MEDIA_KEY_SECONDS,MEDIA_TILE_KINDS,type MediaTileKind} from "../src/lib/illustrated-catalog-media";
import {findMedia,type MediaAsset} from "../src/lib/media-contract";

// Real logo / photo tiles (user decision 2026-10-21): a light rounded tile with the snapshotted picture and the name under it,
// like an app icon. Drawn as HTML above the world so Remotion's <Img> holds the frame until the picture is decoded.
const C=brand.colors;
const isTile=(k:string):k is MediaTileKind=>(MEDIA_TILE_KINDS as readonly string[]).includes(k);
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
function mix(a:string,b:string,k:number){const h=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),x=h(a),y=h(b),u=clamp01(k);return `rgb(${x.map((v,i)=>Math.round(v+(y[i]-v)*u)).join(",")})`;}

export function MediaTiles({tl,t,cam,media,xray}:{tl:IllustratedTimeline;t:number;cam:Pose;media?:readonly MediaAsset[];xray:number}){
 return <>{tl.objects.filter(o=>isTile(o.kind)).map(o=>{
  const enter=easeOut((t-o.enterAt)/.5),exit=o.exitAt===Infinity?0:ease((t-o.exitAt)/.45),vis=enter*(1-exit);if(vis<=.002)return null;
  const asset=findMedia(media,o.label,o.kind==="logo-tile"?"logo":"person");if(!asset)return null;
  const place=placeAt(t,o,o.moveKeys),s=toScreen(place,cam),k=cam.zoom*place.scale*(.86+.14*vis);
  const a=keyed(t,o.activeKeys,0,MEDIA_KEY_SECONDS[o.kind as MediaTileKind],easeSine),warn=clamp01((a-.5)/.5),accent=a<=.5?a/.5:1-warn,ring=6*Math.max(accent,warn);
  const dim=`saturate(${1-.7*warn}) brightness(${1-.14*warn})`;
  return <div key={o.id} style={{position:"absolute",left:s.x-120,top:s.y-145,width:240,height:290,opacity:vis*(1-.4*xray),transform:`translateY(${(1-enter)*22}px) scale(${k})`,transformOrigin:"center"}}>
   <div style={{position:"absolute",left:20,top:0,width:200,height:200,borderRadius:46,background:C.ivory,overflow:"hidden",transform:`translateY(${-10*accent}px)`,
    boxShadow:`0 18px 36px rgba(0,0,0,.6), 0 0 0 ${ring}px ${mix(C.lavender,C.pink,warn)}, 0 0 ${28*Math.max(accent,warn)}px ${warn>0?"rgba(224,48,86,.45)":"rgba(141,89,218,.5)"}`}}>
    {asset.kind==="logo"
     ?<Img src={staticFile(asset.file)} style={{position:"absolute",left:36,top:36,width:128,height:128,objectFit:"contain",filter:dim}}/>
     :<Img src={staticFile(asset.file)} style={{position:"absolute",left:7,top:7,width:186,height:186,borderRadius:40,objectFit:"cover",filter:dim}}/>}
   </div>
   <div style={{position:"absolute",left:178,top:-22+(-10*accent),width:62,height:62,borderRadius:"50%",background:C.pink,display:"flex",alignItems:"center",justifyContent:"center",opacity:warn,transform:`scale(${.5+.5*warn})`,boxShadow:"0 6px 16px rgba(0,0,0,.5)"}}>
    <svg width={30} height={34} viewBox="0 0 30 34"><path d="M15 3 V27 M5 18 L15 29 L25 18" stroke={C.ivory} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
   </div>
   <div style={{position:"absolute",left:-60,right:-60,top:218,textAlign:"center",fontSize:34,fontWeight:800,letterSpacing:-.5,color:C.ivory,whiteSpace:"nowrap",textShadow:"0 4px 16px #000"}}>{o.label}</div>
  </div>;})}</>;
}
