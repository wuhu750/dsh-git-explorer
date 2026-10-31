import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { __test } from '../index.js';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dgp-repo-'));
const run = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
run('init', '-q', '-b', 'main');
run('config', 'user.name', 'Ada Lovelace');
run('config', 'user.email', 'ada@example.com');
await fs.mkdir(path.join(dir, 'src'));
await fs.writeFile(path.join(dir, 'README.md'), '# Demo\n\nhello\n');
await fs.writeFile(path.join(dir, 'src', 'index.js'), 'export const answer = 41;\n');
run('add', '-A');
run('commit', '-q', '-m', 'initial commit');
await fs.writeFile(path.join(dir, 'src', 'index.js'), 'export const answer = 42;\n');
run('add', 'src/index.js');
await fs.writeFile(path.join(dir, 'src', 'index.js'), 'export const answer = 43;\n');
await fs.writeFile(path.join(dir, 'notes.txt'), 'untracked line\n');
run('branch', 'feature/demo');
await fs.writeFile(path.join(dir, 'notes.txt'), 'untracked line\nsecond\n');

const checks = [];
const check = (name, value) => { checks.push([name, value]); };

const repos = await __test.discoverRepositories(dir);
check('repos', repos.map((r) => r.name));
const status = await __test.readStatus(dir);
check('status', status.entries.map((e) => `${e.index}${e.worktree} ${e.path}`));
const log = await __test.readLog(dir, { limit: 10 });
check('log', log.commits.map((c) => c.subject));
const head = log.commits[0];
const commit = await __test.readCommit(dir, head.hash);
check('commitFiles', commit.files.map((f) => `${f.status} ${f.path} +${f.additions}-${f.deletions}`));
const working = await __test.collectDiff(dir, { scope: 'working', path: 'src/index.js' });
check('workingDiff', working.files.map((f) => `${f.path} +${f.additions}-${f.deletions}`));
const staged = await __test.collectDiff(dir, { scope: 'staged' });
check('stagedDiff', staged.files.map((f) => `${f.path} +${f.additions}-${f.deletions}`));
const untracked = await __test.collectDiff(dir, { scope: 'untracked' });
check('untrackedDiff', untracked.files.map((f) => `${f.path} +${f.additions}-${f.deletions}`));
const blame = await __test.readBlame(dir, { path: 'src/index.js' });
check('blame', blame.lines.map((l) => `${l.line}:${l.short}:${l.content}`));
const branches = await __test.readBranches(dir);
check('branches', branches.local.map((b) => `${b.name}${b.current ? '*' : ''}`));
const remotes = await __test.readRemotes(dir);
check('remotes', remotes.length);
const files = await __test.readFiles(dir);
check('files', files);
check('remoteUrl1', __test.normalizeRemoteUrl('git@github.com:owner/repo.git'));
check('remoteUrl2', __test.normalizeRemoteUrl('https://gitlab.com/owner/repo.git'));

/* ---------------------------------------------------------------------- */
/* Graph, tags, line history and hunk staging                             */
/* ---------------------------------------------------------------------- */

// A second commit plus a rename, so `--follow` and the graph have something to say.
await fs.writeFile(path.join(dir, 'notes.txt'), 'untracked line\nsecond\nthird\n');
run('add', 'notes.txt');
run('commit', '-q', '-m', 'add notes');
run('mv', 'notes.txt', 'notes-renamed.txt');
run('commit', '-q', '-m', 'rename notes');

const graph = await __test.readGraph(dir, { limit: 50 });
check('graph', graph.commits.map((c) => `${c.subject}:p${c.parents.length}`));

const followed = await __test.readLog(dir, { path: 'notes-renamed.txt', follow: true, limit: 20 });
check('followLog', followed.commits.map((c) => c.subject));
const unfollowed = await __test.readLog(dir, { path: 'notes-renamed.txt', limit: 20 });
check('unfollowedLog', unfollowed.commits.map((c) => c.subject));

const lineHistory = await __test.readLineHistory(dir, { path: 'notes-renamed.txt', start: 2, end: 2, limit: 5 });
check('lineHistory', lineHistory.commits.map((c) => `${c.subject}:${c.patch !== '' ? 'patch' : 'nopatch'}`));

// Two well-separated hunks in one unstaged file.
const big = Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join('\n') + '\n';
await fs.writeFile(path.join(dir, 'src', 'hunks.js'), big);
run('add', 'src/hunks.js');
run('commit', '-q', '-m', 'add hunks file');
const edited = big.replace('line 2\n', 'LINE TWO\n').replace('line 11\n', 'LINE ELEVEN\n');
await fs.writeFile(path.join(dir, 'src', 'hunks.js'), edited);

const hunks = await __test.readFilePatch(dir, 'working', 'src/hunks.js', {});
check('hunkCount', hunks.hunks.length);
const firstOnly = __test.buildHunkPatch({ header: hunks.header, hunks: hunks.hunks }, [0]);
check('hunkPatchHasOneHeader', (firstOnly.patch.match(/^@@ /gm) ?? []).length);

await __test.applyPatch(dir, firstOnly.patch, { cached: true });
const stagedStatus = run('status', '--porcelain', 'src/hunks.js');
check('afterStageOne', stagedStatus);

const stagedHunks = await __test.readFilePatch(dir, 'staged', 'src/hunks.js', {});
await __test.applyPatch(dir, __test.buildHunkPatch({ header: stagedHunks.header, hunks: stagedHunks.hunks }, [0]).patch, {
  cached: true,
  reverse: true,
});
const unstagedStatus = run('status', '--porcelain', 'src/hunks.js');
check('afterUnstage', unstagedStatus);

// Tags: lightweight + annotated, then read them back.
run('tag', 'v1.0.0');
run('tag', '-a', 'v1.1.0', '-m', 'annotated release');
const tags = await __test.readTags(dir);
check('tags', tags.map((tag) => `${tag.name}:${tag.annotated ? 'annotated' : 'lightweight'}`));

const truncatedBlame = await __test.readBlame(dir, { path: 'src/hunks.js' });
check('blameTruncatedFlag', truncatedBlame.truncated === false && truncatedBlame.limit > 0);

for (const [name, value] of checks) console.log(name, JSON.stringify(value));
const failures = [];
if (status.entries.length !== 2) failures.push('expected two status entries');
if (working.files.length !== 1) failures.push('expected one working diff file');
if (untracked.files.length !== 1) failures.push('expected one untracked diff file');
if (blame.lines.length !== 1) failures.push('expected one blame line');
if (!branches.local.some((b) => b.current)) failures.push('expected a current branch');
if (__test.normalizeRemoteUrl('git@github.com:owner/repo.git') !== 'https://github.com/owner/repo') failures.push('ssh remote normalization');
if (graph.commits.length !== 3) failures.push(`expected three graph commits, got ${graph.commits.length}`);
if (followed.commits.length !== 2) failures.push(`--follow should cross the rename (got ${followed.commits.length})`);
if (unfollowed.commits.length !== 1) failures.push(`without --follow only the rename shows (got ${unfollowed.commits.length})`);
if (lineHistory.commits.length !== 1) failures.push(`expected one line-history commit, got ${lineHistory.commits.length}`);
if (hunks.hunks.length !== 2) failures.push(`expected two hunks, got ${hunks.hunks.length}`);
if ((firstOnly.patch.match(/^@@ /gm) ?? []).length !== 1) failures.push('a single-hunk patch should contain one @@ header');
if (!stagedStatus.startsWith('MM')) failures.push(`staging one hunk should leave both a staged and a working change (got ${JSON.stringify(stagedStatus)})`);
if (!unstagedStatus.startsWith(' M')) failures.push(`unstaging the hunk should return it to the working tree (got ${JSON.stringify(unstagedStatus)})`);
if (tags.length !== 2) failures.push(`expected two tags, got ${tags.length}`);
if (!tags.some((tag) => tag.annotated)) failures.push('expected an annotated tag');
if (truncatedBlame.truncated !== false) failures.push('a short file should not report truncated blame');
if (failures.length > 0) { console.error('FAIL', failures); process.exit(1); }
console.log('SMOKE OK', dir);
await fs.rm(dir, { recursive: true, force: true });
