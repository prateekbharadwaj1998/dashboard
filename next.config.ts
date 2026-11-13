import type { NextConfig } from "next";

// Two deploy targets from one codebase:
//   • Node server (`next start`): ISR pages + live JSON API (route.server.ts files).
//   • Static export (STATIC_EXPORT=1): plain files for GitHub Pages, served under BASE_PATH.
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isStatic ? { output: "export", trailingSlash: true } : {}),
  basePath: basePath || undefined,
  // Request-time API routes only exist on a server.
  pageExtensions: isStatic ? ["tsx", "ts"] : ["tsx", "ts", "server.ts"],
  env: {
    NEXT_PUBLIC_STATIC: isStatic ? "1" : "",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
