#!/usr/bin/env python3
"""Gera lib/reforma/tabelas-simples.json a partir de:
  - tabelas_simples.json (gabarito, extraído do texto da lei) e
  - lc214b.txt (LC 214 atualizada pela LC 227), só para a regra especial da 5ª faixa (Anexos III e IV).
Uso: python3 gera-tabelas-simples.py <pasta-casos-ouro> <lc214b.txt> <saida.json>
Sem rede. Não altera os arquivos de origem."""
import json, re, sys
from decimal import Decimal as D

casos, lei, saida = sys.argv[1:4]
base = json.load(open(f"{casos}/tabelas_simples.json"))
txt = open(lei).read()

def pct(s):  # "23,20%" -> "0.2320"
    return str((D(s.replace(",", ".")) / 100).normalize()) if D(s.replace(",", ".")) != 0 else "0"

def dec(s):
    return format(D(s.replace(",", ".")) / 100, "f")

linhas = []
for x in base:
    st = x["status"]
    linhas.append({
        "anexo": x["anexo"], "anexoLei": x["anexo_lei"], "ano": x["ano"], "faixa": x["faixa"],
        "de": x["de"], "ate": x["ate"], "nominal": x["nominal"], "deduzir": x["deduzir"],
        "partilha": x["partilha"], "fonte": x["fonte"],
        "status": "FATO", "conferir": st.startswith("FATO*"),
    })

# regra especial da 5ª faixa (teto de ISS) — Anexos III (XX) e IV (XXI)
def segmento(ini, fim):
    i = txt.find(ini); j = txt.find(fim, i + 10)
    return txt[i:j]

seg = {"III": ("ANEXO XX (Lei", "ANEXO XXI (Lei"), "IV": ("ANEXO XXI (Lei", "ANEXO XXII (Lei")}
anos_ord = [[2027, 2028], [2029], [2030], [2031], [2032]]
especial = []
for anexo, (a, b) in seg.items():
    s = segmento(a, b)
    ocorr = list(re.finditer(r"O percentual efetivo máximo devido ao ISS será de ([\d,]+)%.{0,200}?superior a ([\d,]+)%(.{0,900}?)Percentual de ISS fixo em [\d,]+% (.{0,120})", s, re.S))
    assert len(ocorr) == 5, (anexo, len(ocorr))
    for m, anos in zip(ocorr, anos_ord):
        cap = dec(m.group(1)); limite = m.group(2)
        mult = re.findall(r"x ([\d,]+)%", m.group(3) + " " + m.group(4))
        nomes = ["IRPJ", "CSLL", "CBS", "CPP", "IBS"] if anexo == "III" else ["IRPJ", "CSLL", "CBS", "IBS"]
        # multiplicadores na ordem do texto: IRPJ, CSLL, CBS, [CPP], IBS (o ISS fica fixo no teto)
        vals = [dec(v) for v in mult]
        assert len(vals) == len(nomes), (anexo, anos, mult)
        part = dict(zip(nomes, vals))
        soma = sum(D(v) for v in vals)
        assert abs(soma - 1) < D("0.00015"), (anexo, anos, soma)
        limite_dec = {"14,93": "0.1492537"}.get(limite, dec(limite))
        # Anexo III/2027: o texto traz "14,93%" na tabela e 14,92537% no corpo; usar 14,92537%
        if anexo == "III" and limite == "14,92537":
            limite_dec = "0.1492537"
        if limite == "12,5":
            limite_dec = "0.125"
        for ano in anos:
            especial.append({
                "anexo": anexo, "ano": ano, "faixa": 5, "efetivaAcimaDe": limite_dec, "issTeto": cap,
                "partilhaDoExcedente": dict(part),
                "fonte": f"LC 214/2025 atualizada pela LC 227/2026, Anexo {'XX' if anexo=='III' else 'XXI'} (nota da 5ª faixa, ano {ano})",
                "status": "FATO", "conferir": False,
            })
json.dump({"atualizadoEm": "2026-11-22", "linhas": linhas, "faixa5Especial": especial}, open(saida, "w"), ensure_ascii=False, indent=1)
print("linhas", len(linhas), "especial", len(especial))
for e in especial: print(e["anexo"], e["ano"], e["efetivaAcimaDe"], e["issTeto"], e["partilhaDoExcedente"])
