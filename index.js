/**
 * dsh-git-explorer — host half.
 *
 * The browser half cannot spawn processes, so this module owns a small,
 * allow-listed Git API. It exposes one fenced HTTP route under
 * `/dsh-git/api` and answers JSON envelopes for repository discovery, status,
 * history, diffs, blame, branches, stashes and a closed set of mutations.
 *
 * Every operation is scoped to the workspace of the session that asked for
 * it. Repository roots and pathspecs are re-validated on the host; the browser
 * never gets to name an arbitrary directory.
 */
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Route prefix owned by this plugin. */
const API_PREFIX = '/dsh-git/api';
/** Upper bound for one Git invocation's stdout, in bytes. */
const MAX_BUFFER = 32 * 1024 * 1024;
/** Patch bytes sent to the browser per response. */
const MAX_PATCH_BYTES = 4 * 1024 * 1024;
/** Largest untracked file rendered as a synthetic patch. */
const MAX_UNTRACKED_BYTES = 768 * 1024;
/** Directories never descended into while discovering nested repositories. */
const SKIP_DIRS = new Set([
  '.git', '.hg', '.svn', '.DS_Store', '.cache', '.next', '.nuxt', '.output',
  '.venv', 'venv', 'node_modules', 'bower_components', 'vendor', 'dist', 'build',
  'out', 'target', 'coverage', 'Pods', 'DerivedData', '__pycache__',
]);
/** Fields used by every commit list. */
const COMMIT_FIELDS = ['%H', '%h', '%an', '%ae', '%at', '%s', '%D', '%P'].join('%x1f');
const COMMIT_RECORD = `%x1e${COMMIT_FIELDS}%x1f%x1e`;

/** A user-facing Git failure with a stable wire code. */
class GitError extends Error {
  constructor(message, code = 'git-error') {
    super(message);
    this.name = 'GitError';
    this.code = code;
  }
}

/** Run Git with an argument array (never a shell string). */
async function git(cwd, args, options = {}) {
  const env = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_PAGER: 'cat',
    LC_ALL: 'C',
  };
  try {
    const result = await execFileAsync(
      'git',
      ['--no-pager', '-c', 'core.quotepath=false', '-C', cwd, ...args],
      {
        env,
        maxBuffer: MAX_BUFFER,
        timeout: options.timeout ?? 20_000,
        windowsHide: true,
        encoding: 'utf8',
      },
    );
    return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new GitError('Git is not installed, or it is not on PATH.', 'git-missing');
    }
    if (error && (error.killed || error.signal)) {
      throw new GitError('The Git command timed out.', 'timeout');
    }
    if (error && (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' || String(error.message ?? '').includes('maxBuffer'))) {
      throw new GitError('The Git output is too large for one response.', 'too-large');
    }
    const stderr = String((error && error.stderr) || '').trim();
    const stdout = String((error && error.stdout) || '').trim();
    const raw = stderr || stdout || 'The Git command failed.';
    throw new GitError(raw.length > 8000 ? `${raw.slice(0, 8000)}\n…` : raw, 'git-failed');
  }
}

async function gitText(cwd, args, options) {
  return (await git(cwd, args, options)).stdout;
}

async function gitTrim(cwd, args, options) {
  return (await gitText(cwd, args, options)).trim();
}

/** True when `child` is the same directory as, or inside, `parent`. */
function isInside(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function requireString(payload, key) {
  const value = payload?.[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new GitError(`"${key}" is required.`, 'bad-request');
  }
  return value;
}

function optionalString(payload, key) {
  const value = payload?.[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function requireLimit(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

/** Reject absolute, escaping and NUL-containing repository-relative paths. */
function safeRelativePath(raw) {
  const value = requireString({ path: raw }, 'path');
  if (value.includes('\0')) throw new GitError('A path cannot contain NUL.', 'bad-request');
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  if (path.posix.isAbsolute(normalized) || /^[a-zA-Z]:\//.test(normalized)) {
    throw new GitError('Only repository-relative paths are accepted.', 'bad-request');
  }
  const resolved = path.posix.normalize(normalized);
  if (resolved === '..' || resolved.startsWith('../')) {
    throw new GitError('A path cannot leave the repository.', 'forbidden');
  }
  return resolved;
}

function pathListOf(payload) {
  if (!Array.isArray(payload?.paths) || payload.paths.length === 0) {
    throw new GitError('At least one path is required.', 'bad-request');
  }
  if (payload.paths.length > 2000) throw new GitError('Too many paths in one request.', 'bad-request');
  return payload.paths.map(safeRelativePath);
}

/** Resolve the workspace directory of the requesting session. */
async function workspaceOf(ctx, payload) {
  const sessionId = optionalString(payload, 'sessionId');
  let cwd;
  if (sessionId !== undefined) {
    const session = ctx.sessions.get(sessionId);
    if (session !== undefined) {
      try {
        cwd = ctx.get('workingDirectory')?.get(session) ?? session.header?.cwd;
      } catch {
        cwd = session.header?.cwd;
      }
    }
  }
  if (cwd === undefined || cwd === '') cwd = optionalString(payload, 'cwd');
  if (cwd === undefined || cwd === '') cwd = process.cwd();
  if (!path.isAbsolute(cwd)) throw new GitError('The workspace directory must be absolute.', 'bad-request');
  try {
    const real = await fs.realpath(cwd);
    const stat = await fs.stat(real);
    if (!stat.isDirectory()) throw new Error('not a directory');
    return real;
  } catch {
    throw new GitError(`The workspace directory does not exist: ${cwd}`, 'no-workspace');
  }
}

async function isRepository(dir) {
  try {
    const top = await gitTrim(dir, ['rev-parse', '--show-toplevel']);
    return top !== '' ? top : undefined;
  } catch {
    return undefined;
  }
}

async function findNestedRepositories(root, depth, budget) {
  if (depth <= 0 || budget.remaining <= 0) return [];
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    if (budget.remaining <= 0) break;
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    budget.remaining -= 1;
    const candidate = path.join(root, entry.name);
    if (entry.name === '.git') continue;
    try {
      const stat = await fs.stat(path.join(candidate, '.git'));
      if (stat.isDirectory() || stat.isFile()) {
        found.push(candidate);
        continue;
      }
    } catch {
      // Not a repository; keep walking.
    }
    found.push(...(await findNestedRepositories(candidate, depth - 1, budget)));
  }
  return found;
}

/** Discover the containing repository plus repositories nested in the workspace. */
async function discoverRepositories(cwd) {
  const roots = new Set();
  const containing = await isRepository(cwd);
  if (containing !== undefined) roots.add(containing);
  const budget = { remaining: 600 };
  for (const nested of await findNestedRepositories(cwd, containing !== undefined ? 3 : 4, budget)) {
    roots.add(nested);
  }
  if (roots.size === 0) return [];
  const repos = [];
  for (const root of roots) {
    let branch = '';
    let head = '';
    try {
      branch = await gitTrim(root, ['symbolic-ref', '--short', '-q', 'HEAD']);
    } catch {
      branch = '';
    }
    if (branch === '') {
      try {
        head = await gitTrim(root, ['rev-parse', '--short', 'HEAD']);
      } catch {
        head = '';
      }
    }
    repos.push({
      root,
      name: path.basename(root),
      branch: branch || (head === '' ? 'unborn' : `detached@${head}`),
      detatched: branch === '',
      isContainer: roots.size > 1,
      isCurrent: containing === root || (containing === undefined && isInside(root, cwd)),
    });
  }
  repos.sort((a, b) => (a.isCurrent === b.isCurrent ? a.root.localeCompare(b.root) : a.isCurrent ? -1 : 1));
  return repos;
}

/** Validate a requested repository root against the session workspace. */
async function resolveRepository(cwd, requested) {
  if (requested !== undefined && requested !== '') {
    if (!path.isAbsolute(requested)) throw new GitError('The repository root must be absolute.', 'bad-request');
    let real;
    try {
      real = await fs.realpath(requested);
    } catch {
      throw new GitError(`The repository does not exist: ${requested}`, 'not-a-repository');
    }
    if (!isInside(cwd, real)) throw new GitError('The repository is outside the workspace.', 'forbidden');
    const top = await isRepository(real);
    if (top === undefined) throw new GitError('The directory is not a Git repository.', 'not-a-repository');
    if (path.resolve(top) !== path.resolve(real)) {
      throw new GitError('Select the repository root, not a subdirectory.', 'bad-request');
    }
    return real;
  }
  const containing = await isRepository(cwd);
  if (containing !== undefined) return containing;
  const repos = await discoverRepositories(cwd);
  if (repos.length === 0) throw new GitError('No Git repository was found in this workspace.', 'not-a-repository');
  return repos[0].root;
}

/** Parse `git status --porcelain=v1 -z`. */
function parsePorcelainStatus(raw) {
  const tokens = raw.split('\0');
  const entries = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '') continue;
    if (token.length < 3) continue;
    const indexStatus = token[0];
    const worktreeStatus = token[1];
    const filePath = token.slice(3);
    let originalPath;
    if ('RC'.includes(indexStatus) || 'RC'.includes(worktreeStatus)) {
      originalPath = tokens[index + 1];
      index += 1;
    }
    const untracked = indexStatus === '?';
    const conflicted = ['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(indexStatus + worktreeStatus);
    entries.push({
      path: filePath,
      ...(originalPath ? { originalPath } : {}),
      index: indexStatus,
      worktree: worktreeStatus,
      staged: !untracked && indexStatus !== ' ',
      unstaged: !untracked && worktreeStatus !== ' ',
      untracked,
      conflicted,
    });
  }
  return entries;
}

function statusSummary(entries) {
  const summary = { staged: 0, unstaged: 0, untracked: 0, conflicted: 0, total: entries.length };
  for (const entry of entries) {
    if (entry.conflicted) summary.conflicted += 1;
    if (entry.staged) summary.staged += 1;
    if (entry.unstaged) summary.unstaged += 1;
    if (entry.untracked) summary.untracked += 1;
  }
  return summary;
}

async function readStatus(repoRoot) {
  const raw = await gitText(repoRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const entries = parsePorcelainStatus(raw);
  return { entries, summary: statusSummary(entries) };
}

async function readRemotes(repoRoot) {
  let raw = '';
  try {
    raw = await gitText(repoRoot, ['remote', '-v']);
  } catch {
    return [];
  }
  const byName = new Map();
  for (const line of raw.split('\n')) {
    const match = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(line);
    if (match === null) continue;
    const [, name, url, kind] = match;
    const remote = byName.get(name) ?? { name, fetchUrl: '', pushUrl: '' };
    if (kind === 'fetch') remote.fetchUrl = url;
    else remote.pushUrl = url;
    byName.set(name, remote);
  }
  return [...byName.values()];
}

async function readBranchState(repoRoot) {
  let branch = '';
  try {
    branch = (await gitTrim(repoRoot, ['symbolic-ref', '--short', '-q', 'HEAD'])) || '';
  } catch {
    branch = '';
  }
  let head = '';
  try {
    head = await gitTrim(repoRoot, ['rev-parse', '--short', 'HEAD']);
  } catch {
    head = '';
  }
  let upstream = '';
  try {
    upstream = await gitTrim(repoRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  } catch {
    upstream = '';
  }
  let ahead = 0;
  let behind = 0;
  if (upstream !== '') {
    try {
      const raw = await gitTrim(repoRoot, ['rev-list', '--left-right', '--count', 'HEAD...@{u}']);
      const [left, right] = raw.split(/\s+/).map((value) => Number.parseInt(value, 10) || 0);
      ahead = left;
      behind = right;
    } catch {
      // An unresolvable upstream is shown as absent.
    }
  }
  return { branch: branch || (head === '' ? '' : `detached@${head}`), detached: branch === '', head, upstream, ahead, behind };
}

/** True when Git is refusing because the current branch has no commits yet. */
function isUnbornHeadError(error) {
  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase();
  return (
    message.includes('does not have any commits yet') ||
    message.includes('bad default revision') ||
    message.includes('needed a single revision') ||
    message.includes("ambiguous argument 'head'") ||
    message.includes('no such ref: head') ||
    message.includes('unknown revision or path not in the working tree')
  );
}

async function readLog(repoRoot, options = {}) {
  const limit = requireLimit(options.limit, 50, 500);
  const skip = Math.max(0, Number.parseInt(String(options.skip ?? 0), 10) || 0);
  const args = [
    'log',
    '--no-color',
    '--date-order',
    `--format=${COMMIT_RECORD}`,
    '-n',
    String(limit + 1),
  ];
  if (skip > 0) args.push('--skip', String(skip));
  if (options.all === true) args.push('--all');
  else if (typeof options.ref === 'string' && options.ref !== '') args.push(options.ref);
  if (typeof options.range === 'string' && options.range !== '') args.push(options.range);
  if (typeof options.author === 'string' && options.author !== '') args.push(`--author=${options.author}`);
  if (typeof options.grep === 'string' && options.grep !== '') args.push('-i', `--grep=${options.grep}`);
  if (options.follow === true) args.push('--follow');
  if (typeof options.path === 'string' && options.path !== '') {
    args.push('--', safeRelativePath(options.path));
  }
  let raw;
  try {
    raw = await gitText(repoRoot, args);
  } catch (error) {
    const explicitRevision = typeof options.ref === 'string' && options.ref !== '' || typeof options.range === 'string' && options.range !== '';
    if (!explicitRevision && isUnbornHeadError(error)) {
      return { commits: [], hasMore: false, unborn: true };
    }
    throw error;
  }
  const commits = [];
  for (const record of raw.split('\x1e')) {
    const trimmed = record.replace(/^\n+/, '');
    if (trimmed === '') continue;
    const fields = trimmed.split('\x1f');
    if (fields.length < 8) continue;
    const [hash, short, author, email, seconds, subject, refs, parents] = fields;
    commits.push({
      hash,
      short,
      author,
      email,
      time: Number.parseInt(seconds, 10) * 1000,
      subject,
      refs: refs.split(',').map((value) => value.trim()).filter((value) => value !== ''),
      parents: parents.split(' ').map((value) => value.trim()).filter((value) => value !== ''),
    });
  }
  const hasMore = commits.length > limit;
  if (hasMore) commits.length = limit;
  return { commits, hasMore };
}

function decodePatchText(buffer) {
  return buffer.toString('utf8');
}

/** Split a unified patch into per-file blocks with simple metadata. */
function splitPatch(patch) {
  const lines = patch.split('\n');
  const files = [];
  let current = null;
  let preamble = [];
  const pushCurrent = () => {
    if (current === null) return;
    const content = current.lines.join('\n');
    let additions = 0;
    let deletions = 0;
    let binary = false;
    for (const line of current.lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) additions += 1;
      else if (line.startsWith('-') && !line.startsWith('---')) deletions += 1;
      if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) binary = true;
    }
    const oldPath = current.oldPath;
    const newPath = current.newPath;
    const status = current.status
      ?? (newPath === '/dev/null' ? 'D' : oldPath === '/dev/null' ? 'A' : current.renamed ? 'R' : 'M');
    files.push({
      path: newPath === '/dev/null' ? oldPath : newPath,
      ...(oldPath && oldPath !== newPath && oldPath !== '/dev/null' ? { originalPath: oldPath } : {}),
      status,
      additions,
      deletions,
      binary,
      patch: content,
    });
    current = null;
  };
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      pushCurrent();
      current = {
        lines: [line],
        oldPath: undefined,
        newPath: undefined,
        renamed: false,
        status: undefined,
      };
      const match = /^diff --git a\/(.*?) b\/(.*)$/.exec(line);
      if (match !== null) {
        current.oldPath = match[1];
        current.newPath = match[2];
      }
      continue;
    }
    if (current === null) {
      if (line !== '') preamble.push(line);
      continue;
    }
    current.lines.push(line);
    if (line.startsWith('+++ ')) {
      const value = line.slice(4).replace(/^b\//, '');
      if (value !== '/dev/null') current.newPath = value;
      else current.newPath = '/dev/null';
    } else if (line.startsWith('--- ')) {
      const value = line.slice(4).replace(/^a\//, '');
      current.oldPath = value;
    } else if (line.startsWith('new file mode ')) {
      current.status = 'A';
    } else if (line.startsWith('deleted file mode ')) {
      current.status = 'D';
    } else if (line.startsWith('rename from ')) {
      current.renamed = true;
      current.oldPath = line.slice('rename from '.length);
    } else if (line.startsWith('rename to ')) {
      current.renamed = true;
      current.newPath = line.slice('rename to '.length);
    } else if (line.startsWith('Binary files ')) {
      current.binary = true;
    }
  }
  pushCurrent();
  if (files.length === 0 && preamble.length > 0) {
    return { files: [], patch, preamble: preamble.join('\n') };
  }
  return { files, patch, preamble: preamble.join('\n') };
}

function capPatch(patch) {
  const buffer = Buffer.from(patch, 'utf8');
  if (buffer.byteLength <= MAX_PATCH_BYTES) return { patch, truncated: false };
  const sliced = buffer.subarray(0, MAX_PATCH_BYTES).toString('utf8');
  const lastNewline = sliced.lastIndexOf('\n');
  return {
    patch: `${lastNewline > 0 ? sliced.slice(0, lastNewline) : sliced}\n`,
    truncated: true,
  };
}

/** Build a pseudo unified diff for one untracked file. */
async function untrackedPatch(repoRoot, relative) {
  const absolute = path.join(repoRoot, relative);
  if (!isInside(repoRoot, absolute)) throw new GitError('A path cannot leave the repository.', 'forbidden');
  let stat;
  try {
    stat = await fs.stat(absolute);
  } catch {
    throw new GitError(`A file does not exist: ${relative}`, 'not-found');
  }
  if (!stat.isFile()) throw new GitError(`Not a file: ${relative}`, 'bad-request');
  if (stat.size > MAX_UNTRACKED_BYTES) {
    return `diff --git a/${relative} b/${relative}\nnew file mode 100644\n--- /dev/null\n+++ b/${relative}\n@@ -0,0 +1 @@\n+[file is ${stat.size} bytes; preview skipped]\n`;
  }
  const buffer = await fs.readFile(absolute);
  if (buffer.includes(0)) {
    return `diff --git a/${relative} b/${relative}\nnew file mode 100644\n--- /dev/null\n+++ b/${relative}\nBinary files /dev/null and b/${relative} differ\n`;
  }
  const text = buffer.toString('utf8');
  const lines = text.split('\n');
  const count = text.endsWith('\n') ? lines.length - 1 : lines.length;
  const body = lines
    .slice(0, Math.max(1, count))
    .map((line) => `+${line}`)
    .join('\n');
  return [
    `diff --git a/${relative} b/${relative}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${relative}`,
    `@@ -0,0 +1,${Math.max(1, count)} @@`,
    body,
    '',
  ].join('\n');
}

async function collectDiff(repoRoot, payload) {
  const scope = optionalString(payload, 'scope') ?? 'working';
  const relative = optionalString(payload, 'path');
  const safePath = relative === undefined ? undefined : safeRelativePath(relative);
  if (payload.statOnly === true) return collectDiffStat(repoRoot, scope, safePath, payload);
  let raw = '';
  if (scope === 'untracked' || (safePath !== undefined && scope === 'working')) {
    const status = await readStatus(repoRoot);
    const target = safePath === undefined ? status.entries.filter((entry) => entry.untracked) : status.entries.filter((entry) => entry.path === safePath);
    if (scope === 'untracked' || target.every((entry) => entry.untracked)) {
      const patches = [];
      for (const entry of target.slice(0, 200)) patches.push(await untrackedPatch(repoRoot, entry.path));
      raw = patches.join('\n');
      return finishDiff(raw);
    }
  }
  const baseArgs = ['--no-color', '--no-ext-diff', '--find-renames', '--unified=3'];
  if (scope === 'staged') {
    const args = ['diff', '--cached', ...baseArgs];
    if (safePath !== undefined) args.push('--', safePath);
    raw = await gitText(repoRoot, args);
  } else if (scope === 'working') {
    const args = ['diff', ...baseArgs];
    if (safePath !== undefined) args.push('--', safePath);
    raw = await gitText(repoRoot, args);
  } else if (scope === 'commit') {
    const commit = requireString(payload, 'commit');
    assertRefLike(commit);
    const args = ['show', commit, '--format=', ...baseArgs];
    if (safePath !== undefined) args.push('--', safePath);
    raw = await gitText(repoRoot, args);
  } else if (scope === 'range') {
    const base = requireString(payload, 'base');
    const head = requireString(payload, 'head');
    assertRefLike(base);
    assertRefLike(head);
    const args = ['diff', ...baseArgs, `${base}...${head}`];
    if (safePath !== undefined) args.push('--', safePath);
    raw = await gitText(repoRoot, args);
  } else {
    throw new GitError(`Unknown diff scope "${scope}".`, 'bad-request');
  }
  return finishDiff(raw);
}

function finishDiff(raw) {
  const capped = capPatch(raw);
  const parsed = splitPatch(capped.patch);
  return {
    patch: capped.patch,
    truncated: capped.truncated,
    preamble: parsed.preamble,
    files: parsed.files,
  };
}

function assertRefLike(value) {
  if (typeof value !== 'string' || value === '' || value.startsWith('-') || value.includes('\0') || value.includes('..')) {
    throw new GitError('Invalid revision.', 'bad-request');
  }
}

/** List files and line counts for a diff without loading any patch bytes. */
async function collectDiffStat(repoRoot, scope, safePath, payload) {
  let numstatArgs;
  let nameStatusArgs;
  if (scope === 'staged') {
    numstatArgs = ['diff', '--cached', '--numstat', '--find-renames'];
    nameStatusArgs = ['diff', '--cached', '--name-status', '--find-renames'];
  } else if (scope === 'working' || scope === 'untracked') {
    numstatArgs = ['diff', '--numstat', '--find-renames'];
    nameStatusArgs = ['diff', '--name-status', '--find-renames'];
  } else if (scope === 'commit') {
    const commit = requireString(payload, 'commit');
    assertRefLike(commit);
    numstatArgs = ['show', commit, '--format=', '--numstat', '--find-renames'];
    nameStatusArgs = ['show', commit, '--format=', '--name-status', '--find-renames'];
  } else if (scope === 'range') {
    const base = requireString(payload, 'base');
    const head = requireString(payload, 'head');
    assertRefLike(base);
    assertRefLike(head);
    numstatArgs = ['diff', '--numstat', '--find-renames', `${base}...${head}`];
    nameStatusArgs = ['diff', '--name-status', '--find-renames', `${base}...${head}`];
  } else {
    throw new GitError(`Unknown diff scope "${scope}".`, 'bad-request');
  }
  if (safePath !== undefined) {
    numstatArgs.push('--', safePath);
    nameStatusArgs.push('--', safePath);
  }
  const [numstatRaw, nameStatusRaw] = await Promise.all([
    gitText(repoRoot, numstatArgs),
    gitText(repoRoot, nameStatusArgs),
  ]);
  const stats = parseNumstat(numstatRaw);
  const files = [];
  for (const line of nameStatusRaw.split('\n')) {
    const match = /^([A-Z])\d*\t(.+?)(?:\t(.+))?$/.exec(line);
    if (match === null) continue;
    const status = match[1];
    const oldPath = match[3] === undefined ? undefined : match[2];
    const filePath = match[3] ?? match[2];
    const stat = stats.get(filePath) ?? stats.get(match[2]) ?? { additions: 0, deletions: 0, binary: false };
    files.push({
      path: filePath,
      ...(oldPath && oldPath !== filePath ? { originalPath: oldPath } : {}),
      status,
      additions: stat.additions,
      deletions: stat.deletions,
      binary: stat.binary,
      patch: '',
    });
  }
  return { files, patch: '', truncated: false, preamble: '' };
}

async function readCommit(repoRoot, hash) {
  assertRefLike(hash);
  const metaRaw = await gitText(repoRoot, [
    'show',
    '-s',
    '--no-color',
    '--format=%H%x1f%h%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%ce%x1f%ct%x1f%s%x1f%B%x1f%D%x1f%P',
    hash,
  ]);
  const fields = metaRaw.split('\x1f');
  const nameStatusRaw = await gitText(repoRoot, ['show', '--name-status', '--format=', '-M', hash]);
  const numstatRaw = await gitText(repoRoot, ['show', '--numstat', '--format=', '-M', hash]);
  const stats = parseNumstat(numstatRaw);
  const files = [];
  for (const line of nameStatusRaw.split('\n')) {
    const match = /^([A-Z])\d*\t(.+?)(?:\t(.+))?$/.exec(line);
    if (match === null) continue;
    const status = match[1];
    const oldPath = match[3] === undefined ? undefined : match[2];
    const filePath = match[3] ?? match[2];
    const stat = stats.get(filePath) ?? stats.get(match[2]) ?? { additions: 0, deletions: 0, binary: false };
    files.push({
      path: filePath,
      ...(oldPath && oldPath !== filePath ? { originalPath: oldPath } : {}),
      status,
      additions: stat.additions,
      deletions: stat.deletions,
      binary: stat.binary,
      patch: '',
    });
  }
  return {
    hash: fields[0] ?? hash,
    short: fields[1] ?? hash.slice(0, 7),
    author: fields[2] ?? '',
    email: fields[3] ?? '',
    time: (Number.parseInt(fields[4] ?? '', 10) || 0) * 1000,
    committer: fields[5] ?? '',
    committerEmail: fields[6] ?? '',
    commitTime: (Number.parseInt(fields[7] ?? '', 10) || 0) * 1000,
    subject: fields[8] ?? '',
    message: (fields[9] ?? '').trim(),
    refs: (fields[10] ?? '').split(',').map((value) => value.trim()).filter((value) => value !== ''),
    parents: (fields[11] ?? '').split(' ').map((value) => value.trim()).filter((value) => value !== ''),
    files,
    patch: '',
    truncated: false,
  };
}

/** Parse `git show --numstat`, normalizing rename paths to their new name. */
function parseNumstat(raw) {
  const stats = new Map();
  for (const line of raw.split('\n')) {
    if (line === '') continue;
    const first = line.indexOf('\t');
    const second = first < 0 ? -1 : line.indexOf('\t', first + 1);
    if (first < 0 || second < 0) continue;
    const added = line.slice(0, first);
    const deleted = line.slice(first + 1, second);
    let filePath = line.slice(second + 1);
    if (filePath.includes(' => ')) {
      if (filePath.includes('{') && filePath.includes('}')) {
        filePath = filePath.replace(/\{[^{}]* => ([^{}]*)\}/, '$1').replace(/\/{2,}/g, '/');
      } else {
        filePath = filePath.split(' => ').pop();
      }
    }
    stats.set(filePath, {
      additions: added === '-' ? 0 : Number.parseInt(added, 10) || 0,
      deletions: deleted === '-' ? 0 : Number.parseInt(deleted, 10) || 0,
      binary: added === '-' || deleted === '-',
    });
  }
  return stats;
}

async function readBlame(repoRoot, payload) {
  const relative = safeRelativePath(requireString(payload, 'path'));
  const args = ['blame', '--porcelain'];
  const start = Number.parseInt(String(payload.start ?? ''), 10);
  const end = Number.parseInt(String(payload.end ?? ''), 10);
  if (Number.isInteger(start) && start > 0) {
    const last = Number.isInteger(end) && end >= start ? end : start;
    args.push('-L', `${start},${last}`);
  }
  args.push('--', relative);
  let raw;
  try {
    raw = await gitText(repoRoot, args, { timeout: 30_000 });
  } catch (error) {
    if (isUnbornHeadError(error)) return { path: relative, lines: [], unborn: true };
    throw error;
  }
  const lines = raw.split('\n');
  const result = [];
  let index = 0;
  let current = null;
  const meta = new Map();
  while (index < lines.length) {
    const line = lines[index];
    if (line === '') {
      index += 1;
      continue;
    }
    const header = /^(\^?[0-9a-f]{7,40}) (\d+) (\d+)(?: (\d+))?$/.exec(line);
    if (header !== null) {
      const hash = header[1].replace(/^\^/, '');
      current = {
        hash,
        short: hash.slice(0, 8),
        originalLine: Number.parseInt(header[2], 10),
        line: Number.parseInt(header[3], 10),
        author: '',
        email: '',
        time: 0,
        summary: '',
        content: '',
      };
      index += 1;
      const cached = meta.get(hash);
      if (cached !== undefined) Object.assign(current, cached);
      while (index < lines.length && !lines[index].startsWith('\t')) {
        const headerLine = lines[index];
        index += 1;
        const space = headerLine.indexOf(' ');
        if (space < 0) continue;
        const key = headerLine.slice(0, space);
        const value = headerLine.slice(space + 1);
        if (key === 'author') current.author = value;
        else if (key === 'author-mail') current.email = value.replace(/^<|>$/g, '');
        else if (key === 'author-time') current.time = (Number.parseInt(value, 10) || 0) * 1000;
        else if (key === 'summary') current.summary = value;
      }
      meta.set(hash, {
        author: current.author,
        email: current.email,
        time: current.time,
        summary: current.summary,
      });
      if (index < lines.length && lines[index].startsWith('\t')) {
        current.content = lines[index].slice(1);
        index += 1;
      }
      result.push(current);
      current = null;
      if (result.length >= 3000) break;
      continue;
    }
    index += 1;
  }
  return { path: relative, lines: result };
}

async function readBranches(repoRoot) {
  const format = [
    '%(refname)',
    '%(refname:short)',
    '%(objectname:short)',
    '%(committerdate:unix)',
    '%(authorname)',
    '%(upstream:short)',
    '%(contents:subject)',
    '%(HEAD)',
  ].join('%09');
  const raw = await gitText(repoRoot, ['for-each-ref', '--sort=-committerdate', `--format=${format}`, 'refs/heads', 'refs/remotes']);
  const local = [];
  const remote = [];
  for (const line of raw.split('\n')) {
    if (line === '') continue;
    const [refname, name, short, seconds, author, upstream, subject, head] = line.split('\t');
    if (refname === undefined || name === undefined) continue;
    if (name.endsWith('/HEAD')) continue;
    const item = {
      refname,
      name,
      short,
      time: (Number.parseInt(seconds ?? '', 10) || 0) * 1000,
      author: author ?? '',
      upstream: upstream ?? '',
      subject: subject ?? '',
      current: head === '*',
    };
    if (refname.startsWith('refs/heads/')) local.push(item);
    else remote.push(item);
  }
  return { local, remote };
}

async function readStashes(repoRoot) {
  let raw = '';
  try {
    raw = await gitText(repoRoot, ['stash', 'list', '--format=%gd%x1f%H%x1f%at%x1f%gs']);
  } catch {
    return [];
  }
  const result = [];
  for (const line of raw.split('\n')) {
    if (line === '') continue;
    const [ref, hash, seconds, subject] = line.split('\x1f');
    result.push({
      ref,
      hash,
      short: (hash ?? '').slice(0, 8),
      time: (Number.parseInt(seconds ?? '', 10) || 0) * 1000,
      subject: subject ?? '',
    });
  }
  return result;
}

function normalizeRemoteUrl(url) {
  if (typeof url !== 'string' || url === '') return undefined;
  const ssh = /^git@([^:]+):(.+?)(?:\.git)?$/.exec(url);
  if (ssh !== null) return `https://${ssh[1]}/${ssh[2].replace(/\.git$/, '')}`;
  const sshProtocol = /^ssh:\/\/git@([^/]+)\/(.+?)(?:\.git)?$/.exec(url);
  if (sshProtocol !== null) return `https://${sshProtocol[1]}/${sshProtocol[2].replace(/\.git$/, '')}`;
  const https = /^(https?:\/\/.+?)(?:\.git)?\/?$/.exec(url);
  if (https !== null) return https[1];
  return undefined;
}

async function buildOverview(ctx, payload) {
  const cwd = await workspaceOf(ctx, payload);
  const requested = optionalString(payload, 'repoRoot');
  let repoRoot;
  try {
    repoRoot = await resolveRepository(cwd, requested);
  } catch (error) {
    if (error instanceof GitError && error.code === 'not-a-repository') {
      return { workspace: cwd, repos: [], repoRoot: '', empty: true };
    }
    throw error;
  }
  const [branchState, status, remotes, stashes, repos, recent] = await Promise.all([
    readBranchState(repoRoot),
    readStatus(repoRoot),
    readRemotes(repoRoot),
    readStashes(repoRoot),
    discoverRepositories(cwd),
    readLog(repoRoot, { limit: 6 }).catch(() => ({ commits: [], hasMore: false })),
  ]);
  let user = '';
  try {
    user = await gitTrim(repoRoot, ['config', 'user.name']);
  } catch {
    user = '';
  }
  return {
    workspace: cwd,
    repoRoot,
    repoName: path.basename(repoRoot),
    repos: repos.length > 0 ? repos : [{ root: repoRoot, name: path.basename(repoRoot), branch: branchState.branch, isCurrent: true }],
    branch: branchState.branch,
    detached: branchState.detached,
    head: branchState.head,
    upstream: branchState.upstream,
    ahead: branchState.ahead,
    behind: branchState.behind,
    status,
    remotes: remotes.map((remote) => ({ ...remote, webUrl: normalizeRemoteUrl(remote.fetchUrl || remote.pushUrl) })),
    stashes: stashes.length,
    user,
    recent: recent.commits,
    empty: false,
  };
}

async function readFiles(repoRoot) {
  const raw = await gitText(repoRoot, ['ls-files', '-z']);
  return raw
    .split('\0')
    .filter((value) => value !== '')
    .slice(0, 20_000);
}

async function assertRef(repoRoot, ref) {
  if (typeof ref !== 'string' || ref === '' || ref.startsWith('-') || ref.includes('\0')) {
    throw new GitError('Invalid branch name.', 'bad-request');
  }
  try {
    await gitTrim(repoRoot, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  } catch {
    throw new GitError(`Unknown revision "${ref}".`, 'not-found');
  }
}

async function runAction(ctx, payload) {
  const cwd = await workspaceOf(ctx, payload);
  const repoRoot = await resolveRepository(cwd, optionalString(payload, 'repoRoot'));
  const action = requireString(payload, 'action');
  let output = '';
  switch (action) {
    case 'stage': {
      if (payload.all === true) {
        await git(repoRoot, ['add', '-A']);
      } else {
        await git(repoRoot, ['add', '--', ...pathListOf(payload)]);
      }
      break;
    }
    case 'unstage': {
      if (payload.all === true) {
        try {
          await git(repoRoot, ['reset', '-q', 'HEAD', '--']);
        } catch {
          await git(repoRoot, ['rm', '-r', '--cached', '--ignore-unmatch', '--', '.']);
        }
      } else {
        const paths = pathListOf(payload);
        try {
          await git(repoRoot, ['reset', '-q', 'HEAD', '--', ...paths]);
        } catch {
          await git(repoRoot, ['rm', '-r', '--cached', '--ignore-unmatch', '--', ...paths]);
        }
      }
      break;
    }
    case 'discard': {
      const paths = pathListOf(payload);
      const status = await readStatus(repoRoot);
      for (const relative of paths) {
        const entry = status.entries.find((candidate) => candidate.path === relative);
        if (entry?.untracked === true) {
          await git(repoRoot, ['clean', '-f', '--', relative]);
        } else {
          try {
            await git(repoRoot, ['restore', '--worktree', '--', relative]);
          } catch {
            await git(repoRoot, ['checkout', '--', relative]);
          }
        }
      }
      break;
    }
    case 'commit': {
      const message = requireString(payload, 'message');
      if (message.length > 20_000) throw new GitError('The commit message is too long.', 'bad-request');
      if (payload.all === true) await git(repoRoot, ['add', '-A']);
      const args = ['commit', '-m', message];
      if (payload.amend === true) args.push('--amend');
      if (payload.signoff === true) args.push('--signoff');
      if (payload.noVerify === true) args.push('--no-verify');
      const result = await git(repoRoot, args);
      output = `${result.stdout}${result.stderr}`.trim();
      break;
    }
    case 'checkout': {
      const branch = requireString(payload, 'branch');
      await assertRef(repoRoot, branch);
      await git(repoRoot, ['checkout', branch], { timeout: 60_000 });
      break;
    }
    case 'createBranch': {
      const name = requireString(payload, 'name');
      const from = optionalString(payload, 'from');
      try {
        await gitTrim(repoRoot, ['check-ref-format', '--branch', name]);
      } catch {
        throw new GitError(`Invalid branch name "${name}".`, 'bad-request');
      }
      if (from !== undefined) await assertRef(repoRoot, from);
      if (payload.checkout === false) {
        await git(repoRoot, ['branch', name, ...(from ? [from] : [])]);
      } else {
        await git(repoRoot, ['switch', '-c', name, ...(from ? [from] : [])], { timeout: 60_000 });
      }
      break;
    }
    case 'deleteBranch': {
      const name = requireString(payload, 'name');
      try {
        await gitTrim(repoRoot, ['check-ref-format', '--branch', name]);
      } catch {
        throw new GitError(`Invalid branch name "${name}".`, 'bad-request');
      }
      await git(repoRoot, ['branch', payload.force === true ? '-D' : '-d', '--', name]);
      break;
    }
    case 'fetch': {
      const result = await git(repoRoot, ['fetch', '--all', '--prune'], { timeout: 120_000 });
      output = `${result.stdout}${result.stderr}`.trim();
      break;
    }
    case 'pull': {
      const result = await git(repoRoot, ['pull', '--ff-only'], { timeout: 120_000 });
      output = `${result.stdout}${result.stderr}`.trim();
      break;
    }
    case 'push': {
      const args = ['push'];
      if (payload.setUpstream === true) args.push('-u', 'origin', 'HEAD');
      const result = await git(repoRoot, args, { timeout: 120_000 });
      output = `${result.stdout}${result.stderr}`.trim();
      break;
    }
    case 'stashSave': {
      const message = optionalString(payload, 'message') ?? '';
      const args = ['stash', 'push'];
      if (payload.includeUntracked === true) args.push('--include-untracked');
      if (message !== '') args.push('-m', message);
      await git(repoRoot, args);
      break;
    }
    case 'stashPop':
    case 'stashDrop': {
      const ref = requireString(payload, 'ref');
      if (!/^stash@\{\d+\}$/.test(ref)) throw new GitError('Invalid stash reference.', 'bad-request');
      await git(repoRoot, ['stash', action === 'stashPop' ? 'pop' : 'drop', ref], { timeout: 60_000 });
      break;
    }
    case 'abortMerge': {
      await git(repoRoot, ['merge', '--abort']);
      break;
    }
    default:
      throw new GitError(`Unknown action "${action}".`, 'bad-request');
  }
  return { action, output };
}

/** Dispatch one API method. */
async function dispatch(ctx, method, payload) {
  const cwd = await workspaceOf(ctx, payload);
  if (method === 'discover') {
    return { workspace: cwd, repos: await discoverRepositories(cwd) };
  }
  if (method === 'overview') return buildOverview(ctx, payload);
  const repoRoot = await resolveRepository(cwd, optionalString(payload, 'repoRoot'));
  switch (method) {
    case 'status': {
      const status = await readStatus(repoRoot);
      return { repoRoot, ...status };
    }
    case 'log': {
      const result = await readLog(repoRoot, payload);
      return { repoRoot, ...result };
    }
    case 'commit': {
      return { repoRoot, commit: await readCommit(repoRoot, requireString(payload, 'hash')) };
    }
    case 'diff': {
      return { repoRoot, ...(await collectDiff(repoRoot, payload)) };
    }
    case 'blame': {
      return { repoRoot, ...(await readBlame(repoRoot, payload)) };
    }
    case 'branches': {
      return { repoRoot, ...(await readBranches(repoRoot)) };
    }
    case 'stashes': {
      return { repoRoot, stashes: await readStashes(repoRoot) };
    }
    case 'remotes': {
      return { repoRoot, remotes: await readRemotes(repoRoot) };
    }
    case 'files': {
      return { repoRoot, files: await readFiles(repoRoot) };
    }
    case 'fileHistory': {
      const relative = safeRelativePath(requireString(payload, 'path'));
      const result = await readLog(repoRoot, { ...payload, path: relative, limit: requireLimit(payload.limit, 50, 500) });
      return { repoRoot, path: relative, ...result };
    }
    case 'search': {
      const result = await readLog(repoRoot, { ...payload, all: true, limit: requireLimit(payload.limit, 60, 200) });
      return { repoRoot, ...result };
    }
    case 'compare': {
      const base = requireString(payload, 'base');
      const head = requireString(payload, 'head');
      assertRefLike(base);
      assertRefLike(head);
      const [log, diff] = await Promise.all([
        readLog(repoRoot, { range: `${base}...${head}`, limit: requireLimit(payload.limit, 80, 300) }),
        collectDiff(repoRoot, { scope: 'range', base, head, statOnly: true }),
      ]);
      return { repoRoot, base, head, ...log, diff };
    }
    case 'action': {
      const result = await runAction(ctx, payload);
      return { repoRoot, ...result };
    }
    default:
      throw new GitError(`Unknown method "${method}".`, 'bad-request');
  }
}

function writeJson(response, status, value) {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': String(body.byteLength),
  });
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new GitError('The request body is too large.', 'bad-request'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

/** Services required before the route can mount. */
export const inject = ['webServer', 'sessions', 'connection'];

/** Internal surface used by the repository's own smoke tests. */
export const __test = {
  discoverRepositories,
  parsePorcelainStatus,
  readBranchState,
  readStatus,
  readLog,
  readCommit,
  collectDiff,
  splitPatch,
  readBlame,
  readBranches,
  readStashes,
  readRemotes,
  readFiles,
  normalizeRemoteUrl,
};

export function apply(ctx) {
  const dispose = ctx.webServer.register({
    kind: 'prefix',
    path: API_PREFIX,
    handler: async (request, response) => {
      const reject = () => {
        try {
          return ctx.connection.requestRejection(request) !== undefined;
        } catch {
          return true;
        }
      };
      if (reject()) {
        writeJson(response, 403, { ok: false, error: { code: 'forbidden', message: 'This route is only reachable from the DSH page.' } });
        return;
      }
      if (request.method !== 'POST') {
        writeJson(response, 405, { ok: false, error: { code: 'method', message: 'POST is required.' } });
        return;
      }
      let payload;
      try {
        const raw = await readBody(request);
        payload = raw === '' ? {} : JSON.parse(raw);
        if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new GitError('The request body must be a JSON object.', 'bad-request');
        }
      } catch (error) {
        writeJson(response, 400, {
          ok: false,
          error: { code: error instanceof GitError ? error.code : 'bad-request', message: error instanceof Error ? error.message : String(error) },
        });
        return;
      }
      const pathname = new URL(request.url ?? '/', 'http://dsh.invalid').pathname;
      const pathMethod = pathname.startsWith(`${API_PREFIX}/`) ? pathname.slice(API_PREFIX.length + 1) : '';
      const bodyMethod = typeof payload.method === 'string' ? payload.method : '';
      const method = pathMethod !== '' ? pathMethod : bodyMethod;
      if (method === '' || method.includes('/')) {
        writeJson(response, 404, { ok: false, error: { code: 'no-method', message: 'Unknown API method.' } });
        return;
      }
      try {
        const value = await dispatch(ctx, method, payload);
        writeJson(response, 200, { ok: true, value });
      } catch (error) {
        const code = error instanceof GitError ? error.code : 'internal';
        const message = error instanceof Error ? error.message : String(error);
        if (!(error instanceof GitError)) {
          ctx.logger?.warn?.('dsh-git-explorer: %s failed', method);
          ctx.logger?.warn?.(error);
        }
        writeJson(response, code === 'forbidden' ? 403 : code === 'not-found' ? 404 : 400, {
          ok: false,
          error: { code, message },
        });
      }
    },
  });
  ctx.effect(() => dispose, 'dsh-git-explorer: /dsh-git/api route');
}
