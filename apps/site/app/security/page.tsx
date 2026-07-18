import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "安全边界", description: "CodexTheme 做什么、不做什么，以及如何恢复。", alternates: { canonical: "/security" } };

export default function SecurityPage() { return <div className="site-shell"><SiteHeader /><main className="subpage section-wrap"><article className="article-page"><Link className="back-link" href="/">← 返回首页</Link><p className="eyebrow"><span /> SECURITY MODEL</p><h1>安全边界</h1><p className="article-lead">复制命令前，你应该清楚它会做什么，也应该清楚它绝不会做什么。</p>
  <section className="article-block"><h2>不修改 Codex 安装包</h2><p>运行时通过绑定到 127.0.0.1 的 Chromium DevTools Protocol，把 CSS 注入当前 Codex renderer。不改写 .app、app.asar、官方代码签名，也不需要 sudo 或管理员权限。</p></section>
  <section className="article-block"><h2>主题是数据，不是程序</h2><p>当前可安装主题包只包含 JSON 声明、CSS 与内嵌 JPEG 图片。运行时拒绝远程 CSS 资源；主题包不能携带或执行 JavaScript。已发布主题字节直接打包在固定版本 CLI 中，reapply 不访问本网站。</p></section>
  <section className="article-block"><h2>不会静默重开 Codex</h2><p>如果 Codex 正在运行但需要重新打开，CLI 会提示未发送输入可能丢失。只有交互式终端中明确输入 y 才会继续；非交互环境默认取消。</p></section>
  <section className="article-block"><h2>固定版本与公开来源</h2><p>页面命令固定到 @codextheme/cli@0.1.0。源码公开，runtime 保留 CodeDrobe Core 0.3.0 的 Apache-2.0 许可、Git 历史、NOTICE 与精确来源记录。</p></section>
  <section className="article-block"><h2>恢复官方外观</h2><p>运行同一固定版本提供的 restore：</p><code className="inline-code">npx --yes @codextheme/cli@0.1.0 restore</code><p>恢复会处理当前 renderer 与 Codex 外观设置；如果只完成了部分恢复，活动状态会保留并返回明确错误。</p></section>
  <section className="article-block"><h2>独立项目</h2><p>CodexTheme 是独立开源项目，与 OpenAI 无隶属、合作或背书关系。Codex 是其各自权利人的产品和商标。</p></section>
  </article></main><SiteFooter /></div>; }
