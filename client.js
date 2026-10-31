/**
 * dsh-git-explorer — browser half.
 *
 * A self-contained Git workbench built from the primitives DSH already ships:
 * the right sidebar tab registry, the conversation View tab slot and the
 * shared theme tokens. It talks to the host half over `/dsh-git/api`.
 */
window.__ModuleLoader__.load({
  id: 'dsh-git-explorer',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Locale namespace owned by this plugin. */
    const NS = 'dshGit';
    /** Sidebar tab kind and conversation View id. */
    const KIND = 'gitlens';
    /** Sidebar tab implementation identity (also its body/title registration key). */
    const TAB_ID = 'dsh-git-explorer';
    /** Upper bound on file rows rendered for one commit or comparison. */
    const FILE_ROW_LIMIT = 500;

    /* ------------------------------------------------------------------ */
    /* Copy                                                               */
    /* ------------------------------------------------------------------ */

    const ZH = {
      'view.label': 'Git',
      'sidebar.title': 'Git',
      'guide.title': 'Git 仓库',
      'guide.description': '提交历史、工作区改动、分支、储藏与逐行追溯',
      'open': '在侧边栏打开 Git',
      'open.main': '在标签页中打开 Git',
      'refresh': '刷新',
      'loading': '加载中…',
      'noRepo': '当前工作区没有 Git 仓库',
      'noRepoHint': '初始化一个仓库，或把工作区切换到一个 Git 项目。',
      'emptyWorkspace': '等待工作区…',
      'search': '搜索提交、作者或信息',
      'searchPlaceholder': '搜索提交…',
      'tabs.changes': '改动',
      'tabs.history': '历史',
      'tabs.branches': '分支',
      'tabs.stashes': '储藏',
      'tabs.compare': '比较',
      'tabs.blame': '追溯',
      'status.staged': '已暂存',
      'status.unstaged': '未暂存',
      'status.untracked': '未跟踪',
      'status.conflicted': '冲突',
      'status.clean': '工作区干净',
      'status.cleanHint': '没有待提交的改动。',
      'changes.commit': '提交',
      'changes.commitPlaceholder': '提交信息（⌘/Ctrl + Enter 提交）',
      'changes.stageAll': '提交前暂存全部改动',
      'changes.nothingStaged': '暂存一些改动后才能提交',
      'changes.amend': '修改上一次提交',
      'changes.refresh': '刷新改动',
      'action.stage': '暂存',
      'action.unstage': '取消暂存',
      'action.discard': '丢弃改动',
      'action.discardConfirm': '确定丢弃这些改动吗？此操作不可撤销。',
      'action.commit': '提交',
      'action.checkout': '检出',
      'action.delete': '删除分支',
      'action.deleteConfirm': '确定删除这个本地分支吗？',
      'action.create': '新建分支',
      'action.createPlaceholder': '新分支名',
      'action.fetch': '抓取',
      'action.pull': '拉取',
      'action.push': '推送',
      'action.stash': '储藏全部改动',
      'action.stashPop': '恢复',
      'action.stashDrop': '删除',
      'action.popConfirm': '把储藏恢复到工作区吗？',
      'action.dropConfirm': '删除这个储藏吗？',
      'action.stashMessage': '储藏说明（可选）',
      'action.includeUntracked': '包含未跟踪文件',
      'action.compare': '比较',
      'action.loadMore': '加载更多',
      'action.back': '返回',
      'action.copy': '复制',
      'action.copied': '已复制',
      'action.openRemote': '在远端打开',
      'action.history': '文件历史',
      'action.blame': '逐行追溯',
      'action.close': '关闭',
      'action.cancel': '取消',
      'action.confirm': '确定',
      'action.retry': '重试',
      'history.empty': '没有提交记录',
      'history.unborn': '当前分支还没有提交',
      'history.unbornHint': '先在「改动」里暂存文件，写下提交信息并提交一次。',
      'history.pathFilter': '仅显示此文件的历史',
      'history.author': '作者',
      'history.loading': '正在读取提交…',
      'branches.local': '本地分支',
      'branches.remote': '远端分支',
      'branches.current': '当前',
      'branches.createFrom': '基于（可选）',
      'branches.empty': '没有分支',
      'stashes.empty': '没有储藏',
      'stashes.hint': '储藏会保存当前工作区和暂存区的改动。',
      'compare.base': '起点',
      'compare.head': '终点',
      'compare.empty': '输入两个引用后比较',
      'compare.noCommits': '两个引用之间没有提交',
      'blame.path': '文件路径',
      'blame.pathPlaceholder': '例如 src/index.ts',
      'blame.load': '追溯',
      'blame.empty': '输入文件路径以查看逐行归属',
      'blame.noResult': '没有可显示的追溯结果',
      'blame.start': '起始行',
      'blame.end': '结束行',
      'blame.author': '作者',
      'blame.date': '时间',
      'commit.message': '提交信息',
      'commit.files': '改动文件',
      'commit.parent': '父提交',
      'commit.stats': '统计',
      'commit.none': '没有文件改动',
      'diff.added': '新增',
      'diff.deleted': '删除',
      'diff.truncated': '补丁过大，已截断显示',
      'diff.binary': '二进制文件，无法显示文本差异',
      'diff.noChanges': '没有差异',
      'diff.files': '文件',
      'common.unknown': '未知',
      'common.now': '刚刚',
      'common.justNow': '刚刚',
      'common.minutesAgo': '{n} 分钟前',
      'common.hoursAgo': '{n} 小时前',
      'common.daysAgo': '{n} 天前',
      'common.weeksAgo': '{n} 周前',
      'common.monthsAgo': '{n} 个月前',
      'common.yearsAgo': '{n} 年前',
      'common.branch': '分支',
      'common.detached': '游离 HEAD',
      'common.ahead': '领先 {n}',
      'common.behind': '落后 {n}',
      'common.error': '操作失败',
      'common.working': '处理中…',
      'common.changedFiles': '{n} 个文件',
      'common.repo': '仓库',
      'common.noData': '暂无数据',
      'common.close': '关闭',
      'common.moreFiles': '仅显示前 {n} 个文件',
    };

    const EN = {
      'view.label': 'Git',
      'sidebar.title': 'Git',
      'guide.title': 'Git repositories',
      'guide.description': 'History, working changes, branches, stashes and line blame',
      'open': 'Open Git in the sidebar',
      'open.main': 'Open Git as a conversation tab',
      'refresh': 'Refresh',
      'loading': 'Loading…',
      'noRepo': 'No Git repository in this workspace',
      'noRepoHint': 'Initialize a repository or switch the workspace to a Git project.',
      'emptyWorkspace': 'Waiting for a workspace…',
      'search': 'Search commits, authors or messages',
      'searchPlaceholder': 'Search commits…',
      'tabs.changes': 'Changes',
      'tabs.history': 'History',
      'tabs.branches': 'Branches',
      'tabs.stashes': 'Stashes',
      'tabs.compare': 'Compare',
      'tabs.blame': 'Blame',
      'status.staged': 'Staged',
      'status.unstaged': 'Unstaged',
      'status.untracked': 'Untracked',
      'status.conflicted': 'Conflicted',
      'status.clean': 'Working tree clean',
      'status.cleanHint': 'There are no changes to commit.',
      'changes.commit': 'Commit',
      'changes.commitPlaceholder': 'Commit message (⌘/Ctrl + Enter to commit)',
      'changes.stageAll': 'Stage all changes before committing',
      'changes.nothingStaged': 'Stage some changes to commit',
      'changes.amend': 'Amend the previous commit',
      'changes.refresh': 'Refresh changes',
      'action.stage': 'Stage',
      'action.unstage': 'Unstage',
      'action.discard': 'Discard changes',
      'action.discardConfirm': 'Discard these changes? This cannot be undone.',
      'action.commit': 'Commit',
      'action.checkout': 'Checkout',
      'action.delete': 'Delete branch',
      'action.deleteConfirm': 'Delete this local branch?',
      'action.create': 'Create branch',
      'action.createPlaceholder': 'New branch name',
      'action.fetch': 'Fetch',
      'action.pull': 'Pull',
      'action.push': 'Push',
      'action.stash': 'Stash all changes',
      'action.stashPop': 'Pop',
      'action.stashDrop': 'Drop',
      'action.popConfirm': 'Restore this stash into the working tree?',
      'action.dropConfirm': 'Drop this stash?',
      'action.stashMessage': 'Stash message (optional)',
      'action.includeUntracked': 'Include untracked files',
      'action.compare': 'Compare',
      'action.loadMore': 'Load more',
      'action.back': 'Back',
      'action.copy': 'Copy',
      'action.copied': 'Copied',
      'action.openRemote': 'Open on remote',
      'action.history': 'File history',
      'action.blame': 'Blame',
      'action.close': 'Close',
      'action.cancel': 'Cancel',
      'action.confirm': 'Confirm',
      'action.retry': 'Retry',
      'history.empty': 'No commits',
      'history.unborn': 'This branch has no commits yet',
      'history.unbornHint': 'Stage a file in Changes, write a message and create the first commit.',
      'history.pathFilter': 'Showing history for this file only',
      'history.author': 'Author',
      'history.loading': 'Reading commits…',
      'branches.local': 'Local branches',
      'branches.remote': 'Remote branches',
      'branches.current': 'current',
      'branches.createFrom': 'From (optional)',
      'branches.empty': 'No branches',
      'stashes.empty': 'No stashes',
      'stashes.hint': 'A stash saves the current working tree and index changes.',
      'compare.base': 'Base',
      'compare.head': 'Head',
      'compare.empty': 'Enter two revisions to compare',
      'compare.noCommits': 'No commits between these revisions',
      'blame.path': 'File path',
      'blame.pathPlaceholder': 'e.g. src/index.ts',
      'blame.load': 'Blame',
      'blame.empty': 'Enter a file path to see line ownership',
      'blame.noResult': 'No blame result',
      'blame.start': 'Start line',
      'blame.end': 'End line',
      'blame.author': 'Author',
      'blame.date': 'Date',
      'commit.message': 'Commit message',
      'commit.files': 'Changed files',
      'commit.parent': 'Parent',
      'commit.stats': 'Stats',
      'commit.none': 'No changed files',
      'diff.added': 'added',
      'diff.deleted': 'deleted',
      'diff.truncated': 'The patch was truncated because it is large',
      'diff.binary': 'Binary file; no textual diff',
      'diff.noChanges': 'No changes',
      'diff.files': 'Files',
      'common.unknown': 'Unknown',
      'common.now': 'now',
      'common.justNow': 'just now',
      'common.minutesAgo': '{n}m ago',
      'common.hoursAgo': '{n}h ago',
      'common.daysAgo': '{n}d ago',
      'common.weeksAgo': '{n}w ago',
      'common.monthsAgo': '{n}mo ago',
      'common.yearsAgo': '{n}y ago',
      'common.branch': 'Branch',
      'common.detached': 'Detached HEAD',
      'common.ahead': '{n} ahead',
      'common.behind': '{n} behind',
      'common.error': 'Operation failed',
      'common.working': 'Working…',
      'common.changedFiles': '{n} files',
      'common.repo': 'Repository',
      'common.noData': 'No data',
      'common.close': 'Close',
      'common.moreFiles': 'Showing the first {n} files',
    };

    /* ------------------------------------------------------------------ */
    /* Small helpers                                                      */
    /* ------------------------------------------------------------------ */

    function relTime(time, tr) {
      if (!time) return '';
      const diff = Date.now() - time;
      if (diff < 45_000) return tr('common.justNow');
      const minutes = Math.floor(diff / 60_000);
      if (minutes < 60) return tr('common.minutesAgo').replace('{n}', String(minutes));
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return tr('common.hoursAgo').replace('{n}', String(hours));
      const days = Math.floor(hours / 24);
      if (days < 7) return tr('common.daysAgo').replace('{n}', String(days));
      const weeks = Math.floor(days / 7);
      if (weeks < 5) return tr('common.weeksAgo').replace('{n}', String(weeks));
      const months = Math.floor(days / 30);
      if (months < 12) return tr('common.monthsAgo').replace('{n}', String(months));
      return tr('common.yearsAgo').replace('{n}', String(Math.floor(days / 365)));
    }

    function isUnbornMessage(message) {
      const value = String(message ?? '').toLowerCase();
      return (
        value.includes('does not have any commits yet') ||
        value.includes('bad default revision') ||
        value.includes('needed a single revision') ||
        value.includes("ambiguous argument 'head'")
      );
    }

    function fullTime(time) {
      if (!time) return '';
      try {
        return new Date(time).toLocaleString();
      } catch {
        return '';
      }
    }

    function shortDate(time) {
      if (!time) return '';
      try {
        return new Date(time).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
      } catch {
        return '';
      }
    }

    function refKind(ref) {
      if (ref.startsWith('tag: ')) return 'tag';
      if (ref.startsWith('HEAD ->')) return 'head';
      if (/^[^/]+\/HEAD$/.test(ref)) return 'muted';
      if (ref.includes('/')) return 'remote';
      return 'local';
    }

    function refLabel(ref) {
      return ref.startsWith('tag: ') ? ref.slice(5) : ref.replace('HEAD -> ', '');
    }

    function splitPath(filePath) {
      const index = filePath.lastIndexOf('/');
      if (index < 0) return { dir: '', name: filePath };
      return { dir: filePath.slice(0, index + 1), name: filePath.slice(index + 1) };
    }

    function statusLetter(entry) {
      if (entry.conflicted) return '!';
      if (entry.untracked) return 'U';
      if (entry.staged && entry.unstaged) return 'M';
      if (entry.staged) return entry.index === 'A' ? 'A' : entry.index === 'D' ? 'D' : entry.index === 'R' ? 'R' : 'M';
      if (entry.worktree === 'D') return 'D';
      if (entry.worktree === 'A') return 'A';
      return 'M';
    }

    function statusClass(letter) {
      if (letter === 'A' || letter === 'U') return 'add';
      if (letter === 'D') return 'del';
      if (letter === 'R') return 'rename';
      if (letter === '!') return 'conflict';
      return 'modify';
    }

    function fileKind(file) {
      const letter = file.status ?? 'M';
      if (letter === 'A') return 'add';
      if (letter === 'D') return 'del';
      if (letter === 'R') return 'rename';
      return 'modify';
    }

    function commitUrl(webUrl, hash) {
      if (!webUrl) return undefined;
      return `${webUrl.replace(/\/$/, '')}/commit/${hash}`;
    }

    function remoteBase(remotes) {
      const remote = (remotes ?? []).find((item) => item.name === 'origin' && item.webUrl) ?? (remotes ?? []).find((item) => item.webUrl);
      return remote?.webUrl;
    }

    function ageTint(time) {
      if (!time) return undefined;
      const days = Math.max(0, (Date.now() - time) / 86_400_000);
      const strength = Math.max(4, Math.min(34, Math.round(34 - Math.log2(days + 1) * 5)));
      return { background: `color-mix(in srgb, var(--dsw-alias-state-business-primary) ${strength}%, transparent)` };
    }

    function cx(...parts) {
      return parts.filter(Boolean).join(' ');
    }

    /* ------------------------------------------------------------------ */
    /* Icons                                                              */
    /* ------------------------------------------------------------------ */

    function svg(paths, viewBox = '0 0 24 24', size = 16) {
      return h(
        'svg',
        {
          viewBox,
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          focusable: false,
        },
        ...(Array.isArray(paths) ? paths : [paths]),
      );
    }

    function GitIcon({ size = 16 }) {
      return h(
        'svg',
        { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', 'aria-hidden': true, focusable: false },
        h('circle', { cx: 7, cy: 5.5, r: 2.4, stroke: 'currentColor', strokeWidth: 1.8 }),
        h('circle', { cx: 7, cy: 18.5, r: 2.4, stroke: 'currentColor', strokeWidth: 1.8 }),
        h('circle', { cx: 17, cy: 12, r: 2.4, stroke: 'currentColor', strokeWidth: 1.8 }),
        h('path', { d: 'M7 7.9v8.2', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }),
        h('path', { d: 'M7 8.5c0 3 3.2 3.5 7.8 3.5', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }),
      );
    }

    const IconRefresh = (props) => svg([
      h('path', { key: 1, d: 'M20 11a8 8 0 1 0-2.3 6.3' }),
      h('path', { key: 2, d: 'M20 5v6h-6' }),
    ], '0 0 24 24', props?.size ?? 15);

    const IconBranch = (props) => svg([
      h('circle', { key: 1, cx: 6, cy: 5, r: 2 }),
      h('circle', { key: 2, cx: 6, cy: 19, r: 2 }),
      h('circle', { key: 3, cx: 18, cy: 7, r: 2 }),
      h('path', { key: 4, d: 'M6 7v10' }),
      h('path', { key: 5, d: 'M6 9c0 4 12 1 12 5v3' }),
    ], '0 0 24 24', props?.size ?? 15);

    const IconCommit = (props) => svg([
      h('circle', { key: 1, cx: 12, cy: 12, r: 4 }),
      h('path', { key: 2, d: 'M3 12h5M16 12h5' }),
    ], '0 0 24 24', props?.size ?? 15);

    const IconStash = (props) => svg([
      h('path', { key: 1, d: 'M4 6h16v5H4z' }),
      h('path', { key: 2, d: 'M4 17h16' }),
      h('path', { key: 3, d: 'M7 11v3h10v-3' }),
    ], '0 0 24 24', props?.size ?? 15);

    const IconCompare = (props) => svg([
      h('path', { key: 1, d: 'M7 4v12' }),
      h('path', { key: 2, d: 'M4 7l3-3 3 3' }),
      h('path', { key: 3, d: 'M17 20V8' }),
      h('path', { key: 4, d: 'M14 17l3 3 3-3' }),
    ], '0 0 24 24', props?.size ?? 15);

    const IconBlame = (props) => svg([
      h('path', { key: 1, d: 'M5 4h14v16H5z' }),
      h('path', { key: 2, d: 'M8 8h8M8 12h8M8 16h5' }),
    ], '0 0 24 24', props?.size ?? 15);

    const IconSearch = (props) => svg([
      h('circle', { key: 1, cx: 11, cy: 11, r: 6 }),
      h('path', { key: 2, d: 'M20 20l-4.2-4.2' }),
    ], '0 0 24 24', props?.size ?? 14);

    const IconBack = (props) => svg(h('path', { d: 'M15 5l-7 7 7 7' }), '0 0 24 24', props?.size ?? 15);
    const IconClose = (props) => svg(h('path', { d: 'M6 6l12 12M18 6L6 18' }), '0 0 24 24', props?.size ?? 14);
    const IconCopy = (props) => svg([
      h('rect', { key: 1, x: 9, y: 9, width: 11, height: 11, rx: 2 }),
      h('path', { key: 2, d: 'M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3' }),
    ], '0 0 24 24', props?.size ?? 14);
    const IconExternal = (props) => svg([
      h('path', { key: 1, d: 'M14 5h5v5' }),
      h('path', { key: 2, d: 'M19 5l-8 8' }),
      h('path', { key: 3, d: 'M19 14v5H5V5h5' }),
    ], '0 0 24 24', props?.size ?? 14);
    const IconPlus = (props) => svg(h('path', { d: 'M12 5v14M5 12h14' }), '0 0 24 24', props?.size ?? 13);
    const IconMinus = (props) => svg(h('path', { d: 'M5 12h14' }), '0 0 24 24', props?.size ?? 13);
    const IconTrash = (props) => svg([
      h('path', { key: 1, d: 'M4 7h16' }),
      h('path', { key: 2, d: 'M9 7V5h6v2' }),
      h('path', { key: 3, d: 'M6 7l1 13h10l1-13' }),
    ], '0 0 24 24', props?.size ?? 13);
    const IconChevron = (props) => svg(h('path', { d: props?.open ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6' }), '0 0 24 24', props?.size ?? 12);

    /* ------------------------------------------------------------------ */
    /* Host API                                                           */
    /* ------------------------------------------------------------------ */

    function apiUrl(method) {
      const base = typeof document !== 'undefined' && typeof document.baseURI === 'string' ? document.baseURI : '';
      try {
        return new URL(`dsh-git/api/${encodeURIComponent(method)}`, base === '' ? 'http://dsh.invalid/' : base).href;
      } catch {
        return `dsh-git/api/${encodeURIComponent(method)}`;
      }
    }

    class GitApiError extends Error {
      constructor(message, code) {
        super(message);
        this.name = 'GitApiError';
        this.code = code;
      }
    }

    async function api(method, payload, signal) {
      let response;
      try {
        response = await fetch(apiUrl(method), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload ?? {}),
          signal,
        });
      } catch (error) {
        if (error && error.name === 'AbortError') throw error;
        throw new GitApiError(error instanceof Error ? error.message : String(error), 'network');
      }
      let parsed = null;
      try {
        parsed = await response.json();
      } catch {
        parsed = null;
      }
      if (!response.ok || parsed === null || parsed.ok !== true) {
        throw new GitApiError(parsed?.error?.message ?? `HTTP ${response.status}`, parsed?.error?.code ?? 'http');
      }
      return parsed.value;
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                             */
    /* ------------------------------------------------------------------ */

    const CSS = `
.dgp-root, .dgp-root * { box-sizing: border-box; }
.dgp-root {
  display: flex; flex-direction: column; height: 100%; min-height: 0; width: 100%;
  color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px;
  background: var(--dsw-alias-bg-base); overflow: hidden;
}
.dgp-root button, .dgp-root input, .dgp-root select, .dgp-root textarea {
  font: inherit; color: inherit;
}
.dgp-root button { cursor: pointer; }
.dgp-root button:disabled { cursor: not-allowed; opacity: .45; }
.dgp-header {
  display: flex; align-items: center; gap: 8px; flex: none;
  padding: 9px 12px; border-bottom: .5px solid var(--dsw-alias-border-l3);
  min-height: 44px; background: var(--dsw-alias-bg-base);
}
.dgp-header-main { display: flex; align-items: center; gap: 7px; min-width: 0; flex: 1; }
.dgp-branch { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; min-width: 0; }
.dgp-branch-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dgp-header-meta { display: flex; align-items: center; gap: 6px; flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dgp-pill {
  display: inline-flex; align-items: center; gap: 3px; padding: 0 6px; height: 18px;
  border-radius: 9px; font-size: 10.5px; font-weight: 600;
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary);
}
.dgp-pill.ahead { color: var(--dsw-alias-state-business-primary); }
.dgp-pill.behind { color: var(--dsw-alias-state-error-primary); }
.dgp-repo-select {
  max-width: 190px; height: 24px; border: .5px solid var(--dsw-alias-border-l2);
  background: transparent; border-radius: 6px; padding: 0 6px; font-size: 11.5px;
  color: var(--dsw-alias-label-secondary); outline: none;
}
.dgp-iconbtn {
  width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary);
  flex: none; transition: background .12s ease, color .12s ease;
}
.dgp-iconbtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dgp-iconbtn.danger:hover { background: var(--dsw-alias-interactive-bg-hover-danger); color: var(--dsw-alias-state-error-primary); }
.dgp-iconbtn.active { color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dgp-tabs {
  display: flex; align-items: center; gap: 2px; flex: none; padding: 0 8px;
  border-bottom: .5px solid var(--dsw-alias-border-l3); min-height: 34px;
  overflow-x: auto; scrollbar-width: none;
}
.dgp-tabs::-webkit-scrollbar { display: none; }
.dgp-tab {
  position: relative; border: none; background: transparent; color: var(--dsw-alias-label-tertiary);
  padding: 7px 8px 8px; font-size: 12px; font-weight: 500; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 5px; border-radius: 5px 5px 0 0;
}
.dgp-tab:hover { color: var(--dsw-alias-label-primary); }
.dgp-tab.active { color: var(--dsw-alias-state-business-primary); }
.dgp-tab.active::after {
  content: ""; position: absolute; left: 7px; right: 7px; bottom: 0; height: 2px;
  border-radius: 1px; background: var(--dsw-alias-state-business-primary);
}
.dgp-count {
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 9.5px; font-weight: 700; background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
}
.dgp-body { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.dgp-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.dgp-side {
  flex: 0 0 54%; min-width: 0; min-height: 0; display: flex; flex-direction: column;
  border-left: .5px solid var(--dsw-alias-border-l3); overflow: hidden;
}
.dgp-scroll { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.dgp-scroll::-webkit-scrollbar { width: 9px; height: 9px; }
.dgp-scroll::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-bg-l1); border-radius: 5px; border: 2px solid transparent; background-clip: padding-box; }
.dgp-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 28px 22px; text-align: center; color: var(--dsw-alias-label-tertiary);
  min-height: 120px;
}
.dgp-empty svg { opacity: .55; margin-bottom: 4px; }
.dgp-empty-title { color: var(--dsw-alias-label-secondary); font-weight: 600; font-size: 12.5px; }
.dgp-empty-hint { font-size: 11.5px; max-width: 280px; line-height: 17px; }
.dgp-error {
  display: flex; align-items: flex-start; gap: 7px; margin: 8px 10px 0; padding: 7px 9px;
  border-radius: 7px; font-size: 11.5px; line-height: 16px;
  color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 9%, transparent);
  border: .5px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 28%, transparent);
}
.dgp-error-text { flex: 1; word-break: break-word; }
.dgp-section-label {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  padding: 7px 10px 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .04em;
  text-transform: uppercase; color: var(--dsw-alias-label-tertiary);
  position: sticky; top: 0; background: var(--dsw-alias-bg-base); z-index: 1;
}
.dgp-section-label .dgp-section-count { font-weight: 500; letter-spacing: 0; text-transform: none; }
.dgp-filerow {
  display: flex; align-items: center; gap: 7px; padding: 3px 10px 3px 8px;
  min-height: 27px; cursor: pointer; position: relative; border-radius: 4px; margin: 0 5px;
}
.dgp-filerow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dgp-filerow.selected { background: var(--dsw-alias-interactive-bg-hover); }
.dgp-filerow-actions { display: none; align-items: center; gap: 1px; flex: none; }
.dgp-filerow:hover .dgp-filerow-actions { display: inline-flex; }
.dgp-filerow:hover .dgp-filerow-time { display: none; }
.dgp-filerow-time { margin-left: auto; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; flex: none; }
.dgp-status {
  width: 16px; height: 16px; border-radius: 4px; flex: none; display: inline-flex;
  align-items: center; justify-content: center; font-size: 9.5px; font-weight: 800;
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
}
.dgp-status.add { color: #2da44e; background: color-mix(in srgb, #2da44e 14%, transparent); }
.dgp-status.del { color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 13%, transparent); }
.dgp-status.modify { color: #bf8700; background: color-mix(in srgb, #bf8700 14%, transparent); }
.dgp-status.rename { color: #8250df; background: color-mix(in srgb, #8250df 14%, transparent); }
.dgp-status.conflict { color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent); }
.dgp-path { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.dgp-path-dir { color: var(--dsw-alias-label-tertiary); }
.dgp-path-name { color: var(--dsw-alias-label-primary); }
.dgp-mini-btn {
  width: 21px; height: 21px; border: none; background: transparent; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--dsw-alias-label-tertiary);
}
.dgp-mini-btn:hover { background: var(--dsw-alias-interactive-bg-hover-solid); color: var(--dsw-alias-label-primary); }
.dgp-mini-btn.danger:hover { color: var(--dsw-alias-state-error-primary); }
.dgp-commitbox { flex: none; border-top: .5px solid var(--dsw-alias-border-l3); padding: 8px 10px 10px; background: var(--dsw-alias-bg-base); }
.dgp-commitbox textarea {
  width: 100%; min-height: 54px; max-height: 140px; resize: vertical;
  border: .5px solid var(--dsw-alias-border-l2); border-radius: 7px; background: var(--dsw-alias-bg-layer-1);
  padding: 7px 9px; font-size: 12px; line-height: 17px; outline: none;
}
.dgp-commitbox textarea:focus { border-color: var(--dsw-alias-state-business-primary); }
.dgp-commitbox-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.dgp-check { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dgp-check input { accent-color: var(--dsw-alias-state-business-primary); width: 12px; height: 12px; margin: 0; }
.dgp-btn {
  height: 27px; padding: 0 11px; border-radius: 6px; border: .5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
  font-size: 11.5px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  white-space: nowrap;
}
.dgp-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dgp-btn.primary {
  background: var(--dsw-alias-state-business-primary); border-color: transparent;
  color: var(--dsw-alias-label-primary-foreground, #fff);
}
.dgp-btn.primary:hover { filter: brightness(1.08); }
.dgp-btn.ghost { background: transparent; border-color: transparent; color: var(--dsw-alias-label-secondary); }
.dgp-btn.ghost:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dgp-btn.danger { color: var(--dsw-alias-state-error-primary); }
.dgp-commitbox .dgp-btn { margin-left: auto; }
.dgp-toolbar {
  display: flex; align-items: center; gap: 6px; padding: 8px 10px; flex: none;
  border-bottom: .5px solid var(--dsw-alias-border-l3); flex-wrap: wrap;
}
.dgp-search {
  display: flex; align-items: center; gap: 6px; height: 27px; min-width: 120px; flex: 1;
  padding: 0 8px; border-radius: 6px; border: .5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-tertiary);
}
.dgp-search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 11.5px; }
.dgp-input {
  height: 27px; border: .5px solid var(--dsw-alias-border-l2); border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1); padding: 0 8px; font-size: 11.5px; outline: none; min-width: 0;
}
.dgp-input:focus { border-color: var(--dsw-alias-state-business-primary); }
.dgp-commitrow {
  display: flex; align-items: flex-start; gap: 8px; padding: 7px 10px; cursor: pointer;
  border-bottom: .5px solid color-mix(in srgb, var(--dsw-alias-border-l3) 55%, transparent);
}
.dgp-commitrow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dgp-commitrow.selected { background: var(--dsw-alias-interactive-bg-hover); }
.dgp-commitrow-body { min-width: 0; flex: 1; }
.dgp-commitrow-subject { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dgp-commitrow-meta { display: flex; align-items: center; gap: 5px; margin-top: 2px; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; min-width: 0; }
.dgp-commitrow-meta > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dgp-commitrow-hash { font-family: var(--dsw-font-mono, ui-monospace, monospace); color: var(--dsw-alias-label-secondary); flex: none; font-size: 10.5px; }
.dgp-avatar {
  width: 22px; height: 22px; flex: none; border-radius: 50%; display: inline-flex;
  align-items: center; justify-content: center; font-size: 9px; font-weight: 800;
  color: #fff; background: linear-gradient(135deg, #3b82f6, #8b5cf6); letter-spacing: .02em;
}
.dgp-refs { display: inline-flex; align-items: center; gap: 3px; min-width: 0; flex-wrap: wrap; }
.dgp-ref {
  display: inline-flex; align-items: center; max-width: 120px; height: 15px; padding: 0 4px;
  border-radius: 3px; font-size: 9.5px; font-weight: 600; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-label-secondary);
}
.dgp-ref.head { color: var(--dsw-alias-state-business-primary); background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 13%, transparent); }
.dgp-ref.remote { color: #8250df; background: color-mix(in srgb, #8250df 13%, transparent); }
.dgp-ref.tag { color: #bf8700; background: color-mix(in srgb, #bf8700 15%, transparent); }
.dgp-detail { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.dgp-detail-head {
  display: flex; align-items: center; gap: 6px; padding: 7px 10px; flex: none;
  border-bottom: .5px solid var(--dsw-alias-border-l3); min-height: 34px;
}
.dgp-detail-title { flex: 1; min-width: 0; font-size: 11.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dgp-detail-head .dgp-iconbtn { width: 22px; height: 22px; }
.dgp-commitmeta { padding: 12px 12px 10px; border-bottom: .5px solid var(--dsw-alias-border-l3); flex: none; }
.dgp-commitmeta-subject { font-size: 14px; line-height: 20px; font-weight: 650; word-break: break-word; }
.dgp-commitmeta-line { display: flex; align-items: center; gap: 6px; margin-top: 7px; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; flex-wrap: wrap; }
.dgp-commitmeta-line .dgp-refs { display: inline-flex; }
.dgp-commitmeta-actions { display: flex; align-items: center; gap: 5px; margin-top: 8px; flex-wrap: wrap; }
.dgp-commitmeta-actions .dgp-btn { height: 23px; font-size: 10.5px; padding: 0 7px; }
.dgp-commitbody { padding: 9px 12px; border-bottom: .5px solid var(--dsw-alias-border-l3); font-size: 12px; line-height: 18px; white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-secondary); flex: none; }
.dgp-filelist { flex: none; padding: 4px 0 6px; border-bottom: .5px solid var(--dsw-alias-border-l3); }
.dgp-filelist-scroll { max-height: 210px; overflow: auto; }
.dgp-filelist .dgp-filerow { min-height: 24px; }
.dgp-stat { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-family: var(--dsw-font-mono, ui-monospace, monospace); flex: none; }
.dgp-stat .add { color: #2da44e; }
.dgp-stat .del { color: var(--dsw-alias-state-error-primary); }
.dgp-diff { min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.dgp-diff-head { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-bottom: .5px solid var(--dsw-alias-border-l3); flex: none; }
.dgp-diff-path { flex: 1; min-width: 0; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--dsw-font-mono, ui-monospace, monospace); }
.dgp-diff-scroll { flex: 1; min-height: 0; overflow: auto; font-family: var(--dsw-font-mono, ui-monospace, monospace); font-size: 11.5px; line-height: 18px; }
.dgp-diffline { display: flex; min-width: max-content; width: 100%; }
.dgp-ln {
  flex: none; width: 38px; padding-right: 7px; text-align: right; user-select: none;
  color: var(--dsw-alias-label-tertiary); background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 55%, transparent);
  font-size: 10.5px;
}
.dgp-ln + .dgp-ln { border-right: .5px solid var(--dsw-alias-border-l3); }
.dgp-code { white-space: pre; padding: 0 10px 0 8px; flex: 1; }
.dgp-diffline.add { background: var(--dsw-alias-file-diff-added-bg, color-mix(in srgb, #2da44e 12%, transparent)); }
.dgp-diffline.add .dgp-ln { background: var(--dsw-alias-file-diff-added-gutter, color-mix(in srgb, #2da44e 16%, transparent)); }
.dgp-diffline.del { background: var(--dsw-alias-file-diff-deleted-bg, color-mix(in srgb, var(--dsw-alias-state-error-primary) 11%, transparent)); }
.dgp-diffline.del .dgp-ln { background: var(--dsw-alias-file-diff-deleted-gutter, color-mix(in srgb, var(--dsw-alias-state-error-primary) 16%, transparent)); }
.dgp-diffline.hunk .dgp-code { color: var(--dsw-alias-state-business-primary); }
.dgp-diffline.hunk { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 8%, transparent); }
.dgp-diffline.meta .dgp-code { color: var(--dsw-alias-label-tertiary); }
.dgp-blame-head { flex: none; padding: 8px 10px; border-bottom: .5px solid var(--dsw-alias-border-l3); display: flex; flex-direction: column; gap: 6px; }
.dgp-blame-form { display: flex; align-items: center; gap: 6px; }
.dgp-blame-form .dgp-input { flex: 1; }
.dgp-blame-line { display: flex; align-items: stretch; min-width: max-content; width: 100%; font-family: var(--dsw-font-mono, ui-monospace, monospace); font-size: 11.5px; line-height: 18px; }
.dgp-blame-gutter { flex: none; width: 34px; text-align: right; padding-right: 7px; color: var(--dsw-alias-label-tertiary); user-select: none; font-size: 10.5px; }
.dgp-blame-sha { flex: none; padding: 0 8px; color: var(--dsw-alias-state-business-primary); cursor: pointer; font-size: 10.5px; border: none; background: transparent; text-align: left; }
.dgp-blame-sha:hover { text-decoration: underline; }
.dgp-blame-person { flex: none; width: 118px; padding: 0 8px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--dsw-font-sans, system-ui, sans-serif); font-size: 10.5px; }
.dgp-blame-date { flex: none; width: 82px; padding: 0 8px; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dgp-blame-code { flex: 1; padding: 0 10px 0 4px; white-space: pre; }
.dgp-compact .dgp-blame-person, .dgp-compact .dgp-blame-date { display: none; }
.dgp-branchrow { display: flex; align-items: center; gap: 7px; padding: 5px 10px; cursor: pointer; border-radius: 4px; margin: 0 5px; }
.dgp-branchrow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dgp-branchrow.current { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 9%, transparent); }
.dgp-branchrow-main { flex: 1; min-width: 0; }
.dgp-branchrow-name { font-size: 12px; display: flex; align-items: center; gap: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dgp-branchrow-sub { font-size: 10.5px; color: var(--dsw-alias-label-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dgp-branchrow-actions { display: none; flex: none; }
.dgp-branchrow:hover .dgp-branchrow-actions { display: inline-flex; }
.dgp-currentdot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-business-primary); flex: none; }
.dgp-createbar { display: flex; align-items: center; gap: 6px; padding: 7px 10px; border-bottom: .5px solid var(--dsw-alias-border-l3); flex-wrap: wrap; }
.dgp-createbar .dgp-input { flex: 1; }
.dgp-stashrow { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-bottom: .5px solid color-mix(in srgb, var(--dsw-alias-border-l3) 55%, transparent); }
.dgp-stashrow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dgp-stashrow-main { flex: 1; min-width: 0; }
.dgp-stashrow-subject { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dgp-stashrow-meta { display: flex; gap: 6px; color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
.dgp-compare { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.dgp-compare-form { display: flex; gap: 6px; padding: 8px 10px; flex-wrap: wrap; border-bottom: .5px solid var(--dsw-alias-border-l3); align-items: center; }
.dgp-compare-form .dgp-input { flex: 1; min-width: 90px; }
.dgp-compare-body { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.dgp-compare-list { flex: 0 0 42%; min-width: 0; border-right: .5px solid var(--dsw-alias-border-l3); overflow: auto; }
.dgp-compare-diff { flex: 1; min-width: 0; overflow: hidden; display: flex; flex-direction: column; }
.dgp-loading { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 22px; color: var(--dsw-alias-label-tertiary); font-size: 11.5px; }
.dgp-spinner { width: 13px; height: 13px; border-radius: 50%; border: 1.6px solid var(--dsw-alias-border-l3); border-top-color: var(--dsw-alias-state-business-primary); animation: dgp-spin .7s linear infinite; }
@keyframes dgp-spin { to { transform: rotate(360deg); } }
.dgp-more { display: flex; justify-content: center; padding: 8px; }
.dgp-muted { color: var(--dsw-alias-label-tertiary); }
.dgp-mono { font-family: var(--dsw-font-mono, ui-monospace, monospace); }
.dgp-compact .dgp-header-meta .dgp-pill { display: none; }
.dgp-compact .dgp-header { padding: 7px 9px; }
.dgp-compact .dgp-tab { padding-left: 6px; padding-right: 6px; }
.dgp-compact .dgp-commitmeta-subject { font-size: 13px; }
.dgp-compact .dgp-side { flex-basis: 100%; }
.dgp-wide { container-type: inline-size; }
.dgp-wide { height: max(360px, calc(100dvh - 101px - var(--dsh-composer-height, 128px))); max-height: max(360px, calc(100dvh - 101px - var(--dsh-composer-height, 128px))); }
.dgp-wide .dgp-scroll { scrollbar-gutter: stable; }
.dgp-wide.dgp-has-side .dgp-main { flex: 0 0 46%; border-right: .5px solid var(--dsw-alias-border-l3); }
.dgp-wide .dgp-side { flex: 1; border-left: none; }
.dgp-wide .dgp-diff-scroll { font-size: 12px; line-height: 19px; }
.dgp-wide .dgp-blame-person { width: 150px; }
@media (max-width: 720px) {
  .dgp-wide.dgp-has-side .dgp-main { flex: 0 0 42%; border-right: none; border-bottom: .5px solid var(--dsw-alias-border-l3); }
  .dgp-wide .dgp-side { flex: 1 1 auto; }
}
@container (max-width: 760px) {
  .dgp-wide .dgp-body { flex-direction: column; }
  .dgp-wide.dgp-has-side .dgp-main { flex: 0 0 42%; border-right: none; border-bottom: .5px solid var(--dsw-alias-border-l3); }
  .dgp-wide .dgp-side { flex: 1 1 auto; }
  .dgp-wide .dgp-tab { padding-left: 5px; padding-right: 5px; gap: 3px; }
}
`;

    /** Inject the stylesheet once per page. */
    function installStyles() {
      const style = document.createElement('style');
      style.dataset.dshGitPanel = 'styles';
      style.textContent = CSS;
      document.head.appendChild(style);
      return () => style.remove();
    }

    /* ------------------------------------------------------------------ */
    /* Shared presentational pieces                                       */
    /* ------------------------------------------------------------------ */

    function Spinner({ tr }) {
      return h('div', { className: 'dgp-loading' }, h('span', { className: 'dgp-spinner' }), tr('loading'));
    }

    function Empty({ icon, title, hint }) {
      return h(
        'div',
        { className: 'dgp-empty' },
        icon ?? h(GitIcon, { size: 30 }),
        title ? h('div', { className: 'dgp-empty-title' }, title) : null,
        hint ? h('div', { className: 'dgp-empty-hint' }, hint) : null,
      );
    }

    function ErrorBar({ message, tr, onRetry }) {
      if (!message) return null;
      return h(
        'div',
        { className: 'dgp-error', role: 'alert' },
        h('span', { className: 'dgp-error-text' }, message),
        onRetry
          ? h('button', { type: 'button', className: 'dgp-mini-btn', title: tr('action.retry'), onClick: onRetry }, h(IconRefresh, { size: 13 }))
          : null,
      );
    }

    function IconButton({ title, onClick, icon, danger, active, disabled }) {
      return h(
        'button',
        {
          type: 'button',
          className: cx('dgp-iconbtn', danger && 'danger', active && 'active'),
          title,
          'aria-label': title,
          onClick,
          disabled,
        },
        icon,
      );
    }

    function MiniButton({ title, onClick, icon, danger, disabled }) {
      return h(
        'button',
        {
          type: 'button',
          className: cx('dgp-mini-btn', danger && 'danger'),
          title,
          'aria-label': title,
          onClick: (event) => {
            event.stopPropagation();
            onClick?.(event);
          },
          disabled,
        },
        icon,
      );
    }

    function StatusBadge({ letter }) {
      return h('span', { className: cx('dgp-status', statusClass(letter)) }, letter);
    }

    function RefChips({ refs }) {
      if (!refs || refs.length === 0) return null;
      return h(
        'span',
        { className: 'dgp-refs' },
        refs.map((ref) => h('span', { key: ref, className: `dgp-ref ${refKind(ref)}`, title: ref }, refLabel(ref))),
      );
    }

    function Avatar({ name }) {
      const initials = (name || '?')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
      return h('span', { className: 'dgp-avatar', 'aria-hidden': true }, initials || '?');
    }

    function pathParts(filePath) {
      const { dir, name } = splitPath(filePath);
      return h(
        React.Fragment,
        null,
        dir ? h('span', { className: 'dgp-path-dir' }, dir) : null,
        h('span', { className: 'dgp-path-name' }, name),
      );
    }

    function confirmAsk(tr, message) {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        return window.confirm(message);
      }
      return true;
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        try {
          const area = document.createElement('textarea');
          area.value = text;
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
          return true;
        } catch {
          return false;
        }
      }
    }

    /* ------------------------------------------------------------------ */
    /* Diff                                                               */
    /* ------------------------------------------------------------------ */

    function indexDiffLines(patch) {
      const rows = [];
      let oldNumber = 0;
      let newNumber = 0;
      const lines = (patch ?? '').split('\n');
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.startsWith('@@')) {
          const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
          if (match !== null) {
            oldNumber = Number.parseInt(match[1], 10);
            newNumber = Number.parseInt(match[2], 10);
          }
          rows.push({ kind: 'hunk', text: line, oldNumber: '', newNumber: '' });
          continue;
        }
        if (
          line.startsWith('diff --git ') ||
          line.startsWith('index ') ||
          line.startsWith('--- ') ||
          line.startsWith('+++ ') ||
          line.startsWith('new file ') ||
          line.startsWith('deleted file ') ||
          line.startsWith('old mode ') ||
          line.startsWith('new mode ') ||
          line.startsWith('similarity index ') ||
          line.startsWith('rename from ') ||
          line.startsWith('rename to ') ||
          line.startsWith('Binary files ') ||
          line.startsWith('GIT binary patch') ||
          line.startsWith('\\ No newline')
        ) {
          rows.push({ kind: 'meta', text: line, oldNumber: '', newNumber: '' });
          continue;
        }
        if (line.startsWith('+')) {
          rows.push({ kind: 'add', text: line, oldNumber: '', newNumber: newNumber });
          newNumber += 1;
          continue;
        }
        if (line.startsWith('-')) {
          rows.push({ kind: 'del', text: line, oldNumber: oldNumber, newNumber: '' });
          oldNumber += 1;
          continue;
        }
        if (line.startsWith(' ')) {
          rows.push({ kind: 'ctx', text: line, oldNumber: oldNumber, newNumber: newNumber });
          oldNumber += 1;
          newNumber += 1;
          continue;
        }
        if (line === '' && index === lines.length - 1) continue;
        rows.push({ kind: 'meta', text: line, oldNumber: '', newNumber: '' });
      }
      return rows;
    }

    function DiffLines({ patch }) {
      const rows = React.useMemo(() => indexDiffLines(patch), [patch]);
      return h(
        'div',
        { className: 'dgp-diff-scroll' },
        rows.map((row, index) =>
          h(
            'div',
            { key: index, className: `dgp-diffline ${row.kind}` },
            h('span', { className: 'dgp-ln' }, row.oldNumber),
            h('span', { className: 'dgp-ln' }, row.newNumber),
            h('span', { className: 'dgp-code' }, row.text === '' ? ' ' : row.text),
          ),
        ),
      );
    }

    function FileStats({ additions, deletions }) {
      if (!additions && !deletions) return null;
      return h(
        'span',
        { className: 'dgp-stat' },
        additions ? h('span', { className: 'add' }, `+${additions}`) : null,
        deletions ? h('span', { className: 'del' }, `−${deletions}`) : null,
      );
    }

    function DiffView(props) {
      const { sessionId, cwd, repoRoot, params, tr, onClose, onHistory, onBlame, onSelectCommit } = props;
      const [data, setData] = React.useState(null);
      const [error, setError] = React.useState('');
      const [loading, setLoading] = React.useState(true);
      const [selectedPath, setSelectedPath] = React.useState(params.path ?? null);
      const [showFiles, setShowFiles] = React.useState(Boolean(params.path) === false);

      React.useEffect(() => {
        let alive = true;
        const controller = new AbortController();
        setLoading(true);
        setError('');
        setSelectedPath(params.path ?? null);
        api('diff', { sessionId, cwd, repoRoot, ...params }, controller.signal)
          .then((value) => {
            if (!alive) return;
            setData(value);
            const first = value.files?.[0]?.path ?? null;
            setSelectedPath((current) => (current && value.files.some((file) => file.path === current) ? current : first));
          })
          .catch((value) => {
            if (alive) setError(value instanceof Error ? value.message : String(value));
          })
          .finally(() => {
            if (alive) setLoading(false);
          });
        return () => {
          alive = false;
          controller.abort();
        };
      }, [sessionId, cwd, repoRoot, params.scope, params.path, params.commit, params.base, params.head]);

      const files = data?.files ?? [];
      const selected = files.find((file) => file.path === selectedPath) ?? files[0];
      const title =
        params.scope === 'commit'
          ? `${tr('commit.message')} ${String(params.commit ?? '').slice(0, 8)}`
          : params.scope === 'range'
            ? `${params.base}...${params.head}`
            : params.path ?? tr('diff.files');

      return h(
        'div',
        { className: 'dgp-detail' },
        h(
          'div',
          { className: 'dgp-detail-head' },
          onClose ? h(IconButton, { title: tr('action.back'), onClick: onClose, icon: h(IconBack) }) : null,
          h('div', { className: 'dgp-detail-title', title }, title),
          selected
            ? h(
                'span',
                { className: 'dgp-header-meta' },
                h(FileStats, { additions: selected.additions, deletions: selected.deletions }),
              )
            : null,
          files.length > 1
            ? h(IconButton, { title: tr('diff.files'), active: showFiles, onClick: () => setShowFiles((value) => !value), icon: h(IconChevron, { open: showFiles }) })
            : null,
        ),
        error ? h(ErrorBar, { message: error, tr }) : null,
        loading ? h(Spinner, { tr }) : null,
        !loading && files.length === 0 && !error ? h(Empty, { icon: h(IconCommit, { size: 26 }), title: tr('diff.noChanges') }) : null,
        files.length > 1 && showFiles
          ? h(
              'div',
              { className: 'dgp-filelist' },
              h(
                'div',
                { className: 'dgp-filelist-scroll' },
                files.map((file) =>
                  h(
                    'div',
                    {
                      key: file.path,
                      className: cx('dgp-filerow', file.path === selected?.path && 'selected'),
                      onClick: () => {
                        setSelectedPath(file.path);
                        if (props.compact) setShowFiles(false);
                      },
                    },
                    h(StatusBadge, { letter: file.status ?? 'M' }),
                    h('span', { className: 'dgp-path' }, pathParts(file.path)),
                    h(FileStats, { additions: file.additions, deletions: file.deletions }),
                  ),
                ),
              ),
            )
          : null,
        selected && !loading
          ? h(
              React.Fragment,
              null,
              h(
                'div',
                { className: 'dgp-diff-head' },
                h('div', { className: 'dgp-diff-path', title: selected.path }, selected.path),
                onHistory ? h(MiniButton, { title: tr('action.history'), onClick: () => onHistory(selected.path), icon: h(IconCommit, { size: 13 }) }) : null,
                onBlame ? h(MiniButton, { title: tr('action.blame'), onClick: () => onBlame(selected.path), icon: h(IconBlame, { size: 13 }) }) : null,
              ),
              selected.binary
                ? h(Empty, { icon: h(IconCommit, { size: 24 }), title: tr('diff.binary') })
                : h(DiffLines, { patch: selected.patch }),
              data?.truncated ? h('div', { className: 'dgp-muted', style: { padding: '6px 10px', fontSize: '10.5px' } }, tr('diff.truncated')) : null,
            )
          : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* Commit detail                                                      */
    /* ------------------------------------------------------------------ */

    function CommitDetail(props) {
      const { sessionId, cwd, repoRoot, hash, tr, onClose, onSelectCommit, onHistory, onBlame, webUrl, compact } = props;
      const [commit, setCommit] = React.useState(null);
      const [error, setError] = React.useState('');
      const [loading, setLoading] = React.useState(true);
      const [selectedPath, setSelectedPath] = React.useState(null);
      const [showFiles, setShowFiles] = React.useState(true);
      const [copied, setCopied] = React.useState(false);
      const [fileDiff, setFileDiff] = React.useState(null);
      const [fileLoading, setFileLoading] = React.useState(false);
      const [fileError, setFileError] = React.useState('');
      const [fileReload, setFileReload] = React.useState(0);

      React.useEffect(() => {
        let alive = true;
        const controller = new AbortController();
        setLoading(true);
        setError('');
        setSelectedPath(null);
        setFileDiff(null);
        api('commit', { sessionId, cwd, repoRoot, hash }, controller.signal)
          .then((value) => {
            if (!alive) return;
            setCommit(value.commit);
            setSelectedPath(value.commit.files?.[0]?.path ?? null);
            setShowFiles((value.commit.files?.length ?? 0) <= 8);
          })
          .catch((value) => {
            if (alive) setError(value instanceof Error ? value.message : String(value));
          })
          .finally(() => {
            if (alive) setLoading(false);
          });
        return () => {
          alive = false;
          controller.abort();
        };
      }, [sessionId, cwd, repoRoot, hash]);

      React.useEffect(() => {
        if (!commit || !selectedPath) {
          setFileDiff(null);
          return undefined;
        }
        const file = commit.files?.find((entry) => entry.path === selectedPath);
        if (!file || file.binary) {
          setFileDiff(null);
          setFileLoading(false);
          setFileError('');
          return undefined;
        }
        let alive = true;
        const controller = new AbortController();
        setFileLoading(true);
        setFileError('');
        api('diff', { sessionId, cwd, repoRoot, scope: 'commit', commit: hash, path: selectedPath }, controller.signal)
          .then((value) => {
            if (alive) setFileDiff(value.files?.[0] ?? null);
          })
          .catch((value) => {
            if (alive) setFileError(value instanceof Error ? value.message : String(value));
          })
          .finally(() => {
            if (alive) setFileLoading(false);
          });
        return () => {
          alive = false;
          controller.abort();
        };
      }, [sessionId, cwd, repoRoot, hash, commit, selectedPath, fileReload]);

      const remote = commitUrl(webUrl, commit?.hash);

      const copyHash = async () => {
        if (!commit) return;
        const ok = await copyText(commit.hash);
        if (ok) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        }
      };

      const selectedFile = commit?.files?.find((file) => file.path === selectedPath) ?? commit?.files?.[0];
      const body = commit?.message
        ? commit.message.split('\n').slice(1).join('\n').trim()
        : '';

      return h(
        'div',
        { className: 'dgp-detail' },
        h(
          'div',
          { className: 'dgp-detail-head' },
          onClose ? h(IconButton, { title: tr('action.back'), onClick: onClose, icon: h(IconBack) }) : null,
          h('div', { className: 'dgp-detail-title dgp-mono', title: commit?.hash }, commit ? commit.short : String(hash ?? '').slice(0, 8)),
          commit
            ? h(IconButton, { title: copied ? tr('action.copied') : tr('action.copy'), active: copied, onClick: copyHash, icon: h(IconCopy) })
            : null,
          remote ? h(IconButton, { title: tr('action.openRemote'), onClick: () => window.open(remote, '_blank', 'noopener,noreferrer'), icon: h(IconExternal) }) : null,
        ),
        error ? h(ErrorBar, { message: error, tr }) : null,
        loading ? h(Spinner, { tr }) : null,
        commit
          ? h(
              React.Fragment,
              null,
              h(
                'div',
                { className: 'dgp-commitmeta' },
                h('div', { className: 'dgp-commitmeta-subject' }, commit.subject || '(no subject)'),
                h(
                  'div',
                  { className: 'dgp-commitmeta-line' },
                  h(Avatar, { name: commit.author }),
                  h('span', null, commit.author || tr('common.unknown')),
                  h('span', null, '·'),
                  h('span', { title: fullTime(commit.time) }, relTime(commit.time, tr)),
                  commit.parents.length > 0 ? h('span', null, '·') : null,
                  commit.parents.map((parent) =>
                    h(
                      'button',
                      {
                        key: parent,
                        type: 'button',
                        className: 'dgp-ref',
                        title: `${tr('commit.parent')} ${parent}`,
                        onClick: () => onSelectCommit?.(parent),
                        style: { border: 'none', cursor: 'pointer' },
                      },
                      parent.slice(0, 7),
                    ),
                  ),
                ),
                h('div', { className: 'dgp-commitmeta-line' }, h(RefChips, { refs: commit.refs })),
                h(
                  'div',
                  { className: 'dgp-commitmeta-actions' },
                  h(
                    'button',
                    { type: 'button', className: 'dgp-btn ghost', onClick: copyHash },
                    h(IconCopy, { size: 12 }),
                    copied ? tr('action.copied') : tr('action.copy'),
                  ),
                  onBlame
                    ? h(
                        'button',
                        { type: 'button', className: 'dgp-btn ghost', onClick: () => commit.files?.[0] && onBlame(commit.files[0].path) },
                        h(IconBlame, { size: 12 }),
                        tr('action.blame'),
                      )
                    : null,
                ),
              ),
              body ? h('div', { className: 'dgp-commitbody' }, body) : null,
              h(
                'div',
                { className: 'dgp-section-label' },
                h('span', null, `${tr('commit.files')} · ${commit.files?.length ?? 0}`),
                commit.files?.length > 1
                  ? h(
                      'button',
                      { type: 'button', className: 'dgp-mini-btn', title: tr('diff.files'), onClick: () => setShowFiles((value) => !value) },
                      h(IconChevron, { open: showFiles }),
                    )
                  : null,
              ),
              commit.files?.length === 0 ? h(Empty, { icon: h(IconCommit, { size: 24 }), title: tr('commit.none') }) : null,
              commit.files?.length > 0 && showFiles
                ? h(
                    'div',
                    { className: 'dgp-filelist' },
                    h(
                      'div',
                      { className: 'dgp-filelist-scroll' },
                      commit.files.slice(0, FILE_ROW_LIMIT).map((file) =>
                        h(
                          'div',
                          {
                            key: file.path,
                            className: cx('dgp-filerow', file.path === selectedFile?.path && 'selected'),
                            onClick: () => {
                              setSelectedPath(file.path);
                              if (compact) setShowFiles(false);
                            },
                          },
                          h(StatusBadge, { letter: file.status ?? 'M' }),
                          h('span', { className: 'dgp-path' }, pathParts(file.path)),
                          h(FileStats, { additions: file.additions, deletions: file.deletions }),
                          h(
                            'span',
                            { className: 'dgp-filerow-actions' },
                            onHistory ? h(MiniButton, { title: tr('action.history'), onClick: () => onHistory(file.path), icon: h(IconCommit, { size: 12 }) }) : null,
                            onBlame ? h(MiniButton, { title: tr('action.blame'), onClick: () => onBlame(file.path), icon: h(IconBlame, { size: 12 }) }) : null,
                          ),
                        ),
                      ),
                    ),
                    commit.files.length > FILE_ROW_LIMIT
                      ? h('div', { className: 'dgp-muted', style: { padding: '4px 10px 0', fontSize: '10px' } }, tr('common.moreFiles').replace('{n}', String(FILE_ROW_LIMIT)))
                      : null,
                  )
                : null,
              selectedFile
                ? h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'dgp-diff-head' },
                      h('div', { className: 'dgp-diff-path', title: selectedFile.path }, selectedFile.path),
                      h(FileStats, { additions: selectedFile.additions, deletions: selectedFile.deletions }),
                    ),
                    fileError ? h(ErrorBar, { message: fileError, tr, onRetry: () => setFileReload((value) => value + 1) }) : null,
                    fileLoading ? h(Spinner, { tr }) : null,
                    !fileLoading && (selectedFile.binary || fileDiff?.binary)
                      ? h(Empty, { icon: h(IconCommit, { size: 24 }), title: tr('diff.binary') })
                      : !fileLoading && fileDiff
                        ? h(DiffLines, { patch: fileDiff.patch })
                        : null,
                  )
                : null,
            )
          : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* Changes                                                            */
    /* ------------------------------------------------------------------ */

    function FileRow({ entry, tr, onOpen, onStage, onUnstage, onDiscard, selected }) {
      const letter = statusLetter(entry);
      return h(
        'div',
        {
          className: cx('dgp-filerow', selected && 'selected'),
          title: entry.path,
          onClick: onOpen,
        },
        h(StatusBadge, { letter }),
        h('span', { className: 'dgp-path' }, pathParts(entry.originalPath ? `${entry.originalPath} → ${entry.path}` : entry.path)),
        h(
          'span',
          { className: 'dgp-filerow-actions' },
          entry.staged || entry.conflicted
            ? h(MiniButton, { title: tr('action.unstage'), onClick: onUnstage, icon: h(IconMinus) })
            : null,
          !entry.staged || entry.untracked
            ? h(MiniButton, { title: tr('action.stage'), onClick: onStage, icon: h(IconPlus) })
            : null,
          h(MiniButton, { title: tr('action.discard'), danger: true, onClick: onDiscard, icon: h(IconTrash) }),
        ),
      );
    }

    function ChangesView(props) {
      const { overview, tr, onSelectDiff, act, busy, selectedPath, wide } = props;
      const [message, setMessage] = React.useState('');
      const [amend, setAmend] = React.useState(false);
      const [stageAll, setStageAll] = React.useState(false);
      const entries = overview?.status?.entries ?? [];
      const summary = overview?.status?.summary ?? { staged: 0, unstaged: 0, untracked: 0, conflicted: 0, total: 0 };

      const groups = React.useMemo(() => {
        const conflicted = entries.filter((entry) => entry.conflicted);
        const staged = entries.filter((entry) => entry.staged && !entry.conflicted);
        const unstaged = entries.filter((entry) => entry.unstaged && !entry.conflicted);
        const untracked = entries.filter((entry) => entry.untracked);
        return [
          { key: 'conflicted', label: tr('status.conflicted'), items: conflicted, scope: 'working' },
          { key: 'staged', label: tr('status.staged'), items: staged, scope: 'staged' },
          { key: 'unstaged', label: tr('status.unstaged'), items: unstaged, scope: 'working' },
          { key: 'untracked', label: tr('status.untracked'), items: untracked, scope: 'untracked' },
        ].filter((group) => group.items.length > 0);
      }, [entries, tr]);

      const canCommit = message.trim() !== '' && (stageAll || summary.staged > 0);

      const submit = async () => {
        if (!canCommit || busy) return;
        const value = await act('commit', { message: message.trim(), amend, all: stageAll });
        if (value !== undefined) {
          setMessage('');
          setAmend(false);
        }
      };

      const onKeyDown = (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          submit();
        }
      };

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'dgp-toolbar' },
          h(
            'span',
            { className: 'dgp-muted', style: { fontSize: '10.5px', flex: 'none' } },
            `${summary.staged} ${tr('status.staged').toLowerCase()} · ${summary.unstaged} ${tr('status.unstaged').toLowerCase()}`,
          ),
          summary.total > 0
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dgp-btn ghost',
                  style: { marginLeft: 'auto', height: '23px', fontSize: '10.5px' },
                  disabled: busy,
                  onClick: () => act('stage', { all: true }),
                },
                tr('action.stage'),
              )
            : null,
        ),
        h(
          'div',
          { className: 'dgp-scroll' },
          entries.length === 0
            ? h(Empty, { icon: h(IconCommit, { size: 28 }), title: tr('status.clean'), hint: tr('status.cleanHint') })
            : groups.map((group) =>
                h(
                  React.Fragment,
                  { key: group.key },
                  h(
                    'div',
                    { className: 'dgp-section-label' },
                    h('span', null, group.label),
                    h('span', { className: 'dgp-section-count' }, String(group.items.length)),
                  ),
                  group.items.map((entry, index) =>
                    h(FileRow, {
                      key: `${group.key}:${entry.path}:${index}`,
                      entry,
                      tr,
                      selected: selectedPath === entry.path,
                      onOpen: () => onSelectDiff({ scope: group.scope, path: entry.path }),
                      onStage: () => act('stage', { paths: [entry.path] }),
                      onUnstage: () => act('unstage', { paths: [entry.path] }),
                      onDiscard: () => {
                        if (!confirmAsk(tr, tr('action.discardConfirm'))) return;
                        act('discard', { paths: [entry.path] });
                      },
                    }),
                  ),
                ),
              ),
        ),
        h(
          'div',
          { className: 'dgp-commitbox' },
          h('textarea', {
            value: message,
            placeholder: tr('changes.commitPlaceholder'),
            onChange: (event) => setMessage(event.target.value),
            onKeyDown,
            disabled: busy,
            rows: wide ? 3 : 2,
          }),
          h(
            'div',
            { className: 'dgp-commitbox-row' },
            h(
              'label',
              { className: 'dgp-check' },
              h('input', { type: 'checkbox', checked: amend, onChange: (event) => setAmend(event.target.checked) }),
              tr('changes.amend'),
            ),
            h(
              'label',
              { className: 'dgp-check' },
              h('input', { type: 'checkbox', checked: stageAll, onChange: (event) => setStageAll(event.target.checked) }),
              tr('changes.stageAll'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dgp-btn primary',
                disabled: !canCommit || busy,
                title: canCommit ? tr('changes.commit') : tr('changes.nothingStaged'),
                onClick: submit,
              },
              busy ? tr('common.working') : tr('changes.commit'),
            ),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* History                                                            */
    /* ------------------------------------------------------------------ */

    function CommitRow({ commit, tr, onClick, selected }) {
      return h(
        'div',
        {
          className: cx('dgp-commitrow', selected && 'selected'),
          onClick,
          title: commit.subject,
        },
        h(Avatar, { name: commit.author }),
        h(
          'div',
          { className: 'dgp-commitrow-body' },
          h('div', { className: 'dgp-commitrow-subject' }, commit.subject || '(no subject)'),
          h(
            'div',
            { className: 'dgp-commitrow-meta' },
            h('span', { className: 'dgp-commitrow-hash' }, commit.short),
            h('span', null, commit.author || tr('common.unknown')),
            h('span', null, '·'),
            h('span', { title: fullTime(commit.time) }, relTime(commit.time, tr)),
            commit.refs.length > 0 ? h(RefChips, { refs: commit.refs }) : null,
          ),
        ),
      );
    }

    function HistoryView(props) {
      const { sessionId, cwd, repoRoot, tr, onSelect, pathFilter, onClearPath, selectedHash, refreshKey } = props;
      const [query, setQuery] = React.useState('');
      const [commits, setCommits] = React.useState([]);
      const [hasMore, setHasMore] = React.useState(false);
      const [loading, setLoading] = React.useState(true);
      const [loadingMore, setLoadingMore] = React.useState(false);
      const [error, setError] = React.useState('');
      const [unborn, setUnborn] = React.useState(false);
      const [reload, setReload] = React.useState(0);

      React.useEffect(() => {
        let alive = true;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
          setLoading(true);
          setError('');
          setUnborn(false);
          const search = query.trim();
          const method = pathFilter ? 'fileHistory' : search !== '' ? 'search' : 'log';
          const payload = { sessionId, cwd, repoRoot, limit: 50, skip: 0 };
          if (pathFilter) payload.path = pathFilter;
          if (search !== '') payload.grep = search;
          api(method, payload, controller.signal)
            .then((value) => {
              if (!alive) return;
              setCommits(value.commits ?? []);
              setHasMore(Boolean(value.hasMore));
              setUnborn(Boolean(value.unborn));
            })
            .catch((value) => {
              if (!alive || value.name === 'AbortError') return;
              const message = value instanceof Error ? value.message : String(value);
              if (isUnbornMessage(message)) {
                setCommits([]);
                setHasMore(false);
                setUnborn(true);
                return;
              }
              setError(message);
            })
            .finally(() => {
              if (alive) setLoading(false);
            });
        }, query === '' ? 0 : 260);
        return () => {
          alive = false;
          controller.abort();
          window.clearTimeout(timer);
        };
      }, [sessionId, cwd, repoRoot, query, pathFilter, refreshKey, reload]);

      const loadMore = async () => {
        if (loadingMore) return;
        setLoadingMore(true);
        try {
          const search = query.trim();
          const method = pathFilter ? 'fileHistory' : search !== '' ? 'search' : 'log';
          const payload = { sessionId, cwd, repoRoot, limit: 50, skip: commits.length };
          if (pathFilter) payload.path = pathFilter;
          if (search !== '') payload.grep = search;
          const value = await api(method, payload);
          setCommits((current) => [...current, ...(value.commits ?? [])]);
          setHasMore(Boolean(value.hasMore));
        } catch (value) {
          setError(value instanceof Error ? value.message : String(value));
        } finally {
          setLoadingMore(false);
        }
      };

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'dgp-toolbar' },
          h(
            'label',
            { className: 'dgp-search' },
            h(IconSearch),
            h('input', {
              value: query,
              placeholder: tr('searchPlaceholder'),
              onChange: (event) => setQuery(event.target.value),
            }),
          ),
          h(IconButton, { title: tr('refresh'), onClick: () => setReload((value) => value + 1), icon: h(IconRefresh) }),
        ),
        pathFilter
          ? h(
              'div',
              { className: 'dgp-toolbar', style: { paddingTop: '0', borderBottom: 'none', gap: '6px' } },
              h('span', { className: 'dgp-muted', style: { fontSize: '10.5px' } }, tr('history.pathFilter')),
              h('span', { className: 'dgp-ref local', title: pathFilter }, pathFilter),
              h(
                'button',
                { type: 'button', className: 'dgp-mini-btn', title: tr('action.close'), onClick: onClearPath },
                h(IconClose, { size: 12 }),
              ),
            )
          : null,
        error ? h(ErrorBar, { message: error, tr, onRetry: () => setReload((value) => value + 1) }) : null,
        h(
          'div',
          { className: 'dgp-scroll' },
          loading ? h(Spinner, { tr }) : null,
          !loading && commits.length === 0 && !error
            ? h(Empty, {
                icon: h(IconCommit, { size: 28 }),
                title: unborn ? tr('history.unborn') : tr('history.empty'),
                hint: unborn ? tr('history.unbornHint') : undefined,
              })
            : null,
          commits.map((commit) =>
            h(CommitRow, {
              key: commit.hash,
              commit,
              tr,
              selected: selectedHash === commit.hash,
              onClick: () => onSelect(commit.hash),
            }),
          ),
          hasMore
            ? h(
                'div',
                { className: 'dgp-more' },
                h('button', { type: 'button', className: 'dgp-btn ghost', onClick: loadMore, disabled: loadingMore }, loadingMore ? tr('loading') : tr('action.loadMore')),
              )
            : null,
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Branches                                                           */
    /* ------------------------------------------------------------------ */

    function BranchesView(props) {
      const { sessionId, cwd, repoRoot, tr, act, busy, refreshKey } = props;
      const [data, setData] = React.useState({ local: [], remote: [] });
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState('');
      const [name, setName] = React.useState('');
      const [from, setFrom] = React.useState('');
      const [filter, setFilter] = React.useState('');
      const [reload, setReload] = React.useState(0);

      React.useEffect(() => {
        let alive = true;
        const controller = new AbortController();
        setLoading(true);
        setError('');
        api('branches', { sessionId, cwd, repoRoot }, controller.signal)
          .then((value) => {
            if (alive) setData({ local: value.local ?? [], remote: value.remote ?? [] });
          })
          .catch((value) => {
            if (alive) setError(value instanceof Error ? value.message : String(value));
          })
          .finally(() => {
            if (alive) setLoading(false);
          });
        return () => {
          alive = false;
          controller.abort();
        };
      }, [sessionId, cwd, repoRoot, refreshKey, reload]);

      const normalizedFilter = filter.trim().toLowerCase();
      const match = (item) => normalizedFilter === '' || item.name.toLowerCase().includes(normalizedFilter);
      const local = data.local.filter(match);
      const remote = data.remote.filter(match);

      const checkout = (item) => {
        if (item.refname.startsWith('refs/remotes/')) {
          const localName = item.name.split('/').slice(1).join('/');
          if (localName === '') return;
          const existing = data.local.find((candidate) => candidate.name === localName);
          if (existing) act('checkout', { branch: localName });
          else act('createBranch', { name: localName, from: item.name, checkout: true });
        } else {
          act('checkout', { branch: item.name });
        }
      };

      const create = () => {
        const value = name.trim();
        if (value === '' || busy) return;
        act('createBranch', { name: value, ...(from.trim() !== '' ? { from: from.trim() } : {}), checkout: true }).then((result) => {
          if (result !== undefined) {
            setName('');
            setFrom('');
          }
        });
      };

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'dgp-toolbar' },
          h(
            'label',
            { className: 'dgp-search' },
            h(IconSearch),
            h('input', { value: filter, placeholder: tr('search'), onChange: (event) => setFilter(event.target.value) }),
          ),
          h(
            'button',
            { type: 'button', className: 'dgp-btn ghost', onClick: () => act('fetch'), disabled: busy, title: tr('action.fetch'), style: { height: '25px', fontSize: '10.5px' } },
            h(IconRefresh, { size: 12 }),
            tr('action.fetch'),
          ),
          h(IconButton, { title: tr('refresh'), onClick: () => setReload((value) => value + 1), icon: h(IconRefresh) }),
        ),
        h(
          'div',
          { className: 'dgp-createbar' },
          h('input', {
            className: 'dgp-input',
            value: name,
            placeholder: tr('action.createPlaceholder'),
            onChange: (event) => setName(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') create();
            },
          }),
          h('input', {
            className: 'dgp-input',
            value: from,
            placeholder: tr('branches.createFrom'),
            onChange: (event) => setFrom(event.target.value),
            style: { flex: '0 0 150px' },
          }),
          h('button', { type: 'button', className: 'dgp-btn', onClick: create, disabled: busy || name.trim() === '' }, h(IconPlus), tr('action.create')),
        ),
        error ? h(ErrorBar, { message: error, tr, onRetry: () => setReload((value) => value + 1) }) : null,
        h(
          'div',
          { className: 'dgp-scroll' },
          loading ? h(Spinner, { tr }) : null,
          !loading && local.length === 0 && remote.length === 0 ? h(Empty, { icon: h(IconBranch, { size: 26 }), title: tr('branches.empty') }) : null,
          local.length > 0
            ? h(
                React.Fragment,
                null,
                h('div', { className: 'dgp-section-label' }, h('span', null, tr('branches.local')), h('span', { className: 'dgp-section-count' }, String(local.length))),
                local.map((item) =>
                  h(
                    'div',
                    { key: item.refname, className: cx('dgp-branchrow', item.current && 'current'), onClick: () => !item.current && checkout(item) },
                    item.current ? h('span', { className: 'dgp-currentdot' }) : h('span', { style: { width: '6px' } }),
                    h(
                      'div',
                      { className: 'dgp-branchrow-main' },
                      h('div', { className: 'dgp-branchrow-name' }, item.name, item.current ? h('span', { className: 'dgp-ref head' }, tr('branches.current')) : null),
                      h('div', { className: 'dgp-branchrow-sub' }, item.subject || item.upstream || ' '),
                    ),
                    h(
                      'span',
                      { className: 'dgp-branchrow-actions' },
                      item.current
                        ? null
                        : h(MiniButton, {
                            title: tr('action.delete'),
                            danger: true,
                            onClick: () => {
                              if (!confirmAsk(tr, tr('action.deleteConfirm'))) return;
                              act('deleteBranch', { name: item.name });
                            },
                            icon: h(IconTrash),
                          }),
                    ),
                  ),
                ),
              )
            : null,
          remote.length > 0
            ? h(
                React.Fragment,
                null,
                h('div', { className: 'dgp-section-label' }, h('span', null, tr('branches.remote')), h('span', { className: 'dgp-section-count' }, String(remote.length))),
                remote.map((item) =>
                  h(
                    'div',
                    { key: item.refname, className: 'dgp-branchrow', onClick: () => checkout(item) },
                    h('span', { style: { width: '6px' } }),
                    h(
                      'div',
                      { className: 'dgp-branchrow-main' },
                      h('div', { className: 'dgp-branchrow-name' }, item.name),
                      h('div', { className: 'dgp-branchrow-sub' }, item.subject || ' '),
                    ),
                  ),
                ),
              )
            : null,
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Stashes                                                            */
    /* ------------------------------------------------------------------ */

    function StashesView(props) {
      const { sessionId, cwd, repoRoot, tr, act, busy, refreshKey } = props;
      const [stashes, setStashes] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState('');
      const [message, setMessage] = React.useState('');
      const [includeUntracked, setIncludeUntracked] = React.useState(true);
      const [reload, setReload] = React.useState(0);

      React.useEffect(() => {
        let alive = true;
        const controller = new AbortController();
        setLoading(true);
        setError('');
        api('stashes', { sessionId, cwd, repoRoot }, controller.signal)
          .then((value) => {
            if (alive) setStashes(value.stashes ?? []);
          })
          .catch((value) => {
            if (alive) setError(value instanceof Error ? value.message : String(value));
          })
          .finally(() => {
            if (alive) setLoading(false);
          });
        return () => {
          alive = false;
          controller.abort();
        };
      }, [sessionId, cwd, repoRoot, refreshKey, reload]);

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'dgp-createbar' },
          h('input', {
            className: 'dgp-input',
            value: message,
            placeholder: tr('action.stashMessage'),
            onChange: (event) => setMessage(event.target.value),
          }),
          h(
            'label',
            { className: 'dgp-check' },
            h('input', { type: 'checkbox', checked: includeUntracked, onChange: (event) => setIncludeUntracked(event.target.checked) }),
            tr('action.includeUntracked'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dgp-btn',
              disabled: busy,
              onClick: () =>
                act('stashSave', { message: message.trim(), includeUntracked }).then((result) => {
                  if (result !== undefined) setMessage('');
                }),
            },
            h(IconStash),
            tr('action.stash'),
          ),
          h(IconButton, { title: tr('refresh'), onClick: () => setReload((value) => value + 1), icon: h(IconRefresh) }),
        ),
        error ? h(ErrorBar, { message: error, tr, onRetry: () => setReload((value) => value + 1) }) : null,
        h(
          'div',
          { className: 'dgp-scroll' },
          loading ? h(Spinner, { tr }) : null,
          !loading && stashes.length === 0 ? h(Empty, { icon: h(IconStash, { size: 28 }), title: tr('stashes.empty'), hint: tr('stashes.hint') }) : null,
          stashes.map((stash) =>
            h(
              'div',
              { key: stash.ref, className: 'dgp-stashrow' },
              h(IconStash, { size: 15 }),
              h(
                'div',
                { className: 'dgp-stashrow-main' },
                h('div', { className: 'dgp-stashrow-subject' }, stash.subject || stash.ref),
                h(
                  'div',
                  { className: 'dgp-stashrow-meta' },
                  h('span', { className: 'dgp-mono' }, stash.ref),
                  h('span', { className: 'dgp-mono' }, stash.short),
                  h('span', { title: fullTime(stash.time) }, relTime(stash.time, tr)),
                ),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dgp-btn ghost',
                  style: { height: '23px', fontSize: '10.5px' },
                  onClick: () => {
                    if (!confirmAsk(tr, tr('action.popConfirm'))) return;
                    act('stashPop', { ref: stash.ref });
                  },
                },
                tr('action.stashPop'),
              ),
              h(MiniButton, {
                title: tr('action.stashDrop'),
                danger: true,
                onClick: () => {
                  if (!confirmAsk(tr, tr('action.dropConfirm'))) return;
                  act('stashDrop', { ref: stash.ref });
                },
                icon: h(IconTrash),
              }),
            ),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Compare                                                            */
    /* ------------------------------------------------------------------ */

    function CompareView(props) {
      const { sessionId, cwd, repoRoot, tr, onSelectCommit, defaults } = props;
      const [base, setBase] = React.useState(defaults?.base ?? 'HEAD~5');
      const [head, setHead] = React.useState(defaults?.head ?? 'HEAD');
      const [result, setResult] = React.useState(null);
      const [loading, setLoading] = React.useState(false);
      const [error, setError] = React.useState('');
      const [selectedFile, setSelectedFile] = React.useState(null);
      const [fileDiff, setFileDiff] = React.useState(null);
      const [fileLoading, setFileLoading] = React.useState(false);
      const [fileError, setFileError] = React.useState('');
      const [fileReload, setFileReload] = React.useState(0);

      const run = async () => {
        if (base.trim() === '' || head.trim() === '' || loading) return;
        setLoading(true);
        setError('');
        try {
          const value = await api('compare', { sessionId, cwd, repoRoot, base: base.trim(), head: head.trim(), limit: 100 });
          setResult(value);
          setSelectedFile(value.diff?.files?.[0]?.path ?? null);
        } catch (value) {
          setError(value instanceof Error ? value.message : String(value));
        } finally {
          setLoading(false);
        }
      };

      React.useEffect(() => {
        if (defaults?.base) setBase(defaults.base);
        if (defaults?.head) setHead(defaults.head);
      }, [defaults?.base, defaults?.head]);

      const files = result?.diff?.files ?? [];
      const file = files.find((entry) => entry.path === selectedFile) ?? files[0];

      React.useEffect(() => {
        if (!result || !file?.path) {
          setFileDiff(null);
          return undefined;
        }
        if (file.binary) {
          setFileDiff(null);
          setFileLoading(false);
          return undefined;
        }
        let alive = true;
        const controller = new AbortController();
        setFileLoading(true);
        setFileError('');
        api(
          'diff',
          { sessionId, cwd, repoRoot, scope: 'range', base: result.base, head: result.head, path: file.path },
          controller.signal,
        )
          .then((value) => {
            if (alive) setFileDiff(value.files?.[0] ?? null);
          })
          .catch((value) => {
            if (alive) setFileError(value instanceof Error ? value.message : String(value));
          })
          .finally(() => {
            if (alive) setFileLoading(false);
          });
        return () => {
          alive = false;
          controller.abort();
        };
      }, [sessionId, cwd, repoRoot, result, file?.path, file?.binary, fileReload]);

      return h(
        'div',
        { className: 'dgp-compare' },
        h(
          'div',
          { className: 'dgp-compare-form' },
          h('input', { className: 'dgp-input', value: base, placeholder: tr('compare.base'), onChange: (event) => setBase(event.target.value) }),
          h('span', { className: 'dgp-muted' }, '…'),
          h('input', { className: 'dgp-input', value: head, placeholder: tr('compare.head'), onChange: (event) => setHead(event.target.value) }),
          h('button', { type: 'button', className: 'dgp-btn primary', onClick: run, disabled: loading }, loading ? tr('loading') : tr('action.compare')),
        ),
        error ? h(ErrorBar, { message: error, tr, onRetry: run }) : null,
        !result && !loading && !error ? h(Empty, { icon: h(IconCompare, { size: 28 }), title: tr('compare.empty') }) : null,
        result
          ? h(
              'div',
              { className: 'dgp-compare-body' },
              h(
                'div',
                { className: 'dgp-compare-list' },
                result.commits?.length === 0
                  ? h(Empty, { icon: h(IconCommit, { size: 24 }), title: tr('compare.noCommits') })
                  : (result.commits ?? []).map((commit) =>
                      h(CommitRow, { key: commit.hash, commit, tr, onClick: () => onSelectCommit(commit.hash) }),
                    ),
              ),
              h(
                'div',
                { className: 'dgp-compare-diff' },
                files.length === 0
                  ? h(Empty, { icon: h(IconCommit, { size: 24 }), title: tr('diff.noChanges') })
                  : h(
                      React.Fragment,
                      null,
                      files.length > 1
                        ? h(
                            'div',
                            { className: 'dgp-filelist' },
                            h(
                              'div',
                              { className: 'dgp-filelist-scroll' },
                              files.slice(0, FILE_ROW_LIMIT).map((entry) =>
                                h(
                                  'div',
                                  {
                                    key: entry.path,
                                    className: cx('dgp-filerow', entry.path === file?.path && 'selected'),
                                    onClick: () => setSelectedFile(entry.path),
                                  },
                                  h(StatusBadge, { letter: entry.status ?? 'M' }),
                                  h('span', { className: 'dgp-path' }, pathParts(entry.path)),
                                  h(FileStats, { additions: entry.additions, deletions: entry.deletions }),
                                ),
                              ),
                            ),
                          )
                        : null,
                      file
                        ? h(
                            React.Fragment,
                            null,
                            h(
                              'div',
                              { className: 'dgp-diff-head' },
                              h('div', { className: 'dgp-diff-path' }, file.path),
                              h(FileStats, { additions: file.additions, deletions: file.deletions }),
                            ),
                            file.binary
                              ? h(Empty, { icon: h(IconCommit, { size: 24 }), title: tr('diff.binary') })
                              : h(
                                  React.Fragment,
                                  null,
                                  fileError ? h(ErrorBar, { message: fileError, tr, onRetry: () => setFileReload((value) => value + 1) }) : null,
                                  fileLoading ? h(Spinner, { tr }) : null,
                                  !fileLoading && fileDiff ? h(DiffLines, { patch: fileDiff.patch }) : null,
                                ),
                          )
                        : null,
                    ),
              ),
            )
          : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* Blame                                                              */
    /* ------------------------------------------------------------------ */

    function BlameView(props) {
      const { sessionId, cwd, repoRoot, tr, initialPath, onSelectCommit } = props;
      const [path, setPath] = React.useState(initialPath ?? '');
      const [start, setStart] = React.useState('');
      const [end, setEnd] = React.useState('');
      const [data, setData] = React.useState(null);
      const [files, setFiles] = React.useState([]);
      const [loading, setLoading] = React.useState(false);
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        let alive = true;
        api('files', { sessionId, cwd, repoRoot })
          .then((value) => {
            if (alive) setFiles(value.files ?? []);
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, [sessionId, cwd, repoRoot]);

      const run = React.useCallback(
        async (override) => {
          const target = (override ?? path).trim();
          if (target === '' || loading) return;
          setLoading(true);
          setError('');
          try {
            const value = await api('blame', {
              sessionId,
              cwd,
              repoRoot,
              path: target,
              ...(start.trim() !== '' ? { start: Number.parseInt(start, 10) } : {}),
              ...(end.trim() !== '' ? { end: Number.parseInt(end, 10) } : {}),
            });
            setData(value);
          } catch (value) {
            const message = value instanceof Error ? value.message : String(value);
            if (isUnbornMessage(message)) setData({ path: target, lines: [], unborn: true });
            else setError(message);
          } finally {
            setLoading(false);
          }
        },
        [sessionId, cwd, repoRoot, path, start, end, loading],
      );

      React.useEffect(() => {
        if (initialPath && initialPath !== '') {
          setPath(initialPath);
          run(initialPath);
        }
      }, [initialPath]);

      const lines = data?.lines ?? [];

      return h(
        React.Fragment,
        null,
        h(
          'div',
          { className: 'dgp-blame-head' },
          h(
            'div',
            { className: 'dgp-blame-form' },
            h('input', {
              className: 'dgp-input',
              value: path,
              placeholder: tr('blame.pathPlaceholder'),
              list: 'dgp-blame-files',
              onChange: (event) => setPath(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter') run();
              },
            }),
            h('input', { className: 'dgp-input', value: start, placeholder: tr('blame.start'), style: { flex: '0 0 66px' }, onChange: (event) => setStart(event.target.value) }),
            h('input', { className: 'dgp-input', value: end, placeholder: tr('blame.end'), style: { flex: '0 0 66px' }, onChange: (event) => setEnd(event.target.value) }),
            h('button', { type: 'button', className: 'dgp-btn', onClick: () => run(), disabled: loading || path.trim() === '' }, h(IconBlame), tr('blame.load')),
          ),
          h(
            'datalist',
            { id: 'dgp-blame-files' },
            files.slice(0, 4000).map((file) => h('option', { key: file, value: file })),
          ),
        ),
        error ? h(ErrorBar, { message: error, tr, onRetry: () => run() }) : null,
        h(
          'div',
          { className: 'dgp-scroll' },
          loading ? h(Spinner, { tr }) : null,
          !loading && !data && !error ? h(Empty, { icon: h(IconBlame, { size: 28 }), title: tr('blame.empty') }) : null,
          data && lines.length === 0 && !loading
            ? h(Empty, {
                icon: h(IconBlame, { size: 26 }),
                title: data.unborn ? tr('history.unborn') : tr('blame.noResult'),
                hint: data.unborn ? tr('history.unbornHint') : undefined,
              })
            : null,
          lines.map((line, index) =>
            h(
              'div',
              { key: `${index}:${line.hash}`, className: 'dgp-blame-line', style: ageTint(line.time) },
              h('span', { className: 'dgp-blame-gutter' }, String(line.line)),
              h(
                'button',
                { type: 'button', className: 'dgp-blame-sha', title: `${line.hash}\n${line.summary}`, onClick: () => onSelectCommit(line.hash) },
                line.short,
              ),
              h('span', { className: 'dgp-blame-person', title: `${line.author} <${line.email}>` }, line.author || tr('common.unknown')),
              h('span', { className: 'dgp-blame-date', title: fullTime(line.time) }, shortDate(line.time)),
              h('span', { className: 'dgp-blame-code' }, line.content === '' ? ' ' : line.content),
            ),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Main application                                                   */
    /* ------------------------------------------------------------------ */

    const NO_SESSIONS = () => ({ byId: {} });

    function GitApp(props) {
      const { sessionId, useSessions, t, wide } = props;
      const tr = React.useCallback((key) => (typeof t === 'function' ? t(key) : key), [t]);
      const readSessions = typeof useSessions === 'function' ? useSessions : NO_SESSIONS;
      const cwd = readSessions((sessions) => sessions.byId?.[sessionId]?.cwd);

      const [repoRoot, setRepoRoot] = React.useState(() => {
        try {
          return window.localStorage.getItem(`dsh-git.repo:${sessionId}`) ?? '';
        } catch {
          return '';
        }
      });
      const [overview, setOverview] = React.useState(null);
      const [repos, setRepos] = React.useState([]);
      const [tab, setTab] = React.useState('changes');
      const [selection, setSelection] = React.useState(null);
      const [historyPath, setHistoryPath] = React.useState(null);
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [initialized, setInitialized] = React.useState(false);
      const [refreshKey, setRefreshKey] = React.useState(0);

      const loadOverview = React.useCallback(
        async (options = {}) => {
          if (!cwd) return;
          try {
            const value = await api('overview', {
              sessionId,
              cwd,
              ...(repoRoot !== '' ? { repoRoot } : {}),
            });
            setOverview(value);
            setRepos(value.repos ?? []);
            if (value.repoRoot && value.repoRoot !== repoRoot) setRepoRoot(value.repoRoot);
            if (!options.silent) setError('');
            setInitialized(true);
          } catch (value) {
            if (!options.silent) {
              setError(value instanceof Error ? value.message : String(value));
              setInitialized(true);
            }
          }
        },
        [sessionId, cwd, repoRoot],
      );

      React.useEffect(() => {
        if (!cwd) return undefined;
        loadOverview();
        const timer = window.setInterval(() => {
          if (document.visibilityState !== 'hidden') loadOverview({ silent: true });
        }, 9000);
        return () => window.clearInterval(timer);
      }, [cwd, repoRoot, loadOverview]);

      React.useEffect(() => {
        try {
          if (repoRoot !== '') window.localStorage.setItem(`dsh-git.repo:${sessionId}`, repoRoot);
        } catch {
          // Private browsing can refuse storage; the in-memory selection still works.
        }
      }, [repoRoot, sessionId]);

      React.useEffect(() => {
        setSelection(null);
        setHistoryPath(null);
      }, [repoRoot]);

      const act = React.useCallback(
        async (action, payload = {}) => {
          setBusy(true);
          setError('');
          try {
            const result = await api('action', { sessionId, cwd, repoRoot, action, ...payload });
            setRefreshKey((value) => value + 1);
            await loadOverview({ silent: true });
            return result ?? {};
          } catch (value) {
            setError(value instanceof Error ? value.message : String(value));
            return undefined;
          } finally {
            setBusy(false);
          }
        },
        [sessionId, cwd, repoRoot, loadOverview],
      );

      const selectRepo = (root) => {
        if (root === repoRoot) return;
        setRepoRoot(root);
        setOverview(null);
        setInitialized(false);
      };

      const openHistory = (filePath) => {
        setSelection(null);
        setHistoryPath(filePath);
        setTab('history');
      };

      const selectCommit = (hash) => {
        if (!hash || typeof hash !== 'string') return;
        setSelection({ kind: 'commit', hash });
      };

      const openBlame = (filePath) => {
        setSelection({ kind: 'blame', path: filePath });
      };

      const summary = overview?.status?.summary ?? { staged: 0, unstaged: 0, untracked: 0, conflicted: 0, total: 0 };
      const selectedHash = selection?.kind === 'commit' ? selection.hash : undefined;
      const webUrl = remoteBase(overview?.remotes);

      const tabs = [
        { id: 'changes', label: tr('tabs.changes'), icon: h(IconCommit), count: summary.total },
        { id: 'history', label: tr('tabs.history'), icon: h(IconBranch) },
        { id: 'branches', label: tr('tabs.branches'), icon: h(IconBranch) },
        { id: 'stashes', label: tr('tabs.stashes'), icon: h(IconStash), count: overview?.stashes ?? 0 },
        { id: 'compare', label: tr('tabs.compare'), icon: h(IconCompare) },
        { id: 'blame', label: tr('tabs.blame'), icon: h(IconBlame) },
      ];

      const renderTab = () => {
        if (!overview || overview.empty) return null;
        if (tab === 'changes') {
          return h(ChangesView, {
            overview,
            tr,
            act,
            busy,
            wide,
            selectedPath: selection?.kind === 'diff' ? selection.path : undefined,
            onSelectDiff: (params) => setSelection({ kind: 'diff', ...params }),
          });
        }
        if (tab === 'history') {
          return h(HistoryView, {
            sessionId,
            cwd,
            repoRoot,
            tr,
            refreshKey,
            pathFilter: historyPath,
            onClearPath: () => setHistoryPath(null),
            selectedHash,
            onSelect: selectCommit,
          });
        }
        if (tab === 'branches') {
          return h(BranchesView, { sessionId, cwd, repoRoot, tr, act, busy, refreshKey });
        }
        if (tab === 'stashes') {
          return h(StashesView, { sessionId, cwd, repoRoot, tr, act, busy, refreshKey });
        }
        if (tab === 'compare') {
          return h(CompareView, {
            sessionId,
            cwd,
            repoRoot,
            tr,
            onSelectCommit: selectCommit,
            defaults: { base: overview.upstream || 'HEAD~5', head: 'HEAD' },
          });
        }
        if (tab === 'blame') {
          return h(BlameView, {
            sessionId,
            cwd,
            repoRoot,
            tr,
            initialPath: selection?.kind === 'blame' ? selection.path : undefined,
            onSelectCommit: selectCommit,
          });
        }
        return null;
      };

      const renderDetail = () => {
        if (!selection) return null;
        if (selection.kind === 'commit') {
          return h(CommitDetail, {
            sessionId,
            cwd,
            repoRoot,
            hash: selection.hash,
            tr,
            webUrl,
            compact: !wide,
            onClose: () => setSelection(null),
            onSelectCommit: selectCommit,
            onHistory: openHistory,
            onBlame: openBlame,
          });
        }
        if (selection.kind === 'diff') {
          return h(DiffView, {
            sessionId,
            cwd,
            repoRoot,
            params: selection,
            tr,
            compact: !wide,
            onClose: () => setSelection(null),
            onHistory: openHistory,
            onBlame: openBlame,
            onSelectCommit: selectCommit,
          });
        }
        if (selection.kind === 'blame') {
          return h(
            'div',
            { className: 'dgp-detail' },
            h(
              'div',
              { className: 'dgp-detail-head' },
              h(IconButton, { title: tr('action.back'), onClick: () => setSelection(null), icon: h(IconBack) }),
              h('div', { className: 'dgp-detail-title' }, tr('tabs.blame')),
            ),
            h(BlameView, {
              sessionId,
              cwd,
              repoRoot,
              tr,
              initialPath: selection.path,
              onSelectCommit: selectCommit,
            }),
          );
        }
        return null;
      };

      const header = h(
        'div',
        { className: 'dgp-header' },
        h(
          'div',
          { className: 'dgp-header-main' },
          h(GitIcon, { size: 16 }),
          repos.length > 1
            ? h(
                'select',
                {
                  className: 'dgp-repo-select',
                  value: repoRoot,
                  title: tr('common.repo'),
                  onChange: (event) => selectRepo(event.target.value),
                },
                repos.map((repo) => h('option', { key: repo.root, value: repo.root }, `${repo.name}${repo.branch ? ` (${repo.branch})` : ''}`)),
              )
            : null,
          h(
            'span',
            { className: 'dgp-branch', title: overview?.branch ?? tr('common.branch') },
            h(IconBranch, { size: 14 }),
            h('span', { className: 'dgp-branch-name' }, overview?.detached ? tr('common.detached') : overview?.branch || tr('common.noData')),
          ),
          overview?.ahead > 0 ? h('span', { className: 'dgp-pill ahead' }, tr('common.ahead').replace('{n}', String(overview.ahead))) : null,
          overview?.behind > 0 ? h('span', { className: 'dgp-pill behind' }, tr('common.behind').replace('{n}', String(overview.behind))) : null,
        ),
        h(
          'div',
          { className: 'dgp-header-meta' },
          summary.total > 0 ? h('span', { className: 'dgp-pill' }, `${summary.total} ${tr('common.changedFiles').replace('{n}', '')}`.trim()) : null,
          h(IconButton, { title: tr('refresh'), onClick: () => loadOverview(), icon: h(IconRefresh) }),
        ),
      );

      const tabBar = h(
        'div',
        { className: 'dgp-tabs', role: 'tablist' },
        tabs.map((item) =>
          h(
            'button',
            {
              key: item.id,
              type: 'button',
              role: 'tab',
              'aria-selected': tab === item.id,
              className: cx('dgp-tab', tab === item.id && 'active'),
              onClick: () => {
                setTab(item.id);
                setSelection(null);
              },
            },
            item.icon,
            item.label,
            item.count > 0 ? h('span', { className: 'dgp-count' }, String(item.count)) : null,
          ),
        ),
      );

      let content;
      if (!cwd) {
        content = h(Empty, { icon: h(GitIcon, { size: 30 }), title: tr('emptyWorkspace') });
      } else if (!initialized) {
        content = h(Spinner, { tr });
      } else if (overview?.empty) {
        content = h(Empty, { icon: h(GitIcon, { size: 32 }), title: tr('noRepo'), hint: tr('noRepoHint') });
      } else {
        const detail = renderDetail();
        content = h(
          'div',
          { className: 'dgp-body' },
          !wide && detail
            ? h('div', { className: 'dgp-main' }, detail)
            : h(
                React.Fragment,
                null,
                h('div', { className: 'dgp-main' }, renderTab()),
                wide && detail ? h('div', { className: 'dgp-side' }, detail) : null,
              ),
        );
      }

      return h(
        'div',
        { className: cx('dgp-root', wide ? 'dgp-wide' : 'dgp-compact', wide && selection && 'dgp-has-side') },
        header,
        tabBar,
        error ? h(ErrorBar, { message: error, tr, onRetry: () => loadOverview() }) : null,
        content,
      );
    }

    /* ------------------------------------------------------------------ */
    /* DSH registrations                                                  */
    /* ------------------------------------------------------------------ */

    function SidebarBody(props) {
      return h(GitApp, { ...props, wide: false });
    }

    function ConversationView(props) {
      return h(GitApp, { ...props, wide: true });
    }

    function SidebarTitle({ t }) {
      const label = typeof t === 'function' ? t('sidebar.title') : 'Git';
      return h(
        'span',
        { style: { display: 'inline-flex', alignItems: 'center', gap: '5px' } },
        h(GitIcon, { size: 13 }),
        label,
      );
    }

    function OpenGitButton({ open, t }) {
      const label = typeof t === 'function' ? t('open') : 'Open Git';
      return h(
        'button',
        { type: 'button', className: 'dgp-iconbtn', title: label, 'aria-label': label, onClick: open },
        h(GitIcon, { size: 15 }),
      );
    }

    function apply(ctx) {
      const t = ctx.locale.bind(NS);

      ctx.effect(() => installStyles(), 'dsh-git-explorer: styles');
      ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'dsh-git-explorer: dictionaries');

      const definition = {
        id: TAB_ID,
        kind: KIND,
        priority: 'extension',
        title: () => t('sidebar.title'),
        guide: [
          {
            id: 'gitlens',
            order: 20,
            title: () => t('guide.title'),
            description: () => t('guide.description'),
            icon: GitIcon,
          },
        ],
      };

      ctx.effect(() => ctx.sidebarRightTabs.register(definition), 'dsh-git-explorer: sidebar tab type');

      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.right.pane.tab', () =>
            ctx.slots.register(
              {
                name: 'sidebar.right.pane.tab',
                key: TAB_ID,
                locale: NS,
              },
              SidebarBody,
            ),
          ),
        'dsh-git-explorer: sidebar tab body',
      );

      ctx.effect(
        () =>
          ctx.slots.inject('sidebar.right.pane.tab.title', () =>
            ctx.slots.register(
              {
                name: 'sidebar.right.pane.tab.title',
                key: TAB_ID,
                locale: NS,
              },
              SidebarTitle,
            ),
          ),
        'dsh-git-explorer: sidebar tab title',
      );

      ctx.effect(
        () =>
          ctx.slots.inject('conversation.view', () =>
            ctx.slots.register(
              {
                name: 'conversation.view',
                id: KIND,
                order: 5,
                label: () => t('view.label'),
                locale: NS,
              },
              ConversationView,
            ),
          ),
        'dsh-git-explorer: conversation Git view',
      );

      ctx.effect(
        () =>
          ctx.slots.inject('conversation.session.header.actions', () =>
            ctx.slots.register(
              {
                name: 'conversation.session.header.actions',
                id: 'dsh-git-explorer.open',
                order: 25,
                locale: NS,
                inject: () => ({ open: () => ctx.sidebarRight.openTab(KIND) }),
              },
              OpenGitButton,
            ),
          ),
        'dsh-git-explorer: header shortcut',
      );
    }

    return {
      inject: ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight'],
      apply,
    };
  },
});
