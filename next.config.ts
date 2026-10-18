import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Chromium do servidor vem compactado em node_modules/@sparticuz/chromium/bin; garante que vá junto na função.
  outputFileTracingIncludes: {
    "/api/generate/pdf": ["./node_modules/@sparticuz/chromium/bin/**", "./lib/pdf-fonts/**"],
  },
  // genio.brennolimaoficial.com abre direto na página de vendas do Método Gênio.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "genio.brennolimaoficial.com" }],
          destination: "/metodo-genio",
        },
      ],
    };
  },
};

export default nextConfig;
