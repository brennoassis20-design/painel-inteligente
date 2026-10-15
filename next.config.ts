import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Chromium do servidor vem compactado em node_modules/@sparticuz/chromium/bin; garante que vá junto na função.
  outputFileTracingIncludes: {
    "/api/generate/pdf": ["./node_modules/@sparticuz/chromium/bin/**", "./lib/pdf-fonts/**"],
  },
};

export default nextConfig;
