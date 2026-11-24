import { OpError, areaUrl } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";
import { acessoDoUsuario } from "@/lib/chama-acesa/acesso";
import { carregarDias, carregarLigas, carregarMarcos, carregarMissoes, carregarVersiculos } from "@/lib/chama-acesa/conteudo-servidor";
import { codigoDe, carregarEstado, premiarConvidador, salvarEstado } from "@/lib/chama-acesa/persistencia";
import { diasLiberados, type Painel } from "@/lib/chama-acesa/painel";
import { atualizarLiga } from "@/lib/chama-acesa/ligas";
import { diasDasMetas, marcosLiberados } from "@/lib/chama-acesa/marcos";
import { aplicarAcao, atualizarParaHoje, dataSP, horaSP, registrarAcesso, type Acao, type Check, type Estado } from "@/lib/chama-acesa/regras";

// Jornada do Chama Acesa na conta de cada pessoa. As regras (chama, brasa, um dia por dia, dia 4 só com compra, XP, liga)
// rodam AQUI, no servidor, com o relógio de São Paulo; a tela só mostra. RLS: supabase/migrations/20261123_chama_acesa.sql.
type User = { id: string; email: string; name?: string };
type Area = Parameters<typeof acessoDoUsuario>[1];

async function exigir(user: { email: string }, area: Area) {
  const acesso = await acessoDoUsuario(user, area);
  if (!acesso?.app) throw new OpError("O Chama Acesa não está liberado para este e-mail.");
  return acesso;
}

function painel(estado: Estado, hoje: string, user: User, area: Area, acesso: Awaited<ReturnType<typeof exigir>>): Painel {
  const { dias, exemplo } = carregarDias();
  return {
    estado, hoje, hora: horaSP(), pago: acesso.pago, dias: diasLiberados(dias, acesso.pago), versiculos: carregarVersiculos(), ligas: carregarLigas(),
    semente: user.id, nome: (user.name || "").split(" ")[0] || "Você", codigo: codigoDe(user.id), conviteBase: `${areaUrl(area)}/gratis`,
    checkoutUrl: acesso.checkoutUrl, ofertas: acesso.ofertas, marcos: marcosLiberados(carregarMarcos(), estado.maior), missoes: carregarMissoes(), oferta365Url: acesso.oferta365Url, exemplo,
  };
}

/** Aplica o que mudou desde a última vez: acesso de hoje, brasa/apagar e a virada da semana da liga. */
function emDia(salvo: Estado, hoje: string, user: User) {
  return atualizarLiga(atualizarParaHoje(registrarAcesso(salvo, hoje), hoje), hoje, user.id, carregarLigas());
}

export async function GET(request: Request) {
  return withUser(request, async (user, area) => {
    const acesso = await exigir(user, area);
    const hoje = dataSP();
    const salvo = await carregarEstado(user.id);
    const estado = emDia(salvo, hoje, user);
    if (estado !== salvo) await salvarEstado(user.id, area.id, estado, user.name);
    return painel(estado, hoje, user, area, acesso);
  });
}

const CHECKS: Check[] = ["leu", "orou", "missao"];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { acao?: string; dia?: number; check?: string; valor?: boolean; horario?: string | null; acertos?: number; ids?: unknown };
  return withUser(request, async (user, area) => {
    const acesso = await exigir(user, area);
    let acao: Acao;
    if (body.acao === "check" && CHECKS.includes(body.check as Check)) acao = { tipo: "check", dia: Number(body.dia), check: body.check as Check };
    else if (body.acao === "jejum") acao = { tipo: "jejum", dia: Number(body.dia), valor: Boolean(body.valor) };
    else if (body.acao === "estudo") acao = { tipo: "estudo", dia: Number(body.dia) };
    else if (body.acao === "lembrete") acao = { tipo: "lembrete", horario: body.horario ? String(body.horario) : null };
    else if (body.acao === "pratica") acao = { tipo: "pratica", acertos: Number(body.acertos), ids: Array.isArray(body.ids) ? body.ids.map((x) => String(x).slice(0, 60)).slice(0, 5) : [] };
    else if (body.acao === "limparResultadoLiga") acao = { tipo: "limparResultadoLiga" };
    else if (body.acao === "limparAvisos") acao = { tipo: "limparAvisos" };
    else throw new OpError("Ação desconhecida.");
    const hoje = dataSP();
    const r = aplicarAcao(emDia(await carregarEstado(user.id), hoje, user), acao, hoje, acesso.pago, diasDasMetas(carregarMarcos()));
    if (r.erro) throw new OpError(r.erro);
    await salvarEstado(user.id, area.id, r.estado, user.name);
    // Amigo convidado completou o dia 1: quem convidou ganha XP e brasa (uma vez só).
    if (r.completouDia === 1) await premiarConvidador(area.id, user.id, hoje).catch((e) => console.error("chama-convite", e));
    return { ...painel(r.estado, hoje, user, area, acesso), completouDia: r.completouDia, novasMedalhas: r.novasMedalhas, ganhouBrasa: r.ganhouBrasa, xpGanho: r.xpGanho };
  });
}
