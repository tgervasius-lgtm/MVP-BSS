import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

// These known large composition/service/route modules are frozen at the current
// post-Phase-0 baseline. New behavior should be extracted behind existing
// contracts instead of increasing these legacy modules further.
const frozenLegacyBudgets = new Map([
  ["app.js", 2_105],
  ["backend/src/http/routes/phase-a.ts", 614],
  ["backend/src/services/pg-mvp-service.ts", 1_419],
  ["backend/src/services/pg-phase-a-service.ts", 1_377]
]);

// Newer source modules should stay reviewable. The frozen legacy modules above
// are excluded from these generic limits and may only stay the same or shrink.
const sourceBudgets = [
  { directory: "backend/src", extension: ".ts", maximumLines: 600 },
  { directory: "src", extension: ".js", maximumLines: 400 }
];

function countLines(content) {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\n$/, "");
  return normalized.length === 0 ? 0 : normalized.split("\n").length;
}

async function sourceFiles(directory, extension) {
  const absoluteDirectory = join(repositoryRoot, directory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await sourceFiles(relative(repositoryRoot, absolutePath), extension));
    } else if (entry.isFile() && extname(entry.name) === extension) {
      files.push(absolutePath);
    }
  }

  return files;
}

const violations = [];
let checkedFiles = 0;

for (const [path, maximumLines] of frozenLegacyBudgets) {
  const content = await readFile(join(repositoryRoot, path), "utf8");
  const lines = countLines(content);
  checkedFiles += 1;
  if (lines > maximumLines) {
    violations.push(
      `${path}: ${lines} lines (frozen baseline ${maximumLines}; keep the module stable or make it smaller)`
    );
  }
}

for (const budget of sourceBudgets) {
  for (const absolutePath of await sourceFiles(budget.directory, budget.extension)) {
    const path = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
    if (frozenLegacyBudgets.has(path)) continue;

    const lines = countLines(await readFile(absolutePath, "utf8"));
    checkedFiles += 1;
    if (lines > budget.maximumLines) {
      violations.push(`${path}: ${lines} lines (module limit ${budget.maximumLines})`);
    }
  }
}

if (violations.length > 0) {
  console.error("BSS architecture growth budget failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error("Extract new behavior behind existing contracts instead of growing oversized modules.");
  process.exitCode = 1;
} else {
  console.log(`BSS architecture growth budget: PASS (${checkedFiles} source files checked).`);
}
