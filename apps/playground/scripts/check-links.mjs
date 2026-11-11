import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "vite";
import { checkContentLinks, formatLinkIssues } from "@moyarich/moyaforge-mdx";

const root = dirname(
  fileURLToPath(new URL("../registry.config.ts", import.meta.url)),
);
const server = await createServer({
  root,
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true },
});

let registry;
try {
  ({ default: registry } = await server.ssrLoadModule(
    resolve(root, "registry.config.ts"),
  ));
} finally {
  await server.close();
}

try {
  const issues = await checkContentLinks(registry, root);
  if (issues.length) {
    console.error(formatLinkIssues(issues));
    console.error(`Found ${issues.length} invalid internal content link(s).`);
    process.exitCode = 1;
  } else {
    console.log("All registered internal documentation links are valid.");
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
