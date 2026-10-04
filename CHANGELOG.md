# Changelog

All notable user-facing changes to JotebookSync are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
JotebookSync uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

No user-facing changes yet.

## [0.1.0] - 2026-09-08

### Added

- Pair Jupyter notebooks with readable Jupytext representations such as Python,
  Markdown, MyST, Quarto, R Markdown, Julia, and other formats supported by the
  active Jupytext installation.
- Guided **Configure Paired Files…** workflow with format suggestions, custom
  Jupytext format codes, existing-pair editing, filename previews, and suffix
  validation.
- Automatic synchronization on save for both notebook and text members of a
  pair.
- Explicit synchronization commands to either:
  - overwrite the rest of a pair from the currently selected file; or
  - synchronize the pair from its newest member.
- **Review Pair Freshness…** with timestamps, per-file status, normalized
  Jupytext diffs, refresh support, and targeted replace/sync actions.
- **JotebookSync: Paired Files** Explorer view for discovering and managing
  pairs across the current workspace.
- Explorer and notebook-toolbar actions for pairing, synchronization, freshness
  review, opening the paired notebook, removing one representation, and removing
  pairing metadata.
- **Convert File to Another Format…** for creating a one-off Jupytext
  representation without changing pairing metadata.
- **Create Notebook from Text File…** for creating an independent `.ipynb`
  notebook from a supported text notebook.
- **Update Existing Notebook from Text File…** for updating notebook inputs and
  metadata while preserving saved cell outputs.
- Project-wide pairing configuration through `jupytext.toml`, including guided
  configuration creation and applying project formats to existing notebooks.
- Dynamic format discovery from the selected Python/Jupytext environment, plus
  optional `jotebooksync.supportedTextExtensions` overrides.
- Python environment resolution using the configured executable or the active
  Microsoft Python extension environment.
- Dependency-aware guidance for Jupytext, Black, Marimo, Quarto, and
  `jupyter_client`.
- Advanced Jupytext commands for:
  - Black formatting;
  - round-trip and strict round-trip checks;
  - external `--pipe` and `--check` workflows;
  - kernel selection and notebook execution;
  - metadata and format-option updates;
  - pre-commit workflows; and
  - arbitrary advanced Jupytext argument lists.
- Settings for auto-sync, destructive-action confirmation, Python executable,
  notebook editor type, supported text extensions, sync arguments, and
  set-format arguments.

### Changed

- Pair and conversion choices are based on capabilities reported by the active
  Jupytext environment instead of a fixed language list.
- Destructive operations such as overwriting paired content, replacing
  notebooks, removing pairing metadata, and replacing project configuration
  require confirmation by default.
- Paired-file discovery avoids continuously rescanning the workspace and
  excludes common generated or dependency directories.
- Pairing setup reuses existing paired filenames unless the user explicitly
  changes a suffix.

### Fixed

- Updating an existing notebook from a text representation preserves notebook
  outputs instead of replacing them.
- Pair management keeps remaining representations paired when a single file is
  detached.
- Format normalization handles paired format variants consistently, including
  custom suffixes and format names.
- Marketplace publishing uses the correct VS Code extension publishing command.

### Quality

- Added extension-host integration coverage for pairing lifecycle,
  synchronization, project configuration, conversion, format discovery,
  output-preserving notebook updates, menus, and command registration.
- Added webview tests for pair setup, conversion, freshness filtering/sorting,
  refresh behavior, file actions, validation, and error handling.
- Added validated demo scenarios and generated GIFs for the primary extension
  workflows.

[Unreleased]: https://github.com/moyarich/JotebookSync/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/moyarich/JotebookSync/releases/tag/v0.1.0
