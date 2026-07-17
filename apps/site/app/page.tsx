import Link from "next/link";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import { themes } from "./lib/themes";

export default function Home() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <section className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow"><span /> CODEX DESKTOP · MACOS</p>
            <h1>给 Codex 换一套，<br />今晚就能用的界面。</h1>
            <p className="hero-lead">
              选主题，复制一条固定版本命令，粘贴到 Terminal。无需下载插件，不修改 Codex 安装包，随时恢复。
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#themes">挑一套主题 <span aria-hidden="true">↓</span></a>
              <Link className="text-link" href="/security">先看安全边界</Link>
            </div>
            <ul className="trust-pills" aria-label="产品特性">
              <li>固定版本</li><li>源码公开</li><li>可一键恢复</li>
            </ul>
          </div>
          <div className="hero-stage" aria-label="CodexTheme 界面效果示意">
            <div className="stage-glow" />
            <div className="app-window">
              <div className="window-bar"><i /><i /><i /><span>codextheme / midnight-circuit</span></div>
              <div className="window-body">
                <aside><b>CT</b><span /><span /><span /><span /></aside>
                <div className="window-main">
                  <div className="window-orbit"><i /><i /><i /></div>
                  <p>What are we building tonight?</p>
                  <div className="composer-mock"><span>Ask Codex anything</span><b>↗</b></div>
                </div>
              </div>
            </div>
            <span className="float-label label-one">01 / CURATED</span>
            <span className="float-label label-two">ONE COMMAND</span>
          </div>
        </section>

        <section className="themes-section section-wrap" id="themes">
          <div className="section-heading">
            <div><p className="eyebrow"><span /> LAUNCH COLLECTION</p><h2>首发三套，只选完成度高的。</h2></div>
            <p>每套都同时覆盖首页区域与对话 Session 背景，文字和输入区域保持可读。</p>
          </div>
          <div className="theme-grid">
            {themes.map((theme, index) => (
              <Link className="theme-card" href={`/themes/${theme.slug}`} key={theme.slug} style={{ "--accent": theme.accent } as React.CSSProperties}>
                <div className="theme-art" style={{ backgroundImage: `url(${theme.hero})` }}>
                  <span className="theme-number">0{index + 1}</span>
                  <span className="theme-open">查看主题 ↗</span>
                  <div className="mini-shell"><i /><i /><b /></div>
                </div>
                <div className="theme-card-copy">
                  <div><h3>{theme.nameZh}</h3><p>{theme.name}</p></div>
                  <span className="color-chip"><i /> {theme.accent.toUpperCase()}</span>
                </div>
                <p className="theme-description">{theme.descriptionZh}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="steps-section section-wrap">
          <div className="section-heading compact">
            <div><p className="eyebrow"><span /> HOW IT WORKS</p><h2>三步，30 秒开始。</h2></div>
          </div>
          <ol className="steps-grid">
            <li><b>01</b><h3>选主题</h3><p>看 Home 和 Session 两种预览，挑你真正想长期用的一套。</p></li>
            <li><b>02</b><h3>复制命令</h3><p>详情页只有一个主操作，命令固定到准确的 0.1.0 版本。</p></li>
            <li><b>03</b><h3>粘贴运行</h3><p>在 Terminal 粘贴并回车；若需重开 Codex，会先向你确认。</p></li>
          </ol>
        </section>

        <section className="trust-section section-wrap">
          <div className="trust-statement">
            <p className="eyebrow"><span /> TRUST BY DEFAULT</p>
            <h2>命令短，<br />安全说明不能短。</h2>
          </div>
          <div className="trust-facts">
            <article><span>01</span><div><h3>不碰 Codex 安装包</h3><p>通过本机回环地址注入 CSS，不修改 .app、app.asar 或官方签名。</p></div></article>
            <article><span>02</span><div><h3>主题不执行 JavaScript</h3><p>主题包只包含声明、CSS 和本地图片；不从网站动态下载主题。</p></div></article>
            <article><span>03</span><div><h3>恢复路径永远可见</h3><p>同一个固定版本 CLI 提供 restore；源码、来源记录和 Apache-2.0 许可公开。</p></div></article>
            <Link className="secondary-link" href="/security">查看完整安全边界 →</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
