import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");

// Guard against intermittent coverage writer races that expect this temp directory.
mkdirSync(path.join(webRoot, "coverage", ".tmp"), { recursive: true });

const vitestBin = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(vitestBin, ["vitest", "run", "--coverage"], {
  cwd: webRoot,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to start coverage run:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
