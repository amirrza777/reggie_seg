import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/prisma/**/*.test.ts"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage-seed",
      reportOnFailure: true,
      include: ["prisma/seed/**/*.ts", "src/prisma/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/prisma/**/*.test.ts",
        "src/prisma/**/__mocks__/**",
        "prisma/seed/types.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
