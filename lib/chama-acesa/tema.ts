// Tema do Chama Acesa: escuro ("Brasa") é o padrão para todo mundo (desde 27/11/2026); claro ("Aurora") é opcional em Minha conta.
// A escolha fica no aparelho (localStorage). Tudo aqui é seguro sem navegador (testes) e nunca lança erro.
export type Tema = "claro" | "escuro";

export const TEMA_PADRAO: Tema = "escuro";
export const CHAVE_TEMA = "chama-tema";
/** Cor da barra do navegador (meta theme-color) em cada tema. */
export const COR_DO_TEMA: Record<Tema, string> = { claro: "#FBF7F2", escuro: "#0B0D14" };

type Armazenamento = Pick<Storage, "getItem" | "setItem">;

export const ehTema = (v: unknown): v is Tema => v === "claro" || v === "escuro";

/** Lê o tema salvo; qualquer problema (sem armazenamento, bloqueado, valor estranho) cai no padrão (escuro). */
export function lerTema(armazenamento?: Armazenamento | null): Tema {
  try {
    const a = armazenamento ?? (typeof window !== "undefined" ? window.localStorage : null);
    const v = a?.getItem(CHAVE_TEMA);
    return ehTema(v) ? v : TEMA_PADRAO;
  } catch {
    return TEMA_PADRAO;
  }
}

/** Salva a escolha. Devolve false se o aparelho não deixou guardar (a escolha vale só nesta sessão). */
export function salvarTema(tema: Tema, armazenamento?: Armazenamento | null): boolean {
  try {
    const a = armazenamento ?? (typeof window !== "undefined" ? window.localStorage : null);
    if (!a) return false;
    a.setItem(CHAVE_TEMA, tema);
    return true;
  } catch {
    return false;
  }
}

/** Aplica o tema na página inteira (atributo no <html> e cor da barra do navegador). */
export function aplicarTemaNaPagina(tema: Tema): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-chama-tema", tema);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", COR_DO_TEMA[tema]));
}

/** Script que roda antes da primeira pintura (colocado no <head> do layout) para a tela não piscar. */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});if(t!=="claro"&&t!=="escuro")t=${JSON.stringify(TEMA_PADRAO)};var c={claro:${JSON.stringify(COR_DO_TEMA.claro)},escuro:${JSON.stringify(COR_DO_TEMA.escuro)}};document.documentElement.setAttribute("data-chama-tema",t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].setAttribute("content",c[t]);}catch(e){document.documentElement.setAttribute("data-chama-tema",${JSON.stringify(TEMA_PADRAO)});}})();`;

/** Tamanho da letra do app (Minha conta): normal, grande ou maior. Fica salvo no aparelho. */
export type Letra = "normal" | "grande" | "maior";
export const CHAVE_LETRA = "chama-letra";
export function lerLetra(): Letra {
  try {
    const v = typeof localStorage === "undefined" ? null : localStorage.getItem(CHAVE_LETRA);
    return v === "grande" || v === "maior" ? v : "normal";
  } catch {
    return "normal";
  }
}
export function salvarLetra(l: Letra): void {
  try {
    localStorage.setItem(CHAVE_LETRA, l);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}
