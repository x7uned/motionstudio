import React from "react";
import brand from "../video-design/brand.json";
import {type IllustratedTimeline} from "../src/lib/illustrated";

// Prepared objects for the "how your phone knows your face in the dark" explainer (2026-10-22): a phone with an
// exploded TrueDepth module, a low-poly bust whose real 3D mesh catches a projected dot grid (the rows bend over the
// nose and cheekbones because the dots sit on the surface), a flat photo whose dots stay in straight rows, a depth
// map, a neural network that turns the map into a vector of bars, the Secure Enclave vault, attention (eyes) and the
// odds boards. Illustrations, not to scale and not Apple's real parts layout. No words, numbers or logos are drawn.
// Every value derives from the frame time and the keyed state; no randomness (hash() is a fixed function).
const C=brand.colors;
export type TimedObject=IllustratedTimeline["objects"][number];
export type FaceidArtProps={kind:string;o:TimedObject;t:number;a:number;xray:number;uid:string;overlay?:boolean};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number,a:number,b:number)=>{const x=clamp01((v-a)/(b-a));return x*x*(3-2*x);};
/** Rise over [a,b], fall over [c,d]. */
const win=(v:number,a:number,b:number,c:number,d:number)=>smooth(v,a,b)*(1-smooth(v,c,d));
const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const f1=(v:number)=>v.toFixed(1);
const pts=(p:number[][])=>p.map(([x,y])=>`${f1(x)},${f1(y)}`).join(" ");
const rgb=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const hex=(v:number[])=>"#"+v.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,"0")).join("");
const mix=(a:string,b:string,k:number)=>{const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v+(y[i]-v)*clamp01(k)));};
const D=Math.PI/180;
const INK="#120C1D";
const METAL={hi:"#7C7A92",top:"#666882",mid:"#4E4F62",lo:"#3A3B4C",dark:"#26273A",deep:"#1D1628"};
const GOLD={light:"#E8B64A",dark:"#9A7224"};
const GRN={light:C.green,dark:"#3F9A28"};
const rrect=(x:number,y:number,w:number,h:number,r:number)=>{const q=Math.min(r,w/2,h/2);
 return `M${f1(x+q)} ${f1(y)}H${f1(x+w-q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+w)} ${f1(y+q)}V${f1(y+h-q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+w-q)} ${f1(y+h)}H${f1(x+q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x)} ${f1(y+h-q)}V${f1(y+q)}A${f1(q)} ${f1(q)} 0 0 1 ${f1(x+q)} ${f1(y)}Z`;};

/* ───────────── Shared drawing helpers ───────────── */
function Shadow({w,y,k=1}:{w:number;y:number;k?:number}){return <ellipse cx={0} cy={y} rx={w*.5} ry={Math.min(16,Math.max(7,w*.034))} fill="#000" opacity={.45*k}/>;}
/** Quad (TL, TR, BR, BL) in two tones split along the TR–BL diagonal: light from the top left. */
function Quad({p,light,dark}:{p:number[][];light:string;dark:string}){
 return <><polygon points={pts([p[0],p[1],p[3]])} fill={light} stroke={light} strokeWidth={.7} strokeLinejoin="round"/><polygon points={pts([p[1],p[2],p[3]])} fill={dark} stroke={dark} strokeWidth={.7} strokeLinejoin="round"/></>;
}
/** Box: front rectangle with its top and right faces (depth runs up-right). */
function Box({x,y,w,h,d,front,top,side}:{x:number;y:number;w:number;h:number;d:[number,number];front:{light:string;dark:string};top:string;side:string}){
 return <>
  <polygon points={pts([[x,y],[x+w,y],[x+w+d[0],y+d[1]],[x+d[0],y+d[1]]])} fill={top} stroke={top} strokeWidth={.7}/>
  <polygon points={pts([[x+w,y],[x+w,y+h],[x+w+d[0],y+h+d[1]],[x+w+d[0],y+d[1]]])} fill={side} stroke={side} strokeWidth={.7}/>
  <Quad p={[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]} light={front.light} dark={front.dark}/>
 </>;
}
function Check({x,y,k,r=30}:{x:number;y:number;k:number;r?:number}){
 if(k<=.003)return null;
 return <g opacity={clamp01(k*1.6)} transform={`translate(${f1(x)},${f1(y)}) scale(${(.55+.45*k).toFixed(3)})`}>
  <circle r={r*1.3} fill={C.green} opacity={.2}/><circle r={r} fill={C.green}/>
  <path d={`M ${r} 0 A ${r} ${r} 0 0 1 ${-r*.7} ${r*.7}`} fill="none" stroke={GRN.dark} strokeWidth={r*.16} opacity={.6}/>
  <polyline points={pts([[-r*.44,r*.02],[-r*.1,r*.34],[r*.46,-r*.3]])} stroke={INK} strokeWidth={r*.21} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
 </g>;
}
function Cross({x,y,k,r=30}:{x:number;y:number;k:number;r?:number}){
 if(k<=.003)return null;
 return <g opacity={clamp01(k*1.6)} transform={`translate(${f1(x)},${f1(y)}) scale(${(.55+.45*k).toFixed(3)})`}>
  <circle r={r*1.3} fill={C.pink} opacity={.2}/><circle r={r} fill={C.pink}/>
  <path d={`M ${r} 0 A ${r} ${r} 0 0 1 ${-r*.7} ${r*.7}`} fill="none" stroke="#8E1C38" strokeWidth={r*.16} opacity={.6}/>
  <path d={`M ${-r*.36} ${-r*.36} L ${r*.36} ${r*.36} M ${r*.36} ${-r*.36} L ${-r*.36} ${r*.36}`} stroke={C.ivory} strokeWidth={r*.21} strokeLinecap="round"/>
 </g>;
}
/** Faceted gem used as a network node: four facets lit from the top left. */
function Gem({x,y,r,light,dark,k=1}:{x:number;y:number;r:number;light:string;dark:string;k?:number}){
 const p=[[x,y-r],[x+r,y],[x,y+r],[x-r,y]],c=[x,y];
 return <g opacity={k}>
  <polygon points={pts([p[3],p[0],c])} fill={mix(light,"#FFFFFF",.35)}/><polygon points={pts([p[0],p[1],c])} fill={light}/>
  <polygon points={pts([p[1],p[2],c])} fill={dark}/><polygon points={pts([p[2],p[3],c])} fill={mix(light,dark,.5)}/>
 </g>;
}
/** Closed or open padlock glyph (no letters): shackle lifts and swings open with u, body turns from base to green. */
function Lock({x,y,s,u,base=C.lavender,fail=0}:{x:number;y:number;s:number;u:number;base?:string;fail?:number}){
 const body=mix(mix(base,C.green,u),C.pink,fail),dark=mix(mix("#A68BD0",GRN.dark,u),"#8E1C38",fail);
 return <g transform={`translate(${f1(x)},${f1(y)}) scale(${s})`}>
  <g transform={`translate(0,${f1(-14*u)}) rotate(${f1(-28*u)},18,-6)`}><path d="M -18 -6 V -24 A 18 18 0 0 1 18 -24 V -6" stroke={METAL.hi} strokeWidth={8} fill="none" strokeLinecap="round"/></g>
  <Quad p={[[-28,-8],[28,-8],[28,30],[-28,30]]} light={body} dark={dark}/>
  <circle cx={0} cy={8} r={5} fill={INK}/><rect x={-2} y={8} width={4} height={11} fill={INK}/>
 </g>;
}

/* ───────────── 3D bust: a real low-poly mesh, yawed and pitched, painter-sorted ───────────── */
export type V3=[number,number,number];
const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot3=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const unit=(v:V3):V3=>{const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l];};
export type HeadParams={a:number;b:number;c:number;nose:number;noseW:number;cheek:number;cheekY:number;brow:number;chin:number;lips:number;
 eyeX:number;eyeY:number;socket:number;skin:[string,string];hair:[string,string];hairDrop:number;lip:string;iris:string};
/** Person A (rows 1 and 3) and person B (rows 2): different proportions, nose, hair and skin. */
export const HEADS:HeadParams[]=[
 {a:118,b:150,c:122,nose:34,noseW:12,cheek:12,cheekY:12,brow:10,chin:11,lips:8,eyeX:42,eyeY:-34,socket:15,skin:["#E8C9A8","#8E6450"],hair:["#5A3A8E","#1D1235"],hairDrop:0,lip:"#B65C62",iris:"#4B2C80"},
 {a:126,b:144,c:118,nose:25,noseW:17,cheek:17,cheekY:4,brow:7,chin:7,lips:12,eyeX:45,eyeY:-28,socket:11,skin:["#B98762","#5E3B28"],hair:["#3A2E52","#0E0A16"],hairDrop:14,lip:"#8E4A44",iris:"#2A1A12"},
];
/** Face height above the head's centre plane: an ellipsoid plus nose, sockets, brow, cheekbones, lips and chin. */
export function faceHeight(P:HeadParams){
 return (x:number,y:number)=>{
  const e=1-(x/P.a)**2-(y/P.b)**2;if(e<=0)return 0;
  const base=P.c*Math.sqrt(e),w=smooth(Math.sqrt(e),0,.55),ax=Math.abs(x),ny=clamp01((y+45)/85);
  const noseH=y<-48||y>58?0:(y<=40?lerp(.22,1,ny*ny):1-smooth(y,40,58))*P.nose,sig=P.noseW*(.55+.45*ny);
  let f=noseH*Math.exp(-((x/sig)**2));
  f+=.3*P.nose*Math.exp(-(((ax-P.noseW*1.15)/11)**2)-((y-36)/10)**2);
  f-=P.socket*Math.exp(-(((ax-P.eyeX)/30)**2)-((y-P.eyeY)/18)**2);
  f+=P.brow*Math.exp(-(((y-(P.eyeY-27))/13)**2))*Math.exp(-((x/(P.eyeX*1.9))**4));
  f+=P.cheek*Math.exp(-(((ax-P.eyeX*1.45)/30)**2)-((y-P.cheekY)/26)**2);
  f+=P.lips*Math.exp(-((x/34)**4)-((y-80)/10)**2);
  f+=P.chin*Math.exp(-((x/36)**2)-((y-P.b*.83)/20)**2);
  return base+f*w;
 };
}
type Part="skin"|"hair"|"beard"|"shirt"|"ear"|"neck";
type Tri={v:[number,number,number];part:Part;n:V3;h:number};
export type Mesh={P:HeadParams;verts:V3[];tris:Tri[];H:(x:number,y:number)=>number;dots:{u:number;v:number;z:number;n:V3;order:number;row:number}[];beard:boolean};
const NT=36,NR=14,NB=5;
/** Ring radius: denser toward the rim, so the face meets the back shell without a visible plate edge. */
const ringRho=(i:number)=>1-Math.pow(1-i/NR,1.35);
const meshCache=new Map<string,Mesh>();
/** The bust: front heightfield on an elliptical polar grid (dense at the nose), plain back shell, ears, neck and
 *  shoulders. Built once per person. */
export function headMesh(person:number,beard=false):Mesh{
 const key=`${person}:${beard}`,hit=meshCache.get(key);if(hit)return hit;
 const P=HEADS[person],H=faceHeight(P),verts:V3[]=[],tris:Tri[]=[];
 const hairline=(x:number)=>-P.b*.56+P.b*.42*(x/P.a)**2+P.hairDrop;
 const add=(i:number,j:number,k:number,part:Part,out:V3)=>{const A=verts[i],B=verts[j],Cc=verts[k];let n=unit(cross(sub(B,A),sub(Cc,A)));
  const c:V3=[(A[0]+B[0]+Cc[0])/3,(A[1]+B[1]+Cc[1])/3,(A[2]+B[2]+Cc[2])/3];if(dot3(n,out)<0)n=[-n[0],-n[1],-n[2]];
  tris.push({v:[i,j,k],part,n,h:c[2]});};
 const headPart=(i:number,j:number,k:number,front:boolean)=>{const A=verts[i],B=verts[j],Cc=verts[k],cx=(A[0]+B[0]+Cc[0])/3,cy=(A[1]+B[1]+Cc[1])/3,cz=(A[2]+B[2]+Cc[2])/3;
  const out:V3=[cx/P.a**2,cy/P.b**2,cz/P.c**2];
  let part:Part=front?(cy<hairline(cx)?"hair":"skin"):(cy<P.b*.42?"hair":"skin");
  if(beard&&front&&part==="skin"&&cy>22&&!(Math.abs(cx)<26&&Math.abs(cy-80)<10)&&!(Math.abs(cx)<24&&cy<54))part="beard";
  add(i,j,k,part,out);};
 verts.push([0,0,H(0,0)]);
 const ring:number[][]=[];
 for(let i=1;i<=NR;i++){const rho=ringRho(i),row:number[]=[];for(let j=0;j<NT;j++){const th=j/NT*2*Math.PI,x=P.a*rho*Math.cos(th),y=P.b*rho*Math.sin(th);row.push(verts.length);verts.push([x,y,i===NR?0:H(x,y)]);}ring.push(row);}
 for(let j=0;j<NT;j++){const k=(j+1)%NT;headPart(0,ring[0][j],ring[0][k],true);}
 for(let i=0;i<NR-1;i++)for(let j=0;j<NT;j++){const k=(j+1)%NT;headPart(ring[i][j],ring[i][k],ring[i+1][k],true);headPart(ring[i][j],ring[i+1][k],ring[i+1][j],true);}
 const back:number[][]=[ring[NR-1]];
 for(let k=1;k<NB;k++){const be=k/NB*Math.PI/2,rho=Math.cos(be),z=-P.c*Math.sin(be),row:number[]=[];for(let j=0;j<NT;j++){const th=j/NT*2*Math.PI;row.push(verts.length);verts.push([P.a*rho*Math.cos(th),P.b*rho*Math.sin(th),z]);}back.push(row);}
 for(let i=0;i<back.length-1;i++)for(let j=0;j<NT;j++){const k=(j+1)%NT;headPart(back[i][j],back[i][k],back[i+1][k],false);headPart(back[i][j],back[i+1][k],back[i+1][j],false);}
 const pole=verts.length;verts.push([0,0,-P.c]);
 for(let j=0;j<NT;j++){const k=(j+1)%NT;headPart(back.at(-1)![j],back.at(-1)![k],pole,false);}
 // Ears: a small fan on each side, facing sideways and slightly back.
 for(const s of [-1,1]){const e=[[P.a-7,-38,-4],[P.a+8,-34,-16],[P.a+12,-6,-24],[P.a+8,22,-22],[P.a-5,30,-8]].map(([x,y,z])=>{verts.push([s*x,y,z]);return verts.length-1;});
  for(let k=1;k<e.length-1;k++)add(e[0],e[k],e[k+1],"ear",[s,0,-.2]);}
 // Neck and shoulders: faceted rings around the vertical axis (behind the jaw).
 const band=(y0:number,rx0:number,rz0:number,y1:number,rx1:number,rz1:number,n:number,part:Part,zc=0)=>{const r0:number[]=[],r1:number[]=[];
  for(let j=0;j<n;j++){const th=(j+.5)/n*2*Math.PI;r0.push(verts.length);verts.push([rx0*Math.sin(th),y0,zc+rz0*Math.cos(th)]);r1.push(verts.length);verts.push([rx1*Math.sin(th),y1,zc+rz1*Math.cos(th)]);}
  for(let j=0;j<n;j++){const k=(j+1)%n,mid=(j+.5+.5)/n*2*Math.PI,out:V3=[Math.sin(mid),y1<y0?1:(rx1-rx0)/(y1-y0)*.6,Math.cos(mid)];add(r0[j],r0[k],r1[k],part,out);add(r0[j],r1[k],r1[j],part,out);}};
 band(P.b*.55,50,44,P.b+56,58,50,10,"neck",-14);
 band(P.b+30,80,50,P.b+74,178,72,12,"shirt",-10);
 band(P.b+74,178,72,P.b+150,190,80,12,"shirt",-10);
 // Projected dots: a regular grid in the projector's view, kept on the face (not the hair, not the rim).
 const dots:Mesh["dots"]=[];let row=0;
 for(let v=-P.b*.9;v<=P.b*.92;v+=11.5,row++)for(let u=-P.a*.92;u<=P.a*.92;u+=11.5){
  const r=(u/P.a)**2+(v/P.b)**2;if(r>.84||v<hairline(u)+8)continue;
  const z=H(u,v),dx=(H(u+2,v)-H(u-2,v))/4,dy=(H(u,v+2)-H(u,v-2))/4;
  dots.push({u,v,z:z+1.6,n:unit([-dx,-dy,1]),order:Math.hypot(u/P.a,v/P.b),row});
 }
 const m={P,verts,tris,H,dots,beard};meshCache.set(key,m);return m;
}
/** Yaw (about the vertical axis) then pitch (camera slightly above, so the top tilts toward the viewer). */
export function project(v:V3,yaw:number,pitch:number):V3{
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const x1=v[0]*cy+v[2]*sy,z1=-v[0]*sy+v[2]*cy;
 return [x1,v[1]*cp+z1*sp,-v[1]*sp+z1*cp];
}
const LIGHT=unit([-.5,-.65,.58]),IR_LIGHT=unit([.5,-.22,.84]);
/** Depth-map colour ramp (near → far): ivory, yellow, pink, purple, deep indigo. */
const RAMP:[number,string][]=[[-.2,"#120C1D"],[.02,"#1B1240"],[.36,"#3B2470"],[.6,C.purple],[.8,C.pink],[.98,C.yellow],[1.14,C.ivory]];
export function depthColor(h:number){for(let i=1;i<RAMP.length;i++)if(h<=RAMP[i][0]){const [a0,c0]=RAMP[i-1],[a1,c1]=RAMP[i];return mix(c0,c1,(h-a0)/(a1-a0));}return C.ivory;}
const PART_LIT:Record<Part,(m:Mesh)=>[string,string]>={skin:m=>m.P.skin,ear:m=>m.P.skin,neck:m=>[m.P.skin[0],m.P.skin[1]],hair:m=>m.P.hair,beard:m=>[mix(m.P.hair[0],m.P.skin[0],.35),m.P.hair[1]],shirt:()=>[C.purple,"#3E2470"]};
/** Look of the bust: dark (0) → infrared (ir) → depth map (dep) → measured wireframe (wire); lit = photo-like daylight. */
type Look={dark:number;ir:number;dep:number;wire:number;lit?:boolean};
function triColor(m:Mesh,tr:Tri,n:V3,look:Look){
 const [l,d]=PART_LIT[tr.part](m),lam=clamp01(.2+.85*Math.max(0,dot3(n,LIGHT)));
 let c=mix(d,l,lam);
 if(!look.lit){const rim=Math.pow(Math.max(0,n[0]),3)*.5;c=mix(mix(c,"#07050B",.86*look.dark),C.lavender,rim*look.dark);}
 if(look.ir>0){const v=(.1+.9*Math.max(0,dot3(n,IR_LIGHT)))*(tr.part==="hair"?.42:tr.part==="beard"?.55:tr.part==="shirt"?.7:1);c=mix(c,mix("#29243A","#EEEAF7",v),look.ir);}
 if(look.dep>0){const h=tr.part==="shirt"||tr.part==="neck"?-.1:tr.part==="ear"?tr.h/m.P.c*.5-.05:tr.h/m.P.c;c=mix(c,mix(depthColor(h),"#000000",.18*(1-lam)),look.dep);}
 return c;
}
export function bustYaw(t:number){return (22+7*Math.sin(t*.45))*D;}
const PITCH=9*D;
function BustMesh({m,yaw,pitch,look,uid}:{m:Mesh;yaw:number;pitch:number;look:Look;uid:string}){
 const pv=m.verts.map(v=>project(v,yaw,pitch));
 const vis=m.tris.map(tr=>{const n=project(tr.n,yaw,pitch);return {tr,n,z:(pv[tr.v[0]][2]+pv[tr.v[1]][2]+pv[tr.v[2]][2])/3};}).filter(x=>x.n[2]>-.02).sort((a,b)=>a.z-b.z);
 const wire=look.wire>.003?vis.filter(x=>x.tr.part!=="shirt"&&x.tr.part!=="neck").map(({tr})=>`M${f1(pv[tr.v[0]][0])} ${f1(pv[tr.v[0]][1])}L${f1(pv[tr.v[1]][0])} ${f1(pv[tr.v[1]][1])}L${f1(pv[tr.v[2]][0])} ${f1(pv[tr.v[2]][1])}Z`).join(""):"";
 return <g strokeLinejoin="round">
  {vis.map(({tr,n},i)=>{const c=triColor(m,tr,n,look);return <polygon key={i} points={pts(tr.v.map(k=>[pv[k][0],pv[k][1]]))} fill={c} stroke={c} strokeWidth={.8}/>;})}
  {wire&&<path d={wire} fill="none" stroke={C.ivory} strokeWidth={.9} opacity={.55*look.wire}/>}
 </g>;
}
/** Eyes, brows, lips and (rows 3) glasses: surface details that follow the mesh. */
function FaceDetails({m,yaw,pitch,look,gaze=0,glasses=false}:{m:Mesh;yaw:number;pitch:number;look:Look;gaze?:number;glasses?:boolean}){
 const P=m.P,H=m.H,on=1-look.dep,P3=(x:number,y:number,dz=0)=>project([x,y,H(x,y)+dz],yaw,pitch);
 if(on<=.003)return null;
 const dk=(c:string)=>look.lit?c:mix(c,"#07050B",.82*look.dark),sclera=mix(dk("#F5F1E8"),"#B9B4C8",look.ir),iris=mix(dk(P.iris),"#151020",look.ir);
 const brow=mix(P.hair[1],"#3A3550",look.ir);
 return <g opacity={on}>
  {[-1,1].map(s=>{const ex=s*P.eyeX,ey=P.eyeY+2,up=Array.from({length:9},(_,i)=>{const k=i/8,x=ex-17+34*k;return P3(x,ey-7*Math.sin(Math.PI*k),3);}),lo=Array.from({length:9},(_,i)=>{const k=1-i/8,x=ex-17+34*k;return P3(x,ey+5*Math.sin(Math.PI*k),3);});
   const ic=P3(ex+gaze*5,ey,5),face=project(unit([s*.25,0,1]),yaw,pitch)[2];
   const br=Array.from({length:7},(_,i)=>{const k=i/6;return P3(ex-20+42*k+s*0,ey-25-4*Math.sin(Math.PI*k),2);});
   return <g key={s}>
    <polygon points={pts([...up,...lo])} fill={sclera}/>
    <ellipse cx={ic[0]} cy={ic[1]} rx={6.8*Math.max(.35,face)} ry={6.8} fill={iris}/>
    <ellipse cx={ic[0]} cy={ic[1]} rx={3*Math.max(.35,face)} ry={3} fill="#07050B"/>
    <circle cx={ic[0]-2} cy={ic[1]-2.2} r={1.6} fill="#FFFFFF" opacity={.8*(1-look.dark*.6)}/>
    <polyline points={pts(up)} fill="none" stroke={mix(P.skin[1],"#07050B",.4)} strokeWidth={2.6} strokeLinecap="round"/>
    <polyline points={pts(br)} fill="none" stroke={dk(brow)} strokeWidth={6} strokeLinecap="round" opacity={.9}/>
   </g>;})}
  <polyline points={pts(Array.from({length:9},(_,i)=>{const x=-24+48*i/8;return P3(x,81+2*(x/24)**2,1.5);}))} fill="none" stroke={mix(dk(P.lip),"#29243A",look.ir)} strokeWidth={4} strokeLinecap="round"/>
  {glasses&&<g fill="none" strokeLinecap="round" strokeLinejoin="round">
   {[-1,1].map(s=>{const ex=s*P.eyeX,ey=P.eyeY+2,ring=Array.from({length:20},(_,i)=>{const an=i/20*2*Math.PI,cs=Math.cos(an),sn=Math.sin(an),x=ex+27*Math.sign(cs)*Math.pow(Math.abs(cs),.6),y=ey+18*Math.sign(sn)*Math.pow(Math.abs(sn),.6);return project([x,y,H(ex,ey)+14],yaw,pitch);});
    const hinge=project([s*(P.eyeX+28),ey-6,H(s*(P.eyeX+20),ey)+8],yaw,pitch),ear=project([s*(P.a-2),ey-2,-18],yaw,pitch);
    return <g key={s}><polygon points={pts(ring)} fill={C.lavender} fillOpacity={.12} stroke={mix("#2A2238",METAL.hi,look.ir)} strokeWidth={4.5}/><line x1={hinge[0]} y1={hinge[1]} x2={ear[0]} y2={ear[1]} stroke={mix("#2A2238",METAL.hi,look.ir)} strokeWidth={4}/></g>;})}
   {(()=>{const a=project([-P.eyeX+26,P.eyeY-2,H(-12,P.eyeY)+12],yaw,pitch),b=project([0,P.eyeY-6,H(0,P.eyeY-6)+10],yaw,pitch),c=project([P.eyeX-26,P.eyeY-2,H(12,P.eyeY)+12],yaw,pitch);return <polyline points={pts([a,b,c])} stroke={mix("#2A2238",METAL.hi,look.ir)} strokeWidth={4}/>;})()}
  </g>}
 </g>;
}
/** Dots of the projector: fly in as a flat sheet (fly), then land on the surface (land) — rows bend over the face. */
export function dotPoint(d:{u:number;v:number;z:number;order:number},P:HeadParams,fly:number,land:number,flat=false):V3{
 const flatZ=P.c+44,src:V3=[0,-30,P.c+240];
 const fi=smooth(clamp01(fly*1.4-.4*d.order),0,1),li=clamp01(land*1.45-.45*clamp01((d.v+P.b)/(2*P.b)));
 const z=flat?flatZ:lerp(flatZ,d.z,smooth(li,0,1));
 return [lerp(src[0],d.u,fi),lerp(src[1],d.v,fi),lerp(src[2],z,fi)];
}
const easeOut=(v:number)=>{const t=clamp01(v);return 1-Math.pow(1-t,3);};
/** face-scan states. */
export function faceState(a:number){
 return {dark:1-smooth(a,.06,.2),ir:smooth(a,.06,.2),dots:smooth(a,.2,.3)*(1-.55*smooth(a,.72,.86)),fly:smooth(a,.21,.4),land:smooth(a,.44,.6),dep:smooth(a,.68,.82),wire:smooth(a,.86,1),flood:smooth(a,.06,.2)*(1-smooth(a,.7,.86)),
  guides:smooth(a,.34,.42)*(1-smooth(a,.72,.84))};
}
/** Every third row of dots (sorted left to right) for the yellow guide lines: straight on the sheet, curved on the face. */
const guideCache=new Map<Mesh,Mesh["dots"][]>();
function GUIDE_ROWS(m:Mesh){let g=guideCache.get(m);if(!g){const by=new Map<number,Mesh["dots"]>();for(const d of m.dots)if(d.row%3===1)by.set(d.row,[...(by.get(d.row)??[]),d]);
 g=[...by.values()].map(r=>r.slice().sort((x,y)=>x.u-y.u)).filter(r=>r.length>3);guideCache.set(m,g);}return g;}
const HY=-160;
function FaceScan({o,t,a,xray,uid,overlay}:{o:TimedObject;t:number;a:number;xray:number;uid:string;overlay?:boolean}){
 const rows=Math.max(1,Math.min(3,Math.round(o.rows||1))),m=headMesh(rows===2?1:0,rows===3),P=m.P,v=faceState(a),yaw=bustYaw(t+(rows===2?2.3:0));
 if(overlay)return xray>.01?<g transform={`translate(0,${HY})`}><Profile m={m} xray={xray} flat={false}/></g>:null;
 const look:Look={dark:v.dark,ir:v.ir,dep:v.dep,wire:v.wire};
 return <g>
  <defs><radialGradient id={`fl-${uid}`}><stop offset="0" stopColor={C.lavender} stopOpacity=".5"/><stop offset=".6" stopColor={C.purple} stopOpacity=".16"/><stop offset="1" stopColor={C.purple} stopOpacity="0"/></radialGradient></defs>
  <Shadow w={440} y={288}/>
  <Turntable y={P.b+HY+150}/>
  {v.flood>.003&&<ellipse cx={30} cy={HY+10} rx={250} ry={290} fill={`url(#fl-${uid})`} opacity={v.flood*(.85+.15*Math.sin(t*2.1))}/>}
  <g transform={`translate(0,${HY})`}>
   <BustMesh m={m} yaw={yaw} pitch={PITCH} look={look} uid={uid}/>
   <FaceDetails m={m} yaw={yaw} pitch={PITCH} look={look} glasses={rows===3}/>
   {v.guides>.003&&<g opacity={v.guides}>{GUIDE_ROWS(m).map((row,k)=><polyline key={k} points={pts(row.map(d=>project(dotPoint(d,P,v.fly,v.land),yaw,PITCH)))} fill="none" stroke={C.yellow} strokeWidth={2.5} strokeOpacity={.8} strokeLinejoin="round"/>)}</g>}
   {v.dots>.003&&<g>{m.dots.map((d,i)=>{const p=project(dotPoint(d,P,v.fly,v.land),yaw,PITCH),n=project(d.n,yaw,PITCH),face=lerp(1,smooth(n[2],.05,.35),v.land);
    const k=v.dots*face*clamp01(v.fly*1.4-.4*d.order+.25);if(k<=.01)return null;
    const c=mix(C.ivory,C.lavender,.35+.3*Math.sin(t*3+d.row*.7));return <circle key={i} cx={f1(p[0])} cy={f1(p[1])} r={2.5} fill={c} opacity={k}/>;})}</g>}
  </g>
 </g>;
}
function Turntable({y}:{y:number}){
 return <g>
  <path d={`M -214 ${y} A 214 30 0 0 0 214 ${y} V ${y+34} A 214 30 0 0 1 -214 ${y+34} Z`} fill={METAL.lo}/>
  <path d={`M -214 ${y} A 214 30 0 0 0 0 ${y+30} V ${y+64} A 214 30 0 0 1 -214 ${y+34} Z`} fill={METAL.mid} opacity={.7}/>
  <ellipse cx={0} cy={y} rx={214} ry={30} fill={METAL.top}/>
  <ellipse cx={0} cy={y} rx={214} ry={30} fill="none" stroke={C.lavender} strokeOpacity={.35} strokeWidth={3}/>
  <ellipse cx={0} cy={y} rx={160} ry={21} fill="none" stroke={METAL.hi} strokeOpacity={.4} strokeWidth={2}/>
 </g>;
}
/** X-ray depth gauge beside the head: the profile along the middle of the face (the nose sticks out) or a flat line. */
function Profile({m,xray,flat,x0=170}:{m:Mesh;xray:number;flat:boolean;x0?:number}){
 const P=m.P,ys=Array.from({length:41},(_,i)=>-P.b+i*P.b*2/40),sc=.55;
 const line=ys.map(y=>[x0+(flat?0:m.H(0,y))*sc,y]);
 return <g opacity={xray}>
  <rect x={x0-10} y={-P.b-14} width={P.c*sc+34} height={2*P.b+28} rx={10} fill="#0A0D1F" stroke={C.lavender} strokeOpacity={.5} strokeWidth={2}/>
  {Array.from({length:6},(_,i)=><line key={i} x1={x0+i*P.c*sc/5} y1={-P.b-6} x2={x0+i*P.c*sc/5} y2={P.b+6} stroke={C.lavender} strokeOpacity={.18} strokeWidth={1.5}/>)}
  <line x1={x0} y1={-P.b} x2={x0} y2={P.b} stroke={C.ivory} strokeOpacity={.6} strokeWidth={2}/>
  <polyline points={pts(line)} fill="none" stroke={C.yellow} strokeWidth={4} strokeLinejoin="round"/>
  {!flat&&(()=>{const tip=line.reduce((b,p)=>p[0]>b[0]?p:b,line[0]);return <circle cx={tip[0]} cy={tip[1]} r={7} fill={C.yellow}/>;})()}
 </g>;
}

/* ───────────── Flat photo on an easel ───────────── */
export function photoState(a:number){return {ir:smooth(a,.1,.28),dots:smooth(a,.38,.46),fly:smooth(a,.4,.55),land:smooth(a,.56,.7),guides:smooth(a,.62,.74)*(1-smooth(a,.9,1)*.4),reject:smooth(a,.84,1)};}
const PH={x:-130,y:-226,w:260,h:330};
function FlatPhoto({t,a,xray,uid,overlay}:{t:number;a:number;xray:number;uid:string;overlay?:boolean}){
 const v=photoState(a),m=headMesh(0),clip=`ph-${uid}`;
 if(overlay)return xray>.01?<g transform="translate(-8,-60) scale(.9)"><Profile m={m} xray={xray} flat x0={190}/></g>:null;
 const grid:number[][]=[];for(let r=0;r<22;r++)for(let c=0;c<17;c++)grid.push([PH.x+14+c*14.5,PH.y+14+r*14.5,r,c]);
 const src=[150,-300],frame=mix(METAL.deep,C.pink,v.reject*.6);
 return <g>
  <defs><clipPath id={clip}><rect x={PH.x} y={PH.y} width={PH.w} height={PH.h}/></clipPath>
   <linearGradient id={`pb-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={mix("#D9CCEF","#8F8AA0",v.ir)}/><stop offset="1" stopColor={mix("#A893D3","#5D5870",v.ir)}/></linearGradient></defs>
  <Shadow w={330} y={268}/>
  {[[-120,262],[120,262]].map(([x,y],i)=><line key={i} x1={x*.4} y1={60} x2={x} y2={y} stroke={METAL.lo} strokeWidth={14} strokeLinecap="round"/>)}
  <line x1={0} y1={40} x2={0} y2={250} stroke={METAL.dark} strokeWidth={12} strokeLinecap="round"/>
  <rect x={-150} y={100} width={300} height={16} rx={6} fill={METAL.mid}/>
  {v.reject>.003&&<path d={rrect(PH.x-34,PH.y-34,PH.w+68,PH.h+68,22)} fill="none" stroke={C.pink} strokeWidth={14} opacity={.3*v.reject}/>}
  <Box x={PH.x-20} y={PH.y-20} w={PH.w+40} h={PH.h+40} d={[14,-11]} front={{light:mix("#3A2C55",C.pink,v.reject*.4),dark:frame}} top={mix(METAL.top,C.pink,v.reject*.4)} side={METAL.dark}/>
  <rect x={PH.x-8} y={PH.y-8} width={PH.w+16} height={PH.h+16} fill={mix(C.ivory,"#BDB8CC",v.ir)}/>
  <g clipPath={`url(#${clip})`}>
   <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} fill={`url(#pb-${uid})`}/>
   <g transform="translate(0,-48) scale(.78)">
    <BustMesh m={m} yaw={0} pitch={0} look={{dark:0,ir:v.ir,dep:0,wire:0,lit:true}} uid={uid}/>
    <FaceDetails m={m} yaw={0} pitch={0} look={{dark:0,ir:v.ir,dep:0,wire:0,lit:true}}/>
   </g>
   <rect x={PH.x} y={PH.y} width={PH.w} height={PH.h} fill="#1B1240" opacity={.55*v.reject}/>
   <polygon points={pts([[PH.x+PH.w*.6,PH.y],[PH.x+PH.w,PH.y],[PH.x+PH.w,PH.y+PH.h*.3]])} fill="#FFFFFF" opacity={.12*(1-v.ir)}/>
  </g>
  {v.guides>.003&&<g opacity={v.guides}>{Array.from({length:7},(_,k)=>{const y=PH.y+14+(1+k*3)*14.5;return <line key={k} x1={PH.x+4} y1={y} x2={PH.x+PH.w-4} y2={y} stroke={C.yellow} strokeWidth={2.5} strokeOpacity={.75}/>;})}</g>}
  {v.dots>.003&&<g>{grid.map(([x,y,r,c],i)=>{const ord=Math.hypot((x-PH.x-PH.w/2)/PH.w,(y-PH.y-PH.h/2)/PH.h),fi=easeOut(clamp01(v.fly*1.3-.3*ord)),k=v.dots*clamp01(v.fly*1.3-.3*ord+.25);if(k<=.01)return null;
   const px=lerp(src[0],x,fi),py=lerp(src[1],y,fi);return <circle key={i} cx={f1(px)} cy={f1(py)} r={2.5} fill={mix(C.ivory,C.lavender,.35+.3*Math.sin(t*3+r*.7))} opacity={k*(1-.35*v.reject)}/>;})}</g>}
  <Cross x={PH.x+PH.w+6} y={PH.y-6} k={v.reject}/>
 </g>;
}

/* ───────────── Phone with an exploded TrueDepth module ───────────── */
export function phoneState(a:number,rows=1){
 return {explode:smooth(a,.1,.3)*(1-smooth(a,.86,1)),flood:smooth(a,.33,.47),dots:smooth(a,.53,.67),cam:smooth(a,.7,.82),
  unlock:rows===2?0:smooth(a,.88,1),fail:rows===2?smooth(a,.88,1):0,shake:rows===2?.8*Math.sin(Math.PI*smooth(a,.78,1)):0,scan:smooth(a,.33,.47)*(1-smooth(a,.9,1))};
}
const BODY={x:-130,y:-232,w:260,h:482},BAR_Y=-318;
/** Component x positions in the magnified bar and in the notch (illustrative layout, not Apple's exact order). */
const PARTS={ir:{bar:-118,notch:-44},flood:{bar:-38,notch:-27},proj:{bar:118,notch:44}};
function Phone({o,t,a,uid}:{o:TimedObject;t:number;a:number;uid:string}){
 const rows=o.rows===2?2:1,v=phoneState(a,rows),e=smooth(v.explode,0,1),scr=`scr-${uid}`;
 const at=(k:keyof typeof PARTS)=>[lerp(PARTS[k].notch,PARTS[k].bar,e),lerp(-219,BAR_Y,e)];
 const s=lerp(.3,1,e),fl=at("flood"),pr=at("proj"),ir=at("ir"),shake=v.shake*Math.sin(t*38)*9;
 const gen=(k:number)=>{const ph=((t*.62+k*.5)%1+1)%1;return {ph,sp:5+26*ph};};
 return <g>
  <defs>
   <clipPath id={scr}><path d={rrect(BODY.x+11,BODY.y+11,BODY.w-22,BODY.h-22,34)}/></clipPath>
   <radialGradient id={`ifl-${uid}`}><stop offset="0" stopColor={C.lavender} stopOpacity=".55"/><stop offset=".5" stopColor={C.purple} stopOpacity=".18"/><stop offset="1" stopColor={C.purple} stopOpacity="0"/></radialGradient>
   <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={mix("#120C24","#5B3A94",v.unlock)}/><stop offset="1" stopColor={mix("#1D1236",mix("#2A1650",C.purple,.5),v.unlock)}/></linearGradient>
  </defs>
  <Shadow w={300} y={326}/>
  <polygon points={pts([[-120,262],[120,262],[134,318],[-134,318]])} fill={METAL.mid}/>
  <polygon points={pts([[-120,262],[0,262],[-20,318],[-134,318]])} fill={METAL.top} opacity={.6}/>
  <polygon points={pts([[-106,250],[106,250],[120,262],[-120,262]])} fill={METAL.hi}/>
  <rect x={-134} y={316} width={268} height={6} rx={3} fill={METAL.dark}/>
  <g transform={`translate(${f1(shake)},0)`}>
   <path d={rrect(BODY.x+12,BODY.y-10,BODY.w,BODY.h,46)} fill={METAL.dark}/>
   <path d={rrect(BODY.x,BODY.y,BODY.w,BODY.h,46)} fill={METAL.mid}/>
   <path d={rrect(BODY.x,BODY.y,BODY.w,BODY.h,46)} fill="none" stroke={C.purpleStroke} strokeOpacity={.55} strokeWidth={3}/>
   {[[-136,-120,44],[-136,-60,64]].map(([x,y,h],i)=><rect key={i} x={x} y={y} width={6} height={h} rx={3} fill="#5E5F74"/>)}
   <rect x={BODY.x+BODY.w-1} y={-100} width={7} height={80} rx={3} fill="#2E2F42"/>
   <path d={rrect(BODY.x+11,BODY.y+11,BODY.w-22,BODY.h-22,34)} fill="#07050B"/>
   <g clipPath={`url(#${scr})`}>
    <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} fill={`url(#sg-${uid})`}/>
    <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} fill={C.pink} opacity={.18*v.fail}/>
    {[[-64,-128,128,22],[-40,-96,80,10]].map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} rx={h/2} fill={C.lavender} opacity={.35*(1-v.unlock)}/>)}
    {Array.from({length:20},(_,i)=>{const c=i%4,r=Math.floor(i/4),k=smooth(v.unlock,.1+.03*i,.5+.03*i);if(k<=.003)return null;const x=-92+c*50,y=-150+r*58,col=[C.yellow,C.lavender,C.green,C.pink,C.purpleStroke][(i*3)%5];
     return <g key={i} opacity={k} transform={`translate(${x+17},${y+17}) scale(${(.6+.4*k).toFixed(3)}) translate(${-17},${-17})`}><path d={rrect(0,0,34,34,9)} fill={col}/><path d={rrect(0,0,34,14,9)} fill="#FFFFFF" opacity={.18}/></g>;})}
    <polygon points={pts([[BODY.x+BODY.w*.5,BODY.y],[BODY.x+BODY.w,BODY.y],[BODY.x+BODY.w,BODY.y+BODY.h*.25]])} fill="#FFFFFF" opacity={.05}/>
    <rect x={-50} y={BODY.y+BODY.h-34} width={100} height={7} rx={3.5} fill={C.ivory} opacity={.55}/>
   </g>
   <g opacity={1-smooth(v.unlock,.55,1)}><Lock x={0} y={-176} s={.9} u={v.unlock} fail={v.fail}/></g>
   <path d={rrect(-64,BODY.y+6,128,30,15)} fill="#000"/>
   <circle cx={PARTS.ir.notch} cy={-219} r={5} fill="#1C1430" stroke="#3B3156" strokeWidth={2}/>
   <rect x={PARTS.flood.notch-4} y={-223} width={8} height={8} rx={1.5} fill="#2A2238"/>
   <circle cx={26} cy={-219} r={4} fill="#1C1430"/>
   <circle cx={PARTS.proj.notch} cy={-219} r={5} fill="#1C1430" stroke="#3B3156" strokeWidth={2}/>
   {v.scan>.003&&<g opacity={v.scan}>
    <circle cx={PARTS.flood.notch} cy={-219} r={9} fill={C.lavender} opacity={.45*v.flood}/>
    <circle cx={PARTS.proj.notch} cy={-219} r={8} fill={C.lavender} opacity={.45*v.dots}/>
    <circle cx={PARTS.ir.notch} cy={-219} r={8} fill={C.green} opacity={.4*v.cam}/>
   </g>}
  </g>
  {/* Emissions follow the parts: from the bar when exploded, from the notch when back in place. */}
  {v.flood>.003&&<g opacity={v.flood*(1-smooth(v.unlock+v.fail,.2,1))}>
   <circle cx={fl[0]} cy={fl[1]} r={250*s} fill={`url(#ifl-${uid})`}/>
   {[0,1,2].map(k=>{const ph=((t*.8+k/3)%1+1)%1;return <circle key={k} cx={fl[0]} cy={fl[1]} r={(26+250*ph)*s} fill="none" stroke={C.lavender} strokeWidth={3} strokeDasharray="6 10" opacity={.65*(1-ph)}/>;})}
  </g>}
  {v.dots>.003&&<g opacity={v.dots*(1-smooth(v.unlock+v.fail,.2,1))}>{[0,1].map(k=>{const g=gen(k);return <g key={k}>{Array.from({length:121},(_,i)=>{const gx=i%11-5,gy=Math.floor(i/11)-5,jx=(hash(i*2.1)-.5)*.5,jy=(hash(i*3.7)-.5)*.5,x=(gx+jx)*g.sp*s,y=(gy+jy)*g.sp*s,r=Math.hypot(x,y),fade=Math.sin(Math.PI*g.ph)*clamp01(1-r/(300*s));
   return fade>.02?<circle key={i} cx={f1(pr[0]+x)} cy={f1(pr[1]+y)} r={2.2+1.2*s} fill={C.ivory} opacity={fade}/>:null;})}</g>;})}</g>}
  {e>.003&&<g opacity={smooth(e,0,.35)}>
   {(["ir","flood","proj"] as const).map(k=>{const p=at(k);return <line key={k} x1={PARTS[k].notch} y1={-212} x2={p[0]} y2={p[1]+40*s} stroke={C.lavender} strokeWidth={2.5} strokeDasharray="5 7" opacity={.7}/>;})}
   <g transform={`translate(0,${f1(lerp(-219,BAR_Y,e))}) scale(${s.toFixed(3)})`}>
    <path d={rrect(-196,-50,392,100,24)} fill="#000" opacity={.35} transform="translate(8,10)"/>
    <Box x={-196} y={-50} w={392} h={100} d={[12,-10]} front={{light:"#2A2238",dark:"#1A1424"}} top={METAL.lo} side={METAL.deep}/>
    <path d={rrect(-196,-50,392,100,24)} fill="none" stroke={C.purpleStroke} strokeOpacity={.5} strokeWidth={2}/>
    <Module kind="ir" x={PARTS.ir.bar} on={v.cam} t={t}/>
    <Module kind="flood" x={PARTS.flood.bar} on={v.flood} t={t}/>
    <g transform="translate(40,0)"><circle r={13} fill="#1C1430" stroke={METAL.mid} strokeWidth={4}/><circle r={5} fill="#3B3156"/></g>
    <Module kind="proj" x={PARTS.proj.bar} on={v.dots} t={t}/>
   </g>
  </g>}
 </g>;
}
function Module({kind,x,on,t}:{kind:"ir"|"flood"|"proj";x:number;on:number;t:number}){
 return <g transform={`translate(${x},0)`}>
  <Box x={-32} y={-32} w={64} h={64} d={[8,-7]} front={{light:METAL.top,dark:METAL.mid}} top={METAL.hi} side={METAL.dark}/>
  {kind==="ir"&&<g>
   <circle r={27} fill={METAL.lo}/><circle r={22} fill="#0E0A1E"/><circle r={22} fill="none" stroke={mix(METAL.hi,C.green,on)} strokeWidth={3}/>
   <circle r={14} fill="#2A1650"/><circle r={8} fill="#07050B"/><path d="M -14 -6 A 15 15 0 0 1 -2 -15" stroke="#FFFFFF" strokeWidth={3} opacity={.45} fill="none"/>
   {on>.003&&<g opacity={on}><circle r={26} fill={C.green} opacity={.18}/>{[0,1,2,3].map(k=><path key={k} d="M 34 -12 A 36 36 0 0 1 34 12" stroke={C.green} strokeWidth={4} fill="none" strokeLinecap="round" transform={`rotate(${f1(t*50+k*90)})`}/>)}</g>}
  </g>}
  {kind==="flood"&&<g>
   <rect x={-20} y={-20} width={40} height={40} rx={4} fill="#1A1424"/>
   {Array.from({length:9},(_,i)=><rect key={i} x={-17+(i%3)*12} y={-17+Math.floor(i/3)*12} width={10} height={10} rx={1.5} fill={mix("#3B3156",C.lavender,on*(.75+.25*Math.sin(t*4+i)))}/>)}
   {on>.003&&<rect x={-24} y={-24} width={48} height={48} rx={8} fill={C.lavender} opacity={.25*on}/>}
  </g>}
  {kind==="proj"&&<g>
   <circle r={24} fill={METAL.lo}/><circle r={19} fill="#0E0A1E"/>
   {[-12,-6,0,6,12].map(k=><g key={k}><line x1={k} y1={-15} x2={k} y2={15} stroke={C.lavender} strokeOpacity={.35} strokeWidth={1.4}/><line x1={-15} y1={k} x2={15} y2={k} stroke={C.lavender} strokeOpacity={.35} strokeWidth={1.4}/></g>)}
   <circle r={4+2*on} fill={mix("#4E4F62",C.ivory,on)}/>
   {on>.003&&<circle r={14} fill={C.lavender} opacity={.3*on*(.8+.2*Math.sin(t*9))}/>}
  </g>}
 </g>;
}

/* ───────────── Neural network → vector of bars, compared with the stored one ───────────── */
const LAYERS=[[-110,5],[0,6],[110,5]] as const;
export const VECTOR_A=Array.from({length:10},(_,i)=>.25+.7*hash(i*3.1+.7));
export const VECTOR_B=VECTOR_A.map((h,i)=>clamp01(i%3===1?h*.45+.5*hash(i*5.3):i%3===2?1.05-h:h*.9+.06));
export function networkState(a:number){return {input:smooth(a,.04,.2),wave:smooth(a,.2,.48),bars:smooth(a,.44,.6),stored:smooth(a,.66,.8),verdict:smooth(a,.86,1)};}
function Network({o,t,a,uid}:{o:TimedObject;t:number;a:number;uid:string}){
 const rows=o.rows===2?2:1,v=networkState(a),xw=lerp(-200,220,v.wave),out=rows===2?VECTOR_B:VECTOR_A,m=headMesh(0);
 const nodes=LAYERS.map(([x,n])=>Array.from({length:n},(_,i)=>({x,y:(i-(n-1)/2)*46})));
 const lit=(x:number)=>smooth(xw-x,-40,10);
 const BX=176,BY=110,BW=13;
 const good=rows===1?v.verdict:0,bad=rows===2?v.verdict:0;
 return <g>
  <Shadow w={640} y={250}/>
  {[-250,250].map(x=><g key={x}><rect x={x-9} y={170} width={18} height={70} fill={METAL.mid}/><rect x={x-9} y={170} width={6} height={70} fill={METAL.top}/><rect x={x-22} y={236} width={44} height={8} rx={4} fill={METAL.dark}/></g>)}
  <Box x={-334} y={-194} w={668} h={364} d={[14,-11]} front={{light:"#1E1830",dark:"#140F22"}} top={METAL.lo} side={METAL.deep}/>
  <path d={rrect(-334,-194,668,364,6)} fill="none" stroke={C.purpleStroke} strokeOpacity={.35} strokeWidth={2}/>
  {/* input: the depth map of the face */}
  <g opacity={v.input} transform={`translate(-244,-4) scale(${(.8+.2*v.input).toFixed(3)})`}>
   <defs><clipPath id={`th-${uid}`}><path d={rrect(-60,-80,120,160,11)}/></clipPath></defs>
   <path d={rrect(-62,-82,124,164,12)} fill="#0A0D1F"/>
   <g clipPath={`url(#th-${uid})`}><g transform="translate(0,-2) scale(.46)"><BustMesh m={m} yaw={0} pitch={0} look={{dark:0,ir:0,dep:1,wire:0,lit:true}} uid={uid}/></g></g>
   <path d={rrect(-62,-82,124,164,12)} fill="none" stroke={C.lavender} strokeOpacity={.6} strokeWidth={3}/>
  </g>
  {/* edges */}
  <g strokeLinecap="round">
   {nodes[0].map((n,i)=><line key={`in${i}`} x1={-182} y1={-4} x2={n.x} y2={n.y} stroke={mix("#3B3156",C.yellow,lit(-150))} strokeWidth={2} opacity={.3+.5*lit(-150)*v.input}/>)}
   {nodes.slice(0,-1).flatMap((L,li)=>L.flatMap((p,i)=>nodes[li+1].map((q,j)=>{const k=lit(q.x)*v.input;return <line key={`${li}-${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={mix("#3B3156",C.lavender,k)} strokeWidth={1.6} opacity={.22+.45*k}/>;})))}
   {nodes[2].map((n,i)=><line key={`out${i}`} x1={n.x} y1={n.y} x2={BX-6} y2={-4} stroke={mix("#3B3156",C.yellow,lit(170))} strokeWidth={2} opacity={.3+.5*lit(170)}/>)}
   {/* pulses along the lit edges */}
   {v.wave>.003&&nodes.slice(0,-1).flatMap((L,li)=>L.map((p,i)=>{const q=nodes[li+1][(i*2+1)%nodes[li+1].length],ph=((t*.9+i*.23+li*.4)%1+1)%1,k=lit(q.x)*v.input;return k>.02?<circle key={`p${li}${i}`} cx={f1(lerp(p.x,q.x,ph))} cy={f1(lerp(p.y,q.y,ph))} r={4} fill={C.yellow} opacity={k*Math.sin(Math.PI*ph)}/>:null;}))}
  </g>
  {nodes.flatMap((L,li)=>L.map((n,i)=>{const k=lit(n.x)*v.input;return <g key={`n${li}${i}`}>{k>.02&&<circle cx={n.x} cy={n.y} r={22} fill={C.yellow} opacity={.18*k}/>}
   <Gem x={n.x} y={n.y} r={14} light={mix("#4E4F62",mix(C.lavender,C.green,good),k)} dark={mix("#26273A",mix("#A68BD0",GRN.dark,good),k)}/></g>;}))}
  {/* output vector and the stored one */}
  <path d={rrect(BX-14,-BY-14,10*BW+28,2*BY+28,12)} fill="#0A0D1F" stroke={C.purpleStroke} strokeOpacity={.5} strokeWidth={2}/>
  {out.map((h,i)=>{const g=smooth(v.bars,.045*i,.55+.045*i),x=BX+i*BW,hh=h*2*BY*g,col=mix(mix(C.yellow,C.green,good),C.pink,bad*(Math.abs(h-VECTOR_A[i])>.12?1:0));
   return <g key={i}><rect x={x} y={BY-hh} width={BW-4} height={hh} rx={2} fill={col}/><rect x={x} y={BY-hh} width={(BW-4)/2} height={hh} rx={2} fill="#FFFFFF" opacity={.18}/></g>;})}
  {v.stored>.003&&<g opacity={v.stored} transform={`translate(0,${f1(-50*(1-v.stored))})`}>{VECTOR_A.map((h,i)=>{const x=BX+i*BW,hh=h*2*BY;
   return <rect key={i} x={x-1.5} y={BY-hh-1.5} width={BW-1} height={hh+3} rx={2.5} fill="none" stroke={mix(C.lavender,C.green,good)} strokeWidth={2.5}/>;})}</g>}
  {bad>.003&&out.map((h,i)=>{const d=h-VECTOR_A[i];if(Math.abs(d)<=.12)return null;const y0=BY-Math.max(h,VECTOR_A[i])*2*BY,hh=Math.abs(d)*2*BY;return <rect key={`d${i}`} x={BX+i*BW-2} y={y0} width={BW} height={hh} fill={C.pink} opacity={.35*bad}/>;})}
  <Check x={300} y={-160} k={good}/>
  <Cross x={300} y={-160} k={bad}/>
 </g>;
}

/* ───────────── Secure Enclave: a vault chip on a board ───────────── */
export function enclaveState(a:number){return {glow:smooth(a,.04,.3),open:win(a,.32,.5,.72,.92),inside:smooth(a,.3,.5),lock:smooth(a,.8,1)};}
function Enclave({t,a,uid}:{t:number;a:number;uid:string}){
 const v=enclaveState(a),CX=0,CY=-36,R=92,ang=100*v.open,sc=Math.cos(ang*D),hinge=CX-R;
 const traces=[[-236,150,-150,110,-132,60],[-236,176,-110,150,-60,104],[236,150,150,110,132,60],[236,176,110,150,60,104],[-90,186,-40,140,-20,104],[90,186,40,140,20,104]];
 const ring=mix(mix(METAL.hi,C.lavender,v.glow),C.green,v.lock);
 return <g>
  <defs><clipPath id={`vc-${uid}`}><circle cx={CX} cy={CY} r={R-10}/></clipPath></defs>
  <Shadow w={480} y={220}/>
  {[-200,200].map(x=><rect key={x} x={x-14} y={190} width={28} height={24} rx={4} fill={METAL.dark}/>)}
  <polygon points={pts([[-240,120],[240,120],[256,104],[-224,104]])} fill="#2A2048"/>
  <Quad p={[[-240,120],[240,120],[240,192],[-240,192]]} light="#1F1834" dark="#16112A"/>
  <polygon points={pts([[240,120],[256,104],[256,176],[240,192]])} fill="#120C1D"/>
  {traces.map((tr,i)=>{const d=`M ${tr[0]} ${tr[1]} L ${tr[2]} ${tr[3]} L ${tr[4]} ${tr[5]}`;return <g key={i}><path d={d} stroke={GOLD.dark} strokeWidth={4} fill="none" strokeLinejoin="round"/>
   <path d={d} stroke={mix(C.yellow,C.green,v.lock)} strokeWidth={4} fill="none" strokeDasharray="6 26" strokeDashoffset={f1(-t*46-i*9)} strokeLinecap="round" opacity={.55+.4*v.glow}/></g>;})}
  {Array.from({length:7},(_,i)=><g key={i}><rect x={-160} y={-150+i*36} width={30} height={12} rx={3} fill={GOLD.light}/><rect x={130} y={-150+i*36} width={30} height={12} rx={3} fill={GOLD.dark}/></g>)}
  <Box x={-132} y={-172} w={264} h={276} d={[18,-14]} front={{light:"#332A48",dark:"#1E1830"}} top={METAL.lo} side={METAL.deep}/>
  <circle cx={-108} cy={-148} r={7} fill="#120C1D"/>
  {v.glow>.003&&<circle cx={CX} cy={CY} r={R+26} fill={mix(C.lavender,C.green,v.lock)} opacity={.14*v.glow}/>}
  <circle cx={CX} cy={CY} r={R+10} fill={METAL.dark}/>
  <circle cx={CX} cy={CY} r={R+10} fill="none" stroke={ring} strokeWidth={5} opacity={.6+.4*v.glow}/>
  {/* interior with the stored face vector */}
  <circle cx={CX} cy={CY} r={R-4} fill="#07050B"/>
  <g clipPath={`url(#vc-${uid})`} opacity={v.inside}>
   <circle cx={CX} cy={CY} r={R} fill={C.purple} opacity={.15}/>
   {VECTOR_A.slice(0,8).map((h,i)=>{const hh=h*96;return <rect key={i} x={CX-52+i*13} y={CY+44-hh} width={9} height={hh} rx={2} fill={C.lavender} opacity={.75+.25*Math.sin(t*2+i)}/>;})}
  </g>
  {/* the door swings about its left hinge; its back shows when it passes edge-on */}
  <g transform={`translate(${hinge},0) scale(${sc.toFixed(4)},1) translate(${-hinge},0)`}>
   <circle cx={CX} cy={CY} r={R} fill={sc>=0?METAL.top:METAL.lo}/>
   {Array.from({length:16},(_,i)=>{const a0=i/16*2*Math.PI,a1=(i+1)/16*2*Math.PI,lit=clamp01(.5+.5*Math.cos((a0+a1)/2+135*D));return <polygon key={i} points={pts([[CX+Math.cos(a0)*R,CY+Math.sin(a0)*R],[CX+Math.cos(a1)*R,CY+Math.sin(a1)*R],[CX+Math.cos(a1)*(R-16),CY+Math.sin(a1)*(R-16)],[CX+Math.cos(a0)*(R-16),CY+Math.sin(a0)*(R-16)]])} fill={mix(METAL.dark,METAL.hi,lit)}/>;})}
   {sc>=0&&<g>
    <circle cx={CX} cy={CY} r={R-26} fill="none" stroke={METAL.dark} strokeWidth={3}/>
    <g transform={`translate(${CX},${CY}) rotate(${f1(90*v.open+20*v.glow)})`}>
     {Array.from({length:6},(_,i)=><line key={i} x1={0} y1={0} x2={Math.cos(i*60*D)*44} y2={Math.sin(i*60*D)*44} stroke={METAL.hi} strokeWidth={7} strokeLinecap="round"/>)}
     <circle r={44} fill="none" stroke={METAL.hi} strokeWidth={5}/><circle r={13} fill={mix(METAL.mid,C.lavender,v.glow)}/>
    </g>
   </g>}
  </g>
  {/* bolts retract while the door opens */}
  {Array.from({length:6},(_,i)=>{const an=(i*60+30)*D,r=R+4-12*smooth(v.open,0,.3);return <rect key={i} x={-6} y={-4} width={12} height={8} rx={2} fill={METAL.hi} transform={`translate(${f1(CX+Math.cos(an)*r)},${f1(CY+Math.sin(an)*r)}) rotate(${f1(an/D)})`} opacity={1-smooth(v.open,.3,.6)}/>;})}
  {v.lock>.003&&<g opacity={v.lock}>
   <circle cx={CX} cy={CY} r={R+18} fill="none" stroke={C.green} strokeWidth={6} strokeDasharray="14 8" strokeDashoffset={f1(-t*12)}/>
   <g transform={`translate(104,-150) scale(${(.6+.4*v.lock).toFixed(3)})`}>
    <path d="M 0 -34 L 30 -24 V 2 C 30 22 14 32 0 38 C -14 32 -30 22 -30 2 V -24 Z" fill={C.green}/>
    <path d="M 0 -34 L 30 -24 V 2 C 30 22 14 32 0 38 Z" fill={GRN.dark}/>
    <polyline points="-12,2 -3,12 14,-10" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
   </g>
  </g>}
 </g>;
}

/* ───────────── Attention: eyes open and looking at the screen ───────────── */
export function gazeState(a:number){const open=smooth(a,.06,.36),look=smooth(a,.6,.9);return {open,look,away:open*(1-look),unlock:smooth(a,.82,1)};}
/** Occasional soft blink (0.3 s), independent of the keys. */
export function blink(t:number){const p=((t-1.3)%4.6+4.6)%4.6;return p<.3?Math.sin(Math.PI*p/.3):0;}
const GZ={cx:-90,EY:6,k:2.4};
/** The eye band is a magnified relief of person A's eye region: the same face height, shaded per facet. */
const BAND=(()=>{const P=HEADS[0],H=faceHeight(P),hairline=(x:number)=>-P.b*.56+P.b*.42*(x/P.a)**2+P.hairDrop;
 const hx=(x:number)=>(x-GZ.cx)/GZ.k,hy=(y:number)=>(y-GZ.EY)/GZ.k+P.eyeY,Z=(x:number,y:number)=>H(hx(x),hy(y))*GZ.k;
 const NX=14,NY=9,X0=-352,Y0=-152,SX=524/NX,SY=304/NY;
 const vtx=(i:number,j:number)=>{const inner=i>0&&i<NX&&j>0&&j<NY;return [X0+i*SX+(inner?(hash(i*7.1+j*3.3)-.5)*SX*.5:0),Y0+j*SY+(inner?(hash(i*2.9+j*5.7)-.5)*SY*.5:0)];};
 const tris:{p:number[][];c:string}[]=[];
 for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const q=[vtx(i,j),vtx(i+1,j),vtx(i+1,j+1),vtx(i,j+1)];
  for(const t of (i+j)%2?[[q[0],q[1],q[2]],[q[0],q[2],q[3]]]:[[q[0],q[1],q[3]],[q[1],q[2],q[3]]]){
   const v=t.map(([x,y])=>[x,y,Z(x,y)] as V3),n=unit(cross(sub(v[1],v[0]),sub(v[2],v[0]))),nn:V3=n[2]<0?[-n[0],-n[1],-n[2]]:n;
   const [l,d]=P.skin;tris.push({p:t,c:mix(d,l,clamp01(.18+.9*Math.max(0,dot3(nn,LIGHT))))});}
 }
 return tris;})();
function Gaze({t,a,uid}:{t:number;a:number;uid:string}){
 const v=gazeState(a),open=v.open*(1-blink(t)),P=HEADS[0],EY=GZ.EY,eyes=[GZ.cx-P.eyeX*GZ.k,GZ.cx+P.eyeX*GZ.k],phone={x:262,y:-10};
 const irisOff=lerp(-13,12,v.look),irisY=lerp(-5,-1,v.look),lidC=mix(P.skin[1],P.skin[0],.8);
 return <g>
  <defs><clipPath id={`gz-${uid}`}><path d={rrect(-350,-150,520,300,26)}/></clipPath></defs>
  <Shadow w={680} y={184}/>
  {[-260,80].map(x=><rect key={x} x={x-7} y={150} width={14} height={32} fill={METAL.mid}/>)}
  <path d={rrect(-358,-158,536,316,30)} fill={METAL.dark}/>
  <g clipPath={`url(#gz-${uid})`}>
   <rect x={-350} y={-150} width={520} height={300} fill="#140F22"/>
   <g strokeLinejoin="round">{BAND.map((tr,i)=><polygon key={i} points={pts(tr.p)} fill={tr.c} stroke={tr.c} strokeWidth={.8}/>)}</g>
   {eyes.map((ex,i)=>{const w=44,up=EY-20*open,lid=Array.from({length:13},(_,k)=>{const u=k/12;return [ex-w+2*w*u,EY-(EY-up)*Math.sin(Math.PI*u)];}),lo=Array.from({length:13},(_,k)=>{const u=1-k/12;return [ex-w+2*w*u,EY+13*Math.sin(Math.PI*u)*(.35+.65*open)];});
    return <g key={i}>
     <path d={`M ${ex-w-8} ${EY-52} Q ${ex} ${EY-72} ${ex+w+10} ${EY-56}`} stroke={P.hair[1]} strokeWidth={13} fill="none" strokeLinecap="round"/>
     <polygon points={pts([...lid,...lo])} fill="#F5F1E8"/>
     <g opacity={clamp01(open*1.4)}>
      <circle cx={ex+irisOff} cy={EY+irisY} r={14} fill={P.iris}/><circle cx={ex+irisOff} cy={EY+irisY} r={6.5} fill="#07050B"/><circle cx={ex+irisOff-4} cy={EY+irisY-5} r={3} fill="#FFFFFF" opacity={.85}/>
     </g>
     <polygon points={pts([[ex-w-6,EY-44],[ex+w+6,EY-44],...lid.slice().reverse()])} fill={lidC}/>
     <polyline points={pts(lid)} fill="none" stroke="#2A1A12" strokeWidth={3.5} strokeLinecap="round"/>
     {open<.5&&Array.from({length:5},(_,k)=>{const u=.2+.15*k,x=ex-w+2*w*u,y=EY-(EY-up)*Math.sin(Math.PI*u);return <line key={k} x1={x} y1={y} x2={x-4+2*k} y2={y+8} stroke="#2A1A12" strokeWidth={2.2} opacity={1-open*2}/>;})}
    </g>;})}
  </g>
  {/* gaze lines: away (pink, past the phone) or onto the screen (green) */}
  {eyes.map((ex,i)=>{const sx=ex+irisOff,sy=EY+irisY;return <g key={i} strokeLinecap="round">
   {v.away>.003&&<line x1={sx} y1={sy} x2={sx-120} y2={sy-150} stroke={C.pink} strokeWidth={4} strokeDasharray="6 12" strokeDashoffset={f1(-t*30)} opacity={.8*v.away}/>}
   {v.look>.003&&<line x1={sx} y1={sy} x2={phone.x} y2={phone.y-20} stroke={C.green} strokeWidth={4} strokeDasharray="6 12" strokeDashoffset={f1(-t*30)} opacity={.8*v.look*v.open}/>}
  </g>;})}
  <g transform={`translate(${phone.x},${phone.y})`}>
   <polygon points={pts([[-56,122],[56,122],[66,162],[-66,162]])} fill={METAL.mid}/><polygon points={pts([[-50,114],[50,114],[56,122],[-56,122]])} fill={METAL.hi}/>
   <path d={rrect(-58,-118,116,232,22)} fill={METAL.mid}/><path d={rrect(-52,-112,104,220,18)} fill={mix("#120C24","#5B3A94",v.unlock)}/>
   <path d={rrect(-22,-110,44,12,6)} fill="#000"/>
   {v.look>.003&&<path d={rrect(-52,-112,104,220,18)} fill={C.green} opacity={.12*v.look*v.open}/>}
   <Lock x={0} y={-10} s={.9} u={v.unlock} base={v.away>.3?mix(C.lavender,C.pink,v.away):C.lavender}/>
  </g>
 </g>;
}

/* ───────────── Odds: one stranger per area (Touch ID vs Face ID) ───────────── */
export function oddsState(a:number){return {left:smooth(a,.05,.42),right:smooth(a,.5,.95),dotR:smooth(a,.82,1)};}
const LEFT={x0:-394,y0:98,x1:-282,y1:210},RIGHT={x0:-230,y0:-210,x1:370,y1:210};
/** Right board area / left board area — the 1 in 50,000 vs 1 in 1,000,000 comparison is a factor of 20. */
export const ODDS_AREA_RATIO=((RIGHT.x1-RIGHT.x0)*(RIGHT.y1-RIGHT.y0))/((LEFT.x1-LEFT.x0)*(LEFT.y1-LEFT.y0));
function Odds({t,a,uid}:{t:number;a:number;uid:string}){
 const v=oddsState(a),g=smooth(v.right,0,1),R={x0:RIGHT.x0,y1:RIGHT.y1,x1:lerp(RIGHT.x0+112,RIGHT.x1,g),y0:lerp(RIGHT.y1-112,RIGHT.y0,g)},pat=`od-${uid}`;
 const board=(b:{x0:number;y0:number;x1:number;y1:number},k:number,key:string)=><g key={key} opacity={k}>
  <path d={rrect(b.x0-10,b.y0-10,b.x1-b.x0+20,b.y1-b.y0+20,10)} fill={METAL.dark}/>
  <rect x={b.x0} y={b.y0} width={b.x1-b.x0} height={b.y1-b.y0} fill="#0E0A1A"/>
  <rect x={b.x0} y={b.y0} width={b.x1-b.x0} height={b.y1-b.y0} fill={`url(#${pat})`}/>
  <path d={rrect(b.x0-10,b.y0-10,b.x1-b.x0+20,b.y1-b.y0+20,10)} fill="none" stroke={C.purpleStroke} strokeOpacity={.5} strokeWidth={2}/>
 </g>;
 const pulse=.5+.5*Math.sin(t*3.2);
 const lx=-350,ly=140,rx=lerp(R.x0+56,238,g),ry=lerp(R.y1-56,-62,g);
 return <g>
  <defs><pattern id={pat} width={8} height={8} patternUnits="userSpaceOnUse"><circle cx={4} cy={4} r={1.6} fill={C.lavender} opacity={.8}/></pattern></defs>
  <Shadow w={840} y={296}/>
  {[[-380,v.left],[-296,v.left],[-170,v.right],[310,v.right]].map(([x,k],i)=><g key={i} opacity={k}><rect x={x-6} y={214} width={12} height={74} fill={METAL.mid}/><rect x={x-16} y={284} width={32} height={7} rx={3} fill={METAL.dark}/></g>)}
  <g transform={`translate(-338,154) scale(${(.6+.4*v.left).toFixed(3)}) translate(338,-154)`}>{board(LEFT,v.left,"l")}</g>
  {v.right>.003&&board(R,clamp01(v.right*3),"r")}
  {v.left>.003&&<g opacity={v.left}><circle cx={lx} cy={ly} r={12+6*pulse} fill={C.pink} opacity={.25}/><circle cx={lx} cy={ly} r={5} fill={C.pink}/></g>}
  {v.right>.003&&<g opacity={v.dotR}><circle cx={rx} cy={ry} r={14+8*pulse} fill={C.pink} opacity={.25}/><circle cx={rx} cy={ry} r={5.5} fill={C.pink}/><circle cx={rx} cy={ry} r={26+6*pulse} fill="none" stroke={C.pink} strokeWidth={3} opacity={.6}/></g>}
  {/* glyphs: fingerprint over the small board, a face outline over the big one */}
  <g opacity={v.left} transform="translate(-338,40)" fill="none" stroke={C.lavender} strokeWidth={4} strokeLinecap="round">
   {[12,22,32,42].map((r,i)=><path key={i} d={`M ${-r*.9} ${r*.5} C ${-r} ${-r*1.2}, ${r} ${-r*1.2}, ${r*.9} ${r*.4}`} opacity={.9-.12*i}/>)}
   <path d="M 0 -4 V 30" opacity={.8}/>
  </g>
  <g opacity={smooth(v.right,.4,1)} transform="translate(70,-262)" fill="none" stroke={C.lavender} strokeWidth={4} strokeLinecap="round">
   <ellipse cx={0} cy={0} rx={30} ry={38}/><circle cx={-11} cy={-6} r={3} fill={C.lavender}/><circle cx={11} cy={-6} r={3} fill={C.lavender}/><path d="M -10 16 Q 0 22 10 16"/>
   {[[-46,-44],[46,-44],[46,44],[-46,44]].map(([x,y],i)=><path key={i} d={`M ${x} ${y+(y<0?16:-16)} V ${y} H ${x+(x<0?16:-16)}`} stroke={C.purpleStroke}/>)}
  </g>
 </g>;
}

export function FaceidArt({kind,o,t,a,xray,uid,overlay}:FaceidArtProps){
 if(overlay&&kind!=="face-scan"&&kind!=="flat-photo")return null;
 switch(kind){
  case "truedepth-phone":return <Phone o={o} t={t} a={a} uid={uid}/>;
  case "face-scan":return <FaceScan o={o} t={t} a={a} xray={xray} uid={uid} overlay={overlay}/>;
  case "flat-photo":return <FlatPhoto t={t} a={a} xray={xray} uid={uid} overlay={overlay}/>;
  case "face-network":return <Network o={o} t={t} a={a} uid={uid}/>;
  case "secure-enclave":return <Enclave t={t} a={a} uid={uid}/>;
  case "gaze-eyes":return <Gaze t={t} a={a} uid={uid}/>;
  case "odds-board":return <Odds t={t} a={a} uid={uid}/>;
 }
 return null;
}
