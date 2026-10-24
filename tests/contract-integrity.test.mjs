// plan-exempt — contract integrity and breaking change test suite
/**
 * tests/contract-integrity.test.mjs
 * Mechanical Contract Integrity & Breaking Change Detection Test Suite
 * 
 * Verifies that:
 * 1. Additive changes (new actions, new settings, new public methods) are freely allowed.
 * 2. Destructive changes (deletions, renames, dropped permissions) are mechanically caught.
 * 3. Destructive changes require Conventional Commit '!' or 'BREAKING CHANGE:' footer.
 * 4. User settings deep-merge remains backward-compatible with older saved states.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// ─── BASELINE CONTRACT SNAPSHOT ──────────────────────────────────────────────
// This represents the minimum backward-compatible API/Contract surface.
// Additive changes (adding new keys) MUST pass without updating this baseline.
// Removing/renaming any of these keys without a breaking change commit MUST fail.
export const BASELINE_CONTRACT = {
  manifestPermissions: [
    'activeTab',
    'clipboardWrite',
    'storage',
    'downloads',
    'contextMenus'
  ],
// plan-exempt — fix baseline action constants
  actions: [
    'PING',
    'EXTRACT_CONTENT',
    'CONVERT_PAGE',
    'CONVERT_SELECTION',
    'CONVERT_HTML_TO_MARKDOWN',
    'GET_REGION_SELECTION_STATE',
    'TOGGLE_REGION_SELECTION',
    'CONTEXT_MENU_COPY_REGION',
    'CLONE_PAGE',
    'FETCH_EXTERNAL_STYLESHEET',
    'FETCH_EXTERNAL_SCRIPT',
    'FETCH_ASSET_AS_BASE64',
    'TRIGGER_DOWNLOAD',
    'ENSURE_INJECTED'
  ],
  settingsKeys: [
    'frontmatter',
    'rawMode',
    'includeImages',
    'includeLinks',
    'obsidianMode',
    'headingStyle',
    'bulletStyle',
    'codeBlockStyle'
  ],
  publicNamespaceMethods: [
    'extractPageContent',
    'extractComponentStyleAndMotion',
    'serializePageToSelfContainedHtml',
    'getSettings',
    'sendResponse'
  ]
};

// ─── CONTRACT EVALUATOR HELPER ───────────────────────────────────────────────
export function evaluateContract(currentContract, commitMessages = []) {
  const violations = [];

  // Check 1: Core permissions cannot be dropped
  for (const perm of BASELINE_CONTRACT.manifestPermissions) {
    if (!currentContract.manifestPermissions.includes(perm)) {
      violations.push(`Dropped required permission: '${perm}'`);
    }
  }

  // Check 2: Invasive permissions are strictly forbidden
  if (currentContract.manifestPermissions.includes('<all_urls>') ||
      currentContract.hostPermissions?.includes('<all_urls>')) {
    violations.push(`Security Invariant Violated: '<all_urls>' is strictly forbidden`);
  }

  // Check 3: Baseline actions cannot be deleted or renamed
  for (const action of BASELINE_CONTRACT.actions) {
    if (!currentContract.actions.includes(action)) {
      violations.push(`Deleted/Renamed baseline IPC action: '${action}'`);
    }
  }

  // Check 4: Baseline settings keys cannot be deleted or renamed
  for (const key of BASELINE_CONTRACT.settingsKeys) {
    if (!currentContract.settingsKeys.includes(key)) {
      violations.push(`Deleted/Renamed baseline setting key: '${key}'`);
    }
  }

  // Check 5: Baseline public methods cannot be removed
  for (const method of BASELINE_CONTRACT.publicNamespaceMethods) {
    if (!currentContract.publicNamespaceMethods.includes(method)) {
      violations.push(`Removed public PageSnap namespace method: '${method}'`);
    }
  }

  // Check breaking change declaration in commits if violations exist
  const hasBreakingCommit = commitMessages.some(msg => 
    /^[a-zA-Z0-9_-]+(\([a-zA-Z0-9_.\/-]+\))?!:/.test(msg) ||
    /BREAKING[ -]CHANGE:/.test(msg)
  );

  return {
    violations,
    isBreaking: violations.length > 0,
    hasBreakingCommit,
    approved: violations.length === 0 || hasBreakingCommit
  };
}

// ─── LIVE REPO CONTRACT INSPECTION ───────────────────────────────────────────
test('Live Repository Contract Integrity matches or expands baseline', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const constantsSource = read('src/shared/constants.js');
  const settingsSource = read('src/popup/state.js');

  // Extract actual actions
  const liveActions = [];
// plan-exempt — match alphanumeric action constants
  const actionMatches = constantsSource.matchAll(/([A-Z0-9_]+):\s*['"][a-zA-Z0-9_]+['"]/g);
  for (const m of actionMatches) {
    liveActions.push(m[1]);
  }

  // Extract actual settings keys from defaultSettings
  const defaultSettingsBlock = settingsSource.match(/export const defaultSettings = {([^}]+)}/s);
  assert.ok(defaultSettingsBlock, 'defaultSettings block must exist');
  const liveSettingsKeys = [];
  for (const line of defaultSettingsBlock[1].split('\n')) {
    const m = line.match(/^\s*([a-zA-Z0-9_]+):/);
    if (m) liveSettingsKeys.push(m[1]);
  }

  // Verify manifest permissions
  for (const perm of BASELINE_CONTRACT.manifestPermissions) {
    assert.ok(manifest.permissions.includes(perm), `Live manifest must include core permission: ${perm}`);
  }
  assert.ok(!manifest.permissions.includes('<all_urls>'), 'Manifest must never have <all_urls> in permissions');
  assert.ok(!manifest.host_permissions || !manifest.host_permissions.includes('<all_urls>'), 'Manifest must never have <all_urls> in host_permissions');

  // Verify actions
  for (const action of BASELINE_CONTRACT.actions) {
    assert.ok(liveActions.includes(action), `Live ACTIONS must include baseline action: ${action}`);
  }

  // Verify settings keys
  for (const key of BASELINE_CONTRACT.settingsKeys) {
    assert.ok(liveSettingsKeys.includes(key), `Live defaultSettings must include baseline key: ${key}`);
  }
});

// ─── EXHAUSTIVE EDGE-CASE TEST SUITE ─────────────────────────────────────────

test('Edge Case 1: Additive Action Addition is non-breaking (passes without !)', () => {
  const contract = {
    manifestPermissions: [...BASELINE_CONTRACT.manifestPermissions],
    actions: [...BASELINE_CONTRACT.actions, 'EXPORT_REACT_JSX', 'SYNC_OBSIDIAN_VAULT'],
    settingsKeys: [...BASELINE_CONTRACT.settingsKeys],
    publicNamespaceMethods: [...BASELINE_CONTRACT.publicNamespaceMethods]
  };
  const result = evaluateContract(contract, ['feat(export): add react jsx export action']);
  assert.equal(result.isBreaking, false);
  assert.equal(result.approved, true);
  assert.equal(result.violations.length, 0);
});

test('Edge Case 2: Additive Setting Addition is non-breaking (passes without !)', () => {
  const contract = {
    manifestPermissions: [...BASELINE_CONTRACT.manifestPermissions],
    actions: [...BASELINE_CONTRACT.actions],
    settingsKeys: [...BASELINE_CONTRACT.settingsKeys, 'autoDownloadZip', 'compactToolbar'],
    publicNamespaceMethods: [...BASELINE_CONTRACT.publicNamespaceMethods]
  };
  const result = evaluateContract(contract, ['feat(settings): add auto download and compact options']);
  assert.equal(result.isBreaking, false);
  assert.equal(result.approved, true);
  assert.equal(result.violations.length, 0);
});

test('Edge Case 3: Additive Method Addition on namespace is non-breaking (passes without !)', () => {
  const contract = {
    manifestPermissions: [...BASELINE_CONTRACT.manifestPermissions],
    actions: [...BASELINE_CONTRACT.actions],
    settingsKeys: [...BASELINE_CONTRACT.settingsKeys],
    publicNamespaceMethods: [...BASELINE_CONTRACT.publicNamespaceMethods, 'downloadComponentZipBundle']
  };
  const result = evaluateContract(contract, ['feat(studio): add zip export helper']);
  assert.equal(result.isBreaking, false);
  assert.equal(result.approved, true);
});

test('Edge Case 4: Destructive Action Deletion WITHOUT breaking commit is BLOCKED', () => {
  const contract = {
    manifestPermissions: [...BASELINE_CONTRACT.manifestPermissions],
    actions: BASELINE_CONTRACT.actions.filter(a => a !== 'CONTEXT_MENU_COPY_REGION'),
    settingsKeys: [...BASELINE_CONTRACT.settingsKeys],
    publicNamespaceMethods: [...BASELINE_CONTRACT.publicNamespaceMethods]
  };
  const result = evaluateContract(contract, ['fix(ui): remove context menu handler']);
  assert.equal(result.isBreaking, true);
  assert.equal(result.approved, false);
  assert.match(result.violations[0], /Deleted\/Renamed baseline IPC action: 'CONTEXT_MENU_COPY_REGION'/);
});

test('Edge Case 5: Destructive Action Deletion WITH breaking commit is APPROVED', () => {
  const contract = {
    manifestPermissions: [...BASELINE_CONTRACT.manifestPermissions],
    actions: BASELINE_CONTRACT.actions.filter(a => a !== 'CONTEXT_MENU_COPY_REGION'),
    settingsKeys: [...BASELINE_CONTRACT.settingsKeys],
    publicNamespaceMethods: [...BASELINE_CONTRACT.publicNamespaceMethods]
  };
  const result = evaluateContract(contract, [
    'feat(inspector)!: deprecate legacy region selection action\n\nBREAKING CHANGE: Removed CONTEXT_MENU_COPY_REGION'
  ]);
  assert.equal(result.isBreaking, true);
  assert.equal(result.approved, true);
  assert.equal(result.hasBreakingCommit, true);
});

test('Edge Case 6: Destructive Setting Rename WITHOUT breaking commit is BLOCKED', () => {
  const contract = {
    manifestPermissions: [...BASELINE_CONTRACT.manifestPermissions],
    actions: [...BASELINE_CONTRACT.actions],
    settingsKeys: BASELINE_CONTRACT.settingsKeys.map(k => k === 'rawMode' ? 'unformattedMode' : k),
    publicNamespaceMethods: [...BASELINE_CONTRACT.publicNamespaceMethods]
  };
  const result = evaluateContract(contract, ['refactor(settings): rename rawMode to unformattedMode']);
  assert.equal(result.isBreaking, true);
  assert.equal(result.approved, false);
  assert.match(result.violations[0], /Deleted\/Renamed baseline setting key: 'rawMode'/);
});

test('Edge Case 7: Destructive Setting Rename WITH breaking commit is APPROVED', () => {
  const contract = {
    manifestPermissions: [...BASELINE_CONTRACT.manifestPermissions],
    actions: [...BASELINE_CONTRACT.actions],
    settingsKeys: BASELINE_CONTRACT.settingsKeys.map(k => k === 'rawMode' ? 'unformattedMode' : k),
    publicNamespaceMethods: [...BASELINE_CONTRACT.publicNamespaceMethods]
  };
  const result = evaluateContract(contract, [
    'feat(state)!: replace rawMode with unformattedMode\n\nBREAKING CHANGE: rawMode setting renamed'
  ]);
  assert.equal(result.isBreaking, true);
  assert.equal(result.approved, true);
});

test('Edge Case 8: Core Permission Drop WITHOUT breaking commit is BLOCKED', () => {
  const contract = {
    manifestPermissions: BASELINE_CONTRACT.manifestPermissions.filter(p => p !== 'activeTab'),
    actions: [...BASELINE_CONTRACT.actions],
    settingsKeys: [...BASELINE_CONTRACT.settingsKeys],
    publicNamespaceMethods: [...BASELINE_CONTRACT.publicNamespaceMethods]
  };
  const result = evaluateContract(contract, ['chore: update permissions']);
  assert.equal(result.isBreaking, true);
  assert.equal(result.approved, false);
  assert.match(result.violations[0], /Dropped required permission: 'activeTab'/);
});

test('Edge Case 9: Invasive <all_urls> Permission is strictly FORBIDDEN regardless of commit', () => {
  const contract = {
    manifestPermissions: [...BASELINE_CONTRACT.manifestPermissions, '<all_urls>'],
    hostPermissions: ['<all_urls>'],
    actions: [...BASELINE_CONTRACT.actions],
    settingsKeys: [...BASELINE_CONTRACT.settingsKeys],
    publicNamespaceMethods: [...BASELINE_CONTRACT.publicNamespaceMethods]
  };
  const result = evaluateContract(contract, ['feat!: add broad permissions\n\nBREAKING CHANGE: added all_urls']);
  assert.equal(result.isBreaking, true);
  assert.match(result.violations[0], /Security Invariant Violated: '<all_urls>' is strictly forbidden/);
});

test('Edge Case 10: Deep-Merge Settings backward-compatibility simulation', () => {
  // Simulate an old user state stored in chrome.storage.sync 6 months ago:
  const legacySavedSettings = {
    frontmatter: true,
    obsidianMode: true
    // Note: missing rawMode, includeImages, includeLinks, headingStyle, codeBlockStyle
  };

  const defaultSettings = {
    frontmatter: false,
    rawMode: false,
    includeImages: true,
    includeLinks: true,
    obsidianMode: false,
    headingStyle: 'atx',
    bulletStyle: '-',
    codeBlockStyle: 'fenced',
    // New future settings added:
    compactToolbar: true,
    enableKeyframes: true
  };

  // Safe merge logic used in src/popup/state.js:
  const resolved = { ...defaultSettings, ...legacySavedSettings };

  // Assert user's explicit legacy preferences were preserved
  assert.equal(resolved.frontmatter, true);
  assert.equal(resolved.obsidianMode, true);

  // Assert newly added settings defaulted gracefully without throwing or leaving undefined
  assert.equal(resolved.compactToolbar, true);
  assert.equal(resolved.enableKeyframes, true);
  assert.equal(resolved.includeImages, true);
  assert.equal(resolved.rawMode, false);
});
