# JotebookSync

**Make Jupyter notebooks as easy to review, edit, and version as ordinary source files.**

JotebookSync brings [Jupytext](https://jupytext.readthedocs.io/) workflows into VS Code. Pair a notebook with Python, Markdown, MyST, Quarto, R Markdown, Julia, or any format supported by your Jupytext installation. Work in the representation that fits the moment; JotebookSync keeps the files together.

![Choose notebook representations in the guided pair setup](media/setup-paired-files.gif)

## Why it matters

An `.ipynb` file is ideal for running cells and keeping rich output, but its JSON is difficult to review in pull requests and awkward to edit with normal development tools. A paired text notebook gives you both:

- rich notebook output for exploration and presentation;
- clean, meaningful diffs for code review;
- ordinary search, refactoring, formatting, and source-control tools;
- scripts and Markdown that are easier to reuse and share.

JotebookSync removes the command-line bookkeeping. Pairing, synchronization, safety checks, conversion, and project setup are available where you already work—in the editor and Explorer.

## Start in less than a minute

1. Open a notebook or supported text file.
2. Right-click it in Explorer and choose **JotebookSync**.
3. Select **Set Up or Update Paired Files…**.
4. Choose the file types you want and select **Create paired files**.

For example, pairing `analysis.ipynb` with `py:percent` creates `analysis.py`. Keep outputs in the notebook and review readable Python in Git.

Pair-specific commands only appear when the selected file belongs to a pair. Every action is also available from the Command Palette by searching for **JotebookSync**.

## Save once. Keep every representation current.

Automatic sync on save is enabled by default. Edit a paired notebook, script, or Markdown file and save it; Jupytext updates the other members of the pair.

Need to move deliberately instead? **Sync All from Newest Paired File…** follows timestamps, while **Overwrite Paired Files from This File…** makes the file you selected the explicit source of truth.

![Synchronize every representation from the newest paired file](media/sync-newest-paired-file.gif)

![Explicitly replace paired files from the selected source](media/overwrite-from-current-file.gif)

## Know what will change before you sync

**Review Pair Freshness…** explains which copy is newer, identifies files that need attention, and lets you inspect timestamps, open either file, or compare equivalent text in VS Code. You can review multiple cards without losing your place.

![Review and compare the files in a pair before overwriting anything](media/review-pair-freshness.gif)

For extra confidence, test whether a representation survives conversion to another format and back before adopting it in your workflow.

![Test a round-trip conversion from inside VS Code](media/test-round-trip-conversion.gif)

## Use the format that fits your team

Choose common formats in the setup page or enter any Jupytext format code, including `py:percent`, `jl:percent`, `Rmd`, and `md:myst`. JotebookSync discovers formats from the active Python environment, so it is not restricted to a hard-coded language list.

![See formats supported by the active Jupytext environment](media/show-available-formats.gif)

Need a one-time copy instead of an ongoing pair? **Convert File to Another Format…** creates the chosen representation without changing pairing metadata.

![Convert a notebook to another Jupytext format](media/convert-file-format.gif)

## Keep notebook output while updating code

Use **Create Notebook from Text File…** to make an independent `.ipynb`. Use **Update Existing Notebook from Text File…** to bring updated inputs and metadata into an existing notebook while preserving its saved outputs.

![Create an independent notebook from a text notebook](media/create-notebook-from-text.gif)

![Update notebook inputs while preserving existing outputs](media/update-existing-notebook.gif)

## Standardize an entire project

Right-click a folder and choose **Create Project Pairing Configuration…** to create `jupytext.toml`. Apply it immediately or run **Apply Project Pairing Configuration…** later to create or synchronize pairs for existing notebooks. Folder mappings can keep notebooks and text files in separate directories.

![Create and apply a project-wide Jupytext configuration](media/project-pairing-configuration.gif)

## Navigate and manage pairs

Open the `.ipynb` associated with a text notebook in one action. Use **Show Paired Files** to inspect the full group, or **Remove Pairing…** to stop synchronization without deleting your files.

![Open the notebook associated with a paired text file](media/open-paired-notebook.gif)

![Inspect a pair and remove its pairing metadata](media/inspect-and-remove-pairing.gif)

## More Jupytext tools, without leaving VS Code

JotebookSync also exposes advanced Jupytext workflows through guided prompts:

- format with Black;
- set a notebook kernel;
- execute all notebook cells;
- update notebook metadata and format options;
- pipe content through an external command or validate it with `--check`;
- run round-trip and strict round-trip tests;
- run pre-commit workflows;
- pass an advanced JSON argument list to the Jupytext CLI.

External commands and notebook execution can run arbitrary code, so JotebookSync asks for confirmation by default.

## Requirements

- VS Code. The Microsoft Python and Jupyter extensions are installed as extension dependencies.
- Python and [Jupytext](https://jupytext.readthedocs.io/en/latest/install.html).

If Jupytext is missing, JotebookSync offers to install it in the selected Python environment. It also gives targeted guidance when an optional tool is required:

- Quarto output requires the Quarto command-line tool.
- Marimo output requires the `marimo` Python package.
- **Format with Black** requires the `black` Python package.

The extension asks before installing a Python package or opening installation instructions.

## Settings

| Setting | Default | What it controls |
| --- | --- | --- |
| `jotebooksync.autoSyncOnSave` | `true` | Synchronize a pair whenever one member is saved. |
| `jotebooksync.confirmDestructiveActions` | `true` | Confirm before replacing content or removing pairing metadata. |
| `jotebooksync.pythonPath` | `python` | Python executable used for Jupytext; the active Python interpreter is a fallback. |
| `jotebooksync.notebookEditorViewType` | `jupyter-notebook` | VS Code editor used to open `.ipynb` files. |
| `jotebooksync.supportedTextExtensions` | `[]` | Optional extension override; empty uses formats reported by Jupytext. |
| `jotebooksync.syncArgs` | `[]` | Extra arguments appended to sync commands. |
| `jotebooksync.setFormatsArgs` | `[]` | Extra arguments used when changing pair formats. |

## Troubleshooting

**A format is missing:** Run **JotebookSync: Refresh Available Formats** after changing Python environments or installing a dependency.

**Save did not synchronize the pair:** Confirm that **Auto Sync On Save** is enabled and that the selected environment can run `python -m jupytext --version`.

**Quarto or Marimo is unavailable:** Follow the targeted installation action in the error message, then retry.

**You are unsure which file should win:** Open **Review Pair Freshness…** and compare the files before forcing an overwrite.

## Privacy

Pairing, conversion, comparison, and synchronization run locally through the selected Python environment. JotebookSync does not upload notebook contents.

This project integrates with Jupytext but is not affiliated with or currently endorsed by the Jupytext project.

## License

[MIT](LICENSE)
