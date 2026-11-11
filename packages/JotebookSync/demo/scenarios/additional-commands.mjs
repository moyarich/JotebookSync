export default function createAdditionalScenarios({
  assertFileContains,
  assertFileExists,
  chooseVisibleQuickPickItem,
  confirmQuickInput,
  createAnalysisMarkdown,
  createPairedAnalysis,
  createPlainMarkdown,
  fillVisibleQuickInput,
  path,
  pause,
  readFile,
  runProcess,
  runVSCodeCommand,
  writeFile,
}) {
  async function createNotebook({ workspaceDirectory, config }) {
    const source = await createAnalysisMarkdown(workspaceDirectory);
    const notebook = path.join(workspaceDirectory, "analysis.ipynb");
    await runProcess(config.pythonPath, ["-m", "jupytext", "--to", "ipynb", "-o", notebook, source]);
    return notebook;
  }

  function fileContains(file, expectedText) {
    return ({ workspaceDirectory }) =>
      assertFileContains({ filePath: path.join(workspaceDirectory, file), expectedText });
  }

  async function verifyOutput({ page }) {
    await page.locator(".output-view").first().waitFor({ timeout: 15_000 });
  }

  const input = (value) => async ({ page }) => {
    await fillVisibleQuickInput({ page, value });
    await confirmQuickInput(page);
  };
  const pick = (name) => ({ page }) => chooseVisibleQuickPickItem({ page, name });

  const commands = {
    "apply-project-pairing-configuration": {
      command: "Apply Project Pairing Configuration",
      async prepareWorkspace(context) {
        const notebook = await createNotebook(context);
        await writeFile(path.join(context.workspaceDirectory, "jupytext.toml"), 'formats = "ipynb,py:percent"\n');
        return notebook;
      },
      verify: fileContains("analysis.py", "revenue"),
    },
    "remove-file-from-pair": {
      command: "Remove File from Pair",
      async prepareWorkspace({ workspaceDirectory, config }) {
        return (await createPairedAnalysis(workspaceDirectory, config.pythonPath)).pythonFile;
      },
      async verify({ workspaceDirectory }) {
        const script = path.join(workspaceDirectory, "analysis.py");
        await assertFileExists(script);
        if (/(?:^|\n)#\s+formats:/m.test(await readFile(script, "utf8"))) {
          throw new Error("The removed Python file still contains pairing metadata.");
        }
        await fileContains("analysis.ipynb", "ipynb,md:myst")({ workspaceDirectory });
      },
    },
    "refresh-paired-files": {
      command: "Refresh Paired Files",
      async prepareWorkspace({ workspaceDirectory, config }) {
        return (await createPairedAnalysis(workspaceDirectory, config.pythonPath)).markdownFile;
      },
      async beforeCommand({ page }) {
        const header = page.getByRole("heading", { name: "JotebookSync: Paired Files" });
        const row = page.getByRole("treeitem", { name: /analysis\.ipynb/ }).last();
        await header.waitFor({ timeout: 10_000 });
        if (!(await row.isVisible())) {
          await header.click();
        }
      },
      async verify({ page }) {
        await page.getByRole("treeitem", { name: /analysis\.ipynb/ }).last()
          .waitFor({ timeout: 15_000 });
      },
    },
    "format-with-black": {
      command: "Format with Black",
      modules: ["black"],
      async prepareWorkspace({ workspaceDirectory }) {
        const file = path.join(workspaceDirectory, "analysis.py");
        await writeFile(file, "# %%\nrevenue=[120,145,160,190]\n");
        return file;
      },
      verify: fileContains("analysis.py", "revenue = [120, 145, 160, 190]"),
    },
    "test-strict-round-trip-conversion": {
      command: "Test Strict Round-Trip Conversion",
      prepareWorkspace: ({ workspaceDirectory }) => createPlainMarkdown(workspaceDirectory),
      steps: [pick("Enter custom --to format..."), input("py:percent")],
      verify: verifyOutput,
    },
    "refresh-available-formats": {
      command: "Refresh Available Formats",
      prepareWorkspace: ({ workspaceDirectory }) => createAnalysisMarkdown(workspaceDirectory),
      verify: verifyOutput,
    },
    "set-format-options": {
      command: "Set Format Options",
      async prepareWorkspace({ workspaceDirectory }) {
        const file = path.join(workspaceDirectory, "analysis.py");
        await writeFile(file, "# %%\nrevenue = [120, 145, 160, 190]\n");
        return file;
      },
      steps: [input("comment_magics=false")],
      verify: fileContains("analysis.py", "comment_magics: false"),
    },
    "set-notebook-kernel": {
      command: "Set Notebook Kernel",
      modules: ["jupyter_client", "ipykernel"],
      steps: [input("python3")],
      verify: fileContains("analysis.ipynb", '"kernelspec"'),
    },
    "execute-notebook": {
      command: "Execute Notebook",
      modules: ["nbconvert", "ipykernel"],
      steps: [input("")],
      verify: fileContains("analysis.ipynb", '"615"'),
    },
    "update-notebook-metadata": {
      command: "Update Notebook Metadata",
      steps: [input('{"project":"Sales analysis"}')],
      verify: fileContains("analysis.ipynb", '"project": "Sales analysis"'),
    },
    "pipe-through-external-command": {
      command: "Pipe Through External Command",
      async prepareWorkspace(context) {
        await writeFile(path.join(context.workspaceDirectory, "transform.py"),
          'import sys\nprint(sys.stdin.read().replace("revenue", "sales"), end="")\n');
        return createNotebook(context);
      },
      steps: [
        ({ page, config }) => input(`${JSON.stringify(config.pythonPath)} transform.py`)({ page }),
        input("py:percent"),
        pick("Current file only"),
      ],
      verify: fileContains("analysis.ipynb", "sum(sales)"),
    },
    "check-with-external-command": {
      command: "Check with External Command",
      steps: [
        ({ page, config }) => input(`${JSON.stringify(config.pythonPath)} -m py_compile {}`)({ page }),
        input("py:percent"),
      ],
      verify: verifyOutput,
    },
    "run-pre-commit-workflow": {
      command: "Run Pre-commit Workflow",
      async prepareWorkspace(context) {
        const { notebookFile } = await createPairedAnalysis(
          context.workspaceDirectory, context.config.pythonPath,
        );
        const options = { cwd: context.workspaceDirectory };
        await runProcess("git", ["init", "--quiet"], options);
        await runProcess("git", ["add", "analysis.ipynb"], options);
        return notebookFile;
      },
      steps: [pick("All matching staged notebooks"), input("ipynb")],
      verify: verifyOutput,
    },
    "run-advanced-jupytext-command": {
      command: "Run Advanced Jupytext Command",
      steps: [input('["--to","py:percent","analysis.ipynb"]')],
      verify: fileContains("analysis.py", "revenue"),
    },
  };

  return Object.fromEntries(Object.entries(commands).map(([name, command]) => [
    name,
    {
      recordingFile: `${name}.webm`,
      modules: command.modules ?? [],
      prepareWorkspace: command.prepareWorkspace ?? createNotebook,
      async run(context) {
        await pause(1_500);
        await command.beforeCommand?.(context);
        await runVSCodeCommand(context.page, `JotebookSync: ${command.command}`);
        for (const step of command.steps ?? []) {
          await step(context);
        }
        await pause(4_000);
      },
      verify: command.verify,
    },
  ]));
}
