import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import {
  uiState,
  project,
  updateProject,
  enqueue,
  db,
  saveProfile,
  events,
  event,
  DATA,
} from "@/lib/store";
import { profileSchema, normalizePlan } from "@/lib/model";
import { health } from "@/lib/provider";
import {projectLanguage} from "@/lib/quality-contract";
import {createFromRequest} from "@/lib/create-request";
import {approveProject} from "@/lib/approval";
import {digest,readJSON} from "@/lib/quality";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { sameOrigin } from "@/lib/http";
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("health"))
    return NextResponse.json(await health());
  const id = req.nextUrl.searchParams.get("events");
  if (id) return NextResponse.json(events(id));
  return NextResponse.json(uiState());
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Разрешены только запросы из локальной студии." },
      { status: 403 },
    );
  try {
    if (Number(req.headers.get("content-length") || 0) > 1_000_000)
      throw new Error("Запрос слишком большой.");
    const b = await req.json();
    let id = b.id;
    if (b.action === "create") {
      id = await createFromRequest(b);
    } else if (b.action === "profile") {
      saveProfile(profileSchema.parse(b.profile));
    } else if (b.action === "analyze") {
      enqueue(null, "style");
    } else if (
      b.action === "archiveReference" ||
      b.action === "restoreReference"
    ) {
      if (
        typeof id !== "string" ||
        !db().prepare("SELECT id FROM refs WHERE id=?").get(id)
      )
        throw new Error("Материал не найден.");
      db()
        .prepare("UPDATE refs SET archived=? WHERE id=?")
        .run(b.action === "archiveReference" ? 1 : 0, id);
    } else {
      if (typeof id !== "string" || !project(id))
        throw new Error("Проект не найден.");
      const p = project(id)!;
      const active = db()
        .prepare(
          "SELECT id FROM jobs WHERE project_id=? AND status IN ('queued','running')",
        )
        .get(id);
      if (b.action === "save") {
        if (active)
          throw new Error("Дождитесь завершения задачи перед правкой.");
        const narrationBudget=await fs.readFile(path.join(DATA,"projects",id,"duration-budget.json"),"utf8").then(raw=>z.number().int().min(p.duration).max(180).parse(JSON.parse(raw).seconds)).catch(e=>{if(e.code==="ENOENT")return p.duration;throw e;});
        const plan = normalizePlan(b.plan, p.duration, p.voice, narrationBudget, projectLanguage(p.profile));
        if(p.profile.renderMode === "three" && JSON.stringify(plan.scenes)!==JSON.stringify(p.plan?.scenes)){delete plan.world3d;plan.filmKind="three";}
        if(p.plan?.filmKind==="netcode"&&JSON.stringify(plan.scenes)!==JSON.stringify(p.plan.scenes)){delete plan.netcode;plan.filmKind="netcode";}
        if(p.plan?.filmKind==="isometric"&&JSON.stringify(plan.scenes)!==JSON.stringify(p.plan.scenes)){delete plan.isometric;plan.filmKind="isometric";}
        updateProject(id, {
          plan,
          title: plan.title,
          status: p.video ? "revision" : "draft",
          stage: "Сценарий изменён",
          review: null,
        });
        await fs.mkdir(path.join(DATA, "projects", id), { recursive: true });
        await fs.writeFile(
          path.join(DATA, "projects", id, "storyboard.json"),
          JSON.stringify(plan, null, 2),
        );
        event(id, "Сценарий сохранён. Для обновления видео запустите рендер.");
      } else if (b.action === "reviewOnly") {
        if(active||!p.plan||!p.video||p.imported||p.status==="revision")throw new Error("Нужен завершённый актуальный рендер. Изменённый сценарий сначала перерендерите.");
        const saved=await readJSON(path.join(DATA,"projects",id,"render-input.json"));
        if(saved&&saved.inputHash!==digest({plan:p.plan,profile:p.profile,format:p.format}))throw new Error("Видео относится к другой версии сценария.");
        enqueue(id,"review-only");event(id,"Запрошена повторная проверка готового MP4 без озвучки и рендера.");
      } else if (b.action === "retry") {
        if (active) throw new Error("Задача уже выполняется.");
        if (p.imported)
          throw new Error(
            "Архивный ролик доступен для просмотра и скачивания. Создайте новый проект для рендера.",
          );
        enqueue(id);
        updateProject(id, {
          status: "queued",
          stage: "В очереди",
          progress: 0,
          error: null,
        });
      } else if (b.action === "cancel") {
        updateProject(id, { status: "cancelled", stage: "Остановлено" });
        db()
          .prepare(
            "UPDATE jobs SET status='cancelled',finished=? WHERE project_id=? AND status='queued'",
          )
          .run(new Date().toISOString(), id);
        event(
          id,
          "Остановка запрошена. Текущий этап завершится перед остановкой.",
        );
      } else if (b.action === "approve") {
        await approveProject(id,{feedback:typeof b.feedback==="string"?b.feedback:null});
      } else if (b.action === "revise") {
        if (active) throw new Error("Дождитесь завершения задачи.");
        const feedback = z.string().trim().min(3).max(2000).parse(b.feedback);
        updateProject(id, {
          status: "revision",
          stage: "На доработке",
          feedback,
        });
        event(id, `На доработке: ${feedback}`);
      } else throw new Error("Неизвестное действие.");
    }
    return NextResponse.json({ ok: true, id, ...uiState() });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Проверьте длину текста и обязательные поля."
            : e instanceof Error
              ? e.message
              : "Не удалось выполнить действие.",
      },
      { status: 400 },
    );
  }
}
