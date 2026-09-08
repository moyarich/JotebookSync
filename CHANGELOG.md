# Change Log

All notable changes to the "JotebookSync" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.1.0] - 2026-09-08

### Added

- Added standalone text-notebook conversion without creating a pair.
- Added a VS Code-themed conversion webview with discovered and custom formats,
  destination previews, file selection, validation, and actionable errors.
- Added safe notebook updates that preserve existing cell outputs.
- Added project-wide pairing configuration through `jupytext.toml`.
- Added a command to apply project pairing configuration to existing notebooks.
- Enabled paired-file synchronization on save by default.
- Added a setting to auto-confirm destructive commands during normal extension use.
- Added an Explorer **Paired Files** tree with on-demand refresh and contextual
  open, configure, synchronize, freshness-review, detach-file, and remove-pair actions.
- Added individual-file removal that leaves the remaining representations paired.
- Added extension-host integration tests for pairing, synchronization, removal,
  conversion, output-preserving updates, format discovery, and command registration.

### Improved

- Updated format discovery for current Jupytext releases.
- Added guided commands for pipes, checks, kernels, execution, metadata,
  format options, pre-commit workflows, and arbitrary advanced CLI arguments.
- Added project folder mappings for richer `jupytext.toml` configurations.
- Added pairing setup, freshness review, custom formats, dependency prompts,
  conditional menus, and clearer Jupytext error reporting.
- Redesigned pairing and freshness webviews with VS Code theme colors,
  accessible controls, persistent card expansion, and clearer safety guidance.
- Made pairing setup reuse existing filenames unless the user explicitly changes
  a suffix, and clarified required leading periods and generated paths.
- Improved dependency guidance for Jupytext, Black, Quarto, Marimo, and notebook
  execution requirements.
