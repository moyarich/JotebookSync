# Publishing JotebookSync

JotebookSync uses separate **Release** and **Publish** GitHub Actions workflows,
following the release/publish split used in `moyarich/dev-toolkit`.

## One-time repository setup

1. Create a GitHub Actions environment named `release`.
2. Add any required reviewers or protection rules to that environment.
3. Add the VS Code Marketplace publishing token as the repository secret
   `VSCE_PAT`.

The `release` environment is used as the approval gate for non-dry-run release
and publish operations. Dry runs do not require approval.

## 1. Prepare the changelog

Before releasing a version, make sure `CHANGELOG.md` contains a matching
version heading:

```md
## [0.1.0] - 2026-09-08
```

The Release workflow extracts that section and uses it as the GitHub Release
body. A release fails if the matching changelog entry is missing or empty.

## 2. Dry-run the release

Open **Actions → Release → Run workflow**.

Recommended first-release settings:

- target branch: `main`
- version mode: `package-json`
- dry run: enabled

The dry run:

- resolves the release version;
- validates the matching changelog entry;
- installs dependencies;
- runs the full extension test suite;
- verifies packaged extension contents;
- creates a VSIX artifact;
- prints the release notes and release plan in the workflow summary; and
- does **not** create commits, tags, or GitHub Releases.

For later releases, `version-mode=bump` can update `package.json` and
`package-lock.json` using the selected semantic-version bump. An exact version
can also be supplied.

## 3. Create the release

Run **Actions → Release** again with the same version selection and disable
**dry run**.

After approval through the `release` environment, the workflow:

1. runs the release checks again;
2. creates a canonical release commit;
3. creates the `vX.Y.Z` Git tag;
4. pushes the release commit and tag; and
5. creates or updates the matching GitHub Release as a **draft**.

The GitHub Release intentionally remains a draft until Marketplace publishing
succeeds.

## 4. Dry-run publishing

Open **Actions → Publish → Run workflow** with **dry run** enabled.

The workflow verifies that:

- `package.json` resolves to the requested version;
- the matching `vX.Y.Z` Git tag exists;
- the matching GitHub draft release exists;
- the tagged source still passes the test/package checks; and
- the VSIX can be created successfully.

The validated VSIX is uploaded as a workflow artifact, but nothing is published.

## 5. Publish

Run **Actions → Publish** again with **dry run** disabled.

For a normal new release, use:

- marketplace mode: `publish`

After approval through the `release` environment, the workflow:

1. checks out the exact release tag;
2. reruns tests and package validation;
3. packages the VSIX;
4. publishes the VSIX to the VS Code Marketplace using `VSCE_PAT`; and
5. publishes the matching GitHub Release.

If Marketplace publishing fails, the GitHub Release remains a draft.

### Marketplace already published / GitHub release only

Use this for a version that is already live in the VS Code Marketplace but is
missing its matching published GitHub Release.

Run **Actions → Publish** with:

- the already-published version;
- marketplace mode: `already-published`;
- dry run: enabled first.

After the dry run succeeds, run it again with dry run disabled. The workflow
still verifies the version, release tag, draft GitHub Release, tests, package
contents, and VSIX, but skips `vsce publish` and publishes only the matching
GitHub Release.

For the existing JotebookSync `0.1.0` Marketplace release, use this mode after
the canonical `v0.1.0` tag and draft GitHub Release have been created.

## Local publishing

The existing local publishing helper remains available:

```sh
npm run publish:extension
```

For local publishing, copy `.env.example` to `.env` and set `VSCE_PAT`.
The script regenerates README GIFs from validated recordings, runs the test
suite, verifies packaged contents, asks for confirmation, and publishes through
`@vscode/vsce`.

Use the GitHub Actions workflows for normal releases so release identity, tags,
artifacts, approvals, and GitHub Release state remain consistent.
