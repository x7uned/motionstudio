import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {z} from "zod";
import {creatorOutroState} from "../src/lib/creator-branding";
import {structured,auditText,reviewManualNarrative,produceQuality} from "../src/lib/editorial";
import {saveManualNarrative} from "../src/lib/narrative-edit";
import {CONTENT_AGENT} from "../src/lib/quality-contract";
import {validateFactResult,factsPassed,digest,auditCurrent,editorialInput,checkNarrative,writeJSON,fileHash,writtenText} from "../src/lib/quality";
import {taggedInput,transcriptDiff,verifyAudioText,audioTextDiff} from "../src/lib/voice";
import {prepareScriptComparison,selectScriptComparison,publicComparison} from "../src/lib/script-comparison";
import {resolveBeatAt} from "../src/lib/research-model";
import {anchorTime} from "../src/lib/scene3d";
import {assemblySoundCues} from "../src/lib/scene-sound";
import {spaceSoundEffects} from "../src/lib/sound-preferences";
import {temporalFindings,reviewFrames,soundCues} from "../src/lib/export-review";
import {visibilityAt,edgeEnds,edgeCurve,listLayout,rowReveal} from "../renderer/PersistentDiagram";
import {captionEnvelope,SAFE_HEADER,LEGACY_HEADER} from "../renderer/Explainer";
import {diagramSchema} from "../src/lib/model";
import {DIAGRAM_VOCABULARY} from "../src/lib/motion-director";
import {qualityInstructions} from "../src/lib/quality-instructions";
import type {Storyboard} from "../src/lib/model";
const plan=():Storyboard=>({title:"Копия",summary:"Условная система",factNotes:"Условный пример",scenes:Array.from({length:4},(_,i)=>({id:`s${i}`,title:"Копия",subtitle:"Состояние системы",narration:"Сервер видит сервер.",seconds:7.5,visual:"flow",items:["Сервер"],diagram:{nodes:[{id:"server",label:"Сервер",kind:"server",row:0,col:0}],edges:[]},beats:[{at:0,cue:"",action:"reveal",target:"server",description:"Появляется сервер"},{at:1,cue:"сервер",cueOccurrence:2,action:"highlight",target:"server",description:"Повторное упоминание"}]}))});
const source={id:"s1",title:"Source",url:"https://example.org",content:"A replica can lag behind the primary. This does not happen in every operation.",retrievedAt:new Date().toISOString()};
const claim={id:"c1",span:"Копия всегда отстаёт",claim:"Копия всегда отстаёт",kind:"fact" as const};
test("quality captions fade inside their own windows instead of overlaying neighbouring phrases",()=>{
 for(const boundary of [1,35,44.5])for(let frame=-12;frame<=12;frame++){
  const t=boundary+frame/30,a=captionEnvelope(t,boundary-1,boundary,true),b=captionEnvelope(t,boundary,boundary+1,true);
  assert.equal(a.opacity*b.opacity,0,'adjacent phrases must never be visible at once');
 }
 assert.ok(captionEnvelope(.05,0,1,true).opacity>0&&captionEnvelope(.05,0,1,true).opacity<1,'entry remains continuous');
 assert.ok(captionEnvelope(.95,0,1,true).opacity>0&&captionEnvelope(.95,0,1,true).opacity<1,'exit remains continuous');
 assert.ok(captionEnvelope(1,.0,1,false).opacity>0,'legacy crossfade is preserved');
});
test("independent fact verdict blocks an overgeneralization even when a quote literally exists",()=>{
 const r=validateFactResult({summary:"Квантор не подтверждён",claims:[{...claim,status:"contradicted",reason:"can is not always",evidence:[{sourceId:"s1",quote:"A replica can lag behind the primary."}]}],queries:[]},[claim],[source]);
 assert.equal(factsPassed(r),false);
 assert.throws(()=>validateFactResult({...r,claims:[{...r.claims[0],status:"supported",evidence:[]}]},[claim],[source]),/доказательство/);
 assert.throws(()=>validateFactResult({...r,claims:[]},[claim],[source]));
 assert.throws(()=>validateFactResult({...r,claims:[{...r.claims[0],status:"illustration"}]},[claim],[source]),/условным/);
});
test("bibliographic quotes identify the actual retrieved metadata instead of invented page text",()=>{
 const cited={...source,title:"Document Source"};const c={...claim,claim:"Документ называется Document Source",span:"Документ называется Document Source"};const report=validateFactResult({summary:"Название источника",claims:[{...c,status:"supported",reason:"Имя в карточке прочитанного документа",evidence:[{sourceId:"s1",quote:cited.title}]}],queries:[]},[c],[cited]);assert.equal((report.claims[0].evidence[0] as any).sourceField,"title");
 assert.throws(()=>validateFactResult({summary:"Нет доказательства",claims:[{...c,status:"supported",reason:"Неизвестная цитата",evidence:[{sourceId:"s1",quote:"Invented source title"}]}],queries:[]},[c],[cited]),/отсутствует/);
});
test("inline Markdown formatting does not turn a verbatim technical quote into a missing source",()=>{
 const content="The `no-cache` directive requires validation before reuse.",c={...claim,claim:"no-cache требует проверки",span:"no-cache требует проверки"};const report=validateFactResult({summary:"Подтверждено",claims:[{...c,status:"supported",reason:"То же правило",evidence:[{sourceId:"s1",quote:"The no-cache directive requires validation before reuse."}]}],queries:[]},[c],[{...source,content}]);assert.equal(factsPassed(report),true);
 assert.throws(()=>validateFactResult({...report,claims:[{...report.claims[0],evidence:[{sourceId:"s1",quote:"The no-cache directive eliminates validation before reuse."}]}]},[c],[{...source,content}]),/отсутствует/);
});
test("fact extraction is isolated from source conclusions and every result retains the exact claim",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-facts-"));const calls:any[]=[];
 const agent=async(prompt:string,_schema:any,_dir:string,_images:any,_signal:any,role:any)=>{calls.push({prompt,role});return prompt.includes("РОЛЬ 1")?{claims:[claim]}:{summary:"Оговорка потеряна",claims:[{...claim,status:"uncertain",reason:"Не подтверждено всегда",evidence:[]}],queries:["replication consistency primary documentation"]};};
 try{const result=await auditText({fullText:claim.span,screenText:""},[source],dir,new AbortController().signal,agent as any);assert.equal(result.passed,false);assert.equal(calls.length,2);assert.ok(!calls[0].prompt.includes(source.content));assert.ok(calls[1].prompt.includes(source.content));assert.deepEqual(calls[1].role,CONTENT_AGENT);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test("independent verification retains a hypothetical premise outside the extracted claim span",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-conditional-"));
 const premise="Допустим, клиент уже получил координаты.",span="Подсказка использует эти данные.",input={fullText:`${premise} ${span}`,screenText:"Условный пример"};
 const c={id:"c1",span,claim:"При полученных координатах подсказка использует эти данные",kind:"fact"};
 const agent=async(prompt:string)=>{
  if(prompt.includes("РОЛЬ 1"))return {claims:[c]};
  assert.ok(prompt.includes(JSON.stringify(input)),"verifier needs surrounding conditions, not only the extracted span");
  return {summary:"Проверено при условии примера",claims:[{...c,status:"supported",reason:"Проверяется способность при заданных входных данных, а не факт их передачи реальным продуктом",evidence:[{sourceId:"s1",quote:"Available position data can be displayed as an overlay."}]}],queries:[]};
 };
 try{const result=await auditText(input,[{...source,content:"Available position data can be displayed as an overlay."}],dir,new AbortController().signal,agent as any);assert.equal(result.passed,true);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test("role cache invalidates after instruction/input changes rather than reusing an old accepted answer",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-role-"));let calls=0;const agent=async()=>({value:++calls});
 try{const schema=z.object({value:z.number()});const signal=new AbortController().signal;assert.equal((await structured("rules v1",schema,dir,signal,agent as any)).value,1);assert.equal((await structured("rules v1",schema,dir,signal,agent as any)).value,1);assert.equal((await structured("rules v2",schema,dir,signal,agent as any)).value,2);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test("speech and scene contracts bind editorial approval to current narration and screen labels",()=>{
 const p=plan(),audit={inputHash:digest(editorialInput(p)),passed:true};assert.ok(auditCurrent(audit,p));p.scenes[0].items=["Другая подпись"];assert.equal(auditCurrent(audit,p),false);assert.throws(()=>checkNarrative({fullText:"Переписанный рассказ"} as any,p),/изменила/);
});
test("fact approval also expires when the retrieved evidence changes",()=>{
 const p=plan(),sources=[source],audit={inputHash:digest(editorialInput(p)),sourceHash:digest(sources),passed:true};assert.ok(auditCurrent(audit,p,sources));assert.equal(auditCurrent(audit,p,[{...source,content:"A different source conclusion"}]),false);
});
test("repeated spoken cues resolve a specific occurrence consistently in 2D and 3D",()=>{
 const words=[{text:"Сервер",start:1,end:2},{text:"видит",start:2,end:3},{text:"сервер.",start:4,end:5}];
 assert.equal(resolveBeatAt({cue:"сервер",cueOccurrence:2,at:0},0,words),4);assert.equal(anchorTime({scene:1,progress:0,cue:"сервер",cueOccurrence:2},plan().scenes,[{words}]),4);
 assert.throws(()=>anchorTime({scene:1,progress:0,cue:"сервер",cueOccurrence:3},plan().scenes,[{words}]),/вхождение/);
});
test("voice directions are separate from spoken words; ASR flags omission and repetition",()=>{
 assert.equal(taggedInput("Сервер отвечает. Теперь всё ясно.",[{wordIndex:2,tag:"confident"}]),"Сервер отвечает. [confident] Теперь всё ясно.");
 assert.throws(()=>taggedInput("Привет",[{wordIndex:8,tag:"warm"}]),/anchor/);
 assert.equal(transcriptDiff("Сервер отвечает на запрос.","Сервер отвечает на запрос").wordErrorRate,0);
 assert.ok(transcriptDiff("Сервер отвечает на запрос", "Сервер на запрос").edits.some(e=>e.kind==="missing"));
 assert.ok(transcriptDiff("Сервер отвечает", "Сервер сервер отвечает").edits.some(e=>e.kind==="extra"));
});
test("ASR difference seeks the actual word even when a hyphenated word has two tokens",()=>{
 const report=audioTextDiff("Клиент-сервер получает ответ",{text:"Клиент-сервер теряет ответ",words:[{text:"Клиент-сервер",start:1,end:2},{text:"теряет",start:3,end:4},{text:"ответ",start:5,end:6}]});assert.equal(report.edits[0].at,3);
});
test("MP4 frame sampling covers exact cue boundaries, settled states and final frame",()=>{
 const p=plan(),words=[{text:"Сервер",start:1},{text:"сервер.",start:4}];const r=reviewFrames(p,[{words}]);
 for(const f of [0,118,119,120,121,122,135,899])assert.ok(r.frames.includes(f),String(f));
 assert.ok(soundCues(p,[{words}]).cues.some(c=>c.at===4));
});
test("temporal scan flags one-frame excursions, not continuous motion",()=>{
 const blink=new Uint8Array([0,0,0,255,255,255,0,0,0]);assert.ok(temporalFindings(blink,3,[]).some(f=>f.kind==="continuity"));
 assert.deepEqual(temporalFindings(new Uint8Array([0,0,0,30,30,30,60,60,60]),3,[]),[]);
});
test("persistent visibility does not reset a shared node at a chapter reveal",()=>{
 const events=[{at:0,target:1},{at:5,target:1},{at:10,target:0}];assert.equal(visibilityAt(events,4.999),1);assert.equal(visibilityAt(events,5.001),1);assert.ok(Math.abs(visibilityAt(events,10.001)-visibilityAt(events,9.999))<.001);assert.equal(visibilityAt(events,11),0);
});
test("new-project instruction snapshots remain unchanged when installed skills change and detect tampering",async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"quality-snapshot-")),projectDir=path.join(root,"data/project");
 try{for(const name of ["story-editor","fact-checker","voice-director","export-reviewer"]){const dir=path.join(root,".agents/skills",name);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,"SKILL.md"),`rules ${name}`);}await fs.mkdir(path.join(root,"video-design"),{recursive:true});for(const f of ["MOTION-RULES.md","REFERENCE-RULES.md"])await fs.writeFile(path.join(root,"video-design",f),"original");
 const first=qualityInstructions(root,projectDir);await fs.writeFile(path.join(root,".agents/skills/story-editor/SKILL.md"),"new rules");assert.deepEqual(qualityInstructions(root,projectDir),first);
 const file=path.join(projectDir,"quality-instructions.json");await fs.writeFile(file,JSON.stringify({...first,roles:{...first.roles,"story-editor":"tampered"}}));assert.throws(()=>qualityInstructions(root,projectDir),/изменён/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test("manual editorial review preserves author words and stops on requested changes",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-manual-")),p=plan(),before=JSON.stringify(p),text=editorialInput(p).fullText;
 try{
  await assert.rejects(reviewManualNarrative(p,dir,new AbortController().signal,(async()=>({verdict:"changes",fullText:text,summary:"Повторяется начало",findings:[{span:"Сервер",note:"Сведите повторные вступления",category:"rhythm"}]})) as any),/Авторская версия сохранена/);
  const advisory=await reviewManualNarrative(p,dir+"-advisory",new AbortController().signal,(async()=>({verdict:"changes",fullText:text,summary:"Повторяется начало",findings:[{span:"Сервер",note:"Сведите повторные вступления",category:"rhythm"}]})) as any,undefined,"",true);
  assert.equal(advisory.verdict,"changes","with fact checking off the editor's notes are kept but do not stop the voice-over");
  assert.equal(JSON.stringify(p),before);
  await assert.rejects(reviewManualNarrative(p,dir+"-rewrite",new AbortController().signal,(async()=>({verdict:"pass",fullText:text+" Лишняя фраза.",summary:"Готово",findings:[]})) as any),/изменил ручной текст/);
 }finally{await fs.rm(dir,{recursive:true,force:true});await fs.rm(dir+"-rewrite",{recursive:true,force:true});}
});
test("a saved Scribe response is reused after the expected text changes without another request",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-scribe-")),p=plan();
 try{await fs.writeFile(path.join(dir,"narration.wav"),"same recorded audio");const hash=await fileHash(path.join(dir,"narration.wav"));await writeJSON(path.join(dir,`scribe-${hash}.json`),{text:"Сервер видит сервер",words:[]});const report=await verifyAudioText({voice:true,plan:p} as any,dir,new AbortController().signal);assert.equal(report.status,"changes");assert.equal(report.audioHash,hash);assert.ok(report.edits?.some((e:{kind:string})=>e.kind==="missing"));assert.equal((await fs.readdir(dir)).filter(f=>f.endsWith("pending.json")).length,0);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test("blind script comparison hides provenance and rejects a vote after text changes",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-compare-")),p={plan:plan()} as any;
 try{await writeJSON(path.join(dir,"narrative-writer/answer.json"),{fullText:"Первый рассказ о том, как устроен пример сервера, до независимой редактуры."});const blind=await prepareScriptComparison(p,dir);assert.ok(blind);assert.equal(blind.origins,undefined);assert.equal(blind.candidates.length,2);const vote={id:blind.id,winner:0,scores:[[4,4,4,4,4],[null,null,null,null,null]],comment:"Понятнее причина"};p.plan.scenes[0].narration="Изменённый сервер видит сервер.";await assert.rejects(selectScriptComparison(p,dir,vote),/устарело/);assert.equal(publicComparison({currentHash:"old"},editorialInput(p.plan).fullText),null);p.plan=plan();const selected=await selectScriptComparison(p,dir,vote);assert.ok(selected);assert.equal(selected.status,"selected");assert.equal(selected.origins.length,2);assert.deepEqual(selected.selection.scores[1],[null,null,null,null,null]);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test("a damaged pending Scribe journal still blocks an unknown paid request",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-scribe-journal-")),p=plan();
 try{await fs.writeFile(path.join(dir,"narration.wav"),"recorded audio");const audioHash=await fileHash(path.join(dir,"narration.wav")),expected=editorialInput(p).fullText,key=digest({audioHash,expected,model:"scribe_v2",diffVersion:2});await fs.writeFile(path.join(dir,`audio-text-${key}.pending.json`),"incomplete json");const report=await verifyAudioText({voice:true,plan:p} as any,dir,new AbortController().signal);assert.equal(report.status,"unavailable");assert.match(report.error||"",/неизвестный результат/);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test("editing a whole narrative keeps the prior PCM master and manual words for a blocked script",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-author-text-")),text="В этом тестовом описании документ появился в 2020 году. Дальше объясняется один пример.",base={version:2,title:"Документ",summary:"Тест",mainPoint:"Проверка ручной редакции",fullText:text,caption:"Пример",selectedAngleId:"a1",selectedHookId:"h1"};
 const p={profile:{production:{version:2}},duration:30,voice:true,topic:"Тест",plan:null} as any;
 try{await writeJSON(path.join(dir,"narrative.json"),base);await fs.writeFile(path.join(dir,"narration.wav"),"preserved PCM fixture");const next=await saveManualNarrative(p,dir,text.replace("Дальше","Затем"));assert.equal(next?.fullText,text.replace("Дальше","Затем"));assert.equal(await fs.readFile(path.join(dir,"narrative-versions",digest(text),"narration.wav"),"utf8"),"preserved PCM fixture");
 const c={id:"c1",span:"документ появился в 2020 году",claim:"Документ появился в 2020 году",kind:"fact"},sources=[{...source,content:"The document was introduced in 2019."}];
 let writerCalled=false;const agent=async(prompt:string)=>{if(prompt.includes("Напиши один цельный"))writerCalled=true;if(prompt.includes("РОЛЬ 1"))return {claims:[c]};if(prompt.includes("РОЛЬ 2"))return {summary:"Дата неверна",claims:[{...c,status:"contradicted",reason:"В источнике 2019",evidence:[{sourceId:"s1",quote:"The document was introduced in 2019."}]}],queries:[]};return {verdict:"pass",fullText:next!.fullText,summary:"Связно",findings:[]};};
 await assert.rejects(produceQuality(p,{angles:[{id:"a1"}],hooks:[{id:"h1"}],facts:[],disputed:[]} as any,sources,dir,()=>{},new AbortController().signal,async()=>{throw new Error("Unneeded search");},agent as any),/авторском рассказе/);assert.equal(writerCalled,false);assert.equal((JSON.parse(await fs.readFile(path.join(dir,"manual-narrative.json"),"utf8"))).fullText,next!.fullText);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test("resuming after a verifier failure keeps completed writing/editorial stages and repair budget",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-resume-")),p={profile:{production:{version:2}},topic:"Тест",duration:30,format:"9:16",voice:false} as any,research={angles:[{id:"a1"}],hooks:[{id:"h1"}],facts:[{id:"f1"}],disputed:[]} as any;
 const initial=plan(),fullText=editorialInput(initial).fullText,n={version:2,title:initial.title,summary:initial.summary,mainPoint:"Проверка продолжения этапов",fullText,caption:"Копия",selectedAngleId:"a1",selectedHookId:"h1"},c={id:"c1",span:"Сервер видит сервер.",claim:"Сервер видит сервер",kind:"fact"};let writer=0,editor=0,fail=true;
 const agent=async(prompt:string)=>{if(prompt.includes("Напиши один цельный")){writer++;return n;}if(prompt.includes("Отредактируй текст")){editor++;return {verdict:"pass",fullText,summary:"Готово",findings:[]};}if(prompt.includes("РОЛЬ 1"))return {claims:[c]};if(prompt.includes("РОЛЬ 2")){if(fail)throw new Error("Transient verifier failure");return {summary:"Подтверждено",claims:[{...c,status:"supported",reason:"Тестовый источник",evidence:[{sourceId:"s1",quote:"A server sees another server."}]}],queries:[]};}if(prompt.includes("Разметь утверждённый")){assert.ok(prompt.includes('READ_SOURCES=['));assert.ok(prompt.includes('"content":"A server sees another server."'));return {scenes:initial.scenes.map(s=>({...s,sourceFactIds:["f1"],visualDescription:"Показать условный сервер"}))};}throw new Error("Unexpected role");};
 const execute=()=>produceQuality(p,research,[{...source,content:"A server sees another server."}],dir,()=>{},new AbortController().signal,async()=>{throw new Error("No search expected");},agent as any);
 try{await assert.rejects(execute(),/Transient/);fail=false;const result=await execute();assert.equal(editorialInput(result).fullText,fullText);assert.equal(writer,1);assert.equal(editor,1);assert.equal(JSON.parse(await fs.readFile(path.join(dir,"narrative-progress.json"),"utf8")).cycle,0);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test("targeted evidence can resolve a screen claim without rewriting a verified narrative",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"quality-targeted-")),p={profile:{production:{version:2}},topic:"Тест",duration:30,format:"9:16",voice:false} as any,research={angles:[{id:"a1"}],hooks:[{id:"h1"}],facts:[{id:"f1"}],disputed:[]} as any,initial=plan(),fullText=editorialInput(initial).fullText;
 const n={version:2,title:initial.title,summary:initial.summary,mainPoint:"Один проверяемый пример",fullText,caption:"Копия",selectedAngleId:"a1",selectedHookId:"h1"},c1={id:"c1",span:"Сервер видит сервер.",claim:"Сервер видит сервер",kind:"fact"},c2={id:"c2",span:"Состояние системы",claim:"В примере показано состояние системы",kind:"fact"};let writers=0,editors=0,segments=0,searches=0;
 const agent=async(prompt:string)=>{if(prompt.includes("Напиши один цельный")){writers++;return n;}if(prompt.includes("Отредактируй текст")){editors++;return {verdict:"pass",fullText,summary:"Готово",findings:[]};}if(prompt.includes("РОЛЬ 1"))return {claims:prompt.includes("Состояние системы")?[c1,c2]:[c1]};if(prompt.includes("РОЛЬ 2")){const hasScreen=prompt.includes(c2.claim),known=prompt.includes("The system state is illustrated."),claims=[{...c1,status:"supported",reason:"Есть доказательство",evidence:[{sourceId:"s1",quote:"A server sees another server."}]}];if(hasScreen)claims.push({...c2,status:known?"supported":"uncertain",reason:known?"Адресный источник прочитан":"Нужны данные",evidence:known?[{sourceId:"s2",quote:"The system state is illustrated."}]:[]});return {summary:"Проверено",claims,queries:hasScreen&&!known?["system state primary documentation"]:[]};}if(prompt.includes("Разметь утверждённый")){segments++;return {scenes:initial.scenes.map(s=>({...s,sourceFactIds:["f1"],visualDescription:"Показать условный сервер"}))};}throw new Error("Unexpected rewrite");};
 try{const result=await produceQuality(p,research,[{...source,content:"A server sees another server."}],dir,()=>{},new AbortController().signal,async(_q,sources)=>{searches++;return [...sources,{...source,id:"s2",url:"https://example.org/second",content:"The system state is illustrated."}];},agent as any);assert.equal(editorialInput(result).fullText,fullText);assert.deepEqual([writers,editors,segments,searches],[1,1,1,1]);assert.equal(JSON.parse(await fs.readFile(path.join(dir,"fact-audit.json"),"utf8")).passed,true);}finally{await fs.rm(dir,{recursive:true,force:true});}
});

test("Export QA samples the interior of a cutaway and uses measured word anchors for its sound cue",()=>{
 const p=plan();p.world3d={version:1,concept:'Раскрытие корпуса',cameraMode:'static',camera:[],objects:[{id:'car',model:'assembly',assetId:'car',animationClip:'',label:'',color:'#8D59DA',metalness:.5,roughness:.4,enter:{scene:1,progress:0,cue:''},exit:null,keys:[],articulation:{cutaway:[{at:{scene:1,progress:0,cue:''},value:0},{at:{scene:1,progress:.5,cue:'сервер',cueOccurrence:2},value:1}]}}],lighting:{keyPosition:[1,4,3],keyColor:'#FFFFFF',keyIntensity:3,fillIntensity:1,rimColor:'#8D59DA'},ground:true,notes:[],referenceShotIds:[]};
 p.scenes.forEach(s=>{s.beats=[];});
 const alignment=[{words:[{text:'Сервер',start:.2,end:.5},{text:'видит',start:.6,end:1},{text:'сервер',start:4.4,end:4.7}]}];
 const samples=reviewFrames(p,alignment);assert.ok(samples.frames.includes(132));assert.ok(samples.frames.includes(66));assert.ok(samples.frames.includes(130));
 assert.ok(soundCues(p,alignment).cues.some(c=>c.kind==='assembly-cutaway'&&c.at===0&&c.durationSeconds===4.4));
});

test("Fact verification repairs malformed evidence once while preserving the independently extracted claim",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'evidence-repair-test-'));let calls=0;
 const c={id:'c1',span:'Копия может отставать',claim:'Копия может отставать',kind:'fact' as const};
 try{
  const agent:any=async(prompt:string)=>{calls++;if(calls===1)return {claims:[c]};if(calls===3)assert.match(prompt,/НЕПРЕРЫВНОЙ/);return {summary:'Проверено',claims:[{...c,status:'supported',reason:'can lag confirms can',evidence:[{sourceId:'s1',quote:calls===2?'A replica always lags.':'A replica can lag behind the primary.'}]}],queries:[]};};
  const report=await auditText({fullText:c.span,screenText:''},[source],dir,new AbortController().signal,agent);
  assert.equal(calls,3);assert.equal(report.passed,true);assert.deepEqual(report.claims[0].claim,c.claim);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test("A preverified label reused as a 3D pin keeps fact approval current, while a new claim invalidates it",()=>{
 const p=plan();p.visualConcept={scenes:[{labels:['Баллоны']}]} as any;
 const before=editorialInput(p);
 p.world3d={objects:[{labelStyle:'pin',label:'Баллоны'}]} as any;
 assert.deepEqual(editorialInput(p),before);
 p.world3d!.objects[0].label='Непроверенное обещание';assert.notDeepEqual(editorialInput(p),before);
 delete p.visualConcept;
 assert.match(editorialInput(p).screenText,/Непроверенное обещание/,'legacy pin labels retain their original verification scope');
});

test('creator outro preserves the world until its scene, reveals continuously and settles inside a short spoken CTA',()=>{
 const motion={fadeSeconds:.7,avatarDelaySeconds:.12,risePixels:48,avatarSize:460},start=46;
 const before=creatorOutroState(start-1/30,start,motion),edge=creatorOutroState(start,start,motion),next=creatorOutroState(start+1/30,start,motion),settled=creatorOutroState(start+1.5,start,motion);
 assert.equal(before.contentOpacity,1);assert.equal(edge.opacity,0);assert.ok(next.opacity>0&&next.opacity<.02);
 assert.equal(settled.opacity,1);assert.equal(settled.avatarOpacity,1);assert.equal(settled.avatarY,0);
 let last=edge;for(let frame=1;frame<=45;frame++){const now=creatorOutroState(start+frame/30,start,motion);assert.ok(now.opacity>=last.opacity);assert.ok(now.avatarOpacity>=last.avatarOpacity);assert.ok(Math.abs(now.avatarOpacity-last.avatarOpacity)<.08,'no one-frame entrance');last=now;}
 const p=plan(),old=editorialInput(p);p.creatorBranding={version:1,username:'@xtuned',avatarFile:'00000000-0000-0000-0000-000000000000/branding/avatar.png',avatarSha256:'a'.repeat(64),hideSchematicNote:true,outro:{sceneId:p.scenes.at(-1)!.id,question:'Хочешь узнать больше?',callToAction:'Подписывайся',motion}};
 assert.equal(editorialInput(p).fullText,old.fullText);assert.match(editorialInput(p).screenText,/Подписывайся/,'new screen copy participates in the fact-gate hash');
});

test('a mechanism cue wins over a coincident object entrance instead of being silently dropped',()=>{
 const p=plan();p.world3d={objects:[{id:'car',assetId:'car',enter:{scene:1,progress:.4,cue:''},articulation:{cutaway:[{at:{scene:1,progress:0,cue:''},value:0},{at:{scene:1,progress:.4,cue:''},value:1}],fan:[{at:{scene:1,progress:0,cue:''},value:0},{at:{scene:1,progress:.4,cue:''},value:1}]}}]} as any;
 const cues=soundCues(p,[]).cues;assert.ok(cues.some(c=>c.kind==='assembly-fan'));assert.ok(!cues.some(c=>c.kind==='object-enter'&&c.at===cues.find(x=>x.kind==='assembly-fan')!.at));
});

test('audition preferences use only approved sounds, cover system state changes and preserve the measured clock',()=>{
 const p=plan();p.scenes.forEach(s=>{s.beats=[];});
 p.scenes[0].beats=[{at:1,cue:'',action:'reveal',target:'a',description:'Появление'},{at:1.45,cue:'',action:'connect',target:'b',description:'Связь'},{at:2,cue:'',action:'hide',target:'a',description:'Сворачивание'}];
 p.world3d={objects:[{enter:{scene:1,progress:0,cue:''},exit:{scene:1,progress:.6,cue:''},articulation:{cutaway:[{at:{scene:1,progress:0,cue:''},value:0},{at:{scene:1,progress:.4,cue:''},value:1}],thrust:[{at:{scene:1,progress:0,cue:''},value:0},{at:{scene:1,progress:.5,cue:''},value:1}],fan:[{at:{scene:1,progress:0,cue:''},value:0},{at:{scene:1,progress:.8,cue:''},value:1},{at:{scene:1,progress:.9,cue:''},value:0}]}}]} as any;
 const sheet=soundCues(p,[]),allowed=['ui-reveal','soft-whoosh','ui-highlight','fan-start'];
 assert.equal(sheet.version,8);assert.equal(sheet.backgroundGain,.009);
 assert.ok(sheet.cues.filter(c=>c.effect==='ui-reveal'||c.effect==='ui-highlight').every(c=>c.levelScale===.6));
 assert.ok(sheet.cues.every(c=>allowed.includes(c.effect)));assert.ok(sheet.cues.every(c=>Math.abs(c.at*30-Math.round(c.at*30))<1e-8));
 const blips=sheet.cues.filter(c=>c.effect==='ui-reveal');assert.ok(blips.length>0);assert.ok(blips.every((c,i)=>!i||c.at-blips[i-1].at>=3-1e-8));
 assert.equal(sheet.cues.find(c=>c.kind==='assembly-cutaway')?.effect,'soft-whoosh');
 const fans=sheet.cues.filter(c=>c.effect==='fan-start');assert.equal(fans.length,1);assert.equal(fans[0].levelScale,.3);
 assert.equal(fans[0].fadeOutSeconds,.9);assert.ok(sheet.cues.filter(c=>c.effect==='soft-whoosh').every(c=>c.levelScale===.24&&c.fadeOutSeconds===Math.min(.4,(c.durationSeconds??0)*.3)));
});

test('same resolved sound has a three-second cooldown across action kinds and preserves anchors',()=>{
 const cues=[{at:1,kind:'reveal'},{at:1.5,kind:'connect'},{at:2,kind:'hide'},{at:3.999,kind:'reveal'},{at:4,kind:'connect'},{at:4.5,kind:'highlight'},{at:7,kind:'reveal'}];
 const copy=JSON.stringify(cues),kept=spaceSoundEffects(cues);
 assert.deepEqual(kept.map(c=>c.at),[1,4,4.5,7]);assert.equal(JSON.stringify(cues),copy);
 const priority=spaceSoundEffects([{at:10,kind:'assembly-cutaway'},{at:11,kind:'outro-transition'},{at:12,kind:'assembly-cutaway'},{at:14,kind:'assembly-cutaway'}]);
 assert.deepEqual(priority.map(c=>c.at),[11,14],'outro wins without moving either visual event');
 const p=plan();p.scenes.forEach(s=>s.beats=[]);p.scenes[0].beats=cues.filter(c=>c.at<=7).map(c=>({at:c.at,cue:'',action:(c.kind==='highlight'?'highlight':c.kind==='hide'?'hide':c.kind==='connect'?'connect':'reveal') as 'highlight'|'hide'|'connect'|'reveal',target:'server',description:'Состояние меняется'}));
 const generated=soundCues(p,[]).cues.filter(c=>c.effect==='ui-reveal');
 assert.ok(generated.length>=2);assert.ok(generated.every((c,i)=>!i||c.at-generated[i-1].at>=3-1e-8),'production cue builder applies cooldown after effect mapping');
});

test('assembly sound follows the start and full span of smooth movement and sustained fan speed',()=>{
 const p=plan();p.scenes=[{...p.scenes[0],seconds:10}];
 const at=(progress:number)=>({scene:1,progress,cue:''});
 p.world3d={objects:[{id:'car',enter:at(0),articulation:{lift:[{at:at(.05),value:0},{at:at(.15),value:.5}],cutaway:[{at:at(.1),value:0},{at:at(.25),value:1},{at:at(.6),value:1},{at:at(.75),value:0}],fan:[{at:at(0),value:0},{at:at(.2),value:0},{at:at(.3),value:1},{at:at(.7),value:1},{at:at(.8),value:0}]}}]} as any;
 const cues=assemblySoundCues(p,[]),body=cues.filter(c=>c.kind==='assembly-cutaway'),fan=cues.find(c=>c.kind==='assembly-fan')!;
 assert.deepEqual(body.map(c=>[c.at,c.durationSeconds]),[[1,1.5],[6,1.5]]);assert.ok(body.every(c=>c.durationMode==='stretch'));
 assert.equal(fan.at,2);assert.equal(fan.durationSeconds,6);assert.equal(fan.durationMode,'loop');assert.deepEqual(fan.automation?.map(k=>[k.at,k.value]),[[0,0],[2,0],[3,1],[7,1],[8,0]]);
 assert.ok(!cues.some(c=>c.at===2.5),'destination key must not fire a late movement sound');
 const generated=soundCues(p,[]).cues;assert.ok(generated.some(c=>c.kind==='assembly-cutaway'&&c.at===1));assert.ok(generated.some(c=>c.kind==='assembly-fan'&&c.at===2));
});
test("2D diagram vocabulary: list cards and toned links are optional and legacy diagrams parse unchanged",()=>{
 const legacy={nodes:[{id:"a",label:"Resolver",kind:"server",row:0,col:0},{id:"b",label:"Root",kind:"server",row:0,col:1}],edges:[{id:"ab",from:"a",to:"b"}]};
 assert.deepEqual(diagramSchema.parse(legacy),legacy);
 const toned={nodes:[{...legacy.nodes[0],list:{columns:["Names","IPs"],rows:3}},legacy.nodes[1]],edges:[{id:"ab",from:"a",to:"b",kind:"request"},{id:"ba",from:"b",to:"a",kind:"reply"}]};
 assert.deepEqual(diagramSchema.parse(toned),toned);
 assert.throws(()=>diagramSchema.parse({...toned,edges:[{id:"ab",from:"a",to:"b",kind:"push"}]}));
 assert.throws(()=>diagramSchema.parse({...toned,nodes:[{...legacy.nodes[0],list:{columns:["Names"],rows:9}}]}));
 assert.match(DIAGRAM_VOCABULARY,/reply/);assert.match(DIAGRAM_VOCABULARY,/без значений/);
 const p=plan();p.scenes[0].diagram=toned as any;assert.match(writtenText(p),/Names\nIPs/);
});
test("toned links end outside both cards, separate reverse twins and bend only between row neighbours",()=>{
 const card={w:130,h:77},a={x:143,y:120},b={x:430,y:120},c={x:430,y:355};
 const {from,to}=edgeEnds(a,c,card,card);assert.ok(to.y<=c.y-card.h-9.9||Math.abs(to.x-c.x)>=card.w+9.9,"tip stays outside the target card");
 const forward=edgeEnds(a,c,card,card,16),back=edgeEnds(c,a,card,card,16);assert.ok(Math.sign(forward.from.x-from.x)!==Math.sign(back.to.x-from.x)||Math.abs(forward.from.x-back.to.x)>20,"twins sit on opposite sides");
 const row=edgeCurve(b,a,card,card,0,true);assert.ok(row[3].y>a.y+card.h&&row[1].y>row[0].y+30,"row neighbours bend below the row");
 assert.deepEqual(edgeCurve(b,a,card,card,0,false)[3],edgeEnds(b,a,card,card).to);
 const diag=edgeCurve({x:717,y:120},c,card,card,0,true);assert.ok(diag[3].y<=c.y-card.h-9.9,"diagonal reply keeps its arrowhead above the target");
 for(const dy of [0,10,30,60,90]){const near=edgeCurve(b,{x:a.x,y:a.y+dy},card,card,0,true)[3],next=edgeCurve(b,{x:a.x,y:a.y+dy+.5},card,card,0,true)[3];assert.ok(Math.hypot(near.x-next.x,near.y-next.y)<3,"bend blends continuously while cards move");}
});
test("list rows fit inside the card and unfold continuously with its reveal",()=>{
 for(const lines of [1,2])for(const rows of [2,3,4]){const l=listLayout(rows,lines);assert.ok(l.rowY.length>=2&&l.rowY.length<=rows);assert.ok(l.rowY.at(-1)!+10<=95-8);assert.ok(l.headerY<l.ruleY&&l.ruleY<l.rowY[0]);}
 for(let r=0;r<4;r++){assert.equal(rowReveal(0,r,4),0);assert.equal(rowReveal(1,r,4),1);for(let v=0;v<1;v+=.01)assert.ok(Math.abs(rowReveal(v+.01,r,4)-rowReveal(v,r,4))<.02);}
});
test("quality-v2 portrait header keeps text inside the OCR safe-zone with glyph margin; legacy geometry unchanged",()=>{
 assert.deepEqual(LEGACY_HEADER,{left:78,right:140,title:0});
 assert.ok(1080-SAFE_HEADER.right<=940-16,"counter right edge");assert.ok(SAFE_HEADER.left>=75+16,"header left edge");assert.ok(78+SAFE_HEADER.title>=75+16,"chapter title left edge");
});
