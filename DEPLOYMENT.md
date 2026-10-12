# Painel Inteligente: deploy na Vercel

## Estrutura final

- App e rotas de API: Next.js.
- Hospedagem inicial: Vercel.
- Login, confirmacao de email, banco e RLS: Supabase.
- IA: chave do servidor, sem aparecer para o usuario.
- Pagamento: webhook da Cakto em `/api/webhooks/cakto`.
- Radar: cron da Vercel chamando `/api/trends/refresh`.
- Limites: 5 produtos por mes e 5 alteracoes de copy por produto.

## Validacao local

```bash
npm install
npm run lint
npm test
```

`npm test` executa `next build` e valida a preparacao para Vercel.

## Variaveis de ambiente na Vercel

Cadastrar em `Project Settings > Environment Variables`:

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

Use o mesmo valor em `TREND_REFRESH_SECRET` e `CRON_SECRET`.

## Deploy

1. Subir este projeto para GitHub.
2. Na Vercel, clicar em `Add New > Project`.
3. Importar o repositorio.
4. Manter framework `Next.js`.
5. Confirmar:
   - Install Command: `npm install`
   - Build Command: `npm run build`
6. Adicionar as variaveis de ambiente.
7. Fazer deploy.

## Webhook da Cakto

URL de producao:

```txt
https://seu-dominio.com/api/webhooks/cakto?secret=SEU_SEGREDO
```

Eventos previstos:

- Compra aprovada: libera acesso.
- Renovacao: mantem acesso ativo.
- Reembolso: bloqueia acesso.
- Chargeback: bloqueia acesso.
- Cancelamento/expiracao: bloqueia ou expira acesso.

## Checklist pos-deploy

- Testar login.
- Testar criacao de conta e confirmacao de email.
- Testar acesso bloqueado para usuario sem status ativo.
- Testar geracao de produto completo.
- Testar download do ZIP.
- Testar copy.
- Testar radar.
- Testar cron do radar.
- Depois conectar dominio proprio.
