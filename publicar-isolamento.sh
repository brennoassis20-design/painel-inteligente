#!/bin/zsh
# Publica o isolamento de áreas (ramo isolamento-areas): cadastro grátis só onde há produto grátis, senha/convite/login
# sempre voltam para a área do aluno, Painel não mostra "Pagamento pendente" a aluno de área, convite Cakto + corrida,
# lembrete de acesso (cron diário 13:00 UTC) e modelos de e-mail.
# Antes: na Vercel, confira que CRON_SECRET existe (Settings > Environment Variables).
# Rode no Terminal: zsh ~/Documents/painel-inteligente/publicar-isolamento.sh
set -e
cd ~/Documents/painel-inteligente
git fetch -q origin main
git checkout -q main
git merge -q --ff-only origin/main
git merge -q --no-edit isolamento-areas
git push -q origin main
echo "Enviado para a Vercel. Esperando publicar..."
for i in {1..36}; do
  sleep 10
  r=$(curl -s "https://membros.bagencymidia.site/api/membros/area?area=academia-do-dollar")
  if echo "$r" | grep -q has_free; then
    echo "OK no ar. has_free da Academia do Dollar: $(echo "$r" | grep -o '"has_free":[a-z]*')"
    echo ""
    echo "Falta (manual):"
    echo " 1) Supabase > Authentication > Emails: colar os 4 modelos de ~/Documents/painel-inteligente/supabase/emails"
    echo "    (convite-duplo.html = Invite; redefinir-senha.html = Reset Password; acesso-gratis.html = Magic Link; convite.html se usar)."
    echo " 2) Ver quem receberia lembrete (sem enviar):"
    echo '    curl -s -H "Authorization: Bearer SEU_CRON_SECRET" "https://membros.bagencymidia.site/api/membros/lembrete-acesso?dry=1"'
    echo " 3) Enviar de verdade (as 2 compras Cakto de 17/11 entram aqui):"
    echo '    curl -s -H "Authorization: Bearer SEU_CRON_SECRET" "https://membros.bagencymidia.site/api/membros/lembrete-acesso"'
    exit 0
  fi
done
echo "ATENCAO: ainda não respondeu depois de 6 min. Copie tudo acima e mande para o Claude."
