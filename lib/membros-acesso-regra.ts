// E-mail "seu acesso chegou": partes puras (sem dependências), testáveis direto. Envio em lib/membros-acesso-email.ts.

export const ACCESS_EMAIL_KIND = "acesso_email";
// Pedido com vários itens (Eduzz manda 1 webhook por item): quem enviar espera isso antes de listar os produtos.
export const ORDER_SETTLE_MS = 8000;
// Sem número de pedido: agrupa por janela de 10 min.
export const NO_ORDER_WINDOW_MS = 10 * 60 * 1000;

const PLATFORMS: Record<string, string> = {
  eduzz: "Eduzz", hotmart: "Hotmart", ticto: "Ticto", cakto: "Cakto", greenn: "Greenn", kiwify: "Kiwify",
};

export function platformName(provider?: string | null) {
  const key = String(provider || "").toLowerCase().trim();
  if (!key) return "";
  return PLATFORMS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

export type AccessProduct = { title: string; position?: number; bump?: boolean };

// Principal = o que não é bump; sem informação, o de menor position; senão o primeiro.
export function pickMain(products: AccessProduct[]) {
  if (!products.length) return null;
  const nonBump = products.filter((item) => !item.bump);
  const pool = nonBump.length ? nonBump : products;
  return pool.reduce((best, item) => ((item.position ?? Infinity) < (best.position ?? Infinity) ? item : best), pool[0]);
}

export function orderedProducts(products: AccessProduct[]) {
  const main = pickMain(products);
  const seen = new Set<string>();
  const out: AccessProduct[] = [];
  for (const item of [main, ...products]) {
    if (!item || seen.has(item.title)) continue;
    seen.add(item.title);
    out.push(item);
  }
  return out;
}

export function accessSubject(products: AccessProduct[], reminder = false) {
  const list = orderedProducts(products);
  const main = list[0]?.title || "Seu acesso";
  const extra = list.length - 1;
  if (reminder) return `Lembrete: seu acesso a ${main} está esperando`.slice(0, 150);
  return `${extra > 0 ? `${main} + ${extra} bônus` : main}: seu acesso chegou ✅`.slice(0, 150);
}

const esc = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

export type AccessEmailInput = {
  brandName: string;
  areaUrl: string;
  iconUrl: string;
  link: string;
  email: string;
  products: AccessProduct[];
  platform?: string;
  reminder?: boolean;
  newAccount?: boolean;
};

export function accessEmailHtml(input: AccessEmailInput) {
  const font = "font-family:Sora,'Segoe UI',Helvetica,Arial,sans-serif;";
  const list = orderedProducts(input.products);
  const platform = input.platform ? esc(input.platform) : "";
  const brand = esc(input.brandName);
  const site = input.areaUrl.replace(/^https?:\/\//, "");
  const title = input.reminder ? "Seu acesso está esperando por você" : "Seu acesso chegou";
  const intro = input.reminder
    ? `Você comprou${platform ? ` na ${platform}` : ""}, mas ainda não entrou na área.`
    : platform ? `Sua compra na ${platform} foi aprovada.` : "Sua compra foi aprovada.";
  const where = `O conteúdo NÃO fica ${platform ? `na ${platform}` : "na plataforma de pagamento"}. Ele fica na área ${brand}:`;
  const items = list
    .map((item) => `<tr><td style="padding:4px 0;${font}font-size:15px;line-height:22px;color:#eef0f6;">&#10003;&nbsp; ${esc(item.title)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background-color:#0a0c12;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0c12;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#121622;border:1px solid #262c3d;border-radius:24px;">
<tr><td align="center" style="padding:36px 36px 0;"><img src="${esc(input.iconUrl)}" height="64" alt="" style="display:block;border:0;border-radius:16px;max-width:240px;"></td></tr>
<tr><td align="center" style="padding:14px 36px 0;${font}font-size:11px;font-weight:600;letter-spacing:4px;color:#f2b441;">${brand.toUpperCase()}</td></tr>
<tr><td align="center" style="padding:12px 36px 0;${font}font-size:25px;line-height:32px;font-weight:700;color:#eef0f6;">${esc(title)}</td></tr>
<tr><td align="center" style="padding:12px 36px 0;${font}font-size:15px;line-height:24px;color:#9aa2b8;">${intro}</td></tr>
<tr><td align="center" style="padding:18px 36px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1b2132;border:1px solid #f2b441;border-radius:14px;"><tr><td align="center" style="padding:16px 18px;${font}font-size:15px;line-height:23px;color:#eef0f6;"><strong>${where}</strong><br><a href="${esc(input.areaUrl)}" style="color:#ffd27a;font-weight:700;">${esc(site)}</a></td></tr></table></td></tr>
<tr><td style="padding:22px 36px 0;${font}font-size:12px;font-weight:600;letter-spacing:2px;color:#6b7390;">${list.length > 1 ? "LIBERADOS NESTA COMPRA" : "LIBERADO NESTA COMPRA"}</td></tr>
<tr><td style="padding:6px 36px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">${items}</table></td></tr>
<tr><td align="center" style="padding:28px 36px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#f2b441" style="border-radius:14px;background-color:#f2b441;">
<a href="${esc(input.link)}" target="_blank" style="display:inline-block;padding:18px 44px;${font}font-size:17px;font-weight:700;color:#1b1405;text-decoration:none;border-radius:14px;">Entrar na área &rarr;</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:24px 36px 32px;${font}font-size:12px;line-height:19px;color:#6b7390;">${input.newAccount ? "Ao entrar pela primeira vez, você cria a sua senha.<br>" : ""}Use este e-mail (${esc(input.email)}) para entrar. Se o botão expirar, abra <a href="${esc(input.areaUrl)}" style="color:#ffd27a;">${esc(site)}</a> e clique em "Esqueci minha senha / primeiro acesso".</td></tr>
</table></td></tr></table></body></html>`;
}
