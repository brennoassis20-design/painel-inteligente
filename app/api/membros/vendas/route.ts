import { getSettings } from "@/lib/membros";
import { supabaseRest } from "@/lib/panel-server";

// Vendas aprovadas da Eduzz (entrega customizada) para a Guarda do Gênio na VPS.
// GET /api/membros/vendas?desde=<unix>&key=<webhook_secret>
// Formato igual ao da rota /vendas da Recuperação (Cakto): {eventos:[{evento, tipo, moeda, utm_*, ...}]}.
type Row = { processed_at: string; payload: { type?: string; fields?: Record<string, string> } };

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
  const eventos = rows
    .filter((row) => row.payload?.type === "create" && row.payload.fields?.edz_cli_email && row.payload.fields?.edz_fat_cod)
    .map((row) => {
      const f = row.payload.fields || {};
      const bump = ["1", "true"].includes(String(f.edz_order_bump_item || "").toLowerCase());
      return {
        evento: "purchase_approved",
        plataforma: "eduzz",
        tipo: bump ? "bump" : "main",
        moeda: "BRL",
        quando: row.processed_at,
        fatura: f.edz_fat_cod,
        produto: f.edz_cnt_cod,
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
