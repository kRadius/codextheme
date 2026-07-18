import catalog from "../../../../themes/catalog.json";

export type ThemeStatus = "available" | "coming-soon";

type CatalogTheme = {
  slug: string;
  status: ThemeStatus;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  series: string;
  tags: string[];
  accent: string;
  surface: string;
  author: string;
  compatibility: string;
  updatedAt: string;
  previewHome: string | null;
  previewSession: string | null;
  source: string | null;
  command: string | null;
};

export type Theme = Omit<CatalogTheme, "previewHome" | "previewSession"> & {
  homePreview: string | null;
  sessionPreview: string | null;
};

function publicPath(path: string | null) {
  return path ? `/${path}` : null;
}

export const themes: Theme[] = (catalog as CatalogTheme[]).map((theme) => ({
  ...theme,
  homePreview: publicPath(theme.previewHome),
  sessionPreview: publicPath(theme.previewSession),
}));

export const availableThemes = themes.filter((theme) => theme.status === "available");

export function findTheme(slug: string) {
  return themes.find((theme) => theme.slug === slug);
}
