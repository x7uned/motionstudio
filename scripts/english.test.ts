import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {normalizePlan} from "../src/lib/model";
import {languageDirective,PLAIN_ENGLISH,projectLanguage,productionSettingsSchema,voicePlanSchema,wordsPerSecond,DEFAULT_EN_VOICE_PROFILE,voiceProfileSchema} from "../src/lib/quality-contract";
import {TEMPLATE_FILES} from "../src/lib/video-templates";
// voice/script-comparison import store transitively: load them only after chdir so ROOT/DATA point at the temp folder.
let store:typeof import("../src/lib/store");
let transcriptDiff:typeof import("../src/lib/voice").transcriptDiff,audioTextDiff:typeof import("../src/lib/voice").audioTextDiff,brandCheck:typeof import("../src/lib/voice").brandCheck;
let publicComparison:typeof import("../src/lib/script-comparison").publicComparison,digest:typeof import("../src/lib/quality").digest;
let temp:string;
const previous=process.cwd();
before(async()=>{
 temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),"motion-studio-en-")));
 const templateDir=path.join(temp,"data/templates/tech-story/v1");fs.mkdirSync(templateDir,{recursive:true});
 for(const name of TEMPLATE_FILES)fs.copyFileSync(path.join(previous,"data/templates/tech-story/v1",name),path.join(templateDir,name));
 fs.cpSync(path.join(previous,"data/branding/xtuned-outro/v1"),path.join(temp,"data/branding/xtuned-outro/v1"),{recursive:true});
 fs.cpSync(path.join(previous,"data/sound-packs/background-beds/v4"),path.join(temp,"data/sound-packs/background-beds/v4"),{recursive:true,filter:f=>!/\.(wav|m4a)$/.test(f)});
 fs.cpSync(path.join(previous,"data/templates/illustrated-scene/v2"),path.join(temp,"data/templates/illustrated-scene/v2"),{recursive:true});
 process.chdir(temp);
 store=await import("../src/lib/store");
 assert.equal(store.DATA,path.join(temp,"data"),"tests must never touch the real studio database");
 ({transcriptDiff,audioTextDiff,brandCheck}=await import("../src/lib/voice"));
 ({publicComparison}=await import("../src/lib/script-comparison"));({digest}=await import("../src/lib/quality"));
});
after(()=>{store.db().close();process.chdir(previous);fs.rmSync(temp,{recursive:true,force:true});});
const en={production:{version:2,language:"en"}},ru={production:{version:2}};
const plan=(narration:string,scenes=4)=>({title:"How HTTPS works",summary:"",factNotes:"",scenes:Array.from({length:scenes},(_,i)=>({id:String(i),title:`Step ${i+1}`,subtitle:"",narration,visual:"flow",items:["x"],seconds:15}))});

test("Russian stays the byte-identical default; English is an explicit project field",()=>{
 assert.equal(projectLanguage(undefined),"ru");assert.equal(projectLanguage(ru),"ru");assert.equal(projectLanguage(en),"en");
 for(const kind of ["content","motion","review"] as const){assert.equal(languageDirective(ru,kind),"","no Russian prompt changes");assert.match(languageDirective(en,kind),/АНГЛИЙСКИЙ/);}
 assert.match(languageDirective(en),/American English/);assert.match(languageDirective(en,"review"),/Russian or mixed-language/);
 // Plain English (2026-10-22) only for projects that carry the flag; older EN prompts stay byte-identical.
 const plainEn={production:{version:2,language:"en",plainEnglish:1}};
 assert.doesNotMatch(languageDirective(en),/PLAIN ENGLISH/);assert.doesNotMatch(languageDirective(en,"motion"),/learner/);
 assert.equal(languageDirective(plainEn),languageDirective(en)+PLAIN_ENGLISH);assert.match(languageDirective(plainEn,"motion"),/learner of English/);
 assert.equal(languageDirective(plainEn,"review"),languageDirective(en,"review"));
 assert.equal(languageDirective({production:{version:2,plainEnglish:1}}),"","the flag never touches Russian prompts");
 assert.equal(productionSettingsSchema.safeParse({version:2,policyVersion:"p",language:"en",plainEnglish:1}).data?.plainEnglish,1);
 assert.equal(productionSettingsSchema.safeParse({version:2,policyVersion:"p",language:"en"}).success,true);
 assert.equal(productionSettingsSchema.safeParse({version:2,policyVersion:"p",language:"de"}).success,false);
 assert.equal(productionSettingsSchema.safeParse({version:2,policyVersion:"p",language:"ru"}).success,false,"ru is the absence of the field");
 assert.equal(voicePlanSchema.shape.language.safeParse("en").success,true);
 assert.equal(wordsPerSecond("ru",false),1.9);assert.equal(wordsPerSecond("ru",true),2.15);
 assert.ok(voiceProfileSchema.parse(DEFAULT_EN_VOICE_PROFILE).delivery.startsWith("A friendly English"));
});

test("English narration uses its own natural speech budget; Russian limits are unchanged",()=>{
 const words=(n:number)=>Array.from({length:n},()=>"word").join(" ");
 const p=plan(words(36)); // 144 words in 60 s = 2.4 w/s
 assert.throws(()=>normalizePlan(p,60,true),/слишком длинный/);
 assert.equal(normalizePlan(p,60,true,60,"en").scenes.length,4);
 assert.throws(()=>normalizePlan(plan(words(46)),60,true,60,"en"),/слишком длинный/);
});

test("English ASR comparison ignores case, apostrophe styles and spoken brand variants",()=>{
 const expected="Don't trust it. Follow xtuned.";
 assert.equal(transcriptDiff(expected,"don’t trust it follow X tuned","en").edits.length,0);
 assert.equal(transcriptDiff(expected,"Don't trust it. Follow ex-tuned.","en").edits.length,0);
 const missed=transcriptDiff(expected,"Don't trust it. Follow extended.","en");
 assert.equal(missed.edits[0].expected,"xtuned");
 assert.deepEqual(brandCheck(expected,"follow X tuned"),{brand:"xtuned",expected:1,heard:1,ok:true,variants:["X tuned"]});
 assert.equal(brandCheck(expected,"follow extended").ok,false);
 assert.deepEqual(brandCheck(expected,"Follow xTuned."),{brand:"xtuned",expected:1,heard:1,ok:true,variants:["xTuned"]},"the joined form is counted once");
 const timed=audioTextDiff(expected,{text:"Don't trust it. Follow extended.",words:[{text:"Don't",start:0,end:.2},{text:"trust",start:.2,end:.4},{text:"it.",start:.4,end:.5},{text:"Follow",start:.6,end:.8},{text:"extended.",start:.8,end:1.2}]},"en");
 assert.equal((timed as any).brand.ok,false);assert.equal((timed.edits[0] as any).at,.8);
 // Russian keeps ё→е and gets no brand field.
 assert.equal(transcriptDiff("Ёжик","ежик").edits.length,0);
 assert.equal((audioTextDiff("Ёжик",{text:"ежик",words:[{text:"ежик",start:0,end:1}]}) as any).brand,undefined);
});

test("createProject records English explicitly with the EN voice and keeps tech-story Russian",()=>{
 const id=store.createProject({topic:"How HTTPS keeps a password private",duration:30,format:"9:16",voice:true,language:"en"});
 const profile=store.project(id)!.profile;
 assert.equal(profile.production?.language,"en");
 assert.equal(profile.production?.plainEnglish,1,"new English projects get the plain-English rule");
 assert.equal(profile.production?.voiceProfile?.voiceId,DEFAULT_EN_VOICE_PROFILE.voiceId);
 assert.equal(profile.production?.voiceProfile?.model,"eleven_v4");
 assert.equal((profile as any).creatorOutro?.language,"en","the @xtuned outro picks its EN variant from the project language");
 assert.ok(store.events(id).some((e:any)=>/английский/.test(e.message??e.msg??JSON.stringify(e))));
 const russian=store.createProject({topic:"Как HTTPS прячет пароль",duration:30,format:"9:16",voice:true});
 assert.equal(store.project(russian)!.profile.production?.language,undefined);
 assert.equal(store.project(russian)!.profile.production?.plainEnglish,undefined);
 assert.notEqual(store.project(russian)!.profile.production?.voiceProfile?.delivery,DEFAULT_EN_VOICE_PROFILE.delivery);
 assert.throws(()=>store.createProject({topic:"History",duration:150,format:"9:16",voice:false,productionTemplateId:"tech-story",language:"en"}),/остаются русскими/);
 store.db().prepare("UPDATE jobs SET status='completed' WHERE project_id IN (?,?)").run(id,russian);
});

test("World If Then brand and the tiktok-safe layout are explicit per-project choices",()=>{
 const id=store.createProject({topic:"What if the Sun disappeared for a day",duration:150,format:"9:16",voice:false,language:"en",productionTemplateId:"illustrated-scene",brand:"worldifthen",portraitLayout:"tiktok-safe"});
 const profile=store.project(id)!.profile;
 assert.equal(profile.username,"@worldifthen_ai");assert.equal(profile.creatorOutro?.brand,"worldifthen");
 assert.equal(profile.production?.portraitLayout,"tiktok-safe");assert.equal(profile.filmKind,"illustrated");
 assert.ok(store.events(id).some((e:any)=>/tiktok-safe/.test(e.message??e.msg??JSON.stringify(e))));
 assert.ok(store.events(id).some((e:any)=>/Follow World If Then/.test(e.message??e.msg??JSON.stringify(e))));
 const plain=store.createProject({topic:"What if the Moon disappeared",duration:150,format:"9:16",voice:false,language:"en",productionTemplateId:"illustrated-scene"});
 assert.equal(store.project(plain)!.profile.production?.portraitLayout,"tiktok-safe","new illustrated 9:16 films default to the TikTok-safe header");
 const fresh=store.project(plain)!.profile.production;assert.equal(fresh?.overlayVersion,3,"no overlay by default: only captions over a full 9:16 picture (2026-10-22)");assert.equal(fresh?.captionStyle,"karaoke","karaoke captions by default (2026-10-21)");
 const classic=store.createProject({topic:"What if the Moon vanished",duration:150,format:"9:16",voice:false,language:"en",productionTemplateId:"illustrated-scene",portraitLayout:"classic"});
 assert.equal(store.project(classic)!.profile.production?.portraitLayout,undefined,"classic keeps the original header");
 const other=store.createProject({topic:"How DNS works",duration:30,format:"9:16",voice:false,language:"en"});
 assert.equal(store.project(other)!.profile.production?.portraitLayout,undefined,"other film kinds are untouched");
 assert.throws(()=>store.createProject({topic:"What if the Sun disappeared",duration:60,format:"9:16",voice:false,language:"en",portraitLayout:"tiktok-safe"}),/tiktok-safe/,"only illustrated films have the layout");
 assert.throws(()=>store.createProject({topic:"Что если Солнце пропадёт",duration:150,format:"9:16",voice:false,productionTemplateId:"illustrated-scene",brand:"worldifthen"}),/только для английских/);
 store.db().prepare("UPDATE jobs SET status='completed' WHERE project_id IN (?,?,?,?)").run(id,plain,classic,other);
});

test("blind script comparison names the project language in its rubric",()=>{
 const saved={id:"x",status:"ready",currentHash:"",order:[0,1],versions:[{text:"a"},{text:"b"}]};
 saved.currentHash=digest("b");
 assert.ok(publicComparison(saved,"b","en")!.rubric.includes("Естественность английского на слух"));
 assert.ok(publicComparison(saved,"b")!.rubric.includes("Естественность русского на слух"));
});

test("fact checking can be switched off: explicit skipped record, current for approval, no claims",async()=>{
 const {skippedAudit}=await import("../src/lib/editorial");const {auditCurrent,editorialInput}=await import("../src/lib/quality");
 const id=store.createProject({topic:"How DNS finds an address",duration:30,format:"9:16",voice:false,language:"en",factCheck:"off"});
 assert.equal(store.project(id)!.profile.production?.factCheck,"off");
 assert.ok(store.events(id).some((e:any)=>/Фактчекинг выключен/.test(e.message)));
 const p=normalizePlan(plan("A resolver asks servers until one returns the address of the name you typed today."),30,false,30,"en");
 const sources=[{id:"s1",url:"https://example.org/dns",title:"DNS",content:"x".repeat(200),retrievedAt:new Date().toISOString()}];
 const audit=await skippedAudit(editorialInput(p),sources);
 assert.equal(audit.passed,true);assert.equal(audit.skipped,true);assert.equal(audit.claims.length,0);assert.equal(audit.queries.length,0);
 assert.equal(auditCurrent(audit,p,sources),true);
 store.db().prepare("UPDATE jobs SET status='completed' WHERE project_id=?").run(id);
});

test("2D motion repair names every scene/node pair that lacks a same-scene reveal",async()=>{
 const {unrevealedNodes}=await import("../src/lib/motion-director");
 const raw={scenes:[{id:"scene-1",diagram:{nodes:[{id:"browser"},{id:"resolver"}]},beats:[{action:"reveal",target:"browser"},{action:"reveal",target:"resolver"}]},{id:"scene-2",diagram:{nodes:[{id:"browser"},{id:"root"}]},beats:[{action:"reveal",target:"root"},{action:"highlight",target:"browser"}]}]};
 assert.deepEqual(unrevealedNodes(raw),["scene-2/browser"]);
 assert.deepEqual(unrevealedNodes(null),[]);
});
