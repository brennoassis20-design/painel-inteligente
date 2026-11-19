// Regra do lembrete de acesso (sem dependências: testável direto). Usada por lib/membros-lembrete.ts.
export const HOUR = 3600 * 1000;

export const REMINDER_KIND = "lembrete_acesso";
export const ACCESS_EMAIL_KIND = "acesso_email";
export const MAX_REMINDERS = 2;
// Idade mínima da compra para cada lembrete (19/11): 1º com 3 h, 2º com 24 h.
export const REMINDER_AGE_H = [3, 24];
export const MIN_AGE_H = REMINDER_AGE_H[0];
export const MAX_AGE_DAYS = 7;
// Intervalo mínimo entre dois lembretes (o cron roda a cada 3 h).
export const GAP_H = 12;

export function maskEmail(email: string) {
  const [user, domain = ""] = email.split("@");
  return `${user.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(user.length - 2, 5)))}@${domain}`;
}

// Convite/e-mail de acesso enviado há menos disso: não manda outro (o e-mail da compra sai na hora; o 1º lembrete só com 3 h).
export const RECENT_INVITE_H = 2;

// Domínios com erro de digitação comum: o link de acesso iria para a caixa de um estranho.
const TYPO_DOMAINS = new Set([
  "outlok.com", "outloo.com", "outlook.co", "outlook.con", "otlook.com",
  "gmail.cim", "gmail.co", "gmail.con", "gmail.cm", "gmial.com", "gmai.com", "gamil.com", "gnail.com", "gmaill.com", "gmal.com",
  "hotmial.com", "hotmai.com", "hotmail.co", "hotmail.con", "hotmil.com", "hotamil.com", "hotmal.com",
  "yahoo.co", "yahoo.con", "yaho.com", "yahho.com", "icloud.co", "icloud.con", "iclod.com",
]);

// E-mail que não deve receber link de acesso (formato ruim ou domínio com erro de digitação).
export function suspiciousEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(value)) return true;
  return TYPO_DOMAINS.has(value.split("@")[1] || "");
}

// lastEmailAt = último evento acesso_email (e-mail "seu acesso chegou") desse e-mail, em ms.
export function invitedRecently(account: Account | undefined, now = Date.now(), lastEmailAt = 0) {
  const invited = account?.invited_at ? new Date(account.invited_at).getTime() : 0;
  const at = Math.max(invited, lastEmailAt);
  return Boolean(at) && now - at < RECENT_INVITE_H * HOUR;
}

export type AccessRow = { email: string; created_at: string; provider?: string | null; mp_products: { area_id: number; title: string } };
export type AccessEmailEvent = { email: string; area_id: number | null; created_at: string };
export type Account = { email?: string; last_sign_in_at?: string | null; email_confirmed_at?: string | null; invited_at?: string | null };
export type Reminder = { email: string; area_id: number | null; created_at: string };

export type Candidate = { email: string; areaId: number; product: string; bought_at: string; has_account: boolean; reminders: number; products: string[]; provider: string };


// Regra pura (testável): quem ainda deve receber lembrete.
export function pickCandidates(
  access: AccessRow[],
  accounts: Map<string, Account>,
  reminders: Reminder[],
  now = Date.now(),
  accessEmails: AccessEmailEvent[] = [],
): Candidate[] {
  const out = new Map<string, Candidate>();
  const lastEmail = new Map<string, number>();
  for (const item of accessEmails) {
    const key = item.email.trim().toLowerCase();
    lastEmail.set(key, Math.max(lastEmail.get(key) || 0, new Date(item.created_at).getTime()));
  }
  for (const row of access) {
    const email = row.email.trim().toLowerCase();
    const age = now - new Date(row.created_at).getTime();
    if (age < MIN_AGE_H * HOUR || age > MAX_AGE_DAYS * 24 * HOUR) continue;
    if (suspiciousEmail(email)) continue;
    const account = accounts.get(email);
    if (account?.last_sign_in_at) continue;
    const key = `${email}|${row.mp_products.area_id}`;
    const seen = out.get(key);
    if (seen) {
      // Mesma pessoa e área com mais de um produto: junta para o e-mail listar todos.
      if (!seen.products.includes(row.mp_products.title)) seen.products.push(row.mp_products.title);
      continue;
    }
    const mine = reminders.filter((item) => item.email.toLowerCase() === email && item.area_id === row.mp_products.area_id);
    if (mine.length >= MAX_REMINDERS) continue;
    // O 2º lembrete só com 24 h de compra; o 1º, com 3 h.
    if (age < REMINDER_AGE_H[mine.length] * HOUR) continue;
    const last = mine.reduce((max, item) => Math.max(max, new Date(item.created_at).getTime()), 0);
    if (last && now - last < GAP_H * HOUR) continue;
    if (invitedRecently(account, now, lastEmail.get(email) || 0)) continue;
    out.set(key, { email, areaId: row.mp_products.area_id, product: row.mp_products.title, bought_at: row.created_at, has_account: Boolean(account), reminders: mine.length, products: [row.mp_products.title], provider: row.provider || "" });
  }
  return [...out.values()];
}

