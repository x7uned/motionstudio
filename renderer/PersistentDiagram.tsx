import {StudioBackground} from "./StudioBackground";
import React from "react";
import {AbsoluteFill,Audio,staticFile,useCurrentFrame} from "remotion";
import {sceneClock,type Storyboard,type StyleProfile} from "../src/lib/model";
import {resolveBeatAt} from "../src/lib/research-model";
import {smooth} from "./motion";
import brand from "../video-design/brand.json";
import {Captions,type SpeechAlignment} from "./Explainer";
const C=brand.colors;
function labelLines(label:string,limit:number){const lines:string[]=[];let line="";for(const word of label.split(/\s+/)){if(line&&line.length+word.length+1>limit){lines.push(line);line="";}if(word.length>limit){if(line){lines.push(line);line="";}for(let at=0;at<word.length;at+=limit)lines.push(word.slice(at,at+limit));}else line+=(line?" ":"")+word;}if(line)lines.push(line);return lines;}
type Transition={at:number;target:number};
export function visibilityAt(events:Transition[],t:number){
 let value=0,from=0,start=-10,target=0;
 for(const e of [...events].sort((a,b)=>a.at-b.at)){if(e.at>t)break;value=from+(target-from)*smooth(e.at,start,start+.5);from=value;start=e.at;target=e.target;}
 return from+(target-from)*smooth(t,start,start+.5);
}
type Point={x:number;y:number};type Half={w:number;h:number};
type DiagramNode=NonNullable<Storyboard["scenes"][number]["diagram"]>["nodes"][number];
type DiagramEdge=NonNullable<Storyboard["scenes"][number]["diagram"]>["edges"][number];
const NODE_HALF_HEIGHT=77,LIST_HALF_HEIGHT=95,ROW_STEP=21,BAR_FRACTIONS=[.82,.6,.72,.52,.66];
/** Endpoints of an explicit-tone link: clipped outside both cards so the arrowhead stays visible, shifted sideways to separate a reverse twin. */
export function edgeEnds(a:Point,b:Point,ha:Half,hb:Half,offset=0,pad=10){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
 const exit=(h:Half)=>Math.min(dx?(h.w+pad)/Math.abs(dx):Infinity,dy?(h.h+pad)/Math.abs(dy):Infinity);
 let s=exit(ha),e=exit(hb);
 // Cards passing close during a move shrink the link continuously instead of snapping to centres.
 if(!Number.isFinite(s+e)){s=0;e=0;}else if(s+e>.9){const k=.9/(s+e);s*=k;e*=k;}
 return {from:{x:a.x+dx*s+nx*offset,y:a.y+dy*s+ny*offset},to:{x:b.x-dx*e+nx*offset,y:b.y-dy*e+ny*offset}};
}
type Cubic=[Point,Point,Point,Point];
const lerp=(a:Point,b:Point,k:number):Point=>({x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k});
/** Toned link as a cubic. Neighbours in one row leave only a short stub, so replies/references bend below the row; the bend blends continuously with the gap. */
export function edgeCurve(a:Point,b:Point,ha:Half,hb:Half,offset:number,bend:boolean):Cubic{
 const {from,to}=edgeEnds(a,b,ha,hb,offset),straight:Cubic=[from,lerp(from,to,1/3),lerp(from,to,2/3),to];
 const gap=Math.hypot(to.x-from.x,to.y-from.y),w=bend?(1-smooth(gap,50,110))*(1-smooth(Math.abs(b.y-a.y),20,80)):0;
 if(!w)return straight;
 const sgn=Math.sign(b.x-a.x)||1,start={x:a.x+sgn*ha.w*.45,y:a.y+ha.h+6},end={x:b.x-sgn*hb.w*.45,y:b.y+hb.h+12};
 const arc:Cubic=[start,{x:start.x,y:start.y+46},{x:end.x,y:end.y+46},end];
 return straight.map((p,i)=>lerp(p,arc[i],w)) as Cubic;
}
/** Leading part of a cubic up to parameter k (de Casteljau). */
export function cubicHead(c:Cubic,k:number):Cubic{
 const [p0,p1,p2,p3]=c,a=lerp(p0,p1,k),b=lerp(p1,p2,k),d=lerp(p2,p3,k),e=lerp(a,b,k),f=lerp(b,d,k);
 return [p0,a,e,lerp(e,f,k)];
}
/** Vertical layout of a list card: title, column headings, rule and as many schematic rows as fit. */
export function listLayout(rows:number,titleLines:number){
 const titleY=titleLines>1?[-64,-34]:[-55],headerY=titleLines>1?0:-18,ruleY=headerY+12,first=ruleY+18;
 const fit=Math.floor((LIST_HALF_HEIGHT-8-first-10)/ROW_STEP)+1;
 return {titleY,headerY,ruleY,rowY:Array.from({length:Math.max(0,Math.min(rows,fit))},(_,i)=>first+i*ROW_STEP)};
}
/** Rows unfold one after another inside the card's own reveal and reach full size exactly when the card does. */
export function rowReveal(v:number,row:number,rows:number,stagger=.12){const span=1-Math.max(0,rows-1)*stagger;return Math.max(0,Math.min(1,(v-row*stagger)/span));}
export function PersistentDiagram({plan,alignment=[],t,width=860}:{plan:Storyboard;alignment?:SpeechAlignment[];t:number;width?:number}){
 const clock=sceneClock(plan),nodes=new Map<string,DiagramNode>(),edges=new Map<string,DiagramEdge>();
 for(const s of clock){for(const n of s.diagram?.nodes||[])if(!nodes.has(n.id))nodes.set(n.id,n);for(const e of s.diagram?.edges||[])edges.set(e.id,e);}
 const tracks=(id:string,edge=false)=>{const events:Transition[]=[];let existed=false;
  for(const [i,s] of clock.entries()){const present=Boolean(edge?s.diagram?.edges.some(e=>e.id===id):s.diagram?.nodes.some(n=>n.id===id));if(existed&&!present)events.push({at:s.start,target:0});const beats=s.beats?.filter(b=>b.target===id)||[];if(present&&!existed&&!beats.some(b=>["reveal","connect"].includes(b.action)))events.push({at:s.start,target:1});for(const b of beats)if(["reveal","connect","hide"].includes(b.action))events.push({at:s.start+resolveBeatAt(b,s.start,alignment[i]?.words),target:b.action==="hide"?0:1});existed=present;}
  return visibilityAt(events,t);
 };
 const emphasisOf=(id:string)=>{let emphasis=0;for(const [i,s] of clock.entries())for(const b of s.beats||[])if(b.target===id&&b.action==="highlight"){const at=s.start+resolveBeatAt(b,s.start,alignment[i]?.words);emphasis=Math.max(emphasis,smooth(t,at,at+.2)*(1-smooth(t,at+.7,at+1.15)));}return emphasis;};
 const point=(id:string)=>{const initial=nodes.get(id)!;const target=(row:number,col:number)=>({x:width/6+col*width/3,y:120+row*235});let p=target(initial.row,initial.col);
  for(const s of clock){if(s.start>t)break;const n=s.diagram?.nodes.find(n=>n.id===id);if(n){const next=target(n.row,n.col),v=smooth(t,s.start,s.start+.55);p={x:p.x+(next.x-p.x)*v,y:p.y+(next.y-p.y)*v};}}
  return p;
 };
 const boxWidth=Math.min(440,width/3-26),half=(id:string):Half=>({w:boxWidth/2,h:nodes.get(id)?.list?LIST_HALF_HEIGHT:NODE_HALF_HEIGHT});
 const legacyEdge=(e:DiagramEdge)=>{const a=point(e.from),b=point(e.to);if(!a||!b)return null;const opacity=Math.min(tracks(e.id,true),tracks(e.from),tracks(e.to));return <g key={e.id} opacity={opacity}><path d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={C.purple} strokeWidth={4} fill="none"/><path d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke={C.yellow} strokeWidth={4} strokeDasharray="5 30" strokeDashoffset={-t*28} fill="none"/></g>;};
 const tonedEdge=(e:DiagramEdge,kind:NonNullable<DiagramEdge["kind"]>)=>{
  const v=Math.min(tracks(e.id,true),tracks(e.from),tracks(e.to));if(v<=0)return null;
  const twin=[...edges.values()].some(o=>o.from===e.to&&o.to===e.from),curve=edgeCurve(point(e.from),point(e.to),half(e.from),half(e.to),twin?16:0,kind!=="request");
  // The link grows from its sender and retracts into it, so a new route never appears whole in one frame.
  const grown=cubicHead(curve,v),tip=grown[3],length=Math.hypot(grown[1].x-grown[0].x,grown[1].y-grown[0].y)+Math.hypot(grown[2].x-grown[1].x,grown[2].y-grown[1].y)+Math.hypot(tip.x-grown[2].x,tip.y-grown[2].y);
  const head=kind==="reference"?0:Math.min(18,length*.8),stroke=cubicHead(curve,v*Math.max(0,1-head*.6/Math.max(length,1)));
  const back=Math.hypot(tip.x-grown[2].x,tip.y-grown[2].y)>.5?grown[2]:grown[0],dl=Math.hypot(tip.x-back.x,tip.y-back.y)||1,ux=(tip.x-back.x)/dl,uy=(tip.y-back.y)/dl,emphasis=emphasisOf(e.id);
  const d=`M${stroke[0].x} ${stroke[0].y} C${stroke[1].x} ${stroke[1].y} ${stroke[2].x} ${stroke[2].y} ${stroke[3].x} ${stroke[3].y}`;
  const color=kind==="reply"?C.yellow:kind==="reference"?C.lavender:C.purple;
  return <g key={e.id} opacity={Math.min(1,v*1.6)}>
   {kind==="reference"
    ?<path d={d} stroke={color} strokeWidth={3+2*emphasis} strokeDasharray="10 12" strokeLinecap="round" opacity={.85} fill="none"/>
    :<><path d={d} stroke={color} strokeWidth={4+3*emphasis} fill="none"/><path d={d} stroke={kind==="reply"?C.ivory:C.yellow} strokeWidth={4} strokeDasharray="5 30" strokeDashoffset={-t*28} opacity={kind==="reply"?.8:1} fill="none"/></>}
   {kind==="reference"
    ?<circle cx={tip.x} cy={tip.y} r={7} fill={C.background} stroke={color} strokeWidth={3}/>
    :<path d={`M${tip.x} ${tip.y} L${tip.x-ux*head-uy*head*.5} ${tip.y-uy*head+ux*head*.5} L${tip.x-ux*head+uy*head*.5} ${tip.y-uy*head-ux*head*.5} Z`} fill={color}/>}
  </g>;
 };
 const listCard=(n:DiagramNode,list:NonNullable<DiagramNode["list"]>,v:number,emphasis:number)=>{
  const h=LIST_HALF_HEIGHT,inner=boxWidth-40,left=-boxWidth/2+20,colWidth=inner/list.columns.length;
  let titleSize=width<1000?27:29,lines=labelLines(n.label,Math.floor((boxWidth-30)/(titleSize*.57)));
  if(lines.length>2){titleSize=23;lines=labelLines(n.label,Math.floor((boxWidth-30)/(titleSize*.57)));}
  lines=lines.slice(0,2);
  const layout=listLayout(list.rows,lines.length),longest=Math.max(...list.columns.map(c=>c.length)),headSize=Math.min(19,(colWidth-8)/(longest*.6));
  return <>
   <rect x={-boxWidth/2} y={-h} width={boxWidth} height={h*2} rx={25} fill={C.card} stroke={C.purple} strokeWidth={2}/>
   <rect x={-boxWidth/2} y={-h} width={boxWidth} height={h*2} rx={25} fill="none" stroke={C.yellow} strokeWidth={4} opacity={emphasis}/>
   <text textAnchor="middle" fontFamily="Manrope Variable" fontSize={titleSize} fontWeight={700} fill={C.text}>{lines.map((line,i)=><tspan key={i} x={0} y={layout.titleY[i]}>{line}</tspan>)}</text>
   {list.columns.map((c,i)=><text key={c+i} x={left+i*colWidth} y={layout.headerY} fontFamily="Manrope Variable" fontSize={headSize} fontWeight={700} fill={C.lavender}>{c}</text>)}
   <line x1={left} x2={left+inner} y1={layout.ruleY} y2={layout.ruleY} stroke={C.purple} strokeWidth={2} opacity={.7}/>
   {layout.rowY.map((y,r)=>{const rv=rowReveal(v,r,layout.rowY.length);return list.columns.map((_,c)=>{const w=(colWidth-14)*BAR_FRACTIONS[(r*2+c)%BAR_FRACTIONS.length]*rv;return <g key={`${r}-${c}`} opacity={rv}><rect x={left+c*colWidth} y={y} width={w} height={10} rx={5} fill={C.muted} opacity={.55}/>{r===0&&<rect x={left+c*colWidth} y={y} width={w} height={10} rx={5} fill={C.yellow} opacity={emphasis}/>}</g>;});})}
  </>;
 };
 return <svg width={width} height={510} viewBox={`0 0 ${width} 510`}>
  {[...edges.values()].map(e=>e.kind?tonedEdge(e,e.kind):legacyEdge(e))}
  {[...nodes.values()].map(n=>{const p=point(n.id),v=tracks(n.id),emphasis=emphasisOf(n.id);
   if(n.list)return <g key={n.id} opacity={v} transform={`translate(${p.x} ${p.y+(1-v)*12}) scale(${.97+.03*v})`}>{listCard(n,n.list,v,emphasis)}</g>;
   const fontSize=width<1000?30:32,lines=labelLines(n.label,Math.floor((boxWidth-30)/(fontSize*.57)));return <g key={n.id} opacity={v} transform={`translate(${p.x} ${p.y+(1-v)*12}) scale(${.97+.03*v})`}><rect x={-boxWidth/2} y={-77} width={boxWidth} height={154} rx={25} fill={C.card} stroke={C.purple} strokeWidth={2}/><rect x={-boxWidth/2} y={-77} width={boxWidth} height={154} rx={25} fill="none" stroke={C.yellow} strokeWidth={4} opacity={emphasis}/><rect x={-boxWidth/2+22} y={-49} width={34} height={26} rx={7} fill={C.purple} opacity={.45+emphasis*.5}/><text textAnchor="middle" fontFamily="Manrope Variable" fontSize={fontSize} fontWeight={700} fill={C.text}>{lines.map((line,i)=><tspan key={i} x={0} y={lines.length===1?25:lines.length===2?4+i*36:-8+i*32}>{line}</tspan>)}</text></g>;})}
 </svg>;
}
export function LandscapeExplainer({plan,profile,audio,alignment=[]}:{plan:Storyboard;profile:StyleProfile;audio?:string;alignment?:SpeechAlignment[]}){
 const t=useCurrentFrame()/30,clock=sceneClock(plan);
 return <AbsoluteFill style={{background:profile.background,color:profile.foreground,fontFamily:`'${profile.font} Variable',sans-serif`,overflow:"hidden"}}>
  <StudioBackground design={profile.backgroundDesign}/>
  {audio&&<Audio src={staticFile(audio)}/>}
  <div style={{position:"absolute",left:100,top:52,fontSize:28,color:C.lavender}}>{profile.username||"@xtuned"} · {plan.title}</div>
  {clock.map((s,i)=>{const opacity=smooth(t,s.start,s.start+.27)*(i===clock.length-1?1:1-smooth(t,s.end-.27,s.end));return <div key={s.id} style={{position:"absolute",left:100,top:115,right:100,opacity}}><div style={{fontSize:64,fontWeight:800,lineHeight:1.1}}>{s.title}</div><div style={{fontSize:30,color:C.muted,marginTop:16}}>{s.subtitle}</div></div>;})}
  <div style={{position:"absolute",left:130,top:300}}><PersistentDiagram plan={plan} alignment={alignment} t={t} width={1660}/></div>
  <div style={{position:"absolute",left:100,top:1036,width:1720,height:8,background:C.surface}}><div style={{height:8,width:`${Math.min(100,t/clock.at(-1)!.end*100)}%`,background:C.purple}}/></div>
  <div style={{position:"absolute",left:400,top:-260,width:1080,height:1920}}>{alignment.map((a,i)=><Captions key={i} a={a} t={t} lang={profile.production?.language} qualityMode={profile.production?.version===2} nextStart={alignment[i+1]?.words?.[0]?.start??alignment[i+1]?.start}/>)}</div>
 </AbsoluteFill>;
}
