import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const [action, ...args] = process.argv.slice(2);
const env = { ...process.env, APP_BUILD_TARGET: "desktop" };

function run(commandArgs) {
  const result = spawnSync("yarn", commandArgs, {
    stdio: "inherit",
    env,
    shell: platform() === "win32",
  });
  if (result.error) {
    console.error(`[tauri-desktop] ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (action === "dev") {
  run(["tauri", "dev", "--config", "src-tauri/tauri.dev.conf.json", ...args]);
} else if (action === "before-build") {
  run(["build:harness"]);
  run(["vite:build"]);
} else {
  console.error("usage: node scripts/tauri-desktop.mjs <dev|before-build>");
  process.exit(1);
}
