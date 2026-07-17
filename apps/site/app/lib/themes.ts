export type Theme = {
  slug: string;
  name: string;
  nameZh: string;
  descriptionZh: string;
  accent: string;
  surface: string;
  hero: string;
  session: string;
  command: string;
};

export const themes: Theme[] = [
  {
    slug: "midnight-circuit", name: "Midnight Circuit", nameZh: "午夜回路",
    descriptionZh: "深石墨工作区里悬浮着电紫色数字回路。",
    accent: "#9b7bff", surface: "#10111a",
    hero: "/themes/midnight-circuit/hero.jpg", session: "/themes/midnight-circuit/session.jpg",
    command: "npx --yes @codextheme/cli@0.1.0 apply midnight-circuit",
  },
  {
    slug: "crimson-eclipse", name: "Crimson Eclipse", nameZh: "绯红蚀影",
    descriptionZh: "克制的红色日蚀划过近黑色编辑空间。",
    accent: "#ff526a", surface: "#120d12",
    hero: "/themes/crimson-eclipse/hero.jpg", session: "/themes/crimson-eclipse/session.jpg",
    command: "npx --yes @codextheme/cli@0.1.0 apply crimson-eclipse",
  },
  {
    slug: "aurora-glass", name: "Aurora Glass", nameZh: "极光玻璃",
    descriptionZh: "冷青极光在沉静的半透明工作界面后流动。",
    accent: "#55e5d7", surface: "#0b1518",
    hero: "/themes/aurora-glass/hero.jpg", session: "/themes/aurora-glass/session.jpg",
    command: "npx --yes @codextheme/cli@0.1.0 apply aurora-glass",
  },
];

export function findTheme(slug: string) { return themes.find((theme) => theme.slug === slug); }
