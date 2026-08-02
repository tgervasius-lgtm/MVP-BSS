import test from 'node:test';
import assert from 'node:assert/strict';
import { HEAD_ENTRIES, installMobileShell } from '../mobile-shell.js';

function createDocumentMock() {
  const nodes = [];
  const rootClasses = new Set();
  return {
    nodes,
    rootClasses,
    head: {
      append(node) { nodes.push(node); },
      querySelector(selector) {
        const match = selector.match(/^(\w+)\[(\w+)="([^"]+)"\]$/);
        if (!match) return null;
        const [, tag, key, value] = match;
        return nodes.find((node) => node.tagName === tag && node.attributes[key] === value) ?? null;
      }
    },
    documentElement: {
      classList: { add(name) { rootClasses.add(name); } }
    },
    createElement(tagName) {
      return {
        tagName,
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; }
      };
    }
  };
}

test('mobile shell instalira standalone metadata samo jednom', () => {
  const documentRef = createDocumentMock();
  assert.equal(installMobileShell(documentRef), HEAD_ENTRIES.length);
  assert.equal(installMobileShell(documentRef), 0);
  assert.equal(documentRef.nodes.length, HEAD_ENTRIES.length);
  assert.equal(documentRef.rootClasses.has('app-shell-ready'), true);
});

test('manifest i app ikona imaju očekivane reference', () => {
  const manifest = HEAD_ENTRIES.find((entry) => entry.value === 'manifest');
  const icon = HEAD_ENTRIES.find((entry) => entry.value === 'icon');
  assert.equal(manifest.attributes.href, 'manifest.webmanifest');
  assert.equal(icon.attributes.href, 'app-icon.svg');
});

test('nevaljani document sigurno vraća nula izmjena', () => {
  assert.equal(installMobileShell(null), 0);
  assert.equal(installMobileShell({}), 0);
});
