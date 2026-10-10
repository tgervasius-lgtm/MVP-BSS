// Explicit disposable local PostgreSQL only. Never invoke against customer data.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { terminalFixture } from "../test/helpers/terminal-fixture.js";

if (!process.env.BSS_TEST_DATABASE_URL) throw new Error("BSS_TEST_DATABASE_URL mora označavati testni PostgreSQL s pravom stvaranja privremene baze.");
const fixture = await terminalFixture(process.env.BSS_TEST_DATABASE_URL, 4180, true);
const directory = await mkdtemp(join(tmpdir(), "bss-terminal-bench-"));
const configPath = join(directory, "config.json");
await writeFile(configPath, JSON.stringify(fixture.agentConfig), {mode: 0o600});
await writeFile(join(directory, "admin-login.json"), JSON.stringify(fixture.login), {mode: 0o600});
console.log("BSS testni backend: http://127.0.0.1:4180");
console.log(`Privatna mapa sesije: ${directory}`);
console.log(`Iz korijena repozitorija: python3 -m terminal --session "${basename(directory)}"`);
console.log("Testna prijava spremljena je u admin-login.json. Ctrl+C gasi backend i uklanja samo njegovu privremenu bazu. Lokalni red ostaje sačuvan.");
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await fixture.dispose();
}
process.once("SIGINT", () => { void close(); });
process.once("SIGTERM", () => { void close(); });
