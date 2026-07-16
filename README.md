# AI Agent

App Expo/React Native onde uma IA decide o que fazer e executa, usando OpenRouter
para o modelo e tool calling para as ações.

A diferença em relação à versão anterior está em uma linha. Antes:

```ts
switch (activeIntegration) {
  case "github": await processGitHubAction(input); break;
  case "jira":   await processJiraAction(input);   break;
}
```

A integração era escolhida no onboarding, e o texto cru do input ia para uma
função hardcoded. A IA não decidia nada — era um chat com atalhos. Agora o modelo
recebe o catálogo de tools e decide sozinho o que chamar, com quais argumentos,
em que ordem, e quando parar.

Na prática: peça *"revise os PRs abertos e manda o resumo no Slack"* e ele encadeia
`github_list_pull_requests` → `github_get_pull_request_diff` → `slack_send_message`,
pedindo sua aprovação antes de postar.

## Rodando

```bash
npm install
cp .env.example .env    # coloque sua chave do OpenRouter
npx expo start -c
```

O `-c` limpa o cache do Metro. É necessário na primeira vez, porque as variáveis
`EXPO_PUBLIC_*` são inlined no bundle em tempo de build — mudar o `.env` sem
limpar o cache não tem efeito nenhum.

Precisa de development build (`npx expo run:ios`), não Expo Go: o app usa módulos
nativos (voz e media library).

## Arquitetura

```
services/
  openrouter.ts    Cliente HTTP. fetch puro, sem SDK.
  config.ts        Modelos, AgentConfig, persistência dos Ajustes.

agent/
  types.ts         Contratos: AgentTool, ToolResult, AgentEvent, AgentStep.
  run-agent.ts     O loop ReAct. O coração.
  registry.ts      Resolve quais tools existem agora e monta o payload.
  prompt.ts        System prompt e bloco de memória.
  memory.ts        Memória vetorial via embeddings.
  tools/           31 tools, agrupadas por integração.

hooks/use-agent.ts UI ↔ agente. Estado, cancelamento, aprovação.
components/        agent-trace (passos), tool-approval-sheet (o modal).
```

### O loop

`run-agent.ts` roda ReAct clássico: o modelo raciocina, chama uma tool, lê o
resultado, decide o próximo passo. Repete até responder sem chamar tool nenhuma
ou bater o teto de `maxSteps` (padrão 8, ajustável). Estourando o teto, uma última
chamada sem tools força um resumo do que foi feito — melhor do que um erro seco
depois de N ações já executadas.

### Tools atômicas

Cada tool faz uma coisa e devolve um `ToolResult`. Isso é o que permite o
encadeamento: em vez de um `processGitHubAction` monolítico que fazia review e
abria PR de uma vez só, existem `github_list_pull_requests`,
`github_get_pull_request_diff`, `github_comment_on_pull_request` — e o modelo
compõe. Adicionar uma tool nova é criar o objeto e colocar no array; o registry
e o prompt se viram sozinhos.

| Integração | Tools |
|---|---|
| core | 5 (memória ×3, geração de imagem, data/hora) |
| github | 5 |
| gitlab | 4 |
| jira | 3 |
| slack | 2 |
| vercel, notion, linear, figma | 2 cada |
| discord, teams, whatsapp, gmail | 1 cada |

### Human-in-the-loop

Toda tool declara `mutates: boolean`. Ler diff roda direto; abrir PR, postar no
Slack ou criar issue param e pedem aprovação, mostrando o payload exato que vai
ser enviado. Desligável em Ajustes.

O gate é *fail-closed*: só `"approve"` executa. Qualquer outra coisa — modal
dispensado, valor inesperado — não executa. Em ação irreversível, a dúvida tem
que resolver para "não".

### Memória

Leitura automática, escrita deliberada. Todo turno faz RAG por similaridade de
cosseno sobre `@vector_memory` e injeta o que passar do threshold. Gravar exige
o modelo chamar `memory_save`. A versão anterior fazia o contrário: dava embed em
todo prompt, inclusive "oi" e "obrigado", gastando request à toa e poluindo a
memória com ruído.

### Credenciais

A chave do OpenRouter vem do `.env`. Tudo mais (tokens de GitHub, Jira, Slack…)
é digitado no app e fica no AsyncStorage do device — nunca no `.env`, nunca no
repo. É por isso que `isConfigured()` de cada tool é `async`: precisa consultar
o storage.

## Decisões que valem explicação

**Sem SDK, `fetch` puro.** O SDK do Gemini precisava de polyfills globais
(`Buffer`, `TextEncoder`, `web-streams`) declarados no topo de `index.tsx` e
vazando para o app inteiro. O cliente do OpenRouter é ~200 linhas de `fetch`.
Os polyfills e as deps saíram junto.

**Sem streaming de token.** O `fetch` do React Native não expõe `response.body`,
então SSE não funciona sem lib extra. Em vez disso o app faz streaming dos
*passos* do agente: você vê "Lendo o diff do PR" acontecendo em tempo real. Para
tarefa com tool calling isso informa mais que texto aparecendo letra por letra.

**Cloudinary removido.** A geração de imagem subia o resultado para o Cloudinary
para ter uma URL. O OpenRouter devolve data URL direto na resposta, então a
imagem vai para `FileSystem.cacheDirectory` e vira `file://`. Uma dependência
externa e uma conta a menos.

**System prompt em inglês.** A UI do app é inglês e os modelos seguem instrução
em inglês com mais consistência. O prompt manda responder no idioma do usuário.

## Modelos

Trocáveis em Ajustes. Todos os de chat suportam tool calling — sem isso o app
não funciona.

- `google/gemini-3-flash-preview` (padrão) — rápido e barato
- `anthropic/claude-sonnet-4.6` — melhor em code review
- `anthropic/claude-opus-4.6` — o mais capaz, o mais caro
- `x-ai/grok-4.1-fast`, `deepseek/deepseek-v3.2`, `google/gemini-2.5-flash-lite`

Imagem: `google/gemini-2.5-flash-image`, `google/gemini-3.1-flash-image`,
`bytedance-seed/seedream-4.5`. Embeddings: `openai/text-embedding-3-small`.

## O que ficou de fora

- **Gmail com envio automático permanente.** Access token OAuth dura ~1h. Refresh
  token exige client secret, que exige backend. Sem token, a tool abre o app de
  e-mail com tudo preenchido. SMTP com senha de app — o que a tela pedia antes —
  é impossível em RN: não existe socket TCP.
- **`@react-native-voice/voice` está deprecado.** Funciona, mas o caminho é
  `expo-speech-recognition`.
- **`slug`, `scheme` e `bundleIdentifier`** continuam `agent-gemini`/`agentgemini`
  no `app.json`. Mexer nisso quebra vínculo com EAS e deep links — é decisão sua.
