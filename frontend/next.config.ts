import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  },
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" }
    ]
  }
};

export default nextConfig;
