const assert = require('node:assert/strict');
const test = require('node:test');

const time = require('../src/domain/time.js');

test('businessDays counts weekdays inclusively',()=>{
  assert.equal(time.businessDays('2026-07-06','2026-07-10'),5);
  assert.equal(time.businessDays('2026-07-10','2026-07-13'),2);
});

test('businessDays excludes configured holidays',()=>{
  assert.equal(time.businessDays('2026-07-06','2026-07-10',['2026-07-08']),4);
  assert.equal(time.businessDays('2026-07-06','2026-07-10',new Set(['2026-07-08','2026-07-09'])),3);
});

test('businessDays rejects incomplete or reversed ranges',()=>{
  assert.equal(time.businessDays('','2026-07-10'),0);
  assert.equal(time.businessDays('2026-07-10',''),0);
  assert.equal(time.businessDays('2026-07-11','2026-07-10'),0);
});
