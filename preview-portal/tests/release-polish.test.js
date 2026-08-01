import test from 'node:test';
import assert from 'node:assert/strict';
import { createReleasePolish } from '../release-polish.js';

function createDocument() {
  const nodes = new Map();
  const bodyChildren = [];
  const body = { prepend(node) { bodyChildren.unshift(node); nodes.set(node.id, node); } };
  const main = { id: '' };
  const demo = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const documentRef = {
    body,
    createElement(tag) { return { tagName: tag.toUpperCase(), id: '', className: '', href: '', textContent: '' }; },
    getElementById(id) { return nodes.get(id) ?? null; },
    querySelector(selector) { if (selector === 'main') return main; return null; }
  };
  nodes.set('demoView', demo);
  return { documentRef, main, demo, bodyChildren };
}

test('release polish dodaje skip link i main id', () => {
  const fixture = createDocument();
  const polish = createReleasePolish({ documentRef: fixture.documentRef });
  assert.equal(fixture.main.id, 'mainContent');
  assert.equal(fixture.bodyChildren[0].id, 'skipToContent');
  assert.equal(fixture.bodyChildren[0].href, '#mainContent');
  polish.destroy();
});

test('release polish označava demo kao spreman', () => {
  const fixture = createDocument();
  createReleasePolish({ documentRef: fixture.documentRef });
  assert.equal(fixture.demo.attributes['aria-busy'], 'false');
});
