import { randomUUID } from "node:crypto";
import { OpError } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";
import { getServerAiKey } from "@/lib/panel-server";
import { acessoDoUsuario } from "@/lib/chama-acesa/acesso";
import { bibliaLiberada } from "@/lib/chama-acesa/acesso-regra";
import { aplicarBiblia, CORES_DESTAQUE, type AcaoBiblia, type CorDestaque } from "@/lib/chama-acesa/biblia-estudo";
import { checarLimite, LIMITE_IA_DIA } from "@/lib/chama-acesa/biblia-ia";
import { carregarEstadoBiblia, lerUsoIa, salvarAcaoBiblia } from "@/lib/chama-acesa/persistencia-biblia";
import { dataSP } from "@/lib/chama-acesa/regras";
import type { PainelBiblia } from "@/lib/chama-acesa/armazem-biblia";

// Bíblia do Chama Acesa (plano, progresso, notas, destaques, lembrete da leitura). GRÁTIS para qualquer logado na área e separada
// da jornada: nada aqui mexe em chama, XP, brasa ou dias. Sempre filtra por user_id no servidor. Tabelas: banco-biblia-estudo.sql.
type Area = Parameters<typeof acessoDoUsuario>[1];

async function exigir(user: { email: string }, area: Area) {
  const acesso = await acessoDoUsuario(user, area);
  if (!acesso?.app || !bibliaLiberada()) throw new OpError("O Chama Acesa não está liberado para este e-mail.");
}

async function painel(userId: string, hoje: string): Promise<PainelBiblia> {
  const [estado, uso] = await Promise.all([carregarEstadoBiblia(userId), lerUsoIa(userId, hoje)]);
  return { estado, hoje, ia: { disponivel: Boolean(getServerAiKey()), restantes: checarLimite(uso, hoje).restantes, limite: LIMITE_IA_DIA } };
}

export async function GET(request: Request) {
  return withUser(request, async (user, area) => {
    await exigir(user, area);
    return painel(user.id, dataSP());
  });
}

const str = (v: unknown, max = 80) => String(v ?? "").slice(0, max);

function lerAcao(b: Record<string, unknown>): AcaoBiblia {
  switch (b.tipo) {
    case "plano": return { tipo: "plano", id: b.id ? str(b.id) : null };
    case "marcarDia": return { tipo: "marcarDia", dia: Number(b.dia) };
    case "lido": return { tipo: "lido", sigla: str(b.sigla, 8).toLowerCase(), cap: Number(b.cap), valor: b.valor === false ? false : true };
    case "lembrete": return { tipo: "lembrete", horario: b.horario ? str(b.horario, 5) : null };
    case "nota": return { tipo: "nota", id: b.id ? str(b.id, 60) : undefined, sigla: str(b.sigla, 8).toLowerCase(), cap: Number(b.cap), vIni: Number(b.vIni), vFim: Number(b.vFim), texto: str(b.texto, 6000), tema: str(b.tema, 200) };
    case "apagarNota": return { tipo: "apagarNota", id: str(b.id, 60) };
    case "destaque": {
      const cor = b.cor === null || b.cor === undefined ? null : (CORES_DESTAQUE as readonly string[]).includes(String(b.cor)) ? (String(b.cor) as CorDestaque) : undefined;
      if (cor === undefined) throw new OpError("Cor inválida.");
      return { tipo: "destaque", sigla: str(b.sigla, 8).toLowerCase(), cap: Number(b.cap), versiculos: Array.isArray(b.versiculos) ? b.versiculos.slice(0, 200).map(Number) : [], cor };
    }
    default: throw new OpError("Ação desconhecida.");
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return withUser(request, async (user, area) => {
    await exigir(user, area);
    const acao = lerAcao(body);
    const hoje = dataSP();
    const antes = await carregarEstadoBiblia(user.id);
    const r = aplicarBiblia(antes, acao, hoje, { novoId: () => randomUUID() });
    if (r.erro) throw new OpError(r.erro);
    await salvarAcaoBiblia(user.id, area.id, acao, r, hoje);
    const uso = await lerUsoIa(user.id, hoje);
    return { estado: r.estado, hoje, ia: { disponivel: Boolean(getServerAiKey()), restantes: checarLimite(uso, hoje).restantes, limite: LIMITE_IA_DIA } } satisfies PainelBiblia;
  });
}
