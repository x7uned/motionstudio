import React from "react";
import brand from "../video-design/brand.json";
import {keyed,easeSine} from "../src/lib/illustrated";

// Prepared objects for the falling-cat explainer (2026-10-20). The cat is a small faceted 3D mesh projected
// orthographically into the illustrated world, so its front and rear halves really roll about their own axes.
// Every value derives from the frame time and the keyed state; no randomness, no generated code.
const C=brand.colors;
type V=[number,number,number];
type Mat=readonly [string,string];
type Face={p:V[];m:Mat;bias?:number;half?:-1|1};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number,a:number,b:number)=>{const x=clamp01((v-a)/(b-a));return x*x*(3-2*x);};
const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=(a:V):V=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
const LIGHT=unit([-.45,-.8,.55]);
const rgb=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const mix=(a:string,b:string,k:number)=>{const x=rgb(a),y=rgb(b);return `rgb(${x.map((v,i)=>Math.round(v+(y[i]-v)*k)).join(",")})`;};
const pts=(p:number[][])=>p.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const GINGER={fur:["#F4CA50","#B0791F"],stripe:["#E39A3B","#8A5418"],belly:[C.ivory,"#B3AB90"],ear:["#F08AA0","#9E2F48"],eye:[C.green,"#2F7A1C"],dark:["#120C1D","#120C1D"],nose:[C.pink,"#8A1A33"]} as const;
const MONO={fur:[C.lavender,"#56467A"],stripe:["#BBA6E0","#40325E"],belly:[C.ivory,"#857B9C"],ear:["#C9B5EC","#56467A"],eye:[C.ivory,"#857B9C"],dark:["#120C1D","#120C1D"],nose:["#BBA6E0","#40325E"]} as const;
type Palette=typeof GINGER|typeof MONO;

/** Righting sequence keyed by one value: 0 upside down → front half turns (front paws tucked) → rear half turns
 *  (rear paws tucked) → 1 all four paws down, back slightly arched for the landing. */
export function catPose(a:number){
 // The bend (0→.07) and the front tuck (.06→.13) are separate beats, so each can land on its own word.
 const bend=smooth(a,0,.07),tuck=smooth(a,.06,.13),front=smooth(a,.13,.45),swap=smooth(a,.42,.56),rear=smooth(a,.5,.9),land=smooth(a,.86,1);
 return {
  phiF:Math.PI*(1-front)+.1*Math.PI*Math.sin(Math.PI*rear),
  phiR:Math.PI*(1+.2*front-1.2*rear),
  phiH:Math.PI*(1-smooth(a,.05,.38))+.06*Math.PI*Math.sin(Math.PI*rear),
  beta:(26*bend*(1-land)-9*land)*Math.PI/180,
  tuckF:tuck*(1-swap),tuckR:swap*(1-land),land,front,rear,
  fall:smooth(a,0,.03)*(1-smooth(a,.97,1)),
 };
}
type Pose=ReturnType<typeof catPose>;
const TORSO:[number,number,number][]=[[-152,26,24],[-140,46,42],[-118,62,54],[-88,66,57],[-52,62,53],[-20,57,49],[12,59,51],[48,66,56],[84,70,59],[112,64,55],[134,50,44],[150,36,33]];
const HEAD:[number,number,number,number][]=[[-50,19,21,0],[-35,44,49,0],[-10,54,58,2],[17,49,53,6],[37,33,38,11],[52,18,21,12],[60,6,9,12]];
// Leg poses relative to the hip in the half's own frame: [knee t, knee n, paw t, paw n].
const LEG={front:{ext:[6,62,10,124],tuck:[34,30,4,46],land:[18,60,30,122]},rear:{ext:[18,52,-6,118],tuck:[40,26,10,44],land:[10,56,-26,116]}};

function catMesh(p:Pose,t:number,pal:Palette,detail:number){
 const N=detail>.5?8:6,step=4,dMin=-200,table:{x:number;y:number;al:number}[]=[];
 // Spine: tangent angle bends smoothly at the waist; integrate from the waist (origin) both ways.
 const angle=(d:number)=>-p.beta*Math.tanh(d/34);
 const count=(200-dMin)/step+1,mid=(0-dMin)/step;table[mid]={x:0,y:0,al:0};
 for(let i=mid+1;i<count;i++){const d=dMin+i*step,al=angle(d-step/2),q=table[i-1];table[i]={x:q.x+Math.cos(al)*step,y:q.y+Math.sin(al)*step,al:angle(d)};}
 for(let i=mid-1;i>=0;i--){const d=dMin+i*step,al=angle(d+step/2),q=table[i+1];table[i]={x:q.x-Math.cos(al)*step,y:q.y-Math.sin(al)*step,al:angle(d)};}
 const frame=(d:number)=>{const f=Math.max(0,Math.min(count-1.001,(d-dMin)/step)),i=Math.floor(f),k=f-i,a=table[i],b=table[i+1],al=lerp(a.al,b.al,k);return {x:lerp(a.x,b.x,k),y:lerp(a.y,b.y,k),tx:Math.cos(al),ty:Math.sin(al)};};
 const roll=(d:number)=>lerp(p.phiR,p.phiF,smooth(d,-45,35));
 const local=(d:number,tt:number,nn:number,zz:number,phi:number):V=>{const f=frame(d),n2=nn*Math.cos(phi)-zz*Math.sin(phi),z2=nn*Math.sin(phi)+zz*Math.cos(phi);return [f.x+f.tx*tt-f.ty*n2,f.y+f.ty*tt+f.tx*n2,z2];};
 const faces:Face[]=[],th=(k:number)=>(k+.5)*2*Math.PI/N;
 // Torso rings: the cross-section rolls with the local angle, so the waist twists smoothly between the halves.
 const rings=TORSO.map(([d,ry,rz])=>Array.from({length:N},(_,k)=>local(d,0,ry*Math.cos(th(k)),rz*Math.sin(th(k)),roll(d))));
 rings.slice(0,-1).forEach((r,i)=>{for(let k=0;k<N;k++){const c=Math.cos((k+1)*2*Math.PI/N),belly=c>.45,stripe=!belly&&c<-.3&&i%2===1&&i>0&&i<10;
  faces.push({p:[r[k],r[(k+1)%N],rings[i+1][(k+1)%N],rings[i+1][k]],m:belly?pal.belly:stripe?pal.stripe:pal.fur,half:TORSO[i][0]+TORSO[i+1][0]>0?1:-1});}});
 const rump=local(-158,0,0,0,p.phiR);for(let k=0;k<N;k++)faces.push({p:[rings[0][k],rings[0][(k+1)%N],rump],m:pal.fur,half:-1});
 const torsoCount=faces.length;
 // Head rolls about the spine axis slightly ahead of the chest: the head leads the turn.
 const head=(u:number,nn:number,zz:number)=>local(148,50+u,-32+nn,zz,p.phiH);
 const hr=HEAD.map(([u,ry,rz,s])=>Array.from({length:N},(_,k)=>head(u,s+ry*Math.cos(th(k)),rz*Math.sin(th(k)))));
 hr.slice(0,-1).forEach((r,i)=>{for(let k=0;k<N;k++){const c=Math.cos((k+1)*2*Math.PI/N);faces.push({p:[r[k],r[(k+1)%N],hr[i+1][(k+1)%N],hr[i+1][k]],m:c>.55&&i>=3?pal.belly:i===1&&c<-.5?pal.stripe:pal.fur});}});
 const tip=head(63,12,0);for(let k=0;k<N;k++)faces.push({p:[hr.at(-1)![k],hr.at(-1)![(k+1)%N],tip],m:pal.belly});
 const back=head(-55,0,0);for(let k=0;k<N;k++)faces.push({p:[hr[0][(k+1)%N],hr[0][k],back],m:pal.fur});
 for(const s of [-1,1]){
  // Broad-based ear: three fur faces plus a smaller pink inner face, so the profile reads as an ear, not a horn.
  const b1=head(-36,-36,s*14),b2=head(12,-44,s*22),b3=head(-12,-30,s*50),apex=head(-16,-100,s*36);
  faces.push({p:[b1,b2,apex],m:pal.fur},{p:[b3,b1,apex],m:pal.fur},{p:[b2,b3,apex],m:pal.fur});
  const inset=(q:V)=>{const c=[b2,b3,apex].reduce((m,v)=>[m[0]+v[0]/3,m[1]+v[1]/3,m[2]+v[2]/3],[0,0,0]);return [lerp(c[0],q[0],.62),lerp(c[1],q[1],.62),lerp(c[2],q[2],.62)+1.5] as V;};
  faces.push({p:[inset(b2),inset(b3),inset(apex)],m:pal.ear,bias:1.5});
  faces.push({p:[head(14,-12,s*48),head(27,-22,s*51),head(40,-12,s*46),head(27,-2,s*51)],m:pal.eye,bias:3});
  faces.push({p:[head(25,-20,s*52.5),head(29,-20,s*52.5),head(29,-4,s*52.5),head(25,-4,s*52.5)],m:pal.dark,bias:4});
 }
 faces.push({p:[head(59,5,-8),head(59,5,8),head(57,14,0)],m:pal.nose,bias:3});
 for(let i=torsoCount;i<faces.length;i++)faces[i].half=1;
 // Prism segments for legs and tail; the cross-section follows the segment direction.
 const prism=(a:V,b:V,wa:number,wb:number,m:Mat,cap=false,half:-1|1=1)=>{
  const dir=unit(sub(b,a)),side=Math.abs(dir[2])>.95?[1,0,0] as V:unit(cross(dir,[0,0,1])),up=cross(dir,side);
  const ring=(c:V,w:number)=>[[1,1],[-1,1],[-1,-1],[1,-1]].map(([i,j]):V=>[c[0]+(side[0]*i+up[0]*j)*w/2,c[1]+(side[1]*i+up[1]*j)*w/2,c[2]+(side[2]*i+up[2]*j)*w/2]);
  const ra=ring(a,wa),rb=ring(b,wb);for(let k=0;k<4;k++)faces.push({p:[ra[k],ra[(k+1)%4],rb[(k+1)%4],rb[k]],m,half});if(cap)faces.push({p:rb,m,half});
 };
 const bones:{hip:V;knee:V;paw:V}[]=[];
 const leg=(dHip:number,hipN:number,zs:number,pose:typeof LEG.front,tuck:number,front:boolean)=>{
  const q=pose.ext.map((v,i)=>lerp(lerp(v,pose.tuck[i],tuck),pose.land[i],p.land)),phi=roll(dHip);
  for(const s of [-1,1]){
   const hip=local(dHip,0,hipN,s*zs,phi),knee=local(dHip,q[0],hipN+q[1],s*(zs+2),phi),paw=local(dHip,q[2],hipN+q[3],s*(zs+4),phi);
   const h=front?1:-1;prism(hip,knee,front?36:42,26,pal.fur,false,h);prism(knee,paw,25,20,pal.fur,false,h);
   const toe=sub(paw,knee),l=Math.hypot(toe[0],toe[1],toe[2])||1;prism(paw,[paw[0]+toe[0]/l*16,paw[1]+toe[1]/l*16,paw[2]+toe[2]/l*16],30,30,pal.belly,true,front?1:-1);
   bones.push({hip,knee,paw});
  }
 };
 leg(90,34,28,LEG.front,p.tuckF,true);leg(-100,32,30,LEG.rear,p.tuckR,false);
 const tail=[[0,-22],[-30,-48],[-55,-86],[-66,-128],[-58,-168],[-38,-194]].map(([tt,nn],i)=>local(-150,tt,nn,18*Math.sin(t*1.7+i*.6)*i/5,p.phiR));
 for(let i=0;i<tail.length-1;i++)prism(tail[i],tail[i+1],27-3*i,24-3*i,i%2?pal.stripe:pal.fur,i===tail.length-2,-1);
 return {faces,frame,bones,tail,head:head(0,0,0)};
}
function shade(f:Face){
 const n0=cross(sub(f.p[1],f.p[0]),sub(f.p[2],f.p[0])),n=unit(n0[2]<0?[-n0[0],-n0[1],-n0[2]]:n0);
 const s=clamp01(.22+1.05*(n[0]*LIGHT[0]+n[1]*LIGHT[1]+n[2]*LIGHT[2]));
 return mix(f.m[1],f.m[0],s);
}
function Mesh({faces,opacity=1,tint}:{faces:Face[];opacity?:number;tint?:[string,string]}){
 const sorted=faces.map(f=>({f,z:f.p.reduce((s,q)=>s+q[2],0)/f.p.length+(f.bias??0)})).sort((a,b)=>a.z-b.z);
 // Tint mode paints each half flat in its axis colour (x-ray overlay): front lavender, back yellow.
 return <g opacity={opacity} strokeLinejoin="round">{sorted.map(({f},i)=>{const c=tint?(f.half===-1?tint[1]:tint[0]):shade(f);return <polygon key={i} points={pts(f.p)} fill={c} stroke={c} strokeWidth={.9}/>;})}</g>;
}

/** The hero cat. xray shows the spine, leg bones and the two roll axes with the half that is turning highlighted. */
export function Cat({t,a,xray=0,mono=false,detail=1,streaks=true,overlay=false}:{t:number;a:number;xray?:number;mono?:boolean;detail?:number;streaks?:boolean;overlay?:boolean}){
 const p=catPose(a),m=catMesh(p,t,mono?MONO:GINGER,detail),lift=48;
 const lowest=Math.max(...m.bones.map(b=>b.paw[1]))+lift+14;
 const axis=(d1:number,d2:number,color:string,act:number,k:number)=>{const A=m.frame(d1),B=m.frame(d2),mx=(A.x+B.x)/2,my=(A.y+B.y)/2,deg=Math.atan2(B.y-A.y,B.x-A.x)*180/Math.PI;
  return <g key={k} opacity={.65+.35*act}>
   <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={color} strokeWidth={5} strokeDasharray="14 10"/>
   <g transform={`translate(${mx},${my}) rotate(${deg})`}><ellipse rx={16} ry={86} fill="none" stroke={color} strokeWidth={7} strokeDasharray="300 60" strokeDashoffset={-t*160*(.3+act)}/>
    <polygon points={pts([[-6,-98],[22,-86],[-6,-72]])} fill={color}/></g></g>;};
 return <g>
  {!overlay&&streaks&&p.fall>.01&&<g opacity={p.fall*.55}>{Array.from({length:8},(_,i)=>{const x=-250+i*71+(i%2)*18,len=70+40*(i%3),y=((-t*820+i*151)%560+560)%560-300;return <line key={i} x1={x} y1={y} x2={x} y2={y+len} stroke={C.lavender} strokeWidth={4} strokeLinecap="round" opacity={.25+.12*(i%3)}/>;})}</g>}
  {!overlay&&<ellipse cx={0} cy={lowest} rx={190} ry={22} fill="#000" opacity={.45*p.land}/>}
  <g transform={`translate(0,${lift})`}>
   {!overlay&&<Mesh faces={m.faces} opacity={1-.62*xray}/>}
   {overlay&&xray>.01&&<Mesh faces={m.faces} opacity={.26*xray} tint={[C.lavender,C.yellow]}/>}
   {overlay&&xray>.01&&<g opacity={xray}>
    {Array.from({length:26},(_,i)=>{const d=-170+i*13,f=m.frame(d);return <rect key={i} x={-4.5} y={-8} width={9} height={16} rx={3} fill={C.ivory} transform={`translate(${f.x},${f.y}) rotate(${Math.atan2(f.ty,f.tx)*180/Math.PI})`}/>;})}
    {m.tail.map((q,i)=><circle key={i} cx={q[0]} cy={q[1]} r={6-i*.6} fill={C.ivory}/>)}
    {m.bones.map((b,i)=><polyline key={i} points={pts([b.hip,b.knee,b.paw])} stroke={C.ivory} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round"/>)}
    {/* Skull as a soft filled shape with eye sockets, so it never reads as a ring or a collar. */}
    <ellipse cx={m.head[0]} cy={m.head[1]} rx={38} ry={30} fill={C.ivory} opacity={.28}/>
    {[-1,1].map(s=><circle key={s} cx={m.head[0]+12+s*4} cy={m.head[1]-6+s*6} r={7} fill="#0A0D1F" opacity={.6}/>)}
    {axis(12,190,C.lavender,Math.sin(Math.PI*p.front),0)}
    {axis(-12,-185,C.yellow,Math.sin(Math.PI*p.rear),1)}
   </g>}
  </g>
 </g>;
}

/** Chronophotograph strip: six frames of the same fall, developing left to right as active rises. */
export function ChronoStrip({t,a}:{t:number;a:number}){
 const n=6,fw=108,fh=124,gap=10,w=n*fw+(n-1)*gap+56,x0=-w/2+28;
 return <g>
  <rect x={-w/2} y={-104} width={w} height={208} rx={12} fill="#120C1D" stroke={C.purpleStroke} strokeOpacity={.35} strokeWidth={3}/>
  {[-88,76].map(y=>Array.from({length:18},(_,i)=><rect key={`${y}-${i}`} x={-w/2+18+i*((w-36)/18)} y={y} width={18} height={12} rx={3} fill={C.ivory} opacity={.18}/>))}
  {Array.from({length:n},(_,k)=>{const x=x0+k*(fw+gap),dev=smooth(a*n-k,0,1);return <g key={k}>
   <rect x={x} y={-fh/2} width={fw} height={fh} rx={6} fill="#07050B" stroke={C.lavender} strokeOpacity={.25} strokeWidth={2}/>
   <clipPath id={`chrono-${k}`}><rect x={x} y={-fh/2} width={fw} height={fh} rx={6}/></clipPath>
   <g clipPath={`url(#chrono-${k})`} opacity={dev}><rect x={x} y={-fh/2} width={fw} height={fh} fill={C.lavender} opacity={.06}/>
    <g transform={`translate(${x+fw/2},${-6}) scale(.19)`}><Cat t={t} a={k/(n-1)} mono detail={0} streaks={false}/></g></g>
  </g>;})}
 </g>;
}

/** Inner ear: three fluid-filled canals and the vestibule; active makes the fluid move and sends a pulse down the nerve. */
export function InnerEar({t,a}:{t:number;a:number}){
 const canals=["M -6 -10 C -40 -150, -150 -150, -150 -60 C -150 0, -70 10, -30 0","M -20 10 C -120 40, -190 120, -120 150 C -70 168, -30 90, -10 40","M -30 20 C -120 -10, -190 30, -150 64 C -110 92, -40 70, -16 40"];
 const cochlea="M 30 40 C 90 30, 120 90, 90 120 C 60 150, 20 120, 36 92 C 50 70, 80 86, 72 104";
 const tube=(d:string,k:number)=><g key={k}>
  <path d={d} stroke="#3A2264" strokeWidth={34} fill="none" strokeLinecap="round"/>
  <path d={d} stroke={k===3?"#B7A3D6":C.purple} strokeWidth={22} fill="none" strokeLinecap="round"/>
  <path d={d} stroke={C.lavender} strokeOpacity={.45} strokeWidth={6} fill="none" strokeLinecap="round" transform="translate(-3,-5)"/>
  {k<3&&<path d={d} stroke={C.yellow} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray="6 26" strokeDashoffset={-t*90} opacity={a}/>}
 </g>;
 const pulse=(t*1.4)%1;
 return <g transform="translate(30,-10)">
  <circle cx={-40} cy={10} r={150} fill="url(#glow-1)" opacity={.25*a}/>
  {canals.map(tube)}{tube(cochlea,3)}
  <path d="M 40 -6 C 90 -30, 130 -40, 170 -44" stroke="#4E4F62" strokeWidth={12} fill="none" strokeLinecap="round"/>
  <path d="M 40 -6 C 90 -30, 130 -40, 170 -44" stroke={C.yellow} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray="1 200" strokeDashoffset={-pulse*200} opacity={a}/>
  <ellipse cx={4} cy={14} rx={52} ry={42} fill="#5B3A94"/><ellipse cx={-6} cy={4} rx={44} ry={32} fill={C.purple}/><ellipse cx={-16} cy={-6} rx={18} ry={10} fill={C.lavender} opacity={.5}/>
  {Array.from({length:5},(_,i)=>{const x=-22+i*11,bend=a*10*Math.sin(t*3+i*.5);return <path key={i} d={`M ${x} 34 Q ${x+bend*.5} 22 ${x+bend} 12`} stroke={C.ivory} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={.55+.45*a}/>;})}
 </g>;
}

type Keyed={activeKeys?:{at:number;value:number}[];enterAt?:number};
/** Spin angle integrates the speed over time, so a change of speed never jumps the pose. */
export function spinAngle(t:number,o:Keyed,dur=.9){
 const keys=o.activeKeys??[],start=Math.min(t,o.enterAt??0),dt=1/30,omega=(v:number)=>lerp(1.7,6.2,v);
 let angle=0;for(let s=start;s<t;s+=dt){const h=Math.min(dt,t-s);angle+=omega(keyed(s+h/2,keys,0,dur,easeSine))*h;}
 return angle;
}
/** Person on a swivel stool holding two weights: active 0 arms wide and a slow turn, 1 arms pulled in and a fast spin. */
export function SpinStool({t,a,o}:{t:number;a:number;o:Keyed}){
 const th=spinAngle(t,o),cs=Math.cos(th),sn=Math.sin(th),speed=lerp(1.7,6.2,a)/6.2;
 const reach=lerp(150,34,a),drop=lerp(0,34,a),fwd=lerp(0,40,a);
 const proj=(lx:number,lz:number)=>({x:lx*cs+lz*sn,z:-lx*sn+lz*cs});
 const arm=(s:number)=>{const sh=proj(s*36,0),el=proj(s*lerp(96,30,a),lerp(0,34,a)),hd=proj(s*(36+reach)*(1-a*.55),fwd);
  return {z:(sh.z+hd.z)/2,node:<g key={s}><polyline points={pts([[sh.x,-86],[el.x,-80+drop*.6],[hd.x,-82+drop]])} stroke={s>0?"#5B3A94":C.purple} strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
   <rect x={hd.x-26} y={-94+drop} width={52} height={22} rx={6} fill="#3A3B4C"/><rect x={hd.x-30} y={-100+drop} width={12} height={34} rx={4} fill={C.yellow}/><rect x={hd.x+18} y={-100+drop} width={12} height={34} rx={4} fill={C.yellow}/></g>};};
 const legs=[-1,1].map(s=>{const hip=proj(s*20,0),knee=proj(s*22,70);return {z:knee.z,node:<polyline key={s} points={pts([[hip.x,52],[knee.x,58],[knee.x,150]])} stroke={knee.z>0?"#3A3B4C":"#26273A"} strokeWidth={24} fill="none" strokeLinecap="round" strokeLinejoin="round"/>};});
 const torsoW=60*Math.abs(cs)+34*Math.abs(sn),eyes=[-1,1].map(s=>proj(s*12,30)).filter(e=>e.z>4);
 const arms=[arm(-1),arm(1)],behind=[...arms,...legs].filter(e=>e.z<0),front=[...arms,...legs].filter(e=>e.z>=0);
 return <g>
  <ellipse cx={0} cy={226} rx={140} ry={20} fill="#000" opacity={.45}/>
  {[0,1,2,3,4].map(i=>{const an=i*2*Math.PI/5+.3;return <g key={i}><line x1={0} y1={196} x2={Math.cos(an)*100} y2={206+Math.sin(an)*18} stroke="#3A3B4C" strokeWidth={12} strokeLinecap="round"/><circle cx={Math.cos(an)*100} cy={212+Math.sin(an)*18} r={9} fill="#26273A"/></g>;})}
  <rect x={-9} y={66} width={18} height={132} fill="#4E4F62"/>
  <ellipse cx={0} cy={58} rx={84} ry={20} fill="#2E2F42"/><ellipse cx={0} cy={52} rx={84} ry={18} fill="#4E4F62"/>
  <g opacity={.55*speed}>{[0,1,2].map(k=><path key={k} d={`M ${-170-k*16} ${-60+k*30} Q 0 ${-20+k*40} ${170+k*16} ${-60+k*30}`} stroke={C.lavender} strokeWidth={4} fill="none" strokeDasharray="30 40" strokeDashoffset={-t*300*speed} opacity={.6-.15*k}/>)}</g>
  {behind.sort((p,q)=>p.z-q.z).map(e=>e.node)}
  <polygon points={pts([[-torsoW/2-6,-96],[torsoW/2+6,-96],[torsoW/2,50],[-torsoW/2,50]])} fill="#5B3A94"/>
  <polygon points={pts([[-torsoW/2-6,-96],[(torsoW/2+6)*cs*.6,-96],[(torsoW/2)*cs*.6,50],[-torsoW/2,50]])} fill={C.purple}/>
  <circle cx={0} cy={-138} r={36} fill="#E8C9A8"/><path d={`M -36 -142 A 36 36 0 0 1 36 -142 L ${30+10*sn} -150 Q 0 -168 ${-30+10*sn} -150 Z`} fill="#3A2416"/>
  {eyes.map((e,i)=><circle key={i} cx={e.x} cy={-136} r={4.5} fill="#120C1D"/>)}
  {front.sort((p,q)=>p.z-q.z).map(e=>e.node)}
 </g>;
}
