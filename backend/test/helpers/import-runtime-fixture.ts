import { importFixture } from "./import-fixture.js";
import { PgImportRuntime } from "../../src/imports/runtime.js";
export async function importRuntimeFixture(url: string) {
  const f = await importFixture(url);
  try {
    await f.owner.query(`GRANT EXECUTE ON FUNCTION bss_import_healthy(),bss_import_admit(text,uuid),
      bss_import_lease(uuid,text),bss_import_cleanup() TO ${f.role}`);
    const events: string[] = [];
    const runtime = new PgImportRuntime(f.appPool, event => { events.push(event); });
    await runtime.start();
    return { ...f, runtime, events, dispose: async () => { await runtime.stop(); await f.dispose(); } };
  } catch (error) { await f.dispose(); throw error; }
}
