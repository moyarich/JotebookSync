## Recording demos

The demo tooling uses `@vscode/test-electron` and Playwright to run every
scenario in an isolated VS Code window and workspace. Recordings use **Default
Dark Modern** unless `JOTEBOOKSYNC_DEMO_THEME` selects another installed theme.

Prerequisites:

- the project dependencies installed with `npm install`;
- Python with Jupytext available;
- `ffmpeg` when generating README GIFs.

The demo recorder runs every scenario when no scenario is specified:

```sh
npm run demo
```

Run one scenario by passing its name after `--`:

```sh
npm run demo -- --scenario=review-pair-freshness
```

Multiple scenarios can be passed as a comma-separated selection:

```sh
npm run demo -- --scenario=setup-paired-files,convert-file-format
```

The freshness demo also has a convenience command:

```sh
npm run demo:freshness
```

Record all scenarios explicitly with `npm run demo:all`. To record demos and
regenerate the README GIFs, use:

```sh
npm run demo:gif
npm run demo:gif -- --scenario=review-pair-freshness
```

Available convenience scripts are:

```sh
npm run demo:freshness
npm run demo:round-trip
npm run demo:formats
```

To rebuild GIFs from existing `.webm` recordings without opening VS Code, use
`npm run demo:gif -- --no-record`.

GIF output can be adjusted with environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `JOTEBOOKSYNC_GIF_FPS` | `12` | Output GIF frame rate. |
| `JOTEBOOKSYNC_GIF_WIDTH` | `960` | Maximum output width. |
| `JOTEBOOKSYNC_GIF_TRIM_START` | `1` | Seconds removed from the start. |
| `JOTEBOOKSYNC_DEMO_THEME` | `Default Dark Modern` | VS Code theme used while recording. |

At the end of every recording run—including failed runs—the recorder prints a
colored summary containing:

- scenarios that completed and their `.webm` paths;
- the scenario that failed;
- scenarios that did not run.

The original failure is rethrown after the summary, so CI and shell scripts
still receive a nonzero exit status.
