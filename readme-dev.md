## Recording demos

The demo recorder runs every scenario when no scenario is specified:

```sh
npm run demo
```

Run one scenario by passing its name after `--`:

```sh
npm run demo -- --scenario=review-pair-freshness
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

To rebuild GIFs from existing `.webm` recordings without opening VS Code, use
`npm run demo:gif -- --no-record`.
