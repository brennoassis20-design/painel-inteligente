import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Só em desenvolvimento: deixa abrir a bancada pelo IP da rede local (iPhone na mesma Wi-Fi). Não afeta produção.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // O Chromium do servidor vem compactado em node_modules/@sparticuz/chromium/bin; garante que vá junto na função.
  outputFileTracingIncludes: {
    "/api/generate/pdf": ["./node_modules/@sparticuz/chromium/bin/**", "./lib/pdf-fonts/**"],
    // Conteúdo dos 21 dias do Chama Acesa (lido do disco no servidor).
    "/api/membros/chama": ["./lib/chama-acesa/*.json"],
    "/api/chama-dev": ["./lib/chama-acesa/*.json"],
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
        // Áreas de produtores: membros.bagencymidia.site/<area>, /<area>/admin e /<area>/gratis.
        {
          source: "/:area([a-z0-9][a-z0-9-]{1,59})",
          has: [{ type: "host", value: "membros.bagencymidia.site" }],
          destination: "/membros/:area",
        },
        {
          source: "/:area([a-z0-9][a-z0-9-]{1,59})/:page(admin|gratis)",
          has: [{ type: "host", value: "membros.bagencymidia.site" }],
          destination: "/membros/:area/:page",
        },
      ],
    };
  },
};

export default nextConfig;
