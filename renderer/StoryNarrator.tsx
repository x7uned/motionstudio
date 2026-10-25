import React from "react";
import {Img,staticFile} from "remotion";
import {narratorLayers,STORY_NARRATOR_SHEET} from "../src/lib/story-narrator";
/** Feet stay planted. Sprite state transitions blend over nine frames at the shared 30 fps clock. */
export function StoryNarrator({sheet,t,keys,scale=3,left=540,top=1104}:{sheet:string;t:number;keys:{start:number;emotion:string}[];scale?:number;left?:number;top?:number}){
 const [cw,ch]=STORY_NARRATOR_SHEET.cell;
 return <div style={{position:"absolute",left:left-cw*scale/2,top,width:cw*scale,height:ch*scale,overflow:"hidden"}}>
  {narratorLayers(t,keys).map((layer,i)=><Img key={i} src={staticFile(sheet)} style={{position:"absolute",opacity:layer.opacity,width:STORY_NARRATOR_SHEET.size[0]*scale,height:STORY_NARRATOR_SHEET.size[1]*scale,left:-layer.frame*cw*scale,top:-layer.row*ch*scale,imageRendering:"pixelated",maxWidth:"none"}}/>)}</div>;
}
