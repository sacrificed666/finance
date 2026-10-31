const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// The security.txt of the site: where to report, until when and where it lives
export const securityTxt = (repository: string, base: URL, now: number): string =>
  [
    `Contact: ${repository}/security/advisories/new`,
    `Expires: ${new Date(now + YEAR_MS).toISOString()}`,
    "Preferred-Languages: en, uk",
    `Canonical: ${new URL("/.well-known/security.txt", base).href}`,
    `Policy: ${repository}/security/policy`,
    "",
  ].join("\n");
