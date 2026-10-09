import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const TABULAR_LIMITS = Object.freeze({ bytes: 1_048_576, rows: 1000, columns: 6, cell: 1024,
  outputBytes: 8 * 1024 * 1024, wallMs: 3000, memoryBytes: 256 * 1024 * 1024 });
export const TABULAR_VERSION = "h2-tabular-v1";
export type SourceCell = string | number;
export type ParsedTable = { version: typeof TABULAR_VERSION; fileChecksum: string; headers: string[]; rows: SourceCell[][] };
export class ImportParserError extends Error {
  constructor(readonly kind: "REJECTED" | "UNAVAILABLE" | "CANCELLED", readonly reason: string) {
    super(kind === "REJECTED" ? "Datoteka nije podržana za siguran uvoz." : "Sigurna obrada datoteke nije dostupna.");
  }
}
const reject = (reason: string): never => { throw new ImportParserError("REJECTED", reason); };
const unavailable = () => new ImportParserError("UNAVAILABLE", "PARSER_UNAVAILABLE");

// Trusted paths only. No environment-selected executable or user-provided path.
// Do not bind /, /etc, /home, host /proc, application config or DB credentials.
export function importSandboxArgs(directory: string): string[] {
  return ["--unshare-all", "--unshare-user", "--disable-userns", "--die-with-parent", "--new-session", "--cap-drop", "ALL",
    "--ro-bind", "/usr", "/usr", "--ro-bind", "/lib", "/lib", "--ro-bind", "/lib64", "/lib64",
    "--ro-bind", directory, "/parser", "--dir", "/tmp", "--remount-ro", "/", "--chdir", "/parser",
    "--clearenv", "--setenv", "LANG", "C.UTF-8", "--", "/usr/bin/prlimit",
    `--as=${TABULAR_LIMITS.memoryBytes}`, "--cpu=3", "--core=0", "--fsize=0", "--nproc=0",
    "/usr/bin/python3", "-I", "-S", "-B", "/parser/worker.py"];
}

function decodedTable(value: unknown, fileChecksum: string): ParsedTable {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw unavailable();
  const data = value as Record<string, unknown>;
  if (data.version !== TABULAR_VERSION || Object.keys(data).sort().join(",") !== "headers,rows,version"
    || !Array.isArray(data.headers) || data.headers.length < 5 || data.headers.length > 6
    || !data.headers.every(h => typeof h === "string" && h.trim() === h && h.length > 0 && [...h].length <= 80 && !h.includes("\0"))
    || new Set(data.headers).size !== data.headers.length
    || !Array.isArray(data.rows) || data.rows.length < 1 || data.rows.length > TABULAR_LIMITS.rows) throw unavailable();
  const width = data.headers.length;
  for (const row of data.rows) {
    if (!Array.isArray(row) || row.length !== width || !row.every(cell =>
      (typeof cell === "string" && [...cell].length <= TABULAR_LIMITS.cell && !cell.includes("\0") && !/^[\s]*[=+@-]/u.test(cell))
      || (typeof cell === "number" && Number.isInteger(cell) && cell >= 0 && cell <= 366))) throw unavailable();
  }
  return { version: TABULAR_VERSION, fileChecksum, headers: data.headers as string[], rows: data.rows as SourceCell[][] };
}

/** Internal adapter, not registered by server.ts. All failure paths close before
 * DB work. Raw bytes go only to stdin; stderr, parser output and values are never logged.
 */
export async function parseImportFile(bytes: Buffer, format: "csv" | "xlsx", delimiter: "," | ";",
  signal?: AbortSignal): Promise<ParsedTable> {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > TABULAR_LIMITS.bytes) reject("FILE_LIMIT");
  if (!["csv", "xlsx"].includes(format) || ![",", ";"].includes(delimiter)) reject("INVALID_FORMAT");
  if (signal?.aborted) throw new ImportParserError("CANCELLED", "CANCELLED");
  if (process.platform !== "linux" || process.arch !== "x64") throw unavailable();
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const directory = fileURLToPath(new URL("../../import-parser/", import.meta.url));
  return new Promise((resolve, rejectPromise) => {
    const child = spawn("/usr/bin/bwrap", [...importSandboxArgs(directory), format, delimiter], {
      env: { LANG: "C.UTF-8" }, stdio: ["pipe", "pipe", "pipe"], detached: true
    });
    let failure: ImportParserError | undefined;
    let outputBytes = 0;
    let stderrBytes = 0;
    const chunks: Buffer[] = [];
    let closed = false;
    const stop = (error: ImportParserError) => {
      failure ??= error;
      if (closed) return;
      // Kill the process group, including bwrap and its namespace init. Resolve
      // only after close, so a cancelled parser cannot continue after rejection.
      if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); } }
    };
    const cancelled = () => stop(new ImportParserError("CANCELLED", "CANCELLED"));
    const timer = setTimeout(() => stop(new ImportParserError("REJECTED", "PARSE_DEADLINE")), TABULAR_LIMITS.wallMs);
    signal?.addEventListener("abort", cancelled, { once: true });
    if (signal?.aborted) cancelled();
    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > TABULAR_LIMITS.outputBytes) stop(new ImportParserError("REJECTED", "OUTPUT_LIMIT"));
      else if (!failure) chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > 65536) stop(unavailable());
    });
    child.on("error", () => stop(unavailable()));
    child.stdin.on("error", () => stop(unavailable()));
    child.on("close", code => {
      closed = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancelled);
      if (failure) return rejectPromise(failure);
      if (code === 2) return rejectPromise(new ImportParserError("REJECTED", "INVALID_FILE"));
      if (code !== 0 || stderrBytes > 0) return rejectPromise(unavailable());
      try { resolve(decodedTable(JSON.parse(Buffer.concat(chunks).toString("utf8")), checksum)); }
      catch { rejectPromise(unavailable()); }
    });
    child.stdin.end(bytes);
  });
}
