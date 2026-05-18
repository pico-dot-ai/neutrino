import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost"],
  transpilePackages: [
    "@neutrino/ui",
    "@neutrino/ports",
    "@neutrino/schema",
    "@neutrino/identity-gateway"
  ]
};

export default nextConfig;
