import test from 'node:test';
import assert from 'node:assert/strict';
import { getLivingOfficeFrame } from '../living-office.js';

test('living office vraća determinističke okvire', () => {
  assert.deepEqual(getLivingOfficeFrame(0), {
    time: '06:58',
    event: 'Marko Marić se prijavio.',
    index: 0,
    total: 5
  });
  assert.equal(getLivingOfficeFrame(3).time, '07:06');
});

test('living office ograničava nevažeći korak', () => {
  assert.equal(getLivingOfficeFrame(-10).index, 0);
  assert.equal(getLivingOfficeFrame(999).index, 4);
  assert.equal(getLivingOfficeFrame('nije-broj').index, 0);
});
