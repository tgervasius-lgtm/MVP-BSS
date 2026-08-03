import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

// Existing composition/service modules may only shrink. New work must be
// extracted behind the current contracts instead of extending these files.
const frozenLegacyBudgets = new Map([
  ["app.js", 2_103],
  ["backend/src/services/pg-mvp-service.ts", 1_419],
  ["backend/src/services/pg-phase-a-service.ts", 1_377]
]);

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
    violations.push(`${path}: ${lines} linija (zamrznuta granica ${maximumLines}; modul mora ostati isti ili se smanjiti)`);
  }
}

for (const budget of sourceBudgets) {
  for (const absolutePath of await sourceFiles(budget.directory, budget.extension)) {
    const path = relative(repositoryRoot, absolutePath);
    if (frozenLegacyBudgets.has(path)) continue;
    const lines = countLines(await readFile(absolutePath, "utf8"));
    checkedFiles += 1;
    if (lines > budget.maximumLines) {
      violations.push(`${path}: ${lines} linija (granica za modul ${budget.maximumLines})`);
    }
  }
}

if (violations.length > 0) {
  console.error("Arhitektonski budžet nije zadovoljen:");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error("Izdvojite novu domenu/modul iza postojećeg ugovora umjesto povećavanja velikih datoteka.");
  process.exitCode = 1;
} else {
  console.log(`Arhitektonski budžet: PASS (${checkedFiles} izvornih datoteka; veliki moduli ne rastu).`);
}
