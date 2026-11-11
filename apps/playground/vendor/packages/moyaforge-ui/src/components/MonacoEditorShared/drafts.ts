/** Reconcile explicit host updates without discarding unchanged local drafts. */
export function reconcileFileDrafts(
  current: Readonly<Record<string, string>>,
  previousValues: ReadonlyMap<string, string>,
  files: readonly { name: string; value: string }[],
): Record<string, string> {
  return Object.fromEntries(
    files.map((file) => [
      file.name,
      previousValues.get(file.name) !== file.value || !(file.name in current)
        ? file.value
        : current[file.name],
    ]),
  );
}
