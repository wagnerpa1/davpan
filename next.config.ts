import createSerwistPlugin from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = createSerwistPlugin({
  swSrc: "src/app/sw.ts",
  swDest: "public/serwist/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withSerwist(nextConfig);
