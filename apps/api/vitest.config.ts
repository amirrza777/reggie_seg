import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
    },
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
