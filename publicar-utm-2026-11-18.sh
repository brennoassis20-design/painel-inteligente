#!/bin/zsh
# Publica o padrão de UTM (18/11/2026): área de membros + página do Método Gênio (ramo utm-padrao-2026-11-18, Vercel)
# e o site da Reforma (/oferta, /oferta-2, páginas de entrega; Vercel, projeto reforma-desenhada).
# Sem migração de banco: o webhook grava utm_campaign/medium/term dentro do meta (jsonb) de mp_events.
# Rode no Terminal: zsh ~/Documents/painel-inteligente/publicar-utm-2026-11-18.sh
set -e
APP=~/Documents/painel-inteligente
SITE="$HOME/Desktop/Reforma Tributária/6 Site (reforma.kitsepromocoes.site)/site"

echo "=== 1/2 · Área de membros + Método Gênio (Vercel via GitHub) ==="
cd "$APP"
git fetch -q origin main
git checkout -q main
git merge -q --ff-only origin/main
git merge -q --no-edit utm-padrao-2026-11-18
git push -q origin main
echo "Enviado. Esperando a Vercel publicar a área (procura 'pagina-produto' no JavaScript)..."
area_ok=0
for i in {1..36}; do
  sleep 10
  html=$(curl -s "https://membros.bagencymidia.site/?v=$RANDOM")
  for chunk in $(echo "$html" | grep -oE '/_next/static/chunks/[^"]+\.js' | sort -u); do
    if curl -s "https://membros.bagencymidia.site$chunk" | grep -q "pagina-produto"; then area_ok=1; break; fi
  done
  [[ $area_ok = 1 ]] && break
done
if [[ $area_ok = 1 ]]; then echo "OK área: 'pagina-produto' encontrado no JS publicado."; else echo "ATENCAO área: ainda não apareceu depois de 6 min. Copie tudo e mande para o Claude."; fi

echo ""
echo "=== 2/2 · Site da Reforma (Vercel, projeto reforma-desenhada) ==="
cd "$SITE"
vercel link --yes --project reforma-desenhada
vercel deploy --prod --yes
echo "Conferindo o HTML publicado..."
site_ok=1
for pagina in oferta oferta-2; do
  if curl -s "https://reforma.kitsepromocoes.site/$pagina/?v=$RANDOM" | grep -q "upsell-pos-compra"; then echo "OK /$pagina/: upsell-pos-compra"; else echo "ATENCAO /$pagina/: não achei upsell-pos-compra"; site_ok=0; fi
done
for entrega in reforma-desenhada tabelas 30-casos calculadora; do
  if curl -s "https://reforma.kitsepromocoes.site/e-c90db2fdbcbd/entrega/$entrega/?v=$RANDOM" | grep -q "padrao UTM"; then echo "OK entrega/$entrega: faixa com origem"; else echo "ATENCAO entrega/$entrega: script novo não encontrado"; site_ok=0; fi
done

echo ""
if [[ $area_ok = 1 && $site_ok = 1 ]]; then echo "PRONTO: tudo no ar e conferido."; else echo "TERMINOU COM AVISOS: copie tudo acima e mande para o Claude."; fi
