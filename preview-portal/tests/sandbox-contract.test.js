import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const portalUrl = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, portalUrl), 'utf8');
}

test('onboarding traži samo agregirani profil i zadano otvara slobodni sandbox', async () => {
  const html = await source('index.html');

  for (const field of ['industry', 'employees', 'locations', 'shifts']) {
    assert.match(html, new RegExp(`name=["']${field}["']`));
  }
  assert.match(html, /name="employees"[^>]*required/);
  assert.match(html, /name="locations"[^>]*required/);
  assert.match(html, /name="experienceMode" value="free" checked/);
  assert.match(html, /Ne unosite imena radnika, OIB ni druge osobne podatke/);
  assert.doesNotMatch(html, /name=["'](?:employeeName|workerName|oib|email)["']/i);
});

test('sandbox UI nema sekvencijalno zaključavanje niti skriva sustav nakon dovršetka', async () => {
  const [app, html] = await Promise.all([source('app.js'), source('index.html')]);

  assert.doesNotMatch(app, /guide\.event\s*===/);
  assert.doesNotMatch(app, /Čeka prethodni korak|Dovršite trenutačni vođeni korak/);
  assert.match(app, /elements\.roleSwitcher\.classList\.remove\('hidden'\)/);
  assert.match(app, /button\.disabled = done/);
  for (const mission of ['rfid_check_in', 'correction_resolved', 'leave_approved', 'worker_leave_submitted', 'report_generated']) {
    assert.match(app, new RegExp(`['"]${mission}['"]`));
  }
  assert.match(app, /MISSION_COMPLETED[\s\S]*mission,[\s\S]*progress: after\.progress/);
  assert.equal((html.match(/data-role=/g) ?? []).length, 4);
  assert.doesNotMatch(html, /data-role=["']director["']/);
  assert.doesNotMatch(html, /Potvrdi da su podaci jasni/);
  assert.match(html, /data-role="admin"[^>]*>Uprava</);
  assert.match(html, /id="workerLeaveForm"/);
  assert.match(html, /id="reportPreview"/);
  assert.match(html, /Jedno očitanje, tri povezana pregleda/);
  assert.doesNotMatch(html, /Fond sati za izvještaj/);
});

test('mobilni vodič ni u jednom CSS sloju nije sticky ili fixed', async () => {
  const css = `${await source('styles.css')}\n${await source('ux-polish.css')}`;
  const guideRules = [...css.matchAll(/\.guide-panel\s*\{([^}]*)\}/g)].map((match) => match[1]);

  assert.ok(guideRules.length >= 1);
  for (const rule of guideRules) {
    assert.doesNotMatch(rule, /position\s*:\s*(?:sticky|fixed)/);
    assert.doesNotMatch(rule, /\btop\s*:/);
  }
});
