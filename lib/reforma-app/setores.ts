// Atividades da empresa do cliente e a redução que a lei sugere para cada uma (LC 214/2025, com a LC 227/2026).
// Os percentuais NÃO ficam aqui: o código da redução aponta para lib/reforma/parametros.json (reducoes).

export interface Setor {
  id: string;
  nome: string;
  grupo: string;
  /** Código da redução em parametros.json ("nenhuma" = sem redução). */
  reducao: string;
  /** Frase curta explicando de onde vem a sugestão. */
  nota: string;
  /** Mostra o checklist do art. 127 §1º (profissões regulamentadas). */
  checklist127?: boolean;
  /** Profissão do inciso X (educação física): a PJ fica de fora da redução (art. 127 §3º). */
  educacaoFisica?: boolean;
}

const P127 = "Profissão regulamentada do art. 127: −30% se a empresa cumprir TODAS as condições abaixo.";

export const SETORES: Setor[] = [
  // Profissões do art. 127 (18 incisos)
  { id: "contabilidade", nome: "Escritório de contabilidade", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "advocacia", nome: "Escritório de advocacia", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "engenharia", nome: "Engenharia ou agronomia", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "arquitetura", nome: "Arquitetura e urbanismo", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "administracao", nome: "Administração (consultoria de administradores)", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "economia", nome: "Economia ou economia doméstica", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "veterinaria", nome: "Medicina veterinária ou zootecnia", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "estatistica", nome: "Estatística", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "quimica", nome: "Química", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "biologia", nome: "Biologia", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "servico-social", nome: "Serviço social", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "biblioteconomia", nome: "Biblioteconomia ou museologia", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "relacoes-publicas", nome: "Relações públicas", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "tecnicos", nome: "Técnico industrial ou técnico agrícola", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127, checklist127: true },
  { id: "educacao-fisica", nome: "Educação física (profissional)", grupo: "Profissões regulamentadas (art. 127)", reducao: "profissao_regulamentada", nota: P127 + " Atenção: empresa (PJ) de educação física NÃO tem esta redução (art. 127 §3º).", checklist127: true, educacaoFisica: true },
  // Saúde e educação
  { id: "clinica", nome: "Clínica médica ou odontológica", grupo: "Saúde e educação", reducao: "saude", nota: "Serviços de saúde do Anexo III da LC 214: −60% (art. 130)." },
  { id: "laboratorio", nome: "Laboratório, fisioterapia, psicologia, nutrição", grupo: "Saúde e educação", reducao: "saude", nota: "Serviços de saúde do Anexo III da LC 214: −60% (art. 130). Confira o serviço na lista." },
  { id: "hospital", nome: "Hospital ou pronto atendimento", grupo: "Saúde e educação", reducao: "saude", nota: "Serviços de saúde do Anexo III da LC 214: −60% (art. 130)." },
  { id: "escola", nome: "Escola, curso ou ensino", grupo: "Saúde e educação", reducao: "educacao", nota: "Serviços de educação do Anexo II da LC 214: −60% (art. 129)." },
  { id: "farmacia", nome: "Farmácia ou venda de dispositivos médicos", grupo: "Saúde e educação", reducao: "dispositivos_medicos", nota: "Medicamentos e dispositivos das listas da LC 214: −60% (arts. 131-133). Vale só para os itens listados." },
  // Alimentação e hospedagem
  { id: "restaurante", nome: "Bar, restaurante ou lanchonete", grupo: "Alimentação e hospedagem", reducao: "restaurantes_hotelaria", nota: "Bares e restaurantes: −40% (arts. 273-276)." },
  { id: "hotelaria", nome: "Hotel, pousada ou parque", grupo: "Alimentação e hospedagem", reducao: "restaurantes_hotelaria", nota: "Hotelaria e parques: −40% (arts. 273-276)." },
  // Imóveis
  { id: "imobiliaria", nome: "Venda, incorporação ou corretagem de imóveis", grupo: "Imóveis", reducao: "imobiliario", nota: "Operações com bens imóveis: −50% (regime específico imobiliário)." },
  { id: "locacao", nome: "Locação de imóveis", grupo: "Imóveis", reducao: "locacao_imoveis", nota: "Locação, cessão e arrendamento de imóveis: −70% (regime específico imobiliário)." },
  // Comércio e campo
  { id: "mercado", nome: "Mercado ou comércio de alimentos", grupo: "Comércio e campo", reducao: "alimentos_higiene", nota: "Alimentos e higiene das listas da LC 214: −60% (arts. 135-136). Vale só para os itens listados; os demais ficam sem redução." },
  { id: "hortifruti", nome: "Hortifrúti ou ovos (cesta básica)", grupo: "Comércio e campo", reducao: "aliquota_zero", nota: "Cesta básica, hortifrúti e ovos: alíquota zero (art. 125 e arts. 147-148)." },
  { id: "agro", nome: "Produtor rural ou insumos agropecuários", grupo: "Comércio e campo", reducao: "agro", nota: "Produtos in natura e insumos do Anexo IX: −60% (arts. 137-138)." },
  { id: "cultura", nome: "Cultura, eventos, audiovisual ou esporte", grupo: "Comércio e campo", reducao: "cultura_eventos", nota: "Produções artísticas, eventos e atividades desportivas: −60% (arts. 139-142)." },
  // Sem redução
  { id: "comercio", nome: "Comércio em geral (loja, distribuidora)", grupo: "Sem redução", reducao: "nenhuma", nota: "Sem redução setorial: alíquota padrão." },
  { id: "industria", nome: "Indústria", grupo: "Sem redução", reducao: "nenhuma", nota: "Sem redução setorial: alíquota padrão." },
  { id: "servicos", nome: "Prestação de serviços em geral (TI, marketing, oficina, beleza…)", grupo: "Sem redução", reducao: "nenhuma", nota: "Sem redução setorial: alíquota padrão." },
  { id: "transporte", nome: "Transporte de cargas", grupo: "Sem redução", reducao: "nenhuma", nota: "Sem redução setorial: alíquota padrão." },
  { id: "outro", nome: "Outra atividade (informar a redução)", grupo: "Outra", reducao: "outro", nota: "Informe o percentual de redução e a base legal que você identificou." },
];

export const CHECKLIST_127: { id: string; texto: string }[] = [
  { id: "habilitacao", texto: "Os sócios têm habilitação profissional ligada ao objeto da empresa e estão sujeitos à fiscalização do conselho profissional (CRC, OAB, CREA…)." },
  { id: "socio_pj", texto: "Nenhum sócio é pessoa jurídica." },
  { id: "socia_pj", texto: "A empresa não é sócia de outra pessoa jurídica." },
  { id: "atividade", texto: "A empresa não exerce atividade diferente das habilitações dos sócios." },
  { id: "socios_prestam", texto: "O serviço principal é prestado diretamente pelos sócios (pode ter auxiliares e colaboradores)." },
];

export function acharSetor(id: string): Setor | undefined {
  return SETORES.find((s) => s.id === id);
}

function semAcento(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function buscarSetores(consulta: string): Setor[] {
  const q = semAcento(consulta.trim());
  if (!q) return SETORES;
  return SETORES.filter((s) => semAcento(`${s.nome} ${s.grupo}`).includes(q));
}
