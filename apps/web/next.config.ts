import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@neutrino/ui",
    "@neutrino/contracts",
    "@neutrino/identity-gateway"
  ]
};

export default nextConfig;
