import Link from "next/link";
import { ThemeCard } from "./components/ThemeCard";
import { SiteFooter, SiteHeader, SUBMIT_THEME_URL } from "./components/SiteChrome";
import { availableThemes, themes } from "./lib/themes";

export default function Home() {
  const comingCount = themes.length - availableThemes.length;

  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <section className="repo-hero section-wrap">
          <div className="repo-hero-main">
            <p className="eyebrow"><span /> CODEX DESKTOP / THEME REPOSITORY</p>
            <h1>为 Codex 找一套新界面。</h1>
          </div>
          <div className="repo-hero-side">
            <p>浏览主题、查看真实效果，再复制一条固定版本命令。仓库结构已经就绪，内容会持续补齐。</p>
            <a className="primary-link" href="#themes">浏览全部主题 <span aria-hidden="true">↓</span></a>
          </div>
          <dl className="repo-stats" aria-label="主题仓库状态">
            <div><dt>{themes.length}</dt><dd>个主题槽位</dd></div>
            <div><dt>{availableThemes.length}</dt><dd>套已可安装</dd></div>
            <div><dt>{comingCount}</dt><dd>套正在制作</dd></div>
          </dl>
        </section>

        <section className="gallery-section section-wrap" id="themes">
          <header className="gallery-head">
            <div><p className="eyebrow"><span /> THEME GALLERY</p><h2>9 个主题槽位，<br />从真实效果开始补齐。</h2></div>
            <p>空白位置不会用壁纸或假界面代替。只有实际应用到 Codex 后的 Home 与 Session 截图，才会进入预览。</p>
          </header>
          <div className="theme-grid">
            {themes.map((theme, index) => <ThemeCard theme={theme} index={index} key={theme.slug} />)}
          </div>
        </section>

        <section className="install-strip section-wrap" aria-labelledby="install-title">
          <div className="install-title"><p className="eyebrow"><span /> SHORTEST PATH</p><h2 id="install-title">选中之后，30 秒装上。</h2></div>
          <ol>
            <li><b>01</b><span>查看真实 Home / Session</span></li>
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
