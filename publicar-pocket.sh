#!/bin/zsh
# Publica o backend do Pocket Portuguese no painel-inteligente (Vercel publica sozinha quando o main recebe push).
# ANTES: SQL supabase/migrations/20261126_pocket_portuguese.sql aplicado no Supabase (o Claude aplica).
# Não mexe na pasta ~/Documents/painel-inteligente (ramo maquina-de-videos): tudo roda neste worktree.
set -e
cd ~/Documents/painel-pocket
BASE=https://membros.bagencymidia.site

[[ "$(git branch --show-current)" == "pocket-portuguese" ]] || { echo "⚠️ Este worktree não está no ramo pocket-portuguese. Avise o Claude."; exit 1; }
git checkout -q -- next-env.d.ts 2>/dev/null || true
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "⚠️ Há alterações não salvas. Mande para o Claude:"; git status --short --untracked-files=no; exit 1; }

echo "1/4 Juntando com o main atual..."
git fetch -q origin main
git merge -q --no-edit origin/main

echo "2/4 Testes..."
node --test --experimental-strip-types tests/pocket-portuguese.test.mjs || { echo "⚠️ Testes falharam. Nada foi publicado. Mande a saída para o Claude."; exit 1; }
npx tsc --noEmit || { echo "⚠️ Erro de tipos. Nada foi publicado. Mande a saída para o Claude."; exit 1; }

echo "3/4 Variáveis na Vercel..."
setenv() {
  vercel env rm "$1" production -y >/dev/null 2>&1 || true
  printf "%s" "$2" | vercel env add "$1" production >/dev/null && echo "   $1 = $2"
}
setenv PP_APP_URL "https://pocket.kitmundi.com/app/"
setenv PP_APP_ORIGIN "https://pocket.kitmundi.com"
setenv PP_EMAIL_RESPOSTA "support@kitmundi.com"

echo "4/4 Publicando (push no main)..."
antes_dep=$(vercel ls painel-inteligente --prod 2>/dev/null | grep -o 'https://painel-inteligente-[a-z0-9]*-b-agency.vercel.app' | head -1)
git push -q origin pocket-portuguese:main
git push -q -u origin pocket-portuguese 2>/dev/null || true
echo "Enviado para a Vercel. Esperando publicar..."
sleep 15
for i in {1..40}; do
  dep=$(vercel ls painel-inteligente --prod 2>/dev/null | grep -o 'https://painel-inteligente-[a-z0-9]*-b-agency.vercel.app' | head -1)
  [[ -z "$dep" || "$dep" == "$antes_dep" ]] && { sleep 10; continue; }
  st=$(vercel inspect "$dep" 2>&1 | grep -i 'status' | head -1)
  if echo "$st" | grep -qi 'ready'; then
    echo "   Vercel: Ready ($dep)"
    echo "   /api/pp/entitlements sem login (esperado 401): HTTP $(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/pp/entitlements")"
    echo "✅ Backend do Pocket no ar."
    exit 0
  fi
  if echo "$st" | grep -qi 'error\|canceled'; then
    echo "⚠️ A Vercel deu erro ($dep). Copie tudo e mande para o Claude."; exit 1
  fi
  sleep 10
done
echo "⚠️ A Vercel não ficou pronta em ~7 min. Copie tudo e mande para o Claude."
exit 1
