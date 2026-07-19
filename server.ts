import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

let aiClient: any = null;

function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Endpoint for automatic trend & pattern analysis of patient's history
app.post("/api/gemini/analyze-history", async (req: any, res: any) => {
  try {
    const { profile, glucoseLogs, foodLogs, medicationLogs, exerciseLogs } = req.body;

    if (!profile) {
      return res.status(400).json({ error: "Perfil de usuário é obrigatório." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `Você é um endocrinologista experiente e especialista em saúde digital.
Analise os dados históricos do paciente com diabetes e gere insights acionáveis, padrões e estatísticas em português (Brasil).
O seu tom deve ser acolhedor, profissional, preciso e empático (estilo Linear/Headspace).
NUNCA use termos assustadores, mas dê avisos claros se houver hipoglicemia frequente (< 70 mg/dL) ou hiperglicemia severa (> 250 mg/dL).
Sempre termine com uma nota lembrando que os dados são estimativas de apoio e não substituem uma consulta médica real.`;

    const patientContext = `
--- PERFIL DO PACIENTE ---
Nome: ${profile.name || "Paciente"}
Idade: ${profile.age || "Não informado"} anos
Sexo: ${profile.gender || "Não informado"}
Altura: ${profile.height || "Não informado"} cm
Peso: ${profile.weight || "Não informado"} kg
Tipo de Diabetes: ${profile.diabetesType || "Não informado"}
Medicamentos atuais: ${JSON.stringify(profile.medications || [])}
Insulina em uso: ${profile.usesInsulin ? "Sim" : "Não"} (Tipos: ${JSON.stringify(profile.insulinTypes || [])})
Metas Glicêmicas: Jejum ${profile.targetGlucoseMinJejum || 70}-${profile.targetGlucoseMaxJejum || 130} mg/dL, Pós-prandial < ${profile.targetGlucoseMaxPosPrandial || 180} mg/dL
Objetivos: ${JSON.stringify(profile.goals || [])}

--- HISTÓRICO DE GLICEMIA (Últimos registros) ---
${JSON.stringify(glucoseLogs || [])}

--- HISTÓRICO DE ALIMENTAÇÃO ---
${JSON.stringify(foodLogs || [])}

--- HISTÓRICO DE MEDICAMENTOS APLICADOS ---
${JSON.stringify(medicationLogs || [])}

--- HISTÓRICO DE EXERCÍCIOS ---
${JSON.stringify(exerciseLogs || [])}
`;

    const prompt = `Analise o histórico fornecido acima e identifique exatamente:
1. Padrões identificados (ex: aumentos após café, quedas pós-exercício, hipoglicemias recorrentes).
2. Três insights inteligentes acionáveis e específicos para este paciente.
3. Um resumo geral da evolução recente (ex: controle melhorou, está estável ou requer atenção).

Retorne os resultados em um formato JSON estruturado para exibição fluida no dashboard.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: systemPrompt },
        { text: patientContext },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallStatus: {
              type: Type.STRING,
              description: "Resumo curto em uma frase do estado de controle recente do paciente."
            },
            controlTrend: {
              type: Type.STRING,
              description: "Tendência de controle: 'melhorando', 'estável', 'atencao' ou 'descontrolado'."
            },
            patterns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de padrões detectados de forma clara e profissional baseados nos dados."
            },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Título curto do insight." },
                  description: { type: Type.STRING, description: "Explicação detalhada e recomendação prática." },
                  type: { type: Type.STRING, description: "Tipo do insight: 'sucesso', 'alerta', 'info'." }
                },
                required: ["title", "description", "type"]
              },
              description: "Três recomendações inteligentes e acionáveis."
            },
            medicalDisclaimer: {
              type: Type.STRING,
              description: "Aviso médico personalizado reforçando a necessidade de supervisão profissional."
            }
          },
          required: ["overallStatus", "controlTrend", "patterns", "insights", "medicalDisclaimer"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Erro ao analisar histórico:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor ao analisar dados." });
  }
});

// 2. Endpoint for smart chat conversations
app.post("/api/gemini/chat", async (req: any, res: any) => {
  try {
    const { messages, profile, currentStats } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Histórico de mensagens é obrigatório." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Você é o Assistente Virtual da Glyco AI, um companheiro inteligente de suporte para diabetes.
Use as seguintes regras cruciais de comportamento:
1. Responda de forma extremamente empática, objetiva, moderna e acolhedora em português (Brasil).
2. Leve em consideração o perfil clínico do paciente fornecido e suas estatísticas recentes.
3. Se o paciente perguntar sobre alimentação (ex: "Posso comer pizza?"), forneça conselhos práticos e nutricionais inteligentes, explicando sobre moderação, contagem de carboidratos, ordem dos alimentos (comer fibras/proteínas antes) e o impacto esperado, sem proibicionismo punitivo.
4. Se o usuário estiver relatando sintomas de hipoglicemia (tontura, suor frio, tremores), oriente IMEDIATAMENTE a regra dos 15g de carboidratos rápidos (ex: 150ml de refrigerante comum ou suco de laranja) e medir novamente em 15 minutos.
5. Sempre exiba um pequeno lembrete humilde de que suas respostas são informativas e não substituem o médico do paciente.`;

    const contextData = `
--- CONTEXTO DO PACIENTE ---
Nome: ${profile?.name || "Paciente"}
Tipo de Diabetes: ${profile?.diabetesType || "Tipo 2"}
Insulina: ${profile?.usesInsulin ? "Sim" : "Não"}
Medicamentos: ${JSON.stringify(profile?.medications || [])}
Média recente de glicemia: ${currentStats?.averageGlucose || "135"} mg/dL
Tempo no alvo: ${currentStats?.timeInRange || "75"}%
`;

    // Map conversation array to Gemini content parts
    const geminiContents: any[] = [];
    geminiContents.push({ text: systemInstruction });
    geminiContents.push({ text: contextData });

    // Append history
    for (const msg of messages) {
      geminiContents.push({
        text: `${msg.sender === "user" ? "Usuário" : "Assistente"}: ${msg.text}`
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiContents,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Erro no chat inteligente:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor no chat." });
  }
});

// 3. Endpoint for food nutritional analysis (text description or base64 photo estimation)
app.post("/api/gemini/analyze-food", async (req: any, res: any) => {
  try {
    const { foodDescription, base64Image, profile } = req.body;

    if (!foodDescription && !base64Image) {
      return res.status(400).json({ error: "Forneça uma descrição do alimento ou uma foto." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `Você é um nutricionista especialista em diabetes e contagem de carboidratos.
Sua tarefa é analisar a descrição do prato ou a imagem fornecida, e estimar detalhadamente os valores nutricionais (carboidratos, açúcar, fibras, proteínas, gorduras, calorias), além de calcular a carga glicêmica estimada e o impacto esperado na glicemia do usuário com base no perfil dele.

IMPORTANTE: Sempre deixe muito claro na explicação que se trata de uma estimativa nutricional informativa para apoiar o paciente, e não de uma medição laboratorial exata.`;

    const userProfileContext = `
Perfil de Diabetes do usuário: ${profile?.diabetesType || "Tipo 2"}.
Faz uso de insulina? ${profile?.usesInsulin ? "Sim" : "Não"}.
`;

    const promptText = `
Analise o seguinte alimento:
"${foodDescription || "Alimento enviado por imagem"}"

Forneça os valores estimados para uma porção padrão desse prato e o impacto esperado na glicemia em português.
`;

    const contents: any[] = [{ text: systemPrompt }, { text: userProfileContext }];

    if (base64Image) {
      // If image is provided
      const mimeType = base64Image.match(/^data:(image\/[a-zA-Z]+);base64,/)?.[1] || "image/jpeg";
      const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType,
          data: cleanBase64
        }
      });
    }

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING, description: "Nome identificado ou resumido do alimento/refeição." },
            portionSize: { type: Type.STRING, description: "Porção de referência estimada (ex: 1 prato de 300g, 1 fatia)." },
            carbohydrates: { type: Type.NUMBER, description: "Gramas de carboidratos estimados." },
            sugar: { type: Type.NUMBER, description: "Gramas de açúcares simples estimados." },
            fiber: { type: Type.NUMBER, description: "Gramas de fibras estimadas." },
            protein: { type: Type.NUMBER, description: "Gramas de proteínas estimadas." },
            calories: { type: Type.NUMBER, description: "Quantidade de calorias (kcal)." },
            glycemicLoad: { type: Type.NUMBER, description: "Carga Glicêmica estimada da porção (de 1 a 30+)." },
            glycemicIndexRating: { type: Type.STRING, description: "Classificação do índice glicêmico: 'baixo', 'medio' ou 'alto'." },
            expectedImpact: { type: Type.STRING, description: "Impacto estimado na glicemia (ex: 'Moderado', 'Rápido', 'Muito Alto')." },
            explanation: { type: Type.STRING, description: "Explicação nutricional empática contendo dicas práticas (ex: 'Adicione uma fibra ou salada antes de consumir para reduzir o pico')." }
          },
          required: [
            "foodName",
            "portionSize",
            "carbohydrates",
            "sugar",
            "fiber",
            "protein",
            "calories",
            "glycemicLoad",
            "glycemicIndexRating",
            "expectedImpact",
            "explanation"
          ]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Erro ao analisar refeição:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor ao analisar refeição." });
  }
});

// Serve frontend build static files in production, use Vite middleware in development
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Glyco AI is listening on http://localhost:${PORT}`);
  });
}

setupViteOrStatic();
