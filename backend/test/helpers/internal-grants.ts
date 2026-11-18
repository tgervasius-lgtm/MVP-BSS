import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Execute the complete operator entry point, including psql guards and its own transaction. */
export function applyInternalDraftGrants(databaseUrl: string, role?: string) {
  const db = new URL(databaseUrl);
  const script = fileURLToPath(new URL("../../deploy/internal-authority-draft-grants.sql", import.meta.url));
  const args = ["--no-psqlrc", "--no-password", "--quiet", "--file", script];
  if (role !== undefined) args.push("--set", "internal_role="+role);
  const child = spawn(process.env.BSS_TEST_PSQL_PATH ?? "psql", args, {
    shell: false, windowsHide: true, timeout: 15_000,
    env: { ...process.env, PGHOST: db.hostname, PGPORT: db.port || "5432",
      PGDATABASE: decodeURIComponent(db.pathname.slice(1)), PGUSER: decodeURIComponent(db.username),
      PGPASSWORD: decodeURIComponent(db.password), PGCONNECT_TIMEOUT: "5", PGAPPNAME: "bss-internal-grants-test" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8").on("data", (data: string) => { stdout += data; });
    child.stderr.setEncoding("utf8").on("data", (data: string) => { stderr += data; });
    child.once("error", () => reject(new Error("Required PostgreSQL psql test client unavailable")));
    child.once("close", code => resolve({ code, stdout, stderr }));
  });
}
