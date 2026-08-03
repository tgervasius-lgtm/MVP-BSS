import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexUrl = new URL('../index.html', import.meta.url);
const manifestUrl = new URL('../manifest.webmanifest', import.meta.url);
const mobileShellUrl = new URL('../mobile-shell.js', import.meta.url);
const workerUrl = new URL('../sw.js', import.meta.url);
const portalUrl = new URL('../', import.meta.url);

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
  assert.equal(manifest.id, './');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.icons.slice(0, 2).map((icon) => icon.sizes), ['192x192', '512x512']);
  assert.equal(manifest.icons.every((icon) => !icon.src.startsWith('/')), true);
});

test('mobile shell registrira samo relativne preview assete', async () => {
  const source = await readFile(mobileShellUrl, 'utf8');

  assert.match(source, /href: 'manifest\.webmanifest'/);
  assert.match(source, /href: 'app-icon\.svg'/);
  assert.doesNotMatch(source, /href: '\//);
});

test('service worker koristi zaseban preview cache i relativni scope', async () => {
  const source = await readFile(workerUrl, 'utf8');

  assert.match(source, /bss-preview-portal-/);
  assert.match(source, /self\.registration\.scope/);
  assert.match(source, /\.\/index\.html/);
  assert.match(source, /\.\/manifest\.webmanifest/);
  assert.doesNotMatch(source, /filter\(key\s*=>\s*key\s*!==\s*CACHE_NAME/);
});

test('service worker predmemorira zatvoren skup svih statičkih JavaScript importa', async () => {
  const worker = await readFile(workerUrl, 'utf8');
  const cachedAssets = new Set([...worker.matchAll(/['"](\.\/[^'"]+)['"]/g)].map((match) => match[1]));
  const modules = [...cachedAssets].filter((asset) => asset.endsWith('.js'));

  for (const asset of modules) {
    const moduleUrl = new URL(asset, portalUrl);
    const moduleSource = await readFile(moduleUrl, 'utf8');
    const imports = [...moduleSource.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)].map((match) => match[1]);
    for (const imported of imports) {
      const dependencyUrl = new URL(imported, moduleUrl);
      const dependency = `./${dependencyUrl.href.slice(portalUrl.href.length)}`;
      assert.ok(cachedAssets.has(dependency), `${asset} uvozi ${dependency}, ali ga Preview PWA ne predmemorira`);
    }
  }
});
