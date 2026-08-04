import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  appendLivingOfficeEvent,
  clearLivingOfficeEvents,
  createLivingOfficeController,
  getLivingOfficeFrame,
  renderInitialActivityFeed
} from '../living-office.js';

function createFeed() {
  const dom = new JSDOM('<!doctype html><ol id="feed"></ol>');
  return { dom, feed: dom.window.document.getElementById('feed') };
}

test('living office vraća determinističke strukturirane okvire', () => {
  const frame = getLivingOfficeFrame(0);
  assert.equal(frame.time, '06:58');
  assert.equal(frame.event, 'Marko Marić se prijavio.');
  assert.equal(frame.actor, 'Marko Marić');
  assert.equal(frame.action, 'Prijava');
  assert.equal(frame.detail, 'Glavni terminal');
  assert.equal(frame.tone, 'success');
  assert.equal(frame.index, 0);
  assert.equal(frame.total, 5);
  assert.equal(frame.industry, 'ostalo');
  assert.equal(getLivingOfficeFrame(3).time, '07:06');
});

test('living office prilagođava događaje djelatnosti', () => {
  assert.match(getLivingOfficeFrame(1, 'Logistika').event, /skladišta/);
  assert.equal(getLivingOfficeFrame(0, 'Logistika').detail, 'Ulaz skladišta');
  assert.match(getLivingOfficeFrame(2, 'Građevina').event, /teren/);
  assert.equal(getLivingOfficeFrame(4, 'Ured').actor, 'Voditelj tima');
});

test('living office koristi siguran fallback za nepoznatu djelatnost', () => {
  const frame = getLivingOfficeFrame(0, 'Nepoznata djelatnost');
  assert.equal(frame.industry, 'ostalo');
  assert.equal(frame.event, 'Marko Marić se prijavio.');
});

test('living office ograničava nevažeći korak', () => {
  assert.equal(getLivingOfficeFrame(-10).index, 0);
  assert.equal(getLivingOfficeFrame(999).index, 4);
  assert.equal(getLivingOfficeFrame('nije-broj').index, 0);
});

test('početni feed prikazuje tri sažeta strukturirana događaja, najnoviji prvi', () => {
  const { dom, feed } = createFeed();
  assert.equal(renderInitialActivityFeed(feed, 'Proizvodnja'), 3);
  assert.equal(feed.children.length, 3);
  assert.equal(feed.firstElementChild.dataset.actor, 'Ivan Horvat');
  assert.equal(feed.firstElementChild.querySelector('time').getAttribute('datetime'), '07:01');
  assert.match(feed.firstElementChild.querySelector('.activity-copy').textContent, /Čeka prijavu · Terminal hale/);
  dom.window.close();
});

test('live feed ne duplicira događaj i ograničava ukupan broj zapisa', () => {
  const { dom, feed } = createFeed();
  assert.equal(appendLivingOfficeEvent(feed, getLivingOfficeFrame(0), 2), true);
  assert.equal(appendLivingOfficeEvent(feed, getLivingOfficeFrame(0), 2), false);
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(1), 2);
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(2), 2);
  assert.equal(feed.children.length, 2);
  assert.equal(feed.firstElementChild.dataset.eventKey, 'living-ostalo-2');
  assert.equal(feed.lastElementChild.dataset.eventKey, 'living-ostalo-1');
  dom.window.close();
});

test('isti korak iz različitih djelatnosti ima odvojeni ključ', () => {
  const { dom, feed } = createFeed();
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(0, 'Logistika'));
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(0, 'Ured'));
  assert.equal(feed.children.length, 2);
  assert.notEqual(feed.children[0].dataset.eventKey, feed.children[1].dataset.eventKey);
  dom.window.close();
});

test('reset uklanja generirane događaje, ali zadržava početni prikaz', () => {
  const { dom, feed } = createFeed();
  renderInitialActivityFeed(feed, 'Logistika', 2);
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(3, 'Logistika'));
  assert.equal(feed.children.length, 3);
  clearLivingOfficeEvents(feed);
  assert.equal(feed.querySelectorAll('[data-live-event]').length, 0);
  assert.equal(feed.querySelectorAll('[data-seed-event]').length, 2);
  dom.window.close();
});

test('nulti i negativni limit sigurno odbijaju novi zapis', () => {
  const { dom, feed } = createFeed();
  assert.equal(appendLivingOfficeEvent(feed, getLivingOfficeFrame(0), 0), false);
  assert.equal(appendLivingOfficeEvent(feed, getLivingOfficeFrame(0), -4), false);
  assert.equal(feed.children.length, 0);
  dom.window.close();
});

test('automatski slijed završava kronološki i ne vraća sat unatrag', async () => {
  const { dom, feed } = createFeed();
  const frames = [];
  let completeSequence;
  const completed = new Promise((resolve) => { completeSequence = resolve; });
  const controller = createLivingOfficeController({
    feed,
    resetControl: null,
    getIndustry: () => 'Proizvodnja',
    intervalMs: 2,
    onFrame: (frame) => {
      frames.push(frame.time);
      if (frames.length === 5) completeSequence();
    }
  });
  controller.start();
  let sequenceTimeout;
  try {
    await Promise.race([
      completed,
      new Promise((_, reject) => {
        sequenceTimeout = setTimeout(() => reject(new Error('Living Office sequence timed out.')), 500);
      })
    ]);
  } finally {
    clearTimeout(sequenceTimeout);
    controller.stop();
  }
  assert.deepEqual(frames, ['06:58', '07:00', '07:01', '07:06', '07:12']);
  dom.window.close();
});

test('promjena djelatnosti tijekom slijeda ne vraća simulirani sat unatrag', async () => {
  const { dom, feed } = createFeed();
  const frames = [];
  let currentIndustry = 'Proizvodnja';
  let completeSequence;
  const completed = new Promise((resolve) => { completeSequence = resolve; });
  const controller = createLivingOfficeController({
    feed,
    resetControl: null,
    getIndustry: () => currentIndustry,
    intervalMs: 2,
    onFrame: (frame) => {
      frames.push(`${frame.time}/${frame.industry}`);
      if (frames.length === 2) currentIndustry = 'Logistika';
      if (frames.length === 5) completeSequence();
    }
  });
  controller.start();
  let sequenceTimeout;
  try {
    await Promise.race([
      completed,
      new Promise((_, reject) => {
        sequenceTimeout = setTimeout(() => reject(new Error('Living Office industry sequence timed out.')), 500);
      })
    ]);
  } finally {
    clearTimeout(sequenceTimeout);
    controller.stop();
  }
  assert.deepEqual(frames, [
    '06:58/proizvodnja',
    '07:00/proizvodnja',
    '07:01/logistika',
    '07:06/logistika',
    '07:12/logistika'
  ]);
  dom.window.close();
});

test('reduced-motion način ostavlja samo jedan statičan okvir', () => {
  const { dom, feed } = createFeed();
  const frames = [];
  const controller = createLivingOfficeController({
    feed,
    resetControl: null,
    autoAdvance: false,
    onFrame: (frame) => frames.push(frame.time)
  });
  controller.start();
  controller.start();
  assert.deepEqual(frames, ['06:58']);
  controller.stop();
  dom.window.close();
});
