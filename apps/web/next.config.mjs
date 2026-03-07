import path from "path";
import { fileURLToPath } from "url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const createConfig = (phase) => {
  const inferredDistDir =
    phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next";
  const distDir = process.env.NEXT_DIST_DIR?.trim() || inferredDistDir;

  return {
    distDir,
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    experimental: {
      // Work around intermittent React Client Manifest errors in Next DevTools segment explorer.
      devtoolSegmentExplorer: false,
    },
    // Allow both localhost and 127.0.0.1 during dev to avoid cross-origin _next warnings
    allowedDevOrigins: [
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "http://localhost",
      "http://127.0.0.1",
    ],
    // Keep tracing scoped to this app to avoid scanning unrelated large folders in the monorepo.
    outputFileTracingRoot: __dirname,
  };
};

export default createConfig;
