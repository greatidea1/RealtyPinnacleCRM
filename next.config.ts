import type { NextConfig } from "next";

// Hardcode Indian Standard Time for server-side Date / Prisma day boundaries.
process.env.TZ = "Asia/Kolkata";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  serverExternalPackages: ["@aialok/lakhua", "h3-js"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
