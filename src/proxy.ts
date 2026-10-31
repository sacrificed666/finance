import { type NextRequest, NextResponse } from "next/server";

import { contentSecurityPolicy } from "@/shared/lib/contentSecurityPolicy";

// The pages anyone may open
const PUBLIC = new Set(["/login", "/register"]);

// The names one computer answers to, which keep their cookies apart
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

// The address AUTH_URL gives, when a request came to this computer by another name
const ownAddress = (request: NextRequest): URL | null => {
  const configured = process.env.AUTH_URL;
  if (!configured || !URL.canParse(configured)) return null;
  const own = new URL(configured);
  const asked = new URL(`http://${request.headers.get("host") ?? request.nextUrl.host}`);
  if (asked.host === own.host || asked.port !== own.port) return null;
  if (!LOOPBACK.has(asked.hostname) || !LOOPBACK.has(own.hostname)) return null;
  return new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, own.origin);
};

// Whether a session cookie came; the pages still check the session itself
const hasSessionCookie = (request: NextRequest) =>
  request.cookies.getAll().some((cookie) => cookie.name.endsWith("authjs.session-token") && cookie.value.length > 0);

// A redirect to the sign-in page that comes back to the page asked for
const toSignIn = (request: NextRequest) => {
  const { pathname, search } = request.nextUrl;
  const url = new URL("/login", request.nextUrl);
  if (pathname !== "/" || search !== "") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
};

// Passes a fresh CSP nonce to the page
const render = (request: NextRequest) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
};

// Keeps one address for the session, sends visitors to sign in, secures every page
export const proxy = (request: NextRequest) => {
  const own = ownAddress(request);
  if (own) return NextResponse.redirect(own);
  return hasSessionCookie(request) || PUBLIC.has(request.nextUrl.pathname) ? render(request) : toSignIn(request);
};

export const config = {
  matcher: [
    {
      source:
        "/((?!(?:api|_next/static|_next/image|icons|flags|brands|games|healthz|offline|\\.well-known)(?:/|$)|(?:favicon\\.ico|icon\\.svg|apple-icon\\.png|manifest\\.webmanifest|robots\\.txt|sw\\.js)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
