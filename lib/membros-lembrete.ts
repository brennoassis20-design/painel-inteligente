// Lembrete de acesso: comprador com acesso ativo que nunca entrou recebe o link de novo (máx. 2, com 48 h entre eles).
import { findAuthAccount, supabaseAdminAuthRequest, supabaseAuthRequest, supabaseRest } from "@/lib/panel-server";
import { areaUrl, getAreaById, inviteToArea, logEvent, tagAccountWithArea } from "@/lib/membros";
import { type AccessRow, type Account, type Reminder, GAP_H, HOUR, MAX_AGE_DAYS, MAX_REMINDERS, MIN_AGE_H, maskEmail, pickCandidates, REMINDER_KIND } from "@/lib/membros-lembrete-regra";

const enc = encodeURIComponent;
export { GAP_H, MAX_AGE_DAYS, MAX_REMINDERS, MIN_AGE_H, maskEmail, pickCandidates, REMINDER_KIND };

// Todas as contas (só leitura): e-mail -> dados de entrada. Páginas de 1000.
export async function authAccountsByEmail(maxPages = 30) {
  const map = new Map<string, Account>();
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await supabaseAdminAuthRequest(`/admin/users?page=${page}&per_page=1000`);
    if (!response.ok) throw new Error(`Não consegui listar as contas (${response.status}).`);
    const data = (await response.json()) as { users?: Account[] };
    const users = data.users || [];
    for (const user of users) if (user.email) map.set(user.email.toLowerCase(), user);
    if (users.length < 1000) break;
  }
  return map;
}

export async function runAccessReminders({ dry = false, limit = 40 }: { dry?: boolean; limit?: number } = {}) {
  const now = Date.now();
  const from = new Date(now - MAX_AGE_DAYS * 24 * HOUR).toISOString();
  const to = new Date(now - MIN_AGE_H * HOUR).toISOString();
  const [access, reminders, accounts] = await Promise.all([
    supabaseRest<AccessRow[]>(
      `/mp_access?status=eq.active&created_at=gte.${enc(from)}&created_at=lte.${enc(to)}&select=email,created_at,mp_products!inner(area_id,title)&order=created_at.asc`,
    ),
    supabaseRest<Reminder[]>(`/mp_events?kind=eq.${REMINDER_KIND}&select=email,area_id,created_at&limit=5000`),
    authAccountsByEmail(),
  ]);
  const all = pickCandidates(access, accounts, reminders, now);
  const batch = all.slice(0, limit);

  if (dry) {
    return {
      dry: true,
      total: all.length,
      lista: batch.map((item) => ({ email: maskEmail(item.email), area: item.areaId, produto: item.product, comprou_em: item.bought_at, tem_conta: item.has_account, lembretes_anteriores: item.reminders })),
    };
  }

  const result = { dry: false, total: all.length, enviados: 0, falhas: [] as string[], restantes: Math.max(0, all.length - batch.length) };
  for (const item of batch) {
    try {
      const area = await getAreaById(item.areaId);
      const account = await findAuthAccount(item.email).catch(() => null);
      let via: string;
      if (account && accounts.get(item.email)?.email_confirmed_at) {
        // Já confirmou o e-mail mas nunca entrou: link de acesso (otp) que volta para a área.
        await tagAccountWithArea(account.id, area);
        const response = await supabaseAuthRequest(`/otp?redirect_to=${enc(areaUrl(area))}`, {
          method: "POST",
          body: JSON.stringify({ email: item.email, create_user: false }),
        });
        if (!response.ok) throw new Error(`otp ${response.status}`);
        via = "otp";
      } else {
        // Sem conta ou convite não aberto: gera convite novo pela área certa.
        const status = await inviteToArea(area, item.email);
        via = `convite:${status}`;
      }
      await logEvent(item.areaId, item.email, null, REMINDER_KIND, { via, n: item.reminders + 1 });
      result.enviados += 1;
    } catch (error) {
      console.error("lembrete-acesso", maskEmail(item.email), error instanceof Error ? error.message : error);
      result.falhas.push(maskEmail(item.email));
    }
  }
  return result;
}
