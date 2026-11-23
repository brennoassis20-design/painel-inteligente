// Regra pura (testável): quanto de uma venda vai para cada produto liberado por ela.
// - 1 produto: o valor pago vai nele.
// - Vários produtos pelo mesmo id (pacote): o valor pago vai no de maior preço; os outros ficam com 0.
// - Pedido com order bump: não decide aqui (cada produto usa o preço de tabela no relatório, como antes).
export function valoresDaVenda(
  products: { id: string; price_cents?: number | null }[],
  amount: number | null | undefined,
  temBump: boolean,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!amount || !products.length) return out;
  if (products.length === 1) return out.set(products[0].id, amount);
  if (temBump) return out;
  const principal = [...products].sort((a, b) => (b.price_cents || 0) - (a.price_cents || 0))[0];
  for (const p of products) out.set(p.id, p.id === principal.id ? amount : 0);
  return out;
}
