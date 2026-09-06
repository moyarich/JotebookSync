import { type Plugin, type ResolvedConfig } from "vite";
import {
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { dirname, isAbsolute, parse, relative, resolve } from "node:path";

/**
 * Options for {@link webviewAssetsPlugin}.
 */
export type WebviewAssetsPluginOptions = {
  /**
   * Directory containing VS Code webview folders, relative to Vite's project root.
   *
   * @defaultValue "src/webviews"
   */
  rootDir?: string;

  /**
   * Output directory for built webview files.
   *
   * If this is absolute or starts with "..", the plugin treats it as an external
   * output directory and copies the completed webview build there after bundling.
   *
   * @defaultValue "webviews"
   */
  outDir?: string;

  /**
   * Optional output directory outside Vite's build output directory.
   */
  externalOutDir?: string;

  /**
   * When using an external output directory, delete that directory before copying
   * the new webview build into it.
   *
   * @defaultValue false
   */
  emptyOutDir?: boolean;

  /**
   * When using an external output directory, keep the temporary webview output
   * folder inside Vite's build outDir.
   *
   * @defaultValue false
   */
  keepTemporaryOutDir?: boolean;

  /**
   * Enables plugin debug logs.
   *
   * @defaultValue process.env.DEBUG_WEBVIEW_PLUGIN === "true"
   */
  debug?: boolean;
};

type CssImportInfo = {
  file: string;
  specifier: string;
  isRaw: boolean;
};

const cyan = "\x1b[36m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";

const webviewInputPrefix = "__webviews__/";

/**
 * Converts supported Rolldown/Vite input shapes into an object so webview
 * entries can be merged without discarding normal Vite entries.
 */
function normalizeInput(input: unknown): Record<string, string> {
  if (!input) {
    return {};
  }

  if (typeof input === "string") {
    return { [parse(input).name]: input };
  }

  if (Array.isArray(input)) {
    return Object.fromEntries(input.map((file) => [parse(file).name, file]));
  }

  return input as Record<string, string>;
}

function stripQuery(specifier: string) {
  return specifier.split("?")[0];
}

function hasRawQuery(specifier: string) {
  const queryIndex = specifier.indexOf("?");

  if (queryIndex === -1) {
    return false;
  }

  const query = specifier.slice(queryIndex + 1);

  return query.split("&").some((part) => {
    return part === "raw" || part.startsWith("raw=");
  });
}

function isRelativeOrAbsoluteImport(specifier: string) {
  return (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    isAbsolute(specifier)
  );
}

/**
 * Finds CSS imports in TS/TSX files.
 *
 * Supports:
 *
 * ```ts
 * import "./style.css";
 * import styles from "./component.css?raw";
 * const styles = await import("./component.css?raw");
 * ```
 */
function getCssImports(importerFile: string): CssImportInfo[] {
  const source = readFileSync(importerFile, "utf8");
  const importerDir = dirname(importerFile);

  const specifiers = new Set<string>();

  const staticImportRegex =
    /import\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+\.css(?:\?[^"']*)?)["']/g;

  const dynamicImportRegex =
    /import\(\s*["']([^"']+\.css(?:\?[^"']*)?)["']\s*\)/g;

  for (const match of source.matchAll(staticImportRegex)) {
    specifiers.add(match[1]);
  }

  for (const match of source.matchAll(dynamicImportRegex)) {
    specifiers.add(match[1]);
  }

  return [...specifiers]
    .map((specifier) => {
      const cssPath = stripQuery(specifier);

      if (!cssPath.endsWith(".css")) {
        return undefined;
      }

      // Ignore package CSS imports. This plugin only routes local webview files.
      if (!isRelativeOrAbsoluteImport(cssPath)) {
        return undefined;
      }

      return {
        file: resolve(importerDir, cssPath),
        specifier,
        isRaw: hasRawQuery(specifier),
      };
    })
    .filter((item): item is CssImportInfo => Boolean(item));
}

function isInsideDir(parentDir: string, file: string) {
  const relativePath = relative(parentDir, file);

  return (
    relativePath.length > 0 &&
    !relativePath.startsWith("..") &&
    !isAbsolute(relativePath)
  );
}

/**
 * Adds VS Code webview build support to Vite/Rolldown.
 *
 * The plugin treats each webview folder as a self-contained output group:
 *
 * - `index.ts` is emitted as the webview's JavaScript entry.
 * - `styles.css` is emitted as the webview's stylesheet.
 * - `template.html` is emitted as a raw template asset so placeholders like
 *   `{{title}}`, `{{cssUri}}`, `{{jsUri}}`, and `{{setupData}}` remain untouched.
 */
export function webviewAssetsPlugin(
  options: WebviewAssetsPluginOptions = {},
): Plugin {
  let config: ResolvedConfig;
  let webviewsDir: string;

  const requestedOutDir = options.outDir ?? "webviews";

  const resolvedExternalOutDir =
    options.externalOutDir ??
    (isAbsolute(requestedOutDir) || requestedOutDir.startsWith("..")
      ? requestedOutDir
      : undefined);

  const publicWebviewOutDir = resolvedExternalOutDir
    ? "webviews"
    : requestedOutDir;

  const temporaryWebviewOutDir = resolvedExternalOutDir
    ? ".webview-assets"
    : publicWebviewOutDir;

  const webviewOutDir = temporaryWebviewOutDir;

  const debug = options.debug ?? process.env.DEBUG_WEBVIEW_PLUGIN === "true";

  function log(label: string, value?: unknown) {
    if (!debug) {
      return;
    }

    console.log(`${cyan}\n[webview-assets-plugin]${reset} ${label}`);

    if (value !== undefined) {
      console.dir(value, { colors: true, depth: null });
    }
  }

  function getOutputName(file: string) {
    const relativeFile = relative(webviewsDir, file);
    const parsedFile = parse(relativeFile);
    const parentDir = parsedFile.dir || parsedFile.name;

    return {
      parentDir,
      fileName: parsedFile.name,
      inputName: `${webviewInputPrefix}${parentDir}/${parsedFile.name}`,
      relativeFile,
    };
  }

  function isWebviewInputName(name: string) {
    return name.startsWith(webviewInputPrefix);
  }

  function toWebviewOutputName(name: string) {
    return name.replace(webviewInputPrefix, `${webviewOutDir}/`);
  }

  function resolveOriginalAssetFile(originalFileName: string) {
    if (!originalFileName) {
      return "";
    }

    return isAbsolute(originalFileName)
      ? originalFileName
      : resolve(config.root, originalFileName);
  }

  return {
    name: "webview-assets-plugin",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
      webviewsDir = resolve(config.root, options.rootDir ?? "src/webviews");

      log("resolved paths", {
        root: config.root,
        outDir: config.build.outDir,
        webviewsDir,
        publicWebviewOutDir,
        webviewOutDir,
        externalOutDir: resolvedExternalOutDir,
      });
    },

    // Add webview JS and non-raw CSS entrypoints to Rolldown's final input
    // without replacing Vite's normal app/page inputs.
    options(rolldownOptions) {
      if (config.command === "serve") {
        return rolldownOptions;
      }

      const webviewScriptFiles = globSync(`${webviewsDir}/**/index.ts`);
      const webviewSourceFiles = globSync(`${webviewsDir}/**/*.{ts,tsx}`);
      const webviewCssFiles = globSync(`${webviewsDir}/**/styles.css`);

      const cssImports = webviewSourceFiles.flatMap(getCssImports);

      const rawCssFiles = new Set(
        cssImports
          .filter((item) => item.isRaw)
          .map((item) => resolve(item.file)),
      );

      const webviewCssEntryFiles = webviewCssFiles.filter((file) => {
        const resolvedFile = resolve(file);

        // CSS imported with ?raw is intended to become a string in JS.
        // Do not emit/copy it as a standalone stylesheet.
        return !rawCssFiles.has(resolvedFile);
      });

      const webviewFiles = [
        ...new Set([...webviewScriptFiles, ...webviewCssEntryFiles]),
      ];

      const webviewInput = Object.fromEntries(
        webviewFiles.map((file) => {
          const { inputName } = getOutputName(file);
          return [inputName, file];
        }),
      );

      rolldownOptions.input = {
        ...normalizeInput(rolldownOptions.input),
        ...webviewInput,
      };

      log(
        "raw css imports excluded",
        [...rawCssFiles].map((file) => relative(webviewsDir, file)),
      );

      log(
        "webview files",
        webviewFiles.map((file) => relative(webviewsDir, file)),
      );

      log("final input", rolldownOptions.input);

      return rolldownOptions;
    },

    // Route only webview outputs. Non-webview outputs keep Vite/Rolldown's
    // existing behavior or the user's configured output naming.
    outputOptions(outputOptions) {
      if (config.command === "serve") {
        return outputOptions;
      }

      const originalEntryFileNames = outputOptions.entryFileNames;
      const originalAssetFileNames = outputOptions.assetFileNames;

      outputOptions.entryFileNames = (chunkInfo) => {
        if (isWebviewInputName(chunkInfo.name)) {
          return `${toWebviewOutputName(chunkInfo.name)}.js`;
        }

        if (typeof originalEntryFileNames === "function") {
          return originalEntryFileNames(chunkInfo);
        }

        return originalEntryFileNames ?? "assets/[name].js";
      };

      outputOptions.assetFileNames = (assetInfo) => {
        const assetName = assetInfo.name ?? "";
        const originalFileName = assetInfo.originalFileNames?.[0] ?? "";
        const originalFilePath = resolveOriginalAssetFile(originalFileName);

        // CSS webview entries may arrive here as assets instead of chunks.
        // Prefer the prefixed generated name, but fall back to originalFileNames
        // so independent CSS inputs still route beside their matching HTML file.
        const webviewAssetName = isWebviewInputName(assetName)
          ? assetName
          : originalFilePath &&
              isInsideDir(webviewsDir, originalFilePath) &&
              parse(originalFilePath).base === "styles.css"
            ? getOutputName(originalFilePath).inputName
            : "";

        if (webviewAssetName) {
          const parsedAsset = parse(toWebviewOutputName(webviewAssetName));
          const outputName = parsedAsset.dir
            ? `${parsedAsset.dir}/${parsedAsset.name}`
            : parsedAsset.name;

          return `${outputName}[extname]`;
        }

        if (typeof originalAssetFileNames === "function") {
          return originalAssetFileNames(assetInfo);
        }

        return originalAssetFileNames ?? "assets/[name][extname]";
      };

      log("output routing", {
        webviewEntryPattern: `${webviewOutDir}/**/*.js`,
        webviewAssetPattern: `${webviewOutDir}/**/*[extname]`,
      });

      return outputOptions;
    },

    // HTML files are VS Code webview templates, not Vite HTML entries.
    // Emit them as plain assets so placeholders like {{jsUri}} stay untouched.
    buildStart() {
      if (config.command === "serve") {
        return;
      }

      const htmlFiles = globSync(`${webviewsDir}/**/template.html`);

      for (const file of htmlFiles) {
        const { parentDir, fileName, relativeFile } = getOutputName(file);
        const emittedFileName = `${webviewOutDir}/${parentDir}/${fileName}.html`;

        this.emitFile({
          type: "asset",
          fileName: emittedFileName,
          source: readFileSync(file, "utf8"),
        });

        log("emitted html template", {
          source: `${dim}${relativeFile}${reset}`,
          output: emittedFileName,
        });
      }
    },

    // Rolldown can only emit bundled JS/CSS inside Vite's build output dir.
    // When externalOutDir is provided, copy the completed webview folder to the
    // requested external location after the bundle is written.
    writeBundle() {
      if (!resolvedExternalOutDir) {
        return;
      }

      const viteOutDir = resolve(config.root, config.build.outDir);
      const temporarySourceDir = resolve(viteOutDir, temporaryWebviewOutDir);

      const externalTargetDir = isAbsolute(resolvedExternalOutDir)
        ? resolvedExternalOutDir
        : resolve(config.root, resolvedExternalOutDir);

      if (!existsSync(temporarySourceDir)) {
        log("external copy skipped; temporary webview output was not found", {
          temporarySourceDir,
        });

        return;
      }

      if (options.emptyOutDir && existsSync(externalTargetDir)) {
        rmSync(externalTargetDir, { recursive: true, force: true });
      }

      mkdirSync(externalTargetDir, { recursive: true });
      cpSync(temporarySourceDir, externalTargetDir, { recursive: true });

      if (!options.keepTemporaryOutDir) {
        rmSync(temporarySourceDir, { recursive: true, force: true });
      }

      log("copied webview output", {
        from: temporarySourceDir,
        to: externalTargetDir,
        emptiedTargetFirst: options.emptyOutDir ?? false,
        keptTemporaryOutput: options.keepTemporaryOutDir ?? false,
      });
    },
  };
}
