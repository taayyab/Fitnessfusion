import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    unstablePersistentCaching: false,
  },
};

export default nextConfig;
