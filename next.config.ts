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
        {
          source: "/vsl",
          has: [{ type: "host", value: "genio.brennolimaoficial.com" }],
          destination: "/metodo-genio/vsl",
        },
        // membros.bagencymidia.site abre a área de membros (Gênio Play).
        {
          source: "/",
          has: [{ type: "host", value: "membros.bagencymidia.site" }],
          destination: "/membros",
        },
        {
          source: "/admin",
          has: [{ type: "host", value: "membros.bagencymidia.site" }],
          destination: "/membros/admin",
        },
        // Link do cadastro grátis (anúncios, bio, WhatsApp): abre direto na tela de criar acesso.
        {
          source: "/gratis",
          has: [{ type: "host", value: "membros.bagencymidia.site" }],
          destination: "/membros",
        },
      ],
    };
  },
};

export default nextConfig;
