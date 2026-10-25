import {test} from "node:test";
import assert from "node:assert/strict";
import {keyed,easeSine,ILLUSTRATED_KINDS,FOOTPRINT,KIND_GUIDE} from "../src/lib/illustrated";
import {NET_KINDS,NET_FOOTPRINT,NET_GUIDE,NET_KEY_SECONDS,NET_CALLOUT_ANCHOR,NET_XRAY_OVERLAY} from "../src/lib/illustrated-catalog-net";
import {integrate,globeState,cableState,chatScroll,terminalState,airportState,portState,dialState} from "../renderer/IllustratedNet";

// Continuity of the internet-outage catalog (renderer/IllustratedNet.tsx): every state function changes by less than a
// small step per frame at 30 fps under step keys (an opacity needs at least 4 frames to cross, a position moves less
// than 14 px per frame), and every process that stops integrates its speed (no pose jump).
const F=1/30;
const ks=(k:keyof typeof NET_KEY_SECONDS)=>NET_KEY_SECONDS[k]!;
const frames=(t0:number,t1:number)=>Array.from({length:Math.round((t1-t0)/F)+1},(_,i)=>t0+i*F);
// Step keys: on at 1 s, half-way back at 6 s, off at 11 s (the 24 hours end), on again at 16 s.
const keys=[{at:1,value:1},{at:6,value:.5},{at:11,value:0},{at:16,value:1}];
const obj={activeKeys:keys,enterAt:0};

test("integrate: travel is continuous, stops smoothly and restarts without a jump",()=>{
 const v=(a:number)=>1-a;let prev=integrate(0,obj,1.6,v);
 for(const t of frames(F,20)){const x=integrate(t,obj,1.6,v),d=x-prev;assert.ok(d>=-1e-9&&d<=F+1e-9,`step ${d} at ${t}`);prev=x;}
 const rest=integrate(4,obj,1.6,v);assert.ok(Math.abs(integrate(5.5,obj,1.6,v)-rest)<1e-9,"stopped while the net is down");
 // A cycle may finish its move first: with v depending on tau the motion ends at the rest zone and stays there.
 const cyc=(a:number,tau:number)=>lerpNum(1,tau%1>.6?1:0,smoothNum(a,0,.3));
 const end=integrate(6,{activeKeys:[{at:1,value:1}],enterAt:0},1.2,cyc);assert.ok(end%1<=.6+1e-6||end%1>.999,"rests in the rest zone");
});
const smoothNum=(v:number,a:number,b:number)=>{const x=Math.max(0,Math.min(1,(v-a)/(b-a)));return x*x*(3-2*x);};
const lerpNum=(a:number,b:number,k:number)=>a+(b-a)*k;

test("net-globe: the darkness wave, the ghosts and every packet move continuously",()=>{
 const a=(t:number)=>keyed(t,keys,0,ks("net-globe"),easeSine);
 let prev=globeState(0,a(0),obj);
 assert.ok(prev.dark.every(d=>d===0),"all links alive before the first key");
 for(const t of frames(F,20)){const s=globeState(t,a(t),obj);
  s.dark.forEach((d,i)=>assert.ok(Math.abs(d-prev.dark[i])<.25,`arc ${i} darkness at ${t}`));
  s.travel.forEach((x,i)=>assert.ok(x-prev.travel[i]>=-1e-9&&x-prev.travel[i]<=F+1e-9,`packet travel ${i} at ${t}`));
  assert.ok(Math.abs(s.ghost-prev.ghost)<.15&&Math.abs(s.front-prev.front)<.15,`ghost/front at ${t}`);prev=s;}
 const dark=globeState(5.5,a(5.5),obj);assert.ok(dark.dark.every(d=>d>.999)&&dark.ghost<.01,"all links dark and ghosts gone at 1");
 const ths=globeState(0,0,obj).arcs.map(x=>x.th);assert.ok(Math.min(...ths)>=.02&&Math.max(...ths)+.2<=.6+1e-9,"the wave finishes by 0.6");
});

test("sea-cable: light pulses slow to a stop and fade, then resume",()=>{
 const a=(t:number)=>keyed(t,keys,0,ks("sea-cable"),easeSine);let prev=cableState(0,0,obj);
 for(const t of frames(F,20)){const s=cableState(t,a(t),obj);assert.ok(s.travel-prev.travel>=-1e-9&&s.travel-prev.travel<=170*F+1e-6,`travel at ${t}`);assert.ok(Math.abs(s.glow-prev.glow)<.1,`glow at ${t}`);prev=s;}
 assert.equal(cableState(5,a(5),obj).travel,cableState(5.9,a(5.9),obj).travel);
 assert.ok(cableState(19,a(19),obj).glow<.01&&cableState(14,a(14),obj).glow>.99);
});

test("smartphone chat: the scroll finishes its step, stops on a whole bubble and never jumps",()=>{
 let prev=chatScroll(0,obj).shown;
 for(const t of frames(F,20)){const s=chatScroll(t,obj).shown;assert.ok(s-prev>=-1e-9&&s-prev<.16,`scroll step ${s-prev} at ${t}`);prev=s;}
 const stopped=chatScroll(5,obj);assert.ok(Math.abs(stopped.shown-Math.round(stopped.shown))<1e-6,"rests on a whole bubble");
 assert.equal(chatScroll(5.8,obj).shown,stopped.shown);
});

test("card-terminal: tap, processing, check and cross blend smoothly; the outage variant never shows the check",()=>{
 const paths:[number,{at:number;value:number}[],number][]=[[1,[{at:1,value:.33},{at:2.6,value:.66},{at:4.2,value:1}],.25],[3,[{at:1,value:.5},{at:2.6,value:1}],.25],[3,[{at:1,value:1}],.35]];
 for(const [rows,path,limit] of paths){let prev=terminalState(0,rows);
  for(const t of frames(F,6)){const s=terminalState(keyed(t,path,0,ks("card-terminal"),easeSine),rows);
   for(const k of Object.keys(s) as (keyof typeof s)[])assert.ok(Math.abs(s[k]-prev[k])<limit,`${k} rows ${rows} at ${t}`);
   if(rows===3)assert.equal(s.ok,0);prev=s;}}
 assert.ok(terminalState(.66,1).ok>.95&&terminalState(1,1).fail>.99&&terminalState(1,3).fail>.99);
});

test("airport: taxiing planes never jump; planes appear and vanish only behind the hangar or the tower",()=>{
 const a=(t:number)=>keyed(t,keys,0,ks("airport"),easeSine);let prev=airportState(0,0,obj);
 for(const t of frames(F,40)){const s=airportState(t,a(t),obj);
  for(const p of s.planes){const q=prev.planes.find(x=>x.k===p.k);if(q)assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<12&&Math.abs(p.s-q.s)<.02,`plane ${p.k} at ${t}`);else assert.ok(p.x<-480,`plane ${p.k} appears behind the hangar at ${t}`);}
  for(const q of prev.planes)if(!s.planes.some(p=>p.k===q.k))assert.ok(q.x>480,`plane ${q.k} leaves behind the tower at ${t}`);
  for(const p of s.planes)for(const q of s.planes)if(p.k<q.k)assert.ok(Math.abs(p.x-q.x)>250||Math.abs(p.y-q.y)>40,`planes ${p.k} and ${q.k} overlap at ${t}`);
  s.board.forEach((r,i)=>assert.ok(Math.abs(r.warn-prev.board[i].warn)<.25&&Math.abs(r.stop-prev.board[i].stop)<.25,`board row ${i} at ${t}`));
  assert.ok(Math.abs(s.chock-prev.chock)<.25);s.queue.forEach((v,i)=>assert.ok(Math.abs(v-prev.queue[i])<.35,`queue ${i} at ${t}`));prev=s;}
 const p1=airportState(5,a(5),obj).planes,p2=airportState(5.9,a(5.9),obj).planes;
 assert.deepEqual(p1.map(p=>[p.x,p.y]),p2.map(p=>[p.x,p.y]),"planes stand while the net is down");
 const free={activeKeys:[],enterAt:0};let docked=0;
 for(const t of frames(0,40)){const s=airportState(t,0,free);if(s.planes.some(p=>p.dock>.99))docked++;
  for(const p of s.planes)for(const q of s.planes)if(p.k<q.k)assert.ok(Math.abs(p.x-q.x)>250||Math.abs(p.y-q.y)>40,`free run: planes overlap at ${t}`);}
 assert.ok(docked>30*8,"on a normal day planes dock at gate B with stairs");
});

test("cargo-port: crane, spreader, the carried box and the truck queue are continuous",()=>{
 const a=(t:number)=>keyed(t,keys,0,ks("cargo-port"),easeSine);let prev=portState(0,0,obj);
 const box=(s:ReturnType<typeof portState>)=>s.carrying?{x:s.trolley,y:s.sp}:null;
 for(const t of frames(F,40)){const s=portState(t,a(t),obj);
  assert.ok(Math.abs(s.trolley-prev.trolley)<14&&Math.abs(s.sp-prev.sp)<14,`crane at ${t}`);
  for(const k of s.trucks){const q=prev.trucks.find(x=>x.j===k.j);if(q)assert.ok(Math.abs(k.x-q.x)<14,`truck ${k.j} at ${t}`);else assert.ok(Math.abs(k.x)>=380,`truck ${k.j} enters outside the diorama at ${t}`);}
  for(const q of prev.trucks)if(!s.trucks.some(k=>k.j===q.j))assert.ok(Math.abs(q.x)>=380,`truck ${q.j} leaves outside the diorama at ${t}`);
  // Hand-off: the box released by the spreader appears on the truck under the crane exactly where it hung.
  const b0=box(prev),b1=box(s);if(b0&&!b1&&s.n===prev.n){const tr=s.trucks.find(k=>k.j===s.n)!;assert.ok(tr.loaded&&Math.abs(tr.x-b0.x)<.5&&Math.abs(196-50-b0.y)<14,`box hand-off at ${t}`);}
  s.pile.forEach((v,i)=>assert.ok(Math.abs(v-prev.pile[i])<.25,`pile ${i} at ${t}`));prev=s;}
 const s1=portState(5,a(5),obj),s2=portState(5.9,a(5.9),obj);assert.equal(s1.trolley,s2.trolley);assert.equal(s1.sp,s2.sp);
});
test("cargo-port: on a normal day every box the spreader releases lands on the truck under the crane",()=>{
 const free={activeKeys:[],enterAt:0};let prev=portState(0,0,free),handoffs=0,pickups=0;
 for(const t of frames(F,32)){const s=portState(t,0,free);
  if(prev.carrying&&!s.carrying){const tr=s.trucks.find(k=>k.j===prev.n)!;assert.ok(tr&&tr.loaded&&Math.abs(tr.x-prev.trolley)<.5&&Math.abs(196-50-prev.sp)<8,`hand-off at ${t}`);handoffs++;}
  if(!prev.carrying&&s.carrying){assert.ok(Math.abs(s.trolley-(-186))<.5&&Math.abs(s.sp-4)<8,`pick-up at ${t}`);pickups++;}
  prev=s;}
 assert.ok(handoffs>=3&&pickups>=3,`${handoffs} hand-offs, ${pickups} pick-ups`);
});

test("day-dial: the hand and sector move slowly and fill a whole day at 1",()=>{
 let prev=dialState(0).angle;
 for(const t of frames(F,6)){const d=dialState(keyed(t,[{at:1,value:.5},{at:3,value:1}],0,ks("day-dial"),easeSine)).angle;assert.ok(Math.abs(d-prev)<12,`hand at ${t}`);prev=d;}
 assert.equal(dialState(1).angle,360);assert.equal(dialState(0).angle,0);
});

test("every net object renders in every state without NaN; x-ray overlays render only their details",async()=>{
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 const {NetArt}=await import("../renderer/IllustratedNet");
 for(const kind of NET_KINDS)for(const rows of [1,2,3])for(const v of [0,.33,.5,.66,1])for(const t of [0,3.3,47.1]){
  const o={id:"x",kind,rows,cols:2,label:"",activeKeys:[{at:1,value:v}],enterAt:0} as any;
  const html=renderToStaticMarkup(React.createElement("svg",null,React.createElement(NetArt,{kind,o,t,a:t>2?v:0,xray:1,uid:"x"})));
  assert.ok(!/NaN|undefined|Infinity/.test(html),`${kind} rows ${rows} a ${v} t ${t}`);
  const over=renderToStaticMarkup(React.createElement("svg",null,React.createElement(NetArt,{kind,o,t,a:v,xray:1,uid:"x",overlay:true})));
  assert.ok(!/NaN|undefined/.test(over));if(!(NET_XRAY_OVERLAY as readonly string[]).includes(kind))assert.equal(over,"<svg></svg>");}
});

test("the net catalog is wired: footprint, guide, key seconds, callout anchors inside the footprint, renderer case",async()=>{
 const source=(await import("node:fs")).readFileSync(new URL("../renderer/IllustratedFilm.tsx",import.meta.url),"utf8");
 for(const k of NET_KINDS){
  assert.ok((ILLUSTRATED_KINDS as readonly string[]).includes(k),k);assert.deepEqual(FOOTPRINT[k],NET_FOOTPRINT[k]);
  assert.ok(KIND_GUIDE[k]===NET_GUIDE[k]&&NET_GUIDE[k].length>120&&!NET_GUIDE[k].includes("черновик"),`guide ${k}`);
  assert.ok((NET_KEY_SECONDS[k]??0)>=1.2,`slow key ${k}`);assert.ok(source.includes(`case "${k}"`),`renderer case ${k}`);
  const [w,h]=NET_FOOTPRINT[k];for(const [side,p] of Object.entries(NET_CALLOUT_ANCHOR[k]??{}))assert.ok(Math.abs(p![0])<=w/2&&Math.abs(p![1])<=h/2,`${k} ${side} anchor inside the footprint`);
 }
});
