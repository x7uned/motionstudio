import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {db,saveProfile,createProject,updateProject,DATA,ROOT} from '../src/lib/store';
import {profileSchema,normalizePlan} from '../src/lib/model';
const key='xtuned-explainer-v1-project';
const existing=db().prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined;
if(existing){console.log(existing.value);process.exit(0);}
const p=profileSchema.parse(JSON.parse(fs.readFileSync('video-design/profile.json','utf8')));
const plan=normalizePlan(JSON.parse(fs.readFileSync('video-design/cicd-storyboard.json','utf8')),60,true);
saveProfile(p);
const id=createProject({topic:'CI/CD: изменение кнопки магазина проходит семь этапов до покупателя. Референс подачи System Design, палитра Nix, @xtuned.',duration:60,format:'9:16',voice:true});
updateProject(id,{plan,title:plan.title});
const dir=path.join(DATA,'projects',id);
fs.mkdirSync(dir,{recursive:true});
const cache=process.argv[2];
if(cache)for(const file of fs.readdirSync(cache)){if(/\.(mp3|wav|jsonl)$/.test(file))fs.copyFileSync(path.join(cache,file),path.join(dir,file));}
fs.writeFileSync(path.join(dir,'storyboard.json'),JSON.stringify(plan,null,2));
fs.writeFileSync(path.join(dir,'context.json'),JSON.stringify({profile:p,source:'video-design/REFERENCE-RULES.md',voice:'ru-RU-SvetlanaNeural +8%, no montage time-stretch'},null,2));
fs.mkdirSync(path.join(DATA,'references'),{recursive:true});
const imageId=randomUUID();
fs.copyFileSync(path.join(ROOT,'video-design/references/palette-original.png'),path.join(DATA,'references',`${imageId}.png`));
db().prepare('INSERT INTO refs(id,name,kind,file,text,created) VALUES(?,?,?,?,?,?)').run(imageId,'Палитра видео · скриншот пользователя','image',`data/references/${imageId}.png`,null,new Date().toISOString());
db().prepare('INSERT INTO refs(id,name,kind,file,text,created) VALUES(?,?,?,?,?,?)').run(randomUUID(),'System Design · транскрипция пользователя','transcript',null,fs.readFileSync('video-design/system-design-transcript.txt','utf8'),new Date().toISOString());
fs.copyFileSync('video-design/references/system-design-original.mp4',path.join(DATA,'references','system-design-original.mp4'));
db().prepare('INSERT INTO settings(key,value) VALUES(?,?)').run(key,id);
console.log(id);
