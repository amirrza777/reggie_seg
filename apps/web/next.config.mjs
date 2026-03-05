import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
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

export default nextConfig;
