const { access } = require("node:fs/promises");

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function run() {
  const completionFile = process.env.JOTEBOOKSYNC_DEMO_COMPLETION_FILE;
  if (!completionFile) {
    throw new Error("JOTEBOOKSYNC_DEMO_COMPLETION_FILE is required.");
  }

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      await access(completionFile);
      return;
    } catch {
      await delay(250);
    }
  }

  throw new Error("Timed out waiting for the demo recorder to finish.");
}

module.exports = { run };
