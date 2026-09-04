import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AuditFailure,
  auditProject,
  classifyAuditResult,
} from '../scripts/audit-dependencies.mjs'

function report({ high = 0, critical = 0, total = high + critical } = {}) {
  return JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: {
      vulnerabilities: { info: 0, low: 0, moderate: 0, high, critical, total },
    },
  })
}

test('accepts only a successful schema-valid audit report', () => {
  assert.equal(classifyAuditResult({ status: 0, stdout: report(), stderr: '' }).type, 'pass')
  assert.equal(classifyAuditResult({ status: 0, stdout: '{}', stderr: '' }).type, 'fatal')
  assert.equal(classifyAuditResult({ status: 0, stdout: 'not json', stderr: '' }).type, 'fatal')
  assert.equal(
    classifyAuditResult({ status: 0, stdout: report({ high: 1, total: 0 }), stderr: '' }).type,
    'fatal',
  )
})

test('classifies HIGH or CRITICAL findings as vulnerabilities before endpoint errors', () => {
  assert.equal(
    classifyAuditResult({
      status: 1,
      stdout: report({ high: 1, critical: 1 }),
      stderr: 'npm error audit endpoint returned an error',
    }).type,
    'vulnerability',
  )
})

test('classifies observed audit endpoint failures as retryable', () => {
  assert.equal(
    classifyAuditResult({
      status: 1,
      stdout: '',
      stderr: 'npm warn audit 503 Service Unavailable\nnpm error audit endpoint returned an error',
    }).type,
    'retryable',
  )
  assert.equal(
    classifyAuditResult({
      status: 1,
      stdout: '',
      stderr: '400 Bad Request: Invalid package tree\nnpm error audit endpoint returned an error',
    }).type,
    'retryable',
  )
})

test('retries transient failures with bounded backoff and then accepts evidence', async () => {
  const results = [
    { status: 1, stdout: '', stderr: 'npm error audit endpoint returned an error' },
    { status: 1, stdout: '', stderr: 'npm error ETIMEDOUT' },
    { status: 0, stdout: report(), stderr: '' },
  ]
  const waits = []
  let calls = 0

  await auditProject(
    { name: 'test', directory: '.' },
    {
      runAudit: () => results[calls++],
      sleep: async (milliseconds) => waits.push(milliseconds),
      delaysMs: [10, 20],
      logger: { log() {}, warn() {}, error() {} },
    },
  )

  assert.equal(calls, 3)
  assert.deepEqual(waits, [10, 20])
})

test('fails immediately without retrying a genuine vulnerability report', async () => {
  let calls = 0

  await assert.rejects(
    auditProject(
      { name: 'test', directory: '.' },
      {
        runAudit: () => {
          calls += 1
          return { status: 1, stdout: report({ high: 1 }), stderr: '' }
        },
        sleep: async () => assert.fail('vulnerability findings must not retry'),
        delaysMs: [10, 20],
        logger: { log() {}, warn() {}, error() {} },
      },
    ),
    (error) => error instanceof AuditFailure && error.kind === 'vulnerability',
  )

  assert.equal(calls, 1)
})

test('fails closed after the final unavailable audit attempt', async () => {
  let calls = 0

  await assert.rejects(
    auditProject(
      { name: 'test', directory: '.' },
      {
        runAudit: () => {
          calls += 1
          return { status: 1, stdout: '', stderr: 'npm error audit endpoint returned an error' }
        },
        sleep: async () => {},
        delaysMs: [10, 20],
        logger: { log() {}, warn() {}, error() {} },
      },
    ),
    (error) => error instanceof AuditFailure && error.kind === 'unavailable',
  )

  assert.equal(calls, 3)
})
