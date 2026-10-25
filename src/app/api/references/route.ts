import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, DATA } from "@/lib/store";
import { sameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Запрос из другого источника запрещён." },
      { status: 403 },
    );
  try {
    if (Number(req.headers.get("content-length") || 0) > 17_000_000)
      throw new Error("Максимум 15 МБ на изображение.");
    const form = await req.formData();
    const file = form.get("file");
    let name = String(form.get("name") || "Транскрипт").slice(0, 160);
    let text = String(form.get("text") || "").trim();
    let rel: string | null = null;
    let kind = "transcript";
    const id = randomUUID();
    if (file instanceof File) {
      name = file.name.slice(0, 160);
      if (file.size > 15 * 1024 * 1024) throw new Error("Файл больше 15 МБ.");
      const buffer = Buffer.from(await file.arrayBuffer());
      if (/\.(txt|srt|vtt)$/i.test(file.name)) {
        text = buffer.toString("utf8");
        if (text.includes("\u0000"))
          throw new Error("Транскрипт должен быть текстовым файлом UTF-8.");
      } else {
        const meta = await sharp(buffer, {
          limitInputPixels: 35_000_000,
        }).metadata();
        if (!["jpeg", "png", "webp"].includes(meta.format || ""))
          throw new Error("Поддерживаются JPG, PNG, WebP, TXT, SRT и VTT.");
        kind = "image";
        await fs.mkdir(path.join(DATA, "references"), { recursive: true });
        rel = `data/references/${id}.jpg`;
        await sharp(buffer)
          .rotate()
          .resize({
            width: 2400,
            height: 2400,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 92 })
          .toFile(path.join(DATA, "references", `${id}.jpg`));
      }
    }
    if (kind === "transcript" && (text.length < 10 || text.length > 100_000))
      throw new Error("Транскрипт должен содержать от 10 до 100 000 символов.");
    db()
      .prepare(
        "INSERT INTO refs(id,name,kind,file,text,created) VALUES(?,?,?,?,?,?)",
      )
      .run(
        id,
        name,
        kind,
        rel,
        kind === "transcript" ? text : null,
        new Date().toISOString(),
      );
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Файл не удалось прочитать." },
      { status: 400 },
    );
  }
}
