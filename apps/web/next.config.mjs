import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDevCommand = process.argv.includes("dev");
const usesTurbopack = process.argv.includes("--turbopack") || process.argv.includes("--turbo");
const devDistDir = usesTurbopack ? ".next-dev-turbo" : ".next-dev-webpack";

/** @type {import('next').NextConfig} */
const createConfig = () => {
  return {
    // Keep webpack/turbopack dev caches isolated to avoid stale manifest/file mismatches.
    ...(isDevCommand ? { distDir: devDistDir } : {}),
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    experimental: {
      // Work around intermittent React Client Manifest errors in Next DevTools segment explorer.
      devtoolSegmentExplorer: false,
    },
    // Next compares only hostnames here (not scheme/port), so keep these as hosts.
    allowedDevOrigins: [
      "127.0.0.1",
      "::1",
    ],
    // Keep tracing scoped to this app to avoid scanning unrelated large folders in the monorepo.
    outputFileTracingRoot: __dirname,
  };
};

export default createConfig;
