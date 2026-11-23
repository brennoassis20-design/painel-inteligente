// Vídeos "Como usar". Quando o vídeo estiver pronto, cole o endereço ou o código do YouTube em `youtube`.
export interface VideoAjuda {
  id: string;
  titulo: string;
  resumo: string;
  youtube: string | null;
}

export const VIDEOS: VideoAjuda[] = [
  { id: "iphone", titulo: "Instalar no iPhone", resumo: "Abra no Safari, toque em Compartilhar e em Adicionar à Tela de Início.", youtube: null },
  { id: "android", titulo: "Instalar no Android", resumo: "Abra no Chrome e toque em Instalar app.", youtube: null },
  { id: "computador", titulo: "Usar no computador", resumo: "No Chrome ou no Edge, clique no ícone de instalar ou salve nos favoritos.", youtube: null },
  { id: "usar", titulo: "Como usar o app", resumo: "Cadastrar o cliente, ver o resultado, gerar o PDF com a sua logo e mandar no WhatsApp.", youtube: null },
];

export function youtubeCodigo(entrada: string | null): string | null {
  const v = String(entrada || "").trim();
  if (!v) return null;
  if (/^[\w-]{11}$/.test(v)) return v;
  return v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1] ?? null;
}
