import React from "react";
import brand from "../video-design/brand.json";
import {keyed,easeSine,type IllustratedTimeline} from "../src/lib/illustrated";
import {QR_KEY_SECONDS,type QrKind} from "../src/lib/illustrated-catalog-qr";

// Prepared objects for the "why a torn QR code still scans" explainer (2026-10-20). The hero symbol is a real
// version-2 QR layout (25×25, level Q, mask 0): function patterns, zig-zag byte placement and Reed–Solomon check
// bytes are computed here once, so the coloured bytes, the snake order and the restored modules are true to the
// standard. The payload starts with the terminator, so a phone pointed at the film reads an empty message.
// Illustrations, not to scale. Every value derives from the frame time and the keyed state; no randomness.
const C=brand.colors;
export type TimedObject=IllustratedTimeline["objects"][number];
export type QrArtProps={kind:string;o:TimedObject;t:number;a:number;xray:number;uid:string;overlay?:boolean};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number,a:number,b:number)=>{const x=clamp01((v-a)/(b-a));return x*x*(3-2*x);};
/** Rise over [a,b], fall over [c,d]. */
const win=(v:number,a:number,b:number,c:number,d:number)=>smooth(v,a,b)*(1-smooth(v,c,d));
const lerp=(a:number,b:number,k:number)=>a+(b-a)*k;
const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const pts=(p:number[][])=>p.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const rgb=(c:string)=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const hex=(v:number[])=>"#"+v.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,"0")).join("");
const mix=(a:string,b:string,k:number)=>{const x=rgb(a),y=rgb(b);return hex(x.map((v,i)=>v+(y[i]-v)*clamp01(k)));};
const D=Math.PI/180;
type Keyed={activeKeys?:{at:number;value:number}[];enterAt?:number};
const INK="#120C1D";
const METAL={hi:"#7C7A92",top:"#666882",mid:"#4E4F62",lo:"#3A3B4C",dark:"#26273A",deep:"#1D1628"};
const YEL={light:C.yellow,dark:"#C99A2E",top:C.yellowLine};
const LAV={light:C.lavender,dark:"#A68BD0",top:"#F3EBFD"};
const PINK={light:C.pink,dark:"#8E1C38"};
const GRN={light:C.green,dark:"#3F9A28"};
function inside(poly:number[][],x:number,y:number){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
/** Rounded rectangle path. */
const rrect=(x:number,y:number,w:number,h:number,r:number)=>{const q=Math.min(r,w/2,h/2),f=(v:number)=>v.toFixed(1);
 return `M${f(x+q)} ${f(y)}H${f(x+w-q)}A${f(q)} ${f(q)} 0 0 1 ${f(x+w)} ${f(y+q)}V${f(y+h-q)}A${f(q)} ${f(q)} 0 0 1 ${f(x+w-q)} ${f(y+h)}H${f(x+q)}A${f(q)} ${f(q)} 0 0 1 ${f(x)} ${f(y+h-q)}V${f(y+q)}A${f(q)} ${f(q)} 0 0 1 ${f(x+q)} ${f(y)}Z`;};

/* ───────────── Shared drawing helpers ───────────── */
function Shadow({w,y,k=1}:{w:number;y:number;k?:number}){return <ellipse cx={0} cy={y} rx={w*.5} ry={Math.min(16,Math.max(7,w*.034))} fill="#000" opacity={.45*k}/>;}
/** Quad (TL, TR, BR, BL) in two tones split along the TR–BL diagonal: light from the top left. */
function Quad({p,light,dark}:{p:number[][];light:string;dark:string}){
 return <><polygon points={pts([p[0],p[1],p[3]])} fill={light} stroke={light} strokeWidth={.7} strokeLinejoin="round"/><polygon points={pts([p[1],p[2],p[3]])} fill={dark} stroke={dark} strokeWidth={.7} strokeLinejoin="round"/></>;
}
/** Extruded polygon (front face clockwise on screen) whose depth runs up-right: the visible walls first
 *  (walls facing up take the top colour, walls facing right the side colour), then the front face. */
function Prism({poly,d,face,top,side,only}:{poly:number[][];d:[number,number];face:string;top:string;side:string;only?:number[]}){
 const walls=poly.map((p,i)=>{const q=poly[(i+1)%poly.length],ex=q[0]-p[0],ey=q[1]-p[1],len=Math.hypot(ex,ey)||1,nx=ey/len,ny=-ex/len;
  if(nx*d[0]+ny*d[1]<=.01||only&&!only.includes(i))return null;const c=mix(side,top,clamp01(-ny*1.2));
  return <polygon key={i} points={pts([p,q,[q[0]+d[0],q[1]+d[1]],[p[0]+d[0],p[1]+d[1]]])} fill={c} stroke={c} strokeWidth={.7} strokeLinejoin="round"/>;});
 return <>{walls}<polygon points={pts(poly)} fill={face}/></>;
}
/** Box: front rectangle with its top and right faces. */
function Box({x,y,w,h,d,front,top,side}:{x:number;y:number;w:number;h:number;d:[number,number];front:{light:string;dark:string};top:string;side:string}){
 return <>
  <polygon points={pts([[x,y],[x+w,y],[x+w+d[0],y+d[1]],[x+d[0],y+d[1]]])} fill={top} stroke={top} strokeWidth={.7}/>
  <polygon points={pts([[x+w,y],[x+w,y+h],[x+w+d[0],y+h+d[1]],[x+w+d[0],y+d[1]]])} fill={side} stroke={side} strokeWidth={.7}/>
  <Quad p={[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]} light={front.light} dark={front.dark}/>
 </>;
}
function Check({x,y,k,r=30}:{x:number;y:number;k:number;r?:number}){
 if(k<=.003)return null;
 return <g opacity={clamp01(k*1.6)} transform={`translate(${x},${y}) scale(${.55+.45*k})`}>
  <circle r={r*1.3} fill={C.green} opacity={.2}/><circle r={r} fill={C.green}/>
  <path d={`M ${r} 0 A ${r} ${r} 0 0 1 ${-r*.7} ${r*.7}`} fill="none" stroke="#3F9A28" strokeWidth={r*.16} opacity={.6}/>
  <polyline points={pts([[-r*.44,r*.02],[-r*.1,r*.34],[r*.46,-r*.3]])} stroke={INK} strokeWidth={r*.21} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
 </g>;
}
/** Faceted gem used as a point or a node: four facets lit from the top left. */
function Gem({x,y,r,light,dark,k=1}:{x:number;y:number;r:number;light:string;dark:string;k?:number}){
 const p=[[x,y-r],[x+r,y],[x,y+r],[x-r,y]],c=[x,y];
 return <g opacity={k}>
  <polygon points={pts([p[3],p[0],c])} fill={mix(light,"#FFFFFF",.35)}/><polygon points={pts([p[0],p[1],c])} fill={light}/>
  <polygon points={pts([p[1],p[2],c])} fill={dark}/><polygon points={pts([p[2],p[3],c])} fill={mix(light,dark,.5)}/>
 </g>;
}

/* ───────────── QR model: a real version-2 symbol (25×25, level Q, mask 0) ───────────── */
export const QR_N=25;
type Role="finder"|"sep"|"timing"|"align"|"format"|"data"|"rem";
export type QrCell={r:number;c:number;dark:boolean;role:Role;cw:number};
const EXP:number[]=[],LOG:number[]=[];
{let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11D;}for(let i=255;i<512;i++)EXP[i]=EXP[i-255];}
const gmul=(a:number,b:number)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
/** Reed–Solomon check bytes over GF(256) (QR polynomial 0x11D): the remainder of data·xⁿ divided by Π(x−αⁱ). */
export function rsCheck(data:number[],n:number):number[]{
 let gen=[1];
 for(let i=0;i<n;i++){const next=new Array(gen.length+1).fill(0);for(let j=0;j<gen.length;j++){next[j]^=gen[j];next[j+1]^=gmul(gen[j],EXP[i]);}gen=next;}
 const ec=new Array(n).fill(0);
 for(const b of data){const f=b^ec[0];ec.shift();ec.push(0);for(let j=0;j<n;j++)ec[j]^=gmul(gen[j+1],f);}
 return ec;
}
/** The full codeword polynomial at αⁱ: zero for every i below the number of check bytes. */
export function rsSyndrome(word:number[],i:number){let s=0;for(const b of word)s=gmul(s,EXP[i])^b;return s;}
/** 22 data bytes (the first nibble is the terminator, so the symbol carries an empty message) and 22 check bytes. */
export const QR_DATA=Array.from({length:22},(_,i)=>i===0?Math.floor(hash(.37)*16):Math.floor(hash(i*7.31+2.2)*256));
export const QR_WORDS=[...QR_DATA,...rsCheck(QR_DATA,22)];
const FINDERS:[number,number][]=[[0,0],[0,QR_N-7],[QR_N-7,0]];
function buildQr(){
 const N=QR_N,grid:(QrCell|null)[][]=[...Array(N)].map(()=>Array(N).fill(null));
 const fn=(r:number,c:number,dark:boolean,role:Role)=>{if(r<0||c<0||r>=N||c>=N)return;grid[r][c]={r,c,dark,role,cw:-1};};
 for(const [R,Cc] of FINDERS)for(let i=-1;i<=7;i++)for(let j=-1;j<=7;j++){const d=Math.max(Math.abs(i-3),Math.abs(j-3));fn(R+i,Cc+j,d<=3&&d!==2,d>=4?"sep":"finder");}
 for(let k=8;k<N-8;k++){fn(6,k,k%2===0,"timing");fn(k,6,k%2===0,"timing");}
 for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)fn(18+i,18+j,Math.max(Math.abs(i),Math.abs(j))!==1,"align");
 // Format information: level Q (11), mask 0, BCH(15,5) with the 0x5412 mask, both copies, plus the dark module.
 const data=(3<<3)|0;let rem=data;for(let i=0;i<10;i++)rem=(rem<<1)^((rem>>>9)*0x537);
 const bits=((data<<10)|rem)^0x5412,bit=(i:number)=>((bits>>>i)&1)===1;
 for(let i=0;i<=5;i++)fn(i,8,bit(i),"format");
 fn(7,8,bit(6),"format");fn(8,8,bit(7),"format");fn(8,7,bit(8),"format");
 for(let i=9;i<15;i++)fn(8,14-i,bit(i),"format");
 for(let i=0;i<8;i++)fn(8,N-1-i,bit(i),"format");
 for(let i=8;i<15;i++)fn(N-15+i,8,bit(i),"format");
 fn(N-8,8,true,"format");
 // Zig-zag placement: two columns at a time from the bottom right, up then down, skipping the timing column.
 let i=0;const total=QR_WORDS.length*8;
 for(let right=N-1;right>=1;right-=2){if(right===6)right=5;
  for(let v=0;v<N;v++)for(let j=0;j<2;j++){const c=right-j,up=((right+1)&2)===0,r=up?N-1-v:v;
   if(grid[r][c])continue;
   if(i<total){grid[r][c]={r,c,dark:((QR_WORDS[i>>3]>>(7-(i&7)))&1)===1,role:"data",cw:i>>3};i++;}
   else grid[r][c]={r,c,dark:false,role:"rem",cw:-1};
  }}
 for(const row of grid)for(const cell of row)if(cell&&(cell.role==="data"||cell.role==="rem")&&(cell.r+cell.c)%2===0)cell.dark=!cell.dark;
 return grid as QrCell[][];
}
export const QR_GRID=buildQr();
export const QR_CELLS=QR_GRID.flat();
const CW_CELLS:QrCell[][]=Array.from({length:QR_WORDS.length},()=>[]);
for(const c of QR_CELLS)if(c.cw>=0)CW_CELLS[c.cw].push(c);
/** Byte centres in module units, in placement order: the snake from the bottom right. */
export const QR_SNAKE=CW_CELLS.map(cells=>[cells.reduce((s,c)=>s+c.c+.5,0)/cells.length,cells.reduce((s,c)=>s+c.r+.5,0)/cells.length]);
const blob=(cx:number,cy:number,R:number,seed:number,n=18)=>Array.from({length:n},(_,i)=>{const an=i/n*2*Math.PI,k=1+.13*Math.sin(3*an+seed)+.08*Math.sin(5*an+seed*2)+.07*(hash(seed*13+i)-.5);return [cx+Math.cos(an)*R*k,cy+Math.sin(an)*R*k];});
const QZ=2;
/** Damage shapes in module units (code origin top left): the coffee stain over the data field, the small hook
 *  stain on the left, and the torn bottom-right corner (no finder there). */
export const QR_STAIN=blob(15.2,13.6,5.4,1.7),QR_STAIN_HOOK=blob(5.4,12.6,3.4,4.1);
const TEAR_R=[25+QZ,38.5-25-QZ],TEAR_B=[38.5-25-QZ,25+QZ];
const JAG=Array.from({length:8},(_,i)=>{const k=(i+1)/9,o=(hash(i*3.3+1)-.5)*1.3;return [lerp(TEAR_R[0],TEAR_B[0],k)+o*.707,lerp(TEAR_R[1],TEAR_B[1],k)+o*.707];});
export const QR_TEAR=[TEAR_R,[25+QZ,25+QZ],TEAR_B,...[...JAG].reverse()];
const QR_MAIN=[[-QZ,-QZ],[25+QZ,-QZ],TEAR_R,...JAG,TEAR_B,[-QZ,25+QZ]];
type Lost=QrCell&{u:number};
/** Modules whose centres lie under a damage shape (finders are never inside), ordered by byte for the repair wave. */
export function lostCells(poly:number[][]):Lost[]{
 const list=QR_CELLS.filter(c=>c.role!=="finder"&&inside(poly,c.c+.5,c.r+.5));
 list.sort((x,y)=>(x.cw<0?99:x.cw)-(y.cw<0?99:y.cw)||x.r-y.r||x.c-y.c);
 return list.map((c,i)=>({...c,u:list.length>1?i/(list.length-1):0}));
}
const LOST_STAIN=lostCells(QR_STAIN),LOST_TEAR=lostCells(QR_TEAR);

/* ───────────── Hero QR code ───────────── */
const M=16,FACE=QR_N*M+2*QZ*M,FX=-243,FY=-238,X0=FX+QZ*M,Y0=FY+QZ*M,DEP:[number,number]=[20,-16];
const mpx=(p:number[])=>[X0+p[0]*M,Y0+p[1]*M];
const FULL_PX=[[FX,FY],[FX+FACE,FY],[FX+FACE,FY+FACE],[FX,FY+FACE]],MAIN_PX=QR_MAIN.map(mpx),PIECE_PX=QR_TEAR.map(mpx);
/** The healing corner reaches 1.5 px into the sheet, so the overlap shows the same modules and no seam remains. */
const HEAL_PX=PIECE_PX.map((p,i)=>i===0?[p[0],p[1]-1.5]:i===1?p:i===2?[p[0]-1.5,p[1]]:[p[0]-1.1,p[1]-1.1]);
const PIECE_C=PIECE_PX.reduce((m,p)=>[m[0]+p[0]/PIECE_PX.length,m[1]+p[1]/PIECE_PX.length],[0,0]);
/** Dark modules (finders and the alignment square are drawn as shapes) as one path, module m from (ox,oy). */
function darkPath(m:number,ox:number,oy:number){const g=m*.07;return QR_CELLS.filter(c=>c.dark&&c.role!=="finder"&&c.role!=="align").map(c=>rrect(ox+c.c*m+g,oy+c.r*m+g,m-2*g,m-2*g,m*.24)).join("");}
const HERO_DARK=darkPath(M,X0,Y0),MINI_M=5,MINI_O=-QR_N*MINI_M/2,MINI_DARK=darkPath(MINI_M,MINI_O,MINI_O);
const TINT_D=CW_CELLS.map(cells=>cells.map(c=>`M${X0+c.c*M} ${Y0+c.r*M}h${M}v${M}h${-M}z`).join(""));
const OUTLINE_D=(()=>{const at=(r:number,c:number)=>r<0||c<0||r>=QR_N||c>=QR_N?-2:QR_GRID[r][c].cw;let s="";
 for(const cell of QR_CELLS){if(cell.cw<0)continue;const x=X0+cell.c*M,y=Y0+cell.r*M;
  if(at(cell.r-1,cell.c)!==cell.cw)s+=`M${x} ${y}h${M}`;if(at(cell.r+1,cell.c)!==cell.cw)s+=`M${x} ${y+M}h${M}`;
  if(at(cell.r,cell.c-1)!==cell.cw)s+=`M${x} ${y}v${M}`;if(at(cell.r,cell.c+1)!==cell.cw)s+=`M${x+M} ${y}v${M}`;}
 return s;})();
/** Finder "eyes" and the alignment square as rounded rings. */
function Eyes({m,ox,oy,ink=INK}:{m:number;ox:number;oy:number;ink?:string}){
 return <g fill={ink}>
  {FINDERS.map(([R,Cc],i)=>{const x=ox+Cc*m,y=oy+R*m;return <g key={i}>
   <path d={rrect(x+m*.07,y+m*.07,7*m-m*.14,7*m-m*.14,m*1.4)+rrect(x+m,y+m,5*m,5*m,m*.95)} fillRule="evenodd"/>
   <path d={rrect(x+2*m,y+2*m,3*m,3*m,m*.75)}/></g>;})}
  <path d={rrect(ox+16*m+m*.07,oy+16*m+m*.07,5*m-m*.14,5*m-m*.14,m*1.1)+rrect(ox+17*m,oy+17*m,3*m,3*m,m*.6)} fillRule="evenodd"/>
  <path d={rrect(ox+18*m+m*.1,oy+18*m+m*.1,m*.8,m*.8,m*.3)}/>
 </g>;
}
/** Hero states. rows 1 = explanation with a coffee stain, rows 2 = the same with a torn corner,
 *  rows 3 = hook (stain → torn corner → logo, no markup), rows 4 = logo only. */
export function qrCodeState(a:number,rows=1){
 const zero={finders:0,struct:0,bytes:0,stain:0,tear:0,heal:0,lost:0,restore:0,clean:0,logo:0,ring:0,check:0};
 if(rows===3)return {...zero,stain:smooth(a,.04,.3),tear:smooth(a,.37,.63),logo:smooth(a,.7,.94),check:smooth(a,.84,1)};
 if(rows===4)return {...zero,logo:smooth(a,.05,.45),ring:smooth(a,.25,.45)*(1-.5*smooth(a,.8,1)),check:smooth(a,.55,.95)};
 const out=smooth(a,.82,.98);
 return {...zero,
  finders:smooth(a,.03,.17)*(1-smooth(a,.24,.4)),
  struct:smooth(a,.08,.2)*(1-smooth(a,.24,.4)),
  bytes:smooth(a,.22,.4)*(1-out),
  stain:rows===2?0:smooth(a,.42,.58)*(1-out),
  tear:rows===2?smooth(a,.42,.6):0,heal:rows===2?out:0,
  lost:smooth(a,.5,.6),restore:smooth(a,.62,.8),clean:out,
  logo:smooth(a,.84,1),check:smooth(a,.9,1)};
}
/** Byte k tints in placement order (a wave along the snake) and clears with the logo step. */
export const qrTint=(a:number,k:number)=>smooth(a,.22+.1*k/43,.3+.1*k/43)*(1-smooth(a,.82,.98));
/** Lost module u (0..1 in byte order) is redrawn from the check bytes between 0.62 and 0.8. */
export const cellRestore=(a:number,u:number)=>smooth(a,.62+.1*u,.7+.1*u);
const BADGE=mpx([12.5,12.5]);
function Badge({k,r=70}:{k:number;r?:number}){
 if(k<=.003)return null;
 const oct=Array.from({length:8},(_,i)=>[Math.cos((22.5+45*i)*D)*r*.82,Math.sin((22.5+45*i)*D)*r*.82]);
 const star=Array.from({length:8},(_,i)=>{const rad=i%2?r*.17:r*.56,an=(i*45-90)*D;return [Math.cos(an)*rad,Math.sin(an)*rad];});
 return <g opacity={clamp01(k*1.8)} transform={`translate(${BADGE[0]},${BADGE[1]}) scale(${.55+.45*k}) rotate(${(1-k)*-40})`}>
  <circle r={r+6} fill="#000" opacity={.12}/>
  <circle r={r} fill={C.ivory}/><circle r={r} fill="none" stroke="#D9D2C0" strokeWidth={3}/>
  {oct.map((p,i)=>{const q=oct[(i+1)%8],mid=(22.5+45*i+22.5)*D,lit=clamp01(.5+.5*Math.cos(mid-(-135*D)));const c=mix("#4B2C80",C.purple,lit);return <polygon key={i} points={pts([[0,0],p,q])} fill={c} stroke={c} strokeWidth={.7}/>;})}
  {star.map((p,i)=>{const q=star[(i+1)%8],lit=i<2||i>5;return <polygon key={i} points={pts([[0,0],p,q])} fill={lit?C.yellowLine:i%2?YEL.dark:C.yellow}/>;})}
  <circle r={r*.82} fill="none" stroke={C.lavender} strokeOpacity={.4} strokeWidth={3}/>
 </g>;
}
function Stain({poly,k,t}:{poly:number[][];k:number;t:number}){
 if(k<=.003)return null;
 const c=poly.reduce((m,p)=>[m[0]+p[0]/poly.length,m[1]+p[1]/poly.length],[0,0]),s=.35+.65*Math.sqrt(k);
 const at=(p:number[],f=1)=>mpx([c[0]+(p[0]-c[0])*s*f,c[1]+(p[1]-c[1])*s*f]);
 const R=Math.max(...poly.map(p=>Math.hypot(p[0]-c[0],p[1]-c[1])));
 const drops=[0,1,2,3].map(i=>{const an=hash(i*5.1+c[0])*6.3,d=R*(1.08+.25*hash(i*2.7))*s;return {p:mpx([c[0]+Math.cos(an)*d,c[1]+Math.sin(an)*d]),r:(3+5*hash(i*9.1))*k};});
 return <g opacity={clamp01(k*1.5)}>
  <polygon points={pts(poly.map(p=>at(p)))} fill="#7A4524" opacity={.62} strokeLinejoin="round"/>
  <polygon points={pts(poly.map(p=>at(p,.68)))} fill="#93603A" opacity={.32}/>
  <polygon points={pts(poly.map(p=>at(p)))} fill="none" stroke="#4A230E" strokeWidth={6} opacity={.55} strokeLinejoin="round"/>
  <polygon points={pts(poly.map(p=>at(p,.93)))} fill="none" stroke="#B07A4E" strokeWidth={2} opacity={.35+.1*Math.sin(t*1.3)}/>
  {drops.map((d,i)=><circle key={i} cx={d.p[0]} cy={d.p[1]} r={d.r} fill="#6A3A1C" opacity={.6}/>)}
 </g>;
}
const BRACKET=(x:number,y:number,sx:number,sy:number,l:number)=>`M${x.toFixed(1)} ${(y+sy*l).toFixed(1)}V${y.toFixed(1)}H${(x+sx*l).toFixed(1)}`;
function QrCode({o,t,a,xray,uid,overlay}:{o:TimedObject;t:number;a:number;xray:number;uid:string;overlay?:boolean}){
 const rows=Math.max(1,Math.min(4,Math.round(o.rows||1))),v=qrCodeState(a,rows);
 if(overlay)return xray>.01?<QrXray t={t} xray={xray}/>:null;
 const torn=v.tear>.001&&v.heal<.999,mainId=`qrm-${uid}`,pieceId=`qrp-${uid}`,healId=`qrh-${uid}`,glowId=`qrg-${uid}`;
 const lost=rows===1?LOST_STAIN:rows===2?LOST_TEAR:[];
 const grid=<g>
  <polygon points={pts([[FX+FACE,FY],[FX+FACE,FY+FACE],[FX,FY+FACE]])} fill="#E2DCC0" opacity={.5}/>
  {v.bytes>.002&&<g>{TINT_D.map((d,k)=>{const on=qrTint(a,k);return on>.003?<path key={k} d={d} fill={k<22?(k%2?"#F7D978":C.yellow):(k%2?C.lavender:"#C6ABF0")} opacity={.9*on}/>:null;})}
   <path d={OUTLINE_D} stroke={INK} strokeOpacity={.4*v.bytes} strokeWidth={1.6} fill="none"/></g>}
  <path d={HERO_DARK} fill={INK}/>
  <Eyes m={M} ox={X0} oy={Y0}/>
 </g>;
 const sheenX=-700+((t*80)%1500);
 const fall=v.tear,piece=`translate(${10*fall},${56*fall}) rotate(${-14*fall},${PIECE_C[0]},${PIECE_C[1]})`;
 const restoreGlow=v.restore*(1-v.clean),regionC=lost.length?lost.reduce((m,c)=>[m[0]+(c.c+.5)/lost.length,m[1]+(c.r+.5)/lost.length],[0,0]):[12.5,12.5];
 return <g>
  <defs>
   <clipPath id={mainId}><polygon points={pts(torn?MAIN_PX:FULL_PX)}/></clipPath>
   <clipPath id={pieceId}><polygon points={pts(PIECE_PX)}/></clipPath>
   <clipPath id={healId}><polygon points={pts(HEAL_PX)}/></clipPath>
   <radialGradient id={glowId}><stop offset="0" stopColor={C.green} stopOpacity=".55"/><stop offset="1" stopColor={C.green} stopOpacity="0"/></radialGradient>
  </defs>
  <Shadow w={520} y={262}/>
  <polygon points={pts([[-256,214],[240,214],[260,198],[-236,198]])} fill={METAL.top}/>
  <Prism poly={torn?MAIN_PX:FULL_PX} d={DEP} face={C.ivory} top="#FFFFF7" side="#B4AE94"/>
  <g clipPath={`url(#${mainId})`}>
   {grid}
   <polygon points={pts([[sheenX,FY],[sheenX+64,FY],[sheenX-136,FY+FACE],[sheenX-200,FY+FACE]])} fill="#FFFFFF" opacity={.13}/>
   <Stain poly={rows===3?QR_STAIN_HOOK:QR_STAIN} k={v.stain} t={t}/>
  </g>
  {torn&&<polyline points={pts([MAIN_PX[2],...MAIN_PX.slice(3,3+JAG.length),MAIN_PX[3+JAG.length]])} fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinejoin="round" opacity={.8*(1-v.heal)}/>}
  {v.heal>.002&&<g opacity={v.heal}><Prism poly={HEAL_PX} d={DEP} face={C.ivory} top="#FFFFF7" side="#B4AE94" only={[0]}/><g clipPath={`url(#${healId})`}>{grid}</g></g>}
  <polygon points={pts([[-256,214],[240,214],[240,258],[-256,258]])} fill={METAL.mid}/>
  <polygon points={pts([[-256,214],[-10,214],[-40,258],[-256,258]])} fill={METAL.top} opacity={.55}/>
  <polygon points={pts([[240,214],[260,198],[260,242],[240,258]])} fill={METAL.dark}/>
  <rect x={-256} y={214} width={496} height={4} fill={C.lavender} opacity={.25}/>
  {torn&&fall<.995&&<g transform={piece} opacity={1-smooth(fall,.2,.72)}>
   <Prism poly={PIECE_PX} d={DEP} face={C.ivory} top="#FFFFF7" side="#B4AE94"/>
   <g clipPath={`url(#${pieceId})`}>{grid}</g>
  </g>}
  {v.struct>.003&&<g opacity={v.struct}>
   <rect x={X0+8*M} y={Y0+6*M+2} width={9*M} height={M-4} rx={5} fill={C.yellow} opacity={.5}/>
   <rect x={X0+6*M+2} y={Y0+8*M} width={M-4} height={9*M} rx={5} fill={C.yellow} opacity={.5}/>
   <path d={rrect(X0+16*M-5,Y0+16*M-5,5*M+10,5*M+10,M*1.2)} fill="none" stroke={C.purple} strokeWidth={4}/>
  </g>}
  {v.finders>.003&&FINDERS.map(([R,Cc],i)=>{const x=X0+Cc*M,y=Y0+R*M,s=7*M,f=v.finders,g=7+18*(1-f),l=26,pulse=.75+.25*Math.sin(t*3+i);
   return <g key={i} opacity={f}>
    <path d={rrect(x+M,y+M,5*M,5*M,M*.95)+rrect(x+2*M,y+2*M,3*M,3*M,M*.75)} fillRule="evenodd" fill={C.lavender} opacity={.85}/>
    <path d={rrect(x-5,y-5,s+10,s+10,M*1.6)} fill="none" stroke={C.purple} strokeWidth={12} opacity={.25*pulse}/>
    <path d={BRACKET(x-g,y-g,1,1,l)+BRACKET(x+s+g,y-g,-1,1,l)+BRACKET(x+s+g,y+s+g,-1,-1,l)+BRACKET(x-g,y+s+g,1,-1,l)} stroke={C.purple} strokeWidth={6} fill="none" strokeLinecap="round"/>
   </g>;})}
  {restoreGlow>.003&&<ellipse cx={mpx(regionC)[0]} cy={mpx(regionC)[1]} rx={124} ry={118} fill={`url(#${glowId})`} opacity={restoreGlow*(.8+.2*Math.sin(t*4))}/>}
  {lost.length>0&&v.lost>.002&&<g>{lost.map((c,i)=>{const rs=cellRestore(a,c.u),pink=v.lost*(1-rs),green=rs*(1-v.clean),x=X0+c.c*M,y=Y0+c.r*M;
   return <g key={i}>
    {pink>.003&&<rect x={x+2.5} y={y+2.5} width={M-5} height={M-5} rx={3} fill={C.pink} fillOpacity={.22} stroke={C.pink} strokeWidth={1.8} opacity={pink}/>}
    {green>.003&&(c.dark?<rect x={x+1.2} y={y+1.2} width={M-2.4} height={M-2.4} rx={4} fill={C.green} opacity={green}/>
     :<rect x={x+3} y={y+3} width={M-6} height={M-6} rx={3} fill="none" stroke={C.green} strokeWidth={1.6} opacity={.6*green}/>)}
   </g>;})}</g>}
  {v.ring>.003&&<circle cx={BADGE[0]} cy={BADGE[1]} r={84} fill="none" stroke={mix(C.pink,C.green,v.check)} strokeWidth={5} strokeDasharray="10 9" strokeDashoffset={-t*20} opacity={v.ring}/>}
  <Badge k={v.logo}/>
  <Check x={FX+FACE-6} y={FY+6} k={v.check}/>
 </g>;
}
/** X-ray: byte outlines, the function patterns and the snake of byte order from the bottom right. */
function QrXray({t,xray}:{t:number;xray:number}){
 const snake=QR_SNAKE.map(mpx),s=(t*3.2)%44,i=Math.floor(s),f=s-i,p=snake[i],q=snake[Math.min(43,i+1)],dot=[lerp(p[0],q[0],f),lerp(p[1],q[1],f)];
 const arrows=snake.slice(0,-1).map((p,k)=>{if(k%3!==1)return null;const q=snake[k+1],an=Math.atan2(q[1]-p[1],q[0]-p[0]),m=[(p[0]+q[0])/2,(p[1]+q[1])/2],c=k<21?C.yellow:C.lavender;
  return <polygon key={k} points={pts([[m[0]+Math.cos(an)*10,m[1]+Math.sin(an)*10],[m[0]+Math.cos(an+2.4)*9,m[1]+Math.sin(an+2.4)*9],[m[0]+Math.cos(an-2.4)*9,m[1]+Math.sin(an-2.4)*9]])} fill={c}/>;});
 return <g opacity={xray}>
  <path d={OUTLINE_D} stroke={C.lavender} strokeOpacity={.5} strokeWidth={1.5} fill="none"/>
  {FINDERS.map(([R,Cc],k)=><path key={k} d={rrect(X0+Cc*M-3,Y0+R*M-3,7*M+6,7*M+6,M*1.5)} fill="none" stroke={C.ivory} strokeWidth={3} opacity={.85}/>)}
  <path d={rrect(X0+16*M-3,Y0+16*M-3,5*M+6,5*M+6,M)} fill="none" stroke={C.ivory} strokeWidth={3} opacity={.85}/>
  <line x1={X0+8*M} y1={Y0+6.5*M} x2={X0+17*M} y2={Y0+6.5*M} stroke={C.yellow} strokeWidth={3} strokeDasharray="4 6"/>
  <line x1={X0+6.5*M} y1={Y0+8*M} x2={X0+6.5*M} y2={Y0+17*M} stroke={C.yellow} strokeWidth={3} strokeDasharray="4 6"/>
  <polyline points={pts(snake.slice(0,22))} fill="none" stroke={C.yellow} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={.9}/>
  <polyline points={pts(snake.slice(21))} fill="none" stroke={C.lavender} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={.9}/>
  {arrows}
  <circle cx={snake[0][0]} cy={snake[0][1]} r={8} fill={C.yellow}/>
  <circle cx={dot[0]} cy={dot[1]} r={16} fill={C.ivory} opacity={.25*Math.sin(Math.PI*s/44)}/>
  <circle cx={dot[0]} cy={dot[1]} r={7} fill={C.ivory} opacity={Math.sin(Math.PI*s/44)}/>
 </g>;
}

/* ───────────── Phone scanner ───────────── */
export function scannerState(a:number){return {on:smooth(a,.04,.3),view:smooth(a,.16,.34),lock:smooth(a,.42,.62),scan:smooth(a,.5,.62)*(1-smooth(a,.86,.98)),check:smooth(a,.8,.98)};}
function QrScanner({t,a,uid}:{t:number;a:number;uid:string}){
 const v=scannerState(a),PX=-112,PY=-262,PW=224,PH=452,SX=-100,SY=-246,SW=200,SH=420,cx0=0,cy0=-40;
 const shake=1-.75*v.lock,jx=Math.sin(t*1.3)*4*shake,jy=Math.cos(t*1.07)*3*shake,ang=-14+1.4*Math.sin(t*.8)*shake;
 const code={x:cx0+6+jx,y:cy0-8+jy},rot=(p:number[])=>{const c=Math.cos(ang*D),s=Math.sin(ang*D);return [code.x+p[0]*c-p[1]*s,code.y+p[0]*s+p[1]*c];};
 const H=QR_N*MINI_M/2+3,view=88,corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
 const col=mix(mix(C.ivory,"#B48CF2",v.lock),C.green,v.check),phoneId=`ph-${uid}`,screenId=`sc-${uid}`;
 const scanY=-H+2*H*((t*.85)%1),scanO=v.scan*Math.sin(Math.PI*((t*.85)%1));
 return <g>
  <defs>
   <clipPath id={phoneId}><path d={rrect(PX,PY,PW,PH,36)}/></clipPath>
   <clipPath id={screenId}><path d={rrect(SX,SY,SW,SH,26)}/></clipPath>
   <linearGradient id={`feed-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A2340"/><stop offset=".6" stopColor="#3B3156"/><stop offset="1" stopColor="#1C1630"/></linearGradient>
  </defs>
  <Shadow w={250} y={258}/>
  <g clipPath={`url(#${phoneId})`}>
   <rect x={PX} y={PY} width={PW} height={PH} fill="#45465A"/>
   <polygon points={pts([[PX+PW,PY],[PX+PW,PY+PH],[PX,PY+PH]])} fill="#26273A"/>
   <rect x={PX} y={PY} width={PW} height={10} fill="#7C7A92" opacity={.6}/>
  </g>
  <path d={rrect(PX,PY,PW,PH,36)} fill="none" stroke={C.purpleStroke} strokeOpacity={.55} strokeWidth={3}/>
  <rect x={PX-5} y={PY+96} width={6} height={44} rx={3} fill="#5E5F74"/><rect x={PX-5} y={PY+150} width={6} height={64} rx={3} fill="#5E5F74"/><rect x={PX+PW-1} y={PY+120} width={6} height={70} rx={3} fill="#2E2F42"/>
  <path d={rrect(SX,SY,SW,SH,26)} fill="#07050B"/>
  <g clipPath={`url(#${screenId})`}>
   <g opacity={v.on}>
    <rect x={SX} y={SY} width={SW} height={SH} fill={`url(#feed-${uid})`}/>
    <polygon points={pts([[SX,SY+SH*.68],[SX+SW,SY+SH*.6],[SX+SW,SY+SH],[SX,SY+SH]])} fill="#4A3F66" opacity={.6}/>
    <g transform={`translate(${code.x},${code.y}) rotate(${ang})`}>
     <rect x={-H-9} y={-H-9} width={2*H+18} height={2*H+18} rx={6} fill="#000" opacity={.25} transform="translate(4,6)"/>
     <rect x={-H-9} y={-H-9} width={2*H+18} height={2*H+18} rx={6} fill={C.ivory}/>
     <path d={MINI_DARK} fill={INK}/><Eyes m={MINI_M} ox={MINI_O} oy={MINI_O}/>
     {FINDERS.map(([R,Cc],i)=><path key={i} d={rrect(MINI_O+Cc*MINI_M-3,MINI_O+R*MINI_M-3,7*MINI_M+6,7*MINI_M+6,8)} fill={C.lavender} opacity={.45*v.lock*(1-v.check)}/>)}
     <rect x={-H-9} y={-H-9} width={2*H+18} height={2*H+18} rx={6} fill={C.green} opacity={.3*v.check}/>
     {scanO>.01&&<g opacity={scanO}><rect x={-H-6} y={scanY-10} width={2*H+12} height={20} fill={C.yellow} opacity={.25}/><rect x={-H-6} y={scanY-1.5} width={2*H+12} height={3} fill={C.yellowLine}/></g>}
    </g>
    <rect x={SX} y={SY} width={SW} height={SH} fill="#000" opacity={.28*(1-v.lock)}/>
   </g>
   <g opacity={v.view}>{corners.map(([sx,sy],i)=>{
    const free=[cx0+sx*view,cy0+sy*view],lockP=rot([sx*(H+3),sy*(H+3)]),p=[lerp(free[0],lockP[0],v.lock),lerp(free[1],lockP[1],v.lock)];
    const r=lerp(0,ang,v.lock),fourth=i===2?1-.85*v.lock:1;
    const tr=`translate(${p[0].toFixed(1)},${p[1].toFixed(1)}) rotate(${r.toFixed(2)})`;
    return <g key={i} transform={tr} opacity={fourth}><path d={BRACKET(0,0,-sx,-sy,24)} stroke={col} strokeWidth={14} strokeOpacity={.25} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
     <path d={BRACKET(0,0,-sx,-sy,24)} stroke={col} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round"/></g>;})}</g>
   {v.check>.003&&<g><circle cx={code.x} cy={code.y} r={70*v.check} fill={C.green} opacity={.18*v.check}/><Check x={code.x} y={code.y} k={v.check} r={34}/></g>}
   <g opacity={v.on*.9}><rect x={SX+24} y={SY+SH-62} width={SW-48} height={34} rx={17} fill="#000" opacity={.35}/><circle cx={0} cy={SY+SH-45} r={11} fill={mix(C.ivory,C.green,v.check)}/></g>
   <polygon points={pts([[SX+SW*.55,SY],[SX+SW,SY],[SX+SW,SY+SH*.22]])} fill="#FFFFFF" opacity={.06}/>
  </g>
  <rect x={-34} y={SY+10} width={68} height={18} rx={9} fill="#000"/>
  <polygon points={pts([[-118,184],[118,184],[132,246],[-132,246]])} fill={METAL.mid}/>
  <polygon points={pts([[-118,184],[0,184],[-20,246],[-132,246]])} fill={METAL.top} opacity={.6}/>
  <polygon points={pts([[-104,172],[104,172],[118,184],[-118,184]])} fill={METAL.hi}/>
  <rect x={-132} y={244} width={264} height={6} rx={3} fill={METAL.dark}/>
 </g>;
}

/* ───────────── Row of bytes ───────────── */
export const ROW_DATA=QR_DATA.slice(1,9),ROW_EC=rsCheck(ROW_DATA,6);
const ROW_CRACKED=[2,5,10],BW=46,BH=74,BD:[number,number]=[10,-8],ROW_Y=16;
const rowX=(i:number)=>i<8?-378+i*52:-378+8*52+30+(i-8)*52;
const NODE=[rowX(8)-15,-92];
/** Byte-row states: EC blocks grow from the data (stagger), three blocks crack, then are restored. */
export function codewordState(a:number){
 return {grow:Array.from({length:6},(_,j)=>smooth(a,.1+.03*j,.2+.03*j)),flow:win(a,.06,.16,.36,.46),
  crack:ROW_CRACKED.map((_,k)=>smooth(a,.45+.03*k,.55+.03*k)),fix:ROW_CRACKED.map((_,k)=>smooth(a,.64+.04*k,.74+.04*k)),
  repair:win(a,.6,.68,.82,.9),glow:smooth(a,.86,1)};
}
function CodewordRow({t,a,uid}:{t:number;a:number;uid:string}){
 const v=codewordState(a),bytes=[...ROW_DATA,...ROW_EC];
 const arcs=(color:string,k:number,from:number[],to:number[])=>k>.003&&<g opacity={k}>
  {from.map(i=>{const x=rowX(i)+BW/2,y=ROW_Y-4,d=`M ${x} ${y} Q ${x} ${NODE[1]} ${NODE[0]} ${NODE[1]}`;return <g key={`f${i}`}><path d={d} stroke={color} strokeOpacity={.25} strokeWidth={7} fill="none"/><path d={d} stroke={color} strokeWidth={3.5} strokeDasharray="6 12" strokeDashoffset={-t*40} fill="none" strokeLinecap="round"/></g>;})}
  {to.map(i=>{const x=rowX(i)+BW/2,y=ROW_Y-4,d=`M ${NODE[0]} ${NODE[1]} Q ${x} ${NODE[1]} ${x} ${y}`;return <g key={`t${i}`}><path d={d} stroke={color} strokeOpacity={.25} strokeWidth={7} fill="none"/><path d={d} stroke={color} strokeWidth={3.5} strokeDasharray="6 12" strokeDashoffset={-t*40} fill="none" strokeLinecap="round"/></g>;})}
 </g>;
 const intact=bytes.map((_,i)=>i).filter(i=>!ROW_CRACKED.includes(i));
 const sweep=((t*.32)%1.6)*900-450;
 return <g>
  <defs><linearGradient id={`rowglow-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0"/><stop offset=".5" stopColor="#FFFFFF" stopOpacity=".35"/><stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/></linearGradient>
   {[["y",C.yellow],["l",C.lavender]].map(([k,c])=><radialGradient key={k} id={`rowbloom-${k}-${uid}`}><stop offset="0" stopColor={c} stopOpacity=".7"/><stop offset=".55" stopColor={c} stopOpacity=".26"/><stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient>)}</defs>
  <Shadow w={780} y={126}/>
  <polygon points={pts([[-386,92],[384,92],[394,84],[-376,84]])} fill={METAL.top}/>
  <Quad p={[[-386,92],[384,92],[384,114],[-386,114]]} light={METAL.mid} dark={METAL.lo}/>
  <polygon points={pts([[384,92],[394,84],[394,106],[384,114]])} fill={METAL.dark}/>
  <rect x={-386} y={92} width={770} height={3} fill={C.lavender} opacity={.25}/>
  {v.glow>.003&&<g opacity={v.glow*(.85+.15*Math.sin(t*2.2))}><ellipse cx={-173} cy={ROW_Y+20} rx={215} ry={78} fill={`url(#rowbloom-y-${uid})`}/><ellipse cx={229} cy={ROW_Y+20} rx={160} ry={78} fill={`url(#rowbloom-l-${uid})`}/></g>}
  {arcs(C.lavender,v.flow,[0,1,2,3,4,5,6,7],[8,9,10,11,12,13])}
  {arcs(C.green,v.repair,intact.filter(i=>i%2===0),ROW_CRACKED)}
  {(v.flow>.003||v.repair>.003)&&<g transform={`translate(${NODE[0]},${NODE[1]}) rotate(${t*30})`}><circle r={30} fill={mix(C.purple,C.green,v.repair)} opacity={.22*Math.max(v.flow,v.repair)}/>
   <Gem x={0} y={0} r={20} light={v.repair>v.flow?C.green:C.lavender} dark={v.repair>v.flow?GRN.dark:LAV.dark} k={Math.max(v.flow,v.repair)}/></g>}
  {bytes.map((b,i)=>{const ec=i>=8,g=ec?v.grow[i-8]:1;if(g<=.003)return null;
   const ci=ROW_CRACKED.indexOf(i),cr=ci>=0?v.crack[ci]*(1-v.fix[ci]):0,fx=ci>=0?v.fix[ci]*(1-v.glow):0,base=ec?LAV:YEL;
   const light=mix(mix(base.light,PINK.light,cr),GRN.light,fx),dark=mix(mix(base.dark,PINK.dark,cr),GRN.dark,fx),top=mix(mix(base.top,"#F27A92",cr),"#A6F08A",fx);
   const x=rowX(i)+(cr>0?Math.sin(t*31+i)*1.5*cr:0),h=BH*g,y=ROW_Y+BH-h,split=cr*4;
   return <g key={i}>
    {v.glow>.003&&<g opacity={v.glow*(.85+.15*Math.sin(t*3+i*.7))}><rect x={x-7} y={y-14} width={BW+22} height={h+22} rx={14} fill={base.light} opacity={.22}/><rect x={x-4} y={y-8} width={BW+18} height={h+12} rx={10} fill={base.light} opacity={.25}/></g>}
    <g transform={`translate(${-split},0)`}><Box x={x} y={y} w={BW/2} h={h} d={BD} front={{light,dark:light}} top={top} side={dark}/></g>
    <g transform={`translate(${split},0)`}><Box x={x+BW/2} y={y} w={BW/2} h={h} d={BD} front={{light:mix(light,dark,.45),dark}} top={top} side={dark}/></g>
    {g>.98&&Array.from({length:8},(_,k)=>{const on=((b>>(7-k))&1)===1,bx=x+14+(k%2)*18+(k%2?split:-split),by=y+13+Math.floor(k/2)*16;
     return <g key={k}>
      <circle cx={bx} cy={by} r={5.5} fill={on?INK:"none"} stroke={INK} strokeWidth={2} opacity={1-cr}/>
      {cr>.01&&<circle cx={bx} cy={by} r={5.5} fill="none" stroke={C.ivory} strokeWidth={2} strokeDasharray="3 3" opacity={cr}/>}
     </g>;})}
    {cr>.01&&<polyline points={pts([[x+BW/2+2,y-2],[x+BW/2-5,y+h*.3],[x+BW/2+4,y+h*.55],[x+BW/2-3,y+h*.8],[x+BW/2+1,y+h+1]])} stroke={INK} strokeWidth={3} fill="none" opacity={cr}/>}
    {fx>.01&&<rect x={x-3} y={y-3} width={BW+6} height={h+6} rx={6} fill="none" stroke={C.green} strokeWidth={3} opacity={fx*(.7+.3*Math.sin(t*5))}/>}
   </g>;})}
  {v.glow>.003&&<rect x={sweep-60} y={ROW_Y-10} width={120} height={BH+20} fill={`url(#rowglow-${uid})`} opacity={v.glow}/>}
 </g>;
}

/* ───────────── Reed–Solomon intuition: one curve through the points ───────────── */
const RS_P=(x:number)=>.8+2.4*x-.38*x*x;
const RS_SX=(x:number)=>-262+x*76,RS_SY=(y:number)=>96-y*58;
const RS_LOST=[1,3,5];
/** Curve-board states: data points, the curve drawn through them, extra points on it, three knocked out,
 *  the curve redrawn through the survivors and the missing points returned. */
export function rsState(a:number){
 return {data:[0,1,2].map(k=>smooth(a,.04+.045*k,.13+.045*k)),draw:smooth(a,.24,.4),extra:[0,1,2].map(k=>smooth(a,.42+.035*k,.5+.035*k)),
  knock:RS_LOST.map((_,j)=>smooth(a,.57+.03*j,.66+.03*j)),doubt:smooth(a,.6,.7)*(1-smooth(a,.86,.92)),pulse:win(a,.7,.76,.78,.86),redraw:smooth(a,.76,.9),settle:smooth(a,.9,1)};
}
const curvePts=(x0:number,x1:number)=>{const n=Math.max(2,Math.ceil((x1-x0)/.05));return Array.from({length:n+1},(_,i)=>{const x=x0+(x1-x0)*i/n;return [RS_SX(x),RS_SY(RS_P(x))];});};
function RsCurve({t,a,xray}:{t:number;a:number;xray:number}){
 const v=rsState(a),X0c=.3,X1c=6.6,head=lerp(X0c,X1c,v.draw),reHead=lerp(X0c,X1c,v.redraw);
 const P=[1,2,3,4,5,6].map(x=>({x,sx:RS_SX(x),sy:RS_SY(RS_P(x))}));
 const back=(j:number)=>smooth(reHead,P[RS_LOST[j]].x-.25,P[RS_LOST[j]].x+.05);
 const line=(x1:number,color:string,glow:string,k:number,dash?:string)=>k>.003&&x1>X0c+.01&&<g opacity={k}>
  <polyline points={pts(curvePts(X0c,x1))} fill="none" stroke={glow} strokeWidth={18} strokeOpacity={.2} strokeLinecap="round" strokeLinejoin="round"/>
  <polyline points={pts(curvePts(X0c,x1))} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash}/>
 </g>;
 const headDot=(x:number,k:number,color:string)=>k>.003&&<g opacity={k}><circle cx={RS_SX(x)} cy={RS_SY(RS_P(x))} r={18} fill={color} opacity={.3}/><circle cx={RS_SX(x)} cy={RS_SY(RS_P(x))} r={7} fill="#FFFFFF"/></g>;
 const firstSolid=1-v.doubt;
 return <g>
  <Shadow w={600} y={240}/>
  {[-1,1].map(s=><g key={s}><polygon points={pts([[s*236,150],[s*252,150],[s*268,236],[s*246,236]])} fill={s<0?METAL.mid:METAL.lo}/><rect x={s*257-18} y={232} width={36} height={8} rx={4} fill={METAL.dark}/></g>)}
  <Prism poly={[[-330,-250],[330,-250],[330,150],[-330,150]]} d={[12,-10]} face={METAL.lo} top={METAL.hi} side={METAL.dark}/>
  <Quad p={[[-330,-250],[330,-250],[330,150],[-330,150]]} light="#4A4060" dark="#2E2742"/>
  <rect x={-310} y={-230} width={620} height={360} rx={10} fill="#0E0A18"/>
  <polygon points={pts([[-310,-230],[-140,-230],[-310,-60]])} fill="#FFFFFF" opacity={.025}/>
  {[1,2,3,4,5,6].map(x=><line key={x} x1={RS_SX(x)} y1={RS_SY(0)} x2={RS_SX(x)} y2={RS_SY(5.1)} stroke={C.lavender} strokeOpacity={.08} strokeWidth={2}/>)}
  {[1,2,3,4,5].map(y=><line key={y} x1={RS_SX(0)} y1={RS_SY(y)} x2={RS_SX(7)} y2={RS_SY(y)} stroke={C.lavender} strokeOpacity={.08} strokeWidth={2}/>)}
  <line x1={RS_SX(0)} y1={RS_SY(0)} x2={RS_SX(7.05)} y2={RS_SY(0)} stroke={C.lavender} strokeOpacity={.7} strokeWidth={4} strokeLinecap="round"/>
  <polygon points={pts([[RS_SX(7.25),RS_SY(0)],[RS_SX(7.05),RS_SY(0)-9],[RS_SX(7.05),RS_SY(0)+9]])} fill={C.lavender} opacity={.7}/>
  <line x1={RS_SX(0)} y1={RS_SY(0)} x2={RS_SX(0)} y2={RS_SY(5.25)} stroke={C.lavender} strokeOpacity={.7} strokeWidth={4} strokeLinecap="round"/>
  <polygon points={pts([[RS_SX(0),RS_SY(5.5)],[RS_SX(0)-9,RS_SY(5.25)],[RS_SX(0)+9,RS_SY(5.25)]])} fill={C.lavender} opacity={.7}/>
  {P.map((p,i)=><line key={i} x1={p.sx} y1={RS_SY(0)-7} x2={p.sx} y2={RS_SY(0)+7} stroke={C.lavender} strokeOpacity={.6} strokeWidth={3}/>)}
  {xray>.01&&<g opacity={xray}>{P.map((p,i)=><line key={i} x1={p.sx} y1={p.sy} x2={p.sx} y2={RS_SY(0)} stroke={i<3?C.yellow:C.lavender} strokeWidth={2.5} strokeDasharray="5 7"/>)}</g>}
  {line(head,C.ivory,C.lavender,firstSolid*(1-v.redraw))}
  {line(head,C.lavender,C.lavender,v.doubt*.55*(1-v.redraw),"10 14")}
  {headDot(head,Math.sin(Math.PI*v.draw),C.lavender)}
  {line(reHead,C.ivory,C.green,v.redraw)}
  {headDot(reHead,Math.sin(Math.PI*v.redraw),C.green)}
  {v.settle>.003&&<g opacity={v.settle}>{(()=>{const u=(t*.18)%1,x=lerp(X0c,X1c,u);return <circle cx={RS_SX(x)} cy={RS_SY(RS_P(x))} r={10} fill="#FFFFFF" opacity={.6*Math.sin(Math.PI*u)}/>;})()}</g>}
  {P.map((p,i)=>{const isData=i<3,show=isData?v.data[i]:v.extra[i-3],j=RS_LOST.indexOf(i),kn=j>=0?v.knock[j]:0,ret=j>=0?back(j):0;
   if(show<=.003)return null;
   const tw=.85+.15*Math.sin(t*2.4+i*1.7),base=isData?YEL:LAV,survivor=j<0;
   const fly={x:p.sx+(j===1?-30:40)*kn,y:p.sy+120*kn*kn+20*kn,r:140*kn};
   return <g key={i}>
    {survivor&&v.pulse>.003&&<circle cx={p.sx} cy={p.sy} r={22+26*v.pulse} fill="none" stroke={base.light} strokeWidth={4} opacity={v.pulse}/>}
    {j>=0&&kn>.003&&<g opacity={kn*(1-ret)}><circle cx={p.sx} cy={p.sy} r={19} fill="none" stroke={C.pink} strokeWidth={3.5} strokeDasharray="6 6"/>
     <path d={`M ${p.sx-7} ${p.sy-7} L ${p.sx+7} ${p.sy+7} M ${p.sx+7} ${p.sy-7} L ${p.sx-7} ${p.sy+7}`} stroke={C.pink} strokeWidth={3.5} strokeLinecap="round"/></g>}
    {kn<.995&&<g opacity={show*(1-smooth(kn,.3,.9))} transform={`translate(${fly.x-p.sx},${fly.y-p.sy}) rotate(${fly.r},${p.sx},${p.sy})`}>
     <circle cx={p.sx} cy={p.sy} r={26*show} fill={base.light} opacity={.22*tw}/>
     <Gem x={p.sx} y={p.sy} r={17*(.6+.4*show)} light={base.light} dark={base.dark}/>
    </g>}
    {ret>.003&&<g opacity={ret}><circle cx={p.sx} cy={p.sy} r={30} fill={C.green} opacity={.25*tw}/><Gem x={p.sx} y={p.sy} r={17*(.6+.4*ret)} light={C.green} dark={GRN.dark}/></g>}
   </g>;})}
 </g>;
}

/* ───────────── Error-correction levels ───────────── */
const LEVELS=[7,15,25,30],LV_X=[-165,-55,55,165],LV_W=74,LV_BASE=176;
const MINI9=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>{const f=(r<3&&c<3)||(r<3&&c>5)||(r>5&&c<3);return f?-1:hash(r*9.7+c*3.1+5)>.5?1:0;}));
/** Small 9×9 code icon (three finder eyes, pseudo data), side s, top-left at (x,y). */
function MiniCode({x,y,s,seed=0}:{x:number;y:number;s:number;seed?:number}){
 const u=s/11,dots:React.ReactNode[]=[];
 MINI9.forEach((row,r)=>row.forEach((v,c)=>{const on=v===1?(hash(r*3.3+c*7.7+seed*13.1)>.42):false;if(on)dots.push(<rect key={`${r}-${c}`} x={x+u*(c+1)+u*.08} y={y+u*(r+1)+u*.08} width={u*.84} height={u*.84} rx={u*.2} fill={INK}/>);}));
 return <g>
  <rect x={x} y={y} width={s} height={s} rx={u*.8} fill={C.ivory}/>
  {[[0,0],[0,6],[6,0]].map(([r,c],i)=><g key={i}><path d={rrect(x+u*(c+1),y+u*(r+1),3*u,3*u,u*.7)+rrect(x+u*(c+1.55),y+u*(r+1.55),1.9*u,1.9*u,u*.4)} fillRule="evenodd" fill={INK}/><rect x={x+u*(c+1.95)} y={y+u*(r+1.95)} width={1.1*u} height={1.1*u} rx={u*.25} fill={INK}/></g>)}
  {dots}
 </g>;
}
/** Highlight weights of the four bars: active 0.25, 0.5, 0.75, 1 select one bar each (0 none). Each key crossfades
 *  the previous selection into the new one, so a jump never flickers through the bars in between. */
export function levelWeights(t:number,o:Keyed){
 const keys=o.activeKeys??[];
 return [0,1,2,3].map(i=>keyed(t,keys.map(k=>({at:k.at,value:Math.round(k.value*4)===i+1?1:0})),0,QR_KEY_SECONDS["ec-levels"],easeSine));
}
function EcLevels({t,o,uid}:{t:number;o:Keyed;uid:string}){
 const W=levelWeights(t,o);
 return <g>
  <defs><radialGradient id={`lvglow-${uid}`}><stop offset="0" stopColor={C.yellow} stopOpacity=".38"/><stop offset=".6" stopColor={C.yellow} stopOpacity=".12"/><stop offset="1" stopColor={C.yellow} stopOpacity="0"/></radialGradient></defs>
  <Shadow w={500} y={212}/>
  <polygon points={pts([[-250,176],[236,176],[252,164],[-234,164]])} fill={METAL.hi}/>
  <Quad p={[[-250,176],[236,176],[236,206],[-250,206]]} light={METAL.mid} dark={METAL.lo}/>
  <polygon points={pts([[236,176],[252,164],[252,194],[236,206]])} fill={METAL.dark}/>
  {LEVELS.map((lv,i)=>{const w=W[i],h=260*lv/30,x=LV_X[i]-LV_W/2,y=LV_BASE-h,pulse=.85+.15*Math.sin(t*3+i);
   const front={light:mix(C.purple,C.yellow,w),dark:mix("#5B3A94",YEL.dark,w)},top=mix(C.lavender,C.yellowLine,w),side=mix("#3A2264","#9A7420",w);
   const S=64,ix=LV_X[i]-S/2,iy=y-S-22,frac=lv/100,rad=Math.sqrt(4*frac/Math.PI)*S,cx=ix+S,cy=iy+S;
   const bite=Array.from({length:12},(_,k)=>{const an=(180+k*90/11)*D,rr=rad*(1+.08*Math.sin(k*2.1+i));return [cx+Math.cos(an)*rr,cy+Math.sin(an)*rr];});
   return <g key={i}>
    {w>.003&&<ellipse cx={LV_X[i]+6} cy={y+h/2} rx={86} ry={h/2+56} fill={`url(#lvglow-${uid})`} opacity={w*pulse}/>}
    <Box x={x} y={y} w={LV_W} h={h} d={[14,-11]} front={front} top={top} side={side}/>
    {w>.003&&<rect x={x+8} y={y+8} width={8} height={Math.max(0,h-16)} rx={4} fill="#FFFFFF" opacity={.35*w}/>}
    <g opacity={.55+.45*Math.max(w,.35)}>
     <line x1={LV_X[i]} y1={iy+S} x2={LV_X[i]} y2={y-4} stroke={METAL.hi} strokeWidth={4}/>
     <MiniCode x={ix} y={iy} s={S} seed={i}/>
     <path d={`M ${cx} ${cy} L ${pts(bite).split(" ").join(" L ")} Z`} fill={C.pink} opacity={.85}/>
     <path d={`M ${pts(bite).split(" ").join(" L ")}`} fill="none" stroke="#8E1C38" strokeWidth={2.5}/>
    </g>
    <Check x={ix+S+4} y={iy-2} k={w} r={13}/>
   </g>;})}
 </g>;
}

/* ───────────── Scratched compact disc ───────────── */
const DISC={x:0,y:-58,R:168,hole:15,hub:44},LASER_AN=35*D,LASER_R=118,SCRATCH_AN=.6;
const RAINBOW=[C.pink,"#F59A3C",C.yellow,C.green,"#4FB4E8",C.purple];
const rainbow=(h:number)=>{const n=RAINBOW.length,x=((h%1)+1)%1*n,i=Math.floor(x);return mix(RAINBOW[i%n],RAINBOW[(i+1)%n],x-i);};
/** Integral of speed(a(s))·ramp(s) from the object's entry to t, using the renderer's keyed curve for this kind. */
export function integrate(t:number,o:Keyed,kind:QrKind,speed:(a:number)=>number,rampSeconds=0){
 const keys=o.activeKeys??[],dur=QR_KEY_SECONDS[kind],start=Math.min(t,o.enterAt??0),dt=1/30;let x=0;
 for(let s=start;s<t;s+=dt){const h=Math.min(dt,t-s),m=s+h/2,ramp=rampSeconds>0?smooth(m-start,0,rampSeconds):1;x+=speed(keyed(m,keys,0,dur,easeSine))*ramp*h;}
 return x;
}
/** Disc angle in degrees: always spinning (72°/s), spun up over 1 s after it enters, integrated so it never jumps. */
export const discAngle=(t:number,o:Keyed)=>integrate(t,o,"scratched-disc",()=>72,1);
export function discState(a:number){return {scratch:smooth(a,.25,.5),fix:smooth(a,.6,.9)};}
const DISC_RINGS=[52,80,108,136,166],DISC_N=32;
function Disc({t,a,o,uid,xray,overlay}:{t:number;a:number;o:Keyed;uid:string;xray:number;overlay?:boolean}){
 const v=discState(a),spin=discAngle(t,o)*D,cx=DISC.x,cy=DISC.y;
 const sAt=(u:number)=>{const an=SCRATCH_AN+.25*u+spin,r=62+96*u;return [cx+Math.cos(an)*r,cy+Math.sin(an)*r];};
 const sLen=v.scratch,scratch=Array.from({length:13},(_,i)=>{const u=i/12*sLen,p=sAt(u),n=(hash(i*4.3)-.5)*4;return [p[0]+n,p[1]-n];});
 const rel=Math.atan2(Math.sin(SCRATCH_AN+.25*(LASER_R-62)/96+spin-LASER_AN),Math.cos(SCRATCH_AN+.25*(LASER_R-62)/96+spin-LASER_AN));
 const hit=v.scratch*Math.exp(-Math.pow(rel/.13,2)),bad=hit*(1-v.fix),good=hit*v.fix;
 const lp=[cx+Math.cos(LASER_AN)*LASER_R,cy+Math.sin(LASER_AN)*LASER_R];
 if(overlay){
  if(xray<=.01)return null;
  const segs:React.ReactNode[]=[];const turns=9.5,steps=210;
  for(let i=0;i<steps;i++){const th0=i/steps*turns*2*Math.PI,th1=(i+.7)/steps*turns*2*Math.PI,r0=58+th0/(2*Math.PI)*11,r1=58+th1/(2*Math.PI)*11;
   const p0=[cx+Math.cos(th0+spin)*r0,cy+Math.sin(th0+spin)*r0],p1=[cx+Math.cos(th1+spin)*r1,cy+Math.sin(th1+spin)*r1];
   const u=(r0-62)/96,sc=Math.atan2(Math.sin(th0-(SCRATCH_AN+.25*u)),Math.cos(th0-(SCRATCH_AN+.25*u))),onScratch=v.scratch>.05&&Math.abs(sc)<.09&&u>=0&&u<=sLen;
   const color=onScratch?C.pink:[C.yellow,C.lavender,C.ivory,C.purple][(i*5+(i>>2)*3)%4];
   segs.push(<line key={i} x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke={color} strokeWidth={onScratch?6:4} strokeLinecap="round" opacity={onScratch?1:.8}/>);}
  return <g opacity={xray}><circle cx={cx} cy={cy} r={DISC.R} fill="none" stroke={C.lavender} strokeOpacity={.5} strokeWidth={2} strokeDasharray="4 8"/>{segs}</g>;
 }
 const facets:React.ReactNode[]=[];
 for(let k=0;k<DISC_RINGS.length-1;k++)for(let j=0;j<DISC_N;j++){
  const r0=DISC_RINGS[k],r1=DISC_RINGS[k+1],a0=j/DISC_N*2*Math.PI+spin+(k%2)*.1,a1=(j+1)/DISC_N*2*Math.PI+spin+(k%2)*.1;
  const P=(an:number,r:number)=>[cx+Math.cos(an)*r,cy+Math.sin(an)*r];
  for(const [tri,s] of [[[P(a0,r0),P(a1,r0),P(a1,r1)],0],[[P(a0,r0),P(a1,r1),P(a0,r1)],1]] as [number[][],number][]){
   const mid=(a0+a1)/2+(s?-.05:.05),rr=(r0+r1)/2,lit=.5+.38*Math.cos(mid-(-135*D))+(hash(k*97+j*7+s)-.5)*.22;
   const band=Math.pow(Math.abs(Math.cos(mid-(-40*D))),5)*.75+.12;
   const silver=mix("#6E6A8C","#ECE8F8",clamp01(lit)),c=mix(silver,rainbow(rr/170*1.1+.18*Math.sin(2*mid)+.05),band*(.6+.4*clamp01(lit)));
   facets.push(<polygon key={`${k}-${j}-${s}`} points={pts(tri)} fill={c} stroke={c} strokeWidth={.6} strokeLinejoin="round"/>);}
 }
 const waveColor=mix(mix(C.lavender,C.pink,bad),C.green,v.fix),wave=Array.from({length:61},(_,i)=>{const x=-142+i*3.3,ph=t*5+i*.32,amp=11*(.6+.4*Math.sin(t*1.1+i*.05));
  const glitch=bad*((hash(i*7.7+Math.floor(t*12))-.5)*34);return [x,188+Math.sin(ph)*amp*.7+Math.sin(ph*2.3)*amp*.3+glitch];});
 return <g>
  <Shadow w={420} y={236}/>
  <rect x={-14} y={cy} width={28} height={150-cy} fill={METAL.lo}/>
  <circle cx={cx} cy={cy} r={DISC.R+6} fill="#000" opacity={.25}/>
  <g>{facets}</g>
  <circle cx={cx} cy={cy} r={DISC.R} fill="none" stroke="#D9D4EC" strokeWidth={3} opacity={.7}/>
  <circle cx={cx} cy={cy} r={DISC.hub+8} fill="#8E8AA8"/>
  <circle cx={cx} cy={cy} r={DISC.hub} fill={C.lavender} opacity={.35}/>
  <circle cx={cx} cy={cy} r={DISC.hub} fill="none" stroke="#FFFFFF" strokeOpacity={.4} strokeWidth={2}/>
  {[0,1,2].map(k=>{const an=spin+k*2.1;return <circle key={k} cx={cx+Math.cos(an)*30} cy={cy+Math.sin(an)*30} r={2.5} fill="#FFFFFF" opacity={.5}/>;})}
  <circle cx={cx} cy={cy} r={DISC.hole+6} fill={METAL.mid}/><circle cx={cx} cy={cy} r={DISC.hole} fill={METAL.dark}/>
  <path d={`M ${cx-120} ${cy-110} A ${DISC.R*.9} ${DISC.R*.9} 0 0 1 ${cx+40} ${cy-150}`} stroke="#FFFFFF" strokeWidth={12} strokeOpacity={.16} fill="none" strokeLinecap="round"/>
  {v.scratch>.003&&<g>
   <polyline points={pts(scratch)} fill="none" stroke={C.pink} strokeWidth={12} strokeOpacity={.3} strokeLinecap="round" strokeLinejoin="round"/>
   <polyline points={pts(scratch)} fill="none" stroke={C.ivory} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"/>
   <polyline points={pts(scratch)} fill="none" stroke={C.pink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={.8}/>
  </g>}
  <polygon points={pts([[148,150],[164,150],[150,lp[1]+22],[134,lp[1]+22]])} fill={METAL.lo}/>
  <Box x={lp[0]+14} y={lp[1]+6} w={44} h={26} d={[8,-6]} front={{light:METAL.top,dark:METAL.mid}} top={METAL.hi} side={METAL.dark}/>
  <line x1={lp[0]+16} y1={lp[1]+12} x2={lp[0]} y2={lp[1]} stroke={C.yellow} strokeWidth={4} opacity={.8}/>
  <circle cx={lp[0]} cy={lp[1]} r={18+10*hit} fill={bad>good?C.pink:good>.05?C.green:C.yellow} opacity={.3+.3*hit}/>
  <circle cx={lp[0]} cy={lp[1]} r={6} fill={C.yellowLine}/>
  <polygon points={pts([[-200,150],[184,150],[200,138],[-184,138]])} fill={METAL.hi}/>
  <Quad p={[[-200,150],[184,150],[184,226],[-200,226]]} light={METAL.mid} dark={METAL.lo}/>
  <polygon points={pts([[184,150],[200,138],[200,214],[184,226]])} fill={METAL.dark}/>
  <rect x={-156} y={166} width={192} height={44} rx={8} fill="#07050B"/>
  <polyline points={pts(wave.map(([x,y])=>[x+5,y]))} fill="none" stroke={waveColor} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round"/>
  {Array.from({length:12},(_,i)=><circle key={i} cx={66+(i%4)*16} cy={172+Math.floor(i/4)*14} r={4} fill="#1D1628"/>)}
  <circle cx={160} cy={188} r={7} fill={mix(mix(C.yellow,C.pink,bad),C.green,v.fix)} opacity={.6+.4*Math.sin(t*4)}/>
 </g>;
}

/* ───────────── Conveyor with crates of car parts ───────────── */
const CRATE_GAP=250,CRATE_LOOP=1000;
export const beltSpeed=(a:number)=>smooth(a,0,.5);
export const scanOn=(a:number)=>smooth(a,.55,.9);
/** Belt offset in px: the integral of the keyed belt speed (90 px/s at full speed), so a stop never jumps. */
export const beltOffset=(t:number,o:Keyed)=>integrate(t,o,"parts-crate",a=>90*beltSpeed(a));
function Gear({x,y,r,angle,light=C.yellow,dark=YEL.dark}:{x:number;y:number;r:number;angle:number;light?:string;dark?:string}){
 const teeth=10,p:number[][]=[];for(let i=0;i<teeth*4;i++){const an=(i/(teeth*4))*2*Math.PI,rr=(i%4<2)?r*1.18:r;p.push([Math.cos(an)*rr,Math.sin(an)*rr]);}
 return <g transform={`translate(${x},${y}) rotate(${angle})`}>
  {p.map((q,i)=>{const n=p[(i+1)%p.length],mid=Math.atan2(q[1]+n[1],q[0]+n[0]),lit=clamp01(.5+.5*Math.cos(mid+135*D-angle*D));const c=mix(dark,light,lit);return <polygon key={i} points={pts([[0,0],q,n])} fill={c} stroke={c} strokeWidth={.6}/>;})}
  <circle r={r*.38} fill={INK}/><circle r={r*.38} fill="none" stroke={dark} strokeWidth={3}/>
 </g>;
}
function Piston({x,y}:{x:number;y:number}){
 return <g transform={`translate(${x},${y})`}>
  <rect x={-7} y={-6} width={14} height={50} fill="#9A97AC"/>
  <Quad p={[[-30,-46],[30,-46],[30,-4],[-30,-4]]} light="#E8E6F0" dark="#9A97AC"/>
  <polygon points={pts([[-30,-46],[30,-46],[36,-52],[-24,-52]])} fill="#FFFFFF"/>
  {[-36,-28].map(yy=><rect key={yy} x={-30} y={yy} width={60} height={3} fill="#6E6A8C"/>)}
  <circle cx={0} cy={-18} r={6} fill="#6E6A8C"/>
 </g>;
}
function PartsCrate({t,a,o,uid}:{t:number;a:number;o:Keyed;uid:string}){
 const off=beltOffset(t,o),scan=scanOn(a),clip=`belt-${uid}`;
 const crates=[0,1,2,3].map(k=>{let x=((k*CRATE_GAP+off-125)%CRATE_LOOP+CRATE_LOOP)%CRATE_LOOP;x-=CRATE_LOOP/2;return {k,x,flash:scan*Math.exp(-Math.pow(x/46,2))};});
 const flash=Math.max(...crates.map(c=>c.flash)),beam=mix(C.lavender,C.green,flash);
 const roll=off/11/D;
 return <g>
  <defs><clipPath id={clip}><rect x={-300} y={-260} width={600} height={330}/></clipPath>
   <linearGradient id={`fan-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={beam} stopOpacity=".55"/><stop offset="1" stopColor={beam} stopOpacity=".05"/></linearGradient></defs>
  <Shadow w={780} y={206}/>
  <rect x={-12} y={-176} width={24} height={250} fill={METAL.lo}/><rect x={-12} y={-176} width={8} height={250} fill={METAL.mid}/>
  <polygon points={pts([[-380,40],[380,40],[396,28],[-364,28]])} fill="#2A2238"/>
  {Array.from({length:16},(_,i)=>{const x=((i*50+off)%800+800)%800-400;return x>-376&&x<370?<line key={i} x1={x} y1={40} x2={x+16} y2={28} stroke={C.lavender} strokeOpacity={.18} strokeWidth={3}/>:null;})}
  <g clipPath={`url(#${clip})`}>
   {crates.map(c=>{const x=c.x,w=124,h=84,y=36-h;return <g key={c.k}>
    {c.k%2===0?<Gear x={x-6} y={y-8} r={32} angle={c.k*20}/>:<Piston x={x-4} y={y+18}/>}
    {c.k%2===0&&<Gear x={x+34} y={y-2} r={18} angle={-c.k*30} light={C.lavender} dark={LAV.dark}/>}
    <polygon points={pts([[x-w/2,y],[x+w/2,y],[x+w/2+16,y-12],[x-w/2+16,y-12]])} fill="#3A2C55"/>
    <Box x={x-w/2} y={y} w={w} h={h} d={[16,-12]} front={{light:"#7A64A6",dark:"#4E3D74"}} top="#9C88C8" side="#3A2C55"/>
    <rect x={x-w/2} y={y} width={w} height={6} fill="#B9A8DE" opacity={.6}/>
    {[0,1].map(s=><rect key={s} x={x-w/2+8+s*(w-20)} y={y+12} width={4} height={h-20} fill="#3A2C55" opacity={.6}/>)}
    {c.flash>.01&&<rect x={x-28} y={y+16} width={56} height={56} rx={8} fill={C.green} opacity={.45*c.flash}/>}
    <MiniCode x={x-24} y={y+20} s={48} seed={c.k+10}/>
   </g>;})}
  </g>
  <rect x={-380} y={40} width={760} height={22} fill={METAL.dark}/>
  <rect x={-380} y={40} width={760} height={3} fill={C.lavender} opacity={.3}/>
  {Array.from({length:9},(_,i)=>{const x=-340+i*85;return <g key={i} transform={`translate(${x},51) rotate(${roll})`}><circle r={8} fill={METAL.lo}/><line x1={-7} y1={0} x2={7} y2={0} stroke={METAL.hi} strokeWidth={2}/></g>;})}
  <rect x={-372} y={62} width={744} height={16} fill={METAL.lo}/>
  {[-330,-110,110,330].map(x=><g key={x}><rect x={x-9} y={78} width={18} height={124} fill={METAL.mid}/><rect x={x-9} y={78} width={6} height={124} fill={METAL.top}/><rect x={x-18} y={198} width={36} height={8} rx={4} fill={METAL.dark}/></g>)}
  {[-1,1].map(s=>{const x0=s<0?-394:300;return <g key={s}>
   <Box x={x0} y={-110} w={94} h={188} d={[16,-12]} front={{light:METAL.mid,dark:METAL.lo}} top={METAL.hi} side={METAL.dark}/>
   <rect x={s<0?x0+70:x0} y={-60} width={24} height={100} fill="#07050B"/>
   {Array.from({length:4},(_,i)=><rect key={i} x={(s<0?x0+70:x0)+i*6} y={-60} width={4} height={100} fill="#2A2238" opacity={.8}/>)}
  </g>;})}
  <polygon points={pts([[0,-150],[-78,36],[78,36]])} fill={`url(#fan-${uid})`} opacity={.35+.65*Math.max(scan*.4,flash)}/>
  {scan>.003&&(()=>{const ly=-40+70*(.5+.5*Math.sin(t*3)),hw=78*(ly+150)/186;return <line x1={-hw} y1={ly} x2={hw} y2={ly} stroke={beam} strokeWidth={3} strokeLinecap="round" opacity={scan*.7}/>;})()}
  <Box x={-40} y={-196} w={80} h={40} d={[16,-12]} front={{light:METAL.top,dark:METAL.mid}} top={METAL.hi} side={METAL.dark}/>
  <rect x={-28} y={-162} width={56} height={10} rx={5} fill={beam} opacity={.5+.5*Math.max(scan*.5,flash)}/>
  <circle cx={52} cy={-188} r={7} fill={flash>.2?C.green:scan>.2?C.lavender:"#4E4F62"} opacity={.6+.4*flash}/>
  {flash>.01&&<circle cx={0} cy={-157} r={30+20*flash} fill={C.green} opacity={.2*flash}/>}
 </g>;
}

export function QrArt({kind,o,t,a,xray,uid,overlay}:QrArtProps){
 if(overlay&&kind!=="qr-code"&&kind!=="scratched-disc")return null;
 switch(kind){
  case "qr-code":return <QrCode o={o} t={t} a={a} xray={xray} uid={uid} overlay={overlay}/>;
  case "qr-scanner":return <QrScanner t={t} a={a} uid={uid}/>;
  case "codeword-row":return <CodewordRow t={t} a={a} uid={uid}/>;
  case "rs-curve":return <RsCurve t={t} a={a} xray={xray}/>;
  case "ec-levels":return <EcLevels t={t} o={o} uid={uid}/>;
  case "scratched-disc":return <Disc t={t} a={a} o={o} uid={uid} xray={xray} overlay={overlay}/>;
  case "parts-crate":return <PartsCrate t={t} a={a} o={o} uid={uid}/>;
 }
 return null;
}
