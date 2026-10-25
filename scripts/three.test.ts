import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {world3dSchema,validateWorld3D,objectState,cameraState,anchorTime,referenceRenderCapability,type World3D} from "../src/lib/scene3d";
import {validateModelFile,saveModel,snapshotModels,verifyModelSnapshot} from "../src/lib/model-assets";
import {threeDemoPlan} from "../src/lib/three-demo";
const at=(scene:number,progress:number,cue="")=>({scene,progress,cue});
const plan=threeDemoPlan();
const world=():World3D=>({version:1,concept:"Проверочная объёмная сцена",cameraMode:"dolly",camera:[{at:at(1,0),position:[0,1,8],target:[0,0,0],fov:45},{at:at(4,1),position:[3,1,7],target:[0,0,0],fov:45}],objects:[{id:"phone",model:"phone",assetId:"",label:"Телефон",color:"#8D59DA",metalness:.3,roughness:.4,enter:at(1,0),exit:null,keys:[{at:at(1,0),position:[0,0,0],rotation:[0,0,0],scale:1}],animationClip:""}],lighting:{keyPosition:[3,5,5],keyColor:"#FFFFFF",keyIntensity:3,fillIntensity:.8,rimColor:"#8D59DA"},ground:false,notes:[],referenceShotIds:[]});
const embedded=(uri="data:application/octet-stream;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")=>({asset:{version:"2.0"},buffers:[{uri,byteLength:36}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:"VEC3",min:[0,0,0],max:[1,1,0]}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0});
test("Detailed concepts reject primitive heroes, missing parts and substituted assembly subjects",async()=>{
 const {validateVisualConcept,validateAssemblyPlan}=await import('../src/lib/visual-contract');
 const raw:any={version:1,idea:'Раскрыть автомобиль и показать причинную связь между баллонами и соплами.',renderer:'three',hero:'car',visualLanguage:'Один узнаваемый автомобиль в постоянном мире',objects:[{id:'car',name:'Машина',purpose:'Объяснить тягу',representation:'detailed-assembly',assemblyKind:'sports-car',requiredDetails:['шасси','баллоны COPV'],factIds:['f1']}],scenes:Array.from({length:4},(_,i)=>({scene:i+1,understanding:'Понять направление реакции',show:'Автомобиль с раскрытым кузовом и внутренними магистралями',change:'Воздух проходит к соплам',objectIds:['car'],cutaway:true,labels:['Воздух']})),limitations:['Условное размещение узлов']};
 const v=validateVisualConcept(raw,4,['f1']);
 assert.throws(()=>validateVisualConcept({...raw,objects:[{...raw.objects[0],representation:'supporting-primitive'}]},4,['f1']),/Главный/);
 assert.throws(()=>validateVisualConcept({...raw,objects:[{...raw.objects[0],requiredDetails:['магический двигатель']}]},4,['f1']),/не поддержана/);
 assert.throws(()=>validateVisualConcept({...raw,scenes:raw.scenes.map((s:any)=>({...s,objectIds:['missing']}))},4,['f1']),/не совпадает/);
 const asset={id:'car',kind:'sports-car',name:'Автомобиль',purpose:'Тяга',color:'#8D59DA',system:'compressed-air',tankCount:2,nozzleCount:10,requiredParts:['шасси','баллоны COPV','сопла','магистрали и клапаны'],approximation:'Условная геометрия, не точная заводская CAD-модель'};
 assert.equal(validateAssemblyPlan({version:1,concept:raw.idea,assets:[asset],limitations:['Иллюстрация']},v).assets.length,1);
 assert.throws(()=>validateAssemblyPlan({version:1,concept:raw.idea,assets:[{...asset,id:'other'}],limitations:['Иллюстрация']},v),/Не подготовлен/);
});
test("Articulated assemblies require prepared assets and remain deterministic across reverse seeks",async()=>{
 const {articulationState}=await import('../src/lib/scene3d');
 const w=world();w.objects=[{...w.objects[0],model:'assembly',assetId:'car',articulation:{cutaway:[{at:at(1,0),value:0},{at:at(2,0),value:1}],lift:[{at:at(1,0),value:0},{at:at(4,1),value:1}]}}];
 assert.throws(()=>validateWorld3D(w,plan.scenes),/не подготовлена/);
 validateWorld3D(w,plan.scenes,[],[],['car']);
 const a=articulationState(w.objects[0],3,plan.scenes);articulationState(w.objects[0],29,plan.scenes);assert.deepEqual(articulationState(w.objects[0],3,plan.scenes),a);
 for(let f=1;f<225;f++){const before=articulationState(w.objects[0],(f-1)/30,plan.scenes).cutaway,after=articulationState(w.objects[0],f/30,plan.scenes).cutaway;assert.ok(Math.abs(after-before)<.02);}
 assert.throws(()=>validateWorld3D({...w,objects:[{...w.objects[0],articulation:{lift:[{at:at(1,0),value:2}]}}]},plan.scenes,[],[],['car']),/пределах/);
});
test("Claude provider fails closed when actual model differs or telemetry is absent",async()=>{
 const {confirmClaudeModel}=await import('../src/lib/claude-provider');
 assert.deepEqual(confirmClaudeModel({modelUsage:{alias:{canonicalModel:'claude-opus-5-5'}}},'claude-opus-5-5'),['claude-opus-5-5']);
 assert.throws(()=>confirmClaudeModel({modelUsage:{'claude-sonnet-4':{}}},'claude-opus-5-5'),/Подмена/);
 assert.throws(()=>confirmClaudeModel({},'claude-opus-5-5'),/отсутствуют/);
});
test("3D plan rejects absent models, broken camera coverage, unordered keys and missing cue words",()=>{
 const w=validateWorld3D(world(),plan.scenes);assert.equal(w.objects.length,1);
 assert.throws(()=>validateWorld3D({...w,camera:[...w.camera].reverse()},plan.scenes),/времени/);
 assert.throws(()=>validateWorld3D({...w,camera:w.camera.map((k,i)=>({...k,at:i?at(3,1):k.at}))},plan.scenes),/весь ролик/);
 assert.throws(()=>validateWorld3D({...w,objects:[{...w.objects[0],model:"asset",assetId:"missing"}]},plan.scenes),/не загружена/);
 assert.throws(()=>validateWorld3D({...w,objects:[{...w.objects[0],enter:at(1,0,"нетслова")}]},plan.scenes),/отсутствует/);
});
test("Continuous camera/object functions agree across every chapter boundary and never pop in one frame",()=>{
 const w=world();validateWorld3D(w,plan.scenes);
 assert.equal(objectState(w.objects[0],0,plan.scenes).opacity,0);
 let prior=objectState(w.objects[0],0,plan.scenes).opacity;
 for(let frame=1;frame<=16;frame++){const next=objectState(w.objects[0],frame/30,plan.scenes).opacity;assert.ok(next>=prior&&next-prior<.11);prior=next;}
 for(const t of [7.5,15,22.5]){const before=cameraState(w,t-1e-6,plan.scenes),after=cameraState(w,t+1e-6,plan.scenes);assert.ok(Math.hypot(...after.position.map((v,i)=>v-before.position[i]))<.0001);}
});
test("Cue anchors follow measured speech rather than hardcoded chapter times",()=>{
 const scenes=[{seconds:4,narration:"Появляется телефон"},{seconds:6,narration:"Сервер отвечает"}];
 assert.equal(anchorTime(at(2,.2,"Сервер"),scenes,[{words:[]},{words:[{text:"Сервер",start:4.7,end:5.2}]}]),4.7);
 assert.equal(anchorTime(at(2,.2),scenes),5.2);
});
test("3D references select the real renderer; live footage remains explicitly unsupported",()=>{
 assert.equal(referenceRenderCapability([{version:2,sceneType:"3d",shots:[]}],true).engine,"three");
 assert.equal(referenceRenderCapability([{version:2,sceneType:"unknown",shots:[{reproduction:{method:"blender"}}]}],true).engine,"three");
 assert.equal(referenceRenderCapability([{version:2,sceneType:"mixed",shots:[{reproduction:{method:"video-editing"}}]}],true).engine,null);
});
test("Model ingestion rejects external resources, oversized accessors and cycles; snapshots catch tampering",()=>{
 const bytes=Buffer.from(JSON.stringify(embedded()));assert.equal(validateModelFile(bytes,".gltf").vertices,3);
 for(const uri of ["https://private/model.bin","../../.env.local","file:///etc/passwd","http://127.0.0.1:3210/"])assert.throws(()=>validateModelFile(Buffer.from(JSON.stringify(embedded(uri))),".gltf"),/встроенные/);
 const bad=embedded();bad.accessors[0].count=1000001;assert.throws(()=>validateModelFile(Buffer.from(JSON.stringify(bad)),".gltf"),/accessor/);
 const cycle:any=embedded();cycle.nodes[0].children=[0];assert.throws(()=>validateModelFile(Buffer.from(JSON.stringify(cycle)),".gltf"),/дерево/);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"three-models-test-"));try{const asset=saveModel(temp,bytes,"test.gltf","Тест","Своя модель");const dir=path.join(temp,"project");snapshotModels(temp,dir,[asset.id]);assert.equal(verifyModelSnapshot(dir)[0].sha256,asset.sha256);fs.appendFileSync(path.join(dir,"models",asset.file)," ");assert.throws(()=>verifyModelSnapshot(dir),/изменена/);}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test("Director consumes reference shots, returns validated 3D and reuses the exact cached plan",async()=>{
 const {prepare3D}=await import("../src/lib/three-director"),{createHash}=await import("node:crypto");
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"three-director-test-"));let calls=0;try{
  snapshotModels(temp,temp,[]);const json=JSON.stringify({report:{summary:"Облёт"},examples:[{id:"video-one",caption:"Объёмный объект",analysis:{shots:[{id:"source-shot",camera:{mode:"orbit"}}]}}]});fs.writeFileSync(path.join(temp,"author-profile.json"),json);
  const profile:any={authorReference:{sha256:createHash("sha256").update(json).digest("hex")},background:"#000000",foreground:"#FFFFFF",accent:"#8D59DA"};
  const ask:any=async(prompt:string)=>{calls++;assert.match(prompt,/source-shot/);return {...world(),referenceShotIds:["video-one:source-shot"]};};
  const result=await prepare3D(plan,profile,temp,[],new AbortController().signal,ask);assert.equal(result.filmKind,"three");assert.ok(result.world3d);await prepare3D(plan,profile,temp,[],new AbortController().signal,ask);assert.equal(calls,1);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test("Agent JSON schemas preserve fixed vectors using homogeneous items instead of unsupported prefixItems",async()=>{
 const {schemaForAgent}=await import("../src/lib/provider");const schema=schemaForAgent((await import("zod")).z.toJSONSchema(world3dSchema));
 assert.equal(schema.properties.camera.items.properties.position.items.type,"number");assert.equal(schema.properties.camera.items.properties.position.minItems,3);assert.ok(!JSON.stringify(schema).includes("prefixItems"));
});

test("GLB animation sampling is deterministic when seeking backwards after the clip ends",async()=>{
 const {Object3D,AnimationMixer,AnimationClip,VectorKeyframeTrack}=await import("three");const {seekModelAnimation}=await import("../src/lib/three-animation");
 const object=new Object3D(),clip=new AnimationClip("Move",2,[new VectorKeyframeTrack(".position",[0,2],[0,0,0,2,0,0])]),mixer=new AnimationMixer(object);
 seekModelAnimation(mixer,clip,.5);assert.ok(Math.abs(object.position.x-.5)<1e-6);
 seekModelAnimation(mixer,clip,10);assert.ok(Math.abs(object.position.x-2)<1e-5);
 seekModelAnimation(mixer,clip,.5);assert.ok(Math.abs(object.position.x-.5)<1e-6);
});

test("A mixed collection selects actual 3D examples even when they follow nineteen 2D videos",async()=>{
 const {select3DExamples}=await import("../src/lib/three-director");const examples=Array.from({length:20},(_,i)=>({id:String(i),analysis:{sceneType:i===19?"3d":"2d",shots:[]}}));
 assert.equal(select3DExamples(examples,"Система")[0].id,"19");
});

test("A GLB animation window follows measured narration cues and clamps outside the action",async()=>{
 const {clipProgressAt}=await import("../src/lib/scene3d");const o={...world().objects[0],model:"asset" as const,assetId:"loaded",animationClip:"Walk",animationWindow:{start:at(1,.1,"пошёл"),end:at(1,.9,"встал")}};
 const scenes=[{seconds:8,narration:"Игрок пошёл и встал"}],alignment=[{words:[{text:"пошёл",start:2,end:2.3},{text:"встал",start:6,end:6.3}]}];
 assert.equal(clipProgressAt(o,0,scenes,alignment),0);assert.equal(clipProgressAt(o,4,scenes,alignment),.5);assert.equal(clipProgressAt(o,9,scenes,alignment),1);
});


test("Strict agent schemas preserve optional fields and required nullable values through a round trip",async()=>{
 const {z}=await import("zod");const {schemaForAgent,restoreAgentOptionals}=await import("../src/lib/provider");
 const local=z.object({name:z.string(),optional:z.object({enabled:z.boolean().optional()}).optional(),exit:z.string().nullable(),rows:z.array(z.object({pin:z.string().optional()}))});
 const original=z.toJSONSchema(local),strict=schemaForAgent(original);
 assert.deepEqual(new Set(strict.required),new Set(["name","optional","exit","rows"]));
 assert.equal(strict.properties.optional.anyOf[1].type,"null");
 assert.deepEqual(local.parse(restoreAgentOptionals({name:"world",optional:null,exit:null,rows:[{pin:null}]},original)),{name:"world",exit:null,rows:[{}]});
 assert.deepEqual(local.parse(restoreAgentOptionals({name:"world",optional:{enabled:false},exit:null,rows:[{pin:"A"}]},original)),{name:"world",optional:{enabled:false},exit:null,rows:[{pin:"A"}]});
 const {scriptPackageSchema}=await import("../src/lib/research-model");const script=schemaForAgent(z.toJSONSchema(scriptPackageSchema));
 assert.ok(script.properties.plan.required.includes("filmKind"));
 const verify=(v:any)=>{if(!v||typeof v!=="object")return;if(v.properties)assert.deepEqual(new Set(v.required),new Set(Object.keys(v.properties)));for(const x of Object.values(v))if(Array.isArray(x))x.forEach(verify);else verify(x);};verify(script);
});


test("3D direction bounds reference context while retaining early and late spatial evidence",async()=>{
 const {compact3DReference}=await import("../src/lib/three-director");
 const shots=Array.from({length:40},(_,i)=>({id:`shot-${i}`,at:i,end:i+1,purpose:"p".repeat(400),composition:"c".repeat(600),camera:{mode:"orbit",description:"d".repeat(600),evidence:"e".repeat(400)},objects:Array.from({length:10},()=>({name:"object",kind:"model3d",appearance:"a".repeat(400),motion:"m".repeat(400)})),reproduction:{method:i===0?"remotion2d":"threejs",steps:[],assets:[],unknowns:[]}}));
 const compact=compact3DReference({summary:"Spatial scene",sceneType:"mixed",shots});assert.equal(compact.shots.length,4);assert.equal(compact.shots[0].id,"shot-1");assert.equal(compact.shots.at(-1).id,"shot-39");assert.ok(JSON.stringify(compact).length<30000);
});

test("Fan phase integrates performance directions without jumps when power changes",async()=>{
 const {articulationState}=await import('../src/lib/scene3d');
 const o={...world().objects[0],model:'assembly' as const,articulation:{fan:[{at:at(1,0),value:0},{at:at(2,0),value:1},{at:at(3,0),value:0}]}};
 const atEnd=articulationState(o,15,plan.scenes).fanAngle;
 assert.equal(articulationState(o,29,plan.scenes).fanAngle,atEnd);
 for(const t of [7.5,15])assert.ok(Math.abs(articulationState(o,t+1e-6,plan.scenes).fanAngle-articulationState(o,t-1e-6,plan.scenes).fanAngle)<.00002);
 assert.deepEqual(articulationState(o,3,plan.scenes),articulationState(o,3,plan.scenes));
});

test("Detailed motion uses the real Claude role and cannot omit the prepared hero or requested cutaway",async()=>{
 const {prepare3D}=await import('../src/lib/three-director'),{digest}=await import('../src/lib/quality');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'detailed-director-test-'));let calls=0;
 const asset:any={id:'car',kind:'sports-car',name:'Автомобиль',purpose:'Тяга',color:'#8D59DA',system:'compressed-air',tankCount:2,nozzleCount:10,requiredParts:['шасси','баллоны COPV','сопла','магистрали и клапаны'],approximation:'Условный автомобиль, не заводская CAD-модель'};
 const p:any={...plan,assemblies:{version:1,concept:'Подробный автомобиль с раскрываемым кузовом',assets:[asset],limitations:['Условное размещение']},visualConcept:{scenes:[{cutaway:true,objectIds:['car']}]}};
 try{
  snapshotModels(temp,temp,[]);fs.writeFileSync(path.join(temp,'assembly-snapshot.json'),JSON.stringify({sha256:digest(p.assemblies)}));
  const ask:any=async(prompt:string,_schema:any,_dir:any,_images:any,_signal:any,role:any)=>{calls++;assert.equal(role.model,'claude-opus-5-5');assert.equal(role.effort,'xhigh');assert.match(prompt,/детальные сборки|ДЕТАЛЬНЫЕ СБОРКИ/);if(calls===1)return world();return {...world(),objects:[{...world().objects[0],id:'car',model:'assembly',assetId:'car',articulation:{cutaway:[{at:at(1,0),value:0},{at:at(2,0),value:1}]}}]};};
  const result=await prepare3D(p,{background:'#000',foreground:'#fff',accent:'#8D59DA'} as any,temp,[],new AbortController().signal,ask);assert.equal(calls,2);assert.equal(result.world3d!.objects[0].model,'assembly');
  await assert.rejects(()=>prepare3D({...p,world3d:{...result.world3d,objects:result.world3d!.objects.map(o=>({...o,labelStyle:'pin',label:'Непроверенная характеристика'}))}},{background:'#000',foreground:'#fff',accent:'#8D59DA'} as any,temp,[],new AbortController().signal,ask),/не проверена до озвучки/);
  await assert.rejects(()=>prepare3D({...p,world3d:{...result.world3d,objects:result.world3d!.objects.map(o=>({...o,articulation:undefined}))}},{background:'#000',foreground:'#fff',accent:'#8D59DA'} as any,temp,[],new AbortController().signal,ask),/не раскрывает/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test("Air jets face away from the car: rear exhaust backwards, lift exhaust downwards; counts match configuration",async()=>{
 const {nozzleLayout}=await import('../src/lib/assembly-geometry'),{Vector3,Euler}=await import('three');
 const spec:any={kind:'sports-car',nozzleCount:10};
 const exit=(n:ReturnType<typeof nozzleLayout>[number])=>new Vector3(0,-1,0).applyEuler(new Euler(...n.rotation));
 for(let count=2;count<=10;count++)assert.equal(nozzleLayout({...spec,nozzleCount:count}).length,count);
 for(const n of nozzleLayout(spec)){const d=exit(n);if(n.channel==='thrust'){assert.ok(d.x<-.999);assert.ok(n.position[0]<-2.6,'rear outlet must extend past the body');}if(n.channel==='lift')assert.ok(d.y<-.999);if(n.channel==='control')assert.ok(d.z*n.position[2]>.99);}
 const bank=nozzleLayout({...spec,kind:'pressure-system'});for(const n of bank)assert.ok(exit(n).x>.999);assert.equal(new Set(bank.map(n=>n.position.join(','))).size,10);
});

test("Visible air pipes connect tank valves and the manifold to every nozzle inlet",async()=>{
 const {nozzleLayout,nozzleInlet,carAirPlumbing}=await import('../src/lib/assembly-geometry'),{Vector3,Euler}=await import('three');
 for(let count=2;count<=10;count++){
  const spec:any={kind:'sports-car',system:'compressed-air',tankCount:2,nozzleCount:count},jets=nozzleLayout(spec),paths=carAirPlumbing(spec);
  assert.equal(paths.length,2+count);
  for(const [i,n] of jets.entries()){
   const inlet=new Vector3(0,.14,0).applyEuler(new Euler(...n.rotation)).add(new Vector3(...n.position));
   assert.ok(inlet.distanceTo(new Vector3(...nozzleInlet(n)))<1e-9);
   assert.deepEqual(paths[i+2].at(-1),nozzleInlet(n));
   assert.equal(paths[i+2][0][0],-2.15,'each branch starts on the common manifold');
  }
  assert.deepEqual(paths.slice(0,2).map(p=>p[0][2]),[-.245,.245]);
 }
 assert.deepEqual(carAirPlumbing({kind:'sports-car',system:'electric-drive'} as any),[]);
});

test("Downward gas remains visible above the support and fades continuously before crossing it",async()=>{
 const {airJetSample,nozzleLayout}=await import('../src/lib/assembly-geometry');
 const jets=nozzleLayout({kind:'sports-car',nozzleCount:8} as any).filter(n=>n.channel==='lift');
 assert.equal(jets.length,4);assert.ok(jets.every(n=>n.position[1]>=.7&&Math.abs(n.position[2])>1),'illustrative outlets must be visible beside the body');
 for(const h of [.5,.75,1]){
  assert.ok(airJetSample(.15,h).opacity>0);
  for(let i=0;i<=100;i++){const state=airJetSample(i/100,h);assert.ok(state.opacity>=0&&state.opacity<=1);if(state.distance>=h)assert.equal(state.opacity,0);}
  const hit=(h-.2)/1.25;assert.ok(Math.abs(airJetSample(hit-1e-6,h).opacity-airJetSample(hit+1e-6,h).opacity)<1e-8);
 }
});
