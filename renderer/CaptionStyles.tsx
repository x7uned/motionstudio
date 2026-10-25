import React from "react";
import {continueRender,delayRender} from "remotion";
import brand from "../video-design/brand.json";
import {smooth,windowAt,clamp01} from "./motion";
import {captionChunks,captionEnvelope,carryWord,type SpeechAlignment,type Word} from "./Explainer";
import {CAPTION_STYLES,type CaptionStyleId} from "../src/lib/caption-style";
export {CAPTION_STYLES,type CaptionStyleId};

/**
 * Caption looks for the illustrated film (2026-10-21, previews in work/caption-styles). Same real word timings and the
 * same caption box as the classic captions; every value is a function of time, nothing enters, leaves or changes state
 * in one frame (video-design/MOTION-RULES.md). The editor chose "karaoke" for new projects (production.captionStyle);
 * projects without the field keep the classic captions.
 */
const C=brand.colors;
export const CAPTION_STYLE_NAMES:Record<CaptionStyleId,string>={karaoke:"Караоке-заливка",word:"Одно слово",marker:"Маркер",terminal:"Терминал",roll:"Две строки",chips:"Фишки",bold:"Жирный контур",focus:"Фокус",tape:"Лента",sticker:"Наклейка"};

type Group={words:Word[];start:number;end:number;index:number;key:number};
const letters=(s:string)=>s.replace(/[^\p{L}\p{N}]/gu,"").length;
const bare=(s:string)=>s.replace(/[.,;:]+$/u,"");
const easeOut=(p:number)=>1-Math.pow(1-clamp01(p),3);
const easeInOut=(p:number)=>{const x=clamp01(p);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const easeBack=(p:number)=>{const x=clamp01(p),c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);};
const hex=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
function mix(a:string,b:string,k:number){const x=hex(a),y=hex(b),u=clamp01(k);return `rgb(${x.map((v,i)=>Math.round(v+(y[i]-v)*u)).join(",")})`;}

/** No orphan word after a full group inside a sentence: «the same | network,» instead of «… the same | network,». */
function balance(chunks:Word[][],lang?:string){
 for(let n=1;n<chunks.length;n++){const prev=chunks[n-1],cur=chunks[n];
  if(cur.length!==1||prev.length<3||/[.,!?;:]$/.test(prev.at(-1)!.text))continue;
  cur.unshift(prev.pop()!);
  if(prev.length>2&&carryWord(prev.at(-1)!.text,lang))cur.unshift(prev.pop()!);}
 return chunks;
}
/** Groups over the whole film with the quality-mode timing of the classic captions (end = next group or scene end). */
function groups(alignment:SpeechAlignment[],lang:string|undefined,maxWords=5,maxChars=32):Group[]{
 const out:Group[]=[];
 alignment.forEach((a,ai)=>{if(!a.words?.length)return;
  const chunks=balance(captionChunks(a.words,lang,maxWords,maxChars),lang),nextStart=alignment[ai+1]?.words?.[0]?.start??alignment[ai+1]?.start;
  chunks.forEach((words,n)=>{const end=Math.min(chunks[n+1]?.[0].start??nextStart??a.end+.18,a.sceneEnd);
   let key=0;words.forEach((w,i)=>{if(letters(w.text)>letters(words[key].text))key=i;});
   out.push({words,start:words[0].start,end,index:out.length,key});});});
 return out;
}
const active=(w:Word,t:number)=>windowAt(t,w.start,w.end+.025,.1);
const Box=({top,children,overflow="hidden"}:{top:number;children:React.ReactNode;overflow?:"hidden"|"visible"})=>
 <div style={{position:"absolute",left:78,right:140,top,height:145,overflow}}>{children}</div>;
const center:React.CSSProperties={position:"absolute",inset:0,display:"flex",justifyContent:"center",alignItems:"center",alignContent:"center",flexWrap:"wrap",textAlign:"center"};

// 01 — the phrase waits dimmed; each word fills left→right in yellow while spoken, then settles to ivory.
function Karaoke({gs,t}:{gs:Group[];t:number}){
 return <>{gs.map(g=>{const {enter,exit,opacity}=captionEnvelope(t,g.start,g.end,true);if(!opacity)return null;
  return <div key={g.index} style={{...center,gap:"4px 16px",fontSize:52,fontWeight:800,lineHeight:1.22,letterSpacing:-1.5,opacity,transform:`translateY(${(1-enter)*44-exit*44}px)`}}>
   {g.words.map((w,j)=>{const p=clamp01((t-w.start)/Math.max(.12,w.end-w.start)),x=p*104-2,fill=mix(C.yellow,C.ivory,smooth(t,w.end,w.end+.3)),dim="rgba(253,254,237,.4)";
    return <span key={j} style={{backgroundImage:`linear-gradient(90deg, ${fill} ${x-2}%, ${dim} ${x+2}%)`,WebkitBackgroundClip:"text",backgroundClip:"text",color:"transparent"}}>{bare(w.text)}</span>;})}
  </div>;})}</>;
}

// 02 — one big word at a time, springing in; the longest word of each phrase is yellow.
function OneWord({gs,t}:{gs:Group[];t:number}){
 const out:React.ReactNode[]=[];
 for(const g of gs){const env=captionEnvelope(t,g.start,g.end,true);if(!env.opacity&&(t<g.start-.2||t>g.end+.2))continue;
  // Words hand over in sequence (old one out over the last frames, new one in from its timestamp), never stacked.
  g.words.forEach((w,j)=>{const s=w.start,e=g.words[j+1]?.start??g.end,f=Math.max(.06,Math.min(.08,(e-s)/2));
   const inn=smooth(t,s,s+f),outp=g.words[j+1]?smooth(t,e-f,e):env.exit;if(inn<=0||outp>=1)return;
   const pop=easeBack((t-s)/.22),text=bare(w.text),size=Math.min(98,840/Math.max(1,text.length*.6));
   out.push(<div key={`${g.index}-${j}`} style={{...center,fontSize:size,fontWeight:800,letterSpacing:-2.5,lineHeight:1,color:j===g.key&&g.words.length>2?C.yellow:C.ivory,opacity:inn*(1-outp),transform:`translateY(${(1-easeOut((t-s)/.18))*16-outp*14}px) scale(${(.72+.28*pop)*(1-.08*outp)})`,textShadow:"0 8px 30px #000"}}>{text}</div>);});}
 return <>{out}</>;
}

// 03 — current word gets a growing lavender underline; the key word is swiped with a yellow highlighter that stays.
function Marker({gs,t}:{gs:Group[];t:number}){
 return <>{gs.map(g=>{const {enter,exit,opacity}=captionEnvelope(t,g.start,g.end,true);if(!opacity)return null;
  return <div key={g.index} style={{...center,gap:"6px 6px",fontSize:50,fontWeight:800,lineHeight:1.3,letterSpacing:-1.2,opacity,transform:`translateY(${(1-enter)*40-exit*40}px)`}}>
   {g.words.map((w,j)=>{const key=j===g.key&&g.words.length>1,swipe=key?easeOut((t-w.start+.02)/Math.min(.3,Math.max(.14,w.end-w.start))):0,x=swipe*104-2,
     under=(1-smooth(t,w.end,w.end+.18))*easeOut((t-w.start+.02)/.16);
    return <span key={j} style={{position:"relative",display:"inline-block"}}>
     {key&&<span style={{position:"absolute",left:0,top:"10%",bottom:"6%",width:`${swipe*100}%`,background:C.yellow,borderRadius:8,transform:"skewX(-8deg)"}}/>}
     {!key&&<span style={{position:"absolute",left:10,right:10,bottom:2,height:6,borderRadius:3,background:C.lavender,transform:`scaleX(${under})`,transformOrigin:"left center",opacity:under}}/>}
     <span style={{position:"relative",display:"inline-block",padding:"0 10px",...(key?{backgroundImage:`linear-gradient(90deg, #120C1D ${x-2}%, ${C.ivory} ${x+2}%)`,WebkitBackgroundClip:"text",backgroundClip:"text",color:"transparent"}:{color:C.ivory})}}>{bare(w.text)}</span>
    </span>;})}
  </div>;})}</>;
}

// 04 — the callout terminal: one dark box with a lavender border stays while the voice speaks; each phrase is typed
// into it letter by letter with the voice, the previous phrase fades out, the cursor blinks.
function Terminal({gs,all,t}:{gs:Group[];all:Group[];t:number}){
 // The box bridges short pauses between phrases (<.6 s) and leaves only on a real pause or the end of the narration.
 let box=0;for(const g of all){const next=all[g.index+1],until=next&&next.start-g.end<.6?next.start:g.end;box=Math.max(box,smooth(t,g.start-.18,g.start+.04)*(1-smooth(t,until,until+.25)));}
 if(box<=.002)return null;
 return <div style={{position:"absolute",left:0,right:0,top:16,height:112,boxSizing:"border-box",background:"#120C1DF2",border:`3px solid ${mix(C.purpleStroke,C.lavender,.6)}`,borderRadius:12,opacity:box,transform:`scaleY(${.88+.12*box})`}}>
  {gs.map(g=>{const {exit,opacity}=captionEnvelope(t,g.start,g.end,true);if(!opacity)return null;
   const chars:{ch:string;at:number;w:number}[]=[];
   g.words.forEach((w,wi)=>{const text=w.text.toUpperCase(),span=Math.min(.32,Math.max(.1,w.end-w.start))*.9;if(wi)chars.push({ch:" ",at:w.start-.01,w:wi});
    [...text].forEach((ch,k)=>chars.push({ch,at:w.start+span*k/Math.max(1,text.length),w:wi}));});
   let cursor=-1;chars.forEach((c,i)=>{if(t>=c.at)cursor=i;});
   const caret=<span style={{position:"relative",display:"inline-block",width:0}}><span style={{position:"absolute",left:4,top:-28,width:15,height:34,background:C.lavender,opacity:(.5+.5*Math.cos(t*8))*(1-exit)}}/></span>;
   return <div key={g.index} style={{position:"absolute",inset:0,padding:"0 26px",display:"flex",alignItems:"center",opacity:1-exit,transform:`translateY(${-exit*16}px)`}}>
    <div style={{fontSize:34,fontWeight:800,letterSpacing:2,lineHeight:1.25,color:C.ivory}}>
     <span style={{color:C.lavender,marginRight:16}}>›</span>
     {cursor<0&&caret}
     {chars.map((c,i)=><React.Fragment key={i}><span style={{opacity:smooth(t,c.at,c.at+.06),color:mix(C.ivory,C.yellow,active(g.words[c.w],t))}}>{c.ch}</span>{i===cursor&&caret}</React.Fragment>)}
    </div>
   </div>;})}
 </div>;
}

// 05 — teleprompter: the new line rises, the previous one shrinks and dims above it, then leaves upward.
function Roll({gs,t}:{gs:Group[];t:number}){
 const p=gs.map(g=>smooth(t,g.start-.06,g.start+.24));
 // A long pause (or the end of the narration) clears both lines together.
 let latest=-1;gs.forEach((g,k)=>{if(g.start<=t)latest=k;});
 const cur=gs[latest],hold=cur&&(gs[latest+1]?.start??Infinity)-cur.end>.6?1-smooth(t,cur.end-.1,cur.end+.25):1;
 return <>{gs.map((g,n)=>{let pos=-(1-p[n]);for(let k=n+1;k<gs.length&&k<=n+3;k++)pos+=p[k];if(pos<=-1||pos>=2)return null;
  let y=0,s=1,o=1,col=0;
  if(pos<0){const u=pos+1;y=70*(1-u);o=u;}else if(pos<1){y=-58*pos;s=1-.34*pos;o=1-.55*pos;col=pos;}else{const u=pos-1;y=-58-44*u;s=.66;o=.45*(1-u);col=1;}
  const text=g.words.map(w=>bare(w.text)).join(" "),size=Math.min(50,850/Math.max(1,text.length*.56));
  return <div key={g.index} style={{position:"absolute",left:-20,right:-20,top:66,height:64,display:"flex",justifyContent:"center",alignItems:"center",gap:13,whiteSpace:"nowrap",fontSize:size,fontWeight:800,letterSpacing:-1.3,opacity:o*hold,transform:`translateY(${y}px) scale(${s})`}}>
   {g.words.map((w,j)=><span key={j} style={{color:mix(mix(C.ivory,C.yellow,pos>-.5&&pos<.5?active(w,t):0),C.muted,col)}}>{bare(w.text)}</span>)}
  </div>;})}</>;
}

// 06 — every word is its own chip that springs in on its timestamp; the spoken chip fills purple, the key word is yellow.
function Chips({gs,t}:{gs:Group[];t:number}){
 return <>{gs.map(g=>{const {exit,opacity}=captionEnvelope(t,g.start,g.end,true);if(!opacity)return null;
  return <div key={g.index} style={{...center,gap:"10px 10px",opacity:1-exit,transform:`translateY(${exit*-26}px) scale(${1-.06*exit})`}}>
   {g.words.map((w,j)=>{const q=clamp01((t-w.start+.05)/.3),a=active(w,t),key=j===g.key&&g.words.length>2;
    return <span key={j} style={{display:"inline-block",padding:"3px 18px 7px",borderRadius:18,fontSize:44,fontWeight:800,letterSpacing:-1,lineHeight:1.2,color:key?C.yellow:C.ivory,background:mix("#120C1D",C.purple,a),border:`3px solid ${key?C.yellow:mix(C.purpleStroke,C.lavender,a)}`,opacity:smooth(q,0,.4),transform:`translateY(${(1-easeOut(q))*24}px) scale(${.55+.45*easeBack(q)})`}}>{bare(w.text)}</span>;})}
  </div>;})}</>;
}

// 07 — short punchy groups in heavy uppercase with a black outline; the spoken word turns yellow and kicks up.
const OUTLINE=Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return `${(Math.cos(a)*6).toFixed(2)}px ${(Math.sin(a)*6).toFixed(2)}px 0 #000`;}).join(",")+",0 10px 0 #000,0 16px 26px #000a";
function Bold({gs,t}:{gs:Group[];t:number}){
 return <>{gs.map(g=>{const {enter,exit,opacity}=captionEnvelope(t,g.start,g.end,true);if(!opacity)return null;
  const pop=easeBack((t-g.start+.02)/.24),tilt=g.index%2?1.6:-1.6;
  return <div key={g.index} style={{...center,gap:"0 28px",fontSize:68,fontWeight:800,lineHeight:1.06,letterSpacing:-1,textTransform:"uppercase",opacity,transform:`rotate(${tilt}deg) scale(${(.7+.3*pop)*(1-.08*exit)}) translateY(${exit*-20}px)`}}>
   {g.words.map((w,j)=>{const a=active(w,t);return <span key={j} style={{display:"inline-block",color:mix(C.ivory,C.yellow,a),textShadow:OUTLINE,transform:`translateY(${-6*a}px) scale(${1+.1*a}) rotate(${-2.5*a}deg)`,transformOrigin:"center bottom"}}>{bare(w.text)}</span>;})}
  </div>;})}</>;
}

// 08 — focus pull: the phrase sharpens out of a blur, unspoken words wait faint, the spoken one glows.
function Focus({gs,t}:{gs:Group[];t:number}){
 return <>{gs.map(g=>{const {enter,exit,opacity}=captionEnvelope(t,g.start,g.end,true);if(!opacity)return null;
  return <div key={g.index} style={{...center,gap:"4px 14px",fontSize:50,fontWeight:700,lineHeight:1.25,letterSpacing:-1,opacity,filter:`blur(${(1-enter)*12+exit*9}px)`,transform:`scale(${1.08-.08*enter+.04*exit})`}}>
   {g.words.map((w,j)=>{const a=active(w,t),said=smooth(t,w.start-.06,w.start+.1);
    return <span key={j} style={{color:mix(C.lavender,C.ivory,a),opacity:.32+.68*said,textShadow:`0 0 ${4+18*a}px rgba(141,89,218,${.35+.6*a}), 0 0 ${2+6*a}px rgba(224,205,248,${.25+.5*a})`}}>{bare(w.text)}</span>;})}
  </div>;})}</>;
}

// 09 — ticker tape: the whole narration runs on one line and the spoken word glides into a fixed frame in the middle.
function Tape({alignment,t}:{alignment:SpeechAlignment[];t:number}){
 const words=React.useMemo(()=>alignment.flatMap(a=>a.words??[]),[alignment]);
 const row=React.useRef<HTMLDivElement>(null),[m,setM]=React.useState<{left:number;width:number}[]|null>(null),[handle]=React.useState(()=>delayRender("Measuring the caption tape"));
 React.useLayoutEffect(()=>{let done=false;const finish=()=>{if(!done){done=true;continueRender(handle);}};
  document.fonts.ready.then(()=>{const el=row.current;if(el)setM([...el.querySelectorAll<HTMLElement>("[data-w]")].map(s=>({left:s.offsetLeft,width:s.offsetWidth})));finish();});
  return finish;},[handle]);
 const first=words[0]?.start??0,lastEnd=alignment.at(-1)?.end??0;
 let i=0;for(let k=0;k<words.length;k++){if(words[k].start-.12<=t)i=k;else break;}
 const at=(k:number)=>m?.[k]?{c:m[k].left+m[k].width/2,w:m[k].width}:{c:0,w:0};
 const d=Math.min(.22,(words[i+1]?.start??Infinity)-words[i]?.start),u=i>0?easeInOut((t-(words[i]?.start-.12))/Math.max(.05,d)):1;
 const a=at(Math.max(0,i-1)),b=at(i),cx=a.c+(b.c-a.c)*u,fw=a.w+(b.w-a.w)*u;
 const vis=smooth(t,first-.3,first)*(1-smooth(t,lastEnd+.1,lastEnd+.5)),half=431;
 return <div style={{position:"absolute",inset:0,opacity:m?vis:0}}>
  <div style={{position:"absolute",left:half-fw/2-4,top:38,width:fw+8,height:70,borderRadius:14,background:"rgba(141,89,218,.28)",border:`3px solid ${C.purpleStroke}`,boxSizing:"border-box"}}/>
  <div style={{position:"absolute",inset:0,maskImage:"linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)"}}>
   <div ref={row} style={{position:"absolute",left:0,top:38,height:70,display:"flex",alignItems:"center",whiteSpace:"nowrap",fontSize:50,fontWeight:800,letterSpacing:-1.2,transform:`translateX(${half-cx}px)`}}>
    {words.map((w,k)=>{const said=smooth(t,w.start-.08,w.start+.08),a2=active(w,t);
     return <span key={k} data-w="" style={{display:"inline-block",padding:"0 14px",color:C.ivory,opacity:.34+.3*said+.36*a2}}>{bare(w.text)}</span>;})}
   </div>
  </div>
 </div>;
}

// 10 — sticker: each phrase on an ivory card with a purple offset shadow, slapped on with a slight tilt.
function Sticker({gs,t}:{gs:Group[];t:number}){
 return <>{gs.map(g=>{const {enter,exit,opacity}=captionEnvelope(t,g.start,g.end,true);if(!opacity)return null;
  const pop=easeBack((t-g.start+.02)/.26),tilt=g.index%2?2:-2;
  return <div key={g.index} style={{...center,opacity}}>
   <div style={{display:"inline-block",maxWidth:860,padding:"8px 24px 12px",borderRadius:14,background:C.ivory,boxShadow:`0 10px 0 ${C.purple}`,fontSize:46,fontWeight:800,lineHeight:1.18,letterSpacing:-1.2,color:"#120C1D",transform:`translateY(${exit*22}px) rotate(${tilt+(1-pop)*tilt*3}deg) scale(${(.82+.18*pop)*(1-.06*exit)})`}}>
    {g.words.map((w,j)=><React.Fragment key={j}>{j>0&&" "}<span style={{color:mix("#120C1D",C.purple,active(w,t))}}>{bare(w.text)}</span></React.Fragment>)}
   </div>
  </div>;})}</>;
}

export function StyledCaptions({styleId,alignment,t,lang,top}:{styleId:CaptionStyleId;alignment:SpeechAlignment[];t:number;lang?:string;top:number}){
 const gs=React.useMemo(()=>styleId==="bold"?groups(alignment,lang,3,16):groups(alignment,lang),[alignment,lang,styleId]);
 const visible=gs.filter(g=>t>=g.start-.4&&t<=g.end+.6);
 const body=styleId==="karaoke"?<Karaoke gs={visible} t={t}/>:styleId==="word"?<OneWord gs={visible} t={t}/>:styleId==="marker"?<Marker gs={visible} t={t}/>:styleId==="terminal"?<Terminal gs={visible} all={gs} t={t}/>
  :styleId==="roll"?<Roll gs={gs} t={t}/>:styleId==="chips"?<Chips gs={visible} t={t}/>:styleId==="bold"?<Bold gs={visible} t={t}/>:styleId==="focus"?<Focus gs={visible} t={t}/>
  :styleId==="tape"?<Tape alignment={alignment} t={t}/>:<Sticker gs={visible} t={t}/>;
 return <Box top={top} overflow={styleId==="bold"||styleId==="sticker"||styleId==="word"||styleId==="chips"?"visible":"hidden"}>{body}</Box>;
}
/**
 * Overlay v3 (user decision 2026-10-22): no header and no black bands — the picture runs under the captions. A soft,
 * static shade behind the caption row keeps them legible; it has no edge and fades out well before the frame sides.
 */
export function CaptionShade({top}:{top:number}){
 return <div style={{position:"absolute",left:-60,right:-60,top:top-120,height:385,pointerEvents:"none",
  background:"radial-gradient(ellipse 50% 50% at 50% 50%, rgba(4,3,10,.64) 0%, rgba(4,3,10,.46) 45%, rgba(4,3,10,0) 100%)"}}/>;
}
