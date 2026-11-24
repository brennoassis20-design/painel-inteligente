import { OpError } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";
import { getPublicAppUrl, getServerAiKey } from "@/lib/panel-server";
import { requestAiJson, defaultAiModel } from "@/lib/product-engine";
import { acessoDoUsuario } from "@/lib/chama-acesa/acesso";
import { nomeDoLivro } from "@/lib/chama-acesa/biblia-estudo";
import { checarLimite, chaveExplicacao, compactarVersiculos, LIMITE_IA_DIA, MSG_IA_INDISPONIVEL, montarPrompt, normalizarExplicacao, validarPedido } from "@/lib/chama-acesa/biblia-ia";
import { gravarCache, gravarUsoIa, lerCache, lerUsoIa } from "@/lib/chama-acesa/persistencia-biblia";
import { dataSP } from "@/lib/chama-acesa/regras";
import type { RespostaExplicacao } from "@/lib/chama-acesa/armazem-biblia";

export const maxDuration = 60;

// "Explicar" da Bíblia: contexto do capítulo e explicação de versículos, gerados por IA (OpenRouter) com CACHE COMPARTILHADO:
// quem pede primeiro gera, os demais leem. Gerar algo novo gasta 1 do limite diário da pessoa (LIMITE_IA_DIA); ler do cache não gasta.
// A chave da OpenRouter (OPENROUTER_API_KEY) e o modelo (OPENROUTER_MODEL) ficam só no servidor.
async function textoDoTrecho(request: Request, sigla: string, cap: number, versiculos: number[]): Promise<string> {
  try {
    const r = await fetch(`${getPublicAppUrl(request)}/chama-acesa/biblia/${sigla}.json`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return "";
    const livro = (await r.json()) as { capitulos?: string[][] };
    const vs = livro.capitulos?.[cap - 1] ?? [];
    const alvo = versiculos.length ? versiculos : vs.map((_, i) => i + 1);
    return alvo.filter((v) => vs[v - 1]).map((v) => `${v}. ${vs[v - 1]}`).join("\n");
  } catch {
    return "";
  }
}

function mensagemDoErro(erro: unknown): string {
  const t = erro instanceof Error ? erro.message : String(erro);
  if (/401|invalid|no auth|user not found/i.test(t)) return "A chave da IA do app não foi aceita. Avise o suporte.";
  if (/402|credit|insufficient|afford/i.test(t)) return "A IA do app está sem crédito no momento. Tente de novo mais tarde.";
  if (/429|rate/i.test(t)) return "A IA pediu para esperar um pouco. Tente de novo em 1 minuto.";
  return "Não deu para gerar a explicação agora. Tente de novo em instantes.";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return withUser(request, async (user, area): Promise<RespostaExplicacao> => {
    const acesso = await acessoDoUsuario(user, area);
    if (!acesso?.app) throw new OpError("O Chama Acesa não está liberado para este e-mail.");
    const v = validarPedido(body);
    if (!v.ok) throw new OpError(v.erro);
    const hoje = dataSP();
    const chave = chaveExplicacao(v.pedido);
    const uso = await lerUsoIa(user.id, hoje);
    const lim = checarLimite(uso, hoje);

    const guardada = await lerCache(chave).catch(() => null);
    if (guardada) return { ok: true, explicacao: guardada, cache: true, restantes: lim.restantes };

    const apiKey = getServerAiKey();
    if (!apiKey) return { ok: false, motivo: "indisponivel", mensagem: MSG_IA_INDISPONIVEL };
    if (!lim.permitido) {
      return { ok: false, motivo: "limite", restantes: 0, mensagem: `Você usou as ${LIMITE_IA_DIA} explicações novas de hoje. As que já foram geradas continuam abertas. Volte amanhã.` };
    }

    // Gasta antes de chamar (evita abrir muitos pedidos ao mesmo tempo) e devolve se der erro.
    await gravarUsoIa(user.id, hoje, lim.usadas + 1);
    try {
      const texto = await textoDoTrecho(request, v.pedido.sigla, v.pedido.cap, v.pedido.versiculos);
      const { system, user: pergunta } = montarPrompt(v.pedido, texto);
      const cru = await requestAiJson(apiKey, system, pergunta, 2600);
      const explicacao = normalizarExplicacao(cru);
      if (!explicacao) throw new Error("A IA devolveu uma resposta vazia.");
      const modelo = process.env.OPENROUTER_MODEL?.trim() || defaultAiModel;
      await gravarCache(chave, { tipo: v.pedido.tipo, sigla: v.pedido.sigla, cap: v.pedido.cap, versiculos: v.pedido.tipo === "capitulo" ? "todos" : compactarVersiculos(v.pedido.versiculos) }, explicacao, modelo).catch((e) => console.error("chama-biblia-cache", e));
      return { ok: true, explicacao, cache: false, restantes: lim.restantes - 1 };
    } catch (erro) {
      console.error("chama-biblia-explicar", nomeDoLivro(v.pedido.sigla), v.pedido.cap, erro instanceof Error ? erro.message.slice(0, 300) : erro);
      await gravarUsoIa(user.id, hoje, lim.usadas).catch(() => undefined);
      return { ok: false, motivo: "erro", mensagem: mensagemDoErro(erro), restantes: lim.restantes };
    }
  });
}
