import type { NextConfig } from "next";

const nextConfig = {
  images: {
    qualities: [75, 100],
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
      // Dev/test mode: images served from the local MinIO container.
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
    ],
    minimumCacheTTL: 2678400,
    // The MinIO container above is reached over localhost, which Next.js's
    // image optimizer otherwise refuses as a private IP (SSRF guard). Only
    // needed in dev/test mode - real deployments serve images from AWS S3.
    dangerouslyAllowLocalIP: process.env.DEV_LOGIN_ENABLED === "true",
  },
  reactCompiler: true,
  // Re-exposes these to the client bundle under their original (non
  // NEXT_PUBLIC_) names, since utils/images.ts is imported from client
  // components. Only the endpoint URL and bucket name are exposed here -
  // never the AWS credentials.
  env: {
    AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL,
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
  },
} satisfies NextConfig;

export default nextConfig;
