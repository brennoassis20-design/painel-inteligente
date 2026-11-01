#!/bin/zsh
# Força a coleta de nichos do Painel Inteligente e mostra o resultado.
# Uso: ./coletar-nichos.sh latam   (ou: ./coletar-nichos.sh br)
cd "$(dirname "$0")"
MERCADO="${1:-latam}"
SEGREDO="$(grep '^TREND_REFRESH_SECRET=' .env.local | cut -d= -f2- | tr -d '"')"
echo "Coletando nichos ($MERCADO)... leva de 1 a 5 minutos."
curl -s -m 310 -w "\nHTTP %{http_code} · %{time_total}s\n" \
  "https://painel-inteligente-ten.vercel.app/api/trends/refresh?market=$MERCADO&force=1" \
  -H "Authorization: Bearer $SEGREDO" \
  | python3 -c "
import sys, json
txt = sys.stdin.read()
corpo, _, status = txt.rpartition('\nHTTP ')
try:
    d = json.loads(corpo)
    if 'error' in d: print('ERRO:', d['error'])
    else:
        print('Nichos gravados:', d.get('updated'))
        print('Números da coleta:', d.get('stats'))
        for o in d.get('opportunities', []): print(' -', o.get('title'))
except Exception:
    print(corpo[:1500])
print('HTTP', status)
"
