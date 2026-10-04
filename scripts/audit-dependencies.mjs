import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const projects = [
  { name: 'root', directory: repositoryRoot },
  { name: 'backend', directory: path.join(repositoryRoot, 'backend') },
]

const retryDelaysMs = [15_000, 30_000]
const retryableAuditError = new RegExp(
  [
    'audit endpoint returned an error',
    'invalid json response body',
    'service unavailable',
    'internal server error',
    'bad gateway',
    'gateway timeout',
    'socket hang up',
    'network(?: request)? (?:error|failed)',
    'fetch failed',
    'EAI_AGAIN',
    'ECONNRESET',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ETIMEDOUT',
  ].join('|'),
  'i',
)

export class AuditFailure extends Error {
  constructor(kind, message) {
    super(message)
    this.name = 'AuditFailure'
    this.kind = kind
  }
}

function parseAuditReport(stdout) {
  try {
    const report = JSON.parse(stdout)
    const counts = report?.metadata?.vulnerabilities
    const severityLevels = ['info', 'low', 'moderate', 'high', 'critical']
    if (
      typeof report !== 'object' ||
      report === null ||
      !Number.isInteger(report.auditReportVersion) ||
      report.auditReportVersion < 1 ||
      typeof report.vulnerabilities !== 'object' ||
      report.vulnerabilities === null ||
      Array.isArray(report.vulnerabilities) ||
      typeof counts !== 'object' ||
      counts === null ||
      severityLevels.some((level) => !Number.isInteger(counts[level]) || counts[level] < 0) ||
      !Number.isInteger(counts.total) ||
      counts.total < 0 ||
      severityLevels.reduce((total, level) => total + counts[level], 0) !== counts.total
    ) {
      return null
    }
    return report
  } catch {
    return null
  }
}

export function classifyAuditResult(result) {
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  const report = parseAuditReport(stdout)

  if (report) {
    const { high, critical } = report.metadata.vulnerabilities
    if (high > 0 || critical > 0) {
      return { type: 'vulnerability', report }
    }
    if (result.status === 0) {
      return { type: 'pass', report }
    }
    return {
      type: 'fatal',
      reason: 'npm returned a non-zero status with a valid report below the configured threshold',
    }
  }

  if (result.status === 0) {
    return { type: 'fatal', reason: 'npm returned success without a valid JSON audit report' }
  }

  const diagnostic = [stdout, stderr, result.error?.message].filter(Boolean).join('\n')
  if (result.error?.code === 'ETIMEDOUT' || retryableAuditError.test(diagnostic)) {
    return { type: 'retryable', reason: 'the npm audit service or transport did not return usable evidence' }
  }

  return {
    type: 'fatal',
    reason: 'npm audit failed without a valid vulnerability report or a recognized transient endpoint error',
  }
}

export function runNpmAudit(directory) {
  const auditArguments = [
    'audit',
    '--json',
    '--audit-level=high',
    '--package-lock-only',
    '--ignore-scripts',
    '--include=prod',
    '--include=dev',
    '--include=optional',
    '--include=peer',
    '--fetch-retries=0',
    '--fetch-timeout=30000',
  ]
  const executable = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm'
  const argumentsForPlatform =
    process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd', ...auditArguments] : auditArguments

  return spawnSync(executable, argumentsForPlatform, {
    cwd: directory,
    encoding: 'utf8',
    timeout: 90_000,
    windowsHide: true,
  })
}

function conciseDiagnostic(result) {
  const diagnostic = [result.stderr, result.stdout, result.error?.message]
    .filter(Boolean)
    .join('\n')
    .trim()
  return diagnostic.length > 4_000 ? `${diagnostic.slice(0, 4_000)}\n[diagnostic truncated]` : diagnostic
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function auditProject(
  project,
  {
    runAudit = runNpmAudit,
    sleep = wait,
    delaysMs = retryDelaysMs,
    logger = console,
  } = {},
) {
  const maximumAttempts = delaysMs.length + 1

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    logger.log(`[audit] ${project.name}: attempt ${attempt}/${maximumAttempts}`)
    const result = runAudit(project.directory)
    const classification = classifyAuditResult(result)

    if (classification.type === 'pass') {
      const counts = classification.report.metadata.vulnerabilities
      logger.log(
        `[audit] ${project.name}: PASS (high=${counts.high}, critical=${counts.critical}, total=${counts.total})`,
      )
      return classification.report
    }

    if (classification.type === 'vulnerability') {
      const counts = classification.report.metadata.vulnerabilities
      logger.error(conciseDiagnostic(result))
      throw new AuditFailure(
        'vulnerability',
        `${project.name} dependency audit found HIGH/CRITICAL vulnerabilities (high=${counts.high}, critical=${counts.critical})`,
      )
    }

    if (classification.type === 'fatal') {
      logger.error(conciseDiagnostic(result))
      throw new AuditFailure('fatal', `${project.name} dependency audit failed: ${classification.reason}`)
    }

    if (attempt === maximumAttempts) {
      logger.error(conciseDiagnostic(result))
      throw new AuditFailure(
        'unavailable',
        `${project.name} dependency audit evidence is unavailable after ${maximumAttempts} attempts`,
      )
    }

    const delayMs = delaysMs[attempt - 1]
    logger.warn(
      `[audit] ${project.name}: ${classification.reason}; retrying in ${delayMs / 1_000}s`,
    )
    await sleep(delayMs)
  }

  throw new AuditFailure('fatal', `${project.name} dependency audit reached an invalid state`)
}

export async function auditAllProjects(options) {
  for (const project of projects) {
    await auditProject(project, options)
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null
if (invokedPath === import.meta.url) {
  try {
    await auditAllProjects()
    console.log('[audit] PASS: root and backend committed dependency graphs produced usable evidence')
  } catch (error) {
    console.error(`[audit] FAIL (${error.kind ?? 'unexpected'}): ${error.message}`)
    process.exitCode = 1
  }
}
