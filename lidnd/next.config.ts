import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com",
        pathname: "/*",
        port: "",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/*",
        port: "",
      },
    ],
    minimumCacheTTL: 2678400,
  },
  reactCompiler: true,
} satisfies NextConfig;

export default nextConfig;
