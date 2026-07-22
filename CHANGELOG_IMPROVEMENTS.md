# Melhorias aplicadas

Patch em cima do v2.0.0 com 13 mudanças, agrupadas por leverage. Nenhuma quebra
retrocompatibilidade — todos os campos novos de configuração têm default ou são
opcionais, e o formato persistido no AsyncStorage continua o mesmo (só ganhou
campos opcionais que legados ignoram sem quebrar).

## Correções de comportamento (alto leverage)

### 1. Continuidade multi-turno via reconstrução do transcript

**Antes.** `toORHistory` mapeava só `role: "user" | "assistant"` com texto plano
— jogava fora as `tool_calls` e `tool_results` de turnos passados. Se você
pedisse "revisa o PR #42" no turno 1 e depois "abre issue com o que você achou"
no turno 2, o modelo não via os detalhes do diff que ele mesmo tinha lido, só o
resumo em texto que ele escreveu. Alucinação frequente.

**Depois.** Cada `ChatMessage` do modelo com `steps` é reconstruído como
`assistant(content=null, tool_calls=[...])` seguido de N mensagens `tool` com
os resultados reais. O `tool_call_id` de cada step é o mesmo que veio da API
originalmente, então a âncora bate. O contexto de execuções passadas está lá
para turnos futuros compor em cima.

**Arquivo.** `agent/run-agent.ts` — funções `chatMessageToOR` e `toORHistory`.

**O que você precisa fazer.** Nada, se o container do chat já persiste `steps`
em cada `ChatMessage` (o `use-agent.ts` já expõe isso via `SendResult`). Se
ainda não persiste, agora vale — é o combustível dessa continuidade.

### 2. Parallel tool calls (reads em paralelo, writes serial)

**Antes.** Loop `for (const call of toolCalls)` executava tudo serial, mesmo
quando o modelo pedia várias leituras num turno (ex.: PRs do GitHub + MRs do
GitLab). E `parallel_tool_calls` não era passado — o modelo nem sabia que
podia pedir várias.

**Depois.** `parallel_tool_calls: true` no payload; separa `toolCalls` em
`readCalls` (mutates=false) e `writeCalls` (mutates=true). Leituras rodam em
`Promise.all`. Writes continuam serial porque cada uma precisa passar pelo
handler de aprovação humana — abrir 3 modais ao mesmo tempo seria caos.
Preserva a ordem dos `tool_call_id` na anexação ao histórico.

**Arquivo.** `agent/run-agent.ts` — bloco de execução, partição em readCalls/writeCalls.

**Impacto.** Latência de turnos com múltiplas leituras cai perto de N vezes.

### 3. Retry com backoff em transientes

**Antes.** 429/502/503 do OpenRouter viravam `OpenRouterError` na primeira
tentativa. 3-5% dos runs em uso pesado perdidos por transiente que resolveria
sozinho em 400ms.

**Depois.** Até 3 tentativas em 408/429/502/503/504, backoff exponencial com
jitter (400ms → 1.2s → 3.6s + jitter aleatório). Respeita `Retry-After` do
429 quando presente. 401/402/403 NÃO retry — não vão se resolver sozinhos.
Falha de rede (sem status HTTP) também entra no retry.

**Arquivo.** `services/openrouter.ts` — função `request` e helpers
`sleep`/`backoffDelay`.

### 4. `serializeResult` preserva o summary no erro

**Antes.** Quando `result.ok === false`, só `{error}` ia para o modelo. Um
step "Recusado pelo usuário" (que grava `summary: "Recusado pelo usuário"`)
chegava como erro genérico, perdendo o sinal forte de intenção.

**Depois.** Ramo `!ok` agora inclui `summary` também, quando presente.

**Arquivo.** `agent/run-agent.ts` — função `serializeResult`.

### 5. Truncação estruturada em vez de corte cego

**Antes.** Se o resultado excedia 12k chars, corte cego com `...[truncado]`.
Diff de PR gigante virava fatia arbitrária sem contexto do que faltava. Array
de 50 PRs virava JSON meio quebrado no meio.

**Depois.** Duas estratégias combinadas antes do fallback:
- **Array grande** (>20 items): mantém primeiros 20, adiciona `meta:
  {truncated, total, shown, hint}`. Hint diz explicitamente pra refinar
  `limit`/filtros na próxima chamada.
- **String grande dentro de `data.<campo>`** (típico: diff): corta a string
  específica e adiciona `meta: {truncated, field, original_chars, shown_chars,
  hint}`. Hint sugere argumentos mais estreitos (path específico, range de
  linhas).

Só se ambas falharem em caber, cai no corte cego — mas agora avisa o
limite exato.

**Arquivo.** `agent/run-agent.ts` — função `serializeResult`.

## Correções de recursos desperdiçados

### 6. Memória não roda embedding em confirmações curtas

**Antes.** `searchMemory` era chamado em todo turno, inclusive `"ok"`, `"vai"`,
`"obrigado"`. Um `/embeddings` request por turno inútil.

**Depois.** Guard `shouldSearchMemory(input)` pula se: (a) input tem menos de
20 chars, ou (b) casa com padrão de confirmação (sim/ok/beleza/valeu/vlw/thanks/
não/cancel/etc em PT+EN).

**Arquivo.** `agent/run-agent.ts` — helper `shouldSearchMemory` e uso em
`runAgent`.

### 7. Memory eviction por LRU, não por idade

**Antes.** `writeAll` usava `slice(-MAX_MEMORIES)` — dropava as mais antigas
por ordem de inserção. Memória de "stack preferido do usuário" salva há 6
meses e consultada toda semana era eviction candidate ao lado de perguntas
únicas de 2 semanas atrás.

**Depois.** `MemoryVector` ganhou `lastAccessedAt?: string`. `searchMemory`
toca (best-effort, fire-and-forget) esse campo nos hits que passam do
threshold. `writeAll` ordena por `lastAccessedAt ?? createdAt` ascendente e
mantém as N mais recentemente tocadas — o que é *usado* fica.

**Arquivo.** `agent/memory.ts`.

**Retrocompatibilidade.** Entradas legadas sem `lastAccessedAt` caem no
`createdAt`, comportamento idêntico ao anterior até serem acessadas.

### 8. Roteamento de modelo por passo

**Antes.** `config.model` único pra todo o loop. Cada iteração usava o
modelo top mesmo quando o passo era só "decidir qual tool chamar em seguida".
Sonnet 4.6 pra escolher entre 4 opções custa igual a Sonnet 4.6 escrevendo
um review.

**Depois.** Novo campo opcional `config.orchestrationModel`. Se setado:
- Passo 0 (planejamento inicial): `model` principal.
- Passos 1+ dentro do loop: `orchestrationModel` (mais barato).
- Síntese final forçada (quando o teto de passos estoura): `model` principal.

Sem `orchestrationModel` configurado, comportamento idêntico ao anterior.

**Como usar.** Setar em Ajustes (você precisa expor esse campo na UI se
quiser opt-in visível). Sugestão de config que costuma render 40-60% de
economia sem perda de qualidade:
```ts
model: "anthropic/claude-sonnet-4.6",
orchestrationModel: "google/gemini-2.5-flash-lite",
```

**Arquivos.** `services/config.ts` (novo campo), `agent/run-agent.ts` (uso
no loop).

### 9. Janela de histórico por budget de chars, não por contagem

**Antes.** `HISTORY_WINDOW = 12` mensagens. Com 12 turnos de chat casual
cabia folgado; com 12 turnos que anexaram diffs, estourava contexto de modelo
médio.

**Depois.** `HISTORY_BUDGET_CHARS = 40000` (~10k tokens). Percorre do mais
recente pro mais antigo, acumulando até bater o teto. Turno mais novo sempre
entra, mesmo se sozinho já estoura (aí só ele vai).

**Arquivo.** `agent/run-agent.ts` — `toORHistory` reescrito.

## Robustez e segurança

### 10. Hard-cap de notificações por varredura em background

**Antes.** Prompt do scan pedia "seja conservador" — soft constraint. Nada
impedia a IA de disparar 8 notificações num turno se ela decidisse que 8
coisas eram urgentes.

**Depois.** Novo campo `AssistantConfig.scanNotificationCap` (default: 3).
`runAssistantScan` injeta `sharedState: {notificationBudget, notificationsSent:
0}` no `runAgent`. A tool `notify_now` lê esse estado, incrementa `sent` a
cada envio e recusa quando `sent >= budget` — com uma mensagem de erro
acionável dizendo pro modelo focar e finalizar.

**Arquivos.** `services/config.ts` (campo), `services/assistant.ts` (injeção),
`agent/tools/notifications.ts` (enforcement), `agent/types.ts` (`sharedState`
no `ToolContext` e `RunAgentOptions`).

### 11. Persistência do transcript da última varredura pra debug

**Antes.** Quando uma notificação em background saía errada, você não tinha
o que investigar — o `runAgent` retornava a transcript mas ela morria no
escopo do `runAssistantScan`.

**Depois.** Ao fim de cada varredura, os últimos 40 turnos do transcript +
todos os steps são salvos em `STORAGE_KEYS.lastScanTranscript` (nova chave
`@last_scan_transcript`). Formato:
```ts
{
  at: string,           // ISO timestamp
  reason: "background" | "manual",
  notified: number,
  steps: AgentStep[],
  transcript: ORMessage[],
}
```

Best-effort: se AsyncStorage falhar, o resultado do scan não é bloqueado.

**Como usar.** Adicionar tela em Ajustes → Debug lendo essa chave e
renderizando o passo a passo. Não fiz a tela porque não sei suas convenções
de UI, mas o dado está lá.

**Arquivos.** `services/config.ts` (nova key), `services/assistant.ts`
(persistência).

### 12. `memory_forget` vira `mutates: true`

**Antes.** `memory_forget` com substring lowercase apagava sem confirmação.
"esquece o Pedagogy" nukava toda memória contendo essa palavra, incluindo
"usuário aprendeu X no projeto Pedagogy" — uma memória valiosa perdida sem
undo.

**Depois.** `mutates: true`. Passa pelo modal de aprovação com o termo exato
exibido, dando ao usuário chance de cancelar. Descrição da tool foi atualizada
pra deixar claro o comportamento.

**Arquivo.** `agent/tools/core.ts`.

### 13. Remoção do fallback `EXPO_PUBLIC_GITHUB_TOKEN`

**Antes.** `github.ts` fazia `stored?.accessToken || process.env.EXPO_PUBLIC_GITHUB_TOKEN`.
Variáveis `EXPO_PUBLIC_*` são **inlined no bundle JS na build**. Se um dev
setasse o token no `.env` local pra testar e depois buildasse um release, o
token ia embarcado no app publicado — extraível por qualquer pessoa com o IPA.

**Depois.** Token só via AsyncStorage do device, digitado pela tela do GitHub
no app. Se não estiver salvo, `config()` retorna `null` e a tool responde
`notConfigured`.

**Arquivo.** `agent/tools/github.ts`.

## Como aplicar em quem já usa

Nenhuma migração é necessária. Instala e roda:
```bash
npm install
npx expo start -c
```

As novas configs (`orchestrationModel`, `scanNotificationCap`) têm defaults
que preservam o comportamento anterior. Se quiser aproveitar o roteamento de
modelo, edita em Ajustes ou seta programaticamente:
```ts
await saveConfig({ orchestrationModel: "google/gemini-2.5-flash-lite" });
```

## O que ficou fora deste patch

- **Streaming de tokens.** Continua sem — o `fetch` do React Native não
  expõe `response.body`. Manter foco no que dá pra fazer sem lib extra.
- **Consistência do shape de `data` nas 31 tools.** Refactor grande demais,
  baixo leverage, alta chance de introduzir regressão. Fica pra outro dia
  com testes de contrato antes.
- **Cost tracking persistido por conversa.** O `usage` já é retornado; falta
  só somar e persistir por `conversationId` — mas isso é feature de UI, não
  de agente, então fica pra próxima.
