import { NextRequest } from "next/server";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const parts = (await ctx.params).path;
    if (
      parts.some(
        (p) => p === ".." || p === "." || p.includes("/") || p.includes("\\"),
      )
    )
      return new Response("Not found", { status: 404 });
    const rel = parts.join("/");
    if (
      !/^(archive\/|data\/(projects|references|templates|authors)\/)/.test(rel) ||
      !/\.(mp4|png|jpg|jpeg|webp|wav|json|md|zip|glb|gltf)$/i.test(rel)
    )
      return new Response("Not found", { status: 404 });
    const root = await fsp.realpath(process.cwd());
    const file = await fsp.realpath(path.join(root, ...parts));
    if (!file.startsWith(root + path.sep))
      return new Response("Not found", { status: 404 });
    const stat = await fsp.stat(file);
    if (!stat.isFile()) return new Response("Not found", { status: 404 });
    const ext = path.extname(file).toLowerCase();
    const mime: Record<string, string> = {
      ".mp4": "video/mp4",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".wav": "audio/wav",
      ".json": "application/json",
      ".md": "text/plain; charset=utf-8",
      ".zip": "application/zip",
      ".glb":"model/gltf-binary",
      ".gltf":"model/gltf+json",
    };
    const headers: Record<string, string> = {
      "Content-Type": mime[ext] || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
    };
    const range = req.headers.get("range");
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${stat.size}` },
        });
      if (match[1]) {
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), end) : end;
      } else {
        start = Math.max(0, stat.size - Number(match[2]));
      }
      if (start > end || start >= stat.size || !Number.isFinite(start))
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${stat.size}` },
        });
      headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
      status = 206;
    }
    headers["Content-Length"] = String(end - start + 1);
    if (req.nextUrl.searchParams.has("download"))
      headers["Content-Disposition"] =
        `attachment; filename="${path.basename(file).replace(/[^a-zA-Z0-9._-]/g, "_")}"`;
    return new Response(
      Readable.toWeb(
        fs.createReadStream(file, { start, end }),
      ) as ReadableStream,
      { status, headers },
    );
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
