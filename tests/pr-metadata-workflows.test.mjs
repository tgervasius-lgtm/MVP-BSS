import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const sha = 'a'.repeat(40);
const other = 'b'.repeat(40);
const marker = '<!-- bss-pr-risk-guardrails -->';
const pr = () => ({ number: 282, state: 'open', base: { ref: 'main', repo: { id: 1 } }, head: { sha }, changed_files: 1, additions: 3, deletions: 3 });
const context = () => ({ repo: { owner: 'owner', repo: 'repo' }, payload: { repository: { id: 1, default_branch: 'main' }, workflow_run: { event: 'pull_request', path: '.github/workflows/pr-governance.yml', name: 'BSS PR governance gate', repository: { id: 1 }, head_sha: sha, pull_requests: [{ number: 282 }] } } });
function core() {
  const outputs = {};
  const summary = { addHeading() { return this; }, addTable() { return this; }, write() {} };
  return { outputs, setOutput: (k, v) => { outputs[k] = v; }, notice() {}, summary };
}
function scripts(source) {
  return [...source.matchAll(/^ {10}script: \|\n((?:^ {12}.*\n|^\n)+)/gm)].map(m => m[1].replace(/^ {12}/gm, ''));
}
const execute = (code, api, ctx, output) => new AsyncFunction('github', 'context', 'core', code)(api, ctx, output);
const source = name => readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');

for (const name of ['pr-labeler.yml', 'pr-risk-guardrails.yml']) {
  const yaml = source(name);
  const [resolve] = scripts(yaml);
  test(`${name}: only default-branch metadata processing, no untrusted execution or permission expansion`, () => {
    assert.match(yaml, /workflow_run:\n {4}workflows: \[BSS PR governance gate\]\n {4}types: \[completed\]/);
    assert.doesNotMatch(yaml, /pull_request_target:|actions\/checkout@|download-artifact@|actions\/cache@|secrets\.|\brun:|require\(|import\(/);
    assert.doesNotMatch(yaml, /contents: write|actions: write|checks: write|id-token: write/);
    assert.match(yaml, /if: steps.pr.outputs.number != ''/);
    assert.ok(resolve);
    if (name === 'pr-labeler.yml') assert.match(yaml, /pr-number: \$\{\{ steps.pr.outputs.number \}\}/);
  });
  for (const author of ['member', 'dependabot[bot]', 'fork-contributor']) {
    test(`${name}: current ${author} PR; governance failure does not disable classification`, async () => {
      const data = pr(); data.user = { login: author }; data.head.repo = { id: author === 'fork-contributor' ? 2 : 1 };
      const ctx = context(); ctx.payload.workflow_run.conclusion = 'failure'; const out = core();
      await execute(resolve, { rest: { pulls: { get: async () => ({ data }) } } }, ctx, out);
      assert.deepEqual(out.outputs, { number: '282', head: sha });
    });
  }
  test(`${name}: empty fork association uses paginated API metadata`, async () => {
    const ctx = context(); ctx.payload.workflow_run.pull_requests = []; const out = core(); let calls = 0;
    const endpoint = () => {};
    await execute(resolve, { rest: { repos: { listPullRequestsAssociatedWithCommit: endpoint }, pulls: { get: async () => ({ data: pr() }) } }, paginate: async (fn, args) => { assert.equal(fn, endpoint); assert.equal(args.commit_sha, sha); calls++; return [{ number: 282 }]; } }, ctx, out);
    assert.equal(calls, 1); assert.equal(out.outputs.number, '282');
  });
  for (const [reason, mutate] of [
    ['stale head', p => { p.head.sha = other; }], ['closed PR', p => { p.state = 'closed'; }],
    ['foreign base repository', p => { p.base.repo.id = 2; }], ['wrong base branch', p => { p.base.ref = 'other'; }],
  ]) {
    test(`${name}: ignores ${reason} with no output`, async () => {
      const data = pr(); mutate(data); const out = core();
      await execute(resolve, { rest: { pulls: { get: async () => ({ data }) } } }, context(), out);
      assert.deepEqual(out.outputs, {});
    });
  }
  for (const [key, value] of [['event', 'push'], ['path', '.github/workflows/other.yml'], ['name', 'fake'], ['head_sha', 'invalid'], ['repository', { id: 2 }]]) {
    test(`${name}: rejects unexpected upstream ${key}`, async () => {
      const ctx = context(); ctx.payload.workflow_run[key] = value;
      await assert.rejects(execute(resolve, {}, ctx, core()), /Unexpected upstream/);
    });
  }
  test(`${name}: ambiguity, invalid numbers and API errors fail closed`, async () => {
    const ctx = context(); ctx.payload.workflow_run.pull_requests.push({ number: 283 });
    const api = { rest: { pulls: { get: async ({ pull_number }) => ({ data: { ...pr(), number: pull_number } }) } } };
    await assert.rejects(execute(resolve, api, ctx, core()), /Ambiguous/);
    ctx.payload.workflow_run.pull_requests = [{ number: '282' }];
    await assert.rejects(execute(resolve, api, ctx, core()), /Invalid PR number/);
    api.rest.pulls.get = async () => { throw new Error('API unavailable'); };
    await assert.rejects(execute(resolve, api, context(), core()), /API unavailable/);
  });
}

const classifyScript = scripts(source('pr-risk-guardrails.yml'))[1];
async function classify({ data = pr(), files = ['README.md'], comments = [], labels = [], first = data, second = data, failFiles = false } = {}) {
  let reads = 0; const calls = [];
  const issues = Object.fromEntries(['getLabel', 'createLabel', 'listLabelsOnIssue', 'removeLabel', 'addLabels', 'listComments', 'updateComment', 'createComment', 'deleteComment'].map(method => [method, async args => {
    if (!['getLabel', 'listLabelsOnIssue'].includes(method)) calls.push([method, args]);
    return { data: labels.map(name => ({ name })) };
  }]));
  const listFiles = () => {};
  const api = { rest: { issues, pulls: { get: async () => ({ data: reads++ ? second : first }), listFiles } }, paginate: async fn => {
    if (fn !== listFiles) return comments;
    if (failFiles) throw new Error('file list unavailable');
    return files.map(filename => ({ filename }));
  } };
  const previous = { number: process.env.PR_NUMBER, head: process.env.PR_HEAD };
  process.env.PR_NUMBER = '282'; process.env.PR_HEAD = sha;
  try { await execute(classifyScript, api, context(), core()); } finally {
    if (previous.number === undefined) delete process.env.PR_NUMBER; else process.env.PR_NUMBER = previous.number;
    if (previous.head === undefined) delete process.env.PR_HEAD; else process.env.PR_HEAD = previous.head;
  }
  return calls;
}
for (const [count, lines, size] of [[8, 400, 'S'], [9, 400, 'M'], [20, 1000, 'M'], [21, 1000, 'L'], [40, 2000, 'L'], [41, 2000, 'XL'], [1, 401, 'M'], [1, 1001, 'L'], [1, 2001, 'XL']]) {
  test(`preserves size threshold: ${count} files/${lines} lines => ${size}`, async () => {
    const data = { ...pr(), changed_files: count, additions: lines, deletions: 0 };
    const calls = await classify({ data, files: Array(count).fill('README.md') });
    const labels = calls.find(([m]) => m === 'addLabels')[1].labels;
    assert.ok(labels.includes(`size/${size}`)); assert.equal(labels.includes('risk/high'), size === 'XL');
    assert.equal(calls.some(([m]) => m === 'createComment'), ['L', 'XL'].includes(size));
  });
}
test('preserves multi-domain warning, scoped labels and bot-owned comment update', async () => {
  const calls = await classify({ files: ['backend/migrations/auth.sql'], labels: ['size/L', 'risk/high', 'manual'], comments: [{ id: 9, body: marker, user: { login: 'github-actions[bot]', type: 'Bot' } }] });
  assert.deepEqual(calls.find(([m]) => m === 'addLabels')[1].labels, ['size/S', 'risk/high']);
  assert.deepEqual(calls.filter(([m]) => m === 'removeLabel').map(([, args]) => args.name), ['size/L', 'risk/high']);
  assert.equal(calls.find(([m]) => m === 'updateComment')[1].comment_id, 9);
});
test('human marker comments are never edited/deleted; bot warning can be removed', async () => {
  const comments = [{ id: 7, body: marker, user: { login: 'contributor', type: 'User' } }];
  assert.equal((await classify({ comments })).some(([m]) => ['deleteComment', 'updateComment'].includes(m)), false);
  const warned = await classify({ comments, data: { ...pr(), additions: 2001 } });
  assert.equal(warned.some(([m]) => m === 'createComment'), true);
  assert.equal(warned.some(([m]) => ['deleteComment', 'updateComment'].includes(m)), false);
  const resolved = await classify({ comments: [{ id: 8, body: marker, user: { login: 'github-actions[bot]', type: 'Bot' } }] });
  assert.equal(resolved.find(([m]) => m === 'deleteComment')[1].comment_id, 8);
});
test('stale/closed PR at either read causes zero writes', async () => {
  for (const stage of ['first', 'second']) {
    assert.deepEqual(await classify({ [stage]: { ...pr(), head: { sha: other } } }), []);
    assert.deepEqual(await classify({ [stage]: { ...pr(), state: 'closed' } }), []);
  }
});
test('missing/incomplete file list aborts before writes', async () => {
  await assert.rejects(classify({ failFiles: true }), /file list unavailable/);
  await assert.rejects(classify({ files: [] }), /Incomplete PR file list/);
});
