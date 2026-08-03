import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexUrl = new URL('../index.html', import.meta.url);
const manifestUrl = new URL('../manifest.webmanifest', import.meta.url);
const mobileShellUrl = new URL('../mobile-shell.js', import.meta.url);

function collectAssetReferences(html) {
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
}

test('preview portal koristi subpath-safe relativne asset putanje', async () => {
  const html = await readFile(indexUrl, 'utf8');
  const references = collectAssetReferences(html);

  assert.ok(references.includes('styles.css'));
  assert.ok(references.includes('app.js'));
  assert.ok(references.includes('premium-experience.js'));
  assert.equal(references.some((reference) => reference.startsWith('/')), false);
});

test('PWA manifest ostaje ograničen na preview podputanju', async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.icons[0].src, 'app-icon.svg');
});

test('mobile shell registrira samo relativne preview assete', async () => {
  const source = await readFile(mobileShellUrl, 'utf8');

  assert.match(source, /href: 'manifest\.webmanifest'/);
  assert.match(source, /href: 'app-icon\.svg'/);
  assert.doesNotMatch(source, /href: '\//);
});
