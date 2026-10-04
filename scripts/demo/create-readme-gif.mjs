import { spawn } from "node:child_process";
import { access, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(path.dirname(currentDirectory));
const demoDirectory = path.join(projectDirectory, "scripts", "demo", "artifacts");
const readmeMediaDirectory = path.join(projectDirectory, "media");
const smokeDemo = path.join(currentDirectory, "extension.smoke.mjs");

function positiveNumber({ value, fallback, minimum }) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
}

const fps = positiveNumber({
  value: process.env.JOTEBOOKSYNC_GIF_FPS,
  fallback: 12,
  minimum: 1,
});
const width = positiveNumber({
  value: process.env.JOTEBOOKSYNC_GIF_WIDTH,
  fallback: 960,
  minimum: 320,
});
const trimStart = positiveNumber({
  value: process.env.JOTEBOOKSYNC_GIF_TRIM_START,
  fallback: 1,
  minimum: 0,
});
const selectedScenario = process.argv
  .find((argument) => argument.startsWith("--scenario="))
  ?.slice("--scenario=".length);

function run({ command, args }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectDirectory,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

await mkdir(demoDirectory, { recursive: true });
await mkdir(readmeMediaDirectory, { recursive: true });

if (!process.argv.includes("--no-record") && (await exists(smokeDemo))) {
  const recorderArguments = process.argv
    .slice(2)
    .filter((argument) => argument !== "--no-record");
  await run({
    command: process.execPath,
    args: [smokeDemo, "--demo", ...recorderArguments],
  });
}

const filter = [
  `trim=start=${trimStart}`,
  "setpts=PTS-STARTPTS",
  `fps=${fps}`,
  `scale='min(${width},iw)':-2:flags=lanczos`,
  "split[a][b]",
  "[a]palettegen=max_colors=256:reserve_transparent=0:stats_mode=full[p]",
  "[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
].join(",");

const entries = await readdir(demoDirectory, { withFileTypes: true });
const requestedScenarios =
  selectedScenario && selectedScenario !== "all"
    ? new Set(selectedScenario.split(",").map((name) => name.trim()))
    : undefined;
const scenarios = entries.filter(
  (entry) =>
    entry.isDirectory() &&
    (!requestedScenarios || requestedScenarios.has(entry.name)),
);

if (scenarios.length === 0) {
  throw new Error(`No demo scenarios were found in ${demoDirectory}.`);
}

for (const scenario of scenarios) {
  const source = path.join(
    demoDirectory,
    scenario.name,
    `${scenario.name}.webm`,
  );
  if (!(await exists(source))) {
    continue;
  }

  const destination = path.join(
    readmeMediaDirectory,
    `${scenario.name}.gif`,
  );
  await run({
    command: "ffmpeg",
    args: [
      "-y",
      "-i",
      source,
      "-filter_complex",
      filter,
      "-gifflags",
      "+transdiff",
      "-loop",
      "0",
      destination,
    ],
  });
  console.log(`README GIF created: ${destination}`);
}
