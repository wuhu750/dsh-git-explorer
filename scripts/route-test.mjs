/**
 * Route-level test for the host half.
 *
 * The plugin's `apply()` registers a fenced HTTP handler with the DSH web
 * server. This harness supplies the smallest `ctx` that handler needs, mounts
 * it on a real `http.Server`, and drives every method through real `fetch`
 * calls — so the request envelope, the workspace guard, the JSON error shape
 * and the write actions are all exercised over the wire rather than in-process.
 */
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { apply, __test } from '../index.js';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dgp-route-'));
const run = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
run('init', '-q', '-b', 'main');
run('config', 'user.name', 'Ada Lovelace');
run('config', 'user.email', 'ada@example.com');
await fs.mkdir(path.join(dir, 'src'));
const body = Array.from({ length: 40 }, (_, index) => `line ${index + 1}`).join('\n') + '\n';
await fs.writeFile(path.join(dir, 'src', 'a.js'), body);
run('add', '-A');
run('commit', '-q', '-m', 'first commit');
await fs.writeFile(path.join(dir, 'src', 'a.js'), body.replace('line 2\n', 'line two\n'));
run('add', '-A');
run('commit', '-q', '-m', 'second commit');
run('tag', 'v1.0.0');
// Two changes far enough apart that Git splits them into distinct hunks.
await fs.writeFile(path.join(dir, 'src', 'a.js'), body.replace('line 2\n', 'LINE TWO\n').replace('line 38\n', 'LINE THIRTY EIGHT\n'));

const sessionId = 'route-session';
let rejectNext = false;

const ctx = {
  sessions: { get: (id) => (id === sessionId ? { header: { cwd: dir } } : undefined) },
  get: (name) => (name === 'workingDirectory' ? { get: () => dir } : undefined),
  logger: { warn() {}, info() {} },
  connection: { requestRejection: () => (rejectNext ? 'nope' : undefined) },
  webServer: {
    register(spec) {
      if (spec.kind !== 'prefix' || spec.path !== '/dsh-git/api') throw new Error('unexpected route spec');
      return spec.handler;
    },
  },
  effect(factory) {
    factory();
  },
};

let handler;
apply({ ...ctx, webServer: { register: (spec) => { handler = spec.handler; return () => {}; } } });

const server = http.createServer((request, response) => handler(request, response));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}/dsh-git/api`;

async function call(method, payload) {
  const response = await fetch(`${base}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  return { status: response.status, json };
}

const results = [];
const check = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail });

try {
  // Read methods, all over the wire.
  const status = await call('status', { sessionId });
  check('status 200', status.status === 200, status.status);
  check('status has entries', (status.json.value?.entries ?? []).length === 1);

  const discover = await call('discover', { sessionId });
  check('discover finds the repo', (discover.json.value?.repos ?? []).length === 1);

  const overview = await call('overview', { sessionId });
  check('overview branch', overview.json.value?.branch === 'main');
  check('overview exposes a web url', String(overview.json.value?.remotes?.[0]?.webUrl ?? '').length >= 0);

  const log = await call('log', { sessionId, limit: 10 });
  check('log has two commits', (log.json.value?.commits ?? []).length === 2);

  const graph = await call('graph', { sessionId, limit: 10 });
  check('graph has two commits', (graph.json.value?.commits ?? []).length === 2);
  check('graph rows carry parents', (graph.json.value?.commits?.[0]?.parents ?? []).length === 1);

  const tags = await call('tags', { sessionId });
  check('tags lists v1.0.0', (tags.json.value?.tags ?? []).some((tag) => tag.name === 'v1.0.0'));

  const hunks = await call('hunks', { sessionId, path: 'src/a.js', scope: 'working' });
  check('hunks finds two hunks', (hunks.json.value?.hunks ?? []).length === 2);

  const commit = await call('commit', { sessionId, hash: 'HEAD' });
  check('commit reads HEAD', commit.json.value?.commit?.subject === 'second commit');

  const blame = await call('blame', { sessionId, path: 'src/a.js' });
  check('blame returns lines', (blame.json.value?.lines ?? []).length === 40);
  check('blame reports the truncation flag', blame.json.value?.truncated === false);

  const lineHistory = await call('lineHistory', { sessionId, path: 'src/a.js', start: 2, end: 2 });
  check('lineHistory returns commits', (lineHistory.json.value?.commits ?? []).length >= 1);

  const fileHistory = await call('fileHistory', { sessionId, path: 'src/a.js', limit: 10 });
  check('fileHistory returns commits', (fileHistory.json.value?.commits ?? []).length >= 1);

  const compare = await call('compare', { sessionId, base: 'HEAD~1', head: 'HEAD' });
  check('compare returns files', (compare.json.value?.diff?.files ?? []).length === 1);

  // Write actions.
  const stagedOne = await call('action', { sessionId, action: 'stageHunks', path: 'src/a.js', hunks: [0], scope: 'working' });
  check('stageHunks 200', stagedOne.status === 200, stagedOne.json.error?.message);
  check('stageHunks reports one hunk', /1 hunk/.test(stagedOne.json.value?.output ?? ''), stagedOne.json.value?.output);
  check('index now holds one hunk', run('status', '--porcelain').trim().startsWith('MM'));

  const unstaged = await call('action', { sessionId, action: 'unstageHunks', path: 'src/a.js', hunks: [0], scope: 'staged' });
  check('unstageHunks 200', unstaged.status === 200, unstaged.json.error?.message);
  check('index is clean again', /^ ?M/.test(run('status', '--porcelain', 'src/a.js').trim()) && !/^MM/.test(run('status', '--porcelain', 'src/a.js').trim()), JSON.stringify(run('status', '--porcelain', 'src/a.js')));

  const discard = await call('action', { sessionId, action: 'discardHunks', path: 'src/a.js', hunks: [1], scope: 'working' });
  check('discardHunks 200', discard.status === 200, discard.json.error?.message);
  // The second hunk was reverted in the worktree, so only the first change
  // should still be dirty.
  const afterDiscard = run('diff', '--stat');
  check('the discarded hunk is gone', !afterDiscard.includes('2 insertions') && !afterDiscard.includes('2 deletions'), afterDiscard);
  check('the other hunk is intact', afterDiscard.includes('src/a.js'), afterDiscard);

  const tag = await call('action', { sessionId, action: 'createTag', name: 'v2.0.0', message: 'release two' });
  check('createTag 200', tag.status === 200, tag.json.error?.message);
  const afterTag = await call('tags', { sessionId });
  check('new tag is annotated', (afterTag.json.value?.tags ?? []).find((item) => item.name === 'v2.0.0')?.annotated === true);

  const dropTag = await call('action', { sessionId, action: 'deleteTag', name: 'v2.0.0' });
  check('deleteTag 200', dropTag.status === 200, dropTag.json.error?.message);
  const finalTags = await call('tags', { sessionId });
  check('tag is gone', !(finalTags.json.value?.tags ?? []).some((item) => item.name === 'v2.0.0'));

  const stash = await call('action', { sessionId, action: 'stashSave', message: 'wip' });
  check('stashSave 200', stash.status === 200, stash.json.error?.message);
  check('working tree is clean after stash', run('status', '--porcelain').trim() === '');
  const pop = await call('action', { sessionId, action: 'stashPop', ref: 'stash@{0}' });
  check('stashPop 200', pop.status === 200, pop.json.error?.message);

  // Failure modes.
  const badMethod = await call('nope', { sessionId });
  check('unknown method is rejected', badMethod.status === 400 && /Unknown method/.test(badMethod.json.error?.message ?? ''), badMethod.json.error?.message);

  const emptyWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'dgp-empty-'));
  const outside = await call('status', { cwd: emptyWorkspace });
  check('workspace without a repo fails cleanly', outside.status === 400 && outside.json.error?.code === 'not-a-repository', outside.json.error?.code);
  await fs.rm(emptyWorkspace, { recursive: true, force: true });

  const escape = await call('hunks', { sessionId, path: '../etc/passwd', scope: 'working' });
  check('escaping path is rejected', escape.status === 400 || escape.status === 403, escape.status);

  const badAction = await call('action', { sessionId, action: 'rm-rf' });
  check('unknown action is rejected', badAction.status === 400 && /Unknown action/.test(badAction.json.error?.message ?? ''), badAction.json.error?.message);

  const outsideWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'dgp-outside-'));
  const forbiddenRepo = await call('status', { cwd: outsideWorkspace, repoRoot: dir });
  check('a repo outside the workspace is rejected', forbiddenRepo.status === 400 || forbiddenRepo.status === 403, forbiddenRepo.status);
  await fs.rm(outsideWorkspace, { recursive: true, force: true });

  // The connection guard.
  rejectNext = true;
  const blocked = await fetch(`${base}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  const blockedBody = await blocked.json();
  check('connection guard returns 403', blocked.status === 403, blocked.status);
  check('guard body explains itself', /DSH page/.test(blockedBody.error?.message ?? ''), blockedBody.error?.message);
} finally {
  server.close();
  await fs.rm(dir, { recursive: true, force: true });
}

let failed = false;
for (const result of results) {
  console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${result.name}${result.ok ? '' : ` — ${JSON.stringify(result.detail)}`}`);
  if (!result.ok) failed = true;
}
if (failed) process.exit(1);
console.log(`\nROUTE OK (${results.length} checks)`);
