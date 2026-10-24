// plan-exempt — comprehensive breaking change and commit governance test suite
import assert from 'node:assert/strict';
import {
  parseConventionalCommit,
  auditCommitSequence,
  auditContractBreaks,
  getGitCommitMessages,
  ALLOWED_TYPES
} from '../scripts/breaking-change-gate.mjs';

console.log('▶ Running Breaking Change & Conventional Commit Edge-Case Tests...\n');

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    process.exit(1);
  }
}

// ==========================================
// 1. Commit Parser Edge Cases
// ==========================================

test('Edge Case 1: Standard feature commit without breaking change', () => {
  const parsed = parseConventionalCommit('feat(studio): add new button');
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.type, 'feat');
  assert.equal(parsed.scope, 'studio');
  assert.equal(parsed.subject, 'add new button');
  assert.equal(parsed.isBreaking, false);
  assert.equal(parsed.bumpType, 'minor');
});

test('Edge Case 2: Standard bugfix commit without breaking change', () => {
  const parsed = parseConventionalCommit('fix(popup): handle null active tab');
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.type, 'fix');
  assert.equal(parsed.isBreaking, false);
  assert.equal(parsed.bumpType, 'patch');
});

test('Edge Case 3: Breaking change feature with exclamation mark (feat!:) triggers MAJOR bump', () => {
  const parsed = parseConventionalCommit('feat(inspector)!: replace legacy region-select with unified studio');
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.type, 'feat');
  assert.equal(parsed.hasExclamation, true);
  assert.equal(parsed.isBreaking, true);
  assert.equal(parsed.bumpType, 'major');
});

test('Edge Case 4: Breaking change fix with exclamation mark (fix!:) triggers MAJOR bump', () => {
  const parsed = parseConventionalCommit('fix(api)!: remove deprecated v1 callback format');
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.type, 'fix');
  assert.equal(parsed.hasExclamation, true);
  assert.equal(parsed.isBreaking, true);
  assert.equal(parsed.bumpType, 'major');
});

test('Edge Case 5: Breaking change declared via BREAKING CHANGE footer triggers MAJOR bump', () => {
  const msg = [
    'feat(export): restructure component export format',
    '',
    'Refactors the internal export object.',
    '',
    'BREAKING CHANGE: The exported JSON now returns separate htmlOnly and cssOnly fields.'
  ].join('\n');
  const parsed = parseConventionalCommit(msg);
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.hasBreakingFooter, true);
  assert.equal(parsed.isBreaking, true);
  assert.equal(parsed.bumpType, 'major');
});

test('Edge Case 6: Breaking change declared via BREAKING-CHANGE footer triggers MAJOR bump', () => {
  const msg = [
    'refactor(storage): migrate settings keys',
    '',
    'BREAKING-CHANGE: storage key "featureFlags" renamed to "pagesnapFlags"'
  ].join('\n');
  const parsed = parseConventionalCommit(msg);
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.hasBreakingFooter, true);
  assert.equal(parsed.isBreaking, true);
  assert.equal(parsed.bumpType, 'major');
});

test('Edge Case 7: Invalid commit type rejected', () => {
  const parsed = parseConventionalCommit('random(module): some commit message');
  assert.equal(parsed.isValid, false);
  assert.match(parsed.error, /is not in allowed list/);
});

test('Edge Case 8: Malformed header rejected (missing colon / bad punctuation)', () => {
  const parsed1 = parseConventionalCommit('feat:! broken syntax');
  assert.equal(parsed1.isValid, false);

  const parsed2 = parseConventionalCommit('just a plain commit message without type');
  assert.equal(parsed2.isValid, false);
});

test('Edge Case 9: Empty or invalid input handled safely', () => {
  assert.equal(parseConventionalCommit('').isValid, false);
  assert.equal(parseConventionalCommit(null).isValid, false);
  assert.equal(parseConventionalCommit(undefined).isValid, false);
});

// ==========================================
// 2. Commit Sequence & Branch Audit Edge Cases
// ==========================================

test('Edge Case 10: Multi-commit branch correctly aggregates to MAJOR if any commit is breaking', () => {
  const commits = [
    'chore: update dependencies',
    'fix: fix minor button alignment',
    'feat(studio)!: replace legacy inspector architecture',
    'docs: update README guide'
  ];
  const audit = auditCommitSequence(commits);
  assert.equal(audit.isValid, true);
  assert.equal(audit.hasBreakingCommit, true);
  assert.equal(audit.overallBump, 'major');
});

test('Edge Case 11: Multi-commit branch aggregates to MINOR when feat is highest', () => {
  const commits = [
    'chore: update dependencies',
    'fix: fix minor button alignment',
    'feat: add new download button'
  ];
  const audit = auditCommitSequence(commits);
  assert.equal(audit.isValid, true);
  assert.equal(audit.hasBreakingCommit, false);
  assert.equal(audit.overallBump, 'minor');
});

test('Edge Case 12: Multi-commit branch flags invalid commit formats', () => {
  const commits = [
    'fix: valid fix',
    'bad commit without format'
  ];
  const audit = auditCommitSequence(commits);
  assert.equal(audit.isValid, false);
  assert.equal(audit.invalidCommits.length, 1);
});

// ==========================================
// 3. Contract Break Audit Edge Cases
// ==========================================

test('Edge Case 13: Manifest dropped permission triggers contract break', () => {
  const baseline = { manifest: { permissions: ['activeTab', 'storage', 'clipboardWrite'] } };
  const current = { manifest: { permissions: ['activeTab', 'storage'] } }; // dropped clipboardWrite
  const result = auditContractBreaks(baseline, current);
  assert.equal(result.isContractBreaking, true);
  assert.ok(result.breaks.some(b => b.includes("Dropped manifest permission: 'clipboardWrite'")));
});

test('Edge Case 14: Adding <all_urls> to host_permissions triggers invariant break', () => {
  const baseline = { manifest: { host_permissions: [] } };
  const current = { manifest: { host_permissions: ['<all_urls>'] } };
  const result = auditContractBreaks(baseline, current);
  assert.equal(result.isContractBreaking, true);
  assert.ok(result.breaks.some(b => b.includes("Added broad host permission '<all_urls>'")));
});

test('Edge Case 15: Deleted runtime action in ACTIONS triggers contract break', () => {
  const baseline = { actions: { PING: 'ping', EXTRACT: 'extract', DEPRECATED_ACTION: 'deprecated' } };
  const current = { actions: { PING: 'ping', EXTRACT: 'extract' } };
  const result = auditContractBreaks(baseline, current);
  assert.equal(result.isContractBreaking, true);
  assert.ok(result.breaks.some(b => b.includes('ACTIONS.DEPRECATED_ACTION')));
});

test('Edge Case 16: Adding new actions or non-breaking manifest permissions passes', () => {
  const baseline = {
    manifest: { permissions: ['activeTab', 'storage'] },
    actions: { PING: 'ping' }
  };
  const current = {
    manifest: { permissions: ['activeTab', 'storage', 'downloads'] },
    actions: { PING: 'ping', NEW_ACTION: 'newAction' }
  };
  const result = auditContractBreaks(baseline, current);
  assert.equal(result.isContractBreaking, false);
  assert.equal(result.breaks.length, 0);
});

// ==========================================
// 4. Security Edge Case: Command Injection Defense
// ==========================================

test('Edge Case 17: Malicious git ref injection strictly rejected without shell execution', () => {
  const maliciousRef = 'origin/develop; rm -rf /; echo hack';
  const res = getGitCommitMessages(maliciousRef, 'HEAD');
  assert.deepEqual(res, [], 'Malicious ref must fail validation and return empty array safely');
});

console.log(`\n🎉 All ${passCount}/${passCount} Breaking Change & Conventional Commit edge cases passed 100%!\n`);
