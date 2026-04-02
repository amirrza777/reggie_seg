import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/features/moduleJoin/**/*.test.ts"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage-modulejoin",
      reportOnFailure: true,
      include: ["src/features/moduleJoin/**/*.ts"],
      exclude: ["src/features/moduleJoin/**/*.test.ts"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
