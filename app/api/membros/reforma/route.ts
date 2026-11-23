import { supabaseRest } from "@/lib/panel-server";
import { OpError } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";
import { acessoDoUsuario } from "@/lib/reforma-app-acesso";

// Clientes e escritório do App da Reforma, na conta do contador (tabelas reforma_escritorios e reforma_clientes).
// Passa pelo servidor com a chave de serviço e SEMPRE filtra pelo id de quem está logado; o RLS do banco
// (supabase/migrations/20261123_reforma_app.sql) garante o mesmo se alguém tentar falar direto com o Supabase.
const enc = encodeURIComponent;
const MAX_CLIENTES = 500;
const MAX_LOGO = 400_000; // caracteres do data URL (~300 KB)
const MAX_DADOS = 60_000; // caracteres do formulário do cliente em JSON
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LinhaEscritorio = { nome: string; crc: string; whatsapp: string; cor: string; logo: string | null; configurado: boolean; updated_at: string };
type LinhaCliente = { id: string; nome: string; rascunho: boolean; passo: number; dados: unknown; created_at: string; updated_at: string };

function texto(v: unknown, max: number) {
  return String(v ?? "").trim().slice(0, max);
}

async function exigirApp(user: { email: string }, area: Parameters<typeof acessoDoUsuario>[1]) {
  const acesso = await acessoDoUsuario(user, area);
  if (!acesso?.app) throw new OpError("O App da Reforma não está liberado para este e-mail.");
}

export async function GET(request: Request) {
  return withUser(request, async (user, area) => {
    await exigirApp(user, area);
    const esc = await supabaseRest<LinhaEscritorio[]>(`/reforma_escritorios?user_id=eq.${user.id}&select=nome,crc,whatsapp,cor,logo,configurado,updated_at`);
    const cli = await supabaseRest<LinhaCliente[]>(`/reforma_clientes?user_id=eq.${user.id}&select=id,nome,rascunho,passo,dados,created_at,updated_at&order=updated_at.desc&limit=${MAX_CLIENTES}`);
    const e = esc[0];
    return {
      escritorio: e
        ? { nome: e.nome, crc: e.crc, whatsapp: e.whatsapp, cor: e.cor, logo: e.logo, configurado: e.configurado, atualizadoEm: e.updated_at }
        : { nome: "", crc: "", whatsapp: "", cor: "#1F4E79", logo: null, configurado: false, atualizadoEm: "" },
      clientes: cli.map((c) => ({ id: c.id, criadoEm: c.created_at, atualizadoEm: c.updated_at, rascunho: c.rascunho, passo: c.passo, form: c.dados })),
    };
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { acao?: string; escritorio?: Record<string, unknown>; cliente?: Record<string, unknown>; id?: string };
  return withUser(request, async (user, area) => {
    await exigirApp(user, area);
    if (body.acao === "escritorio") {
      const e = body.escritorio || {};
      const cor = /^#[0-9a-f]{6}$/i.test(String(e.cor || "")) ? String(e.cor) : "#1F4E79";
      const logo = typeof e.logo === "string" && e.logo.startsWith("data:image/") ? e.logo : null;
      if (logo && logo.length > MAX_LOGO) throw new OpError("A logo ficou grande demais. Use uma imagem menor.");
      const linha = {
        user_id: user.id,
        area_id: area.id,
        nome: texto(e.nome, 120),
        crc: texto(e.crc, 40),
        whatsapp: texto(e.whatsapp, 30),
        cor,
        logo,
        configurado: Boolean(e.configurado),
        updated_at: new Date().toISOString(),
      };
      await supabaseRest(`/reforma_escritorios?on_conflict=user_id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(linha),
      });
      return { ok: true };
    }
    if (body.acao === "cliente") {
      const c = body.cliente || {};
      const id = String(c.id || "");
      if (!UUID.test(id)) throw new OpError("Cliente sem identificação válida.");
      const dados = JSON.stringify(c.form ?? {});
      if (dados.length > MAX_DADOS) throw new OpError("Os dados do cliente ficaram grandes demais.");
      const existe = await supabaseRest<{ id: string }[]>(`/reforma_clientes?id=eq.${enc(id)}&user_id=eq.${user.id}&select=id`);
      if (!existe.length) {
        // id que já existe e não é desta pessoa: nunca sobrescreve o cliente de outro usuário.
        const alheio = await supabaseRest<{ id: string }[]>(`/reforma_clientes?id=eq.${enc(id)}&select=id`);
        if (alheio.length) throw new OpError("Cliente sem identificação válida.");
        const total = await supabaseRest<{ id: string }[]>(`/reforma_clientes?user_id=eq.${user.id}&select=id&limit=${MAX_CLIENTES}`);
        if (total.length >= MAX_CLIENTES) throw new OpError(`Limite de ${MAX_CLIENTES} clientes. Apague os que não usa mais.`);
      }
      const form = (c.form || {}) as { nome?: unknown };
      const linha = {
        id,
        user_id: user.id,
        nome: texto(form.nome, 120),
        rascunho: Boolean(c.rascunho),
        passo: Math.min(5, Math.max(1, Number(c.passo) || 1)),
        dados: JSON.parse(dados),
        updated_at: new Date().toISOString(),
      };
      await supabaseRest(`/reforma_clientes?on_conflict=id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(linha),
      });
      return { ok: true };
    }
    if (body.acao === "apagar") {
      const id = String(body.id || "");
      if (!UUID.test(id)) throw new OpError("Cliente sem identificação válida.");
      await supabaseRest(`/reforma_clientes?id=eq.${enc(id)}&user_id=eq.${user.id}`, { method: "DELETE" });
      return { ok: true };
    }
    throw new OpError("Ação desconhecida.");
  });
}
