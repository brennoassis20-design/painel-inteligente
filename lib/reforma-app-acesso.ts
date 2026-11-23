// Lado do servidor: lê os produtos e as compras da pessoa e aplica a regra de lib/reforma-app-acesso-regra.ts.
import { accessMap, isAdmin, listProducts, type Area } from "@/lib/membros";
import { calcularAcesso, type ReformaAcesso } from "@/lib/reforma-app-acesso-regra";

export async function acessoDoUsuario(user: { email: string }, area: Area): Promise<ReformaAcesso | null> {
  const produtos = await listProducts(area, true);
  const mapa = await accessMap(user.email, produtos);
  const admin = await isAdmin(user.email, area);
  return calcularAcesso({
    areaSlug: area.slug,
    produtos: produtos.map((p) => ({ slug: p.slug, owned: mapa.has(p.id) })),
    admin,
  });
}
