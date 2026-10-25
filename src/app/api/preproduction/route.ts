import {projectLanguage} from "@/lib/quality-contract";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import {spokenText,digest,editorialInput,readJSON} from "@/lib/quality";
import { DATA, project,db,updateProject,event } from "@/lib/store";
import {saveManualNarrative} from "@/lib/narrative-edit";
import {sameOrigin} from "@/lib/http";
import {prepareScriptComparison,selectScriptComparison,publicComparison} from "@/lib/script-comparison";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id) || !project(id))
    return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
  const dir = path.join(DATA, "projects", id);
  const read = async (name: string) =>
    fs
      .readFile(path.join(dir, name), "utf8")
      .then(JSON.parse)
      .catch(() => null);
  const [research, sources, pipeline, script,narrative,editorial,facts,voice,quality,comparison,visual,assemblies,sceneBuilder,motion3d,motion2d] = await Promise.all([
    read("research.json"),
    read("sources.json"),
    read("pipeline.json"),
    read("script-package.json"),
    read("narrative.json"),read("editorial-audit.json"),read("fact-audit.json"),read("voice-plan.json"),read("quality-report.json"),
    read("script-comparison.json"),read("visual-concept.json"),read("assembly-plan.json"),read("scene-builder-claude/progress.json"),read("three-director/progress.json"),read("motion-2d-director/progress.json"),
  ]);
  return NextResponse.json(
    {
      research,
      sources: Array.isArray(sources)
        ? sources.map(({ id, title, url, retrievedAt }) => ({
            id,
            title,
            url,
            retrievedAt,
          }))
        : [],
      pipeline,
      audit: script?.audit ?? null,
      caption: script?.caption ?? null,
      narrative,editorial,facts,voice,quality,
      visual,assemblies,visualCurrent:!!visual&&visual.textHash===digest(project(id)?.plan?spokenText(project(id)!.plan!):"")&&visual.sourceHash===digest(sources)&&digest(visual.plan)===digest(project(id)?.plan?.visualConcept??null),
      assembliesCurrent:!!assemblies&&digest(assemblies.plan)===digest(project(id)?.plan?.assemblies??null),
      motionProviders:{sceneBuilder,motion3d,motion2d},
      narrativeEditable:project(id)?.profile.production?.version===2&&!!narrative,
      voiceCurrent:voice?.plainText===(project(id)?.plan?spokenText(project(id)!.plan!):narrative?.fullText),
      comparison:publicComparison(comparison,project(id)?.plan?spokenText(project(id)!.plan!):"",projectLanguage(project(id)?.profile)),
      comparisonAvailable:!!narrative&&!!project(id)?.plan,
      currentText:project(id)?.plan?spokenText(project(id)!.plan!):narrative?.fullText,
      editorialCurrent:editorial?.inputHash===digest(project(id)?.plan?spokenText(project(id)!.plan!):narrative?.fullText||""),
      factsCurrent:facts?.sourceHash===digest(sources||[])&&(project(id)?.plan?facts?.inputHash===digest(editorialInput(project(id)!.plan!)):!!narrative&&facts?.inputHash===digest({fullText:narrative.fullText,screenText:[narrative.title,narrative.summary,narrative.caption].join("\n")})),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:"Разрешены только запросы из локальной студии."},{status:403});
 try{
  if(Number(req.headers.get("content-length")||0)>40000)throw new Error("Запрос слишком большой.");
  const b=await req.json(),p=typeof b.id==="string"?project(b.id):null;if(!p)throw new Error("Проект не найден.");
  const dir=path.join(DATA,"projects",p.id);
  if(b.action==="saveNarrative"){
   if(db().prepare("SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')").get(p.id))throw new Error("Дождитесь завершения задачи перед правкой.");
   const budget=await readJSON(path.join(dir,"duration-budget.json"));if(budget&&(!Number.isInteger(budget.seconds)||budget.seconds<3||budget.seconds>180))throw new Error("Повреждён сохранённый предел длительности.");
   const next=await saveManualNarrative(p,dir,b.fullText);
   if(next){updateProject(p.id,{plan:null,review:null,duration:budget?.seconds??p.duration,status:"revision",stage:"Цельный рассказ изменён",error:null});event(p.id,"Авторская редакция сохранена. Предыдущая разметка и PCM-мастер архивированы; новый рассказ проверяется без перезаписи.");}
   return NextResponse.json({ok:true,narrative:next});
  }
  const comparison=b.action==="compare"?await prepareScriptComparison(p,dir):b.action==="selectComparison"?await selectScriptComparison(p,dir,b.selection):null;
  if(!comparison)throw new Error("Неизвестное действие.");
  return NextResponse.json({comparison});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Не удалось сохранить сравнение."},{status:400});}
}
