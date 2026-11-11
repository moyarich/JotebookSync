const { access, readFile, rename, writeFile } = require("node:fs/promises");

const vscode = require("vscode");

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function run() {
  const completionFile = process.env.JOTEBOOKSYNC_DEMO_COMPLETION_FILE;
  if (!completionFile) {
    throw new Error("JOTEBOOKSYNC_DEMO_COMPLETION_FILE is required.");
  }

  const layoutFile = process.env.JOTEBOOKSYNC_DEMO_EDITOR_LAYOUT_FILE;
  let layoutApplied = false;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      await access(completionFile);
      return;
    } catch (error) {
      if (error.code !== "ENOENT") {throw error;}
    }

    if (layoutFile && !layoutApplied) {
      const request = await readFile(layoutFile, "utf8").catch((error) => {
        if (error.code !== "ENOENT") {throw error;}
      });
      if (request !== undefined) {
        let result = "";
        try {
          const files = JSON.parse(request);
          const columns = new Map(files.map((file, index) => [file, index + 1]));
          for (const [file, viewColumn] of columns) {
            await vscode.commands.executeCommand(
              "vscode.open", vscode.Uri.file(file), { viewColumn },
            );
          }
          for (const group of vscode.window.tabGroups.all) {
            const duplicates = group.tabs.filter((tab) => {
              const column = columns.get(tab.input?.uri?.fsPath);
              return column !== undefined && column !== group.viewColumn;
            });
            if (duplicates.length) {
              await vscode.window.tabGroups.close(duplicates, true);
            }
          }
        } catch (error) {
          result = String(error);
        }
        await writeFile(`${layoutFile}.tmp`, result, "utf8");
        await rename(`${layoutFile}.tmp`, `${layoutFile}.result`);
        layoutApplied = true;
      }
    }
    await delay(250);
  }

  throw new Error("Timed out waiting for the demo recorder to finish.");
}

module.exports = { run };
