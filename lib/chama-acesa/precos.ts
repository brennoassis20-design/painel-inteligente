// Preços do Chama Acesa (texto de tela). Os valores reais cobrados são os das ofertas na Eduzz; aqui só o que aparece escrito.
export const PRECO_MENSAL = "R$ 19,90";
export const PRECO_VITALICIO = "R$ 147";
/** 12 meses no mensal (12 x R$ 19,90). Aparece na tela de cobrança como comparação com o vitalício. */
export const TOTAL_MENSAL_12_MESES = "R$ 238,80";

/** Parcela real do checkout do vitalício (Eduzz, com juros para o comprador). Vale quando CHAMA_PARCELA_VITALICIO não está definida. */
export const PARCELA_PADRAO = "12x de R$ 15,20";

export interface OfertasChama {
  /** Checkout Eduzz do plano vitalício (R$ 147 em até 12x). */
  vitalicioUrl: string | null;
  /** Checkout Eduzz da assinatura mensal (R$ 19,90/mês). */
  mensalUrl: string | null;
  /** Texto pronto da parcela (ex.: "12x de R$ 14,96"). Vazio = a tela diz "R$ 147 à vista ou parcelado". */
  parcelaVitalicio: string | null;
}

/** Textos do bloco do vitalício: linha grande e linha de apoio. */
export function textosVitalicio(parcela: string | null | undefined): { grande: string; apoio: string } {
  const p = (parcela || "").trim();
  return p
    ? { grande: p, apoio: `ou ${PRECO_VITALICIO} à vista` }
    : { grande: `${PRECO_VITALICIO} à vista ou parcelado`, apoio: "pagamento único" };
}

/** Tem as duas ofertas novas? Sem nenhuma, a tela cai no botão único do link antigo (CHAMA_CHECKOUT_URL). */
export const temOfertas = (o: OfertasChama | null | undefined): o is OfertasChama => Boolean(o && (o.vitalicioUrl || o.mensalUrl));
