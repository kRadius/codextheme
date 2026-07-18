import Image from "next/image";
import Link from "next/link";
import { ThemeCard } from "./components/ThemeCard";
import { SiteFooter, SiteHeader, SUBMIT_THEME_URL } from "./components/SiteChrome";
import { availableThemes } from "./lib/themes";

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CodexTheme",
  alternateName: "Codex Themes",
  url: "https://codextheme.tech/",
};

export default function Home() {
  const flagship = availableThemes[0];

  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <section className="flagship-hero section-wrap">
          <div className="flagship-copy">
            <p className="eyebrow"><span /> CODEX DESKTOP / THEME REPOSITORY</p>
            <h1>把 Codex 变成你的工作世界。</h1>
            <p className="flagship-lead">Codex 效果预览、原创完整场景、一条固定版本命令。先从三套哥特世界开始，随后持续增加新的主题选择。</p>
            <div className="flagship-actions">
              <Link className="primary-link" href={`/themes/${flagship.slug}`}>查看黑金圣堂 <span aria-hidden="true">→</span></Link>
              <a className="text-link" href="#themes">浏览全部主题 ↓</a>
            </div>
          </div>
          <Link className="flagship-capture" href={`/themes/${flagship.slug}`} aria-label="查看黑金圣堂主题">
            <div className="capture-label"><span>01 / GOTHIC WORLDS</span><b>Codex 效果预览</b></div>
            <Image src={flagship.homePreview ?? ""} alt="黑金圣堂 Codex Home 主题效果预览" fill priority sizes="(max-width: 720px) calc(100vw - 28px), (max-width: 1268px) calc(100vw - 48px), 1220px" />
            <div className="capture-caption"><span>Cathedral Nocturne</span><strong>黑金圣堂</strong></div>
          </Link>
        </section>

        <section className="gallery-section section-wrap" id="themes">
          <header className="gallery-head">
            <div><p className="eyebrow"><span /> THEME GALLERY</p><h2>三个完整世界，<br />不是三张换色壁纸。</h2></div>
            <p>每套主题都有独立场景、配色与 Home / Session 效果。这里会逐步成为持续增长的 Codex Desktop 主题仓库。</p>
          </header>
          <div className="theme-grid">
            {availableThemes.map((theme, index) => <ThemeCard theme={theme} index={index} key={theme.slug} />)}
          </div>
        </section>

        <section className="install-strip section-wrap" aria-labelledby="install-title">
          <div className="install-title"><p className="eyebrow"><span /> SHORTEST PATH</p><h2 id="install-title">选中之后，30 秒装上。</h2></div>
          <ol>
            <li><b>01</b><span>查看 Home / Session 预览</span></li>
            <li><b>02</b><span>复制固定版本命令</span></li>
            <li><b>03</b><span>在 Terminal 粘贴运行</span></li>
          </ol>
          <Link className="text-link" href="/help">查看安装与恢复说明 →</Link>
        </section>

        <section className="contribute section-wrap">
          <div><p className="eyebrow"><span /> COMMUNITY SUPPLY</p><h2>下一套主题，<br />也可以来自你。</h2></div>
          <div><p>先通过 GitHub 提交风格、素材来源和许可说明。暂时不建设账号、上传服务或审核后台。</p><a className="primary-link" href={SUBMIT_THEME_URL} rel="noreferrer">提交主题提案 <span aria-hidden="true">↗</span></a></div>
        </section>

        <section className="safety-line section-wrap">
          <span>固定版本</span><span>源码公开</span><span>不修改 Codex 安装包</span><span>可恢复官方外观</span><Link href="/security">完整安全边界 →</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
