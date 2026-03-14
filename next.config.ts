import createSerwistPlugin from "@serwist/next";
import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

const withSerwist = createSerwistPlugin({
  swSrc: "src/app/sw.ts",
  swDest: "public/serwist/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  webpack(config: WebpackConfig) {
    // Suppress the known `browserslist` dynamic-require warning
    // that originates from @serwist/turbopack – it is harmless in webpack builds.
    config.module = config.module ?? {};
    config.module.exprContextCritical = false;
    return config;
  },
};

export default withSerwist(nextConfig);
