import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));
const collect = (dir, extensions = new Set(['.js', '.mjs'])) => {
  const entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    return entry.isDirectory() ? collect(relative, extensions) : extensions.has(path.extname(entry.name)) ? [relative] : [];
  });
};

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const constantsUrl = pathToFileURL(path.join(root, 'src/shared/constants.js')).href;
const constants = await import(`${constantsUrl}?test=${Date.now()}`);

const allBundleFiles = [
  ...constants.CONTENT_BUNDLE,
  ...constants.MOCK_BRIDGE_FILES,
  constants.ISOLATED_BRIDGE_FILE,
  ...constants.MAIN_WORLD_CORE,
  ...constants.MAIN_WORLD_API,
  ...constants.MAIN_WORLD_VFS,
  ...constants.MAIN_WORLD_INSPECTOR
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
  assert.ok(index('src/content/html-clone/mock-stub.js') < index('src/content/html-clone/serializer.js'));
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
    'RESET_API_CALLS', 'RECORD_API_CALL', 'GET_API_CALLS', 'SAVE_MOCK_FROM_WEB',
    'UPDATE_API_CALL', 'DELETE_API_CALL', 'SET_MOCKING_ENABLED', 'GET_MOCKING_ENABLED',
    'CLEAR_ALL_MOCKS', 'REGISTER_PROJECT', 'GET_PROJECT', 'FETCH_EXTERNAL_STYLESHEET',
    'FETCH_ASSET_AS_BASE64', 'FETCH_EXTERNAL_SCRIPT', 'TRIGGER_DOWNLOAD', 'ENSURE_INJECTED'
  ];
  for (const name of requiredBackground) assert.ok(background.includes(`ACTIONS.${name}`), `missing background handler: ${name}`);
  const requiredContent = ['ping', 'extractContent', 'convertPage', 'convertHtmlToMarkdown', 'clonePage', 'toggleRegionSelection', 'toggleVisualEdit', 'toggleInspect'];
  for (const action of requiredContent) assert.match(content, new RegExp(`(?:^|\\s)${action}:`), `missing content handler: ${action}`);
});

test('Web2MD bundle references resolve to definitions', () => {
  const source = constants.CONTENT_BUNDLE
    .filter((file) => file.startsWith('src/content/'))
    .concat(constants.MOCK_BRIDGE_FILES)
    .map(read)
    .join('\n');
  const used = new Set([...source.matchAll(/Web2MD\.([A-Za-z_$][\w$]*)/g)].map((match) => match[1]));
  const defined = new Set([...source.matchAll(/Web2MD\.([A-Za-z_$][\w$]*)\s*=/g)].map((match) => match[1]));
  defined.add('handlers');
  defined.add('registerHandlers');
  for (const name of used) assert.ok(defined.has(name), `undefined Web2MD reference: ${name}`);
});

test('conditional bridge injection is concurrent-safe and complete', async () => {
  const relay = read('src/content/mock-bridge/relay.js');
  assert.ok(relay.includes('__web2md_mock_bridge_initialized__'));
  assert.ok(read('src/isolated-bridge.js').includes('__web2md_isolated_bridge_initialized__'));

  const injected = [];
  globalThis.chrome = {
    tabs: {
      sendMessage: async () => { throw new Error('not injected'); }
    },
    scripting: {
      executeScript: async ({ files }) => {
        injected.push(files[0]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      },
      getRegisteredContentScripts: async () => [],
      registerContentScripts: async () => {},
      unregisterContentScripts: async () => {}
    },
    storage: {
      sync: { get: (_key, callback) => callback({ featureFlags: { apiMock: true } }) },
      onChanged: { addListener() {} }
    }
  };
  const injectorUrl = pathToFileURL(path.join(root, 'src/background/injector.js')).href;
  const injector = await import(`${injectorUrl}?concurrency=${Date.now()}`);
  const first = injector.ensureContentInjected(42, 0);
  const second = injector.ensureContentInjected(42, 0);
  assert.equal(first, second, 'concurrent callers must share one in-flight promise');
  assert.equal(await first, true);
  assert.equal(await second, true);

  const expected = [...constants.CONTENT_BUNDLE, ...constants.MOCK_BRIDGE_FILES, constants.ISOLATED_BRIDGE_FILE];
  assert.deepEqual(injected, expected, 'each base and conditional file should inject exactly once in order');
  delete globalThis.chrome;
});

test('Netlify token migrates from sync and uses local-only storage', async () => {
  const clone = read('src/popup/html-clone.js');
  assert.ok(!clone.includes("safeStorage.get('netlifyToken')"));
  assert.ok(!clone.includes("safeStorage.set('netlifyToken'"));
  assert.ok(clone.includes("localOnlyStorage.migrateFromSync('netlifyToken')"));
  assert.ok(clone.includes("localOnlyStorage.set('netlifyToken'"));

  const stateUrl = pathToFileURL(path.join(root, 'src/popup/state.js')).href;

  async function runMigration({ writeDuringSync = null } = {}) {
    let localValue = null;
    let syncedValue = 'legacy-token';
    globalThis.document = { getElementById: () => null };
    globalThis.chrome = {
      storage: {
        local: {
          get: (_key, callback) => callback({ netlifyToken: localValue }),
          set: (data, callback) => { localValue = data.netlifyToken; callback(); }
        },
        sync: {
          get: (_key, callback) => {
            if (writeDuringSync) localValue = writeDuringSync;
            callback({ netlifyToken: syncedValue });
          },
          set: (_data, callback) => callback(),
          remove: (_key, callback) => { syncedValue = null; callback(); }
        }
      }
    };
    const { localOnlyStorage } = await import(`${stateUrl}?migration=${Date.now()}-${Math.random()}`);
    const migrated = await localOnlyStorage.migrateFromSync('netlifyToken');
    return { migrated, localValue, syncedValue };
  }

  const normal = await runMigration();
  assert.deepEqual(normal, { migrated: 'legacy-token', localValue: 'legacy-token', syncedValue: null });

  const concurrent = await runMigration({ writeDuringSync: 'new-token' });
  assert.deepEqual(concurrent, { migrated: 'new-token', localValue: 'new-token', syncedValue: null });
  delete globalThis.chrome;
  delete globalThis.document;
});

test('serializer targetElement path returns scoped nodeHtml', async () => {
  const source = read('src/content/html-clone/serializer.js');
  assert.match(source, /let serializedSelfContainedNode = null;/);
  assert.match(source, /serializedSelfContainedNode = serializeNode\(options\.targetElement, false\);/);
  assert.ok(!source.includes('const serializedSelfContainedNode ='));

  const Web2MD = {
    registerHandlers() {},
    generateMockInterceptorCode() { return ''; }
  };
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
  const result = await Web2MD.serializePageToSelfContainedHtml({ targetElement: target, preserveJs: false });
  assert.match(result.nodeHtml, /<section[^>]*>Selected text<\/section>/i);
  assert.match(result.html, /<!DOCTYPE html>/i);
  assert.match(result.html, /Selected text/);
  assert.match(result.package.html, /Selected text/);
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
