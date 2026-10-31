import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.AW360_TEST_LAN_HOST ? [process.env.AW360_TEST_LAN_HOST] : [],

  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
