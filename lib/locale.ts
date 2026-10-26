// Idioma e moeda do que o aluno entrega ao comprador (produto, PDF, página de vendas, criativos).
// O painel continua em português; só a entrega muda. Projeto sem `language` é português em reais.
// Sem dependências de Node: pode ser importado pelo cliente e pelo servidor.

export type ProductLanguage = "pt" | "es";
export type Market = "br" | "latam";

export function languageOf(product: { language?: string } | null | undefined): ProductLanguage {
  return product?.language === "es" ? "es" : "pt";
}

export function marketOf(value: unknown): Market {
  return value === "latam" ? "latam" : "br";
}

export const currencyOf = (lang: ProductLanguage) =>
  lang === "es" ? { code: "USD", symbol: "US$", decimal: ".", htmlLang: "es" } : { code: "BRL", symbol: "R$", decimal: ",", htmlLang: "pt-BR" };

// Textos fixos dos modelos, pela frase em português. O que não estiver aqui sai em português.
const es: Record<string, string> = {
  // PDF: editorial
  "capítulos": "capítulos",
  "quadro comparativo": "cuadro comparativo",
  "quadros comparativos": "cuadros comparativos",
  "ações práticas": "acciones prácticas",
  "checklist final": "checklist final",
  "Guia completo": "Método completo",
  "Leitura e consulta": "Consulta y aplicación",
  "Guia editorial": "Método editorial",
  "Neste guia": "En este método",
  "Sumário": "Contenido",
  "Antes de começar": "Antes de empezar",
  "Como usar este guia": "Cómo usar este método",
  "O que você vai encontrar": "Lo que vas a encontrar",
  "Parte": "Parte",
  "Dica": "Consejo",
  "Na vida real": "En la vida real",
  "Pontos-chave": "Puntos clave",
  "Na prática": "En la práctica",
  "Para revisar": "Para revisar",
  "Uma ação por capítulo. Marque à medida que concluir e volte ao capítulo sempre que um item travar.":
    "Una acción por capítulo. Márcala al terminarla y vuelve al capítulo cada vez que algo se trabe.",
  "Capítulo": "Capítulo",
  "Para fechar": "Para cerrar",
  "Checklist final": "Checklist final",
  "Acompanhamento": "Seguimiento",
  "Minha seleção": "Mi selección",
  // PDF: manual
  "Início": "Inicio",
  "Concluído": "Completado",
  "Manual prático": "Manual práctico",
  "etapas": "etapas",
  "fichas": "fichas",
  "tarefas": "tareas",
  "quadro de acompanhamento": "cuadro de seguimiento",
  "Mapa do manual": "Mapa del manual",
  "Seu percurso": "Tu recorrido",
  "Como usar este manual": "Cómo usar este manual",
  "Leia a etapa": "Entiende la etapa",
  "Entenda o objetivo e o passo a passo antes de agir.": "Entiende el objetivo y el paso a paso antes de actuar.",
  "Execute a tarefa": "Haz la tarea",
  "Cada etapa termina com uma ação concreta.": "Cada etapa termina con una acción concreta.",
  "Registre": "Registra",
  "Anote a data e como foi no quadro da própria etapa.": "Anota la fecha y cómo te fue en el cuadro de la misma etapa.",
  "Ao final você terá": "Al final tendrás",
  "Passo a passo": "Paso a paso",
  "Atenção": "Atención",
  "Exemplo": "Ejemplo",
  "Etapa": "Etapa",
  "de": "de",
  "Sua tarefa": "Tu tarea",
  "Feito em ____/____": "Hecho el ____/____",
  "Como foi:": "¿Cómo te fue?",
  "Fácil": "Fácil",
  "Ok": "Bien",
  "Difícil": "Difícil",
  "Anotações": "Notas",
  "Para acompanhar": "Para dar seguimiento",
  "Tarefa da etapa": "Tarea de la etapa",
  "Data": "Fecha",
  "Feito": "Hecho",
  "Percurso concluído": "Recorrido completado",
  // PDF: catálogo
  "Seleção curada": "Selección curada",
  "categorias": "categorías",
  "itens selecionados": "ítems seleccionados",
  "Índice": "Índice",
  "As categorias": "Las categorías",
  "itens": "ítems",
  "Antes de escolher": "Antes de elegir",
  "Como usar esta seleção": "Cómo usar esta selección",
  "Critérios desta seleção": "Criterios de esta selección",
  "O que observar": "Qué observar",
  "Nota da curadoria": "Nota de la curaduría",
  "Em destaque": "Destacado",
  "Categoria": "Categoría",
  "Minha escolha": "Mi elección",
  "Para decidir": "Para decidir",
  "Por quê": "Por qué",
  'Clique em qualquer texto para editar. Para salvar em PDF, use Imprimir (Ctrl+P ou Cmd+P), escolha "Salvar como PDF" e ative "Gráficos de fundo".':
    'Haz clic en cualquier texto para editarlo. Para guardarlo en PDF, usa Imprimir (Ctrl+P o Cmd+P), elige "Guardar como PDF" y activa "Gráficos de fondo".',
  // Página de vendas
  passo: "paso",
  passos: "pasos",
  etapa: "etapa",
  categoria: "categoría",
  "Método pronto para aplicar": "Método listo para aplicar",
  "Plano pronto para seguir": "Plan listo para seguir",
  "Seleção pronta para usar": "Selección lista para usar",
  "Quero acessar agora": "Quiero acceder ahora",
  "Acesso imediato": "Acceso inmediato",
  "Pagamento seguro": "Pago seguro",
  "Garantia de 7 dias": "Garantía de 7 días",
  "Talvez você esteja aqui": "Quizás estás aquí",
  "Se você se reconhece em algum destes…": "Si te reconoces en alguno de estos…",
  "Você já passou por isso?": "¿Ya te pasó esto?",
  "A virada": "El giro",
  "itens comentados": "ítems comentados",
  "Na hora": "Al instante",
  "acesso no celular": "acceso en el celular",
  "e o": "y el",
  "para fechar com tudo em mãos": "para cerrar con todo en tus manos",
  "O que você recebe": "Lo que recibes",
  "O que muda quando você aplica": "Lo que cambia cuando lo aplicas",
  "O que você vai conseguir": "Lo que vas a lograr",
  "Por que vale ter esta seleção": "Por qué vale la pena esta selección",
  "Benefícios": "Beneficios",
  "Seleção": "Selección",
  "Uma espiada por dentro": "Un vistazo por dentro",
  "Veja um trecho real do material": "Mira una parte real del material",
  "Para quem é": "Para quién es",
  "Feito para um tipo de pessoa": "Hecho para un tipo de persona",
  "É para você se…": "Es para ti si…",
  "Não é para você se…": "No es para ti si…",
  "Bônus": "Bonos",
  "Junto com o material": "Junto con el material",
  "prontos para aplicar": "listos para aplicar",
  "para acompanhar a aplicação": "para dar seguimiento a la aplicación",
  "Use no celular, no computador ou imprima": "Úsalo en el celular, en la computadora o imprímelo",
  "Acesso imediato depois da confirmação do pagamento": "Acceso inmediato después de la confirmación del pago",
  Oferta: "Oferta",
  "Tudo o que você leva hoje": "Todo lo que te llevas hoy",
  "Pagamento único. Sem mensalidade.": "Pago único. Sin mensualidades.",
  "dias de<br>garantia": "días de<br>garantía",
  "Risco zero para você": "Riesgo cero para ti",
  "Você tem 7 dias para conhecer o material com calma. Se achar que não é para você, peça o reembolso dentro do prazo e recebe 100% do valor de volta, sem perguntas.":
    "Tienes 7 días para conocer el material con calma. Si sientes que no es para ti, pide el reembolso dentro del plazo y recibes el 100% de tu dinero, sin preguntas.",
  "Como vou receber o material?": "¿Cómo voy a recibir el material?",
  "Logo depois da confirmação do pagamento, você recebe o acesso no e-mail usado na compra. É só baixar e começar.":
    "Apenas se confirma el pago, recibes el acceso en el correo que usaste en la compra. Solo descargas y empiezas.",
  "Consigo usar pelo celular?": "¿Lo puedo usar en el celular?",
  "Sim. O material abre no celular, no tablet ou no computador, e você também pode imprimir se preferir.":
    "Sí. El material se abre en el celular, la tablet o la computadora, y también puedes imprimirlo si prefieres.",
  "E se eu não gostar?": "¿Y si no me gusta?",
  "Você tem 7 dias de garantia. Se não for para você, peça o reembolso dentro do prazo e devolvemos o valor integral.":
    "Tienes 7 días de garantía. Si no es para ti, pide el reembolso dentro del plazo y te devolvemos el valor completo.",
  Dúvidas: "Dudas",
  "Perguntas frequentes": "Preguntas frecuentes",
  "Todos os direitos reservados.": "Todos los derechos reservados.",
  "Este site não faz parte do Facebook nem da Meta Platforms, Inc., e não é endossado por eles.":
    "Este sitio no forma parte de Facebook ni de Meta Platforms, Inc., y no está respaldado por ellos.",
  "Conteúdo educativo. Não substitui a orientação de médico, fisioterapeuta, nutricionista ou outro profissional de saúde. Em caso de dor, sintoma ou condição específica, procure um profissional. Os resultados variam de pessoa para pessoa.":
    "Contenido educativo. No reemplaza la orientación de un médico, fisioterapeuta, nutricionista u otro profesional de la salud. Ante dolor, síntomas o una condición específica, busca a un profesional. Los resultados varían de persona a persona.",
  "Conteúdo educativo, sem recomendação de investimento, crédito ou consultoria financeira individual. Os resultados dependem da situação e das decisões de cada pessoa.":
    "Contenido educativo, sin recomendación de inversión, crédito ni asesoría financiera individual. Los resultados dependen de la situación y de las decisiones de cada persona.",
  "Bônus: ": "Bono: ",
  "Menos do que um lanche no delivery.": "Menos que un café para llevar.",
  "Menos do que uma pizza no fim de semana.": "Menos que una pizza el fin de semana.",
  "Pagamento único, acesso imediato.": "Pago único, acceso inmediato.",
  // Criativos
  "Saiba mais": "Más información",
  "mostra o caminho, passo a passo.": "te muestra el camino, paso a paso.",
  Novo: "Nuevo",
  "Quero começar": "Quiero empezar",
  "O que você vai *receber*": "Lo que vas a *recibir*",
  "Ver tudo": "Ver todo",
  "Antes x *Depois*": "Antes vs *Después*",
  "Um passo a passo claro": "Un paso a paso claro",
  "Sabe exatamente o que fazer": "Sabes exactamente qué hacer",
  "Resultado mais rápido": "Resultado más rápido",
  "Informação solta e confusa": "Información suelta y confusa",
  "Não sabe por onde começar": "No sabes por dónde empezar",
  "Tentativa e erro": "Prueba y error",
  "Quero o depois": "Quiero el después",
  "Quero o meu agora": "Quiero el mío ahora",
  "Leia até o final": "Mira hasta el final",
  "O problema": "El problema",
  "Por que tanta gente *trava* no começo?": "¿Por qué tanta gente se *traba* al inicio?",
  "A maioria tenta resolver no improviso, junta dicas soltas e desiste antes de ver resultado. Não é falta de vontade: é falta de um caminho claro.":
    "La mayoría intenta resolverlo improvisando, junta consejos sueltos y se rinde antes de ver resultados. No es falta de ganas: es falta de un camino claro.",
  "Existe um caminho *mais simples*": "Existe un camino *más simple*",
  "A diferença": "La diferencia",
  "Toque em saiba mais": "Toca en más información",
  "por apenas": "por solo",
  "acesso imediato": "acceso inmediato",
  "Arrasta para o lado": "Desliza hacia el lado",
};

export function translator(lang: ProductLanguage) {
  return (pt: string) => (lang === "es" ? es[pt] ?? pt : pt);
}

// Regras de idioma acrescentadas aos pedidos da IA quando a entrega é em espanhol.
export const spanishRules = `IDIOMA DA ENTREGA: escreva TODOS os textos do JSON (titulo, conteudo, copy, pagina de vendas, faq, prompts) em espanhol neutro da America Latina, tratando o comprador por "tu", com acentuacao e pontuacao corretas do espanhol (¿ ¡ á é í ó ú ñ). Nada em portugues.
- Comprador: pessoas do Mexico, Colombia, Argentina, Chile, Peru e demais paises hispanicos. Use exemplos, medidas, comidas, moedas e costumes que facam sentido para eles (nada especifico do Brasil, como Pix, CPF, reais, SUS ou marcas brasileiras). Quando citar dinheiro, use dolares (US$).
- Nome e copy sem cara de leitura tambem em espanhol: nunca use guia, guía, ebook, e-book, libro, lectura, leer, paginas, páginas ou capitulos/capítulos. Use metodo, plan, sistema, kit, protocolo, mapa, ruta, checklist.`;

// Rede de segurança do título em espanhol, como withoutReadingWords faz no português.
export function withoutReadingWordsEs(value: string) {
  return String(value ?? "")
    .replace(/(?<!\p{L})(e-?book|gu[ií]a|libro)(?!\p{L})/giu, (word) => (word[0] === word[0].toUpperCase() ? "Método" : "método"))
    // A IA às vezes esquece o acento de "método".
    .replace(/(?<!\p{L})([Mm])etodo(s?)(?!\p{L})/gu, "$1étodo$2");
}
