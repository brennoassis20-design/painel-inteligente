#!/usr/bin/env python3
"""Cálculo independente ESTENDIDO (cópia de calcula.py do cofre, que NÃO foi alterado).
Acrescenta, sem mexer na lógica dos 10 casos-ouro:
  - os 8 anos (2026-2033): 2028 = regras de 2027; IBS 2030-2032 = pleno x (1 - fator ICMS/ISS) (ESTIMATIVA, como no app);
  - regra especial da 5ª faixa dos Anexos III e IV (teto de ISS);
  - 6ª faixa: ICMS/ISS recolhidos por fora do DAS;
  - premissa "fornecedores mantêm o preço final";
  - fornecedores do Simples também para Presumido/Real;
  - campos extras do app: custo real para o cliente PJ e margem se o preço não mudar.
Uso: python3 calcula_estendido.py casos-estendidos.json
Aritmética exata (Fraction); cada valor em R$ arredondado a 2 casas, meio para cima. Saída em texto decimal exato."""
import json, sys, os
from fractions import Fraction as F
from math import floor

AQUI = os.path.dirname(os.path.abspath(__file__))
ANOS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]
ANOS_GAB = [2026, 2027, 2029, 2033]

CBS_REF = {a: (F("0.009") if a == 2026 else F("0.113")) for a in ANOS}
CBS_MENOS = {a: (F("0.001") if a in (2027, 2028) else F(0)) for a in ANOS}
FATOR = {2026: F(1), 2027: F(1), 2028: F(1), 2029: F("0.9"), 2030: F("0.8"), 2031: F("0.7"), 2032: F("0.6"), 2033: F(0)}
IBS_PLENO = F("0.265") - CBS_REF[2033]
IBS = {a: (F("0.001") if a <= 2028 else IBS_PLENO * (1 - FATOR[a])) for a in ANOS}
COBRA = {a: (0 if a == 2026 else 1) for a in ANOS}
PCFLAG = {a: (1 if a == 2026 else 0) for a in ANOS}
PIS_PRES, COF_PRES, PIS_REAL, COF_REAL = F("0.0065"), F("0.03"), F("0.0165"), F("0.076")
MARGEM = F("0.15")
MEI = {2026: (F(5), F(0), F(0)), 2027: (F(5), F("0.994"), F("0.006")), 2028: (F(5), F("0.994"), F("0.006")), 2029: (F("4.5"), F(1), F("0.2")),
       2030: (F(4), F(1), F("0.4")), 2031: (F("3.5"), F(1), F("0.6")), 2032: (F(3), F(1), F("0.8")), 2033: (F(0), F(1), F(2))}
# regra especial da 5ª faixa (Anexos III e IV): ano -> (teto ISS, % CBS, % IBS do excedente) - transcrito do texto das notas dos Anexos XX e XXI
ESP = {
    "III": {2027: ("0.05", "0.2320", "0.0026"), 2028: ("0.05", "0.2320", "0.0026"), 2029: ("0.045", "0.2233", "0.048"), 2030: ("0.04", "0.2131", "0.0915"),
            2031: ("0.035", "0.2038", "0.1313"), 2032: ("0.03", "0.1952", "0.1677")},
    "IV": {2027: ("0.05", "0.3627", "0.0040"), 2028: ("0.05", "0.3627", "0.0040"), 2029: ("0.045", "0.3438", "0.0625"), 2030: ("0.04", "0.3235", "0.1176"),
           2031: ("0.035", "0.3056", "0.1667"), 2032: ("0.03", "0.2895", "0.2105")},
}
ESP_LIM = {"III": F("0.1492537"), "IV": F("0.125")}

def cbs_padrao(a): return CBS_REF[a] - CBS_MENOS[a]
def r2(x):
    x = F(x); n = floor(abs(x) * 100 + F(1, 2)); return F(n if x >= 0 else -n, 100)

_t = json.load(open(os.path.join(AQUI, "tabelas_simples.json")))
TAB = {(x["anexo"], x["ano"], x["faixa"]): x for x in _t}
LIMS = [F(0), F("180000.01"), F("360000.01"), F("720000.01"), F("1800000.01"), F("3600000.01")]
def faixa(rbt):
    f = 1
    for i, lim in enumerate(LIMS, start=1):
        if F(rbt) >= lim: f = i
    return f
def linha(anexo, ano, rbt):
    if anexo not in ("I", "II", "III", "IV", "V"): return None
    return TAB[(anexo, ano, faixa(rbt))]
def efetiva(anexo, ano, rbt):
    x = linha(anexo, ano, rbt)
    if x is None: return F(0), F(0), F(0)
    nom, ded = F(x["nominal"]), F(x["deduzir"]); rbt = F(rbt)
    return nom, ded, (rbt * nom - ded) / rbt
def partilha(anexo, ano, rbt, k):
    x = linha(anexo, ano, rbt)
    if x is None or not x["partilha"]: return F(0)
    if anexo in ESP and faixa(rbt) == 5 and ano in ESP[anexo]:
        _, _, ef = efetiva(anexo, ano, rbt)
        if ef > ESP_LIM[anexo]:
            teto, pc, pi = map(F, ESP[anexo][ano])
            if k == "ISS": return teto / ef
            if k == "CBS": return (ef - teto) * pc / ef
            if k == "IBS": return (ef - teto) * pi / ef
            return F(0)
    return F(x["partilha"].get(k, 0))

def cred_compras(comp, forn, a, premissa):
    """Crédito de CBS e IBS: fornecedores regulares (comp) + fornecedores do Simples [(valor, anexo, rbt)]."""
    tt = cbs_padrao(a) + IBS[a]
    base = F(comp) / (1 + tt) if premissa == "preco_final" else F(comp)
    cbs = r2(base * cbs_padrao(a) * COBRA[a]); ibs = r2(base * IBS[a] * COBRA[a])
    for (v, an, rb) in forn:
        _, _, fef = efetiva(an, a, rb)
        cbs += r2(F(v) * fef * partilha(an, a, rb, "CBS") * COBRA[a]); ibs += r2(F(v) * fef * partilha(an, a, rb, "IBS") * COBRA[a])
    return cbs, ibs

def regular(rec, iss_p, icms_p, comp, pj, red, regime, a, forn=(), premissa="sem_imposto", pre=""):
    real = regime == "Real"
    pis_r, cof_r = (PIS_REAL, COF_REAL) if real else (PIS_PRES, COF_PRES)
    pis_c, cof_c = (PIS_REAL, COF_REAL) if real else (F(0), F(0))
    t_cbs = cbs_padrao(a) * (1 - red); t_ibs = IBS[a] * (1 - red)
    iss = r2(rec * iss_p * FATOR[a]); icms = r2(rec * icms_p * FATOR[a])
    pis_deb = r2(rec * pis_r * PCFLAG[a]); cof_deb = r2(rec * cof_r * PCFLAG[a])
    pis_cred = r2(comp * pis_c * PCFLAG[a]); cof_cred = r2(comp * cof_c * PCFLAG[a])
    pc = pis_deb - pis_cred + cof_deb - cof_cred
    base = rec - iss - icms
    cbs_deb = r2(base * t_cbs * COBRA[a]); ibs_deb = r2(base * t_ibs * COBRA[a])
    cbs_cred, ibs_cred = cred_compras(comp, forn, a, premissa)
    cbs_liq = max(F(0), cbs_deb - cbs_cred); ibs_liq = max(F(0), ibs_deb - ibs_cred)
    total = pc + iss + icms + cbs_liq + ibs_liq
    pc_taxa = (pis_r + cof_r) * PCFLAG[a]
    d = r2(rec * (1 - MARGEM - iss_p - icms_p - pis_r - cof_r) + comp * (pis_c + cof_c))
    cred_tot = pis_cred + cof_cred + cbs_cred + ibs_cred
    p_sem = r2((d - cred_tot) / (1 - MARGEM - (iss_p + icms_p) * FATOR[a] - pc_taxa))
    iss_pp = r2(p_sem * iss_p * FATOR[a]); icms_pp = r2(p_sem * icms_p * FATOR[a])
    preco = r2(p_sem + r2((p_sem - iss_pp - icms_pp) * (t_cbs + t_ibs) * COBRA[a]))
    nopreco = preco - p_sem
    psm = rec / (1 + (1 - (iss_p + icms_p) * FATOR[a]) * (t_cbs + t_ibs) * COBRA[a])
    o = dict(t_cbs=t_cbs, t_ibs=t_ibs, iss=iss, icms=icms, pis_deb=pis_deb, cofins_deb=cof_deb, pis_cred=pis_cred, cofins_cred=cof_cred,
             pis_cofins=pc, base=base, cbs_deb=cbs_deb, ibs_deb=ibs_deb, cbs_cred=cbs_cred, ibs_cred=ibs_cred, cbs_liq=cbs_liq, ibs_liq=ibs_liq,
             total=total, pct_receita=total / rec, valor_nota=rec + cbs_deb + ibs_deb, cred_cliente=r2((cbs_deb + ibs_deb) * pj),
             pc_taxa=pc_taxa, d_custo=d, cred_tot=cred_tot, p_sem=p_sem, iss_p=iss_pp, icms_p=icms_pp, preco_final=preco,
             cbs_ibs_no_preco=nopreco, custo_real_cliente_pj=preco - nopreco,
             margem_se_manter_preco=1 - (iss_p + icms_p) * FATOR[a] - pc_taxa - (d - cred_tot) / psm)
    return {pre + k: v for k, v in o.items()}

def finaliza_regular(res, pre=""):
    for a in ANOS:
        res[a][pre + "delta"] = res[a][pre + "total"] - res[2026][pre + "total"]
        res[a][pre + "reajuste"] = res[a][pre + "preco_final"] / res[2026][pre + "preco_final"] - 1

def caso_regular(rec, iss, icms, comp, pj, red, regime, forn=(), premissa="sem_imposto"):
    res = {a: regular(F(rec), F(iss), F(icms), F(comp), F(pj), F(red), regime, a, forn, premissa) for a in ANOS}
    finaliza_regular(res); return res

def caso_simples(rec, rbt, anexo, comp, s, fanx, frbt, pj, red, comp_regular=None, iss_p=0, icms_p=0, premissa="sem_imposto", forn_extra=()):
    rec, rbt, comp, s, frbt, pj, red, iss_p, icms_p = map(F, (rec, rbt, comp, s, frbt, pj, red, iss_p, icms_p))
    regs = comp * (1 - s)
    forn = []
    if s > 0: forn.append((comp * s, fanx, frbt))
    forn += list(forn_extra)
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
        fora_t = (iss_p + icms_p) * FATOR[a] if faixa(rbt) == 6 else F(0)
        fora = r2(rec * fora_t)
        base = rec - das_ii - fora
        cbs_deb, ibs_deb = r2(base * t_cbs * COBRA[a]), r2(base * t_ibs * COBRA[a])
        cbs_cred, ibs_cred = cred_compras(regs, forn, a, premissa)
        if forn:
            fn, fd, fef = efetiva(forn[0][1], a, forn[0][2]); fpc, fpi = partilha(forn[0][1], a, forn[0][2], "CBS"), partilha(forn[0][1], a, forn[0][2], "IBS"); ffx = faixa(forn[0][2])
        else:
            fef = F(0); fpc = F(0); fpi = F(0); ffx = 1
        cbs_liq, ibs_liq = max(F(0), cbs_deb - cbs_cred), max(F(0), ibs_deb - ibs_cred)
        total_hib = das_hib + cbs_liq + ibs_liq
        cred_hib = r2((cbs_deb + ibs_deb) * pj)
        cred_das_pj = r2(cred_das * pj)
        o.update(faixa=F(faixa(rbt)), nominal=nom, deduzir=ded, efetiva=ef, das=das, p_cbs=pc_, p_ibs=pi_, p_issicms=pii,
                 das_cbs=das_cbs, das_ibs=das_ibs, das_issicms=das_ii, cred_das=cred_das, cred_das_pj=cred_das_pj, das_hib=das_hib,
                 t_cbs=t_cbs, t_ibs=t_ibs, base_hib=base, cbs_deb=cbs_deb, ibs_deb=ibs_deb, f_faixa=F(ffx), f_efetiva=fef, f_pcbs=fpc, f_pibs=fpi,
                 cbs_cred=cbs_cred, ibs_cred=ibs_cred, cbs_liq=cbs_liq, ibs_liq=ibs_liq, total_hib=total_hib, dif_custo=total_hib - das,
                 cred_hib=cred_hib, dif_cred=cred_hib - cred_das_pj, saldo=(cred_hib - cred_das_pj) - (total_hib - das),
                 nota_hib=rec + cbs_deb + ibs_deb, iss_icms_fora_do_das=fora, _fora_t=fora_t)
        res[a] = o
    ef0 = res[2026]["efetiva"]; fora0 = res[2026]["_fora_t"]
    d = r2(rec * (1 - MARGEM - ef0 - fora0))
    for a in ANOS:
        o = res[a]; ef = o["efetiva"]; ft = o["_fora_t"]
        p_dentro = r2(d / (1 - MARGEM - ef - ft))
        cred_tot = o["cbs_cred"] + o["ibs_cred"]
        p_sem_h = r2((d - cred_tot) / (1 - MARGEM - ef * (1 - o["p_cbs"] - o["p_ibs"]) - ft))
        ii_p = r2(p_sem_h * (ef * o["p_issicms"] + ft))
        tt = o["t_cbs"] + o["t_ibs"]
        preco_hib = r2(p_sem_h + r2((p_sem_h - ii_p) * tt * COBRA[a]))
        cred_unit = r2(p_dentro * ef * o["p_cbs"]) + r2(p_dentro * ef * o["p_ibs"])
        psm = rec / (1 + (1 - ef * o["p_issicms"] - ft) * tt * COBRA[a])
        o.update(d_custo=d, p_dentro=p_dentro, cred_tot=cred_tot, p_sem_h=p_sem_h, issicms_p=ii_p, preco_hib=preco_hib,
                 cbs_ibs_no_preco_das=cred_unit, custo_real_das_pj=p_dentro - cred_unit,
                 cbs_ibs_no_preco_hib=preco_hib - p_sem_h, custo_real_hib_pj=p_sem_h,
                 margem_das_se_manter_preco=1 - ef - ft - d / rec,
                 margem_hib_se_manter_preco=1 - ef * (1 - o["p_cbs"] - o["p_ibs"]) - ft - (d - cred_tot) / psm)
        del o["_fora_t"]
    p0 = res[2026]["p_dentro"]
    for a in ANOS:
        res[a]["reaj_dentro"] = res[a]["p_dentro"] / p0 - 1
        res[a]["reaj_hib"] = res[a]["preco_hib"] / p0 - 1
    if comp_regular:
        rg = {a: regular(rec, F(comp_regular["iss"]), F(comp_regular["icms"]), comp, pj, F(0), "Presumido", a, forn, premissa, pre="rg_") for a in ANOS}
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
    # os 10 casos-ouro (mesmas entradas do calcula.py original), agora nos 8 anos
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
    # casos NOVOS (sem planilha): faixas e anexos que o gabarito não cobre
    "Caso11": lambda: caso_simples(250000, 3000000, "III", 20000, 0, "n/a", 1, "0.9", "0.3"),                 # Anexo III, 5ª faixa, efetiva 16,8% (> 14,93%): teto de ISS
    "Caso12": lambda: caso_simples(60000, 1900000, "III", 5000, 0, "n/a", 1, "0.9", 0),                       # Anexo III, 5ª faixa, efetiva 14,39% (< limite): partilha normal
    "Caso13": lambda: caso_simples(50000, 600000, "II", 25000, "0.4", "II", 600000, 1, 0),                     # Anexo II (indústria), 3ª faixa, fornecedor Simples Anexo II
    "Caso14": lambda: caso_simples(120000, 2500000, "IV", 30000, 0, "n/a", 1, 1, "0.3"),                      # Anexo IV, 5ª faixa, efetiva 14,65% (> 12,5%): teto de ISS
    "Caso15": lambda: caso_simples(40000, 500000, "IV", 6000, 0, "n/a", 1, 0.5, 0),                           # Anexo IV, 3ª faixa
    "Caso16": lambda: caso_simples(35000, 600000, "V", 4000, 0, "n/a", 1, "0.8", 0),                          # Anexo V, 3ª faixa
    "Caso17": lambda: caso_simples(350000, 4000000, "I", 200000, 0, "n/a", 1, 1, 0, iss_p=0, icms_p="0.03"),   # Anexo I, 6ª faixa: ICMS por fora
    "Caso18": lambda: caso_simples(380000, 4200000, "III", 20000, 0, "n/a", 1, "0.9", 0, iss_p="0.05"),        # Anexo III, 6ª faixa: ISS por fora
    "Caso19": lambda: caso_regular(60000, "0.05", 0, 8000, "0.9", "0.3", "Presumido", premissa="preco_final"),  # premissa: fornecedores mantêm o preço final
    "Caso20": lambda: caso_regular(80000, "0.02", 0, 12000, "0.7", "0.3", "Presumido", forn=[(F(18000), "III", F(500000))]),  # Presumido com fornecedor do Simples
    "Caso21": lambda: caso_simples(250000, 3000000, "III", 20000, "0.3", "IV", 2500000, "0.9", "0.3"),        # fornecedor do Simples na regra especial (Anexo IV 5ª faixa)
}
# entradas dos casos novos (o teste monta a entrada do app a partir daqui)
def todos():
    return {c: {str(a): {k: v for k, v in r.items()} for a, r in f().items()} for c, f in CASOS.items()}

CHAVES_TAXA = {"t_cbs","t_ibs","pct_receita","pc_taxa","reajuste","nominal","efetiva","p_cbs","p_ibs","p_issicms","f_efetiva","f_pcbs","f_pibs","reaj_dentro","reaj_hib","margem_se_manter_preco","margem_das_se_manter_preco","margem_hib_se_manter_preco","rg_t_cbs","rg_t_ibs","rg_pct_receita","rg_pc_taxa","rg_reajuste","rg_margem_se_manter_preco"}
CHAVES_INT = {"faixa", "f_faixa"}
def fmt(k, v):
    v = F(v)
    if k in CHAVES_INT: return str(int(v))
    casas = 12 if k in CHAVES_TAXA else (3 if k in ("cbs", "ibs") else 2)
    n = floor(abs(v) * 10**casas + F(1, 2)); s = f"{n // 10**casas}.{str(n % 10**casas).zfill(casas)}"
    return ("-" if v < 0 and n != 0 else "") + s

if __name__ == "__main__":
    out = todos()
    ser = {c: {a: {k: fmt(k, v) for k, v in d.items()} for a, d in anos.items()} for c, anos in out.items()}
    dest = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, "casos-estendidos.json")
    json.dump(ser, open(dest, "w"), indent=0)
    print("gravado", dest, len(ser), "casos")
