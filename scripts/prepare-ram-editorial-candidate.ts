import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT} from '../src/lib/store';
import {structured} from '../src/lib/editorial';
import {narrativeSchema} from '../src/lib/quality-contract';

async function main(){
 const dir=path.join(ROOT,'data/projects/780ea45d-e247-48d9-8b60-7adfc785703c');
 const load=async(f:string)=>JSON.parse(await fs.readFile(path.join(dir,f),'utf8'));
 const [current,audit,research,sources]=await Promise.all(['narrative.json','fact-audit.json','research.json','sources.json'].map(load));
 if(process.argv[2]==='v2'){
  const edit=await load('editorial-audit.json');
  const prompt=`Исправь редакторский кандидат об ОЗУ по реально прочитанным источникам. Это новая зафиксированная операторская версия после остановки производства; она должна отдельно пройти редактора и фактчекера. Сохрани выбранные selectedAngleId/selectedHookId. Речь — один естественный русский абзац 85–105слов до60с. Причинная цепь: ИИ увеличивает спрос на HBM для ускорителей И на обычную серверную DRAM → производители при ограниченных мощностях отдают приоритет серверным продуктам → для ПК остаётся меньше доступного предложения → стоимость микросхем влияет на цену готовых модулей. Последняя связь теперь прямо описана Corsair в официальном Form10-Q; не обобщай структуру затрат одной компании на всех. НЕЛЬЗЯ говорить, что HBM необходима каждому ИИ-серверу. Не называй контрактные цены исключительно оптовыми ценами отдельных чипов. Не утверждай без прямого источника скорость наращивания выпуска; допустимо опустить упаковку/тестирование ради ясности. Добавь только нужную связку цены чипов с модулями по Corsair, без финансовых результатов компании и процентов. Прогноз TrendForce на IVквартал2026 обозначай прогнозом, не доказательством подорожания каждого комплекта в магазине. Полностью закончи объяснение и сохрани эту оговорку. Никаких советов покупать, новых чисел, тестов LLM или рекомендованных объёмов RAM. title/summary/mainPoint/caption — тексты для зрителя, без слова кандидат, рабочих инструкций, ASCII-схем и собственных дат актуальности. summary<=150символов, caption<=180. CURRENT=${JSON.stringify(current)}\nEDITOR=${JSON.stringify(edit)}\nAUDIT=${JSON.stringify(audit)}\nREAD_SOURCES=${JSON.stringify(sources)}`;
  const result=await structured(prompt,narrativeSchema,path.join(dir,'operator-revision-candidate-v2'),new AbortController().signal);
  console.log({candidatePrepared:true,characters:result.fullText.length,title:result.title,caption:result.caption});return;
 }
 const prompt=`Подготовь одну запасную редакцию рассказа об ОЗУ для оператора производства. Это кандидат, он сам не разрешает озвучку и должен пройти отдельного редактора и фактчекера. Используй ТОЛЬКО утверждения status=supported из последнего аудита и их подтверждённые причинные связи; не добавляй новые факты. Убери спорные тезисы о закупочных ценах именно отдельных чипов, переносе в розничную цену отдельного модуля и физическом составе модулей: не заменяй их похожим тезисом. Достаточно объяснить серверный приоритет, ограниченные мощности, снижение доступного предложения PC DRAM и прогноз контрактных цен DRAM. Не отождествляй прогноз с уже измеренной розничной ценой и не обещай универсальный рост. Без собственных дат актуальности, ASCII-схем, HBM-сравнений и производственных инструкций в caption. caption — короткое законченное описание до180символов, без обрывков ссылок. Один разговорный русский абзац, 75–95слов, один хук и ясный вывод. Не растягивай рассказ ради бюджета60с. selectedAngleId и selectedHookId сохрани из CURRENT; version=2. CURRENT=${JSON.stringify(current)}\nVERIFIED_AUDIT=${JSON.stringify(audit)}\nRESEARCH=${JSON.stringify(research)}\nREAD_SOURCES=${JSON.stringify(sources)}`;
 const result=await structured(prompt,narrativeSchema,path.join(dir,'operator-revision-candidate'),new AbortController().signal);
 console.log({candidatePrepared:true,characters:result.fullText.length,caption:result.caption});
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
