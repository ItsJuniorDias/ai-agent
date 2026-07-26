# Patch: sub-agentes

Uma tool nova, `spawn_subagent`, que deixa o agente principal delegar sub-tarefas
focadas a mini-loops isolados. Sem quebrar retrocompatibilidade — todos os
campos novos em `AgentConfig` têm default, e o registro da tool passa pelo mesmo
caminho das outras (`coreTools`).

O ganho aparece em duas situações reais:

1. **Trabalho paralelizável.** "Revise cada um destes 5 PRs" vira 5 chamadas
   simultâneas ao sub-agent — na prática o `Promise.all` que já existe no
   `run-agent.ts` executa os 5 loops em paralelo. Nenhuma linha nova no loop
   do main foi necessária pra isso: a tool é `mutates: false`, então cai
   automaticamente no bucket de leituras.

2. **Contexto isolado.** O sub-agent não vê o histórico do main. Se você tá em
   um chat com 15k tokens de conversa e delega uma varredura de "liste todos
   os deploys que falharam nas últimas 24h", o sub-agent começa com contexto
   limpo, faz a varredura, e volta com um resumo curto. O main recebe só o
   sumário — não os detalhes de cada tool call. É pura economia de contexto
   nas conversas futuras.

## 1. Novo módulo: `agent/subagent.ts`

Um mini-loop ReAct em ~350 linhas, propositalmente **não** um wrapper do
`runAgent`. Motivo: o `runAgent` tem responsabilidades que não fazem sentido
aqui (histórico externo, aprovação humana, memória de longo prazo). Passar
esses parâmetros como `null` e usar branches internos pra ignorar poluiria o
run-agent. Escrever um loop separado — que reusa `serializeResult` e a
resolução de tools — ficou mais limpo.

### Fluxo

```
main agent
   │ (decide delegar)
   └─ chama tool spawn_subagent(task, brief?, tools?)
        │
        └─ core.ts::spawnSubagent.execute
             │
             └─ runSubagent(...)
                  ├─ resolveTools() → filtra (read-only, sem memory_*, sem spawn)
                  ├─ chatCompletion (loop N passos)
                  │    ├─ tool_calls em Promise.all (todos são read)
                  │    └─ retorna assistant sem tool_calls = fim
                  └─ retorna { text, steps, usage, stopReason }

devolve ao main:
{
  summary: "...",           // texto a ser lido
  steps_taken: 6,
  stop_reason: "final",
  step_trace: "✓ github_list_pull_requests, ✓ github_get_pull_request_diff, ...",
  usage: { prompt_tokens, completion_tokens, total_tokens, cost }
}
```

### Decisões de design

**Sub-agents são read-only.** Só executam tools `mutates: false`. Writes ficam
com o main, que é quem passa pelo modal de aprovação. Aprovação aninhada seria
confusa e insegura: o usuário veria um payload sem saber que veio de um
sub-agent que ele nem sabia que existia. Um sub-agent que "descobre" que
precisa abrir um PR retorna essa recomendação no sumário — o main decide se
executa e mostra a aprovação normal.

**Sem tools de memória.** Removidas silenciosamente do payload do sub-agent.
Memória é sobre o *user* (stack preferido, projetos, convenções), não sobre a
task efêmera de um sub-agent. É responsabilidade do main decidir o que
guardar depois de receber o sumário.

**Sem recursão.** Sub-agent não pode chamar `spawn_subagent`. Duas camadas de
defesa:
- Camada 1 (o filtro): `FORBIDDEN_TOOLS` no `filterSubagentTools` remove a
  tool da lista visível ao sub-agent. O modelo do sub nunca a vê.
- Camada 2 (o depth): sharedState do sub-agent injeta `subagentDepth: 1` em
  toda tool que ele roda. O `execute` da `spawn_subagent` checa isso e
  retorna erro se `depth >= 1`. Redundante hoje, mas pega qualquer regressão
  futura em que a tool vaze pra allowlist do sub por engano.

**Contexto isolado.** O sub-agent não recebe `ChatMessage[]` do main. Só
`task` (obrigatório) e `brief` (opcional). É o ponto principal de economia
— empurrar o histórico do main pro sub-agent negaria o benefício.

**Truncação do sumário.** Se o sub-agent escrever mais de 6k chars, cortamos
com aviso. É o teto pra proteger o contexto do main, que é justamente o que
a delegação queria preservar. Não é blessing: se está cortando muito, provavelmente
o `brief` ou `task` estava vago demais.

**Modelo dedicado, opcional.** Novo `config.subagentModel`. Se `undefined`,
cai em `config.orchestrationModel`, e depois em `config.model`. Um sub-agent
faz trabalho focado com contexto limpo — casa bem com modelo barato.
Combinação recomendada:
```ts
{
  model: "anthropic/claude-sonnet-4.6",
  orchestrationModel: "google/gemini-2.5-flash-lite",
  subagentModel: "google/gemini-2.5-flash-lite",  // opcional; default cai no orchestration
}
```

**Temperature 0.4** (vs 0.7 do main). Sub-agent é execução focada, não
brainstorm — vale menos criatividade.

## 2. Nova tool: `spawn_subagent` em `agent/tools/core.ts`

Registrada em `coreTools` (junto com memory, generate_image, get_current_datetime).
Como o `registry.ts` já espalha `coreTools` em `ALL_TOOLS`, a tool aparece no
payload sem mais nenhuma mudança em `tools/index.ts` ou `registry.ts`.

```ts
{
  name: "spawn_subagent",
  integration: "core",
  mutates: false,   // <- crítico: cai no bucket de leituras paralelas
  parameters: {
    task: string,               // obrigatório
    brief?: string,             // opcional: contexto que o sub-agent precisa
    tools?: string[],           // opcional: allowlist por nome
  },
}
```

Prompt da descrição foi escrito pra o modelo entender:
- **Quando usar:** subtarefas independentes, especialmente em paralelo.
- **Quando NÃO usar:** conversa casual (overhead não compensa) e qualquer
  ação que escreve em sistema externo (writes ficam com o main).

## 3. Novos campos em `AgentConfig`

```ts
subagentModel?: string;      // default undefined → cai em orchestrationModel → model
subagentMaxSteps: number;    // default 5
```

Compatibilidade: entradas legadas no AsyncStorage sem esses campos leem o
default via o spread `{ ...DEFAULT_CONFIG, ...(JSON.parse(raw)) }` em
`loadConfig()`. Nenhuma migração é necessária.

## 4. System prompt do main

Adicionada uma seção `# Delegating with spawn_subagent` explicando ao modelo
quando delegar (subtarefas focadas, especialmente paralelas) e quando não
(chat casual, writes). Sem essa instrução o modelo raramente decide chamar a
tool sozinho — vale a pena.

## Como usar

Zero mudança de setup:

```bash
npm install
npx expo start -c
```

Se quiser configurar modelo dedicado pro sub-agent, em Ajustes (você precisa
expor a UI ainda) ou via código:

```ts
await saveConfig({
  subagentModel: "google/gemini-2.5-flash-lite",
});
```

## Exemplo de conversa

**User.** "Revisa os 3 PRs abertos no meu repo octocat/hello-world e me diz
qual tem o maior risco."

**Main agent decide.** Em vez de 3 rodadas de `github_get_pull_request_diff`
inflando o contexto, ele chama:

```
spawn_subagent(task: "revise o diff do PR #42 em octocat/hello-world e resuma bugs, race conditions e segurança em até 3 bullets", tools: ["github_get_pull_request_diff"])
spawn_subagent(task: "revise o diff do PR #43 em octocat/hello-world e resuma...", tools: ["github_get_pull_request_diff"])
spawn_subagent(task: "revise o diff do PR #44 em octocat/hello-world e resuma...", tools: ["github_get_pull_request_diff"])
```

Os 3 rodam em paralelo (o `run-agent.ts` já particiona `mutates: false` em
`Promise.all`). Voltam 3 sumários compactos. O main compara os 3 e responde
ao user — sem que os diffs cheios entrem no contexto principal.

## O que ficou de fora deste patch

- **UI de configuração dos novos campos.** `subagentModel` e `subagentMaxSteps`
  estão persistindo e funcionando, mas não há tela pra o user editar sem
  código. Feature de UI, não de agente — fica pra próxima leva junto de
  cost tracking persistido por conversa.
- **Sub-agents com writes controlados.** Um modo futuro em que um sub-agent
  pode preparar um payload de write e mandar de volta ao main pra aprovação
  centralizada. Interessante mas exige repensar o `AgentEvent` — fora deste
  patch.
- **Trace aninhado na UI.** Hoje o main mostra o sub-agent como um step
  "Delegando ao sub-agente" com progresso via `progress()`. Uma UI que
  expande e mostra os steps internos do sub seria útil pra debug — o dado
  está lá em `ToolResult.data.step_trace`, é só uma tela nova ler.
- **A2A (agente-a-agente).** Discussão paralela: expor o próprio app como
  MCP server pra outros agentes o consumirem. Diferente arquitetural
  (servidor HTTP + auth + persistência), fica pra sessão dedicada.
