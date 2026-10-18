// Conteúdo do manual das aulas do Método Gênio (mesma base do roteiro de gravação).
// Cada aula tem um link próprio: /manual#aula-1-1, /manual#aula-2-2...

export type ManualLink = { label: string; href: string };

export type ManualLesson = {
  id: string;
  title: string;
  summary: string;
  steps?: string[];
  tips?: string[];
  links?: ManualLink[];
  tasks: string[];
};

export type ManualModule = {
  id: string;
  title: string;
  intro: string;
  lessons: ManualLesson[];
};

const PAINEL = "https://painelinteligente.bagencymidia.site/";

export const manualModules: ManualModule[] = [
  {
    id: "m1",
    title: "Módulo 1 · Comece aqui",
    intro: "Ative o painel e conheça onde fica cada coisa.",
    lessons: [
      {
        id: "aula-1-1",
        title: "1.1 Boas-vindas ao Método Gênio",
        summary:
          "Você faz o pedido e o seu produto sai pronto, igual ao gênio da lâmpada. O Painel Inteligente cria o produto, a página de vendas, a copy e os criativos. O curso mostra como colocar à venda e anunciar.",
        steps: [
          "Fazer o pedido do produto no painel",
          "Receber o pacote pronto",
          "Preparar a venda (preço, mockup, plataforma de pagamento e página)",
          "Baixar os criativos",
          "Anunciar com tráfego pago",
        ],
        tips: ["Você não precisa escrever, diagramar, gravar vídeo nem programar."],
        tasks: ["Assistir a aula de boas-vindas", "Ir para a próxima aula e ativar o painel"],
      },
      {
        id: "aula-1-2",
        title: "1.2 Ative seu Painel Inteligente",
        summary: "Depois da compra, você recebe um e-mail para criar a sua senha e entrar no painel.",
        steps: [
          "Abra o e-mail de convite (enviado para o endereço usado na compra)",
          "Clique no botão e defina a sua senha",
          "Entre no painel com e-mail e senha",
          "Confira no rodapé do menu o ponto verde de acesso ativo e a data de validade",
        ],
        tips: [
          "Não achou o e-mail? Procure no lixo, no spam e em promoções.",
          "Esqueceu a senha? Use \"Esqueci minha senha\" na tela de entrada.",
          "Salve o painel nos favoritos para achar rápido.",
        ],
        links: [{ label: "Abrir o Painel Inteligente", href: PAINEL }],
        tasks: ["Criar a senha e entrar no painel", "Conferir o ponto verde de acesso ativo", "Salvar o painel nos favoritos"],
      },
      {
        id: "aula-1-3",
        title: "1.3 Tour do painel em 5 minutos",
        summary: "Um passeio rápido pelo menu. Cada função tem a sua aula.",
        steps: [
          "Início: \"O que vamos criar hoje?\", trilha \"Seu primeiro produto\" e projetos recentes",
          "Criar: Fazer o pedido, Nichos em alta, Criativos prontos e Copy de vendas",
          "Meus projetos: Produto criado e Meus arquivos",
          "Vender: Mockup 3D, Calculadora de lucro e Checklist de lançamento",
          "Aprender: aulas e Mentor",
        ],
        tips: ["Você pode criar 5 produtos por mês e fazer 5 alterações de copy em cada produto."],
        tasks: ["Abrir cada item do menu uma vez"],
      },
    ],
  },
  {
    id: "m2",
    title: "Módulo 2 · Faça o pedido, seu produto sai pronto",
    intro: "Escolha o nicho, faça o pedido e conheça tudo o que vem no pacote.",
    lessons: [
      {
        id: "aula-2-1",
        title: "2.1 Escolhendo o nicho com os Nichos em alta",
        summary:
          "Os Nichos em alta mostram produtos com anúncios reais rodando há mais de 30 dias no Brasil, atualizados toda semana. Quem anuncia por mais de um mês costuma estar vendendo.",
        steps: [
          "Abra Criar → Nichos em alta",
          "Use a busca ou as categorias",
          "Veja no card quantos anunciantes estão ativos e há quantos dias",
          "Clique em \"Ver plano\" para ver promessa, público, ângulo e a prova",
          "Clique em \"Usar no pedido\"",
        ],
        tips: [
          "É um sinal forte de que o nicho vende, não o número de vendas.",
          "Você também pode usar um nicho que já conhece.",
          "Nome do produto é de ação: método, plano, kit, protocolo, checklist. Evite \"guia\" e \"ebook\": quem compra não quer ler, quer resolver.",
        ],
        links: [{ label: "Abrir Nichos em alta", href: PAINEL }],
        tasks: ["Escolher 1 nicho (do painel ou seu)", "Clicar em \"Usar no pedido\""],
      },
      {
        id: "aula-2-2",
        title: "2.2 Fazendo o pedido",
        summary: "Em um clique, o painel cria o produto completo e baixa o pacote no seu computador.",
        steps: [
          "Abra Criar → Fazer o pedido",
          "Preencha o nicho e o público",
          "Escolha o formato: Guia prático, Protocolo passo a passo, Plano de 7 dias, Mapa de ação ou Checklist premium",
          "Escolha o tom de voz",
          "Escreva as informações extras (seu conhecimento, bônus, o que evitar, como falar com o público)",
          "Clique em criar e aguarde de 1 a 2 minutos. O ZIP baixa sozinho",
        ],
        tips: [
          "Público específico vende mais: \"mães de primeira viagem\" em vez de \"mulheres\".",
          "As informações extras são o segredo para o produto sair com a sua cara.",
        ],
        tasks: ["Criar o primeiro produto", "Confirmar que o ZIP foi baixado"],
      },
      {
        id: "aula-2-3",
        title: "2.3 O que vem no seu pacote",
        summary: "O ZIP traz o produto pronto e tudo o que você precisa para vender.",
        steps: [
          "PDF do produto: é o que o seu cliente recebe",
          "Produto editável: para mudar textos se quiser",
          "Página de vendas: já pronta para publicar (aula 3.4)",
          "Copy da página e prompts",
          "Produto criado: veja o conteúdo no painel",
          "Meus arquivos: baixe o pacote de novo quando precisar",
        ],
        tips: ["Os arquivos ficam disponíveis por 30 dias para baixar de novo.", "Leia o PDF inteiro antes de começar a vender."],
        tasks: ["Abrir o ZIP", "Ler o PDF do produto do começo ao fim"],
      },
    ],
  },
  {
    id: "m3",
    title: "Módulo 3 · Prepare para vender",
    intro: "Preço, imagem do produto, plataforma de pagamento e página no ar.",
    lessons: [
      {
        id: "aula-3-1",
        title: "3.1 Calculadora de lucro",
        summary: "Descubra quanto sobra por venda e quanto você pode pagar por venda nos anúncios.",
        steps: [
          "Abra Vender → Calculadora de lucro",
          "Preencha o preço, a taxa da plataforma (% e fixa), o custo por venda e a sua meta",
          "Veja quanto recebe por venda, o lucro, o custo por venda máximo e o ROAS mínimo",
          "Veja quantas vendas por dia você precisa para bater a meta",
        ],
        tips: [
          "Produtos de entrada costumam ficar entre R$ 9,90 e R$ 37.",
          "Anote o custo por venda máximo: você vai usar esse número para analisar os anúncios.",
        ],
        tasks: ["Definir o preço do produto", "Anotar o custo por venda máximo"],
      },
      {
        id: "aula-3-2",
        title: "3.2 Mockup 3D",
        summary: "Uma imagem 3D do produto deixa a oferta mais valiosa na página e nos anúncios.",
        steps: ["Abra Vender → Mockup 3D", "Escolha o modelo: livro, tablet, celular ou kit", "Escolha a cor, o fundo e o tamanho", "Baixe a imagem"],
        tasks: ["Baixar 1 mockup do produto"],
      },
      {
        id: "aula-3-3",
        title: "3.3 Cadastrando o produto na Cakto",
        summary: "A Cakto recebe o pagamento e entrega o produto ao comprador automaticamente.",
        steps: [
          "Crie a sua conta na Cakto",
          "Crie um produto novo com nome, descrição, preço e a imagem do mockup",
          "Configure a entrega com o PDF do produto",
          "Copie o link do checkout",
        ],
        tips: ["Faça uma compra de teste para ver o e-mail que o comprador recebe."],
        links: [{ label: "Abrir a Cakto", href: "https://www.cakto.com.br/" }],
        tasks: ["Produto cadastrado na Cakto", "Link do checkout copiado"],
      },
      {
        id: "aula-3-4",
        title: "3.4 Publicando a página de vendas",
        summary: "A página já vem pronta. Você preenche preço, checkout e pixel no painel e coloca no ar de graça.",
        steps: [
          "Abra Meus projetos → Produto criado",
          "No quadro \"Página de vendas pronta para publicar\", preencha o preço e o link do checkout",
          "Preencha o ID do pixel (se ainda não tiver, volte aqui depois da aula de pixel)",
          "Clique em \"Baixar página pronta\"",
          "Abra o Netlify Drop, crie uma conta grátis e arraste o arquivo",
          "Copie o link da página, abra e clique no botão de compra",
          "Faça uma compra de teste",
        ],
        tips: [
          "Mudou alguma coisa? Baixe a página de novo e arraste no Netlify outra vez.",
          "Preço \"de\" riscado só se for real.",
          "Já tem domínio e hospedagem? Suba o arquivo onde você já usa.",
        ],
        links: [
          { label: "Abrir o Netlify Drop", href: "https://app.netlify.com/drop" },
          { label: "Abrir o Painel Inteligente", href: PAINEL },
        ],
        tasks: ["Página baixada com preço e checkout", "Página no ar pelo Netlify", "Compra de teste feita"],
      },
    ],
  },
  {
    id: "m4",
    title: "Módulo 4 · Criativos e copy",
    intro: "Anúncios prontos em imagem, sem precisar gravar.",
    lessons: [
      {
        id: "aula-4-1",
        title: "4.1 Criativos prontos",
        summary: "O painel desenha os anúncios em imagem a partir do seu produto. Você não precisa gravar nem dominar o assunto.",
        steps: [
          "Abra Criar → Criativos prontos e escolha o projeto",
          "Veja as 5 variações: dor direta, resultado, o que tem dentro, antes e depois e oferta",
          "Escolha os formatos: Feed, Quadrado e Story",
          "Ajuste mockup, cor, preço e o seu @",
          "Veja o carrossel de 6 lâminas",
          "Clique em \"Baixar tudo\" (imagens + legendas)",
        ],
        tips: [
          "Cada variação testa um ângulo diferente. Suba pelo menos 3 para descobrir qual vende mais.",
          "Antes e depois exige cuidado com as regras da Meta (aula 12 de tráfego).",
        ],
        tasks: ["Baixar o ZIP dos criativos", "Escolher 3 variações para o primeiro teste"],
      },
      {
        id: "aula-4-2",
        title: "4.2 Copy de vendas",
        summary: "Textos de anúncio para acompanhar as imagens e roteiros de vídeo para quem quiser gravar.",
        steps: [
          "Abra Criar → Copy de vendas e escolha o projeto",
          "Se quiser, escreva um pedido específico",
          "Copie os textos de anúncio: texto principal, título e descrição",
          "Roteiros de vídeo: gancho, contexto, desenvolvimento e chamada",
        ],
        tips: ["Vídeo é opcional. As imagens com bons textos já bastam para começar."],
        tasks: ["Copiar 3 textos de anúncio"],
      },
    ],
  },
  {
    id: "m5",
    title: "Módulo 5 · Seu plano de lançamento",
    intro: "O mapa até a primeira venda e um mentor para tirar dúvidas.",
    lessons: [
      {
        id: "aula-5-1",
        title: "5.1 Checklist de lançamento e Mentor",
        summary: "O Checklist mostra cada etapa até o anúncio no ar. O Mentor responde dúvidas sobre o seu projeto.",
        steps: [
          "Abra Vender → Checklist de lançamento",
          "Siga as 5 fases; os botões levam à tela certa",
          "Abra Aprender → Mentor e pergunte algo sobre o seu produto",
        ],
        tips: ["O Mentor responde até 15 perguntas por dia e conhece o projeto aberto.", "Próximo passo: o módulo de tráfego pago."],
        tasks: ["Marcar no Checklist o que você já fez", "Fazer 1 pergunta ao Mentor"],
      },
    ],
  },
  {
    id: "m6",
    title: "Tráfego pago do zero",
    intro: "Da conta no Facebook até a análise das campanhas. Siga na ordem.",
    lessons: [
      {
        id: "trafego-1",
        title: "1. Como funciona o tráfego pago e quanto investir",
        summary: "Como o anúncio chega em quem compra e quanto separar para o primeiro teste.",
        links: [{ label: "Abrir a Calculadora de lucro", href: PAINEL }],
        tasks: ["Definir o orçamento do primeiro teste"],
      },
      {
        id: "trafego-2",
        title: "2. Perfil do Facebook, Página e Instagram profissional",
        summary: "A base para anunciar: perfil, Página e Instagram profissional conectados.",
        tasks: ["Página do Facebook criada", "Instagram profissional conectado à Página"],
      },
      {
        id: "trafego-3",
        title: "3. Portfólio empresarial (antigo BM)",
        summary: "Onde ficam a Página, a conta de anúncios e o pixel do seu negócio.",
        links: [{ label: "Abrir o Meta Business", href: "https://business.facebook.com/" }],
        tasks: ["Portfólio empresarial criado"],
      },
      {
        id: "trafego-4",
        title: "4. Conta de anúncios e forma de pagamento",
        summary: "Criar a conta de anúncios e cadastrar como pagar os anúncios.",
        tasks: ["Conta de anúncios criada", "Forma de pagamento cadastrada"],
      },
      {
        id: "trafego-5",
        title: "5. Criando o pixel",
        summary: "O pixel conta quem visitou a página e quem comprou.",
        links: [{ label: "Abrir o Gerenciador de Eventos", href: "https://business.facebook.com/events_manager2" }],
        tasks: ["Pixel criado", "ID do pixel copiado"],
      },
      {
        id: "trafego-6",
        title: "6. Pixel na página e na Cakto",
        summary: "Cole o ID do pixel no painel (a página baixa com ele) e coloque o mesmo pixel na Cakto para contar as compras.",
        links: [
          { label: "Abrir o Painel Inteligente", href: PAINEL },
          { label: "Abrir o Netlify Drop", href: "https://app.netlify.com/drop" },
        ],
        tasks: ["Pixel na página e página publicada de novo", "Pixel na Cakto", "Eventos aparecendo no Gerenciador de Eventos"],
      },
      {
        id: "trafego-7",
        title: "7. Subindo os Criativos prontos",
        summary: "Organizar as imagens e os textos para o primeiro teste.",
        tasks: ["3 criativos separados com os textos"],
      },
      {
        id: "trafego-8",
        title: "8. Primeira campanha de vendas",
        summary: "Criar a campanha com objetivo de vendas, passo a passo.",
        links: [{ label: "Abrir o Gerenciador de Anúncios", href: "https://adsmanager.facebook.com/" }],
        tasks: ["Campanha de vendas criada"],
      },
      {
        id: "trafego-9",
        title: "9. Público, orçamento e os 3 primeiros dias",
        summary: "Configurar público e orçamento e deixar a campanha aprender sem mexer por 3 dias.",
        tasks: ["Campanha publicada", "3 dias sem mexer"],
      },
      {
        id: "trafego-10",
        title: "10. Lendo as métricas",
        summary: "CPM, CTR, CPC, custo por compra e ROAS: o que cada um diz.",
        tasks: ["Comparar o custo por compra com o máximo da Calculadora"],
      },
      {
        id: "trafego-11",
        title: "11. Pausar o que não vende e escalar o que vende",
        summary: "Cortar o que gastou sem vender e aumentar aos poucos o que dá lucro.",
        tasks: ["Pausar o criativo que não vendeu", "Aumentar a verba do que vende (cerca de 20% a cada 2 ou 3 dias)"],
      },
      {
        id: "trafego-12",
        title: "12. Reprovações e bloqueios",
        summary: "Como evitar reprovação de anúncio e o que fazer se a conta for bloqueada.",
        tasks: ["Revisar os anúncios com as regras da aula"],
      },
    ],
  },
];
