import * as flags from "country-flag-icons/string/3x2";

const flagSvgs: Readonly<Record<string, string | undefined>> = flags;

export const dynamicParams = false;

// Prerenders a flag for every known country code
export const generateStaticParams = () => Object.keys(flagSvgs).map((code) => ({ code }));

// Serves a flag as SVG from the app itself
export const GET = async (_request: Request, { params }: RouteContext<"/flags/[code]">) => {
  const svg = flagSvgs[(await params).code];
  if (!svg) return new Response(null, { status: 404 });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8" } });
};
