import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
console.log(`isProd: ${isProd}`);

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
  experimental: {
    reactCompiler: isProd,
  },
} satisfies NextConfig;

export default nextConfig;
