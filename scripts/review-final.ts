import fs from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {project,updateProject,DATA,ROOT} from '../src/lib/store';
import {sceneClock} from '../src/lib/model';
import {askJSON,FFMPEG,run} from '../src/lib/provider';
async function main(){
 const id=process.argv[2],p=project(id)!;const dir=path.join(DATA,'projects',id);
 const out=path.join(ROOT,'video-design/qa',id,'final');await fs.mkdir(out,{recursive:true});
 const images:string[]=[];
 for(const [i,s] of sceneClock(p.plan!).entries()){
  const image=path.join(out,`scene-${i}.jpg`);
  await run(FFMPEG,['-y','-v','error','-ss',String(s.start+s.seconds*.82),'-i',path.join(dir,'video.mp4'),'-frames:v','1','-vf','scale=540:960','-q:v','2',image]);images.push(image);
 }
 const schema=z.object({verdict:z.enum(['pass','changes']),summary:z.string().max(600),findings:z.array(z.string().max(350)).max(5)});
 const result=schema.parse(await askJSON(`Проверь визуальный результат как редактор. Это повторный просмотр после увеличения подписей; прикреплены восемь отдельных кадров позднего состояния восьми сцен. Палитра и большие безопасные поля преднамеренны, это вертикальный Reel. Элементы схем появляются постепенно по меткам слов, поэтому не требуй финальную схему в первой секунде главы. Оцени только видимые коллизии, обрезания и явные смысловые ошибки; не требуй полного предложения в каждой короткой группе субтитров. Качество голоса и движение по кадрам не оценивай. Технические проверки времени и речи выполняются отдельно. Сценарий: ${JSON.stringify(p.plan)}.`,z.toJSONSchema(schema),path.join(out,'model'),images));
 const review={...p.review,initialAi:p.review?.ai,ai:result,finalFrameReviewAt:new Date().toISOString(),finalFrameReviewCoverage:'Восемь отдельных поздних кадров, 540×960. Полный просмотр секундных кадров и границ переходов выполнен отдельно.'};
 await fs.writeFile(path.join(dir,'review.json'),JSON.stringify(review,null,2));updateProject(id,{review});console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
