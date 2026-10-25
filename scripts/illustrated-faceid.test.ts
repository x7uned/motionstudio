import {test} from "node:test";
import assert from "node:assert/strict";
import {keyed,easeSine} from "../src/lib/illustrated";
import {FACEID_KINDS,FACEID_FOOTPRINT,FACEID_GUIDE,FACEID_KEY_SECONDS,FACEID_CALLOUT_ANCHOR,FACEID_XRAY_OVERLAY,type FaceidKind} from "../src/lib/illustrated-catalog-faceid";

// Face ID catalog (2026-10-22): continuous state changes at 30 fps, projected dots that stay in straight rows on a
// flat sheet and bend on the face, the 20× odds area, and every kind wired into the catalog and the renderer.
const FRAME=1/30;
const flat=(s:Record<string,number|number[]>)=>Object.entries(s).flatMap(([k,v])=>Array.isArray(v)?v.map((x,i)=>[`${k}[${i}]`,x] as const):[[k,v] as const]);
/** Largest single-frame change of any state value along step-by-step keys (one per second plus the key length). */
function maxStep(kind:FaceidKind,values:number[],state:(a:number)=>Record<string,number|number[]>){
 const dur=FACEID_KEY_SECONDS[kind],keys=values.map((value,i)=>({at:1+i*(dur+1),value})),end=keys.at(-1)!.at+dur+1;
 let prev=flat(state(keyed(0,keys,0,dur,easeSine))),worst={d:0,name:"",t:0};
 for(let t=FRAME;t<=end;t+=FRAME){const cur=flat(state(keyed(t,keys,0,dur,easeSine)));
  cur.forEach(([name,v],i)=>{const d=Math.abs(v-prev[i][1]);if(d>worst.d)worst={d,name,t};});prev=cur;}
 return worst;
}

test("Face ID states change continuously at 30 fps under step-by-step keys (and back down)",async()=>{
 const F=await import("../renderer/IllustratedFaceid");
 const cases:[FaceidKind,number[],(a:number)=>Record<string,number|number[]>][]=[
  ["face-scan",[.2,.4,.6,.8,1],a=>F.faceState(a)],
  ["flat-photo",[.25,.5,.7,1],a=>F.photoState(a)],
  ["truedepth-phone",[.25,.45,.65,.8,1],a=>F.phoneState(a,1)],
  ["truedepth-phone",[.25,.45,.65,.8,1],a=>F.phoneState(a,2)],
  ["face-network",[.25,.5,.75,1],a=>F.networkState(a)],
  ["secure-enclave",[.3,.5,1],a=>F.enclaveState(a)],
  ["gaze-eyes",[.5,1,.5],a=>F.gazeState(a)],
  ["odds-board",[.5,1],a=>F.oddsState(a)],
 ];
 for(const [kind,values,state] of cases){const w=maxStep(kind,values,state);assert.ok(w.d<.2,`${kind} ${w.name} jumps ${w.d.toFixed(3)} at ${w.t.toFixed(2)} s`);}
 // A two-step jump (0.6 → 1 on one word) still spreads the depth map over many frames.
 const keys=[{at:1,value:.6},{at:4,value:1}];let between=0;for(let f=110;f<200;f++){const d=F.faceState(keyed(f/30,keys,0,FACEID_KEY_SECONDS["face-scan"],easeSine)).dep;if(d>.01&&d<.99)between++;}
 assert.ok(between>=6,`depth map fades in over ${between} frames`);
});

test("projected dots: straight rows on a flat sheet, bent rows on the face, and no dot jumps between frames",async()=>{
 const F=await import("../renderer/IllustratedFaceid");
 const m=F.headMesh(0),P=m.P,pitch=9*Math.PI/180,yaw=F.bustYaw(3.7);
 const rows=new Map<number,typeof m.dots>();for(const d of m.dots)rows.set(d.row,[...(rows.get(d.row)??[]),d]);
 /** Largest distance of a projected row from the straight line through its ends. */
 const bend=(row:typeof m.dots,land:number)=>{const p=row.slice().sort((a,b)=>a.u-b.u).map(d=>F.project(F.dotPoint(d,P,1,land),yaw,pitch));
  const [a,b]=[p[0],p.at(-1)!],L=Math.hypot(b[0]-a[0],b[1]-a[1]);return Math.max(...p.map(q=>Math.abs((b[0]-a[0])*(a[1]-q[1])-(a[0]-q[0])*(b[1]-a[1]))/L));};
 const mid=[...rows.values()].filter(r=>r.length>8);assert.ok(mid.length>8,"enough dot rows");
 for(const r of mid)assert.ok(bend(r,0)<.01,"rows on the flat sheet are straight");
 assert.ok(Math.max(...mid.map(r=>bend(r,1)))>8,"landed rows bend over the face");
 assert.ok(m.dots.length>200&&m.dots.length<600,`${m.dots.length} dots`);
 // Positions move smoothly while the dots fly in and land (keys .4 then .6 on separate words).
 const keys=[{at:1,value:.4},{at:3.2,value:.6}],dur=FACEID_KEY_SECONDS["face-scan"];let prev:number[][]|null=null,worst=0,worstO=0,prevO:number[]|null=null;
 for(let t=0;t<6;t+=FRAME){const a=keyed(t,keys,0,dur,easeSine),v=F.faceState(a),y=F.bustYaw(t);
  const cur=m.dots.map(d=>F.project(F.dotPoint(d,P,v.fly,v.land),y,pitch)),op=m.dots.map(d=>v.dots*Math.max(0,Math.min(1,v.fly*1.4-.4*d.order+.25)));
  if(prev)cur.forEach((q,i)=>{const d=Math.hypot(q[0]-prev![i][0],q[1]-prev![i][1]);if(d>worst&&op[i]>.05)worst=d;});
  if(prevO)op.forEach((o,i)=>{worstO=Math.max(worstO,Math.abs(o-prevO![i]));});prev=cur;prevO=op;}
 assert.ok(worst<40,`a visible dot moves ${worst.toFixed(1)} px in one frame`);
 assert.ok(worstO<.25,`a dot's opacity changes ${worstO.toFixed(2)} in one frame`);
 // The bust sways slowly; the blink takes several frames.
 for(let t=0;t<20;t+=FRAME){assert.ok(Math.abs(F.bustYaw(t+FRAME)-F.bustYaw(t))<.01);assert.ok(Math.abs(F.blink(t+FRAME)-F.blink(t))<.4,`blink at ${t.toFixed(2)}`);}
});

test("the odds boards compare areas 20 to 1 (1 in 50,000 vs 1 in 1,000,000) and the face vectors differ for another person",async()=>{
 const F=await import("../renderer/IllustratedFaceid");
 assert.ok(Math.abs(F.ODDS_AREA_RATIO-20)<.25,`area ratio ${F.ODDS_AREA_RATIO.toFixed(2)}`);
 const diff=F.VECTOR_A.filter((h,i)=>Math.abs(h-F.VECTOR_B[i])>.12).length;
 assert.ok(diff>=4,`person B differs in ${diff} bars`);
 assert.ok(F.VECTOR_A.every(h=>h>0&&h<=1)&&F.VECTOR_B.every(h=>h>=0&&h<=1));
 // Depth colours run from the dark far edge to the bright nose tip.
 assert.equal(F.depthColor(-1),"#120c1d");assert.notEqual(F.depthColor(.2),F.depthColor(1));
});

test("every Face ID kind renders all states without NaN or words, with x-ray overlays only where declared",async()=>{
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 const {FaceidArt}=await import("../renderer/IllustratedFaceid");
 for(const kind of FACEID_KINDS)for(const rows of kind==="face-scan"?[1,2,3]:kind==="truedepth-phone"||kind==="face-network"?[1,2]:[1])for(const a of [0,.1,.2,.25,.3,.4,.45,.5,.6,.65,.7,.75,.8,.9,1]){
  const o={id:"x",kind,rows,cols:2,label:"",activeKeys:[{at:0,value:a}],enterAt:0,exitAt:Infinity,moveKeys:[]} as any;
  const html=renderToStaticMarkup(React.createElement("svg",null,React.createElement(FaceidArt,{kind,o,t:3.7,a,xray:.6,uid:"u"})));
  assert.ok(html.length>300&&!/NaN|Infinity|undefined/.test(html),`${kind} rows ${rows} at ${a}`);
  assert.ok(!/<text/.test(html),`${kind} draws no words or numbers`);
  const over=renderToStaticMarkup(React.createElement("svg",null,React.createElement(FaceidArt,{kind,o,t:3.7,a,xray:.6,uid:"u",overlay:true})));
  assert.equal(over.length>20,(FACEID_XRAY_OVERLAY as readonly string[]).includes(kind),`${kind} overlay`);
 }
 for(const kind of FACEID_KINDS){const [w,h]=FACEID_FOOTPRINT[kind];for(const [x,y] of Object.values(FACEID_CALLOUT_ANCHOR[kind]??{}))assert.ok(Math.abs(x)<=w/2+40&&Math.abs(y)<=h/2+10,`${kind} anchor inside its footprint`);}
});

test("Face ID kinds are wired into the catalog, the renderer and the slow-state table",async()=>{
 const {ILLUSTRATED_KINDS,FOOTPRINT,KIND_GUIDE}=await import("../src/lib/illustrated");
 const {KEY_SECONDS}=await import("../renderer/IllustratedFilm");
 const source=(await import("node:fs")).readFileSync(new URL("../renderer/IllustratedFilm.tsx",import.meta.url),"utf8");
 for(const k of FACEID_KINDS){
  assert.ok((ILLUSTRATED_KINDS as readonly string[]).includes(k),k);
  assert.deepEqual(FOOTPRINT[k as keyof typeof FOOTPRINT],FACEID_FOOTPRINT[k]);assert.ok(KIND_GUIDE[k as keyof typeof KIND_GUIDE]===FACEID_GUIDE[k]&&FACEID_GUIDE[k].length>80,`${k} guide`);
  assert.equal(KEY_SECONDS[k],FACEID_KEY_SECONDS[k]);assert.ok(source.includes("FACEID_KINDS")||source.includes(`case "${k}"`),`renderer case ${k}`);
 }
});
