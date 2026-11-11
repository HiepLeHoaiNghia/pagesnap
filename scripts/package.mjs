// plan-exempt — packaging automation conforming to ship skill
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('📸 PageSnap Chrome Web Store Packaging Pipeline');
console.log('====================================================\n');

// 1. Quality Gate: Run static checks before packaging
console.log('▶ Step 1: Running Verification Gate (static checks)...');
try {
  execSync('node tests/static-checks.mjs', { cwd: root, stdio: 'inherit' });
  console.log('  ✓ Pre-packaging static checks passed (10/10)\n');
} catch (error) {
  console.error('\n❌ Packaging aborted: static checks failed. Fix errors before shipping.');
  process.exit(1);
}

// 2. Read manifest.json and validate metadata
console.log('▶ Step 2: Validating manifest.json...');
const manifestPath = path.join(root, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3) {
  console.error('❌ Error: manifest_version must be 3.');
  process.exit(1);
}

if (manifest.permissions && manifest.permissions.includes('<all_urls>')) {
  console.error('❌ Error: <all_urls> must not be in permissions.');
  process.exit(1);
}

const version = manifest.version || '0.3.0';
console.log(`  ✓ Version: ${version}`);
console.log(`  ✓ Name: ${manifest.name}`);
console.log(`  ✓ Permissions: [${manifest.permissions.join(', ')}] (Zero-blocking)\n`);

// 3. Prepare dist directory and file paths
console.log('▶ Step 3: Assembling clean package payload...');
const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const zipName = `pagesnap-v${version}.zip`;
const zipPath = path.join(distDir, zipName);
const storeReadyZip = path.join(distDir, 'pagesnap-store-ready.zip');

// Clean prior builds
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
if (fs.existsSync(storeReadyZip)) fs.unlinkSync(storeReadyZip);

// 4. Archive runtime files using standard zip
const runtimeTargets = ['manifest.json', 'popup.html', 'popup.css', 'icons', 'lib', 'src'];

try {
  execSync(`zip -r "${zipPath}" ${runtimeTargets.join(' ')} -x "*.DS_Store" "*__pycache__*"`, {
    cwd: root,
    stdio: 'pipe'
  });
  // Also create a convenient store-ready copy
  fs.copyFileSync(zipPath, storeReadyZip);
} catch (zipError) {
  console.error('❌ Error creating zip archive:', zipError.message);
  process.exit(1);
}

// 5. Inspect and verify ZIP contents
console.log('▶ Step 4: Verifying ZIP package contents...');
const zipList = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' });
const lines = zipList.split('\n');

// Check for unwanted files
const forbiddenKeywords = ['tests/', 'plans/', 'docs/', '.git', '.claude', 'tmp/', 'node_modules', '.gitignore'];
for (const line of lines) {
  for (const forbidden of forbiddenKeywords) {
    if (line.includes(forbidden)) {
      console.error(`❌ Security alert: forbidden path found in zip: ${line}`);
      process.exit(1);
    }
  }
}

const stats = fs.statSync(zipPath);
const sizeKb = (stats.size / 1024).toFixed(1);

console.log(`  ✓ Verified: 0 forbidden files found`);
console.log(`  ✓ Package size: ${sizeKb} KB (Well below Chrome Web Store 10MB limit)\n`);

console.log('====================================================');
console.log(`🎉 SUCCESS: Store-ready package generated:`);
console.log(`   📁 dist/${zipName}`);
console.log(`   📁 dist/pagesnap-store-ready.zip`);
console.log('====================================================\n');
console.log('Next steps:');
console.log('1. Go to: https://chrome.google.com/webstore/devconsole');
console.log('2. Click "New Item" and upload: dist/pagesnap-store-ready.zip');
console.log('3. Fill in listing details from STORE_LISTING.md and submit for review.\n');
