// The outside services the browser may call
const CONNECT_SOURCES = ["'self'", "https://api.monobank.ua", "https://bank.gov.ua", "https://api.coingecko.com"];

// The CSP of a page with its nonce; development also allows eval and HMR
export const contentSecurityPolicy = (nonce: string, production: boolean): string => {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${CONNECT_SOURCES.join(" ")}${production ? "" : " ws: http://localhost:*"}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
};
