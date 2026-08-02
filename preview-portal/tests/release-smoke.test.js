import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resetDemo,
  startDemo,
  registerEmployee,
  resolveCorrection,
  approveLeave,
  reviewWorker,
  generateReport,
  getGuide
} from '../state.js';
import { createBusinessSummary } from '../business-summary.js';
import { createFinalExperienceModel } from '../final-experience.js';

test('release smoke: cijeli radni dan završava konzistentnim poslovnim rezultatom', () => {
  let state = startDemo(resetDemo({
    industry: 'Proizvodnja',
    employees: 68,
    locations: 2,
    shifts: 2
  }));

  state = registerEmployee(state);
  state = resolveCorrection(state);
  state = approveLeave(state);
  state = reviewWorker(state);
  state = generateReport(state);

  const guide = getGuide(state);
  assert.equal(guide.complete, true);
  assert.equal(guide.completed, 5);
  assert.equal(guide.progress, 100);
  assert.equal(state.presentCount, 48);

  const business = createBusinessSummary({
    profile: state.profile,
    summary: state.summary,
    presentCount: state.presentCount
  });
  assert.equal(business.industry, 'Proizvodnja');
  assert.equal(business.present, 48);
  assert.equal(business.planned, state.summary.planned);
  assert.match(business.attendanceLabel, /^48 od /);

  const final = createFinalExperienceModel({
    industry: business.industry,
    present: business.present,
    planned: business.planned
  });
  assert.equal(final.steps.length, 5);
  assert.equal(final.present, 48);
  assert.equal(final.planned, business.planned);
  assert.equal(final.attendanceRate, Math.round((48 / business.planned) * 100));
  assert.match(final.headline, /uspješno/);
});

test('release smoke: reset nakon završetka uklanja sav operativni napredak', () => {
  let state = startDemo(resetDemo());
  state = registerEmployee(state);
  state = resolveCorrection(state);
  state = approveLeave(state);
  state = reviewWorker(state);
  state = generateReport(state);

  const reset = resetDemo(state.profile);
  const guide = getGuide(reset);

  assert.equal(reset.started, false);
  assert.equal(reset.scanned, false);
  assert.equal(reset.presentCount, 47);
  assert.equal(reset.correctionResolved, false);
  assert.equal(reset.leaveApproved, false);
  assert.equal(reset.workerReviewed, false);
  assert.equal(reset.reportGenerated, false);
  assert.equal(guide.completed, 0);
  assert.equal(guide.complete, false);
});
