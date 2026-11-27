#!/bin/zsh
# Publica o visual novo da área de membros (Gênio Play e todas as áreas): merge do ramo genio-visual no main + push (a Vercel publica sozinha).
# Não mexe no banco nem nas cores configuradas de cada área. Rode pelo atalho "Publicar Gênio Play.command" na Mesa.
set -e
W=~/Documents/painel-genio-visual          # cópia de trabalho do visual novo (ramo genio-visual)
P=~/Documents/painel-inteligente           # pasta ligada à Vercel (só para consultar o status)
BASE=https://membros.bagencymidia.site
cd "$W"
[[ "$(git branch --show-current)" == "genio-visual" ]] || { echo "⚠️ A cópia não está no ramo genio-visual. Nada foi publicado. Avise o Claude."; exit 1; }
git checkout -q -- next-env.d.ts 2>/dev/null || true
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "⚠️ Há alterações não salvas. Nada foi publicado. Mande para o Claude:"; git status --short --untracked-files=no; exit 1; }

echo "1/3 Testes completos (build + 160 testes)..."
npm test >/tmp/genio-visual-teste.log 2>&1 || { tail -30 /tmp/genio-visual-teste.log; echo "⚠️ Os testes falharam. Nada foi publicado. Mande a saída para o Claude."; exit 1; }
echo "   ok"

echo "2/3 Publicando (merge no main e push)..."
antes_dep=$(cd "$P" && vercel ls painel-inteligente --prod 2>/dev/null | grep -o 'https://painel-inteligente-[a-z0-9]*-b-agency.vercel.app' | head -1)
git fetch -q origin main
git checkout -q main
git merge -q --ff-only origin/main
git merge -q --no-edit genio-visual || { git merge --abort 2>/dev/null; git checkout -q genio-visual; echo "⚠️ Conflito com o que já está no ar. Nada foi publicado. Avise o Claude."; exit 1; }
git push -q origin main
git checkout -q genio-visual
echo "   Enviado para a Vercel. Esperando publicar..."

echo "3/3 Conferência (espera a Vercel ficar Ready)..."
sleep 15
for i in {1..40}; do
  dep=$(cd "$P" && vercel ls painel-inteligente --prod 2>/dev/null | grep -o 'https://painel-inteligente-[a-z0-9]*-b-agency.vercel.app' | head -1)
  [[ -z "$dep" || "$dep" == "$antes_dep" ]] && { sleep 10; continue; }
  st=$(cd "$P" && vercel inspect "$dep" 2>&1 | grep -i 'status' | head -1)
  if echo "$st" | grep -qi 'ready'; then
    echo "   Vercel: Ready ($dep)"
    for c in "" /gratis /reforma /chama-acesa /admin; do echo "   $BASE$c: HTTP $(curl -s -o /dev/null -w '%{http_code}' "$BASE$c")"; done
    css=$(curl -s "$BASE/" | grep -o '/_next/static/css/[^"]*\.css' | head -5)
    novo=0; for f in ${(f)css}; do curl -s "$BASE$f" | grep -q 'gp-tabbar' && novo=1; done
    [[ $novo == 1 ]] && echo "   visual novo: confirmado no CSS publicado" || echo "   ⚠️ não achei o visual novo no CSS (pode ser cache; abra a área e atualize)"
    echo "✅ No ar: $BASE"
    echo "Avise o Claude: \"publiquei o Gênio Play\"."
    exit 0
  fi
  if echo "$st" | grep -qi 'error\|canceled'; then
    echo "⚠️ A Vercel deu erro na publicação ($dep). Copie tudo e mande para o Claude."
    exit 1
  fi
  sleep 10
done
echo "⚠️ A Vercel não ficou pronta em ~7 min. Copie tudo acima e mande para o Claude."
exit 1
