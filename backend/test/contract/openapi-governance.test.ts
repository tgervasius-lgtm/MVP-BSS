import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import YAML from 'yaml';

type Operation = {
  operationId?: string;
  security?: unknown[];
  responses?: Record<string, unknown>;
  parameters?: Array<{ name?: string; in?: string }>;
  'x-bss-roles'?: string[];
};

type Spec = {
  openapi?: string;
  paths?: Record<string, Record<string, Operation>>;
};

const HTTP_METHODS = new Set(['get','post','put','patch','delete','options','head']);

async function loadSpec(): Promise<Spec> {
  const raw = await readFile(new URL('../../../openapi/bss-mvp-api-v1.yaml', import.meta.url), 'utf8');
  return YAML.parse(raw) as Spec;
}

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
  assert.ok(ids.size > 20, 'unexpectedly small API contract');
});

test('Every operation defines at least one documented response', async () => {
  const spec = await loadSpec();
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (!HTTP_METHODS.has(method)) continue;
      assert.ok(Object.keys(operation.responses ?? {}).length > 0,
        `${method.toUpperCase()} ${path} has no documented responses`);
    }
  }
});

test('Privileged operations declare BSS roles unless explicitly public', async () => {
  const spec = await loadSpec();
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (!HTTP_METHODS.has(method)) continue;
      const explicitlyPublic = Array.isArray(operation.security) && operation.security.length === 0;
      if (explicitlyPublic) continue;
      assert.ok(Array.isArray(operation['x-bss-roles']) && operation['x-bss-roles']!.length > 0,
        `${method.toUpperCase()} ${path} must declare x-bss-roles or security: []`);
    }
  }
});
