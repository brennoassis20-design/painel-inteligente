import { getAuthAccount, setAuthMetadata, supabaseAdminAuthRequest, supabaseAuthRequest, supabaseRest } from "@/lib/panel-server";
import { logEvent, OpError } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";

// Minha conta (todas as áreas): dados, compras desta área, troca de senha e "não encontrei minha compra".
// Só enxerga o próprio e-mail (sessão) e só as compras da área do endereço.
const enc = encodeURIComponent;

type Compra = { status: string; provider: string | null; created_at: string; mp_products: { title: string; slug: string; cover_url: string | null; area_id: number } };
const PLATAFORMA: Record<string, string> = { eduzz: "Eduzz", ticto: "Ticto", cakto: "Cakto", hotmart: "Hotmart", kiwify: "Kiwify", greenn: "Greenn", manual: "Liberado pela equipe", gratis: "Cadastro grátis" };
const soDigitos = (v: unknown) => String(v || "").replace(/\D/g, "");

async function conta(user: { id: string; email: string; name?: string }, areaId: number) {
  const [account, leads, compras] = await Promise.all([
    getAuthAccount(user.id).catch(() => null),
    supabaseRest<{ name: string | null; whatsapp: string | null }[]>(`/mp_leads?area_id=eq.${areaId}&email=eq.${enc(user.email)}&select=name,whatsapp&limit=1`).catch(() => []),
    supabaseRest<Compra[]>(
      `/mp_access?email=eq.${enc(user.email)}&status=eq.active&select=status,provider,created_at,mp_products!inner(title,slug,cover_url,area_id)&mp_products.area_id=eq.${areaId}&order=created_at.desc&limit=200`,
    ),
  ]);
  const meta = (account?.user_metadata || {}) as { name?: string; full_name?: string; whatsapp?: string };
  // Uma linha por produto (a mesma compra pode ter chegado por mais de um aviso da plataforma).
  const vistos = new Set<string>();
  return {
    email: user.email,
    nome: String(meta.name || meta.full_name || leads[0]?.name || user.name || "").trim(),
    whatsapp: soDigitos(meta.whatsapp || leads[0]?.whatsapp),
    compras: compras
      .filter((c) => !vistos.has(c.mp_products.slug) && vistos.add(c.mp_products.slug))
      .map((c) => ({
        produto: c.mp_products.title,
        slug: c.mp_products.slug,
        capa: c.mp_products.cover_url,
        desde: c.created_at,
        plataforma: PLATAFORMA[(c.provider || "").toLowerCase()] || (c.provider ? c.provider[0].toUpperCase() + c.provider.slice(1) : ""),
      })),
  };
}

export async function GET(request: Request) {
  return withUser(request, (user, area) => conta(user, area.id));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { acao?: string; nome?: string; whatsapp?: string; atual?: string; nova?: string; outro_email?: string; plataforma?: string; pedido?: string };
  return withUser(request, async (user, area) => {
    if (body.acao === "dados") {
      const nome = String(body.nome || "").trim().slice(0, 80);
      let whatsapp = soDigitos(body.whatsapp);
      if (whatsapp && whatsapp.length <= 11) whatsapp = `55${whatsapp}`;
      if (whatsapp && (whatsapp.length < 12 || whatsapp.length > 15)) throw new OpError("Confira o seu WhatsApp com DDD.");
      if (!(await setAuthMetadata(user.id, { name: nome || null, whatsapp: whatsapp || null }))) throw new OpError("Não foi possível salvar agora. Tente de novo.");
      // Cadastro grátis desta área (se existir) acompanha a mudança, para os avisos e a recuperação chegarem certo.
      await supabaseRest(`/mp_leads?area_id=eq.${area.id}&email=eq.${enc(user.email)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ name: nome || null, whatsapp: whatsapp || null }),
      }).catch(() => undefined);
      return conta(user, area.id);
    }

    if (body.acao === "senha") {
      const atual = String(body.atual || "");
      const nova = String(body.nova || "");
      if (nova.length < 8) throw new OpError("A nova senha precisa de pelo menos 8 caracteres.");
      if (nova === atual) throw new OpError("A nova senha é igual à atual.");
      // Confere a senha atual antes de trocar (celular esquecido aberto não troca a senha de ninguém).
      const check = await supabaseAuthRequest("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: user.email, password: atual }) });
      if (!check.ok) throw new OpError(check.status === 429 ? "Muitas tentativas. Espere 1 minuto e tente de novo." : "A senha atual não confere.");
      const saved = await supabaseAdminAuthRequest(`/admin/users/${enc(user.id)}`, { method: "PUT", body: JSON.stringify({ password: nova }) });
      if (!saved.ok) throw new OpError("Não foi possível trocar a senha agora. Tente de novo em 1 minuto.");
      await logEvent(area.id, user.email, null, "senha_trocada");
      return { ok: true };
    }

    if (body.acao === "nao-achei") {
      // Só registra o caso (o painel/Carteiro enxerga). O envio do acesso ao outro e-mail é feito pela rota /senha,
      // que nunca diz se o e-mail tem compra (ninguém descobre compra alheia por aqui).
      await logEvent(area.id, user.email, null, "compra_nao_encontrada", {
        outro_email: String(body.outro_email || "").trim().toLowerCase().slice(0, 120) || null,
        plataforma: String(body.plataforma || "").slice(0, 30) || null,
        pedido: String(body.pedido || "").trim().slice(0, 60) || null,
      });
      return { ok: true };
    }

    throw new OpError("Ação desconhecida.");
  });
}
