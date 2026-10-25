import fs from 'node:fs';
import path from 'node:path';
import {db,createProject,updateProject,enqueue,DATA} from '../src/lib/store';
import {normalizePlan} from '../src/lib/model';
const key='xtuned-system-design-v1-project';
const existing=db().prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined;
if(existing){console.log(existing.value);process.exit(0);}
const plan=normalizePlan(JSON.parse(fs.readFileSync('video-design/system-design-storyboard.json','utf8')),60,true);
const id=createProject({topic:'System Design: растущая соцсеть. Один сервер, балансировщик, кэш и реплики, шарды и файлы, очередь, резервирование и наблюдаемость. @xtuned, палитра и правила видео v1.',duration:60,format:'9:16',voice:true});
updateProject(id,{plan,title:plan.title});
const dir=path.join(DATA,'projects',id);fs.mkdirSync(dir,{recursive:true});
for(const file of fs.readdirSync(process.argv[2]))if(/\.(mp3|wav|jsonl)$/.test(file))fs.copyFileSync(path.join(process.argv[2],file),path.join(dir,file));
fs.writeFileSync(path.join(dir,'storyboard.json'),JSON.stringify(plan,null,2));
db().prepare('INSERT INTO settings(key,value) VALUES(?,?)').run(key,id);
const cicd=db().prepare('SELECT value FROM settings WHERE key=?').get('xtuned-explainer-v1-project') as {value:string};
updateProject(cicd.value,{status:'queued',stage:'Обновляем субтитры и схему выпуска',progress:0,review:null});
enqueue(cicd.value);
console.log(id);
