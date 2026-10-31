import type { MetadataRoute } from "next";

// A private app: no robot may crawl any of it
const robots = (): MetadataRoute.Robots => ({ rules: { userAgent: "*", disallow: "/" } });

export default robots;
