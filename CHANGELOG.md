# Changelog

All notable JotebookSync releases are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
JotebookSync uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

No user-facing changes yet.

## [0.1.0] - 2026-09-08

JotebookSync makes Jupyter notebooks easier to manage in real development workflows.

Built around Jupytext, it lets you pair notebooks with readable source files,
keep representations synchronized automatically, review differences before
overwriting files, preserve notebook outputs, and manage project-wide notebook
workflows without leaving VS Code.

The goal is simple: keep the flexibility of notebooks while making them easier
to review, version, share, and maintain alongside the rest of your codebase.

### Pairing and synchronization

- Pair Jupyter notebooks with readable Jupytext representations such as Python,
  Markdown, MyST, Quarto, R Markdown, Julia, and other formats supported by the
  active Jupytext installation.
- Configure pairs through a guided **Configure Paired Files…** workflow with
  discovered format suggestions, custom Jupytext format codes, filename
  previews, suffix validation, and existing-pair editing.
- Automatically synchronize notebook and text representations on save.
- Explicitly choose a source of truth with:
  - **Overwrite Paired Files from This File…**
  - **Sync All from Newest Paired File…**
- Open the notebook associated with a paired text file through
  **Open Paired Notebook**.
- Remove one representation without breaking the remaining pair, or remove the
  complete pairing without deleting files.

### Freshness and safe updates

- Review modification times and pair state through **Review Pair Freshness…**.
- Open normalized Jupytext diffs so unlike notebook representations can be
  compared as equivalent text rather than raw serialization.
- Replace a specific stale destination or synchronize the complete pair directly
  from the freshness review.
- Confirm destructive operations by default before replacing paired content,
  replacing notebooks, removing pairing metadata, or replacing project
  configuration.
- Update an existing notebook from a text representation while preserving saved
  cell outputs.

### Workspace and project workflows

- Manage discovered pairs from the **JotebookSync: Paired Files** Explorer view.
- Open paired notebooks, review freshness, synchronize, reconfigure, detach
  representations, and remove pairing directly from Explorer.
- Access JotebookSync actions from the Command Palette, Explorer context menu,
  notebook toolbar, and Paired Files Explorer view.
- Create project-wide pairing rules in `jupytext.toml`.
- Apply project configuration to existing notebooks, including folder mappings
  where notebook and text representations live in different directories.

### Conversion and notebook updates

- Convert a file to another Jupytext representation without changing pairing
  metadata.
- Create an independent `.ipynb` notebook from a supported text notebook.
- Update an existing notebook from text while preserving saved outputs.

### Format and environment support

- Discover formats from the selected Python/Jupytext environment instead of
  relying on a fixed language list.
- Show and refresh available formats after changing Python environments or
  installing new integrations.
- Override supported text extensions when needed with
  `jotebooksync.supportedTextExtensions`.
- Resolve the configured Python executable or fall back to the active Microsoft
  Python extension environment.
- Prompt to install required Python packages such as Jupytext, Black, Marimo,
  and `jupyter_client` into the selected environment when needed.
- Provide installation guidance for external tools such as Quarto.

### Advanced Jupytext tools

- Format notebook text with Black.
- Run round-trip and strict round-trip conversion checks.
- Pipe content through external commands or validate it with `--check`.
- Set notebook kernels and execute notebooks.
- Update notebook metadata and format options.
- Run pre-commit workflows.
- Run arbitrary advanced Jupytext argument lists from VS Code.
- Confirm commands that can execute notebook code or external programs before
  running them.

[Unreleased]: https://github.com/moyarich/JotebookSync/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/moyarich/JotebookSync/releases/tag/v0.1.0
