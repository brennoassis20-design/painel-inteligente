import { OpError } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";
import { acessoDoUsuario } from "@/lib/chama-acesa/acesso";
import { type Conta } from "@/lib/chama-acesa/conta";
import { carregarConta, removerFoto, salvarFoto, salvarMostrarNoRanking, salvarNomeExibicao } from "@/lib/chama-acesa/persistencia-conta";

// Conta do Chama Acesa: nome de exibição, foto e "mostrar meu nome e foto no ranking".
// A foto chega já recortada (quadrada) e reduzida (256x256) pelo navegador, em base64; o caminho no Storage é sempre
// <user_id>/avatar, montado aqui, nunca vindo do cliente. SQL: Projetos/Chama Acesa/banco-conta-ranking.sql.
type User = { id: string; email: string; name?: string };

async function conta(user: User, area: Parameters<typeof acessoDoUsuario>[1]): Promise<Conta> {
  const acesso = await acessoDoUsuario(user, area);
  if (!acesso?.app) throw new OpError("O Chama Acesa não está liberado para este e-mail.");
  const g = await carregarConta(user.id);
  return { nome: g.nomeExibicao || g.nomeAuth || (user.name || "").trim() || "", email: user.email, foto: g.foto, mostrarNoRanking: g.mostrarNoRanking, plano: acesso.plano };
}

export async function GET(request: Request) {
  return withUser(request, (user, area) => conta(user, area));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { acao?: string; nome?: string; valor?: boolean; dados?: string };
  return withUser(request, async (user, area) => {
    await conta(user, area);
    try {
      if (body.acao === "nome") await salvarNomeExibicao(user.id, area.id, body.nome);
      else if (body.acao === "mostrar") await salvarMostrarNoRanking(user.id, area.id, Boolean(body.valor));
      else if (body.acao === "foto") await salvarFoto(user.id, area.id, body.dados);
      else if (body.acao === "removerFoto") await removerFoto(user.id, area.id);
      else throw new OpError("Ação desconhecida.");
    } catch (e) {
      if (e instanceof OpError) throw e;
      throw new OpError(e instanceof Error ? e.message : "Não deu certo.");
    }
    const c = await conta(user, area);
    return c;
  });
}
