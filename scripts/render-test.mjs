/**
 * Renderer smoke test for the browser half.
 *
 * The plugin ships a single `client.js` that expects React, a DOM and the DSH
 * module loader. This harness supplies a small, hook-correct React stand-in
 * plus a fake DOM, and routes `fetch` straight at the host's `dispatch`, so the
 * real component tree renders against a real repository.
 *
 * It mounts the sidebar and the conversation view, then drives the tab bar the
 * way a user would, which exercises the commit graph, tags, hunk staging and
 * the push dialog. Prop typos, missing icons and broken hooks fail here instead
 * of in the browser.
 */
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { __test } from '../index.js';

/* ------------------------------------------------------------------ */
/* React stand-in                                                     */
/* ------------------------------------------------------------------ */

const instances = new Map();
let currentInstance = null;
let hookIndex = 0;
let dirty = false;
let effectsQueue = [];
const timers = [];
const problems = [];

const React = {
  createElement(type, props, ...children) {
    return {
      type,
      props: {
        ...(props ?? {}),
        children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children,
      },
    };
  },
  Fragment: Symbol('Fragment'),
  useState(initial) {
    const slot = slotAt();
    if (!('value' in slot)) slot.value = typeof initial === 'function' ? initial() : initial;
    const target = currentInstance;
    const index = hookIndex;
    hookIndex += 1;
    return [
      slot.value,
      (next) => {
        const resolved = typeof next === 'function' ? target.slots[index].value : next;
        if (target.slots[index].value !== resolved) {
          target.slots[index].value = resolved;
          dirty = true;
        }
      },
    ];
  },
  useRef(initial) {
    const slot = slotAt();
    if (!('ref' in slot)) slot.ref = { current: initial };
    hookIndex += 1;
    return slot.ref;
  },
  useMemo(factory, deps) {
    const slot = slotAt();
    const key = JSON.stringify(deps ?? []);
    if (slot.key !== key) {
      slot.key = key;
      slot.value = factory();
    }
    hookIndex += 1;
    return slot.value;
  },
  useCallback(fn, deps) {
    const slot = slotAt();
    const key = JSON.stringify(deps ?? []);
    if (slot.key !== key) {
      slot.key = key;
      slot.value = fn;
    }
    hookIndex += 1;
    return slot.value;
  },
  useEffect(fn, deps) {
    const slot = slotAt();
    const key = JSON.stringify(deps ?? []);
    if (slot.key !== key) {
      slot.key = key;
      effectsQueue.push({ fn, cleanup: slot.cleanup });
    }
    hookIndex += 1;
  },
  useLayoutEffect(fn, deps) {
    React.useEffect(fn, deps);
  },
};

function slotAt() {
  if (currentInstance === null) throw new Error('hook used outside a component');
  if (hookIndex >= currentInstance.slots.length) currentInstance.slots.push({});
  return currentInstance.slots[hookIndex];
}

/* ------------------------------------------------------------------ */
/* DOM, fetch and timers                                              */
/* ------------------------------------------------------------------ */

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.dataset = {};
    this.style = {};
    this.children = [];
    this.attributes = {};
    this.textContent = '';
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  remove() {}
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  select() {}
  addEventListener() {}
  removeEventListener() {}
}

globalThis.document = {
  head: new FakeElement('head'),
  body: new FakeElement('body'),
  baseURI: 'http://dsh.test/',
  visibilityState: 'visible',
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => ({ text }),
  execCommand: () => true,
  addEventListener() {},
  removeEventListener() {},
};

const localStorageStore = new Map();
globalThis.window = {
  confirm: () => true,
  setTimeout: (fn) => {
    timers.push(fn);
    return timers.length;
  },
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  localStorage: {
    getItem: (key) => (localStorageStore.has(key) ? localStorageStore.get(key) : null),
    setItem: (key, value) => localStorageStore.set(key, String(value)),
  },
  open() {},
  location: { href: 'http://dsh.test/' },
  addEventListener() {},
  removeEventListener() {},
};
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: async () => {} } },
  configurable: true,
});

let repoCwd = '';
const sessionId = 'render-session';
const ctx = {
  sessions: { get: (id) => (id === sessionId ? { header: { cwd: repoCwd } } : undefined) },
  get: (name) => (name === 'workingDirectory' ? { get: () => repoCwd } : undefined),
  logger: { warn() {}, info() {} },
};

globalThis.fetch = async (url, init) => {
  const method = decodeURIComponent(String(url).split('/').pop());
  const payload = JSON.parse(init?.body ?? '{}');
  try {
    const value = await __test.dispatch(ctx, method, payload);
    return { ok: true, status: 200, json: async () => ({ ok: true, value }) };
  } catch (error) {
    return {
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: { code: error.code ?? 'error', message: error.message } }),
    };
  }
};

/* ------------------------------------------------------------------ */
/* Load the plugin                                                   */
/* ------------------------------------------------------------------ */

let loaded;
globalThis.window.__ModuleLoader__ = {
  load({ id, factory }) {
    loaded = { id, factory };
  },
};

const source = await fs.readFile(new URL('../client.js', import.meta.url), 'utf8');
new Function('window', 'document', 'navigator', 'React', source)(globalThis.window, globalThis.document, globalThis.navigator, React);

const plugin = loaded.factory((name) => {
  if (name === 'react') return React;
  throw new Error(`unexpected require(${name})`);
});

const registrations = new Map();
plugin.apply({
  locale: { bind: () => (key) => labelOf(key), register: () => () => {} },
  effect: (factory) => factory(),
  sidebarRightTabs: { register: () => () => {} },
  sidebarRight: { openTab() {} },
  slots: {
    inject: (_name, factory) => factory(),
    register: (meta, component) => {
      registrations.set(`${meta.name}|${meta.key ?? meta.id}`, component);
      return () => {};
    },
  },
});

/* ------------------------------------------------------------------ */
/* Reconciler                                                        */
/* ------------------------------------------------------------------ */

let flat = [];
let root = null;
let rootProps = {};

function walk(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (typeof node === 'string' || typeof node === 'number') {
    flat.push({ kind: 'text', text: String(node) });
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) walk(child);
    return;
  }
  if (typeof node !== 'object') return;
  const { type, props } = node;
  if (type === React.Fragment) {
    walk(props?.children);
    return;
  }
  if (typeof type === 'function') {
    const previous = currentInstance;
    const previousIndex = hookIndex;
    let instance = instances.get(type);
    if (instance === undefined) {
      instance = { slots: [] };
      instances.set(type, instance);
    }
    currentInstance = instance;
    hookIndex = 0;
    let output;
    try {
      output = type(props ?? {});
    } catch (error) {
      problems.push(`${type.name || 'anonymous'}: ${error.message}`);
      currentInstance = previous;
      hookIndex = previousIndex;
      return;
    }
    currentInstance = previous;
    hookIndex = previousIndex;
    walk(output);
    return;
  }
  if (typeof type === 'string') {
    flat.push({ kind: 'element', type, props, node });
    walk(props?.children);
  }
}

async function settle() {
  for (let round = 0; round < 40; round += 1) {
    const queue = effectsQueue;
    effectsQueue = [];
    for (const effect of queue) {
      try {
        if (typeof effect.cleanup === 'function') effect.cleanup();
        const cleanup = effect.fn();
        if (typeof cleanup === 'function') effect.cleanup = cleanup;
      } catch (error) {
        problems.push(`effect: ${error.message}`);
      }
    }
    while (timers.length > 0) {
      const next = timers.shift();
      try {
        next();
      } catch (error) {
        problems.push(`timer: ${error.message}`);
      }
    }
    // Real time, so the Git subprocess behind `fetch` can finish.
    await delay(30);
    if (!dirty && queue.length === 0 && timers.length === 0) return;
    dirty = false;
    render();
  }
}

function render() {
  flat = [];
  walk(React.createElement(root, rootProps));
}

/** Click the first element carrying this `title` (icon-only buttons). */
async function clickTitle(title) {
  for (let round = 0; round < 8; round += 1) {
    await settle();
    const match = flat.find(
      (entry) => entry.kind === 'element' && typeof entry.props?.onClick === 'function' && entry.props.title === title,
    );
    if (match === undefined) return false;
    try {
      match.props.onClick({ stopPropagation() {}, target: {}, currentTarget: {}, key: '', preventDefault() {} });
    } catch (error) {
      problems.push(`clickTitle(${title}): ${error.message}`);
      return false;
    }
    await settle();
    return true;
  }
  return false;
}

/** Poll until `predicate()` holds, re-rendering while the fetches settle. */
async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await settle();
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return false;
}

async function clickText(text, options = {}) {
  for (let round = 0; round < 8; round += 1) {
    await settle();
    const match = flat.find(
      (entry) =>
        entry.kind === 'element' &&
        typeof entry.props?.onClick === 'function' &&
        textOf(entry.node).includes(text) &&
        (options.title === undefined || entry.props.title === options.title),
    );
    if (match === undefined) return false;
    try {
      match.props.onClick({ stopPropagation() {}, target: {}, currentTarget: {}, key: '', preventDefault() {} });
    } catch (error) {
      problems.push(`click(${text}): ${error.message}`);
      return false;
    }
    await settle();
    return true;
  }
  return false;
}

function textOf(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (typeof node === 'object') return textOf(node.props?.children);
  return '';
}

const visibleText = () => flat.filter((entry) => entry.kind === 'text').map((entry) => entry.text).join(' ');

/* ------------------------------------------------------------------ */
/* Fixture                                                           */
/* ------------------------------------------------------------------ */

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dgp-render-'));
repoCwd = dir;
const run = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
run('init', '-q', '-b', 'main');
run('config', 'user.name', 'Ada Lovelace');
run('config', 'user.email', 'ada@example.com');
run('remote', 'add', 'origin', 'git@github.com:owner/repo.git');
await fs.mkdir(path.join(dir, 'src'));
const twelve = Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join('\n') + '\n';
await fs.writeFile(path.join(dir, 'src', 'a.js'), twelve);
run('add', '-A');
run('commit', '-q', '-m', 'first commit');
await fs.writeFile(path.join(dir, 'src', 'a.js'), twelve.replace('line 2\n', 'line two\n'));
run('add', '-A');
run('commit', '-q', '-m', 'second commit');
run('branch', 'feature/x');
run('tag', 'v1.0.0');
run('tag', '-a', 'v1.1.0', '-m', 'annotated release');
await fs.writeFile(path.join(dir, 'src', 'a.js'), twelve.replace('line 2\n', 'LINE TWO\n').replace('line 11\n', 'LINE ELEVEN\n'));

/* ------------------------------------------------------------------ */
/* Display labels                                                    */
/* ------------------------------------------------------------------ */

const LABELS = {
  'tabs.changes': 'Changes',
  'tabs.graph': 'Graph',
  'tabs.history': 'History',
  'tabs.branches': 'Branches',
  'tabs.tags': 'Tags',
  'tabs.stashes': 'Stashes',
  'tabs.compare': 'Compare',
  'tabs.blame': 'Blame',
  'action.loadMore': 'Load more',
  'action.hunks': 'By hunk',
  'action.pull': 'Pull',
  'action.push': 'Push',
  'tags.create': 'Create tag',
  'hunks.title': 'Stage by hunk',
};
const labelOf = (key) => LABELS[key] ?? key;

/* ------------------------------------------------------------------ */
/* Drive the UI                                                      */
/* ------------------------------------------------------------------ */

const results = [];
const step = (name, ok) => results.push({ name, ok: Boolean(ok) });

const SidebarBody = registrations.get('sidebar.right.pane.tab|dsh-git-explorer');
const ConversationView = registrations.get('conversation.view|git-explorer');
const SidebarTitle = registrations.get('sidebar.right.pane.tab.title|dsh-git-explorer');
const OpenButton = registrations.get('conversation.session.header.actions|dsh-git-explorer.open');

if (!SidebarBody || !ConversationView || !SidebarTitle || !OpenButton) {
  problems.push(`missing registrations: ${[...registrations.keys()].join(', ')}`);
} else {
  rootProps = {
    sessionId,
    useSessions: (selector) => selector({ byId: { [sessionId]: { cwd: dir } } }),
    t: labelOf,
    wide: false,
  };
  root = SidebarBody;
  dirty = false;
  render();
  await settle();
  step('sidebar mounts', problems.length === 0);
  step('changes tab renders', visibleText().includes('Changes'));
  step('header shows the branch', await waitFor(() => visibleText().includes('main')));

  rootProps = { ...rootProps, wide: true };
  root = ConversationView;
  instances.clear();
  dirty = false;
  render();
  await settle();
  step('conversation view mounts', problems.length === 0);

  step('graph tab opens', await clickText('Graph'));
  await settle();
  const graphText = visibleText();
  step(
    'graph lists commits',
    await waitFor(() => visibleText().includes('first commit') && visibleText().includes('second commit')),
  );
  step('graph draws lane svg', flat.some((entry) => entry.kind === 'element' && entry.type === 'svg'));

  step('tags tab opens', await clickText('Tags'));
  await settle();
  const tagText = visibleText();
  step(
    'tags list renders',
    await waitFor(() => visibleText().includes('v1.0.0') && visibleText().includes('v1.1.0')),
  );
  step('annotated tag is labelled', tagText.includes('tags.annotated'));
  step('lightweight tag is labelled', tagText.includes('tags.lightweight'));

  step('blame tab opens', await clickText('Blame'));
  await settle();
  step('blame form renders', visibleText().includes('blame.load'));

  // Type a path into the blame form and run it, so the per-line rows and the
  // file-level annotation summary both materialise.
  const pathInput = flat.find((entry) => entry.kind === 'element' && entry.props?.list === 'dgp-blame-files');
  if (pathInput) {
    pathInput.props.onChange({ target: { value: 'src/a.js' } });
    await settle();
    step('blame runs for a file', await clickText('blame.load'));
    await settle();
    const annotText = visibleText();
    step('blame shows the file annotation', annotText.includes('annot.summary'));
    step('blame shows per-line rows', annotText.includes('Ada Lovelace'));
  } else {
    step('blame form has a path input', false);
  }

  await clickText('Changes');
  await settle();
  // The hunk entry point is an icon-only button, so it is addressed by title.
  step('hunk button opens the panel', await clickTitle('By hunk'));
  await settle();
  const hunkText = visibleText();
  step('hunk panel lists the hunks', hunkText.includes('hunks.count') && hunkText.includes('hunks.applySelected'));
  step('hunk panel offers discard', hunkText.includes('hunks.discard'));

  // Stage a single hunk from the panel and confirm the index really changed.
  const beforeStatus = run('status', '--porcelain').trim();
  const stageOne = flat.find(
    (entry) => entry.kind === 'element' && entry.type === 'button' && entry.props?.title === 'hunks.stage',
  );
  if (stageOne) {
    stageOne.props.onClick({ stopPropagation() {}, preventDefault() {} });
    await settle();
    const afterStatus = run('status', '--porcelain').trim();
    step('hunk action stages into the index', afterStatus !== beforeStatus && afterStatus.startsWith('MM'));
  } else {
    step('hunk panel has a per-hunk stage button', false);
  }

  step('push dialog opens', await clickTitle('Push'));
  await settle();
  const pushText = visibleText();
  step('push dialog has the upstream option', pushText.includes('push.upstream'));
  step('push dialog has the force option', pushText.includes('push.force'));
}

for (const [key, component] of registrations) {
  step(`registered ${key}`, typeof component === 'function');
}

// The module must carry its cordis plugin name and a collision-free tab kind:
// `dsh-better-sidebar` owns the native `git` tab kind at the extension band, and
// reusing it makes the sidebar registry throw — which fails the whole web boot.
step('exports its plugin name', plugin.name === 'dsh-git-explorer');
step('tab kind avoids the built-in git kind', plugin.name !== undefined && !/KIND = 'git';/.test(source));

let failed = problems.length > 0;
for (const result of results) {
  console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${result.name}`);
  if (!result.ok) failed = true;
}
if (problems.length > 0) {
  console.error('\nPROBLEMS');
  for (const problem of [...new Set(problems)]) console.error(`- ${problem}`);
}

await fs.rm(dir, { recursive: true, force: true });
if (failed) process.exit(1);
console.log(`\nRENDER OK (${results.length} checks)`);
