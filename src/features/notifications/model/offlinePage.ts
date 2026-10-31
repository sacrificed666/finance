import { createHash } from "node:crypto";

export interface OfflineColors {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
}

export interface OfflinePageContent {
  lang: string;
  name: string;
  title: string;
  message: string;
  retry: string;
  light: OfflineColors;
  dark: OfflineColors;
}

// Reloads the page as soon as the connection is back
const SCRIPT = 'addEventListener("online",()=>location.reload())';

// The CSP source that allows exactly this inline code
const hashOf = (code: string) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`;

// Text that is safe inside HTML
const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

// The custom properties of one appearance
const tokens = (colors: OfflineColors) =>
  [
    `--background:${colors.background}`,
    `--surface:${colors.surface}`,
    `--text:${colors.text}`,
    `--muted:${colors.muted}`,
    `--accent:${colors.accent}`,
    `--on-accent:${colors.onAccent}`,
  ].join(";");

// The styles of the page, light or dark like the system
const stylesOf = ({ light, dark }: OfflinePageContent) =>
  [
    `:root{color-scheme:light dark;${tokens(light)}}`,
    `@media (prefers-color-scheme:dark){:root{${tokens(dark)}}}`,
    "*{box-sizing:border-box}",
    "body{display:grid;min-height:100dvh;margin:0;padding:1rem;place-items:center;background:var(--background);" +
      "color:var(--text);font:1rem/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
    "main{width:100%;max-width:26rem;padding:2rem;border-radius:1.5rem;background:var(--surface);text-align:center}",
    "p{margin:0 0 1.5rem;color:var(--muted)}",
    ".name{margin:0;font-size:.875rem;font-weight:600}",
    "h1{margin:.5rem 0;font-size:1.5rem;line-height:1.2;text-wrap:balance}",
    "a{display:inline-block;padding:.75rem 1.5rem;border-radius:999px;background:var(--accent);" +
      "color:var(--on-accent);font-weight:600;text-decoration:none}",
    "a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}",
  ].join("");

// A page that needs no other request, for the service worker, and its CSP
export const offlinePage = (content: OfflinePageContent) => {
  const styles = stylesOf(content);
  const html = [
    "<!doctype html>",
    `<html lang="${escapeHtml(content.lang)}">`,
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex">',
    `<title>${escapeHtml(content.title)} · ${escapeHtml(content.name)}</title>`,
    `<style>${styles}</style></head>`,
    `<body><main><p class="name">${escapeHtml(content.name)}</p><h1>${escapeHtml(content.title)}</h1>`,
    `<p>${escapeHtml(content.message)}</p><a href="">${escapeHtml(content.retry)}</a></main>`,
    `<script>${SCRIPT}</script></body></html>`,
  ].join("");
  const policy = [
    "default-src 'none'",
    `style-src ${hashOf(styles)}`,
    `script-src ${hashOf(SCRIPT)}`,
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  return { html, policy };
};
