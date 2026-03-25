import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@neutrino/ui", "@neutrino/contracts"]
};

export default nextConfig;
