// "Explicar" da Bíblia (contexto do capítulo e explicação de versículos): pedido, chave do cache compartilhado, limite diário,
// prompt e normalização da resposta da IA. Lógica PURA (testável). A chamada à OpenRouter fica na rota do servidor.
import { capituloValido, nomeDoLivro } from "./biblia-estudo.ts";

export const LIMITE_IA_DIA = 30;
export const MAX_VERSICULOS_EXPLICAR = 40;
/** Subir a versão invalida o cache antigo (a chave muda) quando o prompt melhorar. */
export const VERSAO_PROMPT = "v1";
export const AVISO_IA = "Explicação gerada por IA. Confira sempre na Palavra.";
export const MSG_IA_INDISPONIVEL = "A explicação por IA ainda não está ligada neste app. A leitura, as notas e os destaques continuam funcionando normalmente.";

export type TipoExplicacao = "capitulo" | "versiculos";
export interface PedidoExplicacao { tipo: TipoExplicacao; sigla: string; cap: number; versiculos?: number[] }

export interface PalavraChave { palavra: string; original: string; significado: string }
export interface ReferenciaCruzada { ref: string; motivo: string }
export interface PontoDeVista { leitura: string; descricao: string }
export interface Explicacao {
  contexto: string;
  autorDestinatarios: string;
  antesDepois: string;
  explicacao: string;
  palavrasChave: PalavraChave[];
  referencias: ReferenciaCruzada[];
  pontosDeVista: PontoDeVista[];
  /** Frase sobre haver ou não consenso entre as leituras cristãs. */
  consenso: string;
  aplicacao: string;
  esboco: string[];
}

/** "16-18,20": versículos em ordem, juntando os seguidos. */
export function compactarVersiculos(vs: number[]): string {
  const ordem = [...new Set(vs)].sort((a, b) => a - b);
  const partes: string[] = [];
  for (let i = 0; i < ordem.length; ) {
    let j = i;
    while (j + 1 < ordem.length && ordem[j + 1] === ordem[j] + 1) j++;
    partes.push(j > i ? `${ordem[i]}-${ordem[j]}` : String(ordem[i]));
    i = j + 1;
  }
  return partes.join(",");
}

export type PedidoValido = { ok: true; pedido: Required<Pick<PedidoExplicacao, "tipo" | "sigla" | "cap">> & { versiculos: number[] } } | { ok: false; erro: string };

/** Confere e normaliza o pedido vindo do cliente (nunca confiar nele). */
export function validarPedido(cru: unknown): PedidoValido {
  const p = (cru ?? {}) as Record<string, unknown>;
  const tipo = p.tipo === "capitulo" || p.tipo === "versiculos" ? p.tipo : null;
  const sigla = String(p.sigla ?? "").toLowerCase();
  const cap = Number(p.cap);
  if (!tipo || !capituloValido(sigla, cap)) return { ok: false, erro: "Pedido inválido." };
  if (tipo === "capitulo") return { ok: true, pedido: { tipo, sigla, cap, versiculos: [] } };
  const lista = Array.isArray(p.versiculos) ? p.versiculos.map(Number).filter((v) => Number.isInteger(v) && v >= 1 && v <= 176) : [];
  const vs = [...new Set(lista)].sort((a, b) => a - b);
  if (!vs.length) return { ok: false, erro: "Escolha ao menos um versículo." };
  if (vs.length > MAX_VERSICULOS_EXPLICAR) return { ok: false, erro: `Escolha até ${MAX_VERSICULOS_EXPLICAR} versículos de cada vez.` };
  return { ok: true, pedido: { tipo, sigla, cap, versiculos: vs } };
}

/** Chave do cache compartilhado: mesmo capítulo/versículos = mesma explicação para todo mundo. */
export function chaveExplicacao(p: { tipo: TipoExplicacao; sigla: string; cap: number; versiculos?: number[] }): string {
  const vs = p.tipo === "capitulo" ? "todos" : compactarVersiculos(p.versiculos ?? []);
  return `${VERSAO_PROMPT}|${p.tipo}|${p.sigla}|${p.cap}|${vs}`;
}

export const referenciaDoPedido = (p: { tipo: TipoExplicacao; sigla: string; cap: number; versiculos?: number[] }) =>
  p.tipo === "capitulo" ? `${nomeDoLivro(p.sigla)} ${p.cap}` : `${nomeDoLivro(p.sigla)} ${p.cap}:${compactarVersiculos(p.versiculos ?? []).replace(/-/g, "–")}`;

// ------------------------------------------------------------------ limite por dia

export interface UsoDia { dia: string; n: number }
/** Gerar uma explicação NOVA gasta 1 do limite do dia; ler do cache não gasta nada. */
export function checarLimite(uso: UsoDia | null, hoje: string, limite = LIMITE_IA_DIA): { permitido: boolean; usadas: number; restantes: number } {
  const usadas = uso && uso.dia === hoje ? uso.n : 0;
  return { permitido: usadas < limite, usadas, restantes: Math.max(0, limite - usadas) };
}

// ------------------------------------------------------------------ prompt

export const PROMPT_SISTEMA = `Você é um professor de teologia bíblica que ajuda pregadores e leitores da Bíblia no Brasil. Escreva em português do Brasil, com clareza, tom pastoral, sóbrio e respeitoso.
Regras obrigatórias:
- NÃO invente fatos, datas, nomes, números, citações nem referências. Se você não tem certeza, escreva "não se sabe" ou "não há consenso". Prefira dizer menos a dizer errado.
- Palavras em hebraico ou grego: só quando realmente ajudarem a entender o trecho e só se tiver certeza do termo e do sentido. Escreva o original transliterado em letras latinas (ex.: "agapē") e explique o sentido. Se não houver palavra relevante, devolva a lista vazia.
- Referências cruzadas: apenas passagens que existem de verdade, no formato "Livro capítulo:versículo" (ex.: "Romanos 5:8"), com o motivo da ligação em uma frase.
- Pontos de vista: quando cristãos fiéis divergem na interpretação, apresente as principais leituras de forma respeitosa e equilibrada, sem atacar nem ridicularizar nenhuma denominação e sem dizer qual é a "certa" quando o texto não decide. Se não há divergência relevante, deixe a lista vazia e diga isso em "consenso". Se houver, comece "consenso" com "Não há consenso:" e resuma.
- Aplicação: prática, fiel ao texto, sem culpa exagerada. O esboço de pregação tem exatamente 3 tópicos curtos, cada um uma frase que sustenta a ideia central do trecho.
- Use o texto bíblico fornecido (Bíblia Livre) como base; não acrescente versículos que não estejam no trecho.
Responda SOMENTE com um objeto JSON com estas chaves (todas obrigatórias, texto simples sem markdown):
{"contexto": "contexto histórico e cultural em até 90 palavras", "autor_destinatarios": "quem escreveu, para quem e quando (diga 'não se sabe' ou 'há debate' se for o caso)", "antes_depois": "o que acontece antes e depois do trecho", "explicacao": "explicação do trecho em até 160 palavras", "palavras_chave": [{"palavra": "termo em português", "original": "termo original transliterado", "significado": "sentido"}], "referencias": [{"ref": "Livro cap:vers", "motivo": "por que se liga"}], "pontos_de_vista": [{"leitura": "nome curto da leitura", "descricao": "em 1 ou 2 frases"}], "consenso": "há ou não consenso, em 1 frase", "aplicacao": "aplicação em até 70 palavras", "esboco": ["tópico 1", "tópico 2", "tópico 3"]}`;

export function montarPrompt(p: { tipo: TipoExplicacao; sigla: string; cap: number; versiculos?: number[] }, textoBiblico: string): { system: string; user: string } {
  const ref = referenciaDoPedido(p);
  const alvo = p.tipo === "capitulo" ? `o capítulo inteiro ${ref}` : `o(s) versículo(s) ${ref}`;
  const texto = textoBiblico.trim() ? `\n\nTexto bíblico (Bíblia Livre):\n${textoBiblico.trim().slice(0, 9000)}` : "";
  const foco = p.tipo === "capitulo"
    ? "Dê o panorama do capítulo: tema central, estrutura em poucas partes e como ele se encaixa no livro."
    : "Explique este trecho dentro do capítulo, sem tirá-lo do contexto.";
  return { system: PROMPT_SISTEMA, user: `Explique ${alvo}. ${foco}${texto}` };
}

// ------------------------------------------------------------------ normalização da resposta

const txt = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const lista = (v: unknown, max: number): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object").slice(0, max) as Record<string, unknown>[] : []);

/** Garante o formato mesmo que a IA mande algo torto. null = resposta inútil (não vai para o cache). */
export function normalizarExplicacao(cru: unknown): Explicacao | null {
  if (!cru || typeof cru !== "object") return null;
  const o = cru as Record<string, unknown>;
  const e: Explicacao = {
    contexto: txt(o.contexto, 1200),
    autorDestinatarios: txt(o.autor_destinatarios ?? o.autorDestinatarios, 600),
    antesDepois: txt(o.antes_depois ?? o.antesDepois, 800),
    explicacao: txt(o.explicacao, 1800),
    palavrasChave: lista(o.palavras_chave ?? o.palavrasChave, 6).map((x) => ({ palavra: txt(x.palavra, 60), original: txt(x.original, 60), significado: txt(x.significado, 300) })).filter((x) => x.palavra && x.significado),
    referencias: lista(o.referencias, 8).map((x) => ({ ref: txt(x.ref, 60), motivo: txt(x.motivo, 240) })).filter((x) => x.ref),
    pontosDeVista: lista(o.pontos_de_vista ?? o.pontosDeVista, 5).map((x) => ({ leitura: txt(x.leitura, 80), descricao: txt(x.descricao, 500) })).filter((x) => x.leitura && x.descricao),
    consenso: txt(o.consenso, 400),
    aplicacao: txt(o.aplicacao, 900),
    esboco: (Array.isArray(o.esboco) ? o.esboco : []).map((x) => txt(x, 240)).filter(Boolean).slice(0, 3),
  };
  if (!e.explicacao && !e.contexto) return null;
  return e;
}

/** Resposta de exemplo para a bancada (sem chave e sem rede). Deixa claro que é teste. */
export function explicacaoMock(p: { tipo: TipoExplicacao; sigla: string; cap: number; versiculos?: number[] }): Explicacao {
  const ref = referenciaDoPedido(p);
  return {
    contexto: `Texto de exemplo da bancada para ${ref}. Na versão real, aqui aparece o contexto histórico e cultural do trecho.`,
    autorDestinatarios: "Exemplo: autor, destinatários e data do livro, com o aviso de quando houver debate.",
    antesDepois: "Exemplo: o que acontece nos capítulos antes e depois deste trecho.",
    explicacao: `Exemplo de explicação de ${ref}: o ponto central do trecho, em linguagem simples e fiel ao texto, sem tirá-lo do contexto.`,
    palavrasChave: [{ palavra: "amor", original: "agapē", significado: "Exemplo: amor que se dá, escolhido, não só sentido." }],
    referencias: [{ ref: "Romanos 5:8", motivo: "Exemplo de referência cruzada com o motivo da ligação." }],
    pontosDeVista: [
      { leitura: "Leitura A", descricao: "Exemplo: uma das leituras cristãs comuns do trecho, apresentada com respeito." },
      { leitura: "Leitura B", descricao: "Exemplo: outra leitura comum, sem atacar quem pensa diferente." },
    ],
    consenso: "Exemplo: não há consenso sobre este detalhe; o centro da mensagem é aceito por todos.",
    aplicacao: "Exemplo de aplicação prática para a semana, sem culpa exagerada.",
    esboco: ["Tópico 1 do esboço de pregação", "Tópico 2 do esboço de pregação", "Tópico 3 do esboço de pregação"],
  };
}

// ------------------------------------------------------------------ texto para copiar/compartilhar

/** “Texto dos versículos” — João 3:16–18 (Bíblia Livre). `versos` = [número, texto] em ordem. */
export function formatarCitacao(sigla: string, cap: number, versos: [number, string][]): string {
  const ordem = [...versos].sort((a, b) => a[0] - b[0]);
  const ref = `${nomeDoLivro(sigla)} ${cap}:${compactarVersiculos(ordem.map((v) => v[0])).replace(/-/g, "–")}`;
  const corpo = ordem.length === 1 ? ordem[0][1] : ordem.map(([n, t]) => `${n} ${t}`).join(" ");
  return `“${corpo}”\n— ${ref} (Bíblia Livre)`;
}

/** A explicação inteira em texto simples (para copiar para o caderno de sermão). */
export function explicacaoParaTexto(titulo: string, e: Explicacao): string {
  const linhas: string[] = [titulo, ""];
  const bloco = (nome: string, v: string) => v && linhas.push(`${nome}`, v, "");
  bloco("CONTEXTO", e.contexto);
  bloco("AUTOR E DESTINATÁRIOS", e.autorDestinatarios);
  bloco("ANTES E DEPOIS", e.antesDepois);
  bloco("EXPLICAÇÃO", e.explicacao);
  if (e.palavrasChave.length) linhas.push("PALAVRAS-CHAVE", ...e.palavrasChave.map((p) => `- ${p.palavra}${p.original ? ` (${p.original})` : ""}: ${p.significado}`), "");
  if (e.referencias.length) linhas.push("REFERÊNCIAS CRUZADAS", ...e.referencias.map((r) => `- ${r.ref}${r.motivo ? `: ${r.motivo}` : ""}`), "");
  if (e.pontosDeVista.length || e.consenso) linhas.push("PONTOS DE VISTA", ...e.pontosDeVista.map((p) => `- ${p.leitura}: ${p.descricao}`), ...(e.consenso ? [e.consenso] : []), "");
  bloco("APLICAÇÃO", e.aplicacao);
  if (e.esboco.length) linhas.push("ESBOÇO PARA PREGAÇÃO", ...e.esboco.map((t, i) => `${i + 1}. ${t}`), "");
  linhas.push(AVISO_IA);
  return linhas.join("\n");
}
