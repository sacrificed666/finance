import { connection } from "next/server";

import { securityTxt } from "@/shared/lib/securityTxt";
import { SITE, siteUrl } from "@/shared/lib/site";

// The security contact of the site, valid for a year from the request
export const GET = async () => {
  await connection();
  return new Response(securityTxt(SITE.repository, siteUrl(), Date.now()), {
    headers: { "Cache-Control": "public, max-age=86400", "Content-Type": "text/plain; charset=utf-8" },
  });
};
