export const EXTENSION_NAMESPACE = "jotebooksync";
export const EXTENSION = {
  defaultNotebookEditorViewType: "jupyter-notebook",
  defaultPythonPath: "python",
} as const;

export const CONFIG = {
  pythonPath: "pythonPath",
  autoSyncOnSave: "autoSyncOnSave",
  confirmDestructiveActions: "confirmDestructiveActions",
  supportedTextExtensions: "supportedTextExtensions",
  notebookEditorViewType: "notebookEditorViewType",
  syncArgs: "syncArgs",
  setFormatsArgs: "setFormatsArgs",
} as const;

export const EXTENSION_COMMANDS = {
  setupPairing: `${EXTENSION_NAMESPACE}.setupPairing`,
  openPairedNotebook: `${EXTENSION_NAMESPACE}.openPairedNotebook`,
  createNotebookFromText: `${EXTENSION_NAMESPACE}.createNotebookFromText`,
  updateNotebookFromText: `${EXTENSION_NAMESPACE}.updateNotebookFromText`,
  createProjectConfig: `${EXTENSION_NAMESPACE}.createProjectConfig`,
  applyProjectConfig: `${EXTENSION_NAMESPACE}.applyProjectConfig`,
  syncPairedFilesFromNewestPair: `${EXTENSION_NAMESPACE}.syncPairedFilesFromNewestPair`,
  syncPairedFilesFromCurrentFile: `${EXTENSION_NAMESPACE}.syncPairedFilesFromCurrentFile`,
  removePairing: `${EXTENSION_NAMESPACE}.removePairing`,
  showOptions: `${EXTENSION_NAMESPACE}.showOptions`,
  refreshOptions: `${EXTENSION_NAMESPACE}.refreshOptions`,
  outputPairedFiles: `${EXTENSION_NAMESPACE}.outputPairedFiles`,
  checkSourceIsNewer: `${EXTENSION_NAMESPACE}.checkSourceIsNewer`,
  convert: `${EXTENSION_NAMESPACE}.convert`,
  formatWithBlack: `${EXTENSION_NAMESPACE}.formatWithBlack`,
  testRoundtrip: `${EXTENSION_NAMESPACE}.testRoundtrip`,
  testStrictRoundtrip: `${EXTENSION_NAMESPACE}.testStrictRoundtrip`,
  pipe: `${EXTENSION_NAMESPACE}.pipe`,
  check: `${EXTENSION_NAMESPACE}.check`,
  setKernel: `${EXTENSION_NAMESPACE}.setKernel`,
  execute: `${EXTENSION_NAMESPACE}.execute`,
  updateMetadata: `${EXTENSION_NAMESPACE}.updateMetadata`,
  setFormatOptions: `${EXTENSION_NAMESPACE}.setFormatOptions`,
  runPreCommit: `${EXTENSION_NAMESPACE}.runPreCommit`,
  runAdvanced: `${EXTENSION_NAMESPACE}.runAdvanced`,
} as const;

export const EXTENSION_CONTEXT = {
  activeFileIsPaired: `${EXTENSION_NAMESPACE}.activeFileIsPaired`,
  pairedResourcePaths: `${EXTENSION_NAMESPACE}.pairedResourcePaths`,
} as const;
