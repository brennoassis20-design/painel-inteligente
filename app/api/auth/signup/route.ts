import { jsonError } from "@/lib/panel-server";

// O acesso e criado pela compra (webhook da Cakto envia o convite por email).
export async function POST() {
  return jsonError("O acesso e liberado apos a compra. Verifique o convite no seu email.", 403);
}
