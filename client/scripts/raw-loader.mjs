// Node ESM loader hooks that emulate Vite's `?raw` text imports, so the real
// client generator (which imports the dead-sequence .txt files via `?raw`) can
// run under Node in the backend equality test.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const RAW = "?raw";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(RAW)) {
    const resolved = await nextResolve(specifier.slice(0, -RAW.length), context);
    return { url: resolved.url + RAW, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(RAW)) {
    const source = await readFile(fileURLToPath(url.slice(0, -RAW.length)), "utf8");
    return {
      format: "module",
      source: `export default ${JSON.stringify(source)};`,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
