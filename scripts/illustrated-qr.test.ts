import {test} from "node:test";
import assert from "node:assert/strict";
import {keyed,easeSine} from "../src/lib/illustrated";
import {QR_KINDS,QR_FOOTPRINT,QR_GUIDE,QR_KEY_SECONDS,QR_XRAY_OVERLAY,type QrKind} from "../src/lib/illustrated-catalog-qr";

// QR catalog (2026-10-20): real Reed–Solomon math, a standard version-2 layout, continuous state changes at 30 fps,
// integrated belt/disc motion that never jumps, and every kind wired into the catalog and the renderer.
const FRAME=1/30;
/** Every value of a state object (numbers or arrays of numbers), flattened with stable names. */
const flat=(s:Record<string,number|number[]>)=>Object.entries(s).flatMap(([k,v])=>Array.isArray(v)?v.map((x,i)=>[`${k}[${i}]`,x] as const):[[k,v] as const]);
/** Runs a state function along step-by-step keys (one per second plus its own key length) and returns the largest
 *  single-frame change of any value. */
function maxStep(kind:QrKind,values:number[],state:(a:number)=>Record<string,number|number[]>){
 const dur=QR_KEY_SECONDS[kind],keys=values.map((value,i)=>({at:1+i*(dur+1),value})),end=keys.at(-1)!.at+dur+1;
 let prev=flat(state(keyed(0,keys,0,dur,easeSine))),worst={d:0,name:"",t:0};
 for(let t=FRAME;t<=end;t+=FRAME){const cur=flat(state(keyed(t,keys,0,dur,easeSine)));
  cur.forEach(([name,v],i)=>{const d=Math.abs(v-prev[i][1]);if(d>worst.d)worst={d,name,t};});prev=cur;}
 return worst;
}

test("Reed–Solomon check bytes match the textbook QR example and every codeword is a multiple of the generator",async()=>{
 const Q=await import("../renderer/IllustratedQr");
 // "HELLO WORLD", version 1-M: the worked example of the QR tutorial at thonky.com.
 assert.deepEqual(Q.rsCheck([32,91,11,120,209,114,220,77,67,64,236,17,236,17,236,17],10),[196,35,39,119,235,215,231,226,93,23]);
 for(let i=0;i<22;i++)assert.equal(Q.rsSyndrome(Q.QR_WORDS,i),0,`hero syndrome ${i}`);
 for(let i=0;i<6;i++)assert.equal(Q.rsSyndrome([...Q.ROW_DATA,...Q.ROW_EC],i),0,`row syndrome ${i}`);
 assert.equal(Q.QR_DATA[0]>>4,0,"the payload starts with the terminator: a phone reads an empty message");
});

test("the hero symbol is a standard version-2 layout and damage never touches a finder",async()=>{
 const Q=await import("../renderer/IllustratedQr");
 const count=(role:string)=>Q.QR_CELLS.filter(c=>c.role===role).length;
 assert.equal(Q.QR_CELLS.length,625);
 assert.deepEqual([count("finder"),count("sep"),count("timing"),count("align"),count("format"),count("data"),count("rem")],[147,45,18,25,31,352,7]);
 for(let k=0;k<44;k++)assert.equal(Q.QR_CELLS.filter(c=>c.cw===k).length,8,`byte ${k} has 8 modules`);
 const [c0,r0]=Q.QR_SNAKE[0];assert.ok(c0>22&&r0>21,"byte order starts at the bottom right");
 const finders=Q.QR_CELLS.filter(c=>c.role==="finder"||c.role==="sep");
 for(const [name,poly] of [["stain",Q.QR_STAIN],["tear",Q.QR_TEAR],["hook stain",Q.QR_STAIN_HOOK]] as const){
  const lost=Q.lostCells(poly as number[][]);
  assert.ok(lost.every(c=>c.role!=="finder"),`${name} spares the finders`);
  assert.ok(!finders.some(f=>lost.some(c=>c.r===f.r&&c.c===f.c&&f.role==="finder")),name);
 }
 const share=(poly:number[][])=>Q.lostCells(poly).filter(c=>c.role==="data"||c.role==="rem").length/359;
 assert.ok(share(Q.QR_STAIN)>.15&&share(Q.QR_STAIN)<.3,`stain covers a visible share within level Q (${share(Q.QR_STAIN).toFixed(2)})`);
 assert.ok(share(Q.QR_TEAR)>.1&&share(Q.QR_TEAR)<.3,`tear covers ${share(Q.QR_TEAR).toFixed(2)}`);
});

test("QR states change continuously at 30 fps under step-by-step keys",async()=>{
 const Q=await import("../renderer/IllustratedQr");
 const cases:[QrKind,number[],(a:number)=>Record<string,number|number[]>][]=[
  ["qr-code",[.2,.4,.6,.8,1],a=>({...Q.qrCodeState(a,1),tint:Array.from({length:44},(_,k)=>Q.qrTint(a,k)),cells:[0,.25,.5,.75,1].map(u=>Q.cellRestore(a,u))})],
  ["qr-code",[.2,.4,.6,.8,1],a=>Q.qrCodeState(a,2)],
  ["qr-code",[.33,.66,1],a=>Q.qrCodeState(a,3)],
  ["qr-code",[.5,1],a=>Q.qrCodeState(a,4)],
  ["qr-scanner",[.35,.65,1],a=>Q.scannerState(a)],
  ["codeword-row",[.35,.6,.85,1],a=>Q.codewordState(a)],
  ["rs-curve",[.2,.4,.55,.7,.9,1],a=>Q.rsState(a)],
  ["scratched-disc",[.5,1],a=>Q.discState(a)],
  ["parts-crate",[.5,1,0],a=>({speed:Q.beltSpeed(a),scan:Q.scanOn(a)})],
 ];
 for(const [kind,values,state] of cases){const w=maxStep(kind,values,state);assert.ok(w.d<.2,`${kind} ${w.name} jumps ${w.d.toFixed(3)} at ${w.t.toFixed(2)} s`);}
 // Bar selection crossfades per key: a jump from the highest bar back to none never lights the bars in between.
 const lv={activeKeys:[{at:1,value:.25},{at:3,value:.5},{at:5,value:1},{at:7,value:0}]};let prevW=Q.levelWeights(0,lv);
 for(let t=FRAME;t<9;t+=FRAME){const w=Q.levelWeights(t,lv);w.forEach((v,i)=>assert.ok(Math.abs(v-prevW[i])<.12,`bar ${i} at ${t.toFixed(2)}`));
  if(t>5&&t<9)assert.ok(w[2]<1e-9,"the third bar stays dark while the selection jumps from the second to the fourth");prevW=w;}
 assert.deepEqual(Q.levelWeights(4,lv).map(v=>Math.round(v)),[0,1,0,0]);
 // A state change spans many frames: the hero's stain takes at least 10 frames to appear.
 const keys=[{at:1,value:.6}];let between=0;for(let f=30;f<90;f++){const s=Q.qrCodeState(keyed(f/30,keys,.4,QR_KEY_SECONDS["qr-code"],easeSine),1).stain;if(s>.01&&s<.99)between++;}
 assert.ok(between>=10,`stain appears over ${between} frames`);
});

test("the belt and the disc integrate their speed: a stop never jumps and a stopped belt stays put",async()=>{
 const Q=await import("../renderer/IllustratedQr");
 const belt={activeKeys:[{at:1,value:.5},{at:4,value:1},{at:7,value:0},{at:11,value:.5}],enterAt:0};
 let prev=Q.beltOffset(0,belt);
 for(let t=FRAME;t<14;t+=FRAME){const x=Q.beltOffset(t,belt),d=x-prev;assert.ok(d>=-1e-9&&d<=90*FRAME+1e-6,`belt step ${d.toFixed(3)} at ${t.toFixed(2)}`);prev=x;}
 assert.ok(Math.abs(Q.beltOffset(10.5,belt)-Q.beltOffset(9.5,belt))<1e-6,"stopped belt does not creep");
 const disc={activeKeys:[{at:2,value:.5},{at:5,value:1}],enterAt:1};
 let ang=Q.discAngle(1,disc);
 for(let t=1+FRAME;t<8;t+=FRAME){const a=Q.discAngle(t,disc),d=a-ang;assert.ok(d>=-1e-9&&d<=72*FRAME+1e-6,`disc step ${d.toFixed(3)} at ${t.toFixed(2)}`);ang=a;}
 assert.ok(Q.discAngle(1.2,disc)-Q.discAngle(1.2-FRAME,disc)<Q.discAngle(4,disc)-Q.discAngle(4-FRAME,disc),"the disc spins up after it enters");
});

test("every QR kind renders all states without NaN, with x-ray overlays only where declared",async()=>{
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 const {QrArt}=await import("../renderer/IllustratedQr");
 for(const kind of QR_KINDS)for(const rows of kind==="qr-code"?[1,2,3,4]:[1])for(const a of [0,.1,.2,.3,.35,.4,.5,.55,.6,.65,.7,.8,.85,.9,1]){
  const o={id:"x",kind,rows,cols:2,label:"",activeKeys:[{at:0,value:a}],enterAt:0,exitAt:Infinity,moveKeys:[]} as any;
  const html=renderToStaticMarkup(React.createElement("svg",null,React.createElement(QrArt,{kind,o,t:3.7,a,xray:.6,uid:"u"})));
  assert.ok(html.length>300&&!/NaN|Infinity|undefined/.test(html),`${kind} rows ${rows} at ${a}`);
  assert.ok(!/<text/.test(html),`${kind} draws no words or numbers`);
  const over=renderToStaticMarkup(React.createElement("svg",null,React.createElement(QrArt,{kind,o,t:3.7,a,xray:.6,uid:"u",overlay:true})));
  assert.equal(over.length>20,(QR_XRAY_OVERLAY as readonly string[]).includes(kind),`${kind} overlay`);
 }
});

test("QR kinds are wired into the catalog, the renderer and the slow-state table",async()=>{
 const {ILLUSTRATED_KINDS,FOOTPRINT,KIND_GUIDE}=await import("../src/lib/illustrated");
 const {KEY_SECONDS}=await import("../renderer/IllustratedFilm");
 const source=(await import("node:fs")).readFileSync(new URL("../renderer/IllustratedFilm.tsx",import.meta.url),"utf8");
 for(const k of QR_KINDS){
  assert.ok((ILLUSTRATED_KINDS as readonly string[]).includes(k),k);
  assert.deepEqual(FOOTPRINT[k],QR_FOOTPRINT[k]);assert.ok(KIND_GUIDE[k]===QR_GUIDE[k]&&QR_GUIDE[k].length>80,`${k} guide`);
  assert.equal(KEY_SECONDS[k],QR_KEY_SECONDS[k]);assert.ok(source.includes(`case "${k}"`),`renderer case ${k}`);
 }
});
