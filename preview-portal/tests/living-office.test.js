import test from 'node:test';
import assert from 'node:assert/strict';
import { appendLivingOfficeEvent, clearLivingOfficeEvents, getLivingOfficeFrame } from '../living-office.js';

test('living office vraća determinističke okvire', () => {
  assert.deepEqual(getLivingOfficeFrame(0), {
    time: '06:58',
    event: 'Marko Marić se prijavio.',
    index: 0,
    total: 5,
    industry: 'ostalo'
  });
  assert.equal(getLivingOfficeFrame(3).time, '07:06');
});

test('living office prilagođava događaje djelatnosti', () => {
  assert.match(getLivingOfficeFrame(1, 'Logistika').event, /skladišta/);
  assert.match(getLivingOfficeFrame(2, 'Građevina').event, /teren/);
  assert.match(getLivingOfficeFrame(4, 'Ured').event, /Voditelj tima/);
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

function createFeed() {
  const items = [];
  const ownerDocument = {
    createElement() {
      return {
        dataset: {},
        innerHTML: '',
        remove() {
          const index = items.indexOf(this);
          if (index >= 0) items.splice(index, 1);
        }
      };
    }
  };

  return {
    items,
    ownerDocument,
    append(item) { items.push(item); },
    querySelector(selector) {
      const key = selector.match(/"([^"]+)"/)?.[1];
      return items.find((item) => item.dataset.liveEvent === key) ?? null;
    },
    querySelectorAll() { return items.slice(); }
  };
}

test('live feed ne duplicira isti događaj i ograničava broj zapisa', () => {
  const feed = createFeed();
  assert.equal(appendLivingOfficeEvent(feed, getLivingOfficeFrame(0), 2), true);
  assert.equal(appendLivingOfficeEvent(feed, getLivingOfficeFrame(0), 2), false);
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(1), 2);
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(2), 2);
  assert.equal(feed.items.length, 2);
  assert.equal(feed.items[0].dataset.liveEvent, 'living-ostalo-1');
});

test('isti korak iz različitih djelatnosti ima odvojeni ključ', () => {
  const feed = createFeed();
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(0, 'Logistika'));
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(0, 'Ured'));
  assert.equal(feed.items.length, 2);
});

test('reset uklanja samo generirane live događaje', () => {
  const feed = createFeed();
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(0));
  appendLivingOfficeEvent(feed, getLivingOfficeFrame(1));
  clearLivingOfficeEvents(feed);
  assert.equal(feed.items.length, 0);
});
