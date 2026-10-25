import {test} from "node:test";
import assert from "node:assert/strict";
import {keyed,easeSine} from "../src/lib/illustrated";
import {SHAZAM_KINDS,SHAZAM_FOOTPRINT,SHAZAM_GUIDE,SHAZAM_KEY_SECONDS,SHAZAM_CALLOUT_ANCHOR,type ShazamKind} from "../src/lib/illustrated-catalog-shazam";

// Shazam catalog (2026-10-22): continuous state changes at 30 fps, an integrated spectrogram scroll that never jumps,
// peaks that are true local maxima of the drawn song, a stable anchor pair, and every kind wired into the catalog.
const FRAME=1/30;
const flat=(s:Record<string,number|number[]>)=>Object.entries(s).flatMap(([k,v])=>Array.isArray(v)?v.map((x,i)=>[`${k}[${i}]`,x] as const):[[k,v] as const]);
/** Largest single-frame change of any state value along step-by-step keys (one per second plus the key length). */
function maxStep(kind:ShazamKind,values:number[],state:(a:number)=>Record<string,number|number[]>){
 const dur=SHAZAM_KEY_SECONDS[kind],keys=values.map((value,i)=>({at:1+i*(dur+1),value})),end=keys.at(-1)!.at+dur+1;
 let prev=flat(state(keyed(0,keys,0,dur,easeSine))),worst={d:0,name:"",t:0};
 for(let t=FRAME;t<=end;t+=FRAME){const cur=flat(state(keyed(t,keys,0,dur,easeSine)));
  cur.forEach(([name,v],i)=>{const d=Math.abs(v-prev[i][1]);if(d>worst.d)worst={d,name,t};});prev=cur;}
 return worst;
}

test("Shazam states change continuously at 30 fps under step-by-step keys",async()=>{
 const S=await import("../renderer/IllustratedShazam");
 const cases:[ShazamKind,number[],(a:number)=>Record<string,number|number[]>][]=[
  ["listen-phone",[.33,.66,1],a=>S.phoneState(a)],
  ["noisy-bar",[1,0,1],a=>S.barState(a)],
  ["sound-wave",[.5,1],a=>S.waveState(a)],
  ["spectrogram",[.2,.4,.6,.8,.9,.95,1],a=>S.spectroState(a)],
  ["fingerprint-card",[.33,.66,1],a=>S.cardState(a)],
  ["song-shelves",[.33,.66,1],a=>S.shelvesState(a)],
  ["offset-histogram",[.33,.55,.8,1],a=>({...S.histState(a),bars:S.histBars(S.histState(a)).map(h=>h/200)})],
  ["track-card",[.5,1],a=>S.trackState(a)],
 ];
 for(const [kind,values,state] of cases){const w=maxStep(kind,values,state);assert.ok(w.d<.2,`${kind} ${w.name} jumps ${w.d.toFixed(3)} at ${w.t.toFixed(2)} s`);}
 // Every documented settled value shows its full state.
 assert.equal(S.spectroState(.4).dim,1);assert.equal(S.spectroState(.4).write,0);assert.equal(S.spectroState(.2).write,1);
 assert.equal(S.spectroState(.6).noise,1);assert.equal(S.spectroState(.8).links,1);assert.equal(S.spectroState(.8).pitch1,0);
 assert.equal(S.spectroState(.9).pitch1,1);assert.equal(S.spectroState(.9).pitch2,0);assert.equal(S.spectroState(.95).pitch2,1);assert.equal(S.spectroState(1).gap,1);
 assert.equal(S.phoneState(.33).listen,1);assert.equal(S.phoneState(.66).think,1);assert.equal(S.phoneState(.66).found,0);assert.equal(S.phoneState(1).found,1);
 assert.equal(S.cardState(.33).link,1);assert.deepEqual(S.cardState(.66).slot,[1,1,1]);assert.equal(S.cardState(.66).stamp,0);assert.equal(S.cardState(1).stamp,1);
 assert.equal(S.shelvesState(.33).sweep,1);assert.equal(S.shelvesState(.66).hits,1);assert.equal(S.shelvesState(.66).one,0);
 assert.equal(S.histState(.33).lines,1);assert.equal(S.histState(.55).drops,1);assert.equal(S.histState(.8).spike,1);assert.equal(S.histState(.8).win,0);
 // A state change spans many frames: the spectrogram's peaks take at least 10 frames to appear.
 const keys=[{at:1,value:.4}];let between=0;for(let f=30;f<90;f++){const d=S.spectroState(keyed(f/30,keys,.2,SHAZAM_KEY_SECONDS.spectrogram,easeSine)).dim;if(d>.01&&d<.99)between++;}
 assert.ok(between>=10,`peaks appear over ${between} frames`);
});

test("the spectrogram scroll is integrated: it never jumps and stays put once the peaks are picked",async()=>{
 const S=await import("../renderer/IllustratedShazam");
 const o={activeKeys:[{at:1,value:.2},{at:6,value:.4},{at:9,value:.6},{at:11,value:.8}],enterAt:0};
 let prev=S.spectroScroll(0,o);
 for(let t=FRAME;t<14;t+=FRAME){const x=S.spectroScroll(t,o),d=x-prev;assert.ok(d>=-1e-9&&d<=16*FRAME+1e-6,`scroll step ${d.toFixed(3)} at ${t.toFixed(2)}`);prev=x;}
 const frozen=S.spectroScroll(8,o);assert.ok(frozen>40,`the board is full before the stop (${frozen.toFixed(1)} columns)`);
 assert.ok(Math.abs(S.spectroScroll(13,o)-frozen)<1e-6,"stopped scroll does not creep");
 // The pair the story is told on is the same in every frame after the stop.
 const p1=S.pairOf(S.visibleStars(S.spectroScroll(9,o))),p2=S.pairOf(S.visibleStars(S.spectroScroll(13,o)));
 assert.ok(p1&&p2&&p1.anchor.i===p2.anchor.i&&p1.targets.length>=1,"stable anchor with at least one target");
});

test("stars are true local maxima of the drawn song and the pair sits ahead of its anchor",async()=>{
 const S=await import("../renderer/IllustratedShazam");
 for(const rec of [0,23.5,48,77.2]){
  const stars=S.visibleStars(rec);assert.ok(stars.length>=10&&stars.length<=40,`${stars.length} stars at ${rec}`);
  for(const s of stars){const v=S.songAmp(s.c,s.r);assert.ok(v>=.62);
   for(let dc=-2;dc<=2;dc++)for(let dr=-2;dr<=2;dr++){const r=s.r+dr;if(r<0||r>=S.SPEC.rows||(!dc&&!dr))continue;assert.ok(S.songAmp(s.c+dc,r)<=v,`star ${s.c},${s.r} is a maximum`);}
   assert.ok(s.x>S.SPEC.x0&&s.x<S.SPEC.x1&&s.y>S.SPEC.y0&&s.y<S.SPEC.y1,"star inside the plot");}
  const p=S.pairOf(stars)!;assert.ok(p);for(const q of p.targets){assert.ok(q.c>p.anchor.c&&q.x>p.anchor.x,"targets are ahead in time");assert.ok(q.x>=p.zone.x0-1&&q.x<=p.zone.x1+1&&q.y>=p.zone.y0-1&&q.y<=p.zone.y1+1,"targets in the zone");}
 }
});

test("sound rings, the clip strip and other loops never jump",async()=>{
 const S=await import("../renderer/IllustratedShazam");
 for(let k=0;k<6;k++){let prev=S.ringAt(0,k);for(let t=FRAME;t<6;t+=FRAME){const c=S.ringAt(t,k);
  // A ring that wraps around is invisible at the wrap (opacity 0), so only visible steps count.
  if(Math.min(c.o,prev.o)>.05)assert.ok(Math.abs(c.r-prev.r)<4,`ring ${k} at ${t.toFixed(2)}`);assert.ok(Math.abs(c.o-prev.o)<.12,`ring ${k} opacity at ${t.toFixed(2)}`);prev=c;}}
 const keys=[{at:1,value:.33},{at:4,value:.55},{at:7,value:.8}];let prev=S.clipLeft(0,0);
 for(let t=FRAME;t<10;t+=FRAME){const sp=S.histState(keyed(t,keys,0,SHAZAM_KEY_SECONDS["offset-histogram"],easeSine)).spike,x=S.clipLeft(t,sp);assert.ok(Math.abs(x-prev)<14,`clip strip step at ${t.toFixed(2)}`);prev=x;}
});

test("every Shazam kind renders all states without NaN and without words",async()=>{
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 const {ShazamArt}=await import("../renderer/IllustratedShazam");
 for(const kind of SHAZAM_KINDS)for(const rows of kind==="fingerprint-card"||kind==="spectrogram"?[1,2]:[1])for(const a of [0,.1,.2,.3,.33,.4,.5,.55,.6,.66,.7,.8,.85,.9,.95,1]){
  const o={id:"x",kind,rows,cols:2,label:"",activeKeys:[{at:0,value:.2},{at:2,value:a}],enterAt:0,exitAt:Infinity,moveKeys:[]} as any;
  const html=renderToStaticMarkup(React.createElement("svg",null,React.createElement(ShazamArt,{kind,o,t:4.7,a,xray:.6,uid:"u"})));
  assert.ok(html.length>300&&!/NaN|Infinity|undefined/.test(html),`${kind} rows ${rows} at ${a}`);
  assert.ok(!/<text/.test(html),`${kind} draws no words or numbers`);
  const over=renderToStaticMarkup(React.createElement("svg",null,React.createElement(ShazamArt,{kind,o,t:4.7,a,xray:.6,uid:"u",overlay:true})));
  assert.ok(over.length<20,`${kind} has no x-ray overlay`);
 }
 for(const kind of SHAZAM_KINDS){const [w,h]=SHAZAM_FOOTPRINT[kind];for(const [x,y] of Object.values(SHAZAM_CALLOUT_ANCHOR[kind]??{}))assert.ok(Math.abs(x)<=w/2&&Math.abs(y)<=h/2,`${kind} callout anchor inside the footprint`);}
});

test("Shazam kinds are wired into the catalog, the renderer and the slow-state table",async()=>{
 const {ILLUSTRATED_KINDS,FOOTPRINT,KIND_GUIDE}=await import("../src/lib/illustrated");
 const {KEY_SECONDS}=await import("../renderer/IllustratedFilm");
 const source=(await import("node:fs")).readFileSync(new URL("../renderer/IllustratedFilm.tsx",import.meta.url),"utf8");
 for(const k of SHAZAM_KINDS){
  assert.ok((ILLUSTRATED_KINDS as readonly string[]).includes(k),k);
  assert.deepEqual(FOOTPRINT[k],SHAZAM_FOOTPRINT[k]);assert.ok(KIND_GUIDE[k]===SHAZAM_GUIDE[k]&&SHAZAM_GUIDE[k].length>80,`${k} guide`);
  assert.equal(KEY_SECONDS[k],SHAZAM_KEY_SECONDS[k]);assert.ok(source.includes(`case "${k}"`),`renderer case ${k}`);
 }
});
