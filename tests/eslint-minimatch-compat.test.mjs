import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Resolve consumers from the current checkout, so this same file can also
// exercise a clean baseline without changing that checkout's configuration.
const cwd = process.cwd();
const require = createRequire(path.join(cwd, 'package.json'));
const { ESLint } = require('eslint');
const lint = new ESLint({ cwd, warnIgnored: false });

for (const [file, ignored, strict] of [
  ['src/worker.js', false, true],
  ['src/nested/.probe.js', false, true],
  ['src/adapters/api-bindings.js', false, false],
  ['scripts/probe.mjs', false, true],
  ['tests/nested/probe.cjs', false, true],
  ['playwright.config.cjs', false, true],
  ['design-system/probe.js', false, true],
  ['brand-book/nested/probe.js', false, true],
  ['sw.js', false, true],
  ['app.js', false, false],
  ['tests/probe.mjs', false, false],
  ['node_modules/probe.js', true, false],
  ['backend/node_modules/probe.js', true, false],
  ['dist/probe.js', true, false],
  ['nested/dist/probe.js', true, false],
  ['output/probe.js', true, false],
  ['playwright-report/probe.js', true, false],
  ['test-results/probe.js', true, false],
  ['tmp/probe.js', true, false],
]) {
  test(`existing config keeps ${file}: ignored=${ignored}, strict=${strict}`, async () => {
    assert.equal(await lint.isPathIgnored(file), ignored);
    if (ignored) return;
    const config = await lint.calculateConfigForFile(file);
    assert.equal(config.rules['no-undef'][0], strict ? 2 : 0);
    assert.equal(config.rules['no-eval'][0], 2);
    const results = await lint.lintText('bssUnrecognizedIdentifier();\n', { filePath: file });
    assert.equal(results.length, 1);
    assert.equal(results[0].messages.some(m => m.ruleId === 'no-undef'), strict);
  });
}

test('strict browser/node globals and forbidden eval remain enforced', async () => {
  for (const [filePath, text, rule] of [
    ['src/probe.js', 'window.alert("ok");', null],
    ['src/probe.js', 'console.log(process.version);', 'no-undef'],
    ['scripts/probe.mjs', 'console.log(process.version);', null],
    ['src/probe.js', 'eval("1");', 'no-eval'],
  ]) {
    const [result] = await lint.lintText(text, { filePath });
    if (rule) assert.ok(result.messages.some(m => m.ruleId === rule));
    else assert.equal(result.errorCount, 0);
  }
});

const fixture = mkdtempSync(path.join(tmpdir(), 'bss-eslint-globs-'));
after(() => rmSync(fixture, { recursive: true, force: true }));
for (const name of ['src/one.js', 'src/nested/two.cjs', 'src/nested/.hidden.mjs', 'ignored/skip.js', 'src/skip.ts']) {
  const file = path.join(fixture, name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, 'unrecognizedGlobProbe();\n');
}
test('actual filesystem discovery preserves globstar, braces, dotfiles and ignores', async () => {
  const engine = new ESLint({
    cwd: fixture,
    overrideConfigFile: true,
    warnIgnored: false,
    overrideConfig: [
      { ignores: ['ignored/**'] },
      { files: ['**/*.{js,cjs,mjs}'], rules: { 'no-undef': 'error' } },
    ],
  });
  const results = await engine.lintFiles(['**/*.{js,cjs,mjs}']);
  assert.deepEqual(results.map(r => path.relative(fixture, r.filePath).replaceAll('\\', '/')).sort(),
    ['src/nested/.hidden.mjs', 'src/nested/two.cjs', 'src/one.js']);
  for (const result of results) {
    assert.equal(result.errorCount, 1);
    assert.equal(result.messages[0].ruleId, 'no-undef');
  }
});
test('extglob and brace config paths select only intended files', async () => {
  const engine = new ESLint({
    cwd: fixture, overrideConfigFile: true, warnIgnored: false,
    overrideConfig: [{ files: ['src/**/@(one|two).{js,cjs}'], rules: { 'no-undef': 'error' } }],
  });
  for (const [filePath, selected] of [['src/one.js', true], ['src/nested/two.cjs', true], ['src/other.js', false]]) {
    const [result] = await engine.lintText('globProbe();', { filePath });
    assert.equal(result.messages.some(m => m.ruleId === 'no-undef'), selected);
  }
});

test('adversarial preprocessing fails explicitly inside a bounded child process', () => {
  const consumer = createRequire(require.resolve('eslint/package.json'));
  const modulePath = consumer.resolve('minimatch');
  const code = `
    const { Minimatch } = require(${JSON.stringify(modulePath)});
    const pattern = Array(15).fill('**/../a/b').join('/');
    try { new Minimatch(pattern, { optimizationLevel: 2 }); process.exitCode = 2; }
    catch (error) {
      if (error instanceof RangeError) console.log('bounded-rejection');
      else { console.error(error.name); process.exitCode = 3; }
    }
  `;
  const result = spawnSync(process.execPath, ['--max-old-space-size=128', '-e', code], {
    cwd, encoding: 'utf8', timeout: 5000, maxBuffer: 4096,
  });
  assert.equal(result.error, undefined, 'bounded worker must finish normally');
  assert.equal(result.status, 0, 'worker must reject the expansion instead of accepting/truncating it');
  assert.match(result.stdout, /bounded-rejection/);
});
