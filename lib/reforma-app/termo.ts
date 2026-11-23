// Termo de uso e política de privacidade do App da Reforma (versão exibida no primeiro acesso).
// Texto aprovado pelo Brenno em 23/11/2026: acesso de 12 meses, suporte contato@kitsepromocoes.site, empresa B AGENCY MIDIA.

export const TERMO_VERSAO = "1 · 23/11/2026";
export const TERMO_EMPRESA = "B AGENCY MIDIA, CNPJ 44.588.656/0001-42";
export const TERMO_SUPORTE = "contato@kitsepromocoes.site";

export interface SecaoTermo {
  titulo: string;
  itens: string[];
}

export const TERMO_DE_USO: SecaoTermo[] = [
  {
    titulo: "1. O que é o App da Reforma",
    itens: [
      "É uma ferramenta de simulação para contadores: mostra como os tributos sobre consumo de uma empresa mudam com a Reforma Tributária (IBS, CBS, PIS/Cofins, ICMS e ISS) de 2026 a 2033 e gera um PDF para o cliente.",
      "Os cálculos seguem a EC 132/2023, a LC 214/2025, a LC 227/2026, as resoluções do Comitê Gestor do Simples Nacional e as tabelas oficiais em vigor na data de atualização mostrada em cada simulação.",
      "Valores que a lei ainda não fixou (como a alíquota de referência da CBS em 2027, pendente do Senado, e o IBS de 2029 em diante) aparecem marcados como estimativa.",
    ],
  },
  {
    titulo: "2. Apoio à decisão, não parecer",
    itens: [
      "O resultado depende dos dados informados e é uma estimativa. Ele não substitui a análise do contador nem é parecer contábil ou jurídico.",
      "Antes de orientar o seu cliente, confira os dados e as premissas mostradas na memória de cálculo. A decisão final é sua e do seu cliente.",
      "Não respondemos por decisões tomadas apenas com base nas simulações, nem por mudanças na lei depois da data de atualização.",
    ],
  },
  {
    titulo: "3. Atualizações",
    itens: [
      "Atualizamos as regras quando a lei, o Senado ou a Receita publicarem mudanças. Cada atualização aparece na aba Novidades.",
      "Depois de uma atualização, recalcular um cliente pode mudar o resultado. PDFs já gerados não mudam.",
    ],
  },
  {
    titulo: "4. Acesso",
    itens: [
      "O acesso é pessoal, ligado ao e-mail usado na compra, e vale por 12 meses a partir da data da compra.",
      "Não é permitido compartilhar o login, revender o acesso, copiar o app ou usá-lo para montar um produto concorrente.",
    ],
  },
];

export const POLITICA_PRIVACIDADE: SecaoTermo[] = [
  {
    titulo: "5. Quais dados guardamos",
    itens: [
      "Seus: e-mail de acesso e os dados do escritório que você informar (nome, CRC, WhatsApp, cor e logo).",
      "Dos seus clientes: os dados das empresas que você cadastrar para simular (nome da empresa, município, regime, atividade, faturamento, compras e margem). O app não pede CPF nem dados de pessoas físicas; não inclua esses dados.",
    ],
  },
  {
    titulo: "6. Para que usamos",
    itens: [
      "Só para fazer as simulações, mostrar o resultado e gerar o PDF. Não vendemos, não compartilhamos e não usamos esses dados para anúncios.",
    ],
  },
  {
    titulo: "7. Quem responde por esses dados (LGPD)",
    itens: [
      `Você é o controlador dos dados dos seus clientes e responde por ter base legal para usá-los. A ${TERMO_EMPRESA} atua como operadora: guarda os dados para você usar o app.`,
      "Os dados ficam em servidores do Supabase, com acesso restrito à sua conta (cada usuário só vê os próprios registros).",
    ],
  },
  {
    titulo: "8. Seus direitos e exclusão",
    itens: [
      "Você pode editar ou apagar qualquer cliente quando quiser, direto no app.",
      `Para apagar todos os seus dados ou tirar dúvidas sobre privacidade, escreva para ${TERMO_SUPORTE}. Respondemos em até 15 dias.`,
      "Usamos apenas os cookies necessários para manter você conectado.",
    ],
  },
];
