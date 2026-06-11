import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ldb-phinf.pstatic.net" },
      { protocol: "https", hostname: "search.pstatic.net" }
    ]
  }
};

export default nextConfig;
