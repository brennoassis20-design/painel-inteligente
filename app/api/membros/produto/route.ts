import { studentProduct } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  return withUser(request, (user, area) => studentProduct(user, area, slug));
}
