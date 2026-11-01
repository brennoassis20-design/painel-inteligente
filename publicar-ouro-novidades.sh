#!/bin/zsh
# Publica: sino de Novidades + Lâmpada de Ouro (01/11/2026).
# ANTES: rodar no SQL Editor do Supabase o trecho "Novidades do painel" do fim de supabase/schema.sql.
set -e
cd "$(dirname "$0")"
git add app lib supabase/schema.sql novidade.sh publicar-ouro-novidades.sh
git commit -m "Novidades no sino (melhorias, nichos, em construção) + Lâmpada de Ouro: edição premium com fotos e chave OpenRouter do aluno"
git push origin main
echo "Push feito. Esperando a Vercel publicar..."
for i in {1..40}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" https://painelinteligente.bagencymidia.site/api/updates)
  [ "$code" = "401" ] && break
  sleep 15
done
echo "No ar. Publicando as primeiras novidades no sino..."
./novidade.sh melhoria "Novidades no painel" "Agora o sino avisa toda melhoria nova e toda vez que os nichos forem atualizados. Na aba Em construção você vê o que estamos fazendo." inicio
./novidade.sh melhoria "Lâmpada de Ouro: PDF premium com fotos" "Seu produto reescrito por uma IA mais forte, com fotos reais, cartões, listas para marcar e diagramação de designer. As fotos também viram fundo dos criativos. Usa a sua chave da OpenRouter (cerca de US$ 0,50 por produto)." ouro
./novidade.sh em_construcao "Produtos em inglês para os EUA" "Mesmo esquema da América Latina, vendendo em dólar no maior mercado do mundo."
echo "Pronto."
