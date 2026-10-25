import {test} from "node:test";
import assert from "node:assert/strict";
import {keyed,easeSine} from "../src/lib/illustrated";
import {MINUTE_KINDS,MINUTE_FOOTPRINT,MINUTE_GUIDE,MINUTE_KEY_SECONDS,MINUTE_CALLOUT_ANCHOR,COUNTER_ICONS,loopPhase,parseAmount,moneyStackMax,type MinuteKind} from "../src/lib/illustrated-catalog-minute";

// "One minute on Earth" catalog (2026-10-22): continuous states at 30 fps, loop-aware ambient motion (the looped
// film's last frame equals its first), label parsing, the odometer counter, proportional money stacks, and every
// kind rendering all documented states without NaN.
const FRAME=1/30;
const flat=(s:Record<string,number|number[]>)=>Object.entries(s).flatMap(([k,v])=>Array.isArray(v)?v.map((x,i)=>[`${k}[${i}]`,x] as const):[[k,v] as const]);
/** Largest single-frame change of any state value along step-by-step keys (one per second plus the key length). */
function maxStep(kind:MinuteKind,values:number[],state:(a:number)=>Record<string,number|number[]>){
 const dur=MINUTE_KEY_SECONDS[kind],keys=values.map((value,i)=>({at:1+i*(dur+1),value})),end=keys.at(-1)!.at+dur+1;
 let prev=flat(state(keyed(0,keys,0,dur,easeSine))),worst={d:0,name:"",t:0};
 for(let t=FRAME;t<=end;t+=FRAME){const cur=flat(state(keyed(t,keys,0,dur,easeSine)));
  cur.forEach(([name,v],i)=>{const d=Math.abs(v-prev[i][1]);if(d>worst.d)worst={d,name,t};});prev=cur;}
 return worst;
}
const circ=(a:number,b:number)=>{const d=Math.abs(a-b)%1;return Math.min(d,1-d);};

test("loopPhase: seamless over a looped film, continuous per frame, plain period without a loop",()=>{
 for(const loop of [58.4,60,61.2,90]){for(const period of [.857,2.7,3.53,6.4,9,12,60,180]){
  assert.ok(circ(loopPhase(0,period,loop),loopPhase(loop,period,loop))<1e-9,`phase(0)=phase(loop) for period ${period}, loop ${loop}`);
  const n=Math.max(1,Math.round(loop/period));let prev=loopPhase(0,period,loop);
  for(let f=1;f<=Math.round(loop*30);f++){const ph=loopPhase(f/30,period,loop);assert.ok(ph>=0&&ph<1);assert.ok(circ(ph,prev)<=n/(loop*30)+1e-9,`phase steps evenly (${period}/${loop})`);prev=ph;}
 }}
 assert.ok(Math.abs(loopPhase(1.5,6)-.25)<1e-12);assert.ok(Math.abs(loopPhase(7.5,6)-.25)<1e-12);assert.equal(loopPhase(0,6),0);
 // A whole number of cycles: 17 blinks a minute in a 60 s loop is exactly 17 cycles.
 assert.ok(Math.abs(loopPhase(30,60/17,60)-.5)<1e-9);
});

test("parseAmount reads money, units and magnitude words",()=>{
 const cases:[string,number|null][]=[["$88,000",88000],["$1.3 million",1.3e6],["$200 million",2e8],["250",250],["1,800 km",1800],["26 calories",26],
  ["2.6 billion",2.6e9],["2,600",2600],["$3 trillion",3e12],["$450 thousand",450000],["about 70",70],["no number",null],["",null]];
 for(const [label,want] of cases){const got=parseAmount(label);assert.ok(want===null?got===null:got!==null&&Math.abs(got-want)<1e-6*want,`${label} → ${got}`);}
});

test("minute states change continuously at 30 fps under step-by-step keys",async()=>{
 const M=await import("../renderer/IllustratedMinute");
 const cases:[MinuteKind,number[],(a:number)=>Record<string,number|number[]>][]=[
  ["maternity-ward",[.5,1,0,.5],a=>M.wardState(a)],
  ["viewer",[.33,.66,1,0],a=>M.viewerState(a)],
  ["counter",[1,0,1],a=>M.counterState(a)],
  ["minute-earth",[.5,1,0],a=>M.earthState(a)],
  ["upload-phone",[.5,1,0],a=>({screen:M.uploadState(a).screen,rate:M.uploadState(a).rate/10})],
  ["kiss-couple",[.5,1,0],a=>M.kissState(a)],
 ];
 for(const [kind,values,state] of cases){const w=maxStep(kind,values,state);assert.ok(w.d<.2,`${kind} ${w.name} jumps ${w.d.toFixed(3)} at ${w.t.toFixed(2)} s`);}
 // Positions in px: the kiss lean (hips, head) and the falling bundles.
 const kiss=maxStep("kiss-couple",[.5,1,.5,0],a=>{const p=M.kissPose(M.kissState(a).lean);const head=p.hip+136*Math.sin(p.ang*Math.PI/180)+p.shift;return {hip:p.hip/14,head:head/14,tilt:p.tilt/14};});
 assert.ok(kiss.d<1,`kiss pose moves ${(kiss.d*14).toFixed(1)} px per frame`);
 for(const H of [18,90,300,620]){const w=maxStep("money-stack",[1,0,.5,1],a=>({tops:M.stackBundles(H,a).map(b=>b.top/14),o:M.stackBundles(H,a).map(b=>b.o)}));assert.ok(w.d<1,`stack ${H}: ${w.name} moves ${w.d.toFixed(3)} (×14 px) per frame`);}
 // Documented settled states.
 assert.equal(M.wardState(0).births,0);assert.equal(M.wardState(.5).births,1);assert.equal(M.wardState(1).glow,1);assert.equal(M.wardState(.5).glow,0);
 assert.equal(M.viewerState(.33).focus,1);assert.equal(M.viewerState(.33).heart,0);assert.equal(M.viewerState(.66).heart,1);assert.equal(M.viewerState(.66).flame,0);assert.equal(M.viewerState(1).flame,1);
 assert.equal(M.kissState(0).lean,0);assert.equal(M.kissState(.5).lean,1);assert.equal(M.kissState(.5).burn,0);assert.equal(M.kissState(1).burn,1);
 assert.equal(M.uploadState(0).rate,0);assert.ok(Math.abs(M.uploadState(.5).rate-2.75)<1e-9);assert.equal(M.uploadState(1).rate,10);
 assert.equal(M.counterState(1).flash,M.counterState(1).flash);assert.ok(M.counterState(1).flash<1e-9&&M.counterState(1).glow===1);
});

test("loop-aware ambient motion never jumps and the looped film's last frame equals its first",async()=>{
 const M=await import("../renderer/IllustratedMinute");
 for(const loop of [undefined,60,58.4]){
  const end=loop??70;let prev:any=null;
  for(let f=0;f<=Math.round(end*30);f++){const t=f/30;
   const cur={b:[0,3,7].map(s=>M.cribBirth(t,s,loop)),blink:M.blinkAt(t,loop),beat:M.heartBeat(t,loop)};
   if(prev){for(let s=0;s<3;s++){for(const k of ["burst","swap","rise"] as const)assert.ok(Math.abs(cur.b[s][k]-prev.b[s][k])<.2,`crib ${s} ${k} at ${t.toFixed(2)} (loop ${loop})`);}
    assert.ok(Math.abs(cur.blink-prev.blink)*16.5<14,`eyelid moves < 14 px per frame at ${t.toFixed(2)}`);assert.ok(Math.abs(cur.blink-prev.blink)<.5,"a blink spans several frames");
    // The heart is drawn r·(1+0.17·beat) with glow opacity 0.55+0.45·beat: under 1.5 px and 0.2 opacity per frame.
    assert.ok(Math.abs(cur.beat-prev.beat)*.45<.2&&Math.abs(cur.beat-prev.beat)*18*.17<1.5,`heartbeat at ${t.toFixed(2)}`);assert.ok(Math.abs(cur.beat-prev.beat)<.5,"a beat spans several frames");}
   prev=cur;}
 }
 // Lightning: each flash rises over 2–3 frames and decays slowly.
 for(let k=0;k<48;k++){let prev=M.flashAt(0,k,1,60),rises=0;for(let f=1;f<=1800;f++){const e=M.flashAt(f/30,k,1,60),d=e-prev;assert.ok(d<.6,`flash ${k} rises over ≥2 frames`);assert.ok(-d<.2,`flash ${k} decays slowly`);if(d>.05&&prev<.05)rises++;prev=e;}assert.ok(rises>=20,`flash ${k} fires repeatedly (${rises})`);}
 // About 17 blinks a minute; 70 heartbeats a minute.
 let blinks=0,beats=0,pb=0,ph=0;for(let f=0;f<1800;f++){const b=M.blinkAt(f/30,60),h=M.heartBeat(f/30,60);if(b>.5&&pb<=.5)blinks++;if(h>.5&&ph<=.5)beats++;pb=b;ph=h;}
 assert.equal(blinks,17);assert.equal(beats,70);
 // Seam: every non-integrated kind renders the same markup at t=0 and t=loop.
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 const draw=(kind:MinuteKind,t:number,a:number,rows=1,label="",aim="")=>renderToStaticMarkup(React.createElement("svg",null,React.createElement(M.MinuteArt,{kind,o:{id:"x",kind,rows,cols:2,label,aim,activeKeys:[{at:0,value:a}],enterAt:0,exitAt:Infinity,moveKeys:[]} as any,t,a,xray:0,uid:"u",loop:60})));
 for(const [kind,a,rows,label,aim] of [["maternity-ward",0],["maternity-ward",.5],["maternity-ward",1],["viewer",.2],["counter",1,1,"$88,000","coin"],["counter",1,1,"250","heart"],["money-stack",1,1,"$1.3 million"],["minute-earth",1,1],["minute-earth",1,2],["kiss-couple",1],["upload-phone",0,3]] as [MinuteKind,number,number?,string?,string?][]){
  assert.equal(draw(kind,0,a,rows,label,aim),draw(kind,60,a,rows,label,aim),`${kind} a=${a} rows ${rows??1}: last frame equals the first`);
 }
});

test("the blink tally counts one mark per blink after the focus key",async()=>{
 const M=await import("../renderer/IllustratedMinute");
 const o={activeKeys:[{at:2,value:.33}],enterAt:0};let prev=M.tallyAt(0,o,60);
 assert.equal(prev.n,0);
 for(let f=1;f<=40*30;f++){const t=f/30,c=M.tallyAt(t,o,60);assert.ok(c.n>=prev.n&&c.n-prev.n<=1,`tally +1 at most at ${t.toFixed(2)}`);
  if(c.n===prev.n&&c.n>0&&c.n<20)assert.ok(c.draw-prev.draw<.25&&c.draw>=prev.draw-1e-9,`newest mark draws in smoothly at ${t.toFixed(2)}`);prev=c;}
 const n=M.tallyAt(40,o,60).n;assert.ok(n>=10&&n<=12,`about 17 marks a minute (${n} in 38 s)`);
});

test("the counter rolls every column monotonically and lands exactly on the label",async()=>{
 const M=await import("../renderer/IllustratedMinute");
 for(const label of ["$88,000","250","1,800 km","26 calories","2.6 billion","2,600","$200 million","15–20 times","0"]){
  const zero=M.counterRoll(label,0);assert.equal(zero.text,label.replace(/\d/g,"0"),`${label} starts at zeros`);
  assert.equal(M.counterRoll(label,1).text,label,`${label} ends exactly on the label`);
  let prev=zero.cols.map(c=>c.pos);
  for(let f=1;f<=60;f++){const a=keyed(f/30,[{at:0,value:1}],0,MINUTE_KEY_SECONDS.counter,easeSine),cols=M.counterRoll(label,a).cols.map(c=>c.pos);
   cols.forEach((p,i)=>{assert.ok(p>=prev[i]-1e-12,`${label} column ${i} never rolls back`);assert.ok(p-prev[i]<.45,`${label} column ${i} rolls < 0.45 digit per frame`);});prev=cols;}
  assert.ok(M.counterRoll(label,1).cols.every(c=>c.pos>0),`${label}: every column moves`);
 }
 const L=M.counterLayout("$1,234,567,890 calories total",600-194,88);assert.ok(L.width<=600-194+1e-6&&L.fs<88,"long labels shrink to fit the plate");
});

test("money stacks are proportional to amount/stackMax with a visible minimum",async()=>{
 const M=await import("../renderer/IllustratedMinute");
 assert.equal(M.stackHeight("$1.3 million",1.3e6),M.STACK_FULL);
 assert.ok(Math.abs(M.stackHeight("$650,000",1.3e6)-M.STACK_FULL/2)<1e-9);
 assert.ok(Math.abs(M.stackHeight("$88,000",1.3e6)-M.STACK_FULL*88000/1.3e6)<1e-9);
 assert.equal(M.stackHeight("$88",1.3e6),M.STACK_MIN);assert.equal(M.stackHeight("$88,000"),M.STACK_FULL);
 const row=[{id:"a",kind:"money-stack",label:"$88,000",y:900},{id:"b",kind:"money-stack",label:"$1.3 million",y:910},{id:"c",kind:"money-stack",label:"$200 million",y:400},{id:"d",kind:"counter",label:"$9 billion",y:900}];
 assert.equal(moneyStackMax(row,"a"),1.3e6);assert.equal(moneyStackMax(row,"b"),1.3e6);assert.equal(moneyStackMax(row,"c"),2e8);assert.equal(moneyStackMax(row,"d"),undefined);
 for(const H of [18,40,301,620]){const b=M.stackBundles(H,1);assert.ok(Math.abs(-b.at(-1)!.top-H)<1e-9,`complete stack is ${H} px`);assert.ok(b.every(x=>x.o===1));
  assert.ok(M.stackBundles(H,0).every(x=>x.o===0),"empty pedestal at 0");
  let prevH=0;for(let a=0;a<=1.0001;a+=.01){const top=Math.max(0,...M.stackBundles(H,a).filter(x=>x.u>=1).map(x=>-x.top));assert.ok(top>=prevH-1e-9,"landed height only grows");prevH=top;}}
});

test("integrated orbit travel and upload stream never jump when the keyed speed changes",async()=>{
 const M=await import("../renderer/IllustratedMinute");
 const o={activeKeys:[{at:1,value:.5},{at:4,value:1},{at:7,value:0},{at:9,value:.5}],enterAt:0};
 let prev=M.orbitTravel(0,o);for(let t=FRAME;t<12;t+=FRAME){const x=M.orbitTravel(t,o);assert.ok(x>=prev-1e-9&&x-prev<9,`orbit step ${(x-prev).toFixed(2)} at ${t.toFixed(2)}`);prev=x;}
 assert.ok(Math.abs(M.orbitTravel(8.6,o)-M.orbitTravel(9,o))<1e-6,"the orbit stops while the speed is 0");
 const stop={activeKeys:[{at:1,value:.5},{at:4,value:1},{at:7,value:0}],enterAt:0};
 assert.ok(M.uploadCards(8,stop).length>5,"cards still in flight right after the stop");assert.equal(M.uploadCards(10.6,stop).length,0,"no cards in flight long after the stream stopped");
 let before=new Map<number,number>();
 for(let t=FRAME;t<12;t+=FRAME){const cards=M.uploadCards(t,o),now=new Map(cards.map(c=>[c.j,c.age]));
  for(const [j,age] of now){const was=before.get(j);if(was!==undefined)assert.ok(Math.abs(age-was-FRAME)<1e-6,`card ${j} ages by one frame`);else assert.ok(age<FRAME+1e-9,`card ${j} is emitted between frames`);}
  before=now;}
});

test("every minute kind renders all documented states without NaN; only counter and money-stack draw text",async()=>{
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 const {MinuteArt}=await import("../renderer/IllustratedMinute");
 const rowsOf:Record<MinuteKind,number[]>={"maternity-ward":[1],viewer:[1],counter:[1,2],"money-stack":[1],"minute-earth":[1,2,3],"upload-phone":[1,2,3],"kiss-couple":[1]};
 const labels:Partial<Record<MinuteKind,string[]>>={counter:["$88,000","26 calories","2.6 billion","a minute",""],"money-stack":["$88,000","$1.3 million","$200 million",""]};
 for(const kind of MINUTE_KINDS)for(const rows of rowsOf[kind])for(const label of labels[kind]??[""])for(const aim of kind==="counter"?[...COUNTER_ICONS,"unknown"]:[""])for(const a of [0,.1,.25,.33,.5,.66,.75,.9,1])for(const loop of [undefined,60]){
  if(kind==="counter"&&aim!=="baby"&&a!==1&&a!==0)continue;
  const o={id:"x",kind,rows,cols:2,label,aim,activeKeys:[{at:0,value:.33},{at:2,value:a}],enterAt:0,exitAt:Infinity,moveKeys:[]} as any;
  const html=renderToStaticMarkup(React.createElement("svg",null,React.createElement(MinuteArt,{kind,o,t:6.3,a,xray:0,uid:"u",loop,stackMax:kind==="money-stack"?1.3e6:undefined})));
  assert.ok(html.length>300&&!/NaN|Infinity|undefined/.test(html),`${kind} rows ${rows} ${label} ${aim} at ${a}`);
  if(kind!=="counter"&&kind!=="money-stack")assert.ok(!/<text/.test(html),`${kind} draws no words or numbers`);
  const over=renderToStaticMarkup(React.createElement("svg",null,React.createElement(MinuteArt,{kind,o,t:6.3,a,xray:1,uid:"u",overlay:true})));assert.ok(over.length<20,`${kind} has no x-ray overlay`);
 }
 for(const kind of MINUTE_KINDS){const [w,h]=MINUTE_FOOTPRINT[kind];for(const [x,y] of Object.values(MINUTE_CALLOUT_ANCHOR[kind]??{}))assert.ok(Math.abs(x)<=w/2&&Math.abs(y)<=h/2,`${kind} callout anchor inside the footprint`);
  assert.ok(MINUTE_GUIDE[kind].length>200,`${kind} guide`);assert.ok(MINUTE_KEY_SECONDS[kind]>=1,`${kind} slow key`);}
});

test("minute-earth rows 4 keeps one planet: overlay weights change smoothly and every stage renders",async()=>{
 const M=await import("../renderer/IllustratedMinute"),React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 for(let a=0;a<=1;a+=.01){const p=M.earthLayers(a),q=M.earthLayers(a+.01);for(const k of ["wL","wO","wS"] as const)assert.ok(Math.abs(p[k]-q[k])<.2,`${k} jumps at ${a.toFixed(2)}`);}
 const at=(a:number)=>M.earthLayers(a);
 assert.ok(at(.33).wL>.9&&at(.33).wO<.05&&at(.33).wS<.05,"0.33 = lightning");
 assert.ok(at(.6).wO>.9&&at(.6).wL<.05,"0.6 = orbit");
 assert.ok(at(1).wS>.99&&at(1).wO<.01,"1 = sunlight");
 for(const a of [0,.33,.5,.6,.8,1]){const o:any={id:"e",kind:"minute-earth",rows:4,cols:2,label:"",aim:"",activeKeys:[{at:0,value:a}],enterAt:0,exitAt:Infinity,moveKeys:[]};
  const html=renderToStaticMarkup(React.createElement("svg",null,React.createElement(M.MinuteArt,{kind:"minute-earth",o,t:4,a,xray:0,uid:"e",loop:60})));assert.ok(!/NaN/.test(html),`NaN at a=${a}`);}
});
