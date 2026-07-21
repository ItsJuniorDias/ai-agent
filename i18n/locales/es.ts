import type { Dict } from "./en";

const es: Dict = {
  common: {
    save: "Guardar",
    saveSettings: "Guardar ajustes",
    cancel: "Cancelar",
    back: "Atrás",
    ok: "OK",
    delete: "Eliminar",
    error: "Error",
    success: "Listo",
    attention: "Atención",
    disconnect: "Desconectar",
    optional: "Opcional",
    requiredTitle: "Campos obligatorios",
    requiredBody: "Completa todos los campos para continuar.",
    loadError: "No se pudieron cargar los ajustes guardados.",
    saveError: "No se pudieron guardar los ajustes.",
    savedOnDevice: "Ajustes guardados en este dispositivo.",
  },

  tabs: {
    askAI: "Preguntar",
    history: "Historial",
    studio: "Estudio",
    files: "Archivos",
    settings: "Ajustes",
  },

  chat: {
    onDuty: "ACTIVO",
    agent: "Agente",
    clear: "Limpiar",
    promptHint: "¿Qué quieres que haga?",
    hintSub:
      "Puedo razonar entre tus herramientas conectadas y actuar por mi cuenta.",
    newChat: "Nuevo chat",
    missingKeyTitle: "Falta la clave de OpenRouter",
    missingKey:
      "Configura EXPO_PUBLIC_OPENROUTER_API_KEY en tu .env y reinicia el bundler.",
    askPlaceholder: "Pídele algo al agente",
    clearTitle: "Limpiar conversación",
    clearBody:
      "¿Eliminar la conversación actual? La memoria a largo plazo no se ve afectada.",
    cancelled: "Cancelado.",
    errorLabel: "Error",
    s1: "Revisa los pull requests abiertos en mi repositorio",
    s2: "Resume lo que cambió esta semana y publícalo en Slack",
    s3: "Crea un ticket de Jira para el bug de inicio de sesión",
    s4: "Genera un ícono de app: un zorro leyendo un libro, vector plano",
  },

  history: {
    archive: "ARCHIVO",
    title: "Historial",
    nothingSaved: "Aún no hay nada guardado.",
    emptySub: "Las conversaciones que tengas con el agente aparecen aquí.",
    noResponse: "Sin respuesta todavía",
    deleteTitle: "Eliminar conversación",
    deleteBody:
      "¿Seguro que quieres eliminar esta conversación de tu historial?",
    deleteError: "No se pudo eliminar la conversación.",
  },

  studio: {
    imageStudio: "Estudio de imágenes",
    subtitle: "{{model}} · vía OpenRouter",
    modelFallback: "Modelo de imagen",
    generating: "Generando…",
    tryAgain: "Intentar de nuevo",
    creationHere: "Tu creación aparecerá aquí",
    editingThis: "Editando esta imagen con tu prompt",
    describePlaceholder: "Describe la imagen — composición, luz, estilo",
    edit: "Editar",
    generate: "Generar",
    readError: "No se pudo leer esa imagen.",
    genTimeout:
      "La generación tardó demasiado y se canceló. Inténtalo de nuevo o cambia el modelo en Ajustes.",
    genFailed: "Falló la generación",
    permDenied: "Permiso denegado",
    permDeniedBody:
      "Necesitamos permiso para guardar la imagen en tu galería.",
    saved: "Guardado",
    savedBody: "La imagen está en tu galería de fotos.",
    saveImageError: "No se pudo guardar la imagen.",
  },

  insights: {
    title: "Información",
    document: "Documento",
    analyzeNow: "Analizar ahora",
    selectFile: "Toca para elegir un archivo (PDF, TXT, CSV, IMG)",
    scannedPdf: "PDF escaneado (usar OCR — más lento, cuesta más)",
    placeholder:
      "Elige un archivo y toca Analizar ahora para ver el resumen aquí.",
    selectError: "No se pudo seleccionar el documento. Inténtalo de nuevo.",
    analysisFailed: "Falló el análisis",
    ocrHint:
      "El parser no encontró capa de texto. Suele ser un PDF escaneado — activa el OCR y vuelve a intentar.",
    modeSummary: "Resumen",
    modeExtract: "Datos clave",
    modeQuestions: "Crítica",
    modeActions: "Acciones",
  },

  settings: {
    preferences: "PREFERENCIAS",
    title: "Ajustes",
    missingKeyBanner:
      "No se encontró la clave de OpenRouter. Añade EXPO_PUBLIC_OPENROUTER_API_KEY a tu .env y reinicia con `npx expo start -c`.",
    personalAssistant: "ASISTENTE PERSONAL",
    proactiveAssistant: "Asistente proactivo",
    enabledWatching: "Activo · vigilando tus servicios",
    notificationsBlocked: "Activo · notificaciones bloqueadas",
    disabledConfigure: "Desactivado · toca para configurar",
    assistantFooter:
      "Alertas en segundo plano y recordatorios programados. El agente te avisa de PRs esperando revisión, deploys rotos e issues nuevas.",
    language: "IDIOMA",
    languageFooter:
      "Cambiar a un idioma de derecha a izquierda invierte todo el diseño y requiere reiniciar la app para aplicarse por completo.",
    agentModel: "MODELO DEL AGENTE",
    modelFooter:
      "Todos los modelos de la lista soportan tool calling — sin eso el agente no puede actuar. El precio es entrada / salida por 1M de tokens.",
    agentBehavior: "COMPORTAMIENTO DEL AGENTE",
    askBeforeActing: "Preguntar antes de actuar",
    approveWrites: "Aprueba cada cambio en un servicio externo",
    webAccess: "Acceso a la web",
    webAccessSub: "Deja que el agente busque y lea páginas por su cuenta",
    haptics: "Respuesta háptica",
    approvalOff:
      "La aprobación está desactivada. El agente abrirá pull requests, enviará mensajes y disparará deploys sin preguntarte antes.",
    maxRounds: "MÁX. DE RONDAS",
    maxRoundsFooter:
      "Cuántas veces puede llamar herramientas el agente antes de responder. Más rondas resuelven tareas difíciles; también cuestan más por mensaje.",
    memory: "MEMORIA",
    longTermMemory: "Memoria a largo plazo",
    factOne: "{{count}} dato recordado",
    factOther: "{{count}} datos recordados",
    clearMemory: "Borrar memoria",
    clearMemoryTitle: "Borrar memoria a largo plazo",
    clearMemoryBody:
      "¿Eliminar los {{count}} datos recordados? Esto no se puede deshacer.",
    imageModel: "MODELO DE IMAGEN",
    connectedServices: "SERVICIOS CONECTADOS · {{count}} HERRAMIENTAS",
    noServiceConnected:
      "Aún no hay ningún servicio conectado. El agente igual puede chatear, recordar, buscar en la web y generar imágenes.",
    toolOne: "{{count}} herramienta disponible",
    toolOther: "{{count}} herramientas disponibles",
    servicesFooter:
      "Un servicio aparece aquí en cuanto se guardan sus credenciales. Las herramientas que no configuraste nunca se le ofrecen al modelo — no puede intentar y fallar con ellas.",
    manageIntegrations: "Gestionar integraciones",
  },

  assistant: {
    title: "Asistente personal",
    intro:
      "El agente se convierte en un asistente que vigila tus servicios en segundo plano y te avisa cuando aparece algo importante — un PR esperando revisión, un deploy roto, una issue nueva asignada a ti. También programa recordatorios cuando lo pides en el chat.",
    missingKeyBanner:
      "Sin clave de OpenRouter. Los escaneos no se ejecutan hasta que configures EXPO_PUBLIC_OPENROUTER_API_KEY en tu .env.",
    enableNotifications: "Activa las notificaciones",
    enableNotificationsSub:
      "Sin esto el asistente no tiene forma de alcanzarte.",
    settingsBtn: "Ajustes",
    enableBtn: "Activar",
    proactiveMonitoring: "MONITOREO PROACTIVO",
    monitorBackground: "Monitorear en segundo plano",
    monitorBackgroundSub: "Escanea tus servicios y envía alertas por su cuenta",
    statusLine:
      "Estado del sistema: {{status}}. Último escaneo: {{when}}{{summary}}.",
    available: "Disponible",
    restricted: "Restringido por el sistema",
    unavailable: "No disponible",
    minInterval: "INTERVALO MÍNIMO",
    intervalFooter:
      "Un piso, no un reloj. iOS decide cuándo despertar la app y suele agrupar las ejecuciones en sus propias ventanas — a veces solo de madrugada. Para una revisión inmediata, usa “Escanear ahora” abajo o pídelo en el chat.",
    quietHours: "HORAS DE SILENCIO",
    silenceNight: "Silenciar de noche",
    from: "De",
    to: "a",
    quietFooter:
      "Aplica solo a los escaneos automáticos. Los recordatorios que programaste explícitamente se disparan igual.",
    watchedServices: "SERVICIOS VIGILADOS",
    noMonitorable:
      "No hay ningún servicio monitoreable conectado. Conecta GitHub, GitLab, Jira, Linear o Vercel para que el asistente tenga algo que vigilar.",
    connectMore: "Conectar más servicios",
    scanNow: "Escanear ahora",
    scheduledReminders: "RECORDATORIOS PROGRAMADOS · {{count}}",
    noReminders:
      "No hay recordatorios programados. Pídelo en el chat: “recuérdame revisar el PR mañana a las 9”.",
    clearAll: "Borrar todos",
    clearRemindersTitle: "Borrar recordatorios",
    clearRemindersBody: "¿Cancelar los {{count}} recordatorios programados?",
    notifDisabledTitle: "Notificaciones desactivadas",
    notifDisabledBody:
      "Permite las notificaciones para que el asistente pueda alcanzarte.",
    scanOkNotified: "Listo — {{count}} alerta(s) enviada(s).",
    scanOkClear: "Escaneo completo. Nada urgente por ahora.",
    scanNeedsPermission: "Permite las notificaciones primero (botón arriba).",
    scanNoKey:
      "Sin clave de OpenRouter. Configura el .env para que el agente se ejecute.",
    scanNoTargets:
      "No hay ningún servicio monitoreable conectado. Conecta GitHub, Jira, Vercel…",
    scanQuiet: "Dentro de las horas de silencio — omitido.",
    scanDisabled: "Monitor apagado.",
    scanFail: "Falló el escaneo.",
  },

  onboarding: {
    setup: "CONFIGURAR",
    title: "¿Qué puede tocar el agente?",
    subtitle:
      "Elige todos los servicios que usas. El agente decide por su cuenta cuál usar — no estás eligiendo una herramienta principal.",
    selectAll: "Seleccionar todo",
    deselectAll: "Deseleccionar todo",
    setUp: "Configurar",
    note:
      "Seleccionar un servicio aquí solo le avisa al agente de que existe. Se vuelve utilizable cuando guardas sus credenciales en su propia pantalla — toca “Configurar”.",
    toolsCount: "{{count}} herramientas estarán disponibles para el agente",
    continue: "Continuar",
    nothingSelectedTitle: "Nada seleccionado",
    nothingSelectedBody:
      "Elige al menos un servicio, o sáltalo — el agente igual puede chatear, recordar, buscar en la web y generar imágenes.",
    skip: "Saltar",
    catDev: "Desarrollo & Código",
    catPlanning: "Gestión & Planificación",
    catDesign: "Diseño",
    catCommunication: "Comunicación",
    descGithub: "Leer diffs, revisar y abrir PRs, crear issues",
    descGitlab: "Merge requests, diffs y comentarios",
    descVercel: "Ver deployments, disparar un redeploy",
    descJira: "Buscar con JQL, crear issues, comentar",
    descLinear: "Listar y crear issues",
    descNotion: "Buscar en el workspace, crear páginas",
    descFigma: "Inspeccionar la estructura de un archivo, comentar",
    descSlack: "Listar canales, publicar mensajes",
    descDiscord: "Publicar en un canal vía webhook",
    descTeams: "Publicar en un canal",
    descWhatsapp: "Enviar mensajes vía Cloud API",
    descGmail: "Redactar y enviar correo",
  },

  aiTerms: {
    title: "Inteligencia Artificial & Privacidad",
    subtitle:
      "Para ofrecer nuestras funciones de IA, necesitamos compartir algunos datos. Así protegemos tu privacidad.",
    whatTitle: "Qué datos se envían",
    whatBody:
      "Solo el texto que escribes en el chat [O las fotos que subes] se envía para procesarse. No enviamos tu nombre, correo ni datos de ubicación.",
    whoTitle: "A quién los enviamos",
    whoBody:
      "Tus datos se envían de forma segura a [INSERTA EL NOMBRE DE LA IA, p. ej., OpenAI / Google Gemini], nuestro proveedor asociado de Inteligencia Artificial.",
    useTitle: "Uso & Protección de datos",
    useBody:
      "Los datos se usan exclusivamente para generar respuestas dentro de la app. Nuestros socios no usan tus datos para entrenar modelos públicos de IA.",
    disclaimer:
      "Al continuar, aceptas compartir los datos descritos arriba con nuestros socios de IA. Lee nuestra ",
    privacyPolicy: "Política de Privacidad",
    agree: "Aceptar & Continuar",
    exitTitle: "Salir de las funciones de IA",
    exitBody:
      "Elegiste no compartir datos con nuestros socios de IA. Aún puedes usar la app, pero las funciones de IA quedarán desactivadas.",
    doNotShare: "No compartir (Salir)",
  },

  approval: {
    warning:
      "El agente quiere ejecutar esta acción. Es real y no se puede deshacer.",
    noArgs: "Sin parámetros.",
    reject: "Rechazar",
    execute: "Ejecutar",
    footnote: "Puedes desactivar estas confirmaciones en Ajustes.",
  },

  trace: {
    agent: "Agente",
    actionOne: "{{count}} acción",
    actionOther: "{{count}} acciones",
    withError: " · {{count}} con error",
    open: "Abrir",
    concluded: "Hecho",
    failed: "Falló",
  },

  models: {
    per1M: "por 1M",
    perToken: "por token",
    perImage: "/ imagen",
    descGeminiFlash: "Rápido, barato y excelente en tool calling",
    descClaudeSonnet: "Mejor razonamiento para tareas de varios pasos",
    descGrok: "Costo bajísimo, contexto de 2M",
    descDeepseek: "Fuerte en código, precio agresivo",
    descClaudeOpus: "El más capaz para refactors y planes largos",
    descGeminiLite: "Ultra barato para tareas simples",
    descNanoBanana: "Gemini 2.5 Flash Image — estable y rápido",
    descNanoBanana2: "Calidad Pro a velocidad Flash",
    descSeedream: "Precio fijo por imagen, excelente en composición",
  },

  conn: {
    github: {
      title: "Configurar GitHub",
      subtitle: "Configuración para code reviews con IA",
      connectionSettings: "CONEXIÓN",
      baseUrl: "URL base de la API",
      token: "Personal Access Token",
      owner: "Owner (p. ej. facebook)",
      repo: "Repositorio (p. ej. react-native)",
      ownerRepoHint:
        "El Owner y el Repositorio forman la ruta del proyecto. p. ej. github.com/owner/repositorio",
      prDetails: "DETALLES DEL PULL REQUEST",
      sourceBranch: "Branch de origen / Head (p. ej. feature/nueva-pantalla)",
      targetBranch: "Branch de destino / Base (p. ej. main)",
      prTitle: "Título del PR",
      prDesc: "Descripción del PR",
    },
    gitlab: {
      title: "GitLab",
      description:
        "Configura tu integración con GitLab para sincronizar repositorios e issues.",
      credentials: "CREDENCIALES",
      token: "Personal Access Token",
    },
    vercel: {
      title: "Integración con Vercel",
      description:
        "Configura tus credenciales para disparar un deploy vía API.",
      token: "Token",
      projectId: "Project ID",
      teamId: "Team ID",
      startDeployment: "Iniciar deploy",
      tokenProjectRequired: "El Token y el Project ID son obligatorios.",
      unknownVercelError: "Error desconocido al comunicar con Vercel.",
      deployStarted: "Deploy iniciado 🚀",
      deployStartedBody: "¡El proceso comenzó con éxito!\n\nURL: {{url}}",
      deploymentError: "Error en el deploy",
      unknownError: "Error desconocido.",
    },
    jira: {
      title: "Integración con Jira",
      subtitle:
        "Configura tus credenciales de Atlassian Cloud para sincronizar tu workspace.",
      accountDetails: "DATOS DE LA CUENTA",
      email: "Correo",
      token: "API Token",
      workspace: "WORKSPACE",
      domain: "tu-empresa",
      domainHint: "Encuentra tu dominio en la URL de Jira del navegador.",
      savedSecurely: "Ajustes guardados de forma segura.",
    },
    linear: {
      title: "Linear",
      description: "Deja que el agente liste y cree issues en tu workspace.",
      authentication: "Autenticación",
      apiKey: "API Key",
      apiKeyHint:
        "Linear → Settings → Security & access → Personal API keys.",
      team: "Equipo",
      teamId: "Team ID",
      loadTeamsPlaceholder: "Carga los equipos abajo",
      teamHint:
        "Linear identifica los equipos por UUID, no por la clave que ves en la UI (“ENG”). Cárgalos desde tu cuenta en vez de escribirlo.",
      selected: "\n\nSeleccionado: {{name}}.",
      loadTeams: "Cargar mis equipos",
      connectedBody: "Linear está conectado. El agente ya puede usarlo.",
      apiKeyRequired: "La API Key es obligatoria.",
      failed: "Falló",
      noTeams: "Sin equipos",
      noTeamsBody: "Esta clave no tiene equipos vinculados.",
      reachError: "No se pudo contactar con Linear.",
    },
    notion: {
      title: "Notion",
      description: "Deja que el agente busque en tu workspace y cree páginas.",
      authentication: "Autenticación",
      secretToken: "Secret Token",
      tokenHint:
        "Crea una integración en notion.so/my-integrations y copia el Internal Integration Secret.",
      workspace: "Workspace",
      databaseId: "Database ID",
      databaseHint:
        "La database por defecto para páginas nuevas. El agente puede sobrescribirla por petición. Déjalo vacío y preguntará.\n\nLa database no será visible hasta que la compartas con tu integración — ábrela en Notion, luego ••• → Conexiones → tu integración. Es la razón más común de que Notion devuelva “object not found”.",
      tokenRequired: "El Integration Token es obligatorio.",
      connectedBody: "Notion está conectado. El agente ya puede usarlo.",
      testConnection: "Probar conexión",
      connected: "Conectado",
      connectedAs: "Autenticado como {{who}}.",
      workspaceBot: "bot del workspace",
      integration: "integración",
      reachError: "No se pudo contactar con Notion.",
      failed: "Falló",
    },
    gmail: {
      title: "Gmail",
      description: "Deja que el agente redacte y envíe correo por ti.",
      account: "CUENTA",
      email: "Correo",
      accountHint:
        "Solo con la dirección de correo, el agente abre tu app de correo con el mensaje ya escrito — tú tocas enviar.",
      autoSending: "ENVÍO AUTOMÁTICO (OPCIONAL)",
      oauthToken: "Access token OAuth",
      oauthHint:
        "Pega un token con el scope gmail.send y el agente envía sin preguntar. Los tokens de Google expiran en cerca de una hora, así que esto es para probar — sobrevivir a eso requiere refresh token, que requiere client secret, que requiere un backend. Esta app nunca tuvo uno.",
      getToken: "Obtener un token en OAuth Playground",
      checking: "Verificando…",
      testToken: "Probar token",
      tokenExpiredTitle: "Token expirado",
      tokenExpiredBody:
        "Los access tokens de Google duran cerca de una hora. Genera otro en el OAuth Playground.",
      apiRespondedFail: "La Gmail API respondió {{status}}.",
      connected: "Conectado",
      connectedBody:
        "Token válido para {{email}}. El agente enviará correo directo por la API.",
      networkError: "Error de red",
      networkErrorBody: "No se pudo contactar con la Gmail API.",
      missingEmail: "Falta el correo",
      missingEmailBody: "Indica la dirección de la cuenta.",
      saved: "Guardado",
      savedTokenBody:
        "El agente enviará por la Gmail API mientras el token sea válido.",
      savedNoTokenBody:
        "El agente abrirá tu app de correo con el mensaje listo.",
      disconnected: "Desconectado",
      disconnectedBody: "Las credenciales de Gmail se eliminaron.",
    },
    slack: {
      title: "Slack",
      description:
        "Configura tu integración con Slack para enviar notificaciones y sincronizar mensajes directo a tus canales.",
      authentication: "AUTENTICACIÓN",
      botToken: "Bot Token",
      botTokenHint:
        'Puedes generar un Bot Token en la configuración de tu Slack App, en "OAuth & Permissions".',
      workspace: "WORKSPACE",
      channelId: "Channel ID",
      enableNotifications: "Activar notificaciones",
      connectToSlack: "Conectar a Slack",
      botTokenRequired: "El Bot Token es obligatorio.",
      savedBody: "¡Configuración de Slack guardada con éxito!",
      loadError: "No se pudieron cargar los ajustes.",
    },
    teams: {
      title: "Integración con Teams",
      description:
        "Introduce las credenciales de tu aplicación registrada en Microsoft Entra ID.",
      tipTitle: "💡 ¿Dónde encontrar estas claves?",
      tipBefore: "Ve al ",
      tipLink: "Portal de Azure (Registros de aplicaciones)",
      tipAfter:
        ". Crea una nueva aplicación para obtener el Client ID y el Tenant ID. Luego ve a “Certificados y secretos” para generar tu Client Secret.",
      clientId: "Client ID",
      tenantId: "Tenant ID",
      clientSecret: "Client Secret",
      clientSecretPlaceholder: "Introduce el secreto del cliente",
      connectToTeams: "Conectar a Teams",
      savedBody: "Tus credenciales se guardaron en este dispositivo.",
      fillAll: "Completa todos los campos.",
    },
    figma: {
      title: "Integración con Figma",
      description:
        "Introduce tu Personal Access Token y File Key para conectar tu Figma",
      token: "Token",
      tokenPlaceholder: "Personal Access Token",
      fileKey: "File Key",
      footerHint:
        "Encuentras tu Personal Access Token en los ajustes de tu cuenta de Figma",
      connectToFigma: "Conectar a Figma",
      fillAll: "Completa todos los campos.",
      connecting: "Conectando…",
      connectingBody: "Datos guardados con éxito. Iniciando integración.",
      saveError: "No se pudieron guardar los datos.",
    },
    discord: {
      title: "Discord",
      subtitle:
        "Conecta tu agente a un canal de Discord usando una URL de Webhook. Opcionalmente, proporciona un Bot Token para funciones extra.",
      identity: "IDENTIDAD DE LA IA",
      agentName: "Nombre del agente",
      temperature: "Temperatura (p. ej. 0.7)",
      integration: "INTEGRACIÓN DISCORD",
      botTokenOptional: "Bot Token (opcional)",
      webhookHint:
        "El Webhook permite que la IA envíe mensajes a un canal específico.",
      behavior: "COMPORTAMIENTO (SYSTEM PROMPT)",
      personalityPlaceholder: "Instrucciones de personalidad...",
      saveConnect: "Guardar y conectar",
      fillRequired:
        "Completa el nombre, el comportamiento y la URL del Webhook.",
      savedBody: "¡Ajustes del agente y de Discord guardados!",
    },
    whatsapp: {
      title: "WhatsApp",
      subtitle:
        "Configura tu integración con WhatsApp proporcionando las credenciales de abajo.",
      token: "TOKEN",
      tokenPlaceholder: "Access token permanente",
      phoneId: "PHONE NUMBER ID",
      recipient: "NÚMERO DEL DESTINATARIO",
      footerHint:
        "Asegúrate de que los Webhooks apunten a tu servidor backend.",
    },
  },
};

export default es;
