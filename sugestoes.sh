#!/bin/zsh
# Sugestões de melhoria dos alunos (Claude lê, avalia e leva ao Brenno só as que fazem sentido).
#   ./sugestoes.sh                    → novas (status recebida)
#   ./sugestoes.sh todas
#   ./sugestoes.sh marcar <id> aprovada|feita|avaliada ["nota que o aluno vê"]
cd "$(dirname "$0")"
URL="${PAINEL_URL:-https://painelinteligente.bagencymidia.site}/api/suggestions"
SECRET="$(grep '^TREND_REFRESH_SECRET=' .env.local | cut -d= -f2- | tr -d '"')"
AUTH=(-H "Authorization: Bearer $SECRET" -H "Content-Type: application/json")
case "$1" in
  marcar) curl -s "${AUTH[@]}" -X PATCH "$URL" -d "$(python3 -c 'import json,sys; print(json.dumps({"id":sys.argv[1],"status":sys.argv[2],"note":sys.argv[3]}))' "$2" "$3" "$4")" ;;
  todas) curl -s "${AUTH[@]}" "$URL?status=todas" | python3 -m json.tool ;;
  *) curl -s "${AUTH[@]}" "$URL" | python3 -m json.tool ;;
esac
echo
