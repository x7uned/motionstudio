import type { NextRequest } from "next/server";
export function sameOrigin(req: NextRequest) {
  const host = req.headers.get("host") || req.nextUrl.host;
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return false;
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      (url.port || "80") === (host.split(":")[1] || "80")
    );
  } catch {
    return false;
  }
}
