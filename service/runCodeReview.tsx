import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GOOGLE_API_KEY!);

const GITHUB_API = "https://api.github.com";
const REPO_OWNER = "ItsJuniorDias"; // Ex: 'sua-empresa' ou 'seu-usuario'
const REPO_NAME = "ai-agent"; // Ex: 'meu-app-react'
const GITHUB_TOKEN = process.env.EXPO_PUBLIC_GITHUB_TOKEN;

// Configuração padrão de Headers para o GitHub
const githubHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

/**
 * 1. Gera a análise usando Gemini 2.5 Pro
 */
export async function getAIAnalysis(diffContext: string) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction: `Você é um Engenheiro Sênior de React Native com Expo. 
      Sua tarefa é fazer Code Review em Pull Requests.
      Foque estritamente em:
      1. Performance: re-renderizações desnecessárias, uso incorreto de hooks (useEffect, useMemo, useCallback).
      2. Listas: Otimização de FlatList/FlashList.
      Seja direto, aponte o arquivo, o problema e dê a solução em formato Markdown curto.
      Se o código estiver perfeito, responda apenas: "Nenhum problema de performance encontrado."`,
    });

    const prompt = `Aqui estão as alterações do Pull Request do aplicativo:\n\n${diffContext}\n\nAnalise o código acima e sugira melhorias.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Erro ao chamar o Gemini:", error);
    return "Falha ao gerar análise de IA.";
  }
}

/**
 * 2. Cria o Pull Request no GitHub
 */
export async function createPullRequest(
  sourceBranch: string,
  targetBranch: string,
  title: string,
  description: string,
) {
  try {
    const response = await axios.post(
      `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
      {
        title: title,
        body: description,
        head: sourceBranch, // Branch com as suas alterações
        base: targetBranch, // Branch destino (ex: 'main')
      },
      { headers: githubHeaders },
    );

    console.log(
      `PR aberto com sucesso! Número do PR: #${response.data.number}`,
    );
    console.log(`Link: ${response.data.html_url}`);

    return response.data; // Retorna os dados do PR, útil para pegar o 'number'
  } catch (error: any) {
    console.error(
      "Erro ao abrir PR no GitHub:",
      error.response?.data || error.message,
    );
    throw error;
  }
}
