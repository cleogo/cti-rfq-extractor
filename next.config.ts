import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  serverExternalPackages: ['xlsx'],
};

export default nextConfig;
