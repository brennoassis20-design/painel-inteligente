#!/bin/zsh
# Correções 01/11: fotos da Lâmpada de Ouro, gaveta de Novidades, símbolos no PDF, 401 sem login
# + criativos de ouro no formato do Kit (faixa + foto + preço, sem mockup) e etiqueta sem "guia".
set -e
cd "$(dirname "$0")"
git add app lib publicar-correcao-ouro.sh
git commit -m "Lampada de Ouro: criativos no formato do Kit (faixa, foto real, preco; sem mockup), anuncios escritos pela IA, fotos achadas pela data salva, simbolos desenhados no PDF, 401; gaveta de Novidades via portal; mockup padrao desligado e etiqueta sem 'guia'"
git push origin main
echo "Push feito. Esperando a Vercel publicar..."
sleep 90
./novidade.sh pronto e91701ed-0a06-4ef4-adde-539a4851ff45 "Lâmpada de Ouro: PDF premium e anúncios com fotos" "Seu produto reescrito por uma IA mais forte, com fotos reais e diagramação de designer, e 6 anúncios prontos com as fotos do produto em Criativos prontos. Usa a sua chave da OpenRouter (cerca de US\$ 0,50 por produto)." ouro
echo "Pronto."
