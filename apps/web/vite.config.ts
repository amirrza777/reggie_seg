import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/test-utils/server-only.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    include: [
      "src/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
      "middleware.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/node_modules_broken*/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
    ],
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}", "middleware.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/node_modules/**",
        "**/node_modules_broken*/**",
        "**/.next/**",
        "**/coverage/**",
      ],
    },
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/test-utils/server-only.ts"),
    },
  },
});
