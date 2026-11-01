#!/bin/zsh
# Publica "Sugerir melhoria" (01/11/2026).
# ANTES: rodar no SQL Editor do Supabase o trecho "Sugestões de melhoria dos alunos" do fim de supabase/schema.sql.
set -e
cd "$(dirname "$0")"
git add app lib supabase/schema.sql sugestoes.sh publicar-sugestoes.sh
git commit -m "Sugerir melhoria: aba na gaveta do sino e atalho no menu, ate 5 por mes por aluno; sugestoes.sh para avaliar"
git push origin main
echo "Push feito. Esperando a Vercel publicar..."
for i in {1..40}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" https://painelinteligente.bagencymidia.site/api/suggestions)
  [ "$code" = "401" ] && break
  sleep 15
done
./novidade.sh melhoria "Agora você pode sugerir melhorias" "No sino (ou em Aprender → Sugerir melhoria), conte sua ideia para o painel. Até 5 por mês. As que fizerem sentido entram em construção." inicio
echo "Pronto."
