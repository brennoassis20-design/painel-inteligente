import { carregarDias } from "@/lib/chama-acesa/conteudo-servidor";

// Só para a bancada local (/membros/chama-dev): devolve os 21 dias sem login. Em produção não existe.
export async function GET() {
  if (process.env.NODE_ENV === "production") return new Response("Não encontrado.", { status: 404 });
  return Response.json(carregarDias());
}
