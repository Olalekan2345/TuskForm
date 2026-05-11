import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Load these via Node require at runtime instead of bundling them.
  // This prevents webpack from trying to inline the WASM file and failing.
  serverExternalPackages: ["@mysten/walrus", "@mysten/walrus-wasm"],
  // Explicitly include the WASM binary in each serverless function bundle
  // so Vercel's file tracer doesn't strip it from the deployment.
  outputFileTracingIncludes: {
    "/api/walrus/register": ["./node_modules/@mysten/walrus-wasm/**/*"],
    "/api/walrus/commit":   ["./node_modules/@mysten/walrus-wasm/**/*"],
  },
  outputFileTracingRoot: path.join(__dirname),
  webpack(config, { isServer }) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    // Browser bundles: polyfill Node built-ins that may appear as transitive deps
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          crypto: false,
          stream: false,
          buffer: false,
        },
      };
    }
    return config;
  },
};

export default nextConfig;
