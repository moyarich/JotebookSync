# Changelog

All notable JotebookSync releases are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
JotebookSync uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

No user-facing changes yet.

## [0.1.1]

This update improves JotebookSync's reliability when you install and use it in VS Code.

### What's improved

- **More reliable startup:** The extension now includes the dependencies it needs to start after installation, so you can get to your notebook workflows without extra setup.
- **Working setup and review panels:** Fixed the production build for the in-editor panels used to configure paired files, review their freshness, and convert notebook formats.

### Getting started

Install or update **JotebookSync** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=moyarich.jotebooksync). You also need the Microsoft Python and Jupyter extensions, plus Python with Jupytext available in your selected environment. If Jupytext is missing, JotebookSync can guide you through installing it.

After updating, open the Command Palette and search for **JotebookSync**, or right-click a notebook and select **JotebookSync → Configure Paired Files…**.

For an overview of pairing, synchronization, freshness reviews, and conversions, see the [getting-started guide](https://github.com/moyarich/JotebookSync#readme).

## [0.1.0] - 2026-09-08

### Introducing JotebookSync

**Keep the flexibility of Jupyter notebooks with the readability of regular source files.**

JotebookSync brings Jupytext into VS Code so you can work with notebooks and text-based versions of the same content. Write and run notebook cells as usual, review cleaner changes in Git, and manage paired files without leaving the editor.

### What's included

- **Pair notebooks with readable files.** Connect an `.ipynb` notebook to Python, Markdown, MyST, R Markdown, Julia, Quarto, or other formats supported by your Jupytext installation. The guided setup helps you choose formats and preview filenames.
- **Stay synchronized.** Keep paired files up to date automatically when you save, or choose which version should overwrite the others using **Sync All from Newest Paired File…** and **Overwrite Paired Files from This File…**.
- **Review changes before replacing anything.** Use **Review Pair Freshness…** to identify newer and older files, compare normalized content in a VS Code diff, and decide what to update. Destructive actions ask for confirmation by default.
- **Preserve notebook outputs.** Update a notebook from a text file while retaining saved cell outputs, or create a new notebook from a text representation.
- **Convert files without creating a pair.** Make a one-time conversion between supported Jupytext formats.
- **Manage pairs in Explorer.** Use the **JotebookSync: Paired Files** view to open notebooks, review changes, synchronize, reconfigure, or remove pairings without deleting the underlying files.
- **Set up entire projects.** Create or apply a `jupytext.toml` configuration to manage notebook pairings across a workspace, including files stored in different folders.
- **Use advanced notebook tools.** Check round-trip conversions, format with Black, select kernels, execute notebooks, update metadata, and run other Jupytext commands from VS Code.

### Getting started

1. Install **JotebookSync** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=moyarich.jotebooksync).
2. Make sure the Microsoft Python and Jupyter extensions are installed and that Python and Jupytext are available in your selected environment. JotebookSync can guide you through installing missing Python packages.
3. Open a notebook in VS Code, right-click it in Explorer, and choose **JotebookSync → Configure Paired Files…**.
4. Select the formats you want and create your first pair.

Some formats and advanced commands require additional tools, such as Quarto, Marimo, Black, or Jupyter Client. JotebookSync provides guidance when these dependencies are missing.

Learn more in the [JotebookSync documentation](https://github.com/moyarich/JotebookSync#readme).

[Unreleased]: https://github.com/moyarich/JotebookSync/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/moyarich/JotebookSync/releases/tag/v0.1.0
