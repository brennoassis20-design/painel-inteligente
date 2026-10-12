# Painel Inteligente

Painel web em Next.js para criar produto completo, copy, pagina de vendas, arquivos ZIP e radar de oportunidades.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Validar antes do deploy

```bash
npm run lint
npm test
```

O teste roda `next build` e confirma que o projeto esta pronto para Vercel.

## Deploy na Vercel

1. Suba este projeto para um repositorio GitHub.
2. Na Vercel, clique em `Add New > Project`.
3. Importe o repositorio.
4. Use as configuracoes padrao:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Install Command: `npm install`
5. Adicione as variaveis de ambiente abaixo.
6. Clique em `Deploy`.

## Variaveis de ambiente

Configure na Vercel em `Project Settings > Environment Variables`:

```txt
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/auto
CAKTO_WEBHOOK_SECRET=
TREND_REFRESH_SECRET=
CRON_SECRET=
TREND_REFRESH_INTERVAL_DAYS=3
TREND_SOURCE_URL=
TREND_SOURCE_TOKEN=
```

Use o mesmo valor em `TREND_REFRESH_SECRET` e `CRON_SECRET`. A Vercel envia `CRON_SECRET` automaticamente no header `Authorization` quando executar o cron.

## Cron do radar

O arquivo `vercel.json` agenda a atualizacao do radar a cada 3 dias:

```json
{
  "crons": [
    {
      "path": "/api/trends/refresh",
      "schedule": "0 8 */3 * *"
    }
  ]
}
```

Na Vercel, crons rodam em UTC e apenas em deploys de producao.

## Observacoes

- Nao use prefixo `NEXT_PUBLIC_` em chaves secretas.
- Depois de alterar variaveis na Vercel, faca um novo deploy.
- O banco e a autenticacao continuam no Supabase.
