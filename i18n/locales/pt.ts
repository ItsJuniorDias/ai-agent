import type { Dict } from "./en";

const pt: Dict = {
  common: {
    save: "Salvar",
    saveSettings: "Salvar configurações",
    cancel: "Cancelar",
    back: "Voltar",
    ok: "OK",
    delete: "Excluir",
    error: "Erro",
    success: "Sucesso",
    attention: "Atenção",
    disconnect: "Desconectar",
    optional: "Opcional",
    requiredTitle: "Campos obrigatórios",
    requiredBody: "Preencha todos os campos para continuar.",
    loadError: "Não foi possível carregar as configurações salvas.",
    saveError: "Não foi possível salvar as configurações.",
    savedOnDevice: "Configurações salvas neste dispositivo.",
  },

  tabs: {
    askAI: "Perguntar",
    history: "Histórico",
    studio: "Estúdio",
    files: "Arquivos",
    settings: "Ajustes",
  },

  chat: {
    onDuty: "EM SERVIÇO",
    agent: "Agente",
    clear: "Limpar",
    promptHint: "O que você quer que eu faça?",
    hintSub:
      "Consigo raciocinar entre suas ferramentas conectadas e agir por conta própria.",
    newChat: "Nova conversa",
    missingKeyTitle: "Chave OpenRouter ausente",
    missingKey:
      "Defina EXPO_PUBLIC_OPENROUTER_API_KEY no .env e reinicie o bundler.",
    askPlaceholder: "Peça algo para o agente fazer",
    clearTitle: "Limpar conversa",
    clearBody:
      "Excluir a conversa atual? A memória de longo prazo não é afetada.",
    cancelled: "Cancelado.",
    errorLabel: "Erro",
    s1: "Revise os pull requests abertos no meu repositório",
    s2: "Resuma o que mudou esta semana e poste no Slack",
    s3: "Crie um ticket no Jira para o bug de login",
    s4: "Gere um ícone de app: uma raposa lendo um livro, vetor flat",
  },

  history: {
    archive: "ARQUIVO",
    title: "Histórico",
    nothingSaved: "Nada salvo ainda.",
    emptySub: "As conversas que você tem com o agente aparecem aqui.",
    noResponse: "Sem resposta ainda",
    deleteTitle: "Excluir conversa",
    deleteBody: "Tem certeza de que quer excluir esta conversa do histórico?",
    deleteError: "Não foi possível excluir a conversa.",
  },

  studio: {
    imageStudio: "Estúdio de imagens",
    subtitle: "{{model}} · via OpenRouter",
    modelFallback: "Modelo de imagem",
    generating: "Gerando…",
    tryAgain: "Tentar novamente",
    creationHere: "Sua criação vai aparecer aqui",
    editingThis: "Editando esta imagem com o seu prompt",
    describePlaceholder: "Descreva a imagem — composição, luz, estilo",
    edit: "Editar",
    generate: "Gerar",
    readError: "Não foi possível ler essa imagem.",
    genTimeout:
      "A geração demorou demais e foi cancelada. Tente de novo ou troque o modelo em Ajustes.",
    genFailed: "Falha na geração",
    permDenied: "Permissão negada",
    permDeniedBody:
      "Precisamos de permissão para salvar a imagem na sua galeria.",
    saved: "Salvo",
    savedBody: "A imagem está na sua galeria de fotos.",
    saveImageError: "Não foi possível salvar a imagem.",
  },

  insights: {
    title: "Insights",
    document: "Documento",
    analyzeNow: "Analisar agora",
    selectFile: "Toque para escolher um arquivo (PDF, TXT, CSV, IMG)",
    scannedPdf: "PDF escaneado (usar OCR — mais lento, custa mais)",
    placeholder:
      "Escolha um arquivo e toque em Analisar agora para ver o resumo aqui.",
    selectError: "Não foi possível selecionar o documento. Tente de novo.",
    analysisFailed: "Falha na análise",
    ocrHint:
      "O parser não achou camada de texto. Costuma ser um PDF escaneado — ligue o OCR e tente de novo.",
    modeSummary: "Resumo",
    modeExtract: "Dados-chave",
    modeQuestions: "Crítica",
    modeActions: "Ações",
  },

  settings: {
    preferences: "PREFERÊNCIAS",
    title: "Ajustes",
    missingKeyBanner:
      "Nenhuma chave OpenRouter encontrada. Adicione EXPO_PUBLIC_OPENROUTER_API_KEY no .env e reinicie com `npx expo start -c`.",
    personalAssistant: "ASSISTENTE PESSOAL",
    proactiveAssistant: "Assistente proativo",
    enabledWatching: "Ligado · vigiando seus serviços",
    notificationsBlocked: "Ligado · notificações bloqueadas",
    disabledConfigure: "Desligado · toque para configurar",
    assistantFooter:
      "Alertas em segundo plano e lembretes agendados. O agente te avisa sobre PRs esperando review, deploys quebrados e issues novas.",
    language: "IDIOMA",
    languageFooter:
      "Trocar para um idioma da direita para a esquerda inverte todo o layout e exige reiniciar o app para valer por completo.",
    agentModel: "MODELO DO AGENTE",
    modelFooter:
      "Todo modelo da lista suporta tool calling — sem isso o agente não age. O preço é entrada / saída por 1M de tokens.",
    agentBehavior: "COMPORTAMENTO DO AGENTE",
    askBeforeActing: "Perguntar antes de agir",
    approveWrites: "Aprove cada alteração em um serviço externo",
    webAccess: "Acesso à web",
    webAccessSub: "Deixe o agente pesquisar e ler páginas sozinho",
    haptics: "Retorno tátil",
    approvalOff:
      "A aprovação está desligada. O agente vai abrir pull requests, enviar mensagens e disparar deploys sem te perguntar antes.",
    maxRounds: "MÁX. DE RODADAS",
    maxRoundsFooter:
      "Quantas vezes o agente pode chamar ferramentas antes de responder. Mais rodadas dão conta de tarefas difíceis; também custam mais por mensagem.",
    memory: "MEMÓRIA",
    longTermMemory: "Memória de longo prazo",
    factOne: "{{count}} fato lembrado",
    factOther: "{{count}} fatos lembrados",
    clearMemory: "Limpar memória",
    clearMemoryTitle: "Limpar memória de longo prazo",
    clearMemoryBody:
      "Excluir todos os {{count}} fatos lembrados? Isso não dá para desfazer.",
    imageModel: "MODELO DE IMAGEM",
    connectedServices: "SERVIÇOS CONECTADOS · {{count}} FERRAMENTAS",
    noServiceConnected:
      "Nenhum serviço conectado ainda. O agente ainda conversa, lembra, pesquisa na web e gera imagens.",
    toolOne: "{{count}} ferramenta disponível",
    toolOther: "{{count}} ferramentas disponíveis",
    servicesFooter:
      "Um serviço aparece aqui assim que suas credenciais são salvas. Ferramentas que você não configurou nunca são oferecidas ao modelo — ele não tem como tentar e falhar nelas.",
    manageIntegrations: "Gerenciar integrações",
  },

  assistant: {
    title: "Assistente pessoal",
    intro:
      "O agente vira um assistente que vigia seus serviços em segundo plano e te avisa por notificação quando algo importante aparece — um PR esperando review, um deploy quebrado, uma issue nova pra você. Ele também agenda lembretes quando você pede no chat.",
    missingKeyBanner:
      "Sem chave do OpenRouter. A varredura não roda até definir EXPO_PUBLIC_OPENROUTER_API_KEY no .env.",
    enableNotifications: "Ative as notificações",
    enableNotificationsSub:
      "Sem isso o assistente não tem como te alcançar.",
    settingsBtn: "Ajustes",
    enableBtn: "Ativar",
    proactiveMonitoring: "MONITORAMENTO PROATIVO",
    monitorBackground: "Monitorar em segundo plano",
    monitorBackgroundSub: "Varre seus serviços e envia alertas sozinho",
    statusLine:
      "Status do sistema: {{status}}. Última varredura: {{when}}{{summary}}.",
    available: "Disponível",
    restricted: "Restrito pelo sistema",
    unavailable: "Indisponível",
    minInterval: "INTERVALO MÍNIMO",
    intervalFooter:
      "Piso, não relógio. O iOS decide quando acordar o app e costuma agrupar as execuções em janelas próprias — às vezes só de madrugada. Para uma checagem imediata, use “Varrer agora” abaixo ou peça no chat.",
    quietHours: "HORÁRIO SILENCIOSO",
    silenceNight: "Silenciar à noite",
    from: "De",
    to: "até",
    quietFooter:
      "Vale só para as varreduras automáticas. Lembretes que você agendou explicitamente disparam de qualquer forma.",
    watchedServices: "SERVIÇOS VIGIADOS",
    noMonitorable:
      "Nenhum serviço monitorável conectado. Conecte GitHub, GitLab, Jira, Linear ou Vercel para o assistente ter o que vigiar.",
    connectMore: "Conectar mais serviços",
    scanNow: "Varrer agora",
    scheduledReminders: "LEMBRETES AGENDADOS · {{count}}",
    noReminders:
      "Nenhum lembrete agendado. Peça no chat: “me lembra de revisar o PR amanhã às 9h”.",
    clearAll: "Limpar todos",
    clearRemindersTitle: "Limpar lembretes",
    clearRemindersBody: "Cancelar os {{count}} lembretes agendados?",
    notifDisabledTitle: "Notificações desativadas",
    notifDisabledBody:
      "Autorize as notificações para o assistente poder te avisar.",
    scanOkNotified: "Pronto — {{count}} alerta(s) enviado(s).",
    scanOkClear: "Varredura concluída. Nada urgente no momento.",
    scanNeedsPermission: "Autorize as notificações primeiro (botão acima).",
    scanNoKey:
      "Sem chave do OpenRouter. Configure o .env para o agente rodar.",
    scanNoTargets:
      "Nenhum serviço monitorável conectado. Conecte GitHub, Jira, Vercel…",
    scanQuiet: "Dentro do horário silencioso — pulei.",
    scanDisabled: "Monitor desligado.",
    scanFail: "Falha na varredura.",
  },

  onboarding: {
    setup: "CONFIGURAR",
    title: "No que o agente pode mexer?",
    subtitle:
      "Escolha todos os serviços que você usa. O agente decide sozinho qual acionar — você não está escolhendo uma ferramenta principal.",
    selectAll: "Selecionar tudo",
    deselectAll: "Desmarcar tudo",
    setUp: "Configurar",
    note:
      "Selecionar um serviço aqui só avisa ao agente que ele existe. Ele só fica utilizável quando você salva as credenciais na tela dele — toque em “Configurar”.",
    toolsCount: "{{count}} ferramentas ficarão disponíveis para o agente",
    continue: "Continuar",
    nothingSelectedTitle: "Nada selecionado",
    nothingSelectedBody:
      "Escolha ao menos um serviço, ou pule — o agente ainda conversa, lembra, pesquisa na web e gera imagens.",
    skip: "Pular",
    catDev: "Desenvolvimento & Código",
    catPlanning: "Gestão & Planejamento",
    catDesign: "Design",
    catCommunication: "Comunicação",
    descGithub: "Ler diffs, revisar e abrir PRs, criar issues",
    descGitlab: "Merge requests, diffs e comentários",
    descVercel: "Ver deployments, disparar um redeploy",
    descJira: "Buscar com JQL, criar issues, comentar",
    descLinear: "Listar e criar issues",
    descNotion: "Buscar no workspace, criar páginas",
    descFigma: "Inspecionar a estrutura de um arquivo, comentar",
    descSlack: "Listar canais, postar mensagens",
    descDiscord: "Postar em um canal via webhook",
    descTeams: "Postar em um canal",
    descWhatsapp: "Enviar mensagens via Cloud API",
    descGmail: "Redigir e enviar e-mail",
  },

  aiTerms: {
    title: "Inteligência Artificial & Privacidade",
    subtitle:
      "Para oferecer nossos recursos de IA, precisamos compartilhar alguns dados. Veja como protegemos sua privacidade.",
    whatTitle: "Quais dados são enviados",
    whatBody:
      "Apenas o texto que você digita no chat [OU as fotos que você envia] é enviado para processamento. Não enviamos seu nome, e-mail nem dados de localização.",
    whoTitle: "Para quem enviamos",
    whoBody:
      "Seus dados são enviados com segurança para [INSIRA O NOME DA IA, ex.: OpenAI / Google Gemini], nosso provedor parceiro de Inteligência Artificial.",
    useTitle: "Uso & Proteção dos dados",
    useBody:
      "Os dados são usados exclusivamente para gerar respostas dentro do app. Nossos parceiros não usam seus dados para treinar modelos públicos de IA.",
    disclaimer:
      "Ao continuar, você concorda em compartilhar os dados descritos acima com nossos parceiros de IA. Leia nossa ",
    privacyPolicy: "Política de Privacidade",
    agree: "Concordar & Continuar",
    exitTitle: "Sair dos recursos de IA",
    exitBody:
      "Você optou por não compartilhar dados com nossos parceiros de IA. Você ainda pode usar o app, mas os recursos de IA ficarão desativados.",
    doNotShare: "Não compartilhar (Sair)",
  },

  approval: {
    warning:
      "O agente quer executar esta ação. Ela é real e não dá para desfazer.",
    noArgs: "Sem parâmetros.",
    reject: "Recusar",
    execute: "Executar",
    footnote: "Você pode desligar essas confirmações em Ajustes.",
  },

  trace: {
    agent: "Agente",
    actionOne: "{{count}} ação",
    actionOther: "{{count}} ações",
    withError: " · {{count}} com erro",
    open: "Abrir",
    concluded: "Concluído",
    failed: "Falhou",
  },

  models: {
    per1M: "por 1M",
    perToken: "por token",
    perImage: "/ imagem",
    descGeminiFlash: "Rápido, barato e ótimo em tool calling",
    descClaudeSonnet: "Melhor raciocínio para tarefas de múltiplos passos",
    descGrok: "Custo baixíssimo, contexto de 2M",
    descDeepseek: "Forte em código, preço agressivo",
    descClaudeOpus: "O mais capaz para refactors e planos longos",
    descGeminiLite: "Ultra barato para tarefas simples",
    descNanoBanana: "Gemini 2.5 Flash Image — estável e rápido",
    descNanoBanana2: "Qualidade Pro na velocidade Flash",
    descSeedream: "Preço fixo por imagem, ótimo em composição",
  },

  conn: {
    github: {
      title: "Configurar GitHub",
      subtitle: "Configuração para code reviews com IA",
      connectionSettings: "CONEXÃO",
      baseUrl: "URL base da API",
      token: "Personal Access Token",
      owner: "Owner (ex.: facebook)",
      repo: "Repositório (ex.: react-native)",
      ownerRepoHint:
        "O Owner e o Repositório formam o caminho do projeto. ex.: github.com/owner/repositorio",
      prDetails: "DETALHES DO PULL REQUEST",
      sourceBranch: "Branch de origem / Head (ex.: feature/nova-tela)",
      targetBranch: "Branch de destino / Base (ex.: main)",
      prTitle: "Título do PR",
      prDesc: "Descrição do PR",
    },
    gitlab: {
      title: "GitLab",
      description:
        "Configure sua integração com o GitLab para sincronizar repositórios e issues.",
      credentials: "CREDENCIAIS",
      token: "Personal Access Token",
    },
    vercel: {
      title: "Integração com Vercel",
      description:
        "Configure suas credenciais para disparar um deploy via API.",
      token: "Token",
      projectId: "Project ID",
      teamId: "Team ID",
      startDeployment: "Iniciar deploy",
      tokenProjectRequired: "Token e Project ID são obrigatórios.",
      unknownVercelError: "Erro desconhecido ao falar com a Vercel.",
      deployStarted: "Deploy iniciado 🚀",
      deployStartedBody: "O processo começou com sucesso!\n\nURL: {{url}}",
      deploymentError: "Erro no deploy",
      unknownError: "Erro desconhecido.",
    },
    jira: {
      title: "Integração com Jira",
      subtitle:
        "Configure suas credenciais do Atlassian Cloud para sincronizar o workspace.",
      accountDetails: "DADOS DA CONTA",
      email: "E-mail",
      token: "API Token",
      workspace: "WORKSPACE",
      domain: "sua-empresa",
      domainHint: "Encontre seu domínio na URL do Jira no navegador.",
      savedSecurely: "Configurações salvas com segurança.",
    },
    linear: {
      title: "Linear",
      description: "Deixe o agente listar e criar issues no seu workspace.",
      authentication: "Autenticação",
      apiKey: "API Key",
      apiKeyHint:
        "Linear → Settings → Security & access → Personal API keys.",
      team: "Time",
      teamId: "Team ID",
      loadTeamsPlaceholder: "Carregue os times abaixo",
      teamHint:
        "O Linear identifica times por UUID, não pela sigla que aparece na UI (“ENG”). Carregue-os da sua conta em vez de digitar.",
      selected: "\n\nSelecionado: {{name}}.",
      loadTeams: "Carregar meus times",
      connectedBody: "O Linear está conectado. O agente já pode usá-lo.",
      apiKeyRequired: "A API Key é obrigatória.",
      failed: "Falhou",
      noTeams: "Sem times",
      noTeamsBody: "Esta key não tem times vinculados.",
      reachError: "Não deu para falar com o Linear.",
    },
    notion: {
      title: "Notion",
      description: "Deixe o agente buscar no seu workspace e criar páginas.",
      authentication: "Autenticação",
      secretToken: "Secret Token",
      tokenHint:
        "Crie uma integração em notion.so/my-integrations e copie o Internal Integration Secret.",
      workspace: "Workspace",
      databaseId: "Database ID",
      databaseHint:
        "A database padrão para novas páginas. O agente pode sobrescrever por requisição. Deixe vazio e ele vai perguntar.\n\nA database não fica visível até você compartilhá-la com a sua integração — abra-a no Notion, depois ••• → Conexões → sua integração. Esse é o motivo nº 1 de o Notion devolver “object not found”.",
      tokenRequired: "O Integration Token é obrigatório.",
      connectedBody: "O Notion está conectado. O agente já pode usá-lo.",
      testConnection: "Testar conexão",
      connected: "Conectado",
      connectedAs: "Autenticado como {{who}}.",
      workspaceBot: "bot do workspace",
      integration: "integração",
      reachError: "Não deu para falar com o Notion.",
      failed: "Falhou",
    },
    gmail: {
      title: "Gmail",
      description: "Deixe o agente redigir e enviar e-mail por você.",
      account: "CONTA",
      email: "E-mail",
      accountHint:
        "Só com o endereço de e-mail, o agente abre seu app de e-mail com a mensagem já escrita — você toca em enviar.",
      autoSending: "ENVIO AUTOMÁTICO (OPCIONAL)",
      oauthToken: "Access token OAuth",
      oauthHint:
        "Cole um token com o escopo gmail.send e o agente envia sem perguntar. Tokens do Google expiram em cerca de uma hora, então isso é para testar — sobreviver a isso exige refresh token, que exige client secret, que exige um backend. Este app nunca teve um.",
      getToken: "Gerar um token no OAuth Playground",
      checking: "Verificando…",
      testToken: "Testar token",
      tokenExpiredTitle: "Token expirado",
      tokenExpiredBody:
        "Access tokens do Google valem cerca de 1 hora. Gere outro no OAuth Playground.",
      apiRespondedFail: "A Gmail API respondeu {{status}}.",
      connected: "Conectado",
      connectedBody:
        "Token válido para {{email}}. O agente vai enviar e-mails direto pela API.",
      networkError: "Erro de rede",
      networkErrorBody: "Não deu para falar com a Gmail API.",
      missingEmail: "Falta o e-mail",
      missingEmailBody: "Informe o endereço da conta.",
      saved: "Salvo",
      savedTokenBody:
        "O agente vai enviar pela Gmail API enquanto o token valer.",
      savedNoTokenBody:
        "O agente vai abrir seu app de e-mail com a mensagem pronta.",
      disconnected: "Desconectado",
      disconnectedBody: "As credenciais do Gmail foram apagadas.",
    },
    slack: {
      title: "Slack",
      description:
        "Configure sua integração com o Slack para enviar notificações e sincronizar mensagens direto nos seus canais.",
      authentication: "AUTENTICAÇÃO",
      botToken: "Bot Token",
      botTokenHint:
        'Você gera um Bot Token na configuração do seu Slack App, em "OAuth & Permissions".',
      workspace: "WORKSPACE",
      channelId: "Channel ID",
      enableNotifications: "Ativar notificações",
      connectToSlack: "Conectar ao Slack",
      botTokenRequired: "O Bot Token é obrigatório.",
      savedBody: "Configuração do Slack salva com sucesso!",
      loadError: "Não foi possível carregar as configurações.",
    },
    teams: {
      title: "Integração com Teams",
      description:
        "Insira as credenciais da sua aplicação registrada no Microsoft Entra ID.",
      tipTitle: "💡 Onde encontrar estas chaves?",
      tipBefore: "Acesse o ",
      tipLink: "Portal do Azure (Registros de aplicações)",
      tipAfter:
        ". Crie uma nova aplicação para obter o Client ID e o Tenant ID. Depois vá em “Certificados e segredos” para gerar o seu Client Secret.",
      clientId: "Client ID",
      tenantId: "Tenant ID",
      clientSecret: "Client Secret",
      clientSecretPlaceholder: "Insira o segredo do cliente",
      connectToTeams: "Conectar ao Teams",
      savedBody: "Suas credenciais foram salvas neste dispositivo.",
      fillAll: "Preencha todos os campos.",
    },
    figma: {
      title: "Integração com Figma",
      description:
        "Informe seu Personal Access Token e File Key para conectar seu Figma",
      token: "Token",
      tokenPlaceholder: "Personal Access Token",
      fileKey: "File Key",
      footerHint:
        "Você encontra seu Personal Access Token nas configurações da sua conta do Figma",
      connectToFigma: "Conectar ao Figma",
      fillAll: "Preencha todos os campos.",
      connecting: "Conectando…",
      connectingBody: "Dados salvos com sucesso. Iniciando integração.",
      saveError: "Não foi possível salvar os dados.",
    },
    discord: {
      title: "Discord",
      subtitle:
        "Conecte seu agente a um canal do Discord usando uma URL de Webhook. Opcionalmente, informe um Bot Token para recursos extras.",
      identity: "IDENTIDADE DA IA",
      agentName: "Nome do agente",
      temperature: "Temperatura (ex.: 0.7)",
      integration: "INTEGRAÇÃO DISCORD",
      botTokenOptional: "Bot Token (opcional)",
      webhookHint:
        "O Webhook permite que a IA envie mensagens para um canal específico.",
      behavior: "COMPORTAMENTO (SYSTEM PROMPT)",
      personalityPlaceholder: "Instruções de personalidade...",
      saveConnect: "Salvar e conectar",
      fillRequired:
        "Preencha o nome, o comportamento e a URL do Webhook.",
      savedBody: "Configurações do agente e do Discord salvas!",
    },
    whatsapp: {
      title: "WhatsApp",
      subtitle:
        "Configure sua integração com o WhatsApp fornecendo as credenciais abaixo.",
      token: "TOKEN",
      tokenPlaceholder: "Access token permanente",
      phoneId: "PHONE NUMBER ID",
      recipient: "NÚMERO DO DESTINATÁRIO",
      footerHint:
        "Garanta que os Webhooks estejam apontando para o seu servidor backend.",
    },
  },
};

export default pt;
