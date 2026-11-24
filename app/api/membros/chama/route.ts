import { OpError } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";
import { acessoDoUsuario } from "@/lib/chama-acesa/acesso";
import { carregarDias } from "@/lib/chama-acesa/conteudo-servidor";
import { carregarEstado, salvarEstado } from "@/lib/chama-acesa/persistencia";
import { diasLiberados, type Painel } from "@/lib/chama-acesa/painel";
import { aplicarAcao, atualizarParaHoje, dataSP, type Acao, type Check, type Estado } from "@/lib/chama-acesa/regras";

// Jornada do Chama Acesa na conta de cada pessoa. As regras (chama, brasa, um dia por dia, dia 4 só com compra)
// rodam AQUI, no servidor, com o relógio de São Paulo; a tela só mostra. RLS: supabase/migrations/20261123_chama_acesa.sql.
async function exigir(user: { email: string }, area: Parameters<typeof acessoDoUsuario>[1]) {
  const acesso = await acessoDoUsuario(user, area);
  if (!acesso?.app) throw new OpError("O Chama Acesa não está liberado para este e-mail.");
  return acesso;
}

function painel(estado: Estado, hoje: string, pago: boolean, acesso: Awaited<ReturnType<typeof exigir>>): Painel {
  const { dias, exemplo } = carregarDias();
  return { estado, hoje, pago, dias: diasLiberados(dias, pago), checkoutUrl: acesso.checkoutUrl, oferta365Url: acesso.oferta365Url, exemplo };
}

export async function GET(request: Request) {
  return withUser(request, async (user, area) => {
    const acesso = await exigir(user, area);
    const hoje = dataSP();
    const salvo = await carregarEstado(user.id);
    const estado = atualizarParaHoje(salvo, hoje);
    if (estado !== salvo) await salvarEstado(user.id, area.id, estado);
    return painel(estado, hoje, acesso.pago, acesso);
  });
}

const CHECKS: Check[] = ["leu", "orou", "missao"];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { acao?: string; dia?: number; check?: string; valor?: boolean; horario?: string | null };
  return withUser(request, async (user, area) => {
    const acesso = await exigir(user, area);
    let acao: Acao;
    if (body.acao === "check" && CHECKS.includes(body.check as Check)) acao = { tipo: "check", dia: Number(body.dia), check: body.check as Check };
    else if (body.acao === "jejum") acao = { tipo: "jejum", dia: Number(body.dia), valor: Boolean(body.valor) };
    else if (body.acao === "lembrete") acao = { tipo: "lembrete", horario: body.horario ? String(body.horario) : null };
    else if (body.acao === "limparAvisos") acao = { tipo: "limparAvisos" };
    else throw new OpError("Ação desconhecida.");
    const hoje = dataSP();
    const r = aplicarAcao(await carregarEstado(user.id), acao, hoje, acesso.pago);
    if (r.erro) throw new OpError(r.erro);
    await salvarEstado(user.id, area.id, r.estado);
    return { ...painel(r.estado, hoje, acesso.pago, acesso), completouDia: r.completouDia, novasMedalhas: r.novasMedalhas, ganhouBrasa: r.ganhouBrasa };
  });
}
