import fs from "node:fs/promises";
import path from "node:path";
import {updateProject,event,DATA} from "../src/lib/store";
async function main(){
  const out="/Users/rv/Documents/Codex/2026-10-18/https-github-com-charlie947-motion-graphics/outputs/system-design-v5";
  const id="ec811bd9-2cfd-4594-a39b-16eb005ab382";
  const dir=path.join(DATA,"projects",id);
  const tech=JSON.parse(await fs.readFile(path.join(out,"qa/final-verification.json"),"utf8"));
  const browser=JSON.parse(await fs.readFile(path.join(out,"qa/browser-playback.json"),"utf8"));
  const fullPlayback=browser.end.played?.some((r:number[])=>r[0]<=.05&&r[1]>=49.95);
  if(!tech.technicalPassed||!fullPlayback||browser.end.error)throw Error("Required final verification is incomplete");
  const review={...tech,checkedAt:new Date().toISOString(),checks:[...tech.checks,
    {label:"Одна растущая схема",ok:true,detail:"Основные узлы сохраняются между главами. Перестроения по словам: серверы, база→шарды, файлы, очередь, резерв и наблюдаемость."},
    {label:"Просмотр кадров",ok:true,detail:"50 секундных кадров, плотные переходы семи глав и 14 операций роста, субтитры и последний кадр. Исправлены наложения заголовков и подписей базы."},
    {label:"Воспроизведение до конца",ok:true,detail:"Встроенный плеер Motion Studio: фактический диапазон воспроизведения 0–50 секунд, error=null."}],
    coverage:"Проверены экспорт, непрерывность основных узлов, реальные тайминги речи, секундные кадры, плотные переходы и воспроизведение до конца. Статические кадры не являются прослушиванием; голосовой мастер сохранён из предыдущей версии. Одобрение подачи остаётся за редактором."};
  await fs.copyFile(path.join(out,"qa/poster.jpg"),path.join(dir,"poster.jpg"));
  await fs.copyFile(path.join(out,"qa/overview.jpg"),path.join(dir,"contact-sheet.jpg"));
  await fs.writeFile(path.join(out,"qa/review.json"),JSON.stringify(review,null,2));
  await fs.writeFile(path.join(dir,"review.json"),JSON.stringify(review,null,2));
  updateProject(id,{status:"review",stage:"На просмотре",progress:100,poster:`data/projects/${id}/poster.jpg`,sheet:`data/projects/${id}/contact-sheet.jpg`,review,error:null});
  event(id,"Новая редакция с единой растущей схемой проверена и готова к просмотру. Перелистывания удалены; прежний голос сохранён.");
  console.log(JSON.stringify({id,status:"review",checks:review.checks.length,technicalPassed:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
