#!/usr/bin/env python3
"""Cálculo independente dos CASOS-OURO (Reforma Tributária do consumo).
NÃO lê a planilha. Usa aritmética exata (Fraction) e arredonda cada linha em R$ a 2 casas (meio para cima),
como o ROUND do Excel. As tabelas do Simples vêm de tabelas_simples.json (extraído do texto da lei por gerador/extrai_tabelas.py).
Uso: python3 calcula.py [saida.json]
"""
import json, sys, os
from fractions import Fraction as F
from math import floor

AQUI = os.path.dirname(os.path.abspath(__file__))
ANOS = [2026, 2027, 2029, 2033]

# ---------- parâmetros por ano (espelham a aba Parametros) ----------
CBS_REF = {2026: F("0.009"), 2027: F("0.113"), 2029: F("0.113"), 2033: F("0.113")}   # 2027+: ESTIMATIVA (TCU 11,3%)
CBS_MENOS = {2026: F(0), 2027: F("0.001"), 2029: F(0), 2033: F(0)}                   # art. 347 §1º I
IBS_PLENO_2033 = F("0.265") - CBS_REF[2033]                                            # ESTIMATIVA: 26,5% − 11,3%
IBS = {2026: F("0.001"), 2027: F("0.0005") + F("0.0005"), 2029: F("0.10") * IBS_PLENO_2033, 2033: IBS_PLENO_2033}
COBRA = {2026: 0, 2027: 1, 2029: 1, 2033: 1}
FATOR = {2026: F(1), 2027: F(1), 2029: F("0.9"), 2033: F(0)}                          # ADCT 128-129
PCFLAG = {2026: 1, 2027: 0, 2029: 0, 2033: 0}
PIS_PRES, COF_PRES, PIS_REAL, COF_REAL = F("0.0065"), F("0.03"), F("0.0165"), F("0.076")
MARGEM = F("0.15")
MEI = {2026: (F(5), F(0), F(0)), 2027: (F(5), F("0.994"), F("0.006")), 2029: (F("4.5"), F(1), F("0.2")), 2033: (F(0), F(1), F(2))}  # ISS, CBS, IBS

def cbs_padrao(a): return CBS_REF[a] - CBS_MENOS[a]
def r2(x):
    x = F(x); n = floor(abs(x) * 100 + F(1, 2)); return F(n if x >= 0 else -n, 100)

# ---------- tabelas do Simples ----------
_t = json.load(open(os.path.join(AQUI, "tabelas_simples.json")))
TAB = {(x["anexo"], x["ano"], x["faixa"]): x for x in _t}
LIMS = [F(0), F("180000.01"), F("360000.01"), F("720000.01"), F("1800000.01"), F("3600000.01")]
def faixa(rbt):
    f = 1
    for i, lim in enumerate(LIMS, start=1):
        if F(rbt) >= lim: f = i
    return f
def linha(anexo, ano, rbt):
    if anexo not in ("I", "II", "III", "IV", "V"):
        return None
    return TAB[(anexo, ano, faixa(rbt))]
def efetiva(anexo, ano, rbt):
    x = linha(anexo, ano, rbt)
    if x is None: return F(0), F(0), F(0)
    nom, ded = F(x["nominal"]), F(x["deduzir"]); rbt = F(rbt)
    return nom, ded, (rbt * nom - ded) / rbt
def partilha(anexo, ano, rbt, k):
    x = linha(anexo, ano, rbt)
    if x is None or not x["partilha"]: return F(0)
    return F(x["partilha"].get(k, 0))

# ---------- bloco regime regular ----------
def regular(rec, iss_p, icms_p, comp, pj, red, regime, a, hoje=None, pre=""):
    real = regime == "Real"
    pis_r, cof_r = (PIS_REAL, COF_REAL) if real else (PIS_PRES, COF_PRES)
    pis_c, cof_c = (PIS_REAL, COF_REAL) if real else (F(0), F(0))
    o = {}
    t_cbs = cbs_padrao(a) * (1 - red); t_ibs = IBS[a] * (1 - red)
    iss = r2(rec * iss_p * FATOR[a]); icms = r2(rec * icms_p * FATOR[a])
    pis_deb = r2(rec * pis_r * PCFLAG[a]); cof_deb = r2(rec * cof_r * PCFLAG[a])
    pis_cred = r2(comp * pis_c * PCFLAG[a]); cof_cred = r2(comp * cof_c * PCFLAG[a])
    pc = pis_deb - pis_cred + cof_deb - cof_cred
    base = rec - iss - icms
    cbs_deb = r2(base * t_cbs * COBRA[a]); ibs_deb = r2(base * t_ibs * COBRA[a])
    cbs_cred = r2(comp * cbs_padrao(a) * COBRA[a]); ibs_cred = r2(comp * IBS[a] * COBRA[a])
    cbs_liq = max(F(0), cbs_deb - cbs_cred); ibs_liq = max(F(0), ibs_deb - ibs_cred)
    total = pc + iss + icms + cbs_liq + ibs_liq
    pc_taxa = (pis_r + cof_r) * PCFLAG[a]
    d = r2(rec * (1 - MARGEM - iss_p - icms_p - pis_r - cof_r) + comp * (pis_c + cof_c))
    cred_tot = pis_cred + cof_cred + cbs_cred + ibs_cred
    p_sem = r2((d - cred_tot) / (1 - MARGEM - (iss_p + icms_p) * FATOR[a] - pc_taxa))
    iss_pp = r2(p_sem * iss_p * FATOR[a]); icms_pp = r2(p_sem * icms_p * FATOR[a])
    preco = r2(p_sem + r2((p_sem - iss_pp - icms_pp) * (t_cbs + t_ibs) * COBRA[a]))
    o.update(t_cbs=t_cbs, t_ibs=t_ibs, iss=iss, icms=icms, pis_deb=pis_deb, cofins_deb=cof_deb, pis_cred=pis_cred, cofins_cred=cof_cred,
             pis_cofins=pc, base=base, cbs_deb=cbs_deb, ibs_deb=ibs_deb, cbs_cred=cbs_cred, ibs_cred=ibs_cred, cbs_liq=cbs_liq, ibs_liq=ibs_liq,
             total=total, pct_receita=total / rec, valor_nota=rec + cbs_deb + ibs_deb, cred_cliente=r2((cbs_deb + ibs_deb) * pj),
             pc_taxa=pc_taxa, d_custo=d, cred_tot=cred_tot, p_sem=p_sem, iss_p=iss_pp, icms_p=icms_pp, preco_final=preco)
    return {pre + k: v for k, v in o.items()}

def finaliza_regular(res, pre=""):
    for a in ANOS:
        res[a][pre + "delta"] = res[a][pre + "total"] - res[2026][pre + "total"]
        res[a][pre + "reajuste"] = res[a][pre + "preco_final"] / res[2026][pre + "preco_final"] - 1

def caso_regular(rec, iss, icms, comp, pj, red, regime):
    res = {a: regular(F(rec), F(iss), F(icms), F(comp), F(pj), F(red), regime, a) for a in ANOS}
    finaliza_regular(res); return res

# ---------- Simples ----------
def caso_simples(rec, rbt, anexo, comp, s, fanx, frbt, pj, red, comp_regular=None):
    rec, rbt, comp, s, frbt, pj, red = map(F, (rec, rbt, comp, s, frbt, pj, red))
    res = {}
    for a in ANOS:
        o = {}
        nom, ded, ef = efetiva(anexo, a, rbt)
        das = r2(rec * ef)
        pc_, pi_ = partilha(anexo, a, rbt, "CBS"), partilha(anexo, a, rbt, "IBS")
        pii = partilha(anexo, a, rbt, "ICMS") + partilha(anexo, a, rbt, "ISS")
        das_cbs, das_ibs, das_ii = r2(rec * ef * pc_), r2(rec * ef * pi_), r2(rec * ef * pii)
        cred_das = das_cbs + das_ibs
        das_hib = das - das_cbs - das_ibs
        t_cbs, t_ibs = cbs_padrao(a) * (1 - red), IBS[a] * (1 - red)
        base = rec - das_ii
        cbs_deb, ibs_deb = r2(base * t_cbs * COBRA[a]), r2(base * t_ibs * COBRA[a])
        fn, fd, fef = efetiva(fanx, a, frbt)
        fpc, fpi = partilha(fanx, a, frbt, "CBS"), partilha(fanx, a, frbt, "IBS")
        cbs_cred = r2(comp * (1 - s) * cbs_padrao(a) * COBRA[a]) + r2(comp * s * fef * fpc * COBRA[a])
        ibs_cred = r2(comp * (1 - s) * IBS[a] * COBRA[a]) + r2(comp * s * fef * fpi * COBRA[a])
        cbs_liq, ibs_liq = max(F(0), cbs_deb - cbs_cred), max(F(0), ibs_deb - ibs_cred)
        total_hib = das_hib + cbs_liq + ibs_liq
        cred_hib = r2((cbs_deb + ibs_deb) * pj)
        cred_das_pj = r2(cred_das * pj)
        o.update(faixa=F(faixa(rbt)), nominal=nom, deduzir=ded, efetiva=ef, das=das, p_cbs=pc_, p_ibs=pi_, p_issicms=pii,
                 das_cbs=das_cbs, das_ibs=das_ibs, das_issicms=das_ii, cred_das=cred_das, cred_das_pj=cred_das_pj, das_hib=das_hib,
                 t_cbs=t_cbs, t_ibs=t_ibs, base_hib=base, cbs_deb=cbs_deb, ibs_deb=ibs_deb, f_faixa=F(faixa(frbt)), f_efetiva=fef, f_pcbs=fpc, f_pibs=fpi,
                 cbs_cred=cbs_cred, ibs_cred=ibs_cred, cbs_liq=cbs_liq, ibs_liq=ibs_liq, total_hib=total_hib, dif_custo=total_hib - das,
                 cred_hib=cred_hib, dif_cred=cred_hib - cred_das_pj, saldo=(cred_hib - cred_das_pj) - (total_hib - das),
                 nota_hib=rec + cbs_deb + ibs_deb)
        res[a] = o
    ef0 = res[2026]["efetiva"]
    d = r2(rec * (1 - MARGEM - ef0))
    for a in ANOS:
        o = res[a]; ef = o["efetiva"]
        p_dentro = r2(d / (1 - MARGEM - ef))
        cred_tot = o["cbs_cred"] + o["ibs_cred"]
        p_sem_h = r2((d - cred_tot) / (1 - MARGEM - ef * (1 - o["p_cbs"] - o["p_ibs"])))
        ii_p = r2(p_sem_h * ef * o["p_issicms"])
        preco_hib = r2(p_sem_h + r2((p_sem_h - ii_p) * (o["t_cbs"] + o["t_ibs"]) * COBRA[a]))
        o.update(d_custo=d, p_dentro=p_dentro, cred_tot=cred_tot, p_sem_h=p_sem_h, issicms_p=ii_p, preco_hib=preco_hib)
    p0 = res[2026]["p_dentro"]
    for a in ANOS:
        res[a]["reaj_dentro"] = res[a]["p_dentro"] / p0 - 1
        res[a]["reaj_hib"] = res[a]["preco_hib"] / p0 - 1
    if comp_regular:
        rg = {a: regular(rec, F(comp_regular["iss"]), F(comp_regular["icms"]), comp, pj, F(0), "Presumido", a, pre="rg_") for a in ANOS}
        finaliza_regular(rg, "rg_")
        for a in ANOS: res[a].update(rg[a])
    return res

def caso_mei():
    res = {}
    for a in ANOS:
        iss, cbs, ibs = MEI[a]
        tot = r2(iss + cbs + ibs)
        res[a] = dict(iss=iss, cbs=cbs, ibs=ibs, total=tot, anual=tot * 12)
    for a in ANOS: res[a]["delta"] = res[a]["total"] - res[2026]["total"]
    return res

CASOS = {
    "Caso01": lambda: caso_regular(60000, "0.05", 0, 8000, "0.9", "0.3", "Presumido"),
    "Caso02": lambda: caso_simples(40000, 480000, "III", 5000, 0, "n/a", 1, "0.9", "0.3"),
    "Caso03": lambda: caso_regular(120000, "0.03", 0, 15000, 0, "0.6", "Presumido"),
    "Caso04": lambda: caso_simples(90000, 1080000, "I", 35000, "0.5", "I", 270000, 0, "0.4"),
    "Caso05": lambda: caso_simples(250000, 3000000, "I", 170000, 0, "n/a", 1, 1, 0, comp_regular={"iss": 0, "icms": "0.03"}),
    "Caso06": lambda: caso_regular(400000, 0, "0.04", 260000, 0, 0, "Real"),
    "Caso07": lambda: caso_regular(80000, "0.02", 0, 10000, 1, 0, "Presumido"),
    "Caso08": lambda: caso_simples(30000, 360000, "III", 3000, 0, "n/a", 1, 1, 0),
    "Caso09": lambda: caso_regular(50000, "0.05", 0, 4000, "0.8", "0.3", "Presumido"),
    "Caso10": caso_mei,
}
def todos():
    return {c: {str(a): {k: v for k, v in r.items()} for a, r in f().items()} for c, f in CASOS.items()}
if __name__ == "__main__":
    out = todos()
    ser = {c: {a: {k: float(v) for k, v in d.items()} for a, d in anos.items()} for c, anos in out.items()}
    dest = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, "resultados_calcula.json")
    json.dump(ser, open(dest, "w"), indent=1)
    print("gravado", dest)
