#!/bin/bash
# Publica o backend do Pocket Portuguese. RODAR NO TERMINAL pelo Brenno, e só depois de:
#   1) aplicar supabase/migrations/20261126_pocket_portuguese.sql no SQL Editor do Supabase;
#   2) cadastrar as variáveis de ambiente novas no servidor (ver "Backend - como publicar.md").
# O que faz: testa, empurra o ramo pocket-portuguese e imprime os próximos passos. NÃO mexe no ramo maquina-de-videos.
set -euo pipefail
cd "$(dirname "$0")"

echo "== Testes =="
node --test --experimental-strip-types tests/pocket-portuguese.test.mjs tests/membros-valor.test.mjs tests/chama-acesa.test.mjs tests/isolamento.test.mjs
npx tsc --noEmit

echo
echo "== Ramo =="
git status --short
read -r -p "Enviar o ramo pocket-portuguese para o GitHub? (digite SIM) " ok
[ "$ok" = "SIM" ] || { echo "Cancelado."; exit 1; }
git push -u origin pocket-portuguese

echo
echo "Ramo enviado. Falta: fazer o deploy deste ramo do mesmo jeito que o Chama Acesa foi publicado (Coolify/VPS),"
echo "colocar as variáveis novas, e cadastrar o webhook na Cakto:"
echo "  https://<dominio-do-painel>/api/webhooks/membros/cakto?secret=<webhook_secret da área pocket-portuguese>"
echo "(o secret aparece na consulta final da migration)."
