import { getSettings } from "@/lib/membros";
import { supabaseRest } from "@/lib/panel-server";

// Vendas aprovadas da Eduzz (entrega customizada) para a Guarda do Gênio na VPS.
// GET /api/membros/vendas?desde=<unix>&key=<webhook_secret>
// Formato igual ao da rota /vendas da Recuperação (Cakto): {eventos:[{evento, tipo, moeda, utm_*, ...}]}.
type Row = { processed_at: string; payload: { type?: string; fields?: Record<string, string> } };

// Produtos da Eduzz que são upsell/downsell (venda em fatura própria, depois da compra principal).
// Mesma lista do EDUZZ_NAO_FRENTE do Guarda do Gênio (meta-ads-mcp/agentes/guarda_genio.py).
const UPSELL_IDS = new Set(["3152842", "3152845", "3152847", "3152852", "3152850", "3152747"]);
// Campos de data da fatura que a entrega customizada da Eduzz pode trazer (nome exato a confirmar no 1º payload real).
const CADASTRO_KEYS = ["edz_fat_dtcad", "edz_fat_datacad", "edz_fat_data_cadastro", "edz_fat_dataabertura", "edz_fat_data", "edz_fat_dtabertura"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const settings = await getSettings();
  if (!settings?.webhook_secret || url.searchParams.get("key") !== settings.webhook_secret) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  const desde = Number(url.searchParams.get("desde") || 0);
  const since = new Date((Number.isFinite(desde) && desde > 0 ? desde : Date.now() / 1000 - 7 * 86400) * 1000).toISOString();
  const rows = await supabaseRest<Row[]>(
    `/webhook_events?provider=eq.membros:eduzz&processed_at=gte.${encodeURIComponent(since)}&select=processed_at,payload&order=processed_at.asc&limit=5000`,
  );
  const validas = rows.filter((row) => row.payload?.type === "create" && row.payload.fields?.edz_cli_email && row.payload.fields?.edz_fat_cod);
  const isBump = (f: Record<string, string>) => ["1", "true"].includes(String(f.edz_order_bump_item || "").toLowerCase());
  // Fatura só com itens de bump (ex.: Reforma 103627516 veio só com o item 3152840 'bump' de R$ 44,70 = principal + bump):
  // o item vale como venda principal da fatura.
  const faturas = new Map<string, { bump: boolean; todos: boolean }>();
  for (const row of validas) {
    const f = row.payload.fields || {};
    const atual = faturas.get(f.edz_fat_cod) || { bump: false, todos: true };
    if (isBump(f)) atual.bump = true;
    else atual.todos = false;
    faturas.set(f.edz_fat_cod, atual);
  }
  const eventos = validas.map((row) => {
      const f = row.payload.fields || {};
      const bump = isBump(f);
      const pai = f.edz_cnt_paicod ? String(f.edz_cnt_paicod) : "";
      const soBump = bump && faturas.get(f.edz_fat_cod)?.todos === true;
      // upsell: produto (ou o pai dele) está na lista de upsell/downsell. Senão, bump só-bump vira principal.
      const tipo = UPSELL_IDS.has(String(f.edz_cnt_cod)) || UPSELL_IDS.has(pai) ? "upsell" : bump && !soBump ? "bump" : "main";
      const cadastroKey = CADASTRO_KEYS.find((key) => f[key]);
      return {
        evento: "purchase_approved",
        plataforma: "eduzz",
        tipo,
        ...(tipo === "main" && bump ? { tipo_original: "bump", reclassificado: "fatura so com item bump" } : {}),
        moeda: "BRL",
        quando: row.processed_at,
        cadastro: cadastroKey ? f[cadastroKey] : null,
        fatura: f.edz_fat_cod,
        produto: f.edz_cnt_cod,
        produto_pai: pai,
        titulo: f.edz_cnt_titulo || "",
        valor: Number(f.edz_valorpago || 0),
        utm_source: f.edz_gtr_param1 || "",
        utm_campaign: f.edz_gtr_param2 || "",
        utm_medium: f.edz_gtr_param3 || "",
        utm_content: f.edz_gtr_param4 || "",
        utm_term: f.edz_gtr_param5 || "",
        utm_id: "",
      };
    });
  // A mesma fatura pode chegar mais de uma vez (reenvio da Eduzz): fica uma por fatura+produto.
  const seen = new Set<string>();
  const unicos = eventos.filter((e) => {
    const k = `${e.fatura}:${e.produto}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return Response.json({ eventos: unicos });
}
