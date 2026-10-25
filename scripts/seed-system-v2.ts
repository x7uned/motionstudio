import fs from 'node:fs';import path from 'node:path';
import {db,createProject,updateProject,DATA,project} from '../src/lib/store';
const key='xtuned-system-design-v2-project';
const old=db().prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined;
if(old){console.log(old.value);process.exit(0);}
const original=project('b83e4039-4ce3-4803-a090-4ed76a8be9e7')!;
const plan=structuredClone(original.plan!);plan.title='System Design · плавная анимация';
const id=createProject({topic:'System Design: растущая соцсеть, плавные входы и выходы всех блоков и субтитров, перекрывающиеся переходы. @xtuned. Новая версия с ElevenLabs после подключения голоса.',duration:60,format:'9:16',voice:true});
updateProject(id,{plan,title:plan.title});
const target=path.join(DATA,'projects',id),source=path.join(DATA,'projects',original.id);fs.mkdirSync(target,{recursive:true});
for(const f of fs.readdirSync(source))if(/\.(mp3|wav|jsonl)$/.test(f)||f==='alignment.json')fs.copyFileSync(path.join(source,f),path.join(target,f));
fs.writeFileSync(path.join(target,'storyboard.json'),JSON.stringify(plan,null,2));
fs.writeFileSync(path.join(target,'tts-provider.txt'),'edge');
db().prepare('INSERT INTO settings(key,value) VALUES(?,?)').run(key,id);console.log(id);
