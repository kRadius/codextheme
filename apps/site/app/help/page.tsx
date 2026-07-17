import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "使用帮助", description: "CodexTheme 应用、重新应用和恢复说明。", alternates: { canonical: "/help" } };

export default function HelpPage() { return <div className="site-shell"><SiteHeader /><main className="subpage section-wrap"><article className="article-page"><Link className="back-link" href="/">← 返回首页</Link><p className="eyebrow"><span /> QUICK HELP</p><h1>使用帮助</h1><p className="article-lead">首发版刻意只保留最短路径。遇到问题时，先确认 macOS、Node.js 22.4+ 和 Codex Desktop 都已就绪。</p>
  <section className="article-block"><h2>第一次应用</h2><p>进入任意主题详情页，只复制页面唯一的一条 apply 命令，在 Terminal 粘贴并回车。不要从聊天记录或第三方帖子复制被改写过的命令。</p></section>
  <section className="article-block"><h2>重开 Codex 后重新应用</h2><code className="inline-code">npx --yes @codextheme/cli@0.1.0 reapply</code><p>reapply 读取本地保存的主题 slug 和 CLI 内置主题包，不需要访问 codextheme.tech。</p></section>
  <section className="article-block"><h2>恢复官方外观</h2><code className="inline-code">npx --yes @codextheme/cli@0.1.0 restore</code><p>restore 可以重复运行。完整恢复或确认没有活动注入后，本地状态会被删除。</p></section>
  <section className="article-block"><h2>为什么会要求重新打开？</h2><p>有些主题同时调整 Codex 的基础外观配置。为了让 renderer 与基础外观一致，需要重新打开当前进程；CLI 不会替你做决定，只有输入 y 才执行。</p></section>
  <section className="article-block"><h2>仍然失败？</h2><p>不要使用 sudo，也不要修改 Codex 应用包。先运行 restore，再到公开 GitHub 仓库提交 issue，并只提供错误码与 Codex 版本；不要上传对话内容、token 或个人路径。</p></section>
  </article></main><SiteFooter /></div>; }
