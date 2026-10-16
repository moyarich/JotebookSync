import * as path from "node:path";
import * as vscode from "vscode";

import {
  EXTENSION_NAMESPACE,
  EXTENSION_VIEWS,
  TREE_ITEM_CONTEXT,
} from "../constants.js";
import { ExtensionConfig } from "../ExtensionConfig/index.js";
import type { JupytextPairingService } from "../jupytext/JupytextPairingService.js";
import type { PairInfo, PairedFormat } from "../jupytext/types.js";

const REFRESH_DEBOUNCE_MS = 500;
const MAX_CANDIDATE_FILES = 500;
const PREVIEW_BYTE_LIMIT = 32_768;

const FILE_EXCLUDE_GLOB =
  "**/{.git,.hg,.svn,node_modules,.venv,venv,dist,out,out-*,__pycache__}/**";

const DEFAULT_EXTENSIONS = [
  "ipynb",
  "md",
  "py",
  "qmd",
  "Rmd",
  "r",
  "jl",
  "cpp",
  "c",
  "sh",
] as const;

/**
 * Root TreeView node representing one Jupytext pair.
 */
type PairGroup = {
  readonly kind: "pair";

  /**
   * Stable identifier derived from all file paths belonging to this pair.
   */
  readonly id: string;

  /**
   * Human-readable name shown for the pair.
   */
  readonly label: string;

  /**
   * Primary URI representing the pair.
   *
   * The notebook URI is preferred when an `.ipynb` file exists.
   */
  readonly uri: vscode.Uri;

  /**
   * Files participating in this Jupytext pair.
   */
  readonly files: PairFile[];
};

/**
 * Leaf TreeView node representing one file in a Jupytext pair.
 */
type PairFile = {
  readonly kind: "file";

  /**
   * URI of the paired file.
   */
  readonly uri: vscode.Uri;

  /**
   * Jupytext format associated with the file.
   */
  readonly format: PairedFormat;
};

/**
 * Node displayed in the paired-files TreeView.
 *
 * Root nodes are {@link PairGroup} objects. Their children are
 * {@link PairFile} objects.
 */
export type PairedFilesTreeNode = PairGroup | PairFile;

export const PAIRED_FILES_TREE_VIEW_ID = EXTENSION_VIEWS.pairedFiles;

/**
 * Returns whether a URI represents a Jupyter notebook.
 */
function isNotebook(uri: vscode.Uri): boolean {
  return path.extname(uri.fsPath).toLowerCase() === ".ipynb";
}

/**
 * Normalizes a configured file extension.
 *
 * Leading periods and surrounding whitespace are removed.
 *
 * @example
 * normalizeExtension(".py"); // "py"
 *
 * @example
 * normalizeExtension(" md "); // "md"
 */
function normalizeExtension(extension: string): string {
  return extension.trim().replace(/^\./, "");
}

/**
 * Determines whether an extension is safe to use inside a VS Code brace glob.
 */
function isValidExtension(extension: string): boolean {
  return /^[a-z0-9]+$/i.test(extension);
}

/**
 * Builds the format label displayed beside an individual paired file.
 *
 * Examples:
 *
 * - `py`
 * - `py:percent`
 * - `md:myst`
 */
function getFormatLabel(format: PairedFormat, uri: vscode.Uri): string {
  const extension = normalizeExtension(
    format.extension ?? path.extname(uri.fsPath),
  );

  const formatName = format.format_name?.trim();

  return formatName ? `${extension}:${formatName}` : extension;
}

/**
 * Determines the label used for a Jupytext pair.
 *
 * The notebook filename is preferred when the pair contains an `.ipynb`
 * file. Otherwise, the first known paired file is used.
 */
function getPairLabel(paths: PairInfo["paths"]): string {
  const preferredPath =
    paths.find(([filePath]) =>
      filePath.toLowerCase().endsWith(".ipynb"),
    )?.[0] ?? paths[0]?.[0];

  if (!preferredPath) {
    return "Paired files";
  }

  return path.basename(preferredPath, path.extname(preferredPath));
}

/**
 * Creates a deterministic identifier for a Jupytext pair.
 *
 * Each member of the same pair should report the same set of paired paths.
 * Sorting and normalizing those paths therefore produces a stable key that
 * can be used to deduplicate pairings discovered from multiple files.
 */
function getPairId(paths: PairInfo["paths"]): string {
  return paths
    .map(([filePath]) => path.resolve(filePath))
    .sort()
    .join("\u0000");
}

/**
 * Performs a lightweight check for Jupytext metadata.
 *
 * This avoids invoking Jupytext for every candidate file in the workspace.
 * Only the beginning of the file is inspected because Jupytext metadata is
 * normally located near the top of text notebooks.
 */
function mayContainJupytextMetadata(contents: Uint8Array): boolean {
  const preview = new TextDecoder().decode(
    contents.slice(0, PREVIEW_BYTE_LIMIT),
  );

  return /\bjupytext\b|\bformats\s*:/i.test(preview);
}

/**
 * Returns the preferred URI representing a Jupytext pair.
 *
 * A Jupyter notebook is preferred when available. Otherwise, the first paired
 * file is used.
 */
function getPrimaryPairUri(files: readonly PairFile[]): vscode.Uri {
  return files.find(({ uri }) => isNotebook(uri))?.uri ?? files[0].uri;
}

/**
 * Converts Jupytext pair paths into TreeView file nodes.
 *
 * Notebook files are shown first, followed by the remaining files sorted by
 * filename.
 */
function createPairFiles(paths: PairInfo["paths"]): PairFile[] {
  return paths
    .map(
      ([filePath, format]): PairFile => ({
        kind: "file",
        uri: vscode.Uri.file(filePath),
        format,
      }),
    )
    .sort((left, right) => {
      const leftIsNotebook = isNotebook(left.uri);
      const rightIsNotebook = isNotebook(right.uri);

      if (leftIsNotebook !== rightIsNotebook) {
        return leftIsNotebook ? -1 : 1;
      }

      return path
        .basename(left.uri.fsPath)
        .localeCompare(path.basename(right.uri.fsPath));
    });
}

/**
 * Removes configured pair destinations that do not currently exist.
 *
 * Jupytext reports the paths implied by a pairing configuration, including
 * destinations that have not been generated yet or were deleted afterward.
 * Those paths are useful to Jupytext, but they are not files that the Explorer
 * tree can open and must not be presented as existing pair members.
 */
export async function getExistingPairPaths(
  paths: PairInfo["paths"],
): Promise<PairInfo["paths"]> {
  const uniquePaths = new Set<string>();
  const existing = await Promise.all(
    paths.map(async ([filePath, format]) => {
      const resolvedPath = path.resolve(filePath);
      if (uniquePaths.has(resolvedPath)) {
        return undefined;
      }
      uniquePaths.add(resolvedPath);

      try {
        const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
        return (stat.type & vscode.FileType.File) !== 0
          ? ([filePath, format] as PairInfo["paths"][number])
          : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  return existing.filter(
    (entry): entry is PairInfo["paths"][number] => entry !== undefined,
  );
}

/**
 * Combines pair reports that share at least one file.
 *
 * Different members can contain metadata written at different times, so
 * Jupytext may report a subset of the pair from one file and a superset from
 * another. Overlap, rather than an identical member list, identifies those as
 * one connected pair. Merging is transitive: A-B and B-C become A-B-C.
 */
export function mergeOverlappingPairPaths(
  pathGroups: readonly PairInfo["paths"][],
): PairInfo["paths"][] {
  const merged: PairInfo["paths"][] = [];

  for (const pathGroup of pathGroups) {
    let combined = [...pathGroup] as PairInfo["paths"];
    const overlappingIndexes: number[] = [];
    const combinedPaths = new Set(
      combined.map(([filePath]) => path.resolve(filePath)),
    );

    for (let index = 0; index < merged.length; index += 1) {
      if (
        merged[index].some(([filePath]) =>
          combinedPaths.has(path.resolve(filePath)),
        )
      ) {
        overlappingIndexes.push(index);
        for (const [filePath] of merged[index]) {
          combinedPaths.add(path.resolve(filePath));
        }
      }
    }

    for (const index of overlappingIndexes.reverse()) {
      combined = [...combined, ...merged[index]];
      merged.splice(index, 1);
    }

    const unique = new Map<string, PairInfo["paths"][number]>();
    for (const entry of combined) {
      unique.set(path.resolve(entry[0]), entry);
    }
    merged.push([...unique.values()]);
  }

  return merged;
}

/**
 * Provides the JotebookSync paired-files TreeView.
 *
 * The provider owns workspace-wide discovery because that discovery exists
 * specifically to populate this view. Jupytext-specific inspection of an
 * individual candidate file is delegated to {@link JupytextPairingService}.
 *
 * Root nodes represent Jupytext pairings. Each root contains the files that
 * participate in that pair.
 *
 * The provider caches the current discovery operation and invalidates it when
 * workspace files or relevant extension configuration change.
 */
export class PairedFilesTreeProvider
  implements vscode.TreeDataProvider<PairedFilesTreeNode>, vscode.Disposable
{
  private readonly changeEmitter = new vscode.EventEmitter<
    PairedFilesTreeNode | undefined
  >();

  private readonly subscriptions: vscode.Disposable;

  private refreshTimer: ReturnType<typeof setTimeout> | undefined;

  /** Whether the Explorer view is currently visible to the user. */
  private visible = false;

  /**
   * Cached root discovery operation.
   *
   * Storing the promise rather than only the resolved result also coalesces
   * concurrent calls to `getChildren()` into one workspace scan.
   */
  private rootNodesPromise: Promise<PairGroup[]> | undefined;

  /**
   * Fired when VS Code should refresh this TreeView.
   */
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  /**
   * Creates the paired-files TreeView provider.
   *
   * @param jupytext Service used to inspect Jupytext pairing information.
   * @param settings Typed JotebookSync configuration.
   */
  public constructor(
    private readonly jupytext: JupytextPairingService,
    private readonly settings: ExtensionConfig,
  ) {
    this.subscriptions = vscode.Disposable.from(
      vscode.workspace.onDidSaveTextDocument(() => this.scheduleRefresh()),
      vscode.workspace.onDidSaveNotebookDocument(() => this.scheduleRefresh()),
      vscode.workspace.onDidCreateFiles(() => this.scheduleRefresh()),
      vscode.workspace.onDidDeleteFiles(() => this.scheduleRefresh()),
      vscode.workspace.onDidRenameFiles(() => this.scheduleRefresh()),

      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(EXTENSION_NAMESPACE)) {
          this.scheduleRefresh();
        }
      }),
    );
  }

  /**
   * Invalidates cached pair discovery and requests a complete TreeView refresh.
   */
  public refresh(forceNotification = false): void {
    this.rootNodesPromise = undefined;
    if (this.visible || forceNotification) {
      this.changeEmitter.fire(undefined);
    }
  }

  /**
   * Tracks Explorer visibility so background file activity does not ask VS
   * Code to render a tree the user cannot see. Revealing the view emits one
   * refresh using the latest invalidated state.
   */
  public setVisible(visible: boolean): void {
    const becameVisible = visible && !this.visible;
    this.visible = visible;

    if (becameVisible) {
      this.rootNodesPromise = undefined;
      this.changeEmitter.fire(undefined);
    }
  }

  /**
   * Releases timers, event subscriptions, and VS Code resources owned by this
   * provider.
   */
  public dispose(): void {
    if (this.refreshTimer !== undefined) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    this.subscriptions.dispose();
    this.changeEmitter.dispose();
  }

  /**
   * Returns the VS Code presentation model for a TreeView node.
   *
   * @param node Node being rendered.
   * @returns Corresponding VS Code {@link vscode.TreeItem}.
   */
  public getTreeItem(node: PairedFilesTreeNode): vscode.TreeItem {
    return node.kind === "pair"
      ? this.createPairTreeItem(node)
      : this.createFileTreeItem(node);
  }

  /**
   * Returns children for the requested TreeView node.
   *
   * Pair nodes return their files. File nodes are leaves. Calling this method
   * without a node performs or reuses workspace pair discovery.
   *
   * @param node Optional parent node.
   * @returns Tree nodes beneath the requested node.
   */
  public async getChildren(
    node?: PairedFilesTreeNode,
  ): Promise<PairedFilesTreeNode[]> {
    if (node?.kind === "pair") {
      return node.files;
    }

    if (node?.kind === "file") {
      return [];
    }

    if (!vscode.workspace.workspaceFolders?.length) {
      return [];
    }

    const discovery = (this.rootNodesPromise ??= this.loadPairGroups());

    try {
      return await discovery;
    } finally {
      // Coalesce concurrent requests, but do not retain resolved data. This
      // lets VS Code's built-in Tree View refresh action request a fresh scan.
      if (this.rootNodesPromise === discovery) {
        this.rootNodesPromise = undefined;
      }
    }
  }

  /**
   * Schedules a debounced TreeView refresh.
   *
   * A single logical workspace operation can emit several VS Code file events.
   * Debouncing prevents those events from repeatedly scanning the workspace.
   */
  private scheduleRefresh(): void {
    if (!this.visible) {
      this.rootNodesPromise = undefined;
      return;
    }

    if (this.refreshTimer !== undefined) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      this.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }

  /**
   * Creates the TreeItem displayed for one complete Jupytext pair.
   */
  private createPairTreeItem(node: PairGroup): vscode.TreeItem {
    const item = new vscode.TreeItem(
      node.label,
      vscode.TreeItemCollapsibleState.Expanded,
    );

    item.id = node.id;
    item.contextValue = TREE_ITEM_CONTEXT.pairGroup;
    item.iconPath = new vscode.ThemeIcon("link");

    item.description =
      node.files.length === 1 ? "1 file" : `${node.files.length} files`;

    item.tooltip = new vscode.MarkdownString(
      [
        `**${node.label}**`,
        "",
        ...node.files.map(
          ({ uri }) => `- \`${vscode.workspace.asRelativePath(uri, false)}\``,
        ),
      ].join("\n"),
    );

    return item;
  }

  /**
   * Creates the TreeItem displayed for one file in a Jupytext pair.
   */
  private createFileTreeItem(node: PairFile): vscode.TreeItem {
    const item = new vscode.TreeItem(
      path.basename(node.uri.fsPath),
      vscode.TreeItemCollapsibleState.None,
    );

    item.contextValue = TREE_ITEM_CONTEXT.pairFile;

    item.description = getFormatLabel(node.format, node.uri);
    item.tooltip = node.uri.fsPath;

    item.iconPath = new vscode.ThemeIcon(
      isNotebook(node.uri) ? "notebook" : "file-code",
    );

    item.command = {
      command: "vscode.open",
      title: "Open paired file",
      arguments: [node.uri],
    };

    return item;
  }

  /**
   * Discovers all unique Jupytext pair groups in the current workspace.
   *
   * Candidate files are determined from the extension's default formats plus
   * user-configured supported text extensions.
   */
  private async loadPairGroups(): Promise<PairGroup[]> {
    const candidates = await vscode.workspace.findFiles(
      this.getCandidateGlob(),
      FILE_EXCLUDE_GLOB,
      MAX_CANDIDATE_FILES,
    );

    const discoveredPaths: PairInfo["paths"][] = [];

    for (const candidate of candidates) {
      const paths = await this.tryGetExistingPairPaths(candidate);

      if (paths) {
        discoveredPaths.push(paths);
      }
    }

    return mergeOverlappingPairPaths(discoveredPaths)
      .map((paths) => this.createPairGroup(paths))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  /**
   * Attempts to resolve a candidate workspace file into a TreeView pair group.
   *
   * Non-Jupytext files and files that cannot be inspected are expected during
   * workspace discovery and therefore return `undefined` instead of surfacing
   * an error.
   *
   * @param candidate Candidate workspace file.
   * @returns Pair group when the candidate belongs to a valid pair.
   */
  private async tryGetExistingPairPaths(
    candidate: vscode.Uri,
  ): Promise<PairInfo["paths"] | undefined> {
    try {
      const contents = await vscode.workspace.fs.readFile(candidate);

      if (!mayContainJupytextMetadata(contents)) {
        return undefined;
      }

      const pairInfo = await this.jupytext.getPairInfo(candidate);

      if (!pairInfo.isPaired) {
        return undefined;
      }

      const existingPaths = await getExistingPairPaths(pairInfo.paths);

      // A single existing file is only a configured future pairing, not an
      // existing pair that belongs in this view.
      if (existingPaths.length < 2) {
        return undefined;
      }

      return existingPaths;
    } catch {
      // Workspace discovery intentionally ignores files that are not valid
      // Jupytext candidates or cannot be inspected.
      return undefined;
    }
  }

  /** Creates the display node after overlapping reports have been merged. */
  private createPairGroup(paths: PairInfo["paths"]): PairGroup {
    const files = createPairFiles(paths);

    return {
      kind: "pair",
      id: getPairId(paths),
      label: getPairLabel(paths),
      uri: getPrimaryPairUri(files),
      files,
    };
  }

  /**
   * Builds the workspace glob used to find potential Jupytext files.
   *
   * Default Jupytext extensions are combined with the user's configured
   * extension overrides. Values are normalized and deduplicated before being
   * inserted into the brace glob.
   */
  private getCandidateGlob(): string {
    const extensions = [
      ...new Set(
        [
          ...DEFAULT_EXTENSIONS,
          ...this.settings.supportedTextExtensionsOverride,
        ]
          .map(normalizeExtension)
          .filter(isValidExtension),
      ),
    ];

    return `**/*.{${extensions.join(",")}}`;
  }
}
