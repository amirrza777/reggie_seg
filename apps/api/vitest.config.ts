import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.*.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      reportOnFailure: true,
      exclude: ["scripts/**", "eslint.config.js", "vitest.config.ts"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      }
    },
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
