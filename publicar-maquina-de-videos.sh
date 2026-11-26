#!/bin/zsh
# Publica a área "Máquina de Vídeos" no Gênio Play: envia os 2 arquivos ao Storage PRIVADO e publica o código (merge no main + push; a Vercel publica sozinha).
# ANTES (SQL Editor do Supabase): supabase/migrations/20261126_maquina_de_videos_bucket.sql (cria o bucket privado).
# DEPOIS: supabase/seed-maquina-de-videos.sql (PARTE 1) e, quando o produto Eduzz existir, a PARTE 2.
# Rode no Terminal: zsh ~/Documents/painel-inteligente/publicar-maquina-de-videos.sh
set -e
cd ~/Documents/painel-inteligente
BASE=https://membros.bagencymidia.site
PASTA="$HOME/Documents/Cofre Geral - Obsidian/Cofre Geral/Projetos/Reels Brenno/Skill Máquina de Vídeos"
ZIP="$PASTA/Maquina-de-Videos-v1.zip"          # para a v2: troque o nome aqui e rode de novo (ver nota de entrega)
PDF="$PASTA/bonus/Pedidos-Prontos-Maquina-de-Videos.pdf"
[[ -f "$ZIP" && -f "$PDF" ]] || { echo "⚠️ Não achei o zip ou o PDF em: $PASTA"; exit 1; }

[[ "$(git branch --show-current)" == "maquina-de-videos" ]] || { echo "⚠️ Rode com o ramo maquina-de-videos ativo (git checkout maquina-de-videos)."; exit 1; }
git checkout -q -- next-env.d.ts 2>/dev/null || true
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo "⚠️ Há alterações não salvas no ramo. Mande para o Claude:"; git status --short --untracked-files=no; exit 1; }

echo "1/4 Enviando os arquivos ao Storage privado (bucket membros-privado)..."
ENVF=$(mktemp)
vercel env pull "$ENVF" --environment=production --yes >/dev/null 2>&1 || true
SUPA_URL=$(grep -E '^SUPABASE_URL=' "$ENVF" | head -1 | cut -d= -f2- | tr -d '"')
SUPA_KEY=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$ENVF" | head -1 | cut -d= -f2- | tr -d '"')
rm -f "$ENVF"
[[ "$SUPA_KEY" == *SENSITIVE* || "$SUPA_URL" == *SENSITIVE* ]] && { SUPA_URL=""; SUPA_KEY=""; }   # chave marcada como sensível na Vercel não sai no pull
if [[ -n "$SKIP_UPLOAD" ]]; then
  echo "   (pulado: arquivos já enviados pelo painel do Supabase)"
elif [[ -z "$SUPA_URL" || -z "$SUPA_KEY" ]]; then
  echo "⚠️ Não consegui ler a chave do Supabase da Vercel. Faça o envio à mão: Supabase > Storage > membros-privado > pasta maquina-de-videos >"
  echo "   enviar '$ZIP' e '$PDF' (mesmos nomes). Depois rode este script de novo pulando esta etapa (SKIP_UPLOAD=1)."
  [[ -n "$SKIP_UPLOAD" ]] || exit 1
else
  subir() {
    local arq="$1" nome="$(basename "$1")" tipo="$2"
    local code=$(curl -s -o /tmp/mv-up.txt -w '%{http_code}' -X POST "$SUPA_URL/storage/v1/object/membros-privado/maquina-de-videos/$nome" \
      -H "apikey: $SUPA_KEY" -H "Authorization: Bearer $SUPA_KEY" -H "Content-Type: $tipo" -H "x-upsert: true" --data-binary @"$arq")
    echo "   $nome: HTTP $code"
    [[ "$code" == 200 ]] || { cat /tmp/mv-up.txt; echo; echo "⚠️ Envio falhou (o bucket membros-privado já foi criado pelo SQL da parte 0?)."; exit 1; }
  }
  subir "$ZIP" application/zip
  subir "$PDF" application/pdf
  rm -f /tmp/mv-up.txt
fi
unset SUPA_KEY

echo "2/4 Testes completos (npm test = build + todos os testes)..."
npm test || { echo "⚠️ Os testes falharam. Nada foi publicado. Mande a saída para o Claude."; exit 1; }

echo "3/4 Publicando (merge no main e push)..."
antes_dep=$(vercel ls painel-inteligente --prod 2>/dev/null | grep -o 'https://painel-inteligente-[a-z0-9]*-b-agency.vercel.app' | head -1)
git fetch -q origin main
git checkout -q main
git merge -q --ff-only origin/main
git merge -q --no-edit maquina-de-videos
git push -q origin main
git checkout -q maquina-de-videos
echo "Enviado para a Vercel. Esperando publicar..."

echo "4/4 Conferência (espera a Vercel ficar Ready)..."
sleep 15
for i in {1..40}; do
  dep=$(vercel ls painel-inteligente --prod 2>/dev/null | grep -o 'https://painel-inteligente-[a-z0-9]*-b-agency.vercel.app' | head -1)
  [[ -z "$dep" || "$dep" == "$antes_dep" ]] && { sleep 10; continue; }
  st=$(vercel inspect "$dep" 2>&1 | grep -i 'status' | head -1)
  if echo "$st" | grep -qi 'ready'; then
    echo "   Vercel: Ready ($dep)"
    echo "   capa: HTTP $(curl -s -o /dev/null -w '%{http_code}' "$BASE/membros/capas/maquina-de-videos.jpg")"
    echo "   área no banco: HTTP $(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/membros/area?area=maquina-de-videos")"
    echo "   página: HTTP $(curl -s -o /dev/null -w '%{http_code}' "$BASE/maquina-de-videos")"
    echo "✅ No ar: $BASE/maquina-de-videos"
    echo "Avise o Claude: \"publicou a Máquina de Vídeos\" (cole a saída acima)."
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
