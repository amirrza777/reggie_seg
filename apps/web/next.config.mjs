import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow both localhost and 127.0.0.1 during dev to avoid cross-origin _next warnings
  allowedDevOrigins: [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ],
  // Silence workspace-root inference warning when multiple lockfiles exist
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
};

export default nextConfig;
