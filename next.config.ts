import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // A private app: search engines never index any of it
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ...(isDevelopment ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const imageHeaders = [
  { key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; sandbox" },
  { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" },
];

const nextConfig: NextConfig = {
  // Docker ships a self-contained server, see docker/Dockerfile
  output: "standalone",
  reactCompiler: true,
  poweredByHeader: false,
  agentRules: false,
  // The database driver stays a Node.js dependency instead of a bundle
  serverExternalPackages: ["pg"],
  experimental: {
    // Docker dev skips Turbopack's disk cache, which broke after a cut-off write
    turbopackFileSystemCacheForDev: process.env.TURBOPACK_DISK_CACHE !== "off",
  },
  async redirects() {
    return [{ source: "/balance", destination: "/accounts", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/flags/:path*", headers: imageHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
