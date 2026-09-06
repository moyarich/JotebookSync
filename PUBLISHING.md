# Publishing JotebookSync

This guide is for extension maintainers.

1. Copy `.env.example` to `.env`.
2. Add the VS Code Marketplace personal access token as `VSCE_PAT`.
3. Confirm that the version and changelog are ready.
4. Run:

```sh
npm run publish:extension
```

The script records every demo and regenerates the README GIFs first, runs the
complete test suite, verifies the packaged extension contents, and publishes
through `@vscode/vsce`. An Inquirer confirmation defaults to **No** and must
be accepted before the Marketplace publish command runs.

Arguments after `--` are forwarded to the publisher:

```sh
npm run publish:extension -- --patch
```
