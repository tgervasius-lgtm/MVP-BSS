import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { activateWorkspaceTab, installWorkspaceTabs } from '../workspace-tabs.js';

function fixture() {
  return new JSDOM(`<!doctype html><div data-workspace-tabs>
    <div role="tablist">
      <button id="oneTab" role="tab" data-workspace-tab aria-selected="true" aria-controls="onePanel">Jedan</button>
      <button id="twoTab" role="tab" data-workspace-tab aria-selected="false" aria-controls="twoPanel">Dva</button>
      <button id="threeTab" role="tab" data-workspace-tab aria-selected="false" aria-controls="threePanel">Tri</button>
    </div>
    <section id="onePanel" role="tabpanel">Prvi</section>
    <section id="twoPanel" role="tabpanel">Drugi</section>
    <section id="threePanel" role="tabpanel">Treći</section>
  </div>`, { pretendToBeVisual: true });
}

test('workspace tabovi prikazuju samo aktivni panel', () => {
  const dom = fixture();
  const [controller] = installWorkspaceTabs(dom.window.document);
  const two = dom.window.document.getElementById('twoTab');

  two.click();
  assert.equal(two.getAttribute('aria-selected'), 'true');
  assert.equal(two.tabIndex, 0);
  assert.equal(dom.window.document.getElementById('onePanel').hidden, true);
  assert.equal(dom.window.document.getElementById('twoPanel').hidden, false);
  assert.equal(controller.activate('missingTab'), false);
  controller.destroy();
  dom.window.close();
});

test('workspace tabovi podržavaju strelice, Home i End', () => {
  const dom = fixture();
  installWorkspaceTabs(dom.window.document);
  const one = dom.window.document.getElementById('oneTab');
  const two = dom.window.document.getElementById('twoTab');
  const three = dom.window.document.getElementById('threeTab');

  one.focus();
  one.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  assert.equal(dom.window.document.activeElement, two);
  two.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
  assert.equal(dom.window.document.activeElement, three);
  three.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
  assert.equal(dom.window.document.activeElement, one);
  dom.window.close();
});

test('aktivacija odbija tab iz drugog radnog prostora', () => {
  const dom = fixture();
  const container = dom.window.document.querySelector('[data-workspace-tabs]');
  const outside = dom.window.document.createElement('button');
  assert.equal(activateWorkspaceTab(container, outside), false);
  dom.window.close();
});
