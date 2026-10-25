import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["node:sqlite", "sharp"],
  devIndicators: false,
  // Local mutable workspace state and credentials must never enter deployment traces.
  outputFileTracingExcludes: {"/*":["./.env*","./data/**/*","./archive/**/*","./.runtime/**/*","./.agents/**/*","./.codex/**/*","./.aws/**/*"]},
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
};
export default config;
