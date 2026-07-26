# Patch: sub-agentes

Uma tool nova, `spawn_subagent`, que deixa o agente principal delegar sub-tarefas
focadas a mini-loops isolados — mais a configuração em Ajustes e o trace
aninhado no chat. Nada quebra retrocompatibilidade: campos novos em
`AgentConfig` têm default, o registro da tool passa pelo mesmo caminho das
outras (`coreTools`), e o campo novo `uiData` em `ToolResult` é opcional.

O ganho aparece em três situações reais:

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

3. **Auditoria visual.** O trace do chat expande o sub-agent como um bloco
   próprio, mostrando os steps internos, o sumário, o motivo de parada, os
   tokens e o custo — sem que nada disso pese no contexto do modelo.

## 1. Novo módulo: `agent/subagent.ts`

Um mini-loop ReAct em ~460 linhas, propositalmente **não** um wrapper do
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

devolve ao main (via `data`, enxuto ~500 tokens):
{
  summary: "...",
  steps_taken: 6,
  stop_reason: "final",
  step_trace: "✓ github_list_pull_requests, ✓ github_get_pull_request_diff, ...",
  usage: { prompt_tokens, completion_tokens, total_tokens, cost }
}

devolve à UI (via `uiData`, invisível ao modelo):
{
  summary: "...",
  steps: SubagentStep[],  // completos, com args, results, timings
  stop_reason: "final",
  usage: ORUsage
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
a delegação queria preservar. Não é blessing: se está cortando muito,
provavelmente o `brief` ou `task` estava vago demais.

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

## 5. UI: configuração dos sub-agents em tela dedicada

Uma versão anterior desse patch tinha colocado a config do sub-agent como
duas seções gigantes dentro de Ajustes — o mesmo seletor de `AGENT_MODELS`
aparecia duas vezes na mesma tela, uma pro main e outra pro sub. Ruim
visualmente e ruim como sinal: pra 90% dos usuários, a config do sub-agent
é "deixa no auto e vamo embora"; enfiar isso na tela principal cria
fricção sem benefício.

Refactor: uma linha só em Ajustes (`app/(tabs)/settings.tsx`) com chevron
que abre uma tela dedicada em `app/(subagent)/index.tsx`. Segue o mesmo
padrão do Personal Assistant, MCP e Custom Tools — tudo que é
config-de-detalhe pra minoria dos usuários vive numa tela própria.

**Linha em Ajustes.** Título "Sub-agent settings" + subtítulo dinâmico que
resume o estado atual ("Auto · 5 max rounds" ou "Gemini 2.5 Flash Lite · 8
max rounds"). Um chevron indica que abre outra tela.

**Tela dedicada (`app/(subagent)/index.tsx`).** Header com back button e
título grande no padrão do assistant. Um `intro` em prosa explicando *o que
é um sub-agent* — o único lugar do app onde o user encontra a feature
explicada em texto, então vale caprichar. Duas seções:
- Modelo com "Auto" no topo (que serializa como `undefined` e cai em
  `orchestrationModel` → `model`) + os `AGENT_MODELS` normais.
- Segmented control de max rounds (3 / 5 / 8 / 12).

**Nova rota.** Adicionada em `app/_layout.tsx` como `Stack.Screen name=
"(subagent)/index"` com `headerShown: false` (a tela usa header próprio).

Strings i18n reorganizadas nos 7 idiomas suportados (`en`, `pt`, `es`,
`fr`, `zh`, `ar`, `hi`):
- `settings.subagentTitle`, `subagentRowTitle`, `subagentRowSteps`,
  `subagentAuto`, `subagentFooter` — só o que a linha resumo em Ajustes usa.
- Namespace novo `subagent.*` com `title`, `intro`, `modelSection`, `auto`,
  `autoSub`, `modelFooter`, `maxRoundsSection`, `maxRoundsFooter` — usado
  pela tela dedicada.

**Arquivos.** `app/(subagent)/index.tsx` (novo), `app/_layout.tsx` (registro
da rota), `app/(tabs)/settings.tsx` (linha resumo), `i18n/locales/*.ts`.

## 6. Trace aninhado do sub-agent

O `agent-trace.tsx` agora reconhece um step `spawn_subagent` e renderiza um
painel próprio quando expandido:

- **Badge diferenciado.** Ícone `git-branch` no accent, borda sutil — visual
  distinto das tools de integração.
- **Rótulo próprio.** "Sub-agent · 5 inner steps · task…" no header em vez
  do genérico "Delegando ao sub-agente" com args JSON.
- **Body substituído.** Em vez do dump de JSON dos args + `summary`, o corpo
  mostra:
  - Uma linha de metadados: motivo de parada (Finished / Hit step limit /
    Failed) + tokens totais + custo em USD, tudo em mono cinza.
  - O sumário do sub-agent como prosa legível, com line-height 19.
  - Os steps internos como `StepRow`s aninhados, à direita de uma barra
    vertical accent-tinted que sinaliza aninhamento (o "rail"). Cada
    sub-step é um `StepRow` recursivo — se um dia sub-agents puderem
    disparar outros sub-agents (hoje bloqueado no `subagent.ts`), a UI já
    renderiza aninhado sem mudança.

Strings i18n novas em `trace.*`: `subagentLabel`, `subStepOne`,
`subStepOther`, `subFinished`, `subMaxSteps`, `subFailed`, `tokens`.

### Isolamento de dados: `ToolResult.uiData`

Pra fazer o trace funcionar sem inflar o contexto do modelo (o que negaria o
ponto todo dos sub-agents), adicionei um campo novo em `ToolResult`:

```ts
export type ToolResult = {
  ok: boolean;
  data?: unknown;      // vai pro modelo (via serializeResult)
  uiData?: unknown;    // ← NOVO: SÓ pra UI, jamais serializado
  error?: string;
  summary?: string;
  url?: string;
};
```

O `serializeResult` em `agent/run-agent.ts` só olha para `data`/`summary`/
`url`/`error` — o `uiData` é ignorado por construção, sem código extra.
A `spawn_subagent.execute` agora retorna:

- `data` para o modelo: sumário em texto + steps_taken + stop_reason +
  step_trace compacto (string tipo "✓ github_list_pull_requests, ✓ …") +
  usage. Tudo enxuto, cabe em ~500 tokens.
- `uiData` para o trace: os `SubagentStep[]` completos com args, results,
  timings, tudo. Fica na memória do estado da UI, nunca vai pro modelo.

Essa separação é útil pra qualquer tool futura que produza dado de UI rico
sem querer empurrar tudo pro contexto do modelo (attachments, previews,
etc). Não é sub-agent-específico.

**Arquivos.** `agent/types.ts` (novo campo), `agent/tools/core.ts` (usa),
`components/agent-trace.tsx` (renderiza).

## Como aplicar em quem já usa

Nada muda:

```bash
npm install
npx expo start -c
```

Configs novas (`subagentModel`, `subagentMaxSteps`) usam default via
`loadConfig()` spread, então instalações existentes seguem funcionando. O
campo `uiData` em `ToolResult` é opcional — tools que não retornam nada aí
seguem funcionando idêntico.

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
ao user — sem que os diffs cheios entrem no contexto principal. No chat, o
trace mostra 3 blocos de sub-agent expandíveis, cada um com seus steps
internos, sumário, tokens e custo.

## O que ficou fora deste patch

- **Sub-agents com writes controlados.** Um modo futuro em que um sub-agent
  pode preparar um payload de write e mandar de volta ao main pra aprovação
  centralizada. Interessante mas exige repensar o `AgentEvent` — fora deste
  patch.
- **Custo do sub-agent visível no cabeçalho do turno.** O `uiData.usage`
  está lá; falta só somar no total do turno na tela principal do chat.
  Pequeno, faço junto com um refactor de "cost pill" numa próxima leva.
- **Streaming ao vivo dos passos do sub-agent.** Hoje o `SubagentBody` só
  aparece depois que o sub-agent termina — durante a execução, o main mostra
  status via `progress()` como texto ("Sub-agent: passo 3/5"). Fazer a UI
  desenhar sub-steps em tempo real exige passar `onEvent` do sub pra UI, e
  isso muda a assinatura do `ToolContext`. Vale, mas em patch separado.
- **A2A (agente-a-agente).** Discussão paralela: expor o próprio app como
  MCP server pra outros agentes o consumirem. Diferente arquitetural
  (servidor HTTP + auth + persistência), fica pra sessão dedicada.
