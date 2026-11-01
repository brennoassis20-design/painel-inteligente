#!/bin/zsh
# Publica uma novidade no sino do painel (Claude/Jarvis usam).
#   ./novidade.sh melhoria "Título" "Texto curto" [tela]
#   ./novidade.sh em_construcao "Título" "Texto curto"
#   ./novidade.sh pronto <id> ["Título novo"] ["Texto novo"] [tela]   (em construção → melhoria, volta ao topo e acende o sino)
#   ./novidade.sh remover <id>
#   ./novidade.sh listar
# Telas: inicio radar gerador radarLatam geradorLatam produto criativos copy arquivos calculadora lancamento mockup mentor
cd "$(dirname "$0")"
URL="${PAINEL_URL:-https://painelinteligente.bagencymidia.site}/api/updates"
SECRET="$(grep '^TREND_REFRESH_SECRET=' .env.local | cut -d= -f2- | tr -d '"')"
AUTH=(-H "Authorization: Bearer $SECRET" -H "Content-Type: application/json")
json() { python3 -c 'import json,sys; a=sys.argv[1:]; print(json.dumps({a[i]:a[i+1] for i in range(0,len(a),2) if a[i+1]!=""}))' "$@"; }
case "$1" in
  listar) curl -s "${AUTH[@]}" "$URL" | python3 -m json.tool ;;
  pronto) curl -s "${AUTH[@]}" -X PATCH "$URL" -d "$(json id "$2" kind melhoria title "$3" body "$4" view "$5" | python3 -c 'import json,sys; d=json.load(sys.stdin); d["bump"]=True; print(json.dumps(d))')" ;;
  remover) curl -s "${AUTH[@]}" -X PATCH "$URL" -d "{\"id\":\"$2\",\"is_active\":false}" ;;
  melhoria|nichos|em_construcao) curl -s "${AUTH[@]}" -X POST "$URL" -d "$(json kind "$1" title "$2" body "$3" view "$4")" ;;
  *) sed -n 2,9p "$0"; exit 1 ;;
esac
echo
