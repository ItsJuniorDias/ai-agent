import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GOOGLE_API_KEY);

const GITLAB_API = "https://gitlab.com/api/v4";
const PROJECT_ID = "SEU_ID_DO_PROJETO"; // O ID numérico no GitLab
const TOKEN = process.env.GITLAB_TOKEN;

async function getAIAnalysis(diffContext: string) {
  try {
    // Recomendo o modelo Pro para raciocínio complexo em código
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      // O System Instruction define a "personalidade" e as regras rígidas do agente
      systemInstruction: `Você é um Engenheiro Sênior de React com Vite usando tailwind. 
      Sua tarefa é fazer Code Review em Merge Requests.
      Foque estritamente em:
      1. Performance: re-renderizações desnecessárias, uso incorreto de hooks (useEffect, useMemo, useCallback).
      2. Listas: Otimização de FlatList/FlashList.
      Seja direto, aponte o arquivo, o problema e dê a solução em formato Markdown curto.
      Se o código estiver perfeito, responda apenas: "Nenhum problema de performance encontrado."`,
    });

    const prompt = `Aqui estão as alterações do Merge Request do aplicativo TOL:\n\n${diffContext}\n\nAnalise o código acima e sugira melhorias.`;

    // Chama o Gemini para processar o prompt
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return responseText;
  } catch (error) {
    console.error("Erro ao chamar o Gemini:", error);
    return "Falha ao gerar análise de IA.";
  }
}

export async function runCodeReview(mrIid) {
  try {
    // 1. Busca os diffs do Merge Request
    const { data: changes } = await axios.get(
      `${GITLAB_API}/projects/${PROJECT_ID}/merge_requests/${mrIid}/changes`,
      { headers: { "PRIVATE-TOKEN": TOKEN } },
    );

    // Filtra apenas arquivos .js, .jsx, .ts, .tsx e package.json
    const relevantChanges = changes.changes.filter(
      (c) =>
        /\.(ts|tsx|js|jsx)$/.test(c.new_path) || c.new_path === "package.json",
    );

    if (relevantChanges.length === 0) return;

    const diffContext = relevantChanges
      .map((c) => `Arquivo: ${c.new_path}\nDiff:\n${c.diff}`)
      .join("\n\n");

    // 2. Solicita análise da IA (Exemplo de chamada interna do seu agente)
    const reviewResult = await getAIAnalysis(diffContext);

    // 3. Posta o comentário no GitLab
    await axios.post(
      `${GITLAB_API}/projects/${PROJECT_ID}/merge_requests/${mrIid}/notes`,
      {
        body: `### 📱 Expo/React Native Performance Review\n\n${reviewResult}`,
      },
      { headers: { "PRIVATE-TOKEN": TOKEN } },
    );
  } catch (error) {
    console.error("Erro ao processar MR:", error.message);
  }
}
