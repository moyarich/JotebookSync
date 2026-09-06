#!/usr/bin/env bash

set -euo pipefail

project_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
environment_file="${project_directory}/.env"

if [[ -f "${environment_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${environment_file}"
  set +a
fi

if [[ -z "${VSCE_PAT:-}" ]]; then
  printf '%s\n' \
    "Missing a VS Code Marketplace publishing token." \
    "Copy .env.example to .env and set VSCE_PAT."
  exit 1
fi

cd "${project_directory}"

printf '%s\n' "Generating README GIFs from validated demo recordings..."
npm run demo:gif -- --no-record

printf '%s\n' "Running release checks..."
npm test

printf '%s\n' "Verifying the extension package..."
npm run package:ls

node ./scripts/confirm-publish.mjs

printf '%s\n' "Publishing JotebookSync to the VS Code Marketplace..."
npx @vscode/vsce publish --no-rewrite-relative-links "$@"
