import packageJson from "../../../package.json" with { type: "json" };

export const SITE = {
  author: { name: "Illia Movchko", url: "https://github.com/sacrificed666" },
  repository: "https://github.com/sacrificed666/finance",
  version: packageJson.version,
  changelog: "https://github.com/sacrificed666/finance/blob/main/CHANGELOG.md",
  themeColor: { light: "#f3f3ef", dark: "#09090b" },
} as const;

type Environment = Readonly<Partial<Record<string, string>>>;

// The address the app is served from: AUTH_URL, or localhost for development
export const siteUrl = (env: Environment = process.env): URL => {
  const configured = env.AUTH_URL?.trim() ?? "";
  if (configured !== "") return new URL(configured);
  return new URL(`http://localhost:${env.PORT ?? "3000"}`);
};
