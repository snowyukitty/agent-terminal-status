import { rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const buildDirectory = dirname(fileURLToPath(import.meta.url));
const siteDirectory = dirname(buildDirectory);
const generatedDirectories = ["dist", ".vinext"];

for (const name of generatedDirectories) {
  const directory = resolve(siteDirectory, name);

  if (basename(directory) !== name || dirname(directory) !== siteDirectory) {
    throw new Error(`Refusing to clean unexpected build path: ${directory}`);
  }

  await rm(directory, { recursive: true, force: true });
}
