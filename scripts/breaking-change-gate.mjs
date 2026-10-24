// plan-exempt — standard breaking change gate module
/**
 * PageSnap Breaking Change & Commit Governance Engine
 * Standards-compliant Conventional Commits parser and contract-based breaking change auditor.
 * Designed as a reusable Blueprint module for MemoryGrid projects.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const ALLOWED_TYPES = new Set([
  'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'
]);

/**
 * Parses a single commit message header and body according to Conventional Commits v1.0.0
 * @param {string} rawMessage
 * @returns {Object} Parsed commit object
 */
export function parseConventionalCommit(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return { isValid: false, error: 'Empty commit message' };
  }

  const lines = rawMessage.trim().split(/\r?\n/);
  const header = lines[0].trim();
  const body = lines.slice(1).join('\n').trim();

  // Pattern: <type>(<scope>)?: <subject> OR <type>!: <subject> OR <type>(<scope>)!: <subject>
  const headerRegex = /^([a-zA-Z0-9_-]+)(?:\(([a-zA-Z0-9_.\/-]+)\))?(!)?:\s+(.+)$/;
  const match = header.match(headerRegex);

  if (!match) {
    return {
      isValid: false,
      header,
      error: 'Header does not match Conventional Commits format: <type>(<scope>)?: <subject>'
    };
  }

  const [, type, scope, exclamation, subject] = match;
  const lowerType = type.toLowerCase();

  if (!ALLOWED_TYPES.has(lowerType)) {
    return {
      isValid: false,
      header,
      type: lowerType,
      error: `Type '${lowerType}' is not in allowed list: ${Array.from(ALLOWED_TYPES).join(', ')}`
    };
  }

  // Check breaking change indicators
  const hasExclamation = exclamation === '!';
  const hasBreakingFooter = /^(?:BREAKING CHANGE|BREAKING-CHANGE):\s*(.+)$/im.test(body);
  const isBreaking = hasExclamation || hasBreakingFooter;

  let bumpType = 'none';
  if (isBreaking) {
    bumpType = 'major';
  } else if (lowerType === 'feat') {
    bumpType = 'minor';
  } else if (['fix', 'perf', 'revert'].includes(lowerType)) {
    bumpType = 'patch';
  }

  return {
    isValid: true,
    type: lowerType,
    scope: scope || null,
    subject,
    body,
    isBreaking,
    hasExclamation,
    hasBreakingFooter,
    bumpType
  };
}

/**
 * Audits a sequence of commit messages (e.g. from git log base..HEAD)
 * @param {string[]} rawMessages
 * @returns {Object} Audit summary for the branch
 */
export function auditCommitSequence(rawMessages) {
  const parsedCommits = rawMessages.map(parseConventionalCommit);
  const invalidCommits = parsedCommits.filter(c => !c.isValid);
  const breakingCommits = parsedCommits.filter(c => c.isValid && c.isBreaking);

  let overallBump = 'none';
  if (breakingCommits.length > 0) {
    overallBump = 'major';
  } else if (parsedCommits.some(c => c.bumpType === 'minor')) {
    overallBump = 'minor';
  } else if (parsedCommits.some(c => c.bumpType === 'patch')) {
    overallBump = 'patch';
  }

  return {
    totalCommits: rawMessages.length,
    isValid: invalidCommits.length === 0,
    invalidCommits,
    hasBreakingCommit: breakingCommits.length > 0,
    breakingCommits,
    overallBump
  };
}

/**
 * Audits public contract differences between two states
 * Specifically checks:
 * 1. manifest.json permissions and host_permissions changes
 * 2. Exported action constants in src/shared/constants.js
 * @param {Object} baseline - { manifest, actions }
 * @param {Object} current - { manifest, actions }
 * @returns {Object} Contract break analysis
 */
export function auditContractBreaks(baseline, current) {
  const breaks = [];

  // 1. Manifest permissions audit
  if (baseline.manifest && current.manifest) {
    const basePerms = new Set(baseline.manifest.permissions || []);
    const currPerms = new Set(current.manifest.permissions || []);

    // Dropped permission is a breaking change for dependent scripts
    for (const p of basePerms) {
      if (!currPerms.has(p)) {
        breaks.push(`Dropped manifest permission: '${p}'`);
      }
    }

    // Adding <all_urls> is an invariant security break
    const currHosts = current.manifest.host_permissions || [];
    if (currHosts.includes('<all_urls>')) {
      breaks.push("Added broad host permission '<all_urls>' (violates least-privilege architecture invariant)");
    }
  }

  // 2. Action protocol audit
  if (baseline.actions && current.actions) {
    const baseActions = new Set(Object.keys(baseline.actions));
    const currActions = new Set(Object.keys(current.actions));

    for (const act of baseActions) {
      if (!currActions.has(act)) {
        breaks.push(`Deleted runtime action constant: ACTIONS.${act}`);
      }
    }
  }

  return {
    isContractBreaking: breaks.length > 0,
    breaks
  };
}

/**
 * Safely queries git log between two refs using execFileSync (no shell interpolation injection)
 * @param {string} baseRef
 * @param {string} headRef
 * @returns {string[]} Commit messages
 */
export function getGitCommitMessages(baseRef = 'origin/develop', headRef = 'HEAD') {
  try {
    const refRegex = /^[a-zA-Z0-9_.\/-]+$/;
    if (!refRegex.test(baseRef) || !refRegex.test(headRef)) {
      throw new Error(`Invalid git ref: ${baseRef} or ${headRef}`);
    }

    const output = execFileSync('git', ['log', `${baseRef}..${headRef}`, '--format=%B%x00'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    return output.split('\0').map(m => m.trim()).filter(Boolean);
  } catch (err) {
    return [];
  }
}
