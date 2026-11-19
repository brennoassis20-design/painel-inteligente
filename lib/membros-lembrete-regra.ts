// Regra do lembrete de acesso (sem dependências: testável direto). Usada por lib/membros-lembrete.ts.
export const HOUR = 3600 * 1000;

export const REMINDER_KIND = "lembrete_acesso";
export const MAX_REMINDERS = 2;
export const MIN_AGE_H = 20;
export const MAX_AGE_DAYS = 7;
export const GAP_H = 48;

export function maskEmail(email: string) {
  const [user, domain = ""] = email.split("@");
  return `${user.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(user.length - 2, 5)))}@${domain}`;
}

export type AccessRow = { email: string; created_at: string; mp_products: { area_id: number; title: string } };
export type Account = { email?: string; last_sign_in_at?: string | null; email_confirmed_at?: string | null };
export type Reminder = { email: string; area_id: number | null; created_at: string };

export type Candidate = { email: string; areaId: number; product: string; bought_at: string; has_account: boolean; reminders: number };


// Regra pura (testável): quem ainda deve receber lembrete.
export function pickCandidates(
  access: AccessRow[],
  accounts: Map<string, Account>,
  reminders: Reminder[],
  now = Date.now(),
): Candidate[] {
  const out = new Map<string, Candidate>();
  for (const row of access) {
    const email = row.email.trim().toLowerCase();
    const age = now - new Date(row.created_at).getTime();
    if (age < MIN_AGE_H * HOUR || age > MAX_AGE_DAYS * 24 * HOUR) continue;
    const account = accounts.get(email);
    if (account?.last_sign_in_at) continue;
    const key = `${email}|${row.mp_products.area_id}`;
    if (out.has(key)) continue;
    const mine = reminders.filter((item) => item.email.toLowerCase() === email && item.area_id === row.mp_products.area_id);
    if (mine.length >= MAX_REMINDERS) continue;
    const last = mine.reduce((max, item) => Math.max(max, new Date(item.created_at).getTime()), 0);
    if (last && now - last < GAP_H * HOUR) continue;
    out.set(key, { email, areaId: row.mp_products.area_id, product: row.mp_products.title, bought_at: row.created_at, has_account: Boolean(account), reminders: mine.length });
  }
  return [...out.values()];
}

