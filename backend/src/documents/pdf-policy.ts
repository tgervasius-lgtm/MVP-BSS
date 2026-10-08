import { execFile } from "node:child_process";
import { access, mkdtemp, rm, statfs, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { AppError } from "../domain/errors.js";
import { MAX_DOCUMENT_BYTES } from "./model.js";

const execute = promisify(execFile);
export const QPDF_PATH = "/opt/bss-qpdf/12.4.2/bin/qpdf";
const TMPFS_MAGIC = 0x01021994;
const blockedNames = new Set(["/EmbeddedFile", "/EmbeddedFiles", "/EF", "/AF", "/AFRelationship", "/FileAttachment", "/Collection", "/RF"]);
const invalid = () => new AppError("VALIDATION_FAILED", "PDF nije moguće sigurno provjeriti. Izvezite novi PDF bez lozinke i ugrađenih datoteka.");
const unavailable = () => new AppError("DOCUMENTS_UNAVAILABLE", "Provjera dokumenta trenutačno nije dostupna. Dokument nije spremljen.");
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

function name(value: string): string {
  // qpdf v2 resolves PDF name escapes; n: preserves binary names in PDF syntax.
  return value.startsWith("n:/") ? value.slice(2).replace(/#([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))) : value;
}

/** Inspect every resolved object, including object streams and unreferenced objects.
 * Never use a byte regex or just the catalog's attachment name tree as the policy.
 */
export function assertPdfStructure(document: unknown): void {
  if (!isObject(document) || document.version !== 2 || !Array.isArray(document.qpdf) || document.qpdf.length !== 2
    || !isObject(document.qpdf[0]) || document.qpdf[0].jsonversion !== 2 || !isObject(document.qpdf[1])
    || !isObject(document.qpdf[1].trailer) || !isObject(document.encrypt) || typeof document.encrypt.encrypted !== "boolean") throw unavailable();
  if (document.encrypt.encrypted) throw invalid();
  const objects = document.qpdf[1];
  if (Object.keys(objects).length < 2 || Object.keys(objects).length > 20000) throw invalid();
  const pending: Array<{ value: unknown; depth: number }> = [{ value: objects, depth: 0 }];
  let visited = 0;
  const checkName = (value: string) => {
    const canonical = name(value);
    if (blockedNames.has(canonical)) throw new AppError("VALIDATION_FAILED", "PDF sadrži ugrađene datoteke. Učitajte PDF bez unutarnjih privitaka; stranice i slike su dopuštene.");
    if (canonical === "/Encrypt") throw invalid();
  };
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (++visited > 200000 || depth > 64) throw invalid();
    if (typeof value === "string") checkName(value);
    else if (Array.isArray(value)) for (const child of value) pending.push({ value: child, depth: depth + 1 });
    else if (isObject(value)) {
      // External stream content cannot be inspected as part of these PDF bytes.
      if (isObject(value.stream) && isObject(value.stream.dict) && Object.hasOwn(value.stream.dict, "/F")) throw invalid();
      for (const [key, child] of Object.entries(value)) { checkName(key); pending.push({ value: child, depth: depth + 1 }); }
    }
  }
}

/** Linux runtime dependency: pinned qpdf 12.4.2 (JSON v2) and util-linux prlimit.
 * Private tmpfs input only; no original filename, inherited secrets or shell.
 * stdout/stderr can contain document metadata: never propagate or log them.
 */
export async function inspectPdf(bytes: Buffer): Promise<void> {
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw invalid();
  let directory: string | undefined;
  try {
    if (process.platform !== "linux" || (await statfs("/dev/shm")).type !== TMPFS_MAGIC) throw unavailable();
    await access(QPDF_PATH);
    await access("/usr/bin/prlimit");
    directory = await mkdtemp("/dev/shm/bss-pdf-"); // mode 0700
    const input = join(directory, "input.pdf");
    await writeFile(input, bytes, { mode: 0o600, flag: "wx" });
    const run = async (args: string[]) => {
      try {
        const result = await execute("/usr/bin/prlimit", ["--as=268435456", "--cpu=3", "--fsize=0", "--core=0", "--nofile=64", "--",
          QPDF_PATH, "--suppress-recovery", ...args, input], {
          timeout: 5000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024,
          env: { LANG: "C", PATH: "/usr/bin:/bin" }, cwd: directory,
        });
        if (result.stderr.length) throw invalid();
        return result.stdout;
      } catch (error) {
        if (error instanceof AppError) throw error;
        const code = (error as NodeJS.ErrnoException).code;
        // qpdf: errors=2, warnings=3. Limits/crash/missing runtime never pass.
        if (Number(code) === 2 || Number(code) === 3) throw invalid();
        throw unavailable();
      }
    };
    await run(["--check"]);
    const json = await run(["--json=2", "--json-key=qpdf", "--json-key=encrypt", "--json-stream-data=none"]);
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { throw unavailable(); }
    assertPdfStructure(parsed);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw unavailable();
  } finally {
    if (directory) {
      try { await rm(directory, { recursive: true, force: true }); } catch { throw unavailable(); }
    }
  }
}
