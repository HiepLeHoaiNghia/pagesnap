// plan-exempt — verification test suite for Full Page extraction and download MIME fixes
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// plan-exempt — helper functions for tests
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
test('extractor captures intact rawContent before Readability in-place mutation', () => {
  const extractorSource = read('src/content/markdown/extractor.js');
  // Must capture initialRawHtml before Readability is initialized
  const rawCaptureIdx = extractorSource.indexOf('const initialRawHtml =');
  const readerInitIdx = extractorSource.indexOf('new Readability(docClone)');
  assert.ok(rawCaptureIdx !== -1, 'initialRawHtml must be defined');
  assert.ok(readerInitIdx !== -1, 'Readability init must exist');
  assert.ok(rawCaptureIdx < readerInitIdx, 'initialRawHtml MUST be captured BEFORE new Readability(docClone)');
});

test('popup extract has resilient fallback when raw content produces empty markdown', () => {
  const popupExtractSource = read('src/popup/extract.js');
  assert.match(popupExtractSource, /if \(!markdown \|\| markdown\.trim\(\)\.length === 0\)/, 'Must have empty markdown safety fallback');
});

test('zip-builder and style-extractor specify application/zip MIME type', () => {
  const zipBuilderSource = read('src/content/html-clone/zip-builder.js');
  const styleExtractorSource = read('src/content/style-extractor/style-extractor.js');
  const popupCloneSource = read('src/popup/html-clone.js');

  assert.match(zipBuilderSource, /mimeType:\s*['"]application\/zip['"]/, 'zip-builder must declare application/zip MIME');
  assert.match(styleExtractorSource, /mimeType:\s*['"]application\/zip['"]/, 'style-extractor must declare application/zip MIME');
  assert.match(popupCloneSource, /application\/zip/, 'html-clone must declare application/zip MIME');
});

// plan-exempt — verify direct downloadFile in popup uses in-popup anchor to ensure exact filename preservation
test('downloadFile in popup/extract.js uses in-popup anchor to preserve exact filename on Chromium 150+', () => {
  const popupExtractSource = read('src/popup/extract.js');
  assert.match(popupExtractSource, /FileReader/, 'Must use FileReader to generate data URL for small files');
  assert.match(popupExtractSource, /readAsDataURL/, 'Must call readAsDataURL');
  assert.match(popupExtractSource, /a\.download\s*=\s*filename/, 'Must assign exact filename to anchor download attribute');
  assert.match(popupExtractSource, /a\.click\(\)/, 'Must trigger anchor click directly in popup');
});

// plan-exempt — TDD test verifying download.js uses chrome.downloads with filename and waits for complete
test('TDD: download.js uses chrome.downloads.download with exact filename and waits for complete state', () => {
  const downloadJs = read('src/download/download.js');
  assert.match(downloadJs, /chrome\.downloads\.download/, 'Must call chrome.downloads.download API');
  assert.match(downloadJs, /filename:\s*item\.filename/, 'Must pass item.filename explicitly');
  assert.match(downloadJs, /chrome\.downloads\.onChanged\.addListener/, 'Must listen to onChanged for completion');
  assert.match(downloadJs, /state\.current\s*===\s*['"]complete['"]/, 'Must wait for state === complete');
});
