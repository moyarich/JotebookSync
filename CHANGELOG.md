# Change Log

All notable changes to the "JotebookSync" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Added standalone text-notebook conversion without creating a pair.
- Added safe notebook updates that preserve existing cell outputs.
- Added project-wide pairing configuration through `jupytext.toml`.
- Added a command to apply project pairing configuration to existing notebooks.
- Split Jupytext process execution, dependency checks, embedded inspection scripts, format helpers, and shared contracts out of the pairing service.
- Enabled paired-file synchronization on save by default.
- Added a setting to auto-confirm destructive commands during normal extension use.
- Added extension-host integration tests for pairing, synchronization, removal,
  conversion, output-preserving updates, format discovery, and command registration.
- Updated format discovery for current Jupytext releases.
- Added guided commands for pipes, checks, kernels, execution, metadata,
  format options, pre-commit workflows, and arbitrary advanced CLI arguments.
- Added project folder mappings for richer `jupytext.toml` configurations.
- Added pairing setup, freshness review, custom formats, dependency prompts,
  conditional menus, and clearer Jupytext error reporting.
