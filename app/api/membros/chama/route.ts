import { OpError, areaUrl } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";
import { acessoDoUsuario } from "@/lib/chama-acesa/acesso";
import { carregarDias, carregarLigas, carregarMarcos, carregarMissoes, carregarVersiculos } from "@/lib/chama-acesa/conteudo-servidor";
import { codigoDe, carregarEstado, premiarConvidador, salvarEstado } from "@/lib/chama-acesa/persistencia";
import { diasLiberados, type Painel } from "@/lib/chama-acesa/painel";
import { atualizarLiga, type Linha } from "@/lib/chama-acesa/ligas";
import { carregarConta, membrosAtivos, type ContaGuardada } from "@/lib/chama-acesa/persistencia-conta";
import { ligaRealMinimo, outrosReais, rankingReal, type MembroRanking } from "@/lib/chama-acesa/ranking";
import { primeiroNome } from "@/lib/chama-acesa/conta";
import { diasDasMetas, marcosLiberados } from "@/lib/chama-acesa/marcos";
import { aplicarAcao, atualizarParaHoje, dataSP, horaSP, inicioSemana, registrarAcesso, type Acao, type Check, type Estado } from "@/lib/chama-acesa/regras";

// Jornada do Chama Acesa na conta de cada pessoa. As regras (chama, brasa, um dia por dia, dia 4 só com compra, XP, liga)
// rodam AQUI, no servidor, com o relógio de São Paulo; a tela só mostra. RLS: supabase/migrations/20261123_chama_acesa.sql.
type User = { id: string; email: string; name?: string };
type Area = Parameters<typeof acessoDoUsuario>[1];

async function exigir(user: { email: string }, area: Area) {
  const acesso = await acessoDoUsuario(user, area);
  if (!acesso?.app) throw new OpError("O Chama Acesa não está liberado para este e-mail.");
  return acesso;
}

// Quem está ativo na liga muda devagar: guarda a leitura por 60 s (a linha da própria pessoa sempre entra fresca).
const cacheMembros = new Map<string, { em: number; dados: MembroRanking[] | null }>();
async function membrosDaLiga(areaId: number, semana: string, indice: number) {
  const k = `${areaId}|${semana}|${indice}`;
  const c = cacheMembros.get(k);
  if (c && Date.now() - c.em < 60_000) return c.dados;
  const dados = await membrosAtivos(areaId, semana, indice);
  cacheMembros.set(k, { em: Date.now(), dados });
  if (cacheMembros.size > 200) cacheMembros.clear();
  return dados;
}

type RankingSemana = { real: Linha[] | null; outros: Linha[] | null };
const SEM_RANKING: RankingSemana = { real: null, outros: null };

/** Ranking da pessoa numa semana: `real` (liga só de membros, com o mínimo) ou `outros` (abaixo do mínimo: reais misturados aos fictícios). */
async function rankingDaSemana(area: Area, user: User, conta: ContaGuardada, semana: string, indice: number, xp: number): Promise<RankingSemana> {
  const outros = await membrosDaLiga(area.id, semana, indice);
  if (!outros) return SEM_RANKING;
  const cfg = carregarLigas();
  const eu: MembroRanking = { id: user.id, nome: conta.nomeExibicao || conta.nomeAuth || user.name || null, foto: conta.foto, mostrar: conta.mostrarNoRanking, xp };
  const real = rankingReal([...outros.filter((m) => m.id !== user.id), eu], user.id, semana, cfg, ligaRealMinimo());
  if (real) return { real, outros: null };
  const mistos = outrosReais(outros, user.id, cfg.tamanho - 1);
  return { real: null, outros: mistos.length ? mistos : null };
}

function painel(estado: Estado, hoje: string, user: User, area: Area, acesso: Awaited<ReturnType<typeof exigir>>, conta: ContaGuardada, ranking: RankingSemana): Painel {
  const { dias, exemplo } = carregarDias();
  return {
    estado, hoje, hora: horaSP(), pago: acesso.pago, dias: diasLiberados(dias, acesso.pago), versiculos: carregarVersiculos(), ligas: carregarLigas(),
    semente: user.id, nome: primeiroNome(conta.nomeExibicao || conta.nomeAuth || user.name) === "Membro" ? "Você" : primeiroNome(conta.nomeExibicao || conta.nomeAuth || user.name),
    perfil: { foto: conta.foto, mostrarNoRanking: conta.mostrarNoRanking, plano: acesso.plano }, ranking: ranking.real, outrosReais: ranking.outros, codigo: codigoDe(user.id), conviteBase: `${areaUrl(area)}/gratis`,
    checkoutUrl: acesso.checkoutUrl, ofertas: acesso.ofertas, marcos: marcosLiberados(carregarMarcos(), estado.maior), missoes: carregarMissoes(), oferta365Url: acesso.oferta365Url, exemplo,
  };
}

/** Aplica o que mudou desde a última vez: acesso de hoje, brasa/apagar e a virada da semana da liga. */
async function emDia(salvo: Estado, hoje: string, user: User, area: Area, conta: ContaGuardada) {
  // Semana que acabou: se havia ranking real, o resultado (subir/descer) sai dele; senão, do grupo fictício.
  const fechando = salvo.liga.semana && salvo.liga.semana !== inicioSemana(hoje) ? salvo.liga : null;
  const r = fechando ? await rankingDaSemana(area, user, conta, fechando.semana!, fechando.indice, salvo.xpSemana[fechando.semana!] ?? 0).catch(() => SEM_RANKING) : SEM_RANKING;
  return atualizarLiga(atualizarParaHoje(registrarAcesso(salvo, hoje), hoje), hoje, user.id, carregarLigas(), r.real, r.outros);
}

async function rankingAtual(estado: Estado, hoje: string, user: User, area: Area, conta: ContaGuardada) {
  const semana = inicioSemana(hoje);
  return rankingDaSemana(area, user, conta, semana, estado.liga.indice, estado.xpSemana[semana] ?? 0).catch(() => SEM_RANKING);
}

export async function GET(request: Request) {
  return withUser(request, async (user, area) => {
    const acesso = await exigir(user, area);
    const hoje = dataSP();
    const [salvo, conta] = await Promise.all([carregarEstado(user.id), carregarConta(user.id)]);
    const estado = await emDia(salvo, hoje, user, area, conta);
    if (estado !== salvo) await salvarEstado(user.id, area.id, estado, user.name);
    return painel(estado, hoje, user, area, acesso, conta, await rankingAtual(estado, hoje, user, area, conta));
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
    const conta = await carregarConta(user.id);
    const r = aplicarAcao(await emDia(await carregarEstado(user.id), hoje, user, area, conta), acao, hoje, acesso.pago, diasDasMetas(carregarMarcos()));
    if (r.erro) throw new OpError(r.erro);
    await salvarEstado(user.id, area.id, r.estado, user.name);
    // Amigo convidado completou o dia 1: quem convidou ganha XP e brasa (uma vez só).
    if (r.completouDia === 1) await premiarConvidador(area.id, user.id, hoje).catch((e) => console.error("chama-convite", e));
    return { ...painel(r.estado, hoje, user, area, acesso, conta, await rankingAtual(r.estado, hoje, user, area, conta)), completouDia: r.completouDia, novasMedalhas: r.novasMedalhas, ganhouBrasa: r.ganhouBrasa, xpGanho: r.xpGanho };
  });
}
