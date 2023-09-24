/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com",
        pathname: "/*",
        port: "",
      },
    ],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
