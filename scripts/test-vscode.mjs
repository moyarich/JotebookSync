import { spawnSync } from "node:child_process";

const needsVirtualDisplay = process.platform === "linux" && !process.env.DISPLAY;
const command = needsVirtualDisplay
  ? "xvfb-run"
  : process.platform === "win32"
    ? "vscode-test.cmd"
    : "vscode-test";
const args = needsVirtualDisplay ? ["-a", "vscode-test"] : [];

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("Unable to start VS Code extension tests:", result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
