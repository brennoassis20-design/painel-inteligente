#!/usr/bin/env python3
"""Converte o VPL da Bíblia Livre (eBible porbr2018) em JSON por livro. Uso: converter-biblia.py <vpl.txt> <pasta-saida>"""
import json, re, sys, os
LIVROS = [("GEN","Gênesis","at"),("EXO","Êxodo","at"),("LEV","Levítico","at"),("NUM","Números","at"),("DEU","Deuteronômio","at"),("JOS","Josué","at"),("JDG","Juízes","at"),("RUT","Rute","at"),("1SA","1 Samuel","at"),("2SA","2 Samuel","at"),("1KI","1 Reis","at"),("2KI","2 Reis","at"),("1CH","1 Crônicas","at"),("2CH","2 Crônicas","at"),("EZR","Esdras","at"),("NEH","Neemias","at"),("EST","Ester","at"),("JOB","Jó","at"),("PSA","Salmos","at"),("PRO","Provérbios","at"),("ECC","Eclesiastes","at"),("SOL","Cantares","at"),("ISA","Isaías","at"),("JER","Jeremias","at"),("LAM","Lamentações","at"),("EZE","Ezequiel","at"),("DAN","Daniel","at"),("HOS","Oseias","at"),("JOE","Joel","at"),("AMO","Amós","at"),("OBA","Obadias","at"),("JON","Jonas","at"),("MIC","Miqueias","at"),("NAH","Naum","at"),("HAB","Habacuque","at"),("ZEP","Sofonias","at"),("HAG","Ageu","at"),("ZEC","Zacarias","at"),("MAL","Malaquias","at"),
("MAT","Mateus","nt"),("MAR","Marcos","nt"),("LUK","Lucas","nt"),("JOH","João","nt"),("ACT","Atos","nt"),("ROM","Romanos","nt"),("1CO","1 Coríntios","nt"),("2CO","2 Coríntios","nt"),("GAL","Gálatas","nt"),("EPH","Efésios","nt"),("PHI","Filipenses","nt"),("COL","Colossenses","nt"),("1TH","1 Tessalonicenses","nt"),("2TH","2 Tessalonicenses","nt"),("1TI","1 Timóteo","nt"),("2TI","2 Timóteo","nt"),("TIT","Tito","nt"),("PHM","Filemom","nt"),("HEB","Hebreus","nt"),("JAM","Tiago","nt"),("1PE","1 Pedro","nt"),("2PE","2 Pedro","nt"),("1JO","1 João","nt"),("2JO","2 João","nt"),("3JO","3 João","nt"),("JUD","Judas","nt"),("REV","Apocalipse","nt")]
ent, saida = sys.argv[1], sys.argv[2]
dados = {s: {} for s, _, _ in LIVROS}
for linha in open(ent, encoding="utf-8-sig"):
    m = re.match(r"^(\w{3}) (\d+):(\d+) (.*)$", linha.rstrip("\n"))
    if not m: continue
    s, c, v, t = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
    t = re.sub(r"\\[a-z]+\d*\*?|\|[^ ]*", "", t)           # restos de USFM
    t = re.sub(r"\s+", " ", t).strip()
    dados[s].setdefault(c, {})[v] = t
os.makedirs(saida, exist_ok=True)
indice = []
for s, nome, test in LIVROS:
    caps = dados[s]; n = max(caps)
    assert sorted(caps) == list(range(1, n + 1)), (s, "capítulo faltando")
    lista = []
    for c in range(1, n + 1):
        vs = caps[c]; mx = max(vs)
        lista.append([vs.get(i, "") for i in range(1, mx + 1)])
    sigla = s.lower()
    json.dump({"livro": nome, "capitulos": lista}, open(f"{saida}/{sigla}.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    indice.append({"sigla": sigla, "nome": nome, "capitulos": n, "testamento": test})
json.dump(indice, open(f"{saida}/indice.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(indice), "livros")
