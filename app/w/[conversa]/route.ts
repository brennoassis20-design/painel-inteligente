import { OFERTA, rastreado } from "@/app/metodo-genio/oferta";

// Link do checkout enviado no WhatsApp pela resposta pronta do Chatwoot:
// genio.brennolimaoficial.com/w/{{conversation.id}}
// Lê na conversa de qual anúncio o lead veio (additional_attributes.referral),
// busca na Meta os nomes da campanha, do conjunto e do anúncio e manda para a
// Cakto com as UTMs no mesmo padrão dos anúncios (utm_term = conjunto).
// Qualquer falha cai no checkout com a origem "whatsapp": a venda nunca trava.

type Referral = {
  source_id?: string;
  source_type?: string;
  ctwa_clid?: string;
};

type Origem = {
  campanha: string;
  campanhaId: string;
  conjunto: string;
  anuncio: string;
};

const TEMPO_LIMITE = 2500;

async function buscarJson(url: string, init: RequestInit = {}) {
  const resposta = await fetch(url, { ...init, signal: AbortSignal.timeout(TEMPO_LIMITE), cache: "no-store" });
  if (!resposta.ok) throw new Error(`${resposta.status} em ${new URL(url).pathname}`);
  return resposta.json();
}

async function referralDaConversa(conversa: string): Promise<Referral | null> {
  const base = process.env.CHATWOOT_URL?.replace(/\/$/, "");
  const conta = process.env.CHATWOOT_ACCOUNT_ID;
  const token = process.env.CHATWOOT_API_TOKEN;
  if (!base || !conta || !token) return null;

  const dados = await buscarJson(`${base}/api/v1/accounts/${conta}/conversations/${conversa}`, {
    headers: { api_access_token: token },
  });
  const referral = dados?.additional_attributes?.referral;
  return referral && typeof referral === "object" ? (referral as Referral) : null;
}

async function origemDoAnuncio(anuncioId: string): Promise<Origem | null> {
  const token = process.env.META_ADS_TOKEN;
  if (!token || !/^\d+$/.test(anuncioId)) return null;

  const campos = "name,adset{name},campaign{id,name}";
  const dados = await buscarJson(
    `https://graph.facebook.com/v23.0/${anuncioId}?fields=${encodeURIComponent(campos)}&access_token=${token}`,
  );
  if (!dados?.campaign?.name) return null;
  return {
    campanha: dados.campaign.name,
    campanhaId: dados.campaign.id,
    conjunto: dados.adset?.name || "",
    anuncio: dados.name || anuncioId,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ conversa: string }> }) {
  const { conversa } = await params;
  const id = /^\d{1,10}$/.test(conversa) ? conversa : "";
  const sck = id ? `wa-${id}` : "wa";

  let destino = rastreado(OFERTA.checkout, "whatsapp", "direto", "metodo-genio", "checkout-chatwoot", {
    src: "whatsapp",
    sck,
  });

  if (id) {
    try {
      const referral = await referralDaConversa(id);
      const anuncioId = referral?.source_id ? String(referral.source_id) : "";
      if (anuncioId) {
        const origem = await origemDoAnuncio(anuncioId).catch(() => null);
        destino = origem
          ? rastreado(OFERTA.checkout, "facebook", "whatsapp", origem.campanha, origem.anuncio, {
              utm_term: origem.conjunto,
              utm_id: origem.campanhaId,
              src: "whatsapp",
              sck,
            })
          : // Veio de anúncio, mas a Meta não respondeu: guarda o id do anúncio para cruzar depois.
            rastreado(OFERTA.checkout, "facebook", "whatsapp", "metodo-genio", anuncioId, { src: "whatsapp", sck });
      }
    } catch (erro) {
      console.error("[w] origem da conversa", id, erro instanceof Error ? erro.message : erro);
    }
  }

  return new Response(null, {
    status: 302,
    headers: { Location: destino, "Cache-Control": "no-store" },
  });
}
