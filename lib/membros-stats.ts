// Gênio Play: painel de estatísticas da área (cada produtor vê a dele; a área 1 vê também as dos produtores).
// "Venda pela área" = a venda veio com utm_source=membros (link do cadeado/upsell) OU o mesmo aluno
// abriu o checkout daquele produto pela área nos 7 dias antes da compra.
import { supabaseRest } from "@/lib/panel-server";
import { type Area, isMainArea, listProducts, type Product } from "@/lib/membros";

const DAY = 24 * 60 * 60 * 1000;
const TZ = "America/Sao_Paulo";
const ATTRIBUTION_DAYS = 7;
const PAGE = 1000;

type Ev = { email: string | null; product_id: string | null; kind: string; meta: Record<string, unknown> | null; created_at: string };
type Sale = { email: string; product_id: string; valor: number; at: string; area: boolean; via: string; order: string };

// O Supabase devolve no máximo 1000 linhas por vez: busca em páginas.
async function fetchAll<T>(path: string, max = 50000) {
  const out: T[] = [];
  for (let offset = 0; offset < max; offset += PAGE) {
    const rows = await supabaseRest<T[]>(`${path}${path.includes("?") ? "&" : "?"}limit=${PAGE}&offset=${offset}`);
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const dayKey = (iso: string | number) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const money = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : null);
const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Vendas da Cakto que chegam pelo webhook do Painel (só a área 1 tem produtos vendidos assim).
async function caktoPanelSales(products: Product[], since: string) {
  const byExternal = new Map<string, Product>();
  for (const product of products) for (const id of product.external_ids || []) if (id.startsWith("cakto:")) byExternal.set(id.slice(6), product);
  if (!byExternal.size) return [];
  type Row = { processed_at: string; payload: { data?: Record<string, unknown> } };
  const rows = await fetchAll<Row>(
    `/webhook_events?provider=eq.cakto&event_type=eq.purchase_approved&processed_at=gte.${encodeURIComponent(since)}&select=processed_at,payload&order=processed_at.asc`,
    10000,
  );
  const out: { email: string; product_id: string; valor: number | null; at: string; utm: string; via: string; order: string }[] = [];
  for (const row of rows) {
    const data = row.payload?.data || {};
    const product = byExternal.get(String((data.product as Record<string, unknown>)?.id || ""));
    const email = String((data.customer as Record<string, unknown>)?.email || "").trim().toLowerCase();
    if (!product || !email) continue;
    out.push({
      email,
      product_id: product.id,
      valor: money(data.amount) ?? money(data.baseAmount),
      at: String(data.paidAt || row.processed_at),
      utm: String(data.utm_source || ""),
      via: String(data.utm_content || ""),
      order: `cakto:${String(data.id || "")}`,
    });
  }
  return out;
}

export async function areaStats(area: Area, days = 30) {
  const period = [7, 30, 90].includes(days) ? days : 30;
  const now = Date.now();
  const start = new Date(now - period * DAY).toISOString();
  const lookback = new Date(now - (period + ATTRIBUTION_DAYS) * DAY).toISOString();
  const products = await listProducts(area);
  const ids = products.map((product) => product.id);
  const productById = new Map(products.map((product) => [product.id, product]));
  const none = "00000000-0000-0000-0000-000000000000";
  const inIds = `(${ids.join(",") || none})`;

  const [events, access, leads, lessons, progress, panelSales] = await Promise.all([
    fetchAll<Ev>(`/mp_events?area_id=eq.${area.id}&created_at=gte.${encodeURIComponent(lookback)}&select=email,product_id,kind,meta,created_at&order=created_at.asc`),
    fetchAll<{ email: string; product_id: string; status: string; created_at: string; provider: string | null }>(
      `/mp_access?product_id=in.${inIds}&select=email,product_id,status,created_at,provider`,
    ),
    fetchAll<{ email: string; created_at: string }>(`/mp_leads?area_id=eq.${area.id}&select=email,created_at`),
    fetchAll<{ id: string; title: string; product_id: string; published: boolean }>(`/mp_lessons?product_id=in.${inIds}&select=id,title,product_id,published`),
    fetchAll<{ user_id: string; lesson_id: string; product_id: string; completed: boolean; updated_at: string }>(
      `/mp_progress?product_id=in.${inIds}&completed=eq.true&select=user_id,lesson_id,product_id,completed,updated_at`,
    ),
    isMainArea(area) ? caktoPanelSales(products, lookback).catch(() => []) : Promise.resolve([]),
  ]);

  const inPeriod = (iso: string) => iso >= start;
  const recent = events.filter((event) => inPeriod(event.created_at));
  const checkouts = events.filter((event) => event.kind === "checkout_aberto" && event.email && event.product_id);

  // Checkout aberto pela área nos 7 dias antes da compra (mesmo aluno, mesmo produto).
  const openedFromArea = (email: string, productId: string, at: string) => {
    const atMs = new Date(at).getTime();
    const hit = [...checkouts]
      .reverse()
      .find(
        (event) =>
          event.email === email &&
          event.product_id === productId &&
          new Date(event.created_at).getTime() <= atMs &&
          atMs - new Date(event.created_at).getTime() <= ATTRIBUTION_DAYS * DAY,
      );
    return hit ? String(hit.meta?.utm_content || "cadeado") : null;
  };

  const price = (productId: string) => (productById.get(productId)?.price_cents || 0) / 100;
  const sales: Sale[] = [];
  const seenOrders = new Set<string>();
  for (const event of events) {
    if (event.kind !== "compra" || !event.email || !event.product_id || !inPeriod(event.created_at)) continue;
    const meta = event.meta || {};
    const order = `${String(meta.provider || "")}:${String(meta.order || "")}:${event.product_id}`;
    if (meta.order) {
      if (seenOrders.has(order)) continue;
      seenOrders.add(order);
    }
    const via = String(meta.utm_source || "") === "membros" ? String(meta.utm_content || "cadeado") : openedFromArea(event.email, event.product_id, event.created_at);
    sales.push({ email: event.email, product_id: event.product_id, valor: money(meta.valor) ?? price(event.product_id), at: event.created_at, area: Boolean(via), via: via || "", order });
  }
  for (const sale of panelSales) {
    if (!inPeriod(sale.at)) continue;
    const order = `${sale.order}:${sale.product_id}`;
    if (seenOrders.has(order)) continue;
    seenOrders.add(order);
    const via = sale.utm === "membros" ? sale.via || "cadeado" : openedFromArea(sale.email, sale.product_id, sale.at);
    sales.push({ email: sale.email, product_id: sale.product_id, valor: sale.valor ?? price(sale.product_id), at: sale.at, area: Boolean(via), via: via || "", order });
  }
  const areaSales = sales.filter((sale) => sale.area);
  const sum = (list: Sale[]) => Math.round(list.reduce((total, sale) => total + sale.valor, 0) * 100) / 100;

  // Alunos
  const active = access.filter((row) => row.status === "active");
  const students = new Set([...active.map((row) => row.email.toLowerCase()), ...leads.map((row) => row.email.toLowerCase())]);
  const newStudents = new Set([
    ...access.filter((row) => inPeriod(row.created_at) && !String(row.provider || "").startsWith("import")).map((row) => row.email.toLowerCase()),
    ...leads.filter((row) => inPeriod(row.created_at)).map((row) => row.email.toLowerCase()),
  ]);
  const opens = recent.filter((event) => event.kind === "aula_aberta" && event.email);
  const watching = new Set([...opens.map((event) => String(event.email))]);
  const completedInPeriod = progress.filter((row) => inPeriod(row.updated_at));

  // Inativos (sem abrir aula há 14 dias): só depois de 14 dias medindo, senão todo mundo pareceria parado.
  const firstOpen = events.find((event) => event.kind === "aula_aberta")?.created_at;
  const tracking14 = firstOpen ? now - new Date(firstOpen).getTime() >= 14 * DAY : false;
  let inactive: number | null = null;
  if (tracking14) {
    const since14 = new Date(now - 14 * DAY).toISOString();
    const recentViewers = new Set(events.filter((event) => event.kind === "aula_aberta" && event.created_at >= since14).map((event) => String(event.email)));
    inactive = [...new Set(active.map((row) => row.email.toLowerCase()))].filter((email) => !recentViewers.has(email)).length;
  }

  // Funil e conclusão por produto (pessoas únicas).
  const people = (kind: string, productId: string) => new Set(recent.filter((event) => event.kind === kind && event.product_id === productId && event.email).map((event) => event.email)).size;
  const byProduct = products.map((product) => {
    const own = sales.filter((sale) => sale.product_id === product.id);
    const ownArea = own.filter((sale) => sale.area);
    const publishedLessons = lessons.filter((lesson) => lesson.product_id === product.id && lesson.published).length;
    const owners = new Set(active.filter((row) => row.product_id === product.id).map((row) => row.email.toLowerCase())).size;
    const doneCount = progress.filter((row) => row.product_id === product.id).length;
    const cadeado = people("cadeado_aberto", product.id);
    const checkout = people("checkout_aberto", product.id);
    return {
      id: product.id,
      titulo: product.title,
      publicado: product.published,
      gratuito: product.is_free,
      alunos: owners,
      aulas: publishedLessons,
      conclusao: product.is_free ? null : pct(doneCount, owners * publishedLessons),
      cadeado_aberto: cadeado,
      checkout_aberto: checkout,
      pagamento_gerado: people("pagamento_gerado", product.id),
      vendas_area: ownArea.length,
      receita_area: sum(ownArea),
      vendas_total: own.length,
      receita_total: sum(own),
      conversao_cadeado: pct(ownArea.length, cadeado),
      assistiram: new Set(opens.filter((event) => event.product_id === product.id).map((event) => event.email)).size,
    };
  });

  // Série diária (horário de Brasília).
  const series: { dia: string; vendas_area: number; receita_area: number; vendas_total: number; checkouts: number; cadeados: number }[] = [];
  for (let i = period - 1; i >= 0; i -= 1) {
    const key = dayKey(now - i * DAY);
    const daySales = sales.filter((sale) => dayKey(sale.at) === key);
    const dayArea = daySales.filter((sale) => sale.area);
    series.push({
      dia: key,
      vendas_area: dayArea.length,
      receita_area: sum(dayArea),
      vendas_total: daySales.length,
      checkouts: recent.filter((event) => event.kind === "checkout_aberto" && dayKey(event.created_at) === key).length,
      cadeados: recent.filter((event) => event.kind === "cadeado_aberto" && dayKey(event.created_at) === key).length,
    });
  }

  // Aulas mais vistas.
  const lessonTitle = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const views = new Map<string, Set<string>>();
  for (const event of opens) {
    const id = String(event.meta?.aula || "");
    if (!lessonTitle.has(id)) continue;
    if (!views.has(id)) views.set(id, new Set());
    views.get(id)!.add(String(event.email));
  }
  const topLessons = [...views.entries()]
    .map(([id, set]) => ({ aula: lessonTitle.get(id)!.title, produto: productById.get(lessonTitle.get(id)!.product_id)?.title || "", alunos: set.size }))
    .sort((a, b) => b.alunos - a.alunos)
    .slice(0, 8);

  const recentSales = [...areaSales]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 25)
    .map((sale) => ({ quando: sale.at, email: sale.email, produto: productById.get(sale.product_id)?.title || "", valor: sale.valor, origem: sale.via === "upsell" ? "Oferta no fim das aulas" : "Cadeado (vitrine)" }));

  const funnel = {
    cadeado_aberto: new Set(recent.filter((event) => event.kind === "cadeado_aberto").map((event) => event.email)).size,
    checkout_aberto: new Set(recent.filter((event) => event.kind === "checkout_aberto").map((event) => event.email)).size,
    pagamento_gerado: new Set(recent.filter((event) => event.kind === "pagamento_gerado").map((event) => event.email)).size,
    compraram_pela_area: new Set(areaSales.map((sale) => sale.email)).size,
  };

  // Insights: só o que dá para agir, com número.
  const insights: { tipo: "bom" | "atencao" | "dica"; texto: string }[] = [];
  const best = [...byProduct].filter((row) => row.receita_area > 0).sort((a, b) => b.receita_area - a.receita_area)[0];
  if (best) insights.push({ tipo: "bom", texto: `${best.titulo} é o que mais vende por dentro da área: ${best.vendas_area} venda(s), ${brl(best.receita_area)} em ${period} dias.` });
  for (const row of byProduct) {
    if (row.cadeado_aberto >= 10 && (row.checkout_aberto / row.cadeado_aberto) < 0.1)
      insights.push({ tipo: "atencao", texto: `${row.cadeado_aberto} alunos abriram o cadeado de ${row.titulo}, mas só ${row.checkout_aberto} clicaram para comprar. Reforce a oferta no cadeado (promessa, preço, vídeo).` });
    if (row.checkout_aberto >= 5 && row.vendas_area === 0)
      insights.push({ tipo: "atencao", texto: `${row.checkout_aberto} alunos abriram o checkout de ${row.titulo} e ninguém comprou. Confira o checkout e o preço, e mande uma recuperação.` });
    if (row.pagamento_gerado >= 3 && row.pagamento_gerado > row.vendas_total)
      insights.push({ tipo: "atencao", texto: `${row.pagamento_gerado} Pix/boletos gerados em ${row.titulo} sem pagamento. Vale um lembrete no WhatsApp.` });
    if (row.conclusao !== null && row.alunos >= 10 && row.conclusao < 15)
      insights.push({ tipo: "dica", texto: `Só ${row.conclusao}% das aulas de ${row.titulo} foram concluídas. Aulas mais curtas e um aviso de "continue de onde parou" ajudam.` });
  }
  const upsell = areaSales.filter((sale) => sale.via === "upsell");
  if (upsell.length) insights.push({ tipo: "bom", texto: `A oferta no fim das aulas gerou ${upsell.length} venda(s) (${brl(sum(upsell))}).` });
  if (inactive !== null && students.size >= 10 && inactive / Math.max(1, active.length) > 0.4)
    insights.push({ tipo: "dica", texto: `${inactive} alunos não abrem uma aula há 14 dias. Mande um aviso com a próxima aula ou uma novidade.` });
  if (!products.some((product) => product.upsell_product_id) && products.filter((product) => product.published).length >= 2)
    insights.push({ tipo: "dica", texto: "Nenhum produto tem oferta no fim das aulas. Configure em Produtos → Editar → Oferta (upsell)." });
  if (!insights.length)
    insights.push({ tipo: "dica", texto: "Ainda há poucos dados. Os números e as sugestões aparecem conforme os alunos usam a área e compram por ela." });

  return {
    periodo_dias: period,
    desde: start,
    medindo_aulas_desde: firstOpen || null,
    resumo: {
      alunos: students.size,
      novos_alunos: newStudents.size,
      cadastros_gratis: leads.filter((row) => inPeriod(row.created_at)).length,
      assistindo: watching.size,
      aulas_concluidas: completedInPeriod.length,
      inativos_14d: inactive,
      vendas_area: areaSales.length,
      receita_area: sum(areaSales),
      ticket_medio_area: areaSales.length ? Math.round((sum(areaSales) / areaSales.length) * 100) / 100 : null,
      vendas_total: sales.length,
      receita_total: sum(sales),
      reembolsos: recent.filter((event) => event.kind === "reembolso").length,
    },
    funil: { ...funnel, conversao: pct(funnel.compraram_pela_area, funnel.cadeado_aberto) },
    produtos: byProduct,
    serie: series,
    aulas_mais_vistas: topLessons,
    vendas_recentes: recentSales,
    insights: insights.slice(0, 8),
  };
}
