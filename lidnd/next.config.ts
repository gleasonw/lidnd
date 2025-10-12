import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

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
  },
  reactCompiler: true,
} satisfies NextConfig;

export default nextConfig;
