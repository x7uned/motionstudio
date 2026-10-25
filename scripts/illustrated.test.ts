import {test} from "node:test";
import assert from "node:assert/strict";
import {validateIllustrated,keyed,cameraAt,grounded,corpus,timeline,toScreen,resolveCallouts,SAFE,type IllustratedPlan} from "../src/lib/illustrated";
import {writtenText} from "../src/lib/quality";

const scenes=[
 {seconds:5,title:"Хаос",subtitle:"Лампы",items:["Лавовая лампа"],narration:"Компьютеры слишком предсказуемы поэтому снимают лавовые лампы."},
 {seconds:5,title:"Камера",subtitle:"Кадр",items:["Камера"],narration:"На лампы смотрит камера и кадр не повторить."},
];
const story={title:"Лампы и ключи",summary:"",scenes};
const alignment=[{words:[{text:"Компьютеры",start:.1,end:.6},{text:"лавовые",start:3,end:3.4},{text:"лампы.",start:3.4,end:3.9}]},{words:[{text:"камера",start:6.2,end:6.7},{text:"кадр",start:7.4,end:7.8}]}];
const A=(scene:number,cue="",progress=0)=>({scene,progress,cue});
const base=():IllustratedPlan=>({version:1,concept:"Лампы перед камерой",floorY:1400,
 objects:[
  {id:"lamp",kind:"lava-lamp",x:1000,y:1180,scale:1,label:"",aim:"",rows:1,cols:2,enter:A(1,"лавовые"),exit:null,active:[{at:A(1,"лампы"),value:1}],moves:[]},
  {id:"cam",kind:"camera",x:1400,y:1190,scale:1,label:"",aim:"lamp",rows:1,cols:2,enter:A(2,"камера"),exit:null,active:[{at:A(2,"кадр"),value:1}],moves:[]},
  {id:"mon",kind:"monitor",x:600,y:1230,scale:1,label:"",aim:"",rows:1,cols:2,enter:A(1),exit:A(1,"лавовые"),active:[],moves:[]},
 ],
 flows:[{from:"cam",to:"lamp",tone:"info",style:"solid",enter:A(2,"кадр"),exit:null}],
 callouts:[{target:"lamp",text:"Лавовая лампа",tone:"info",side:"top",enter:A(1,"лампы"),exit:A(2,"камера")}],
 camera:[{at:A(1),x:800,y:1100,zoom:1},{at:A(2,"камера"),x:1200,y:1100,zoom:.9}],
 mode:[],bigWords:[{text:"Хаос",enter:A(1),exit:A(1,"лавовые")}],notes:[]});

test("a grounded illustrated plan validates against measured words",()=>{
 const plan=validateIllustrated(base(),story,alignment);
 assert.equal(plan.objects.length,3);
});
test("callouts may only use words from the checked script",()=>{
 const bad=base();bad.callouts[0].text="Квантовый шум";
 assert.throws(()=>validateIllustrated(bad,story,alignment),/не опирается/);
 const number=base();number.callouts[0].text="1000 ламп";
 assert.throws(()=>validateIllustrated(number,story,alignment),/не опирается/);
 assert.equal(grounded("Кадр → числа ✓",corpus(story)),true);
});
test("the camera starts on the first frame and the solver frames what appears",()=>{
 const late=base();late.camera[0].at=A(1,"лавовые");
 assert.throws(()=>validateIllustrated(late,story,alignment),/первый ключ камеры/);
 const away=base();away.objects[1].x=3000;away.callouts=[];away.flows=[];
 const framed=validateIllustrated(away,story,alignment);
 const tl=timeline(framed,scenes,alignment),cam=tl.camera.at(-1)!.pose,s=toScreen({x:3000,y:1190},cam);
 assert.ok(s.x>=SAFE.left&&s.x<=SAFE.right,"the camera key was moved onto the object");
 assert.match(framed.notes.join(" "),/Кадрирование/);
 const split=base();split.objects[0].x=100;split.objects[1].x=3900;split.objects[1].enter=A(1,"лавовые");split.callouts=[];split.flows=[];
 assert.throws(()=>validateIllustrated(split,story,alignment),/вне безопасной зоны/);
});
test("callout traffic resolves to one per object, two on screen and full typing",()=>{
 const list=[{target:"a",text:"Первая выноска",enterAt:1,exitAt:5},{target:"a",text:"Вторая",enterAt:2,exitAt:6},{target:"b",text:"Третья",enterAt:2.5,exitAt:7},{target:"c",text:"Четвёртая",enterAt:3,exitAt:8}];
 const r=resolveCallouts(list);
 for(let t=0;t<9;t+=.05){const open=r.filter(c=>c.from<=t&&t<c.to+.3);assert.ok(open.length<=2,`at ${t}`);assert.ok(open.filter(c=>c.target==="a").length<=1);}
 for(const c of r)assert.ok(c.typing<=c.to-c.from);
});
test("state and camera move continuously from the key word",()=>{
 const keys=[{at:2,value:1},{at:4,value:0}];
 assert.equal(keyed(2,keys),0);assert.ok(keyed(2.2,keys)>0&&keyed(2.2,keys)<1);assert.equal(keyed(3,keys),1);
 for(let t=0;t<6;t+=1/30){const a=keyed(t,keys),b=keyed(t+1/30,keys);assert.ok(Math.abs(a-b)<.25,"no single-frame jump");}
 let between=0;for(let f=60;f<100;f++){const v=keyed(f/30,keys);if(v>0&&v<1)between++;}assert.ok(between>=10,"a state change spans at least 10 frames");
 const cam=[{at:0,pose:{x:0,y:0,zoom:1}},{at:3,pose:{x:900,y:0,zoom:1.5}}];
 for(let t=0;t<6;t+=1/30){const a=cameraAt(t,cam),b=cameraAt(t+1/30,cam);assert.ok(Math.abs(a.x-b.x)<60&&Math.abs(a.zoom-b.zoom)<.1);}
});
test("illustrated callouts and signs are part of the independent screen-text audit",()=>{
 const plan={...story,factNotes:"",filmKind:"illustrated" as const,illustrated:base(),scenes:scenes.map((s,i)=>({...s,id:`s${i}`,visual:"flow" as const}))} as any;
 assert.match(writtenText(plan),/Лавовая лампа/);
});
test("big accent words keep their spaces and fit the frame width",async()=>{
 const {bigWordSize}=await import("../renderer/IllustratedFilm");
 for(const text of ["Хаос","Не повторить","Не понадобятся","Хаос про запас"]){const size=bigWordSize(text),longest=Math.max(...(text.length<=9?[text]:text.split(" ")).map(w=>w.length));assert.ok(longest*size*.66<=860,`${text} fits the safe column`);assert.ok(size>=60);}
});
test("the saved illustrated-scene template switches new projects to the illustrated film",async()=>{
 const {loadVideoTemplate,listVideoTemplates}=await import("../src/lib/video-templates");
 const t=loadVideoTemplate("illustrated-scene");
 assert.equal(t.manifest.version,2);
 const runtime=t.manifest.runtime as any;
 assert.equal(runtime.filmKind,"illustrated");assert.equal(runtime.creatorOutro,"xtuned-outro/v1");assert.equal(runtime.voiceProfile.name,"Dennis");
 assert.equal(t.manifest.defaults.format,"9:16");
 assert.ok(listVideoTemplates().some(x=>x.id==="illustrated-scene"&&x.name==="Иллюстрированная сцена"&&x.version===2));
 // v1 stays as it was: its manifest and the lava-lamp reference film are untouched.
 const fs=await import("node:fs"),{createHash}=await import("node:crypto");
 const v1=JSON.parse(fs.readFileSync("data/templates/illustrated-scene/v1/template.json","utf8"));
 assert.deepEqual(v1.runtime,{renderMode:"2d",filmKind:"illustrated",visualDesignVersion:1,backgroundSelection:"approved-random"});
 assert.equal(createHash("sha256").update(fs.readFileSync("data/templates/illustrated-scene/v1/reference/video.mp4")).digest("hex"),v1.reference.videoSha256);
});
test("illustrated-scene/v2 snapshots its header avatar into the project with SHA-256",async()=>{
 const {loadVideoTemplate,snapshotTemplateAvatar}=await import("../src/lib/video-templates");
 const fs=await import("node:fs"),os=await import("node:os"),path=await import("node:path");
 const t=loadVideoTemplate("illustrated-scene"),dir=fs.mkdtempSync(path.join(os.tmpdir(),"tpl-avatar-")),id="00000000-0000-4000-8000-000000000000";
 const a=snapshotTemplateAvatar(t,dir,id)!;
 assert.equal(a.file,`${id}/branding/avatar.png`);assert.ok(fs.existsSync(path.join(dir,"branding","avatar.png")));
 assert.equal(a.sha256,(t.manifest.runtime as any).headerAvatar.sha256);
});
test("the election topic objects are in the catalog and a long film may carry many camera keys",async()=>{
 const {ILLUSTRATED_KINDS,FOOTPRINT,KIND_GUIDE,illustratedSchema}=await import("../src/lib/illustrated");
 for(const k of ["cosmic-ray","memory-chip","voting-booth","ballot-box","tally-board"] as const){assert.ok(ILLUSTRATED_KINDS.includes(k));assert.ok(FOOTPRINT[k][0]>0&&KIND_GUIDE[k].length>20);}
 const long=base();long.camera=Array.from({length:40},(_,i)=>({at:A(1,"",i/40),x:800,y:1100,zoom:1}));
 assert.equal(illustratedSchema.parse(long).camera.length,40);
});
test("long plaque labels shrink to fit the plaque frame",async()=>{
 const {plaqueFontSize}=await import("../renderer/IllustratedFilm");
 assert.equal(plaqueFontSize("Итог"),44);
 const long="«Спонтанное появление бита»";assert.ok([...long].length*plaqueFontSize(long)*.62<=492);
});
test("English thousands separators stay one grounded number",()=>{
 const en={title:"How one bit added 4,096 votes",summary:"",scenes:[{seconds:5,narration:"One name on the ballot got 4,096 extra votes."}]};
 assert.equal(grounded("4,096 extra votes",corpus(en)),true);
 assert.equal(grounded("4,097 extra votes",corpus(en)),false);
 assert.equal(grounded("Votes, extra",corpus(en)),true);
});
test("hyphenated script words are grounded on screen whole and by parts",()=>{
 // Regression (216eeb4d): corpus() kept «Сан-Франциско» whole while grounded() cut the callout at «-», so every attempt failed.
 const sf={...story,scenes:[{...scenes[0],narration:"Компьютеры слишком предсказуемы поэтому в Сан-Франциско снимают лавовые лампы."},scenes[1]]};
 const plan=base();plan.callouts[0].text="Сан-Франциско";
 assert.equal(validateIllustrated(plan,sf,alignment).callouts[0].text,"Сан-Франциско");
 assert.throws(()=>validateIllustrated(plan,story,alignment),/не опирается/,"still only words of the checked script");
 const ru=corpus(sf);
 for(const t of ["Сан-Франциско","В Сан-Франциско","Франциско","Лампы, Сан-Франциско"])assert.equal(grounded(t,ru),true,t);
 assert.equal(grounded("Сан-Диего",ru),false);
 const nb=corpus({title:"",scenes:[{seconds:5,narration:"Лампы в Сан‑Франциско."}]});
 for(const t of ["Сан-Франциско","Франциско","Сан‑Франциско"])assert.equal(grounded(t,nb),true,`non-breaking hyphen: ${t}`);
 const en=corpus({title:"Why Wi-Fi drops",summary:"",scenes:[{seconds:5,narration:"Your phone checks e-mail over Wi-Fi."}]});
 for(const t of ["Wi-Fi","WiFi","e-mail","email","mail","Wi-Fi e-mail"])assert.equal(grounded(t,en),true,t);
 assert.equal(grounded("e-wallet",en),false);
 assert.equal(grounded("e-mail",corpus({title:"",scenes:[{seconds:5,narration:"Check your email."}]})),true,"the screen may hyphenate a solid word");
 // Numbers stay verbatim: a compound with digits is checked by every part, never by its five-letter prefix.
 const covid=corpus({title:"",scenes:[{seconds:5,narration:"COVID-19 closed the office."}]});
 assert.equal(grounded("COVID-19",covid),true);assert.equal(grounded("COVID-20",covid),false);
});

test("falling-cat objects change continuously at 30 fps and their spin never jumps",async()=>{
 const {catPose,spinAngle}=await import("../renderer/IllustratedCat");
 const start=catPose(0),end=catPose(1);
 assert.ok(Math.abs(start.phiF-Math.PI)<1e-9&&Math.abs(start.phiR-Math.PI)<1e-9,"starts upside down");
 assert.ok(Math.abs(end.phiF)<1e-9&&Math.abs(end.phiR)<1e-9&&end.land===1,"ends paws down");
 const {easeSine}=await import("../src/lib/illustrated");
 const keys=[{at:1,value:.45},{at:3,value:1},{at:5,value:.1}],forward=keys.slice(0,2);
 let prev=catPose(keyed(0,forward,0,1.4,easeSine)),turn=spinAngle(0,{activeKeys:keys,enterAt:0});
 for(let f=1;f<=210;f++){const t=f/30,p=catPose(keyed(t,forward,0,1.4,easeSine)),s=spinAngle(t,{activeKeys:keys,enterAt:0});
  assert.ok(Math.abs(p.phiF-prev.phiF)<.3&&Math.abs(p.phiR-prev.phiR)<.3,`roll step at ${t}`);
  assert.ok(s-turn>0&&s-turn<6.2/30+1e-6,`spin step at ${t}`);prev=p;turn=s;}
});

test("every catalog kind has a footprint, a director guide and a renderer case",async()=>{
 const {ILLUSTRATED_KINDS,FOOTPRINT,KIND_GUIDE}=await import("../src/lib/illustrated");
 const source=(await import("node:fs")).readFileSync(new URL("../renderer/IllustratedFilm.tsx",import.meta.url),"utf8");
 for(const k of ILLUSTRATED_KINDS){assert.ok(FOOTPRINT[k]?.length===2,k);assert.ok(KIND_GUIDE[k]?.length>20,k);assert.ok(source.includes(`case "${k}"`),`renderer case ${k}`);}
 for(const k of ["ship","globe","clock-face","pendulum-clock","sea-clock","pocket-watch","leaning-tower"])assert.ok((ILLUSTRATED_KINDS as readonly string[]).includes(k),k);
});

test("portrait layout: absent keeps the original header numbers; tiktok-safe lowers header, stage and captions together",async()=>{
 const {illustratedLayout}=await import("../src/lib/illustrated-layout");
 assert.deepEqual(illustratedLayout(),{header:108,title:182,progress:236,stage:292,chapter:1206,captions:1262,stageHeight:900,viewTop:292,chrome:true,bare:false,ocr:{top:105.5,bottom:1422.5}});
 const t=illustratedLayout("tiktok-safe");
 assert.ok(t.header>=250,"header row sits below TikTok's top tabs");
 assert.ok(t.title>t.header+56&&t.progress>t.title+34&&t.stage>t.progress+6,"header rows keep their order");
 assert.ok(t.chapter>t.stage+900&&t.captions>t.chapter+34,"chapter label and captions sit under the stage");assert.ok(t.captions+145<=1510,"captions stay above TikTok description");
 assert.equal(t.ocr.top,t.header-2.5);
});

test("overlay v2: no chapter bars or label, the stage fills the freed rows around the unchanged 900 px director view",async()=>{
 const {illustratedLayout}=await import("../src/lib/illustrated-layout");
 for(const layout of [undefined,"tiktok-safe"] as const){
  const v1=illustratedLayout(layout),v2=illustratedLayout(layout,2);
  assert.equal(v1.chrome,true);assert.equal(v2.chrome,false,"chapter bars and label are gone");
  assert.equal(v2.header,v1.header);assert.equal(v2.title,v1.title);assert.equal(v2.captions,v1.captions);assert.deepEqual(v2.ocr,v1.ocr);
  assert.ok(v2.stage>v2.title+34,"stage starts under the title line");assert.ok(v2.stage<v1.stage&&v2.stage+v2.stageHeight>v1.stage+900,"stage grows up and down");
  assert.ok(v2.stage+v2.stageHeight<=v2.captions,"stage ends above the captions");
 }
 assert.deepEqual([illustratedLayout("tiktok-safe",2).stage,illustratedLayout("tiktok-safe",2).stageHeight,illustratedLayout("tiktok-safe",2).viewTop],[376,980,416]);
});

test("overlay v3: no header at all, the stage is the whole 9:16 frame and the director view keeps its v2 place",async()=>{
 const {illustratedLayout}=await import("../src/lib/illustrated-layout");
 for(const layout of [undefined,"tiktok-safe"] as const){
  const v2=illustratedLayout(layout,2),v3=illustratedLayout(layout,3);
  assert.equal(v3.bare,true);assert.equal(v2.bare,false);assert.equal(v3.chrome,false);
  assert.deepEqual([v3.stage,v3.stageHeight],[0,1920],"the picture runs from the top edge to the bottom edge");
  assert.equal(v3.viewTop,v2.viewTop,"the 1080×900 director view sits where it sat in v2");
  assert.equal(v3.captions,v2.captions);assert.deepEqual(v3.ocr,v2.ocr,"on-screen text still stays below TikTok's tabs and above its description");
  assert.ok(v3.viewTop+900<=v3.captions,"the director view ends above the captions");
 }
});

test("overlay v3 caption shade is a soft static gradient with no edge",async()=>{
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 const {CaptionShade}=await import("../renderer/CaptionStyles");
 const shade=renderToStaticMarkup(React.createElement(CaptionShade,{top:1360}));
 assert.match(shade,/radial-gradient/);assert.match(shade,/rgba\(4,3,10,0\) 100%/,"the shade has no edge");
});

test("space objects: every state renders without NaN, the orbit marker never jumps, old plans keep the room",async()=>{
 const React=(await import("react")).default,{renderToStaticMarkup}=await import("react-dom/server");
 const S=await import("../renderer/IllustratedSpace");
 const parts=[S.Sun,S.Earth,S.Moon,S.Orbit,S.LightFront,S.PlanetRow,S.NightSky,S.Thermometer,S.Leaf] as React.FC<{t:number;a:number}>[];
 for(const Part of parts)for(const a of [0,.2,.35,.5,.62,.8,.9,1]){const html=renderToStaticMarkup(React.createElement("svg",null,React.createElement(Part,{t:3.7,a})));
  assert.ok(html.length>200&&!/NaN|Infinity/.test(html),`${Part.name} at ${a}`);}
 const xray=renderToStaticMarkup(React.createElement("svg",null,React.createElement(S.Earth,{t:2,a:1,xray:.8,overlay:true})));assert.ok(!/NaN/.test(xray));
 let prev=S.orbitState(0).pos;
 for(let i=1;i<=1000;i++){const s=S.orbitState(i/1000),d=Math.hypot(s.pos[0]-prev[0],s.pos[1]-prev[1]);assert.ok(d<12,`orbit marker jumps ${d.toFixed(1)} at ${i/1000}`);prev=s.pos;}
 assert.ok(S.orbitState(.38).pull<.2&&S.orbitState(.6).pull===0&&S.orbitState(1).pull===1,"gravity line goes out with the light and returns with the Sun");
 const {illustratedSchema}=await import("../src/lib/illustrated");
 assert.equal(illustratedSchema.parse(base()).backdrop,undefined,"absent backdrop = the room");
 assert.equal(illustratedSchema.parse({...base(),backdrop:"space"}).backdrop,"space");
});

test("the outro moves down only with the tiktok-safe layout",async()=>{
 const {outroLayout}=await import("../renderer/XtunedOutro");
 const base=outroLayout(true),tiktok=outroLayout(true,"tiktok-safe");
 assert.deepEqual(base,{text:{left:78,width:860,top:300},questionSize:52,plateSize:100,plateTop:150,character:{left:-20,top:606},button:{left:600,top:596,width:338,height:108},cursorFrom:[900,1300]});
 assert.equal(tiktok.text.top,410);assert.equal(tiktok.button.top,706);assert.equal(outroLayout(false,"tiktok-safe").text.top,330,"landscape never shifts");
});
