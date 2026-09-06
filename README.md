# JotebookSync

Keep Jupyter notebooks and readable text files in sync—without leaving VS Code.

**JotebookSync** is a visual companion for [Jupytext](https://jupytext.readthedocs.io/). Pair an `.ipynb` notebook with Python, Markdown, MyST, Quarto, R Markdown, Julia, or another Jupytext format. Edit whichever representation suits the task, then let the extension keep the pair together.

![Set up a Jupytext notebook pair with JotebookSync](media/setup-paired-files.gif)

## Why use JotebookSync?

Notebook JSON is excellent for execution and rich output, but awkward to review in source control. A paired text file gives you clean diffs, normal editor tools, and code that is easier to search, refactor, reuse, and share.

- Set up and update pairings through a guided interface.
- Sync paired files automatically whenever you save.
- See which paired file is newest before anything is overwritten.
- Compare equivalent text representations in VS Code's diff editor.
- Convert files without creating a permanent pair.
- Update an existing notebook while preserving its outputs.
- Use Python, Markdown, MyST, Quarto, R Markdown, Julia, and custom Jupytext formats.
- Execute notebooks, set kernels, update metadata, and configure format options.
- Run external `--pipe` and `--check` tools or Jupytext pre-commit workflows.
- Get guided dependency installation when Jupytext or an optional format tool is missing.

## Getting started

1. Open a notebook or supported text file in VS Code.
2. Right-click the file in Explorer and open **JotebookSync**.
3. Choose **Set Up or Update Paired Files…**.
4. Select the representations you want to keep together, then create the pair.

For example, pairing `analysis.ipynb` with `py:percent` creates `analysis.py`. The notebook retains rich outputs while the Python file provides a readable, version-control-friendly representation.

Pair-only actions appear after the extension has identified the file as part of a pair. The same actions are available from the Command Palette by searching for **JotebookSync**.

![Open the notebook associated with a paired text file](media/open-paired-notebook.gif)

## Main workflows

### Keep paired files synchronized

Automatic synchronization is enabled by default. When you save any member of a pair, Jupytext uses the most recently modified member as the source and updates the rest.

Before a manual overwrite, **Review Pair Freshness…** shows timestamps and lets you open files or compare normalized content. Use **Overwrite Paired Files from This File…** only when the selected file should explicitly win.

![Review the freshness of every file in a Jupytext pair](media/review-pair-freshness.gif)

![Synchronize all representations from the newest paired file](media/sync-newest-paired-file.gif)

![Explicitly overwrite paired files from the selected source](media/overwrite-from-current-file.gif)

### Use a text notebook without pairing

Choose **Create Notebook from Text File…** to make an independent `.ipynb` copy. This does not create a lasting Jupytext pair.

Choose **Update Existing Notebook from Text File…** when an `.ipynb` already exists. Inputs and metadata come from the text notebook while existing notebook outputs are preserved.

![Create an independent notebook from a Jupytext text notebook](media/create-notebook-from-text.gif)

![Update an existing notebook while preserving its outputs](media/update-existing-notebook.gif)

### Configure an entire project

Right-click a folder and choose **Create Project Pairing Configuration…** to create `jupytext.toml`. Choose **Apply to Notebooks** when prompted, or run **JotebookSync: Apply Project Pairing Configuration…** later, to create or synchronize paired files for every existing notebook under that folder. Future Jupytext operations automatically discover the configuration. Choose the folder-mapping option to keep notebooks and paired text files in separate project directories.

![Create a project-wide Jupytext pairing configuration](media/project-pairing-configuration.gif)

### Inspect or remove a pairing

Choose **Show Paired Files** to inspect every file in the current pair. Choose **Remove Pairing…** to stop synchronization without deleting any of the files.

![Inspect and remove a Jupytext pairing](media/inspect-and-remove-pairing.gif)

### Use another language or format

The setup screen includes common formats and an advanced section. Enter any format supported by your installed Jupytext version, such as `py:percent`, `jl:percent`, `Rmd`, or `md:myst`. Available choices are discovered from the active Python environment instead of being limited to a fixed built-in list.

![Convert a notebook to another Jupytext format](media/convert-file-format.gif)

## Requirements

- VS Code with the Microsoft Python and Jupyter extensions. They are installed as extension dependencies.
- Python and [Jupytext](https://jupytext.readthedocs.io/en/latest/install.html).

If Jupytext is unavailable, the extension offers to install it into the selected Python environment. Some formats need additional tools:

- Quarto files require the Quarto command-line tool.
- Marimo files require the `marimo` Python package.
- **Format with Black** requires the `black` Python package.

The extension asks before installing a Python package or opening installation instructions.

## Advanced Jupytext workflows

Search for **JotebookSync** in the Command Palette or use the Explorer submenu:

- **Pipe Through External Command…** exposes `--pipe` and optional `--pipe-fmt`.
- **Check with External Command…** exposes `--check` and optional `--pipe-fmt`.
- **Set Notebook Kernel…** accepts a kernelspec or `-` for the current environment.
- **Execute Notebook…** runs all cells and supports a custom working directory.
- **Update Notebook Metadata…** accepts the JSON object used by `--update-metadata`.
- **Set Format Options…** accepts one or more `--opt key=value` entries.
- **Run Pre-commit Workflow…** supports both `--pre-commit` modes and `--from`.
- **Run Advanced Jupytext Command…** accepts a JSON array of CLI arguments for
  options such as `--diff`, `--show-changes`, `--warn-only`, or
  `--use-source-timestamp`.

External commands and notebook execution can run arbitrary code. They use a
modal confirmation by default and follow `jotebooksync.confirmDestructiveActions`.

## Settings

| Setting                                  | Default            | Purpose                                                                                                                                           |
| ---------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jotebooksync.autoSyncOnSave`            | `true`             | Synchronize paired files when one is saved.                                                                                                       |
| `jotebooksync.confirmDestructiveActions` | `true`             | Ask before removing pairing metadata or replacing notebook, paired-file, or project configuration content. Disable to auto-confirm these actions. |
| `jotebooksync.pythonPath`                | `python`           | Python executable used to run Jupytext. The active Python interpreter is used as a fallback.                                                      |
| `jotebooksync.notebookEditorViewType`    | `jupyter-notebook` | VS Code editor used to open `.ipynb` files.                                                                                                       |
| `jotebooksync.supportedTextExtensions`   | `[]`               | Optional extension override. Empty means use formats reported by Jupytext.                                                                        |
| `jotebooksync.syncArgs`                  | `[]`               | Advanced arguments appended to Jupytext sync commands.                                                                                            |
| `jotebooksync.setFormatsArgs`            | `[]`               | Advanced arguments passed when changing pair formats.                                                                                             |

## Troubleshooting

### The expected format is missing

Run **JotebookSync: Refresh Available Formats** after changing Python environments or installing a format dependency.

### A save did not synchronize the pair

Confirm **Auto Sync On Save** is enabled and that the selected Python environment can run `python -m jupytext --version`.

### Jupytext reports that Quarto or Marimo is missing

Install the named tool, then retry the operation. The extension keeps the actionable part of the error visible and places detailed command output in VS Code when it is useful.

### I am unsure which file should win

Use **Review Pair Freshness…** before synchronizing. Do not force an overwrite until you have reviewed newer or equal-timestamp files.

## Privacy and scope

Pairing, conversion, comparison, and synchronization run locally through the selected Python environment. The extension does not upload notebook contents.

This project integrates with Jupytext but is not affiliated with or endorsed by the Jupytext project.

## License

[MIT](LICENSE)
