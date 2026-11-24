// Conta do Chama Acesa: nome de exibição, foto e o que aparece no ranking. Regras puras (sem banco), testadas.

/** Bucket público do Supabase Storage onde ficam as fotos (SQL: banco-conta-ranking.sql). */
export const BUCKET_AVATARES = "chama-avatares";
export const MAX_NOME = 40;
export const MAX_FOTO_BYTES = 150_000;
export const LADO_FOTO = 256;

/** Só o primeiro nome: "Ana Maria Silva" vira "Ana". Nunca devolve e-mail nem sobrenome; sem nome útil vira "Membro". */
export function primeiroNome(nome: unknown): string {
  const t = String(nome ?? "").replace(/\s+/g, " ").trim().split(" ")[0] ?? "";
  if (!t || t.includes("@") || /^https?:/i.test(t)) return "Membro";
  return t.slice(0, 20);
}

/** Valida o nome de exibição digitado. Devolve o nome limpo ou o motivo da recusa (em português, para a tela). */
export function validarNome(cru: unknown): { ok: true; nome: string } | { ok: false; erro: string } {
  const nome = String(cru ?? "").replace(/\s+/g, " ").trim();
  if (nome.length < 2) return { ok: false, erro: "Escreva pelo menos 2 letras." };
  if (nome.length > MAX_NOME) return { ok: false, erro: `Use no máximo ${MAX_NOME} caracteres.` };
  if (/[@<>]/.test(nome) || /https?:|www\./i.test(nome)) return { ok: false, erro: "O nome não pode ter e-mail, link ou símbolos como @ e <." };
  return { ok: true, nome };
}

/** Caminho da foto no bucket: sempre dentro da pasta do próprio usuário. */
export const caminhoAvatar = (userId: string) => `${userId}/avatar`;

/** Regra do upload/remoção: cada pessoa só mexe em arquivo da própria pasta (o servidor monta o caminho; a política do banco repete a mesma regra). */
export function podeMexerNoAvatar(userId: string, caminho: string): boolean {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return false;
  const c = String(caminho || "");
  if (c.includes("..") || c.includes("//") || c.startsWith("/")) return false;
  return c.startsWith(`${userId.toLowerCase()}/`) || c.startsWith(`${userId}/`);
}

export type TipoFoto = "image/webp" | "image/jpeg";

/** Confere o arquivo da foto pelos primeiros bytes (não confia no que o navegador disse) e pelo tamanho. */
export function validarAvatar(bytes: Uint8Array): { ok: true; tipo: TipoFoto } | { ok: false; erro: string } {
  if (bytes.length < 12) return { ok: false, erro: "Imagem inválida." };
  if (bytes.length > MAX_FOTO_BYTES) return { ok: false, erro: "A foto ficou grande demais. Tente outra." };
  const ascii = (i: number, n: number) => String.fromCharCode(...bytes.slice(i, i + n));
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { ok: true, tipo: "image/webp" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ok: true, tipo: "image/jpeg" };
  return { ok: false, erro: "Use uma foto JPG ou WebP." };
}

/** Endereço público da foto (com ?v= para o navegador trocar quando a pessoa muda a foto). */
export function urlAvatar(supabaseUrl: string, userId: string, versao: number): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET_AVATARES}/${caminhoAvatar(userId)}?v=${versao}`;
}

export type PlanoChama = "gratis" | "mensal" | "vitalicio" | "admin";
export const ROTULO_PLANO: Record<PlanoChama, string> = { gratis: "Grátis (dias 1 a 3)", mensal: "Assinatura mensal", vitalicio: "Vitalício", admin: "Administrador" };

export interface Conta {
  nome: string;
  email: string;
  foto: string | null;
  mostrarNoRanking: boolean;
  plano: PlanoChama;
}

export const inicialDe = (nome: string) => (primeiroNome(nome)[0] ?? "M").toUpperCase();
