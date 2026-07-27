import { readdir, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const buildDirectory = dirname(fileURLToPath(import.meta.url));
const siteDirectory = dirname(buildDirectory);
const distributionDirectory = resolve(siteDirectory, "dist");
const clientDirectory = resolve(distributionDirectory, "client");
const buildOnlyEntries = [".assetsignore", ".vite", "_headers", "fonts"];

if (
  basename(distributionDirectory) !== "dist" ||
  dirname(distributionDirectory) !== siteDirectory ||
  basename(clientDirectory) !== "client" ||
  dirname(clientDirectory) !== distributionDirectory
) {
  throw new Error(
    `Refusing to finalize unexpected build path: ${clientDirectory}`,
  );
}

for (const name of buildOnlyEntries) {
  const entry = resolve(clientDirectory, name);
  if (basename(entry) !== name || dirname(entry) !== clientDirectory) {
    throw new Error(`Refusing to remove unexpected build entry: ${entry}`);
  }
  await rm(entry, { recursive: true, force: true });
}

const remainingEntries = await readdir(clientDirectory, {
  withFileTypes: true,
});
if (
  remainingEntries.length !== 1 ||
  remainingEntries[0].name !== "assets" ||
  !remainingEntries[0].isDirectory()
) {
  throw new Error(
    `Unexpected deployable client entries: ${remainingEntries
      .map((entry) => entry.name)
      .join(", ")}`,
  );
}

const assetFiles = await readdir(resolve(clientDirectory, "assets"));
if (
  !assetFiles.some((name) => name.endsWith(".css")) ||
  !assetFiles.some((name) => name.endsWith(".js"))
) {
  throw new Error("Expected generated CSS and JavaScript assets.");
}
