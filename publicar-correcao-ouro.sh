#!/bin/zsh
# Correção 01/11: fotos da Lâmpada de Ouro (data da edição), gaveta de Novidades cortada, símbolos no PDF, 401 sem login.
set -e
cd "$(dirname "$0")"
git add app lib publicar-correcao-ouro.sh
git commit -m "Lampada de Ouro: fotos achadas pela data salva da edicao, simbolos desenhados no PDF, 401 sem sessao; gaveta de Novidades fora do topo (portal)"
git push origin main
echo "Push feito. A Vercel publica em 1 a 2 minutos."
