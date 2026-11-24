// Selo no ícone do app instalado (Badging API). Sempre com checagem de suporte; nunca quebra a tela.
type Nav = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

/** O dia de hoje já foi completado? (alguma data de conclusão é hoje) */
export function completouHoje(concluidos: Record<number, string>, hoje: string): boolean {
  return Object.values(concluidos).includes(hoje);
}

export async function atualizarSelo(pendente: boolean) {
  try {
    const nav = navigator as Nav;
    if (pendente && "setAppBadge" in navigator) await nav.setAppBadge?.(1);
    else if (!pendente && "clearAppBadge" in navigator) await nav.clearAppBadge?.();
  } catch {
    /* sem suporte ou sem permissão: segue sem selo */
  }
}
