import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(backendRoot, "migrations");
const destination = join(backendRoot, "dist", "migrations");

await rm(destination, { recursive: true, force: true });
await mkdir(dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true });

// Native parser source must travel with the compiled adapter. It remains an
// inactive internal module until admission, cleanup and HTTP gates are proved.
await cp(join(backendRoot, "import-parser"), join(backendRoot, "dist", "import-parser"), {
  recursive: true, filter: path => !path.includes("__pycache__") && !path.endsWith(".pyc")
});
