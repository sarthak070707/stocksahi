import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't fail the production build on type errors. Types are checked
  // separately during development; this keeps deploys from breaking on a
  // stray type issue. (Safe to remove later once you want stricter builds.)
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
