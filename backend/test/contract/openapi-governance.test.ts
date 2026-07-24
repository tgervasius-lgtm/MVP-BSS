import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import YAML from 'yaml';

type Operation = {
  operationId?: string;
  responses?: Record<string, unknown>;
};

type Spec = {
  openapi?: string;
  info?: { version?: string };
  paths?: Record<string, Record<string, Operation>>;
};

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

async function loadSpec(): Promise<Spec> {
  const raw = await readFile(new URL('../../../openapi/bss-mvp-api-v1.yaml', import.meta.url), 'utf8');
  return YAML.parse(raw) as Spec;
}

test('OpenAPI document is versioned and exposes a material MVP surface', async () => {
  const spec = await loadSpec();
  assert.match(spec.openapi ?? '', /^3\./);
  assert.match(spec.info?.version ?? '', /^\d+\.\d+\.\d+$/);
  assert.ok(Object.keys(spec.paths ?? {}).length > 20, 'unexpectedly small API contract');
});

test('OpenAPI operationIds are present and globally unique', async () => {
  const spec = await loadSpec();
  const ids = new Set<string>();
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (!HTTP_METHODS.has(method)) continue;
      assert.ok(operation.operationId, `${method.toUpperCase()} ${path} is missing operationId`);
      assert.equal(ids.has(operation.operationId), false, `duplicate operationId: ${operation.operationId}`);
      ids.add(operation.operationId);
    }
  }
});

test('Every operation defines at least one documented response', async () => {
  const spec = await loadSpec();
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (!HTTP_METHODS.has(method)) continue;
      assert.ok(
        Object.keys(operation.responses ?? {}).length > 0,
        `${method.toUpperCase()} ${path} has no documented responses`,
      );
    }
  }
});
