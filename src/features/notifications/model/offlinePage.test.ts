import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { offlinePage } from "./offlinePage";

const colors = {
  background: "#eee",
  surface: "#fff",
  text: "#111",
  muted: "#444",
  accent: "#06c",
  onAccent: "#fff",
};

const content = {
  lang: "uk",
  name: "App",
  title: "Немає зв'язку",
  message: "Ви офлайн <b>зараз</b> & потім",
  retry: "Спробувати ще раз",
  light: colors,
  dark: { ...colors, background: "#000" },
};

// The SHA-256 source of an inline block of the page
const sourceOf = (html: string, tag: "style" | "script") => {
  const code = new RegExp(`<${tag}>(.*?)</${tag}>`, "su").exec(html)?.[1] ?? "";
  return `'sha256-${createHash("sha256").update(code).digest("base64")}'`;
};

describe("offlinePage", () => {
  it("writes the texts in the language of the page, escaped", () => {
    const { html } = offlinePage(content);
    expect(html).toMatch(/^<!doctype html><html lang="uk">/u);
    expect(html).toContain("<title>Немає зв'язку · App</title>");
    expect(html).toContain("<p>Ви офлайн &lt;b&gt;зараз&lt;/b&gt; &amp; потім</p>");
    expect(html).toContain('<a href="">Спробувати ще раз</a>');
    expect(html).toContain("@media (prefers-color-scheme:dark){:root{--background:#000;");
  });

  it("allows exactly its own style and script and nothing else", () => {
    const { html, policy } = offlinePage(content);
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain(`style-src ${sourceOf(html, "style")}`);
    expect(policy).toContain(`script-src ${sourceOf(html, "script")}`);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(html).not.toMatch(/(?:src|href)="[^"]/u);
  });
});
