import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} exited with code ${result.status ?? "unknown"}`,
    );
  }
}

let testEnvironment;
try {
  const env = { ...process.env };

  // The integration tests exercise real Jupytext commands. CI runners do not
  // have Jupytext installed by default, so create an isolated Python environment.
  if (process.env.CI) {
    testEnvironment = mkdtempSync(join(tmpdir(), "jotebooksync-python-"));
    const python = process.platform === "win32" ? "python" : "python3";
    run(python, ["-m", "venv", testEnvironment]);
    const testPython = join(
      testEnvironment,
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "python.exe" : "python",
    );
    run(testPython, [
      "-m",
      "pip",
      "install",
      "--disable-pip-version-check",
      "jupytext>=1.16,<2",
    ]);
    run(testPython, ["-m", "jupytext", "--version"]);

    // Pandoc Markdown conversion requires the Pandoc executable, not merely
    // Jupytext's Python package. Install it for Linux CI integration tests.
    if (process.platform === "linux") {
      const pandocCheck = spawnSync("pandoc", ["--version"], {
        stdio: "ignore",
      });
      if (pandocCheck.status !== 0) {
        run("sudo", ["apt-get", "update", "-qq"]);
        run("sudo", ["apt-get", "install", "-y", "--no-install-recommends", "pandoc"]);
      }
      run("pandoc", ["--version"]);
    }
    env.JOTEBOOKSYNC_TEST_PYTHON = testPython;
  }

  const needsVirtualDisplay = process.platform === "linux" && !env.DISPLAY;
  const command = needsVirtualDisplay
    ? "xvfb-run"
    : process.platform === "win32"
      ? "vscode-test.cmd"
      : "vscode-test";
  run(command, needsVirtualDisplay ? ["-a", "vscode-test"] : [], env);
} catch (error) {
  console.error("VS Code integration tests failed:", error.message);
  process.exitCode = 1;
} finally {
  if (testEnvironment) {
    rmSync(testEnvironment, { recursive: true, force: true });
  }
}
