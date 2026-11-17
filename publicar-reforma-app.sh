#!/bin/zsh
# Publica no Gênio Play: ícone de app por área (Reforma) + pop-up de ofertas sem desconto.
# ANTES: aplicar no Supabase a coluna mp_settings.offer_popup (fim de supabase/membros.sql).
# Rode no Terminal: zsh ~/Documents/painel-inteligente/publicar-reforma-app.sh
set -e
cd ~/Documents/painel-inteligente
antes=$(curl -s https://membros.bagencymidia.site/ | grep -oE '/_next/static/chunks/[^"]+\.js' | md5)
git fetch -q origin main
git checkout -q main
git merge -q --ff-only origin/main
git merge -q --no-edit reforma-app-popup
git push -q origin main
echo "Enviado para a Vercel. Esperando publicar..."
for i in {1..36}; do
  sleep 10
  agora=$(curl -s https://membros.bagencymidia.site/ | grep -oE '/_next/static/chunks/[^"]+\.js' | md5)
  if [[ -n "$agora" && "$agora" != "$antes" ]]; then
    echo "✅ No ar. Avise o Claude: \"publicou o app da reforma\"."
    exit 0
  fi
done
echo "⚠️ Ainda não mudou depois de 6 min. Copie tudo acima e mande para o Claude."
