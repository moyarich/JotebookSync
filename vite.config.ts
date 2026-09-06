import { exactRegex } from "@rolldown/pluginutils";
import colors from "colors/safe";
import { createWriteStream, readFileSync } from "node:fs";
import { cp, mkdir, rm, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive, type Archiver, type ZipOptions } from "archiver";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";

const ZIP_VIRTUAL_ENTRY_ID = "virtual:extension-zip-entry";
const RESOLVED_ZIP_VIRTUAL_ENTRY_ID = `\0${ZIP_VIRTUAL_ENTRY_ID}`;

type PackageJson = {
  name?: string;
  displayName?: string;
  version?: string;
};

type ExtensionZipPluginOptions = {
  packageJsonPath?: string;
  include?: string[];

  /**
   * Folder where the zip should be saved.
   * Used only when zipPath is not provided.
   *
   * Optional.
   * If omitted, defaults to:
   *
   * zip/<package-name>-<package-version>.zip
   */
  saveZipDir?: string;

  /**
   * Name of the zip file.
   * Used only when zipPath is not provided.
   */
  zipName?: string;

  /**
   * Exact final zip path.
   * If provided, this overrides saveZipDir and zipName.
   */
  zipPath?: string;

  /**
   * Temporary staging directory.
   * Defaults beside the final zip file.
   */
  stageDir?: string;

  /**
   * Root folder inside the zip.
   *
   * undefined/default: package name
   * false: no wrapping root folder
   * string: custom root folder name
   */
  archiveRootName?: string | false;

  emptyStageDir?: boolean;
  removeStageDirAfterZip?: boolean;
  compressionLevel?: number;
  zipOptions?: ZipOptions;
  skipMissing?: boolean;
  verbose?: boolean;
};

async function createZip(params: {
  sourceDir: string;
  outputZipPath: string;
  compressionLevel: number;
  zipOptions?: ZipOptions;
  viteConfig: ResolvedConfig;
}): Promise<void> {
  const { sourceDir, outputZipPath, compressionLevel, zipOptions, viteConfig } =
    params;

  await mkdir(dirname(outputZipPath), {
    recursive: true,
  });

  return new Promise<void>((resolvePromise, rejectPromise) => {
    const output = createWriteStream(outputZipPath);

    const archive: Archiver = new ZipArchive({
      zlib: {
        level: compressionLevel,
      },
      ...zipOptions,
    });

    output.on("close", resolvePromise);
    output.on("error", rejectPromise);

    archive.on("error", rejectPromise);

    archive.on("warning", (error) => {
      viteConfig.logger.warn(
        colors.yellow(`[extension-zip-plugin] ${error.message}`),
      );
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);

    archive.finalize().catch(rejectPromise);
  });
}

export function extensionZipPlugin(
  options: ExtensionZipPluginOptions = {},
): Plugin {
  let viteConfig: ResolvedConfig;

  let rootDir: string;
  let packageJson: PackageJson;
  let zipPath: string;
  let stageDir: string;
  let stageCopyRootDir: string;
  let temporaryBuildOutDir: string;

  return {
    name: "extension-zip-plugin",
    apply: "build",

    config(config, env) {
      if (env.mode !== "zip") {
        return;
      }

      const configuredOutDir = config.build?.outDir ?? "dist";

      temporaryBuildOutDir = resolve(
        configuredOutDir,
        ".vite-zip-build-moyarich",
      );

      return {
        build: {
          outDir: temporaryBuildOutDir,

          rolldownOptions: {
            input: ZIP_VIRTUAL_ENTRY_ID,

            plugins: [
              {
                name: "extension-zip-virtual-entry",

                resolveId: {
                  filter: {
                    id: exactRegex(ZIP_VIRTUAL_ENTRY_ID),
                  },
                  handler() {
                    return RESOLVED_ZIP_VIRTUAL_ENTRY_ID;
                  },
                },

                load: {
                  filter: {
                    id: exactRegex(RESOLVED_ZIP_VIRTUAL_ENTRY_ID),
                  },
                  handler() {
                    return {
                      code: "export default {};",
                      moduleType: "js",
                    };
                  },
                },
              },
            ],

            output: {
              entryFileNames: "zip-entry.js",
            },
          },
        },
      };
    },

    configResolved(config) {
      viteConfig = config;

      if (viteConfig.mode !== "zip") {
        return;
      }

      rootDir = resolve(viteConfig.root);

      temporaryBuildOutDir = isAbsolute(viteConfig.build.outDir)
        ? viteConfig.build.outDir
        : resolve(rootDir, viteConfig.build.outDir);

      const packageJsonPath = resolve(
        rootDir,
        options.packageJsonPath ?? "package.json",
      );

      packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf8"),
      ) as PackageJson;

      const zipName =
        options.zipName ??
        `${packageJson.name ?? "extension"}-${
          packageJson.version ?? "0.0.0"
        }.zip`;

      zipPath = options.zipPath
        ? resolve(rootDir, options.zipPath)
        : resolve(rootDir, options.saveZipDir ?? "zip", zipName);

      stageDir = options.stageDir
        ? resolve(rootDir, options.stageDir)
        : temporaryBuildOutDir;

      const archiveRootName =
        options.archiveRootName === undefined
          ? (packageJson.name ?? "extension")
          : options.archiveRootName;

      stageCopyRootDir =
        archiveRootName === false
          ? stageDir
          : resolve(stageDir, archiveRootName);
    },

    async writeBundle() {
      if (viteConfig.mode !== "zip") {
        return;
      }

      const include = options.include ?? [
        "out",
        "media",
        "package.json",
        "README.md",
        "CHANGELOG.md",
        "LICENSE",
        "LICENSE.md",
      ];

      const emptyStageDir = options.emptyStageDir ?? true;
      const removeStageDirAfterZip = options.removeStageDirAfterZip ?? true;
      const compressionLevel = options.compressionLevel ?? 9;
      const skipMissing = options.skipMissing ?? true;
      const verbose = options.verbose ?? false;

      try {
        if (emptyStageDir) {
          await rm(stageDir, {
            recursive: true,
            force: true,
          });
        }

        await rm(zipPath, {
          force: true,
        });

        await mkdir(stageCopyRootDir, {
          recursive: true,
        });

        for (const inputPath of include) {
          const source = isAbsolute(inputPath)
            ? inputPath
            : resolve(rootDir, inputPath);

          try {
            await stat(source);
          } catch {
            if (!skipMissing) {
              throw new Error(`Missing zip input path: ${source}`);
            }

            if (verbose) {
              viteConfig.logger.info(
                colors.gray(
                  `[extension-zip-plugin] skipped missing: ${source}`,
                ),
              );
            }

            continue;
          }

          const rootRelativePath = relative(rootDir, source);

          const isInsideRoot =
            Boolean(rootRelativePath) &&
            !rootRelativePath.startsWith("..") &&
            !isAbsolute(rootRelativePath);

          const stagedRelativePath = isInsideRoot
            ? rootRelativePath
            : basename(source);

          const destination = resolve(stageCopyRootDir, stagedRelativePath);

          await mkdir(dirname(destination), {
            recursive: true,
          });

          await cp(source, destination, {
            recursive: true,
            dereference: true,
            force: true,
          });

          if (verbose) {
            viteConfig.logger.info(
              colors.gray(
                `[extension-zip-plugin] copied ${source} -> ${destination}`,
              ),
            );
          }
        }

        await createZip({
          sourceDir: stageDir,
          outputZipPath: zipPath,
          compressionLevel,
          zipOptions: options.zipOptions,
          viteConfig,
        });

        viteConfig.logger.info(
          colors.green(
            `[extension-zip-plugin] created extension zip: ${zipPath}`,
          ),
        );
      } finally {
        if (removeStageDirAfterZip) {
          await rm(stageDir, {
            recursive: true,
            force: true,
          });
        }
      }
    },
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [
    extensionZipPlugin({
      include: [
        "out",
        "media",
        "package.json",
        "README.md",
        "CHANGELOG.md",
        "LICENSE",
        "LICENSE.md",
      ],
      saveZipDir: "zip",
      archiveRootName: undefined,
      compressionLevel: 9,
      skipMissing: true,
      verbose: true,
    }),
  ],

  build: {
    emptyOutDir: true,
    target: "es2022",
  },
});
