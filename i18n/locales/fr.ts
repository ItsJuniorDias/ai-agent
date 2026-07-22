import type { Dict } from "./en";

const fr: Dict = {
  common: {
    save: "Enregistrer",
    saveSettings: "Enregistrer les réglages",
    cancel: "Annuler",
    back: "Retour",
    ok: "OK",
    delete: "Supprimer",
    error: "Erreur",
    success: "Succès",
    attention: "Attention",
    disconnect: "Déconnecter",
    optional: "Facultatif",
    requiredTitle: "Champs requis",
    requiredBody: "Remplissez tous les champs pour continuer.",
    loadError: "Impossible de charger les réglages enregistrés.",
    saveError: "Impossible d'enregistrer les réglages.",
    savedOnDevice: "Réglages enregistrés sur cet appareil.",
  },

  tabs: {
    askAI: "Demander à l'IA",
    history: "Historique",
    studio: "Studio",
    files: "Fichiers",
    settings: "Réglages",
  },

  chat: {
    onDuty: "EN SERVICE",
    agent: "Agent",
    clear: "Effacer",
    promptHint: "Que puis-je faire pour vous ?",
    hintSub: "Je peux raisonner sur vos outils connectés et agir seul.",
    newChat: "Nouveau chat",
    missingKeyTitle: "Clé OpenRouter manquante",
    missingKey:
      "Définissez EXPO_PUBLIC_OPENROUTER_API_KEY dans votre .env et redémarrez le bundler.",
    askPlaceholder: "Demandez à l'agent de faire quelque chose",
    clearTitle: "Effacer la conversation",
    clearBody:
      "Supprimer la conversation en cours ? La mémoire long terme n'est pas affectée.",
    cancelled: "Annulé.",
    errorLabel: "Erreur",
    s1: "Passe en revue les pull requests ouvertes de mon dépôt",
    s2: "Résume ce qui a changé cette semaine et poste-le sur Slack",
    s3: "Crée un ticket Jira pour le bug de connexion",
    s4: "Génère une icône d'app : un renard qui lit un livre, vecteur plat",
  },

  history: {
    archive: "ARCHIVE",
    title: "Historique",
    nothingSaved: "Rien d'enregistré pour l'instant.",
    emptySub: "Vos conversations avec l'agent apparaissent ici.",
    noResponse: "Pas encore de réponse",
    deleteTitle: "Supprimer la conversation",
    deleteBody:
      "Êtes-vous sûr de vouloir supprimer cette conversation de votre historique ?",
    deleteError: "Impossible de supprimer la conversation.",
  },

  studio: {
    imageStudio: "Studio d'images",
    subtitle: "{{model}} · via OpenRouter",
    modelFallback: "Modèle d'image",
    generating: "Génération…",
    tryAgain: "Réessayer",
    creationHere: "Votre création apparaîtra ici",
    editingThis: "Édition de cette image avec votre prompt",
    describePlaceholder: "Décrivez l'image — composition, éclairage, style",
    edit: "Éditer",
    generate: "Générer",
    readError: "Impossible de lire cette image.",
    genTimeout:
      "La génération a été trop longue et a été annulée. Réessayez ou changez de modèle dans les Réglages.",
    genFailed: "Échec de la génération",
    permDenied: "Autorisation refusée",
    permDeniedBody:
      "Nous avons besoin de l'autorisation pour enregistrer l'image dans votre bibliothèque.",
    saved: "Enregistrée",
    savedBody: "L'image est dans votre bibliothèque photo.",
    saveImageError: "Impossible d'enregistrer l'image.",
  },

  insights: {
    title: "Insights",
    document: "Document",
    analyzeNow: "Analyser maintenant",
    selectFile: "Touchez pour sélectionner un fichier (PDF, TXT, CSV, IMG)",
    scannedPdf: "PDF scanné (utiliser l'OCR — plus lent, plus coûteux)",
    placeholder:
      "Sélectionnez un fichier et touchez Analyser maintenant pour voir le résumé ici.",
    selectError: "Impossible de sélectionner le document. Réessayez.",
    analysisFailed: "Échec de l'analyse",
    ocrHint:
      "Le parseur n'a trouvé aucune couche de texte. C'est souvent un PDF scanné — activez l'OCR et réessayez.",
    modeSummary: "Résumé",
    modeExtract: "Données clés",
    modeQuestions: "Critique",
    modeActions: "Actions à faire",
  },

  settings: {
    preferences: "PRÉFÉRENCES",
    title: "Réglages",
    missingKeyBanner:
      "Aucune clé OpenRouter trouvée. Ajoutez EXPO_PUBLIC_OPENROUTER_API_KEY à votre .env et redémarrez avec `npx expo start -c`.",
    personalAssistant: "ASSISTANT PERSONNEL",
    proactiveAssistant: "Assistant proactif",
    enabledWatching: "Activé · surveille vos services",
    notificationsBlocked: "Activé · notifications bloquées",
    disabledConfigure: "Désactivé · touchez pour configurer",
    assistantFooter:
      "Alertes en arrière-plan et rappels programmés. L'agent vous prévient des PR en attente de revue, des déploiements cassés et des nouveaux tickets.",
    language: "LANGUE",
    languageFooter:
      "Passer à une langue de droite à gauche inverse toute la mise en page et nécessite un redémarrage de l'app pour prendre pleinement effet.",
    agentModel: "MODÈLE DE L'AGENT",
    modelFooter:
      "Chaque modèle listé prend en charge l'appel d'outils — sans ça l'agent ne peut rien faire. Le prix est entrée / sortie par 1M de tokens.",
    agentBehavior: "COMPORTEMENT DE L'AGENT",
    askBeforeActing: "Demander avant d'agir",
    approveWrites: "Approuver chaque écriture vers un service externe",
    webAccess: "Accès au web",
    webAccessSub: "Laisser l'agent chercher et lire des pages tout seul",
    haptics: "Retour haptique",
    approvalOff:
      "L'approbation est désactivée. L'agent ouvrira des pull requests, enverra des messages et déclenchera des déploiements sans vous demander.",
    maxRounds: "TOURS D'OUTILS MAX",
    maxRoundsFooter:
      "Combien de fois l'agent peut appeler des outils avant de devoir répondre. Plus élevé gère les tâches complexes ; ça coûte aussi plus cher par message.",
    memory: "MÉMOIRE",
    longTermMemory: "Mémoire long terme",
    factOne: "{{count}} fait mémorisé",
    factOther: "{{count}} faits mémorisés",
    clearMemory: "Effacer la mémoire",
    clearMemoryTitle: "Effacer la mémoire long terme",
    clearMemoryBody:
      "Supprimer les {{count}} faits mémorisés ? Cette action est irréversible.",
    imageModel: "MODÈLE D'IMAGE",
    connectedServices: "SERVICES CONNECTÉS · {{count}} OUTILS",
    noServiceConnected:
      "Aucun service connecté pour l'instant. L'agent peut quand même chatter, mémoriser, chercher sur le web et générer des images.",
    toolOne: "{{count}} outil disponible",
    toolOther: "{{count}} outils disponibles",
    servicesFooter:
      "Un service apparaît ici une fois ses identifiants enregistrés. Les outils que vous n'avez pas configurés ne sont jamais proposés au modèle — il ne peut pas les essayer et échouer.",
    manageIntegrations: "Gérer les intégrations",
  },

  assistant: {
    title: "Assistant personnel",
    intro:
      "L'agent devient un assistant qui surveille vos services en arrière-plan et vous notifie quand quelque chose d'important apparaît — une PR en attente de revue, un déploiement cassé, un nouveau ticket qui vous est assigné. Il programme aussi des rappels quand vous le demandez dans le chat.",
    missingKeyBanner:
      "Aucune clé OpenRouter. Les scans ne tourneront pas tant que vous n'aurez pas défini EXPO_PUBLIC_OPENROUTER_API_KEY dans votre .env.",
    enableNotifications: "Activer les notifications",
    enableNotificationsSub:
      "Sans ça l'assistant n'a aucun moyen de vous joindre.",
    settingsBtn: "Réglages",
    enableBtn: "Activer",
    proactiveMonitoring: "SURVEILLANCE PROACTIVE",
    monitorBackground: "Surveiller en arrière-plan",
    monitorBackgroundSub:
      "Scanne vos services et envoie des alertes tout seul",
    statusLine:
      "État du système : {{status}}. Dernier scan : {{when}}{{summary}}.",
    available: "Disponible",
    restricted: "Restreint par le système",
    unavailable: "Indisponible",
    minInterval: "INTERVALLE MINIMUM",
    intervalFooter:
      "Un plancher, pas une horloge. iOS décide quand réveiller l'app et a tendance à grouper les exécutions dans ses propres fenêtres — parfois seulement la nuit. Pour une vérification immédiate, utilisez « Scanner maintenant » ci-dessous ou demandez dans le chat.",
    quietHours: "HEURES SILENCIEUSES",
    silenceNight: "Silence la nuit",
    from: "De",
    to: "à",
    quietFooter:
      "S'applique uniquement aux scans automatiques. Les rappels que vous avez programmés explicitement se déclenchent quand même.",
    watchedServices: "SERVICES SURVEILLÉS",
    noMonitorable:
      "Aucun service surveillable connecté. Connectez GitHub, GitLab, Jira, Linear ou Vercel pour que l'assistant ait quelque chose à surveiller.",
    connectMore: "Connecter plus de services",
    scanNow: "Scanner maintenant",
    scheduledReminders: "RAPPELS PROGRAMMÉS · {{count}}",
    noReminders:
      "Aucun rappel programmé. Demandez dans le chat : « rappelle-moi de faire la revue de la PR demain à 9h ».",
    clearAll: "Tout effacer",
    clearRemindersTitle: "Effacer les rappels",
    clearRemindersBody: "Annuler les {{count}} rappels programmés ?",
    notifDisabledTitle: "Notifications désactivées",
    notifDisabledBody:
      "Autorisez les notifications pour que l'assistant puisse vous joindre.",
    scanOkNotified: "Terminé — {{count}} alerte(s) envoyée(s).",
    scanOkClear: "Scan terminé. Rien d'urgent pour le moment.",
    scanNeedsPermission:
      "Autorisez d'abord les notifications (bouton ci-dessus).",
    scanNoKey:
      "Aucune clé OpenRouter. Configurez le .env pour que l'agent puisse tourner.",
    scanNoTargets:
      "Aucun service surveillable connecté. Connectez GitHub, Jira, Vercel…",
    scanQuiet: "Dans les heures silencieuses — ignoré.",
    scanDisabled: "La surveillance est désactivée.",
    scanFail: "Le scan a échoué.",
  },

  onboarding: {
    setup: "CONFIGURER",
    title: "À quoi l'agent peut-il toucher ?",
    subtitle:
      "Choisissez chaque service que vous utilisez. L'agent décide seul lequel utiliser — vous ne choisissez pas un outil principal.",
    selectAll: "Tout sélectionner",
    deselectAll: "Tout désélectionner",
    setUp: "Configurer",
    note:
      "Sélectionner un service ici indique juste à l'agent qu'il existe. Il ne devient utilisable qu'une fois ses identifiants enregistrés sur son propre écran — touchez « Configurer ».",
    toolsCount: "{{count}} outils seront disponibles pour l'agent",
    continue: "Continuer",
    nothingSelectedTitle: "Rien de sélectionné",
    nothingSelectedBody:
      "Choisissez au moins un service, ou passez — l'agent peut quand même chatter, mémoriser, chercher sur le web et générer des images.",
    skip: "Passer",
    catDev: "Développement et code",
    catPlanning: "Gestion et planification",
    catDesign: "Design",
    catCommunication: "Communication",
    descGithub: "Lire les diffs, faire la revue, ouvrir des PR, créer des tickets",
    descGitlab: "Merge requests, diffs et commentaires",
    descVercel: "Vérifier les déploiements, déclencher un redéploiement",
    descJira: "Chercher avec JQL, créer des tickets, commenter",
    descLinear: "Lister et créer des tickets",
    descNotion: "Chercher dans l'espace de travail, créer des pages",
    descFigma: "Inspecter la structure d'un fichier, laisser des commentaires",
    descSlack: "Lister les canaux, poster des messages",
    descDiscord: "Poster dans un canal via webhook",
    descTeams: "Poster dans un canal",
    descWhatsapp: "Envoyer des messages via l'API Cloud",
    descGmail: "Rédiger et envoyer des emails",
  },

  aiTerms: {
    title: "Intelligence artificielle et vie privée",
    subtitle:
      "Pour fournir nos fonctionnalités d'IA, nous devons partager certaines données. Voici comment nous protégeons votre vie privée.",
    whatTitle: "Quelles données sont envoyées",
    whatBody:
      "Seul le texte que vous tapez dans le chat [OU les photos que vous téléversez] est envoyé pour traitement. Nous n'envoyons pas votre nom, votre email ni vos données de localisation.",
    whoTitle: "À qui nous les envoyons",
    whoBody:
      "Vos données sont envoyées de manière sécurisée à [INSERT AI NAME, e.g., OpenAI / Google Gemini], notre fournisseur de service d'intelligence artificielle partenaire.",
    useTitle: "Utilisation et protection des données",
    useBody:
      "Les données sont utilisées exclusivement pour générer des réponses dans l'app. Nos partenaires n'utilisent pas vos données pour entraîner des modèles d'IA publics.",
    disclaimer:
      "En continuant, vous acceptez de partager les données décrites ci-dessus avec nos partenaires d'IA. Lisez notre ",
    privacyPolicy: "Politique de confidentialité",
    agree: "Accepter et continuer",
    exitTitle: "Quitter les fonctionnalités d'IA",
    exitBody:
      "Vous avez choisi de ne pas partager de données avec nos partenaires d'IA. Vous pouvez toujours utiliser l'app, mais les fonctionnalités d'IA seront désactivées.",
    doNotShare: "Ne pas partager (Quitter)",
  },

  approval: {
    warning:
      "L'agent veut exécuter cette action. Elle est réelle et ne peut pas être annulée.",
    noArgs: "Aucun paramètre.",
    reject: "Rejeter",
    execute: "Exécuter",
    footnote: "Vous pouvez désactiver ces confirmations dans les Réglages.",
  },

  trace: {
    agent: "Agent",
    actionOne: "{{count}} action",
    actionOther: "{{count}} actions",
    withError: " · {{count}} échec(s)",
    open: "Ouvrir",
    concluded: "Terminé",
    failed: "Échoué",
  },

  models: {
    per1M: "par 1M",
    perToken: "par token",
    perImage: "/ image",
    descGeminiFlash: "Rapide, économique et excellent pour l'appel d'outils",
    descClaudeSonnet: "Meilleur raisonnement pour les tâches multi-étapes",
    descGrok: "Coût minimum, contexte de 2M",
    descDeepseek: "Solide en code, prix agressifs",
    descClaudeOpus: "Le plus capable pour les refactos et les longs plans",
    descGeminiLite: "Ultra économique pour les tâches simples",
    descNanoBanana: "Gemini 2.5 Flash Image — stable et rapide",
    descNanoBanana2: "Qualité Pro à la vitesse Flash",
    descSeedream: "Prix fixe par image, excellent en composition",
  },

  conn: {
    github: {
      title: "Configuration GitHub",
      subtitle: "Configuration pour les revues de code assistées par IA",
      connectionSettings: "PARAMÈTRES DE CONNEXION",
      baseUrl: "URL de base de l'API",
      token: "Personal Access Token",
      owner: "Owner (ex. facebook)",
      repo: "Repository (ex. react-native)",
      ownerRepoHint:
        "L'Owner et le Repository forment le chemin du projet. ex. github.com/owner/repository",
      prDetails: "DÉTAILS DE LA PULL REQUEST",
      sourceBranch: "Branche source / Head (ex. feature/new-screen)",
      targetBranch: "Branche cible / Base (ex. main)",
      prTitle: "Titre de la PR",
      prDesc: "Description de la PR",
    },
    gitlab: {
      title: "GitLab",
      description:
        "Configurez votre intégration GitLab pour synchroniser vos dépôts et vos tickets.",
      credentials: "IDENTIFIANTS",
      token: "Personal Access Token",
    },
    vercel: {
      title: "Intégration Vercel",
      description:
        "Configurez vos identifiants pour déclencher un déploiement via l'API.",
      token: "Token",
      projectId: "Project ID",
      teamId: "Team ID",
      startDeployment: "Démarrer le déploiement",
      tokenProjectRequired: "Le Token et le Project ID sont requis.",
      unknownVercelError:
        "Erreur inconnue lors de la communication avec Vercel.",
      deployStarted: "Déploiement démarré 🚀",
      deployStartedBody:
        "Le processus a démarré avec succès !\n\nURL : {{url}}",
      deploymentError: "Erreur de déploiement",
      unknownError: "Erreur inconnue.",
    },
    jira: {
      title: "Intégration Jira",
      subtitle:
        "Configurez vos identifiants Atlassian Cloud pour synchroniser votre espace de travail.",
      accountDetails: "DÉTAILS DU COMPTE",
      email: "Email",
      token: "API Token",
      workspace: "ESPACE DE TRAVAIL",
      domain: "votre-entreprise",
      domainHint: "Trouvez votre domaine dans l'URL de votre navigateur Jira.",
      savedSecurely: "Réglages enregistrés en toute sécurité.",
    },
    linear: {
      title: "Linear",
      description:
        "Laissez l'agent lister et créer des tickets dans votre espace de travail.",
      authentication: "Authentification",
      apiKey: "API Key",
      apiKeyHint: "Linear → Settings → Security & access → Personal API keys.",
      team: "Équipe",
      teamId: "Team ID",
      loadTeamsPlaceholder: "Chargez les équipes ci-dessous",
      teamHint:
        "Linear identifie les équipes par UUID, pas par la clé que vous voyez dans l'UI (« ENG »). Chargez-les depuis votre compte au lieu de la taper.",
      selected: "\n\nSélectionnée : {{name}}.",
      loadTeams: "Charger mes équipes",
      connectedBody:
        "Linear est connecté. L'agent peut l'utiliser maintenant.",
      apiKeyRequired: "L'API Key est requise.",
      failed: "Échec",
      noTeams: "Aucune équipe",
      noTeamsBody: "Cette clé n'a aucune équipe associée.",
      reachError: "Impossible de joindre Linear.",
    },
    notion: {
      title: "Notion",
      description:
        "Laissez l'agent chercher dans votre espace de travail et créer des pages.",
      authentication: "Authentification",
      secretToken: "Secret Token",
      tokenHint:
        "Créez une intégration sur notion.so/my-integrations et copiez l'Internal Integration Secret.",
      workspace: "Espace de travail",
      databaseId: "Database ID",
      databaseHint:
        "La base de données par défaut pour les nouvelles pages. L'agent peut la surcharger par requête. Laissez vide et il demandera.\n\nLa base ne sera pas visible tant que vous ne l'aurez pas partagée avec votre intégration — ouvrez-la dans Notion, puis ••• → Connections → votre intégration. C'est la raison la plus fréquente pour laquelle Notion renvoie « object not found ».",
      tokenRequired: "L'Integration Token est requis.",
      connectedBody:
        "Notion est connecté. L'agent peut l'utiliser maintenant.",
      testConnection: "Tester la connexion",
      connected: "Connecté",
      connectedAs: "Authentifié en tant que {{who}}.",
      workspaceBot: "bot de l'espace de travail",
      integration: "intégration",
      reachError: "Impossible de joindre Notion.",
      failed: "Échec",
    },
    gmail: {
      title: "Gmail",
      description:
        "Laissez l'agent rédiger et envoyer des emails en votre nom.",
      account: "COMPTE",
      email: "Email",
      accountHint:
        "Avec juste une adresse email, l'agent ouvre votre app mail avec le message déjà écrit — vous touchez envoyer.",
      autoSending: "ENVOI AUTOMATIQUE (FACULTATIF)",
      oauthToken: "OAuth access token",
      oauthHint:
        "Collez un token avec le scope gmail.send et l'agent envoie sans demander. Les tokens Google expirent en environ une heure, donc c'est pour tester — survivre à ça nécessite un refresh token, qui nécessite un client secret, qui nécessite un backend. Cette app n'en a jamais eu.",
      getToken: "Obtenir un token dans OAuth Playground",
      checking: "Vérification…",
      testToken: "Tester le token",
      tokenExpiredTitle: "Token expiré",
      tokenExpiredBody:
        "Les access tokens Google durent environ une heure. Générez-en un autre dans l'OAuth Playground.",
      apiRespondedFail: "L'API Gmail a répondu {{status}}.",
      connected: "Connecté",
      connectedBody:
        "Token valide pour {{email}}. L'agent enverra les emails directement via l'API.",
      networkError: "Erreur réseau",
      networkErrorBody: "Impossible de joindre l'API Gmail.",
      missingEmail: "Email manquant",
      missingEmailBody: "Entrez l'adresse du compte.",
      saved: "Enregistré",
      savedTokenBody:
        "L'agent enverra via l'API Gmail tant que le token est valide.",
      savedNoTokenBody:
        "L'agent ouvrira votre app mail avec le message prêt.",
      disconnected: "Déconnecté",
      disconnectedBody: "Les identifiants Gmail ont été supprimés.",
    },
    slack: {
      title: "Slack",
      description:
        "Configurez votre intégration Slack pour envoyer des notifications et synchroniser les messages directement vers vos canaux.",
      authentication: "AUTHENTIFICATION",
      botToken: "Bot Token",
      botTokenHint:
        'Vous pouvez générer un Bot Token dans la configuration de votre Slack App sous « OAuth & Permissions ».',
      workspace: "ESPACE DE TRAVAIL",
      channelId: "Channel ID",
      enableNotifications: "Activer les notifications",
      connectToSlack: "Connecter à Slack",
      botTokenRequired: "Le Bot Token est requis.",
      savedBody: "Configuration Slack enregistrée avec succès !",
      loadError: "Impossible de charger les réglages.",
    },
    teams: {
      title: "Intégration Teams",
      description:
        "Entrez les identifiants de votre app enregistrée dans Microsoft Entra ID.",
      tipTitle: "💡 Où trouver ces clés ?",
      tipBefore: "Allez sur le ",
      tipLink: "Azure Portal (App registrations)",
      tipAfter:
        ". Créez une nouvelle app pour obtenir le Client ID et le Tenant ID. Puis allez sur « Certificates & secrets » pour générer votre Client Secret.",
      clientId: "Client ID",
      tenantId: "Tenant ID",
      clientSecret: "Client Secret",
      clientSecretPlaceholder: "Entrez le client secret",
      connectToTeams: "Connecter à Teams",
      savedBody: "Vos identifiants ont été enregistrés sur cet appareil.",
      fillAll: "Remplissez tous les champs.",
    },
    figma: {
      title: "Intégration Figma",
      description:
        "Entrez votre Personal Access Token et votre File Key pour connecter votre Figma",
      token: "Token",
      tokenPlaceholder: "Personal Access Token",
      fileKey: "File Key",
      footerHint:
        "Vous pouvez trouver votre Personal Access Token dans les réglages de votre compte Figma",
      connectToFigma: "Connecter à Figma",
      fillAll: "Remplissez tous les champs.",
      connecting: "Connexion…",
      connectingBody:
        "Données enregistrées avec succès. Démarrage de l'intégration.",
      saveError: "Impossible d'enregistrer les données.",
    },
    discord: {
      title: "Discord",
      subtitle:
        "Connectez votre agent à un canal Discord en utilisant une URL de Webhook. En option, fournissez un Bot Token pour des fonctionnalités avancées.",
      identity: "IDENTITÉ DE L'IA",
      agentName: "Nom de l'agent",
      temperature: "Temperature (ex. 0.7)",
      integration: "INTÉGRATION DISCORD",
      botTokenOptional: "Bot Token (facultatif)",
      webhookHint:
        "Le Webhook permet à l'IA d'envoyer des messages à un canal spécifique.",
      behavior: "COMPORTEMENT (SYSTEM PROMPT)",
      personalityPlaceholder: "Instructions de personnalité...",
      saveConnect: "Enregistrer et connecter",
      fillRequired:
        "Remplissez le nom, le comportement et l'URL du Webhook.",
      savedBody: "Réglages de l'agent et de Discord enregistrés !",
    },
    whatsapp: {
      title: "WhatsApp",
      subtitle:
        "Configurez votre intégration WhatsApp en fournissant les identifiants nécessaires ci-dessous.",
      token: "TOKEN",
      tokenPlaceholder: "Access token permanent",
      phoneId: "PHONE NUMBER ID",
      recipient: "NUMÉRO DU DESTINATAIRE",
      footerHint:
        "Vérifiez que les Webhooks pointent vers votre serveur backend.",
    },
  },
};

export default fr;
