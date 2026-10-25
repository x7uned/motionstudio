import {test} from "node:test";
import assert from "node:assert/strict";
import {keyed,easeSine} from "../src/lib/illustrated";
import {PW_KINDS,PW_FOOTPRINT,PW_GUIDE,PW_KEY_SECONDS,PW_XRAY_OVERLAY,type PwKind} from "../src/lib/illustrated-catalog-passwords";

// Passwords catalog (2026-10-22): fingerprints are deterministic (same input → same strip, other input → a very
// different strip), every state changes continuously at 30 fps, integrated motions never jump or creep, every kind
// renders without words or NaN, and every kind is wired into the catalog and the renderer.
const FRAME=1/30;
const flat=(s:Record<string,number|number[]>)=>Object.entries(s).flatMap(([k,v])=>Array.isArray(v)?v.map((x,i)=>[`${k}[${i}]`,x] as const):[[k,v] as const]);
/** Largest single-frame change of any state value along step-by-step keys (one per second plus the key length). */
function maxStep(kind:PwKind,values:number[],state:(a:number)=>Record<string,number|number[]>){
 const dur=PW_KEY_SECONDS[kind],keys=values.map((value,i)=>({at:1+i*(dur+1),value})),end=keys.at(-1)!.at+dur+1;
 let prev=flat(state(keyed(0,keys,0,dur,easeSine))),worst={d:0,name:"",t:0};
 for(let t=FRAME;t<=end;t+=FRAME){const cur=flat(state(keyed(t,keys,0,dur,easeSine)));
  cur.forEach(([name,v],i)=>{const d=Math.abs(v-prev[i][1]);if(d>worst.d)worst={d,name,t};});prev=cur;}
 return worst;
}

test("fingerprints: same input gives the same strip, another input a clearly different one, re-rolls are smooth",async()=>{
 const P=await import("../renderer/IllustratedPasswords");
 assert.deepEqual(P.fpPattern(P.SEED_A),P.fpPattern(P.SEED_A));
 assert.equal(P.fpPattern(P.SEED_A).length,P.FP_N);
 assert.ok(P.fpDistance(P.fpPattern(P.SEED_A),P.fpPattern(P.SEED_B))>.2,"one changed letter prints a completely different strip");
 for(let s=1;s<40;s++)assert.ok(P.fpPattern(s).every(v=>v>=.16&&v<=1),`bars of seed ${s} stay inside the strip`);
 for(let i=0;i<P.FP_N;i++){let prev=P.fpMorph(0,i);for(let m=.01;m<=1.0001;m+=.01){const v=P.fpMorph(m,i);assert.ok(Math.abs(v-prev)<.08,`bar ${i} at ${m}`);prev=v;}assert.equal(P.fpMorph(1,i),1);}
});

test("password states change continuously at 30 fps under step-by-step keys",async()=>{
 const P=await import("../renderer/IllustratedPasswords");
 const cases:[PwKind,number[],(a:number)=>Record<string,number|number[]>][]=[
  ["login-phone",[.33,.66,1],a=>P.phoneState(a,1)],
  ["login-phone",[.5,1],a=>P.phoneState(a,2)],
  ["hash-grinder",[.25,.5,.75,1],a=>({...P.grinderState(a),speed:P.grinderSpeed(a)/400,mill:P.millRate(a)/3})],
  ["hash-vault",[.25,.5,.75,1],a=>P.vaultState(a)],
  ["guess-wall",[.5,1,0],a=>({rate:P.guessRate(a)/7})],
  ["lookup-table",[.33,.66,1],a=>P.tableState(a)],
  ["salt-shaker",[.5,1],a=>P.saltState(a)],
  ["slow-hourglass",[.33,.66,1],a=>({...P.hourglassState(a),rate:P.sandRate(a)})],
  ["reset-letter",[.25,.5,.75,1],a=>P.letterState(a)],
 ];
 for(const [kind,values,state] of cases){const w=maxStep(kind,values,state);assert.ok(w.d<.2,`${kind} ${w.name} jumps ${w.d.toFixed(3)} at ${w.t.toFixed(2)} s`);}
 // A jump over several steps replays them inside one key: the grinder from 0 straight to 1 still spans many frames.
 const keys=[{at:1,value:1}];let between=0;for(let f=30;f<90;f++){const s=P.grinderState(keyed(f/30,keys,0,PW_KEY_SECONDS["hash-grinder"],easeSine)).print1;if(s>.01&&s<.99)between++;}
 assert.ok(between>=2,`first strip prints over ${between} frames even on a jump`);
 // The guessing speed is continuous through the fast peak and slows down to a crawl.
 assert.ok(Math.abs(P.guessRate(.5)-7)<1e-9&&P.guessRate(1)<.5&&P.guessRate(0)===0);
});

test("integrated motions (mill, guessing wall, sand) never jump backwards and a stopped one stays put",async()=>{
 const P=await import("../renderer/IllustratedPasswords");
 const wall={activeKeys:[{at:1,value:.5},{at:5,value:1},{at:9,value:0}],enterAt:0};
 let prev=P.integrate(0,wall,"guess-wall",P.guessRate);
 for(let t=FRAME;t<13;t+=FRAME){const x=P.integrate(t,wall,"guess-wall",P.guessRate),d=x-prev;assert.ok(d>=-1e-9&&d<=7*FRAME+1e-6,`wall step ${d.toFixed(4)} at ${t.toFixed(2)}`);prev=x;}
 assert.ok(Math.abs(P.integrate(12.5,wall,"guess-wall",P.guessRate)-P.integrate(11.5,wall,"guess-wall",P.guessRate))<1e-6,"stopped wall does not creep");
 const mill={activeKeys:[{at:1,value:.6},{at:4,value:0}],enterAt:0};
 let m=P.integrate(0,mill,"hash-grinder",P.millRate);
 for(let t=FRAME;t<8;t+=FRAME){const x=P.integrate(t,mill,"hash-grinder",P.millRate);assert.ok(x-m>=-1e-9&&x-m<=3*FRAME,`mill step at ${t.toFixed(2)}`);m=x;}
 const glass={activeKeys:[{at:1,value:.33}],enterAt:0};let g=P.integrate(0,glass,"slow-hourglass",P.sandRate);
 for(let t=FRAME;t<12;t+=FRAME){const x=P.integrate(t,glass,"slow-hourglass",P.sandRate);assert.ok(x-g>=-1e-9&&x-g<=.2*FRAME+1e-9,`sand step at ${t.toFixed(2)}`);g=x;}
 // Only the scrolling rows of the wall move: a matched guess is a real match of the stolen target pattern.
 assert.ok(Array.from({length:60},(_,k)=>P.isMatch(k)).filter(Boolean).length>=3,"the wall finds some matches");
});

test("every passwords kind renders all states without NaN or words, with x-ray overlays only where declared",async()=>{
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 const {PwArt}=await import("../renderer/IllustratedPasswords");
 for(const kind of PW_KINDS)for(const rows of kind==="login-phone"||kind==="hash-grinder"?[1,2]:[1])for(const a of [0,.1,.2,.25,.3,.33,.4,.5,.55,.6,.66,.7,.75,.8,.85,.9,.95,1]){
  const o={id:"x",kind,rows,cols:2,label:"",activeKeys:[{at:0,value:a}],enterAt:0,exitAt:Infinity,moveKeys:[]} as any;
  for(const t of [.2,3.7]){
   const html=renderToStaticMarkup(React.createElement("svg",null,React.createElement(PwArt,{kind,o,t,a,xray:.6,uid:"u"})));
   assert.ok(html.length>300&&!/NaN|Infinity|undefined/.test(html),`${kind} rows ${rows} at ${a}`);
   assert.ok(!/<text/.test(html),`${kind} draws no words or numbers`);
  }
  const over=renderToStaticMarkup(React.createElement("svg",null,React.createElement(PwArt,{kind,o,t:3.7,a,xray:.6,uid:"u",overlay:true})));
  assert.equal(over.length>20,(PW_XRAY_OVERLAY as readonly string[]).includes(kind),`${kind} overlay`);
 }
});

test("passwords kinds are wired into the catalog, the renderer and the slow-state table",async()=>{
 const {ILLUSTRATED_KINDS,FOOTPRINT,KIND_GUIDE}=await import("../src/lib/illustrated");
 const {KEY_SECONDS}=await import("../renderer/IllustratedFilm");
 const source=(await import("node:fs")).readFileSync(new URL("../renderer/IllustratedFilm.tsx",import.meta.url),"utf8");
 for(const k of PW_KINDS){
  assert.ok((ILLUSTRATED_KINDS as readonly string[]).includes(k),k);
  assert.deepEqual(FOOTPRINT[k],PW_FOOTPRINT[k]);assert.ok(KIND_GUIDE[k]===PW_GUIDE[k]&&PW_GUIDE[k].length>80,`${k} guide`);
  assert.equal(KEY_SECONDS[k],PW_KEY_SECONDS[k]);assert.ok(source.includes(`case "${k}"`),`renderer case ${k}`);
 }
});
