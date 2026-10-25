// plan-exempt — verification test suite for Full Page extraction and download MIME fixes
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
  assert.match(popupCloneSource, /type:\s*['"]application\/zip['"]/, 'html-clone must declare application/zip MIME');
});

// plan-exempt — verify FileReader data URL download pattern
test('downloadFile in popup/extract.js uses safe FileReader data URL', () => {
  const popupExtractSource = read('src/popup/extract.js');
  assert.match(popupExtractSource, /new Blob\(\[content\],\s*\{\s*type:\s*mimeType\s*\}\)/, 'Must create native Blob with MIME type');
  assert.match(popupExtractSource, /new FileReader\(\)/, 'Must use FileReader to convert blob to data URL');
});
