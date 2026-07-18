import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const themeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(themeRoot, "..");
const publicRoot = process.env.CODEXTHEME_PREVIEW_ROOT
  ? path.resolve(process.env.CODEXTHEME_PREVIEW_ROOT)
  : path.join(repoRoot, "apps/site/public");
const catalog = JSON.parse(await fs.readFile(path.join(themeRoot, "catalog.json"), "utf8"));

const WIDTH = 1600;
const HEIGHT = 1000;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function navIcon(y, accent, kind = "line") {
  if (kind === "dot") {
    return `<circle cx="45" cy="${y - 5}" r="7" fill="${accent}" fill-opacity=".72"/>`;
  }
  return `<rect x="37" y="${y - 13}" width="16" height="16" rx="4" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity=".8"/>`;
}

function chrome(theme, body, backgroundData, mode) {
  const accent = theme.accent;
  const surface = theme.surface;
  const project = theme.name.replaceAll(" ", "-");
  const imageOpacity = mode === "home" ? ".88" : ".7";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#060708" stop-opacity=".76"/>
        <stop offset=".48" stop-color="${surface}" stop-opacity=".28"/>
        <stop offset="1" stop-color="#040506" stop-opacity=".72"/>
      </linearGradient>
      <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#08090a" stop-opacity=".98"/>
        <stop offset="1" stop-color="#090a0b" stop-opacity=".9"/>
      </linearGradient>
      <linearGradient id="composer" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="${surface}" stop-opacity=".96"/>
        <stop offset="1" stop-color="#0b0c0d" stop-opacity=".98"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="26" flood-color="#000" flood-opacity=".58"/>
      </filter>
      <filter id="soft"><feGaussianBlur stdDeviation="24"/></filter>
      <clipPath id="window"><rect x="18" y="18" width="1564" height="964" rx="24"/></clipPath>
    </defs>

    <rect width="1600" height="1000" fill="#08090b"/>
    <g clip-path="url(#window)">
      <image href="data:image/jpeg;base64,${backgroundData}" x="18" y="18" width="1564" height="964" preserveAspectRatio="xMidYMid slice" opacity="${imageOpacity}"/>
      <rect x="18" y="18" width="1564" height="964" fill="url(#shade)"/>
      <circle cx="1110" cy="330" r="340" fill="${accent}" fill-opacity=".08" filter="url(#soft)"/>

      <rect x="18" y="18" width="286" height="964" fill="url(#side)"/>
      <line x1="304" y1="18" x2="304" y2="982" stroke="#fff" stroke-opacity=".09"/>
      <rect x="304" y="18" width="1278" height="54" fill="#090a0b" fill-opacity=".7"/>
      <line x1="304" y1="72" x2="1582" y2="72" stroke="#fff" stroke-opacity=".08"/>

      <circle cx="47" cy="45" r="7" fill="#ff5f57"/>
      <circle cx="70" cy="45" r="7" fill="#febc2e"/>
      <circle cx="93" cy="45" r="7" fill="#28c840"/>

      <text x="38" y="113" fill="#f5f2eb" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="650">Codex</text>
      <path d="M104 105 l6 6 6-6" fill="none" stroke="#fff" stroke-opacity=".58" stroke-width="1.5"/>

      ${navIcon(160, accent)}<text x="70" y="160" fill="#eeeae2" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">New chat</text>
      ${navIcon(203, accent)}<text x="70" y="203" fill="#d9d5ce" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">Pull requests</text>
      ${navIcon(246, accent, "dot")}<text x="70" y="246" fill="#d9d5ce" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">Scheduled</text>
      ${navIcon(289, accent)}<text x="70" y="289" fill="#d9d5ce" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">Plugins</text>

      <text x="38" y="350" fill="#fff" fill-opacity=".46" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="13" letter-spacing="1.3">PROJECTS</text>
      <rect x="29" y="372" width="246" height="46" rx="11" fill="${accent}" fill-opacity=".12" stroke="${accent}" stroke-opacity=".44"/>
      <path d="M45 389 h10 l4 4 h14 v13 H45 Z" fill="none" stroke="${accent}" stroke-width="1.5"/>
      <text x="82" y="401" fill="#f2eee5" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="15">${escapeXml(project)}</text>

      <text x="38" y="472" fill="#fff" fill-opacity=".46" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="13" letter-spacing="1.3">CHATS</text>
      <text x="38" y="508" fill="#fff" fill-opacity=".35" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="15">Theme preview</text>
      <text x="38" y="544" fill="#fff" fill-opacity=".24" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="15">No private history</text>

      <line x1="36" y1="921" x2="277" y2="921" stroke="#fff" stroke-opacity=".1"/>
      <circle cx="48" cy="951" r="10" fill="none" stroke="${accent}" stroke-width="1.5"/>
      <text x="70" y="957" fill="#eeeae2" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="15">CodexTheme Studio</text>

      <text x="337" y="53" fill="#fff" fill-opacity=".46" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="12" letter-spacing="1.4">CODEX DESKTOP</text>
      <text x="1546" y="53" text-anchor="end" fill="${accent}" fill-opacity=".8" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="12" letter-spacing="1.2">${mode.toUpperCase()} PREVIEW</text>

      ${body}
    </g>
    <rect x="18.5" y="18.5" width="1563" height="963" rx="23.5" fill="none" stroke="${accent}" stroke-opacity=".34"/>
  </svg>`;
}

function homeBody(theme, manifest) {
  const accent = theme.accent;
  const cards = [
    ["Explore", "Understand a codebase"],
    ["Build", "Create a new feature"],
    ["Review", "Suggest focused changes"],
    ["Fix", "Resolve issues and failures"],
  ];
  const cardMarkup = cards.map(([title, subtitle], index) => {
    const x = 350 + index * 292;
    return `<g>
      <rect x="${x}" y="585" width="270" height="145" rx="16" fill="#0a0b0c" fill-opacity=".79" stroke="${accent}" stroke-opacity=".3" filter="url(#shadow)"/>
      <circle cx="${x + 38}" cy="625" r="18" fill="${accent}" fill-opacity=".13" stroke="${accent}" stroke-opacity=".55"/>
      <path d="M${x + 31} ${625} h14 M${x + 38} ${618} v14" stroke="${accent}" stroke-width="1.5"/>
      <text x="${x + 24}" y="674" fill="#f3efe7" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="17" font-weight="600">${title}</text>
      <text x="${x + 24}" y="701" fill="#fff" fill-opacity=".48" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="13">${subtitle}</text>
    </g>`;
  }).join("");

  return `<g>
    <text x="350" y="190" fill="${accent}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="13" letter-spacing="3">${escapeXml(manifest.copy.signature)}</text>
    <text x="350" y="254" fill="#f8f4ec" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="48" font-weight="680" letter-spacing="-.8">${escapeXml(theme.name)}</text>
    <text x="350" y="293" fill="#fff" fill-opacity=".68" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="19">${escapeXml(manifest.copy.tagline)}</text>
    <line x1="350" y1="328" x2="498" y2="328" stroke="${accent}" stroke-width="2" stroke-opacity=".72"/>
    ${cardMarkup}

    <rect x="424" y="792" width="1038" height="133" rx="20" fill="url(#composer)" stroke="${accent}" stroke-opacity=".46" filter="url(#shadow)"/>
    <text x="454" y="835" fill="#fff" fill-opacity=".43" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">Ask Codex to build, review, or explain...</text>
    <line x1="448" y1="864" x2="1438" y2="864" stroke="#fff" stroke-opacity=".08"/>
    <circle cx="461" cy="894" r="12" fill="none" stroke="${accent}" stroke-width="1.5"/>
    <path d="M455 894 h12 M461 888 v12" stroke="${accent}" stroke-width="1.5"/>
    <text x="489" y="900" fill="#fff" fill-opacity=".55" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="14">Local workspace</text>
    <circle cx="1419" cy="894" r="18" fill="${accent}" fill-opacity=".83"/>
    <path d="M1412 895 l7-7 7 7 M1419 888 v13" fill="none" stroke="#090a0b" stroke-width="2"/>
  </g>`;
}

function sessionBody(theme) {
  const accent = theme.accent;
  return `<g>
    <text x="350" y="126" fill="#f7f4ed" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="26" font-weight="650">Build a theme catalog</text>
    <text x="350" y="154" fill="#fff" fill-opacity=".42" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="13">Safe demonstration session · no user data</text>

    <rect x="760" y="205" width="672" height="82" rx="17" fill="${accent}" fill-opacity=".13" stroke="${accent}" stroke-opacity=".34"/>
    <text x="792" y="239" fill="#f4f0e8" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="15">Create a gallery that makes each Codex theme</text>
    <text x="792" y="263" fill="#f4f0e8" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="15">easy to compare and apply.</text>

    <circle cx="374" cy="354" r="18" fill="${accent}" fill-opacity=".16" stroke="${accent}" stroke-opacity=".6"/>
    <path d="M367 354 h14 M374 347 v14" stroke="${accent}" stroke-width="1.5"/>
    <text x="412" y="349" fill="#f5f1e9" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="600">Codex</text>
    <text x="412" y="379" fill="#fff" fill-opacity=".66" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="15">I’ll start with a clear theme card and a one-command install path.</text>

    <rect x="412" y="409" width="902" height="246" rx="14" fill="#070809" fill-opacity=".87" stroke="#fff" stroke-opacity=".12"/>
    <rect x="412" y="409" width="902" height="41" rx="14" fill="#fff" fill-opacity=".045"/>
    <circle cx="436" cy="430" r="4" fill="${accent}"/>
    <text x="451" y="435" fill="#fff" fill-opacity=".45" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12">theme-card.tsx</text>
    <text x="440" y="489" fill="${accent}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">export</text>
    <text x="498" y="489" fill="#f0ede6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">function ThemeCard({ theme }) {</text>
    <text x="470" y="525" fill="${accent}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">return</text>
    <text x="528" y="525" fill="#f0ede6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">(&lt;article data-theme={theme.slug}&gt;</text>
    <text x="500" y="561" fill="#f0ede6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">&lt;ThemePreview theme={theme} /&gt;</text>
    <text x="500" y="597" fill="#f0ede6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">&lt;InstallCommand theme={theme} /&gt;</text>
    <text x="470" y="633" fill="#f0ede6" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">);</text>

    <rect x="424" y="760" width="1038" height="165" rx="20" fill="url(#composer)" stroke="${accent}" stroke-opacity=".46" filter="url(#shadow)"/>
    <text x="454" y="805" fill="#fff" fill-opacity=".43" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="16">Continue the task...</text>
    <line x1="448" y1="846" x2="1438" y2="846" stroke="#fff" stroke-opacity=".08"/>
    <text x="454" y="892" fill="#fff" fill-opacity=".52" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="14">Custom</text>
    <text x="1360" y="892" text-anchor="end" fill="#fff" fill-opacity=".52" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="14">Codex</text>
    <circle cx="1419" cy="886" r="18" fill="${accent}" fill-opacity=".83"/>
    <path d="M1412 887 l7-7 7 7 M1419 880 v13" fill="none" stroke="#090a0b" stroke-width="2"/>
  </g>`;
}

for (const theme of catalog) {
  const manifestPath = path.join(themeRoot, theme.slug, "theme.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  for (const mode of ["home", "session"]) {
    const imageName = mode === "home" ? manifest.images.hero : manifest.images["session-bg"];
    const previewPath = mode === "home" ? theme.previewHome : theme.previewSession;
    const outputPath = path.join(publicRoot, previewPath);
    const background = await fs.readFile(path.join(themeRoot, theme.slug, imageName));
    const body = mode === "home" ? homeBody(theme, manifest) : sessionBody(theme);
    const svg = chrome(theme, body, background.toString("base64"), mode);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outputPath);
  }
}

console.log(`Generated ${catalog.length * 2} privacy-safe Codex theme previews at ${WIDTH}x${HEIGHT}.`);
