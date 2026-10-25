import fs from 'node:fs';import path from 'node:path';import {project,updateProject,enqueue,DATA} from '../src/lib/store';import {scriptMarkdown,validateDirectedPlan,researchSchema} from '../src/lib/research-model';
const id='012fb427-5def-4802-a514-5f4364395ac0',p=project(id)!,dir=path.join(DATA,'projects',id),plan=structuredClone(p.plan!);
const descriptions=[
 'Слева раскрывается профиль с именем «Аня». На слове «изменили» справа появляется база с именем «Анна». В конце плавный акцент выделяет прежнее имя в профиле.',
 'Сначала видно новое имя в базе. На слове «Кэш» появляется старая копия, затем профиль. Связь от кэша к профилю показывает чтение без обращения к базе.',
 'Раскрывается карточка срока TTL без выдуманного числового значения. Появляется старая копия; затем профиль остаётся со старым именем: срок хранения сам не обновляет открытый экран.',
 'В центре показана старая копия. Ниже раскрывается событие успешного сохранения имени. Связь показывает запуск удаления, затем старая копия плавно сжимается и уходит.',
 'Следующий запрос соединяется с базой «Анна». В кэше появляется новая копия с тем же именем, связь показывает перенос данных приложением. В финале остаётся правило «Сохранили → удалили».',
];
plan.scenes.forEach((s,i)=>s.visualDescription=descriptions[i]);plan.scenes[0].beats![2].description='Плавный акцент выделяет прежнее имя «Аня».';
plan.scenes[4].narration='Следующий запрос прочитает базу и заполнит кэш. Правило: сохранили имя? Удалите копию.';
validateDirectedPlan(plan,researchSchema.parse(JSON.parse(fs.readFileSync(path.join(dir,'research.json'),'utf8'))));
const packPath=path.join(dir,'script-package.json'),pack=JSON.parse(fs.readFileSync(packPath,'utf8'));
if(!fs.existsSync(path.join(dir,'script-package-before-editor.json')))fs.copyFileSync(packPath,path.join(dir,'script-package-before-editor.json'));
pack.plan=plan;pack.audit.notes[5]='Число сегментов и шапка управляются шаблоном. Все узлы имеют плавный reveal; связи и слова-сигналы проверены. Редактор убрал неподдерживаемые указания о шапке и уточнил пунктуацию финальной фразы.';
fs.writeFileSync(packPath,JSON.stringify(pack,null,2));fs.writeFileSync(path.join(dir,'storyboard.json'),JSON.stringify(plan,null,2));fs.writeFileSync(path.join(dir,'script.md'),scriptMarkdown(plan));
fs.writeFileSync(path.join(dir,'editorial-review.json'),JSON.stringify({changes:['Описания приведены к реальным возможностям шаблона без обещания семи сегментов в пяти сценах.','Пунктуация заключительной фразы уточнена.','Карточки и подписи укрупнены после автоматического ревью.'],scope:'Исследование, факты, выбранный хук и события сохранены. Синтез речи не вызывался: тестовый проект без речи.'},null,2));
updateProject(id,{plan,status:'queued',stage:'Укрупняем схему после ревью',progress:0,review:null});enqueue(id);console.log(id);
