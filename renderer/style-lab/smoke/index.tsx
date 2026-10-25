import React from "react";
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,interpolate} from "remotion";
import rough from "roughjs";
import story from "../../../work/style-lab/story.json";
const Film=()=>{const f=useCurrentFrame();const g=rough.generator();const d=g.rectangle(140,700,800,400,{seed:7,roughness:2,fill:"#ffd6a5",hachureGap:12});
 const paths=g.toPaths(d);
 return <AbsoluteFill style={{background:"#fbf7ef"}}><svg width={1080} height={1920}>{paths.map((p,i)=><path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill??"none"} opacity={interpolate(f,[0,20],[0,1],{extrapolateRight:"clamp"})}/>)}</svg><div style={{position:"absolute",top:300,width:"100%",textAlign:"center",fontSize:64}}>{story.title}</div></AbsoluteFill>;};
registerRoot(()=><Composition id="StyleLab" component={Film} durationInFrames={story.durationInFrames} fps={30} width={1080} height={1920}/>);
