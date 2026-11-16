import { studentHome } from "@/lib/membros";
import { withUser } from "@/lib/membros-http";

export async function GET(request: Request) {
  return withUser(request, (user, area) => studentHome(user, area));
}
