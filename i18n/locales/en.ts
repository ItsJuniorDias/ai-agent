/**
 * Canonical dictionary. Every key the app uses lives here; the other locales
 * mirror this exact shape (see the `Dict` type). Technical, industry-standard
 * strings — API endpoints, token prefixes (`xoxb-…`, `ntn_…`), UUID examples,
 * brand names — stay literal in the JSX and are intentionally NOT keys here:
 * translating them would only hurt any developer reading the screen.
 */

const en = {
  common: {
    save: "Save",
    saveSettings: "Save Settings",
    cancel: "Cancel",
    back: "Back",
    ok: "OK",
    delete: "Delete",
    error: "Error",
    success: "Success",
    attention: "Attention",
    disconnect: "Disconnect",
    optional: "Optional",
    requiredTitle: "Required fields",
    requiredBody: "Please fill in all fields to continue.",
    loadError: "Could not load the saved settings.",
    saveError: "Could not save the settings.",
    savedOnDevice: "Settings saved on this device.",
  },

  tabs: {
    askAI: "Ask AI",
    history: "History",
    studio: "Studio",
    files: "Files",
    settings: "Settings",
  },

  chat: {
    onDuty: "ON DUTY",
    agent: "Agent",
    clear: "Clear",
    promptHint: "What should I do for you?",
    hintSub: "I can reason across your connected tools and act on my own.",
    newChat: "New Chat",
    missingKeyTitle: "Missing OpenRouter key",
    missingKey:
      "Set EXPO_PUBLIC_OPENROUTER_API_KEY in your .env and restart the bundler.",
    askPlaceholder: "Ask the agent to do something",
    clearTitle: "Clear conversation",
    clearBody:
      "Delete the current conversation? Long-term memory is not affected.",
    cancelled: "Cancelled.",
    errorLabel: "Error",
    s1: "Review the open pull requests on my repo",
    s2: "Summarize what changed this week and post it to Slack",
    s3: "Create a Jira ticket for the login bug",
    s4: "Generate an app icon: a fox reading a book, flat vector",
  },

  history: {
    archive: "ARCHIVE",
    title: "History",
    nothingSaved: "Nothing saved yet.",
    emptySub: "Conversations you have with the agent show up here.",
    noResponse: "No response yet",
    deleteTitle: "Delete conversation",
    deleteBody:
      "Are you sure you want to delete this conversation from your history?",
    deleteError: "Could not delete the conversation.",
  },

  studio: {
    imageStudio: "Image Studio",
    subtitle: "{{model}} · via OpenRouter",
    modelFallback: "Image model",
    generating: "Generating…",
    tryAgain: "Try again",
    creationHere: "Your creation will appear here",
    editingThis: "Editing this image with your prompt",
    describePlaceholder: "Describe the image — composition, lighting, style",
    edit: "Edit",
    generate: "Generate",
    readError: "Could not read that image.",
    genTimeout:
      "Generation took too long and was cancelled. Try again or switch the model in Settings.",
    genFailed: "Generation failed",
    permDenied: "Permission denied",
    permDeniedBody: "We need permission to save the image to your library.",
    saved: "Saved",
    savedBody: "The image is in your photo library.",
    saveImageError: "Could not save the image.",
  },

  insights: {
    title: "Insights",
    document: "Document",
    analyzeNow: "Analyze now",
    selectFile: "Tap to select a file (PDF, TXT, CSV, IMG)",
    scannedPdf: "Scanned PDF (use OCR — slower, costs more)",
    placeholder:
      "Select a file and tap Analyze now to see the insights summary here.",
    selectError: "Could not select the document. Please try again.",
    analysisFailed: "Analysis failed",
    ocrHint:
      "The parser found no text layer. This is usually a scanned PDF — turn on OCR and try again.",
    modeSummary: "Summary",
    modeExtract: "Key data",
    modeQuestions: "Critique",
    modeActions: "Action items",
  },

  settings: {
    preferences: "PREFERENCES",
    title: "Settings",
    missingKeyBanner:
      "No OpenRouter key found. Add EXPO_PUBLIC_OPENROUTER_API_KEY to your .env and restart with `npx expo start -c`.",
    personalAssistant: "PERSONAL ASSISTANT",
    proactiveAssistant: "Proactive assistant",
    enabledWatching: "Enabled · watching your services",
    notificationsBlocked: "Enabled · notifications blocked",
    disabledConfigure: "Disabled · tap to configure",
    assistantFooter:
      "Background alerts and scheduled reminders. The agent tells you about PRs waiting for review, broken deploys and new issues.",
    language: "LANGUAGE",
    languageFooter:
      "Switching to a right-to-left language flips the whole layout and needs an app restart to take full effect.",
    agentModel: "AGENT MODEL",
    modelFooter:
      "Every model listed supports tool calling — without it the agent cannot act at all. Pricing is input / output per 1M tokens.",
    agentBehavior: "AGENT BEHAVIOR",
    askBeforeActing: "Ask before acting",
    approveWrites: "Approve every write to an external service",
    webAccess: "Web access",
    webAccessSub: "Let the agent search and read pages on its own",
    haptics: "Haptic feedback",
    approvalOff:
      "Approval is off. The agent will open pull requests, send messages and trigger deploys without asking you first.",
    maxRounds: "MAX TOOL ROUNDS",
    maxRoundsFooter:
      "How many times the agent may call tools before it must answer. Higher handles harder tasks; it also costs more per message.",
    memory: "MEMORY",
    longTermMemory: "Long-term memory",
    factOne: "{{count}} fact remembered",
    factOther: "{{count}} facts remembered",
    clearMemory: "Clear memory",
    clearMemoryTitle: "Clear long-term memory",
    clearMemoryBody:
      "Delete all {{count}} remembered facts? This cannot be undone.",
    imageModel: "IMAGE MODEL",
    connectedServices: "CONNECTED SERVICES · {{count}} TOOLS",
    noServiceConnected:
      "No service connected yet. The agent can still chat, remember, search the web and generate images.",
    toolOne: "{{count}} tool available",
    toolOther: "{{count}} tools available",
    servicesFooter:
      "A service shows up here once its credentials are saved. Tools you have not configured are never offered to the model — it cannot try and fail on them.",
    manageIntegrations: "Manage integrations",
  },

  assistant: {
    title: "Personal Assistant",
    intro:
      "The agent becomes an assistant that watches your services in the background and pings you when something important shows up — a PR waiting for review, a broken deploy, a new issue assigned to you. It also schedules reminders when you ask in chat.",
    missingKeyBanner:
      "No OpenRouter key. Scans won't run until you set EXPO_PUBLIC_OPENROUTER_API_KEY in your .env.",
    enableNotifications: "Turn on notifications",
    enableNotificationsSub: "Without this the assistant has no way to reach you.",
    settingsBtn: "Settings",
    enableBtn: "Enable",
    proactiveMonitoring: "PROACTIVE MONITORING",
    monitorBackground: "Monitor in the background",
    monitorBackgroundSub: "Scans your services and sends alerts on its own",
    statusLine:
      "System status: {{status}}. Last scan: {{when}}{{summary}}.",
    available: "Available",
    restricted: "Restricted by the system",
    unavailable: "Unavailable",
    minInterval: "MINIMUM INTERVAL",
    intervalFooter:
      "A floor, not a clock. iOS decides when to wake the app and tends to batch runs into its own windows — sometimes only overnight. For an immediate check, use “Scan now” below or ask in chat.",
    quietHours: "QUIET HOURS",
    silenceNight: "Silence at night",
    from: "From",
    to: "to",
    quietFooter:
      "Applies only to automatic scans. Reminders you scheduled explicitly fire regardless.",
    watchedServices: "WATCHED SERVICES",
    noMonitorable:
      "No monitorable service connected. Connect GitHub, GitLab, Jira, Linear or Vercel so the assistant has something to watch.",
    connectMore: "Connect more services",
    scanNow: "Scan now",
    scheduledReminders: "SCHEDULED REMINDERS · {{count}}",
    noReminders:
      "No scheduled reminders. Ask in chat: “remind me to review the PR tomorrow at 9am”.",
    clearAll: "Clear all",
    clearRemindersTitle: "Clear reminders",
    clearRemindersBody: "Cancel the {{count}} scheduled reminders?",
    notifDisabledTitle: "Notifications disabled",
    notifDisabledBody:
      "Allow notifications so the assistant can reach you.",
    scanOkNotified: "Done — {{count}} alert(s) sent.",
    scanOkClear: "Scan complete. Nothing urgent right now.",
    scanNeedsPermission: "Allow notifications first (button above).",
    scanNoKey: "No OpenRouter key. Set the .env for the agent to run.",
    scanNoTargets:
      "No monitorable service connected. Connect GitHub, Jira, Vercel…",
    scanQuiet: "Within quiet hours — skipped.",
    scanDisabled: "Monitor is off.",
    scanFail: "Scan failed.",
  },

  onboarding: {
    setup: "SET UP",
    title: "What can the agent touch?",
    subtitle:
      "Pick every service you use. The agent decides on its own which one to reach for — you are not choosing one primary tool.",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    setUp: "Set up",
    note:
      "Selecting a service here just tells the agent it exists. It only becomes usable once you save its credentials on its own screen — tap “Set up”.",
    toolsCount: "{{count}} tools will be available to the agent",
    continue: "Continue",
    nothingSelectedTitle: "Nothing selected",
    nothingSelectedBody:
      "Pick at least one service, or skip — the agent can still chat, remember, search the web and generate images.",
    skip: "Skip",
    catDev: "Development & Code",
    catPlanning: "Management & Planning",
    catDesign: "Design",
    catCommunication: "Communication",
    descGithub: "Read diffs, review and open PRs, file issues",
    descGitlab: "Merge requests, diffs and comments",
    descVercel: "Check deployments, trigger a redeploy",
    descJira: "Search with JQL, create issues, comment",
    descLinear: "List and create issues",
    descNotion: "Search the workspace, create pages",
    descFigma: "Inspect a file's structure, leave comments",
    descSlack: "List channels, post messages",
    descDiscord: "Post to a channel via webhook",
    descTeams: "Post to a channel",
    descWhatsapp: "Send messages via Cloud API",
    descGmail: "Draft and send email",
  },

  aiTerms: {
    title: "Artificial Intelligence & Privacy",
    subtitle:
      "To provide our AI features, we need to share some data. Here is how we protect your privacy.",
    whatTitle: "What data is sent",
    whatBody:
      "Only the text you type in the chat [OR the photos you upload] is sent for processing. We do not send your name, email, or location data.",
    whoTitle: "Who we send it to",
    whoBody:
      "Your data is securely sent to [INSERT AI NAME, e.g., OpenAI / Google Gemini], our partnered Artificial Intelligence service provider.",
    useTitle: "Data Use & Protection",
    useBody:
      "The data is used exclusively to generate responses within the app. Our partners do not use your data to train public AI models.",
    disclaimer:
      "By continuing, you agree to share the data described above with our AI partners. Read our ",
    privacyPolicy: "Privacy Policy",
    agree: "Agree & Continue",
    exitTitle: "Exit AI Features",
    exitBody:
      "You have chosen not to share data with our AI partners. You can still use the app, but AI features will be disabled.",
    doNotShare: "Do Not Share (Exit)",
  },

  approval: {
    warning: "The agent wants to run this action. It is real and cannot be undone.",
    noArgs: "No parameters.",
    reject: "Reject",
    execute: "Run",
    footnote: "You can turn these confirmations off in Settings.",
  },

  trace: {
    agent: "Agent",
    actionOne: "{{count}} action",
    actionOther: "{{count}} actions",
    withError: " · {{count}} failed",
    open: "Open",
    concluded: "Done",
    failed: "Failed",
  },

  models: {
    per1M: "per 1M",
    perToken: "per token",
    perImage: "/ image",
    descGeminiFlash: "Fast, cheap and great at tool calling",
    descClaudeSonnet: "Best reasoning for multi-step tasks",
    descGrok: "Rock-bottom cost, 2M context",
    descDeepseek: "Strong at code, aggressive pricing",
    descClaudeOpus: "The most capable for refactors and long plans",
    descGeminiLite: "Ultra cheap for simple tasks",
    descNanoBanana: "Gemini 2.5 Flash Image — stable and fast",
    descNanoBanana2: "Pro quality at Flash speed",
    descSeedream: "Flat price per image, great at composition",
  },

  conn: {
    github: {
      title: "GitHub Setup",
      subtitle: "Configuration for AI-powered code reviews",
      connectionSettings: "CONNECTION SETTINGS",
      baseUrl: "API Base URL",
      token: "Personal Access Token",
      owner: "Owner (e.g. facebook)",
      repo: "Repository (e.g. react-native)",
      ownerRepoHint:
        "The Owner and Repository form the project path. e.g. github.com/owner/repository",
      prDetails: "PULL REQUEST DETAILS",
      sourceBranch: "Source Branch / Head (e.g. feature/new-screen)",
      targetBranch: "Target Branch / Base (e.g. main)",
      prTitle: "PR title",
      prDesc: "PR description",
    },
    gitlab: {
      title: "GitLab",
      description:
        "Configure your integration with GitLab to sync your repositories and issues.",
      credentials: "CREDENTIALS",
      token: "Personal Access Token",
    },
    vercel: {
      title: "Vercel Integration",
      description:
        "Configure your credentials to trigger a deployment via API.",
      token: "Token",
      projectId: "Project ID",
      teamId: "Team ID",
      startDeployment: "Start Deployment",
      tokenProjectRequired: "Token and Project ID are required.",
      unknownVercelError: "Unknown error communicating with Vercel.",
      deployStarted: "Deploy Started 🚀",
      deployStartedBody: "The process has started successfully!\n\nURL: {{url}}",
      deploymentError: "Deployment Error",
      unknownError: "Unknown error.",
    },
    jira: {
      title: "Jira Integration",
      subtitle:
        "Configure your Atlassian Cloud credentials to sync your workspace.",
      accountDetails: "ACCOUNT DETAILS",
      email: "Email",
      token: "API Token",
      workspace: "WORKSPACE",
      domain: "your-company",
      domainHint: "Find your domain in your Jira browser URL.",
      savedSecurely: "Settings saved securely.",
    },
    linear: {
      title: "Linear",
      description: "Let the agent list and create issues in your workspace.",
      authentication: "Authentication",
      apiKey: "API Key",
      apiKeyHint: "Linear → Settings → Security & access → Personal API keys.",
      team: "Team",
      teamId: "Team ID",
      loadTeamsPlaceholder: "Load teams below",
      teamHint:
        "Linear identifies teams by UUID, not by the key you see in the UI (“ENG”). Load them from your account instead of typing it.",
      selected: "\n\nSelected: {{name}}.",
      loadTeams: "Load my teams",
      connectedBody: "Linear is connected. The agent can use it now.",
      apiKeyRequired: "The API Key is required.",
      failed: "Failed",
      noTeams: "No teams",
      noTeamsBody: "This key has no teams attached to it.",
      reachError: "Could not reach Linear.",
    },
    notion: {
      title: "Notion",
      description: "Let the agent search your workspace and create pages.",
      authentication: "Authentication",
      secretToken: "Secret Token",
      tokenHint:
        "Create an integration at notion.so/my-integrations and copy the Internal Integration Secret.",
      workspace: "Workspace",
      databaseId: "Database ID",
      databaseHint:
        "The default database for new pages. The agent can override it per request. Leave empty and it will ask.\n\nThe database will not be visible until you share it with your integration — open it in Notion, then ••• → Connections → your integration. This is the single most common reason Notion returns “object not found”.",
      tokenRequired: "The Integration Token is required.",
      connectedBody: "Notion is connected. The agent can use it now.",
      testConnection: "Test connection",
      connected: "Connected",
      connectedAs: "Authenticated as {{who}}.",
      workspaceBot: "workspace bot",
      integration: "integration",
      reachError: "Could not reach Notion.",
      failed: "Failed",
    },
    gmail: {
      title: "Gmail",
      description: "Let the agent draft and send email on your behalf.",
      account: "ACCOUNT",
      email: "Email",
      accountHint:
        "With just an email address, the agent opens your mail app with the message already written — you tap send.",
      autoSending: "AUTOMATIC SENDING (OPTIONAL)",
      oauthToken: "OAuth access token",
      oauthHint:
        "Paste a token with the gmail.send scope and the agent sends without asking. Google tokens expire in about an hour, so this is for testing — surviving that needs a refresh token, which needs a client secret, which needs a backend. This app never had one.",
      getToken: "Get a token in OAuth Playground",
      checking: "Checking…",
      testToken: "Test token",
      tokenExpiredTitle: "Token expired",
      tokenExpiredBody:
        "Google access tokens last about an hour. Generate another in the OAuth Playground.",
      apiRespondedFail: "The Gmail API responded {{status}}.",
      connected: "Connected",
      connectedBody:
        "Token valid for {{email}}. The agent will send email straight through the API.",
      networkError: "Network error",
      networkErrorBody: "Could not reach the Gmail API.",
      missingEmail: "Missing email",
      missingEmailBody: "Enter the account address.",
      saved: "Saved",
      savedTokenBody:
        "The agent will send through the Gmail API while the token is valid.",
      savedNoTokenBody: "The agent will open your mail app with the message ready.",
      disconnected: "Disconnected",
      disconnectedBody: "Gmail credentials were deleted.",
    },
    slack: {
      title: "Slack",
      description:
        "Configure your Slack integration to send notifications and sync messages directly to your channels.",
      authentication: "AUTHENTICATION",
      botToken: "Bot Token",
      botTokenHint:
        'You can generate a Bot Token in your Slack App configuration under "OAuth & Permissions".',
      workspace: "WORKSPACE",
      channelId: "Channel ID",
      enableNotifications: "Enable Notifications",
      connectToSlack: "Connect to Slack",
      botTokenRequired: "The Bot Token is required.",
      savedBody: "Slack configuration saved successfully!",
      loadError: "Could not load the settings.",
    },
    teams: {
      title: "Teams Integration",
      description:
        "Enter the credentials of your app registered in Microsoft Entra ID.",
      tipTitle: "💡 Where to find these keys?",
      tipBefore: "Go to the ",
      tipLink: "Azure Portal (App registrations)",
      tipAfter:
        ". Create a new app to get the Client ID and Tenant ID. Then go to “Certificates & secrets” to generate your Client Secret.",
      clientId: "Client ID",
      tenantId: "Tenant ID",
      clientSecret: "Client Secret",
      clientSecretPlaceholder: "Enter the client secret",
      connectToTeams: "Connect to Teams",
      savedBody: "Your credentials were saved on this device.",
      fillAll: "Please fill in all fields.",
    },
    figma: {
      title: "Figma Integration",
      description:
        "Enter your Personal Access Token and File Key to connect your Figma",
      token: "Token",
      tokenPlaceholder: "Personal Access Token",
      fileKey: "File Key",
      footerHint:
        "You can find your Personal Access Token in your Figma account settings",
      connectToFigma: "Connect to Figma",
      fillAll: "Please fill in all fields.",
      connecting: "Connecting…",
      connectingBody: "Data saved successfully. Starting integration.",
      saveError: "Could not save the data.",
    },
    discord: {
      title: "Discord",
      subtitle:
        "Connect your agent to a Discord channel using a Webhook URL. Optionally, provide a Bot Token for enhanced features.",
      identity: "AI IDENTITY",
      agentName: "Agent name",
      temperature: "Temperature (e.g. 0.7)",
      integration: "DISCORD INTEGRATION",
      botTokenOptional: "Bot Token (Optional)",
      webhookHint: "The Webhook lets the AI send messages to a specific channel.",
      behavior: "BEHAVIOR (SYSTEM PROMPT)",
      personalityPlaceholder: "Personality instructions...",
      saveConnect: "Save & Connect",
      fillRequired: "Please fill in the name, the behavior and the Webhook URL.",
      savedBody: "Agent and Discord settings saved!",
    },
    whatsapp: {
      title: "WhatsApp",
      subtitle:
        "Configure your WhatsApp integration by providing the necessary credentials below.",
      token: "TOKEN",
      tokenPlaceholder: "Permanent access token",
      phoneId: "PHONE NUMBER ID",
      recipient: "RECIPIENT NUMBER",
      footerHint: "Make sure the Webhooks are pointing to your backend server.",
    },
  },
};

export type Dict = typeof en;
export default en;
