import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || "" },
  allowedDevOrigins: process.env.AW360_TEST_LAN_HOST ? [process.env.AW360_TEST_LAN_HOST] : [],

  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
