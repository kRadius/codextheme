# codextheme.tech 48 小时流量 MVP 设计

## 1. 决策摘要

首发目标不是建设完整主题平台，而是在热点窗口内跑通一个可信、可分享、可恢复的真实闭环：

```text
主题页预览 → 复制固定版本命令 → Terminal 粘贴回车 → 应用主题 → 可重应用或恢复
```

唯一首发命令形态：

```bash
npx --yes @codextheme/cli@0.1.0 apply <theme-slug>
```

V1 只支持 macOS Codex Desktop、三套原创精选主题和 Node.js 22.4+。首发不做用户上传、AI 生图、账号、数据库、对象存储、签名 descriptor、主题市场、Windows 或常驻助手。

底层执行能力从 CodeDrobe Core 0.3.0 的 Apache-2.0 源码派生，但由本项目公开维护、构建和发布为 `@codextheme/runtime`。用户执行链不依赖 `@codedrobe/core` 的 npm 包。

## 2. 成功标准

48 小时 MVP 只有以下硬门槛：

1. `https://codextheme.tech` 至少提供首页和三个可索引主题详情页。
2. 每个详情页只有一个主 CTA：`复制应用命令`。
3. 全新环境可通过固定版本 `npx` 命令运行，不要求 Skill、全局 CLI、`.pkg`、`curl | bash` 或管理员权限。
4. `apply` 能在真实 Codex 上应用所选主题，并验证 CodeDrobe 返回的结果。
5. 当 Codex 必须重开时，CLI 明确询问；只有输入 `y` 才允许重开。
6. `reapply` 能从本地状态重新应用最后一个主题。
7. `restore` 能恢复官方外观并清理活动状态。
8. runtime、CLI、主题源码、LICENSE、NOTICE 和修改来源公开可审计。
9. 三套主题不使用动漫、名人、商标或下载的第三方素材。
10. 在一台真实 macOS 机器完成 closed/apply、restart consent、reapply 和 restore 冒烟测试。

## 3. 首发范围

### 3.1 包含

- 公开 GitHub 仓库 `kRadius/codextheme`。
- 公开 npm 包 `@codextheme/runtime@0.1.0`。
- 公开 npm 包 `@codextheme/cli@0.1.0`。
- 三个固定主题 slug：
  - `midnight-circuit`
  - `crimson-eclipse`
  - `aurora-glass`
- 静态首页、主题详情页、安全页和帮助页。
- 固定命令复制、复制成功反馈和 Terminal 下一步提示。
- `apply`、`reapply`、`restore`、`--version`、`--help`。
- 当前进程生效边界与 Node.js 前提的公开说明。
- 最小单元测试、打包检查、静态站构建检查和真实 Codex 冒烟测试。

### 3.2 明确不包含

- 用户上传图片或服务端图片处理。
- R2、数据库、签名 token、descriptor API、遥测 API。
- 在线主题下载协议；主题随 CLI npm tarball 一起发布。
- Windows、WorkBuddy 或其他 Electron 应用入口。
- `doctor`、后台助手、LaunchAgent、自动重应用。
- 自动追踪上游、自动合并上游 commit 或运行上游 update notifier。
- 收费、账号、公开投稿、审核和作者主页。

这些能力只能在首发闭环稳定后按真实数据进入后续版本。

## 4. 仓库与许可证策略

公开仓库采用单仓库结构：

```text
codextheme/
├── apps/site/                 # 零运行时依赖的静态站生成器与页面资源
├── packages/runtime/          # CodeDrobe Core 派生源码
├── packages/cli/              # 用户执行入口和内置主题
├── themes/                    # 三套主题源码、背景和元数据
├── docs/
├── LICENSE
├── NOTICE
├── UPSTREAM.md
└── package.json
```

派生流程必须保留 CodeDrobe Core 的 Git 历史，而不是复制一份失去来源的目录：

1. 将 `https://github.com/CodeDrobe/core.git` 添加为只读 `upstream` remote。
2. 从已核对的 0.3.0 commit 建立本项目历史基线。
3. 用一次可审查的机械提交移动到 `packages/runtime` 并改名为 `@codextheme/runtime`。
4. 保留 Apache-2.0 LICENSE、原 NOTICE，并在 `UPSTREAM.md` 记录来源 commit、导入日期和修改范围。
5. 新增项目版权说明不得覆盖或暗示移除原版权。
6. `CodeDrobe` 名称只出现在来源和许可说明中；产品、包名和 UI 使用 `codextheme`。
7. 上游更新只允许人工审查后选择性移植，不配置自动 merge、Dependabot source replacement 或 update notifier。

首发不进行大规模内部重构。先用测试锁定行为，再按模块逐步替换 `theme package → Codex adapter → CDP lifecycle → restore`。任何重构都不得改变许可证对历史派生代码的要求。

## 5. 运行架构

### 5.1 静态网站

网站不使用数据库或服务端运行时。`apps/site/scripts/build.mjs` 读取 `themes/catalog.json`，生成：

```text
dist/index.html
dist/themes/<slug>/index.html
dist/security/index.html
dist/help/index.html
dist/assets/*
dist/robots.txt
dist/sitemap.xml
```

首页展示三张主题卡。主题页展示 Home 与 Session 两个界面预览、主题特征、安全披露和唯一复制按钮。所有页面使用原生 HTML/CSS/少量 JavaScript；复制脚本只调用 Clipboard API，不加载远程脚本，不接收服务端命令。

网站首发通过 Sites 部署；源码状态必须先提交并推送，再保存和部署对应 commit。部署后绑定 `codextheme.tech`，由域名控制台设置工具返回的验证与路由记录。

### 5.2 CLI 与内置主题

`@codextheme/cli` tarball 内含：

- 单一 CLI 入口。
- 三个 `.codedrobe-theme` 文件。
- 运行所需的 `@codextheme/runtime` 精确依赖或构建产物。
- LICENSE、NOTICE、README。

首发选择把主题放进 npm tarball，而不是在线下载，原因是：

- 没有 R2、签名 URL、descriptor 或网络重定向攻击面。
- 固定版本命令对应固定代码和固定主题字节。
- `reapply` 不依赖网站在线。
- 三套压缩背景的体积可接受。

新增或更新主题必须发布新的 CLI 版本；已发布版本的字节不得覆盖。

### 5.3 apply 流程

```text
解析 slug
  → 读取内置主题包
  → runtime read/lint/resolve
  → 检测 Codex 进程与 CDP target
  → 必要时请求 y/N 重开同意
  → runtime apply/verify/rollback
  → 成功后原子写入本地状态
```

本地状态只保存：

```json
{
  "schemaVersion": 1,
  "themeSlug": "midnight-circuit",
  "appliedAt": "ISO-8601"
}
```

不保存 token、URL、Codex 页面内容、用户名、PID 或绝对 Codex 路径。

### 5.4 reapply 与 restore

`reapply` 读取活动状态并调用与 `apply` 相同的本地主题生命周期，不访问网络。

`restore` 通过 runtime 的恢复 API 处理 renderer 和 Codex 外观设置。只有恢复成功或确认不存在活动注入时才删除状态；部分失败保留状态并返回稳定错误码。

## 6. 用户体验

主题页相邻展示以下披露：

```text
需要 macOS 与 Node.js 22.4+ · 无需管理员权限 · 不修改 Codex 安装包
主题随当前 Codex 进程生效；重开后运行 reapply。需要重开时会先征求确认。
```

复制按钮生成的命令只能来自固定版本和 catalog slug：

```bash
npx --yes @codextheme/cli@0.1.0 apply midnight-circuit
```

页面不得出现第二种安装方法、`.pkg`、Skill 安装、全局安装或未经版本固定的 `latest` 命令。

CLI 成功输出必须给出下一步：

```text
✓ Midnight Circuit 主题已应用并通过验证
重开 Codex 后运行：npx --yes @codextheme/cli@0.1.0 reapply
恢复官方外观：npx --yes @codextheme/cli@0.1.0 restore
```

## 7. 错误与安全边界

CLI 使用稳定错误码：

- `E_USAGE`：参数或 slug 无效。
- `E_NODE_VERSION`：Node 低于 22.4。
- `E_PLATFORM`：不是 macOS。
- `E_CODEX_NOT_FOUND`：没有找到 Codex。
- `E_RESTART_REQUIRED`：需要重开但非 TTY 或用户未输入 `y`。
- `E_DOM_INCOMPATIBLE`：当前 Codex DOM 不满足主题要求。
- `E_CORE_VERIFY`：应用后验证失败；runtime 负责回滚。
- `E_RESTORE_FAILED`：无法完整恢复。

错误输出不得包含 stack、用户目录、PID、页面标题、URL、DOM 文本或主题包内部任意可执行内容。

不可削减的安全要求：

- 不使用 `sudo`。
- 不修改 `.app`、`app.asar` 或官方代码签名。
- CDP 只绑定 loopback。
- 主题包只包含声明、CSS 和本地图片，不包含远程资源或主题 JavaScript。
- 运行中的 Codex 不得静默退出或重开。
- npm 包不得包含 install/postinstall 生命周期脚本。

## 8. 测试与发布门槛

### 8.1 自动检查

- catalog slug、命令和页面 URL 一致。
- 三个主题包都能被 runtime read/lint。
- 未知 slug 返回 `E_USAGE` 且不调用 runtime。
- 需要重开时，拒绝或非 TTY 不调用 restart apply。
- apply 验证通过后才写状态。
- reapply 不访问网络。
- restore 成功后才删除状态。
- 静态构建生成三个主题页、sitemap、安全页和帮助页。
- 每个主题页只有一个 `复制应用命令` 按钮且命令固定为 0.1.0。
- npm tarball 不含 lifecycle script、私钥、用户路径或未批准文件。

### 8.2 真机冒烟

首发前在当前 macOS 机器执行：

1. Codex 完全关闭时运行精选主题命令，确认启动和应用成功。
2. Codex 正常运行但未开启目标 CDP 时运行，输入 `N`，确认无重启、无状态写入。
3. 重试并输入 `y`，确认只重开一次且应用成功。
4. 关闭并重开 Codex，运行 `reapply`，确认离线可恢复主题。
5. 连续运行两次 `restore`，确认官方外观与幂等行为。

任一步失败，网站可以继续部署为预览，但不得公开宣称命令可用，也不得发布 0.1.0 npm 包。

## 9. 24–48 小时顺序

### 首夜

1. 建立公开派生历史和许可证文件。
2. 改名并验证 `@codextheme/runtime`。
3. 生成三套原创主题并通过 read/lint。
4. 实现 `@codextheme/cli` 的 apply/reapply/restore。
5. 实现并本地预览静态站。

### 次日

1. 完成真实 Codex 冒烟并修复阻断问题。
2. 检查 npm tarball，发布 runtime 和 CLI 0.1.0。
3. 推送公开源码并部署 Sites。
4. 绑定 `codextheme.tech`。
5. 公布一个主题页，观察首批失败反馈后再扩散其他页面。

## 10. 后续演进触发

只有满足以下任一条件才进入完整平台方案：

- 精选主题命令累计成功应用达到 50 次。
- 用户明确请求上传自定义图片达到 10 人。
- 新主题发布频率让“主题跟随 CLI 发布”成为主要瓶颈。

达到触发条件后，再引入签名 descriptor、R2、上传、独立主题发布和更细遥测。当前文档替代此前 9–12 天计划作为首发执行基线；长计划保留为后续加固参考，不再阻挡上线。
