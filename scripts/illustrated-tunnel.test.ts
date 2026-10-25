import {test} from "node:test";
import assert from "node:assert/strict";
import {trackAt,buildTrack,trackValue,tunnelPos,earthReveal,stopwatchDone,EARTH_CUT,ORBIT_SHADOW,MIN_MOVE} from "../renderer/IllustratedTunnel";
import {TUNNEL_KINDS,TUNNEL_FOOTPRINT,TUNNEL_GUIDE,TUNNEL_KEY_SECONDS,TUNNEL_CALLOUT_ANCHOR,TUNNEL_XRAY_OVERLAY} from "../src/lib/illustrated-catalog-tunnel";

const KS=TUNNEL_KEY_SECONDS["tunnel-earth"]!;
// The director's pattern: reveal (.15), tunnel ready (.3), jump (.3 again), centre (.65), other side (1), back (.3).
const trip=[{at:0,value:.15},{at:1,value:.3},{at:3,value:.3},{at:5,value:.65},{at:7,value:1},{at:10,value:.3}];
const y=(t:number,keys=trip)=>tunnelPos(trackAt(t,keys,KS).u)*EARTH_CUT.lp;

test("flight values arrive exactly on their key word",()=>{
 for(const k of trip.slice(2))assert.ok(Math.abs(trackAt(k.at,trip,KS).V-k.value)<1e-9,`value ${k.value} at ${k.at}`);
 assert.ok(Math.abs(y(5))<1e-6,"the jumper is in the centre on the word «center»");
 assert.ok(Math.abs(y(7)-EARTH_CUT.lp)<1e-6&&Math.abs(y(10)+EARTH_CUT.lp)<1e-6,"exit on «other side», back at the entry on «back»");
 // The fall starts on the jump word, not before it.
 assert.equal(trackAt(2.99,trip,KS).u,0);assert.ok(trackAt(3.3,trip,KS).u>0);
});
test("reveal states ease from their own word over the key seconds",()=>{
 const keys=[{at:1,value:.15}];
 assert.equal(trackAt(1,keys,KS).V,0);
 const mid=trackAt(2,keys,KS).V;assert.ok(mid>0&&mid<.15);
 assert.ok(Math.abs(trackAt(1+KS,keys,KS).V-.15)<1e-9);
 const r=earthReveal(.15);assert.ok(r.open>.99&&r.drill<.01);
 const s=earthReveal(.3);assert.ok(s.drill>.99&&s.ready>.99);
});
test("the jumper never jumps between frames and accelerates smoothly",()=>{
 let prev=y(0),prevD=0;
 for(let f=1;f<=12*30;f++){const t=f/30,v=y(t),d=v-prev;
  assert.ok(Math.abs(d)<40,`jump of ${d.toFixed(1)} px at ${t.toFixed(2)} s`);
  if(f>1)assert.ok(Math.abs(d-prevD)<4,`speed changes by ${(d-prevD).toFixed(2)} px/frame at ${t.toFixed(2)} s`);
  prev=v;prevD=d;}
});
test("speed is highest in the centre and zero at the exits",()=>{
 const speed=(t:number)=>Math.abs(y(t+1/60)-y(t-1/60))*30;
 assert.ok(speed(5)>3*speed(3.15),"centre faster than just after the jump");
 assert.ok(speed(5)>3*speed(6.85),"centre faster than just before the exit");
 assert.ok(speed(7)<speed(5)*.05,"at rest on the other side");
 // No speed kink through the centre: both sides of the centre key agree.
 const before=Math.abs(y(5)-y(5-1/30)),after=Math.abs(y(5+1/30)-y(5));assert.ok(Math.abs(before-after)<.5);
});
test("uneven word gaps still pass the centre without a speed kink",()=>{
 const keys=[{at:0,value:.3},{at:1,value:.3},{at:5.5,value:.65},{at:7,value:1}];
 const yy=(t:number)=>tunnelPos(trackAt(t,keys,KS).u);
 assert.ok(Math.abs(yy(5.5))<1e-9);
 const before=yy(5.5)-yy(5.5-1/30),after=yy(5.5+1/30)-yy(5.5);assert.ok(Math.abs(before-after)<.01,`centre kink ${before} vs ${after}`);
});
test("arbitrary key sets stay continuous (interrupts, holds, skipped ready state, close keys)",()=>{
 const h=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
 for(let s=0;s<40;s++){
  let at=h(s)*2;const keys=Array.from({length:7},(_,i)=>{at+=.15+h(s*13+i)*3;return {at,value:Math.round(h(s*7+i*3)*20)/20};});
  let prev=trackAt(0,keys,KS).V;
  for(let f=1;f<=30*30;f++){const v=trackAt(f/30,keys,KS).V;assert.ok(Math.abs(v-prev)<.1,`set ${s}: value jumps ${prev}→${v} at ${(f/30).toFixed(2)}`);assert.ok(v>=-1e-9&&v<=1+1e-9);prev=v;}
 }
 // Keys closer than MIN_MOVE arrive a little late rather than teleporting.
 const close=[{at:0,value:.3},{at:3,value:.3},{at:3.1,value:1}];
 assert.ok(trackAt(3.1,close,KS).V<1&&Math.abs(trackAt(3+MIN_MOVE,close,KS).V-1)<1e-9);
});
test("the orbit keeps going round while the faller swings back: its shadow is the faller",()=>{
 for(let f=0;f<=12*30;f++){const t=f/30,s=trackAt(t,trip,KS);
  assert.ok(Math.abs(-Math.cos(Math.PI*s.W)-tunnelPos(s.u))<1e-6,`shadow and faller differ at ${t}`);}
 assert.ok(trackAt(11,trip,KS).W>1.99,"after there-and-back the satellite has gone all the way round");
 let prev=trackAt(0,trip,KS).W;for(let f=1;f<=12*30;f++){const w=trackAt(f/30,trip,KS).W;assert.ok(w>=prev-1e-12&&w-prev<.08);prev=w;}
});
test("the stopwatch runs at constant speed from key to key",()=>{
 const keys=[{at:2,value:0},{at:6,value:1}],ks=TUNNEL_KEY_SECONDS.stopwatch!;
 const v=(t:number)=>trackAt(t,keys,ks,0,true).V;
 assert.equal(v(2),0);assert.ok(Math.abs(v(4)-.5)<1e-9);assert.ok(Math.abs(v(6)-1)<1e-9);assert.ok(Math.abs(v(3)-.25)<1e-9);
 const single=[{at:1,value:1}];assert.equal(trackAt(1,single,ks,0,true).V,0);assert.ok(Math.abs(trackAt(1+ks,single,ks,0,true).V-1)<1e-9);
 assert.equal(buildTrack([],ks,0,true).length,0);assert.equal(trackValue([],3),0);
 // The green "arrived" glow eases in over about 0.6 s after the arc closes, never in a frame or two.
 assert.equal(stopwatchDone(5.9,keys,ks),0);let prev=0,frames=0;
 for(let f=0;f<60;f++){const d=stopwatchDone(6+f/30,keys,ks);assert.ok(d-prev<.12,`glow jumps ${prev}→${d}`);if(d>.02&&d<.98)frames++;prev=d;}
 assert.ok(frames>=10&&prev>.99,"the glow takes at least 10 frames and completes");
});
test("catalog meta is complete and the drawings fit their footprints",async()=>{
 for(const k of TUNNEL_KINDS){assert.ok(TUNNEL_FOOTPRINT[k]&&TUNNEL_GUIDE[k].length>80,k);assert.ok(!TUNNEL_GUIDE[k].includes("черновик"),k);}
 for(const [k,sides] of Object.entries(TUNNEL_CALLOUT_ANCHOR)){const [w,h]=TUNNEL_FOOTPRINT[k as keyof typeof TUNNEL_FOOTPRINT];
  for(const [x,yy] of Object.values(sides!))assert.ok(Math.abs(x)<=w/2&&Math.abs(yy)<=h/2,`${k} anchor inside footprint`);}
 const [ew,eh]=TUNNEL_FOOTPRINT["tunnel-earth"],{R,lp}=EARTH_CUT;
 assert.ok(lp+34<=eh/2,"the jumper at either mouth stays inside the footprint");
 assert.ok(R<=ew/2,"the front half swings open about its right edge, inside the footprint");
 const [ow,oh]=TUNNEL_FOOTPRINT["orbit-shadow"];assert.ok(ORBIT_SHADOW.ro+40<=Math.min(ow,oh)/2);
 assert.deepEqual([...TUNNEL_XRAY_OVERLAY],["tunnel-earth"]);
 const source=(await import("node:fs")).readFileSync(new URL("../renderer/IllustratedFilm.tsx",import.meta.url),"utf8");
 for(const k of TUNNEL_KINDS)assert.ok(source.includes(`case "${k}":`),`${k} is wired into IllustratedFilm`);
});
test("every kind renders deterministically in all key states",async()=>{
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server"),{TunnelArt}=await import("../renderer/IllustratedTunnel");
 const o=(value:number,rows=1)=>({id:"x",kind:"tunnel-earth",x:0,y:0,scale:1,label:"",aim:"",rows,cols:2,enter:{scene:1,progress:0,cue:""},exit:null,active:[],moves:[],enterAt:0,exitAt:Infinity,activeKeys:value?[{at:0,value}]:[],moveKeys:[]}) as any;
 for(const kind of TUNNEL_KINDS)for(const v of [0,.15,.3,.5,.65,1])for(const rows of [1,2,3]){
  const draw=(overlay=false)=>renderToStaticMarkup(React.createElement("svg",null,React.createElement(TunnelArt,{kind,o:o(v,rows),t:6.2,a:v,xray:1,uid:"u",overlay})));
  const a=draw(),b=draw();assert.equal(a,b);assert.ok(!/NaN|Infinity/.test(a),`${kind} ${v} ${rows} has no NaN`);
  const over=draw(true);assert.ok(!/NaN/.test(over));
 }
});
