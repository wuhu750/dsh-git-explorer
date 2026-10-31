# dsh-git-explorer

一个面向 DeepSeek Harness（DSH）的 Git 工作台插件。它把仓库状态、提交历史、分支、储藏、比较、逐行追溯和 diff 放进 DSH 的界面里，而不是另起一个独立窗口。

- **侧边栏**：注册为右侧边栏的一个 tab（`gitlens` 类型），并出现在侧边栏的「工具」引导页中。
- **会话顶部标签栏**：注册为会话的一个 View，与「对话 / 轨迹」并列，显示完整的 Git 工作台。
- **会话标题栏按钮**：一个 Git 分支图标，点击直接在右侧边栏打开 Git 面板。

## 功能

### 改动（Changes）

- 已暂存 / 未暂存 / 未跟踪 / 冲突分组
- 单文件或全部暂存、取消暂存、丢弃改动
- 点击文件查看 unified diff，带旧/新行号、增删统计
- 提交框支持 `⌘/Ctrl + Enter` 提交、`--amend`、提交前暂存全部改动
- 顶部显示当前分支、领先/落后远端提交数、改动文件数

### 历史（History）

- 提交列表：短哈希、作者、相对时间、refs（本地分支 / 远端分支 / tag）
- 按提交信息或作者搜索（`git log --grep`），跨所有 refs
- 分页加载更多
- 提交详情：作者、时间、完整 message、父提交跳转、refs、远端打开、复制哈希
- 单文件 history / blame 快捷入口；文件历史可作为过滤器回填到历史列表
- 超大提交只加载文件清单，选中文件后再按需拉取该文件的 patch，避免一次请求几百 MB

### 分支（Branches）

- 本地分支 / 远端分支分组，当前分支高亮
- 检出本地分支
- 远端分支自动创建同名本地跟踪分支并检出
- 新建分支（可指定起点）
- 删除本地分支、抓取远端（`fetch --all --prune`）

### 储藏（Stashes）

- 列出储藏、相对时间、哈希
- 保存储藏（可选包含未跟踪文件）
- 恢复（pop）/ 删除（drop）

### 比较（Compare）

- 任意两个 revision 之间比较
- 左侧提交清单，右侧文件清单与按需加载的 diff

### 追溯（Blame）

- 任意文件逐行归属：行号、提交短哈希、作者、日期、代码
- 按时间做热力着色
- 可选起始行 / 结束行
- 点击哈希直接打开该提交详情
- 文件路径输入带仓库已跟踪文件补全

## 架构

```
┌──────────────────────────── browser ────────────────────────────┐
│ client.js                                                       │
│  ├─ conversation.view            → 会话顶部 Git tab             │
│  ├─ sidebar.right.pane.tab       → 右侧边栏 Git 面板             │
│  ├─ sidebar.right.pane.tab.title → 侧边栏 tab 标题               │
│  ├─ conversation.session.header.actions → 标题栏打开按钮         │
│  └─ sidebarRightTabs.register    → gitlens tab 类型 + 引导页入口 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ POST /dsh-git/api
┌───────────────────────────────▼─────────────────────────────────┐
│ index.js (host)                                                 │
│  ├─ 同源校验（connection.requestRejection）                      │
│  ├─ 会话工作区解析（sessions + workingDirectory）                │
│  ├─ 仓库发现（含嵌套仓库，限深度与目录预算）                      │
│  ├─ git 只读查询：overview/status/log/commit/diff/blame/...      │
│  └─ 白名单写操作：stage/unstage/discard/commit/checkout/...      │
└─────────────────────────────────────────────────────────────────┘
```

- 所有 Git 调用都通过 `execFile('git', [...])` 参数数组执行，不拼 shell 字符串。
- 浏览器只能访问当前会话工作区内的仓库；仓库根、相对路径和 revision 都会在 host 重新校验。
- `.git`、`node_modules`、`dist` 等目录不会在仓库发现时进入。
- patch 最多返回 4 MiB，超出后截断并标记；单次 Git stdout 上限 32 MiB。
- 所有 UI 文本走 DSH 的 locale 服务，当前提供简体中文与英文。

## 作为 bundle 安装（用户不需要改 YAML）

这个仓库本身就是一个 DSH bundle：

- `package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`；
- patch 只声明一行 `dsh-git-explorer`；
- DSH 的插件管理器安装时会把包加入 profile 依赖和 `dsh.profile.bundles`，用户不需要碰 `cordis.patch.yml`。

包名使用 `dsh-git-explorer`。原来的 `dsh-git-panel` 已被 npm 上的另一个项目占用，继续使用会导致按名称安装时装错包。

### 方式一：从插件页安装（推荐）

1. 发布到 npm，或先 `npm pack` 得到 tarball：
   ```bash
   npm publish
   # 或者只生成一个可分发文件
   npm pack
   ```
2. 打开 DSH 侧边栏的 **插件** 页面。
3. 点击 **Add plugin** → **Install a third-party plugin**。
4. 输入以下任意一种：
   - npm 包名：`dsh-git-explorer`
   - 绝对路径：`/Users/lch/mine/dsh-plugin/dsh-git-plugin`
   - tarball：`/Users/lch/mine/dsh-plugin/dsh-git-plugin/dsh-git-explorer-0.1.0.tgz`
5. 点击 **Install**，完成后点 **Enable now**。

Host 代码只在 DSH 启动时装载；没有 HMR 的 profile 会提示重启，重启一次即可。之后所有会话都会自动出现侧边栏 Git tab 和会话顶部 Git tab，不需要任何 YAML 编辑。

### 方式二：CLI 安装本地目录

```bash
dsh plugin --profile desktop add /absolute/path/to/dsh-git-plugin
```

然后在插件页把 `dsh-git-explorer` 打开。`dsh plugin add` 只负责安装依赖；把它选入 `dsh.profile.bundles` 由插件页的开关完成，因此仍然不需要手写 YAML。

### 开发时直接挂载单文件（仅限调试）

不建议分发给用户。它绕过 bundle 机制，只能在本机使用：

```yaml
- insert:
    - id: dsh-git-explorer
      name: '/absolute/path/to/dsh-git-plugin/index.js'
```

### 如果改名

包名同时出现在三个地方，改的时候必须一起改：

1. `package.json` 的 `name`
2. `client.js` 里 `window.__ModuleLoader__.load({ id: ... })`
3. `cordis.patch.yml` 的 `name`

## 验证

Host 逻辑不依赖 DSH 运行时，可以直接对临时仓库做烟雾测试：

```bash
node scripts/smoke.mjs
```

它会创建临时仓库、提交、制造 staged/unstaged/untracked 改动、创建分支，然后验证：

- 仓库发现
- status 解析
- log / commit / branches / blame / files
- working / staged / untracked diff
- 远端 URL 归一化

界面已在 DSH Web profile 中做过端到端验证：会话顶部 Git tab、右侧边栏 tab、改动 diff、提交详情（含 3016 个文件的超大提交）、分支列表、blame 均能正常显示，控制台无插件相关报错。

## 与 GitLens 的关系

功能取舍参考了 GitLens 的常用工作流（Changes / Commits / Branches / Stashes / Compare / Blame、提交详情和行级归属），但代码完全独立实现：

- 没有复用 GitLens 的源码、WebView、消息协议或资源；
- 直接基于 DSH 的 Slot / Sidebar / View 扩展点与原生 Git CLI；
- 视觉沿用 DSH 主题 token，而不是复制 VS Code 主题。

## 已知限制

- 右侧边栏宽度较窄时，diff 会自动改为上下布局。
- 改动/历史列表未做虚拟滚动；超大提交的文件清单最多渲染前 500 行，剩余数量以提示文字标出。
- 不支持图形化 merge conflict 编辑、pull request、GitHub/GitLab API 集成和提交图车道绘制。
- 写操作只覆盖本插件白名单内的动作，不支持任意 `git` 命令。
