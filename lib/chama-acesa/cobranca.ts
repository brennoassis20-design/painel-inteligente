// Cobrança no dia seguinte ao dia 3 (só servidor): push + e-mail para quem está no grátis e ainda não comprou.
import { supabaseAdminAuthRequest, supabaseRest } from "@/lib/panel-server";
import { areaUrl, type Area } from "@/lib/membros";
import { brevoReady, sendCustomViaBrevo } from "@/lib/membros-acesso-email";
import { pushParaUsuarios } from "@/lib/membros-avisos";
import { tagLink } from "@/lib/membros-utm";
import { acessoDoUsuario } from "./acesso";
import { quemRecebeCobranca, type CandidatoCobranca, type Texto } from "./lembretes";
import { somarDias } from "./regras";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function emailHtml(area: Area, titulo: string, corpo: string, url: string) {
  return `<div style="font-family:system-ui,Arial,sans-serif;background:#0a0f1f;color:#f4f1ea;padding:28px;max-width:480px;margin:auto;border-radius:16px">
<h2 style="margin:0 0 12px;color:#ffc857">${esc(titulo)}</h2><p style="font-size:16px;line-height:1.5">${esc(corpo)}</p>
<p style="margin:24px 0"><a href="${esc(url)}" style="background:#ff8a1f;color:#2a1200;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:12px;display:inline-block">Continuar a minha jornada</a></p>
<p style="font-size:12px;color:#aab2cf">${esc(area.brand_name)}</p></div>`;
}

export async function rodarCobranca(area: Area, hoje: string, textos: Texto[], dry: boolean) {
  const ontem = somarDias(hoje, -1);
  const dias3 = await supabaseRest<{ user_id: string }[]>(`/chama_dias?dia=eq.3&concluido_em=eq.${ontem}&select=user_id&limit=500`);
  if (!dias3.length) return { candidatos: 0, enviados: 0, emails: 0 };
  const ids = dias3.map((d) => d.user_id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const perfis = await supabaseRest<{ user_id: string; nome: string | null; chama_atual: number; dias_feitos: number | null; lembretes_hist: Record<string, string> | null; cobranca3_enviada: string | null }[]>(
    `/chama_perfil?user_id=in.(${ids.join(",")})&area_id=eq.${area.id}&select=user_id,nome,chama_atual,dias_feitos,lembretes_hist,cobranca3_enviada`,
  );
  const emails = new Map<string, string>();
  const cands: CandidatoCobranca[] = [];
  for (const p of perfis) {
    const r = await supabaseAdminAuthRequest(`/admin/users/${p.user_id}`);
    const email = r.ok ? (((await r.json()) as { email?: string }).email || "").toLowerCase() : "";
    if (!email) continue;
    emails.set(p.user_id, email);
    const acesso = await acessoDoUsuario({ email }, area).catch(() => null);
    cands.push({ user_id: p.user_id, nome: p.nome, chama_atual: p.chama_atual, dia3: ontem, pago: Boolean(acesso?.pago), enviada: Boolean(p.cobranca3_enviada), dias_feitos: p.dias_feitos ?? 3, lembretes_hist: p.lembretes_hist ?? {} });
  }
  const alvos = quemRecebeCobranca(cands, hoje, textos);
  if (dry) return { candidatos: alvos.length, enviados: 0, emails: 0, previa: alvos.map((a) => ({ titulo: a.titulo, corpo: a.corpo })) };
  const checkout = process.env.CHAMA_CHECKOUT_URL?.trim();
  let enviados = 0;
  let mails = 0;
  for (const a of alvos) {
    const email = emails.get(a.candidato.user_id)!;
    const link = (medium: "aviso-push" | "aviso-email") => (checkout && /^https:\/\//.test(checkout) ? tagLink(checkout, { medium, campaign: "chama-acesa", content: "dia-4", provider: "eduzz", email }).url : "");
    enviados += await pushParaUsuarios(area.id, [a.candidato.user_id], { title: a.titulo, body: a.corpo, url: link("aviso-push") || `${areaUrl(area)}/?app=1`, tag: "chama-cobranca" });
    if (brevoReady(area) && link("aviso-email")) {
      try {
        await sendCustomViaBrevo(area, email, a.titulo, emailHtml(area, a.titulo, a.corpo, link("aviso-email")), "chama-dia4");
        mails += 1;
      } catch (e) {
        console.error("chama-cobranca-email", e instanceof Error ? e.message : e);
      }
    }
    await supabaseRest(`/chama_perfil?user_id=eq.${a.candidato.user_id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ cobranca3_enviada: hoje }) });
  }
  return { candidatos: alvos.length, enviados, emails: mails };
}
