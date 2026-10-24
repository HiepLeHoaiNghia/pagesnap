// plan-exempt — split developer features into pagereplica-extension approved by user
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const collect = (dir, extensions = new Set(['.js', '.mjs'])) => {
  const files = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collect(full, extensions));
    else if (extensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
};

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const constantsUrl = pathToFileURL(path.join(root, 'src/shared/constants.js')).href;
const constants = await import(`${constantsUrl}?test=${Date.now()}`);

const allBundleFiles = [
  ...constants.CONTENT_BUNDLE
];

test('manifest is MV3 with module service worker and no static content scripts', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, 'src/background/index.js');
  assert.equal(manifest.background.type, 'module');
  assert.ok(!Object.hasOwn(manifest, 'content_scripts'));
  assert.ok(exists(manifest.background.service_worker));
});

test('all declared bundle paths exist', () => {
  for (const file of allBundleFiles) assert.ok(exists(file), `missing bundle file: ${file}`);
});

test('content bundle dependencies are ordered safely', () => {
  const index = (file) => constants.CONTENT_BUNDLE.indexOf(file);
  assert.ok(index('src/content/core/namespace.js') < index('src/content/markdown/handlers.js'));
  assert.ok(index('src/content/markdown/dom-preprocess.js') < index('src/content/markdown/turndown-config.js'));
  assert.ok(index('src/content/html-clone/serializer.js') < index('src/content/html-clone/zip-builder.js'));
});

test('all relative ES module imports resolve', () => {
  for (const file of collect('src')) {
    const source = read(file);
    for (const match of source.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"](\.[^'"]+)['"]/g)) {
      const target = path.resolve(root, path.dirname(file), match[1]);
      assert.ok(fs.existsSync(target), `broken import in ${file}: ${match[1]}`);
    }
  }
});

test('all literal runtime actions are canonical and orphan protocol is removed', () => {
  const files = collect('src');
  const source = files.map(read).join('\n');
  const canonical = new Set(Object.values(constants.ACTIONS));
  for (const match of source.matchAll(/action:\s*['"]([^'"]+)['"]/g)) {
    assert.ok(canonical.has(match[1]), `non-canonical runtime action: ${match[1]}`);
  }
  assert.ok(!source.includes('inspectElementClicked'));
  assert.ok(!source.includes('WEB2MD_INSPECTED_ELEMENT_CLICKED'));
});

test('required background and content actions are registered', () => {
  const background = collect('src/background').map(read).join('\n');
  const content = collect('src/content').map(read).join('\n');
  const requiredBackground = [
    'FETCH_EXTERNAL_STYLESHEET', 'FETCH_ASSET_AS_BASE64', 'FETCH_EXTERNAL_SCRIPT',
    'TRIGGER_DOWNLOAD', 'ENSURE_INJECTED'
  ];
  for (const name of requiredBackground) assert.ok(background.includes(`ACTIONS.${name}`), `missing background handler: ${name}`);
  const requiredContent = ['ping', 'extractContent', 'convertSelection', 'convertPage', 'convertHtmlToMarkdown', 'clonePage', 'toggleRegionSelection'];
  for (const action of requiredContent) assert.match(content, new RegExp(`(?:^|\\s)${action}:`), `missing content handler: ${action}`);
});

// plan-exempt — PageSnap branding update
test('PageSnap bundle references resolve to definitions', () => {
  const source = constants.CONTENT_BUNDLE
    .filter((file) => file.startsWith('src/content/'))
    .map(read)
    .join('\n');
  const used = new Set([...source.matchAll(/(?:PageSnap|Web2MD)\.([A-Za-z_$][\w$]*)/g)].map((match) => match[1]));
  const defined = new Set([...source.matchAll(/(?:PageSnap|Web2MD)\.([A-Za-z_$][\w$]*)\s*=/g)].map((match) => match[1]));
  defined.add('handlers');
  defined.add('registerHandlers');
  for (const name of used) assert.ok(defined.has(name), `undefined bundle reference: ${name}`);
});

test('content script injection is concurrent-safe and complete', async () => {
  const injected = [];
  globalThis.chrome = {
    tabs: {
      sendMessage: async () => { throw new Error('not injected'); }
    },
    scripting: {
      executeScript: async ({ files }) => {
        injected.push(files[0]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  };
  const injectorUrl = pathToFileURL(path.join(root, 'src/background/injector.js')).href;
  const injector = await import(`${injectorUrl}?concurrency=${Date.now()}`);
  const first = injector.ensureContentInjected(42, 0);
  const second = injector.ensureContentInjected(42, 0);
  assert.equal(first, second, 'concurrent callers must share one in-flight promise');
  assert.equal(await first, true);
  assert.equal(await second, true);

  assert.deepEqual(injected, constants.CONTENT_BUNDLE, 'each base file should inject exactly once in order');
  delete globalThis.chrome;
});

// plan-exempt — manifest permission check
test('manifest has no static content scripts and valid permissions', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.ok(!Object.hasOwn(manifest, 'content_scripts'));
  assert.ok(!manifest.permissions.includes('<all_urls>'));
  assert.ok(manifest.permissions.includes('activeTab'));
});

test('serializer targetElement path returns scoped nodeHtml', async () => {
  const source = read('src/content/html-clone/serializer.js');
  assert.match(source, /let serializedSelfContainedNode = null;/);
  assert.match(source, /serializedSelfContainedNode = serializeNode\(options\.targetElement, false\);/);
  assert.ok(!source.includes('const serializedSelfContainedNode ='));

  const PageSnap = {
    registerHandlers() {}
  };
  const Web2MD = PageSnap;
  const document = {
    baseURI: 'https://example.com/page',
    title: 'Example',
    documentElement: null,
    body: { querySelectorAll: () => [] },
    adoptedStyleSheets: [],
    styleSheets: [],
    scripts: [],
    querySelectorAll: () => []
  };
  const context = {
    PageSnap,
    Web2MD,
    window: { location: { href: document.baseURI } },
    document,
    Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 },
    URL,
    Blob,
    Uint8Array,
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    console,
    setTimeout,
    clearTimeout,
    chrome: { runtime: { sendMessage(_message, callback) { callback?.({ success: false }); } } }
  };
  context.window.window = context.window;
  context.window.document = document;
  context.window.getComputedStyle = context.getComputedStyle;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'serializer.js' });

  const textNode = { nodeType: 3, textContent: 'Selected text' };
  const target = {
    nodeType: 1,
    tagName: 'SECTION',
    attributes: [],
    childNodes: [textNode],
    querySelectorAll: () => [],
    matches: () => false,
    closest: () => null,
    style: { cssText: '' }
  };
  const result = await (PageSnap.serializePageToSelfContainedHtml || Web2MD.serializePageToSelfContainedHtml)({ targetElement: target, preserveJs: false });
  assert.match(result.nodeHtml, /<section[^>]*>Selected text<\/section>/i);
  assert.match(result.html, /<!DOCTYPE html>/i);
  assert.match(result.html, /Selected text/);
  assert.match(result.package.html, /Selected text/);
});
// plan-exempt — enforce 100% English invariant in static checks
test('repository source files in src/ are 100% English (no non-ASCII Vietnamese characters)', () => {
  const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  for (const file of collect('src')) {
    const content = read(file);
    const match = content.match(vietnameseRegex);
    assert.ok(!match, `Found non-English/Vietnamese text in ${file}: ${match ? match[0] : ''}`);
  }
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures++;
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
  }
}

if (failures) {
  console.error(`\n${failures}/${tests.length} checks failed`);
  process.exit(1);
}
console.log(`\n${tests.length} checks passed`);
