export const DEFAULT_MOYAFORGE_PATHS = Object.freeze({
  playground: "apps/playground",
  source: "apps/playground/src",
  docs: "docs",
  api: "api",
  output: "apps/playground/dist",
});

export type MoyaForgeMode = "docs" | "app" | "hybrid";

export interface MoyaForgeSiteConfig {
  title?: string;
  description?: string;
  base?: string;
  editLink?: { repository: string; branch?: string };
}

export interface MoyaForgeContentConfig {
  docs?: string;
  examples?: string;
  api?: string;
}

export interface MoyaForgeConfig {
  /** docs: turnkey documentation, app: opt-in primitives, hybrid: both. */
  mode?: MoyaForgeMode;
  site?: MoyaForgeSiteConfig;
  content?: MoyaForgeContentConfig;
  paths?: Partial<typeof DEFAULT_MOYAFORGE_PATHS>;
  [key: string]: unknown;
}

export function defineMoyaForgeConfig(config: MoyaForgeConfig = {}) {
  return {
    mode: config.mode ?? "hybrid",
    ...config,
    paths: {
      ...DEFAULT_MOYAFORGE_PATHS,
      ...(config.paths ?? {}),
    },
  };
}
