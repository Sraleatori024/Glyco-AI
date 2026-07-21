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
5. Se você sugerir ou recomendar qualquer atividade física ou exercício do nosso catálogo, adicione explicitamente no final do texto o marcador "[EXERCISE:ID_DO_EXERCICIO]" em uma linha própria para que a interface de chat renderize um botão interativo "Ver como fazer". Os exercícios do catálogo disponíveis são:
   - Caminhada Rítmica de Intervalo -> ID: caminhada_moderada
   - Agachamento Livre com Cadeira -> ID: agachamento_casa
   - Alongamento Integral para Flexibilidade -> ID: alongamento_diabetes
   - Corrida Intervalada Aeróbica/Anaeróbica -> ID: corrida_intervalada
   - Mobilidade Dinâmica de Quadril e Tornozelo -> ID: mobilidade_quadril
   - Pedalada Estática de Baixo Impacto -> ID: pedalada_leve
   - Remada Sentada com Faixa Elástica -> ID: forca_elastico
   Exemplo: "Uma caminhada ativa pós-refeição ajudará a reduzir o pico glicêmico. [EXERCISE:caminhada_moderada]". Use APENAS esses IDs válidos.
6. Sempre exiba um pequeno lembrete humilde de que suas respostas são informativas e não substituem o médico do paciente.
7. EVITE repetição de frases, mensagens prontas ou respostas genéricas. Cada interação deve ser totalmente dinâmica e adaptada especificamente ao conteúdo e tom da pergunta atual.`;

    const contextData = `
--- CONTEXTO DO PACIENTE ---
Nome: ${profile?.name || "Paciente"}
Tipo de Diabetes: ${profile?.diabetesType || "Tipo 2"}
Insulina: ${profile?.usesInsulin ? "Sim" : "Não"}
Medicamentos: ${JSON.stringify(profile?.medications || [])}
Média recente de glicemia: ${currentStats?.averageGlucose || "135"} mg/dL
Tempo no alvo: ${currentStats?.timeInRange || "75"}%
`;

    const fullInstruction = `${systemInstruction}\n\n${contextData}`;

    // Map to standard Gemini Content objects for correct multi-turn chat
    const chatContents = messages.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    // DEBUG LOGGING
    console.log(`\n--- [DEBUG CHAT ASSISTANTE] ---`);
    console.log(`[MODELO UTILIZADO]: gemini-3.5-flash`);
    console.log(`[QUANTIDADE DE MENSAGENS NO HISTÓRICO]: ${messages.length}`);
    console.log(`[PERFIL DO PACIENTE]: Tipo ${profile?.diabetesType || "Tipo 2"}, Insulina: ${profile?.usesInsulin ? "Sim" : "Não"}`);
    if (messages.length > 0) {
      console.log(`[ÚLTIMA PERGUNTA DO USUÁRIO]: "${messages[messages.length - 1].text}"`);
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction: fullInstruction,
      }
    });

    console.log(`[RESPOSTA DA IA GERADA COM SUCESSO, COMPRIMENTO: ${response.text?.length || 0} caracteres]`);
    console.log(`--- [FIM DEBUG CHAT ASSISTANTE] ---\n`);

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Erro no chat inteligente:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor no chat." });
  }
});

// 2.5. Endpoint for smart exercise daily plan generation
app.post("/api/gemini/exercise-plan", async (req: any, res: any) => {
  try {
    const { profile, currentStats, recentGlucoseLogs } = req.body;

    if (!profile) {
      return res.status(400).json({ error: "Perfil do usuário é obrigatório." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `Você é um educador físico e especialista médico em diabetes. 
Sua tarefa é montar um Plano de Exercícios ("Plano do Dia") personalizado e seguro em português brasileiro.
Esse plano deve se alinhar com a aptidão do usuário, seu tipo de diabetes e as precauções glicêmicas ideais.
As sugestões devem ser amigáveis e estruturadas em JSON.`;

    const patientContext = `
--- CONTEXTO DO PACIENTE ---
Nome: ${profile.name || "Paciente"}
Idade: ${profile.age || "40"} anos
Tipo de Diabetes: ${profile.diabetesType || "tipo2"}
Insulina em uso: ${profile.usesInsulin ? "Sim" : "Não"}
Estatísticas recentes de glicose: Média ${currentStats?.averageGlucose || "140"} mg/dL, Tempo no Alvo ${currentStats?.timeInRange || "70"}%
Registros de glicemia recentes: ${JSON.stringify(recentGlucoseLogs || [])}
`;

    const promptText = `
Com base nas seguintes atividades físicas em nossa biblioteca, monte um plano ideal do dia com 1 a 3 exercícios sugeridos, adaptados para o perfil clínico do paciente:
- caminhada_moderada (Caminhada Rítmica de Intervalo)
- agachamento_casa (Agachamento Livre com Cadeira)
- alongamento_diabetes (Alongamento Integral para Flexibilidade)
- corrida_intervalada (Corrida Intervalada Aeróbica/Anaeróbica - ideal apenas para avançados/jovens com bom controle)
- mobilidade_quadril (Mobilidade Dinâmica de Quadril e Tornozelo)
- pedalada_leve (Pedalada Estática de Baixo Impacto)
- forca_elastico (Remada Sentada com Faixa Elástica)

Selecione os exercícios mais adequados para a idade de ${profile.age} anos e diabetes do tipo ${profile.diabetesType}.
Retorne as informações em um formato JSON válido estruturado para renderização direta na interface.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: systemPrompt },
        { text: patientContext },
        { text: promptText }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título curto e acolhedor para o plano do dia (ex: 'Plano de Equilíbrio Glicêmico')." },
            description: { type: Type.STRING, description: "Resumo explicativo de por que esse plano foi selecionado para o perfil dele." },
            recommendedExercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  exerciseId: { type: Type.STRING, description: "ID do exercício correspondente no nosso catálogo (ex: 'caminhada_moderada', 'agachamento_casa', 'alongamento_diabetes', etc., se aplicável)." },
                  name: { type: Type.STRING, description: "Nome do exercício." },
                  duration: { type: Type.STRING, description: "Duração recomendada ou número de séries/repetições (ex: '15 minutos', '3 séries de 10 repetições')." },
                  intensity: { type: Type.STRING, description: "Intensidade recomendada: 'leve', 'moderada' ou 'alta'." },
                  order: { type: Type.NUMBER, description: "Ordem sequencial da atividade, iniciando de 1." }
                },
                required: ["name", "duration", "intensity", "order"]
              },
              description: "Lista de 1 a 3 atividades sequenciais sugeridas."
            },
            restTimeBetween: { type: Type.STRING, description: "Recomendação de tempo de descanso entre os exercícios/séries." },
            suggestedIntensityText: { type: Type.STRING, description: "Orientações gerais sobre percepção de esforço seguro." },
            glycemicPrecautions: { type: Type.STRING, description: "Precauções de segurança glicêmica essenciais (ex: 'Não treinar se glicose estiver abaixo de 100 mg/dL sem carboidrato prévio, ou acima de 250 mg/dL se houver cetonas')." },
            medicalDisclaimer: { type: Type.STRING, description: "Aviso médico obrigatório deixando claro que é uma sugestão de apoio e não prescrição médica." }
          },
          required: ["title", "description", "recommendedExercises", "restTimeBetween", "suggestedIntensityText", "glycemicPrecautions", "medicalDisclaimer"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Erro ao gerar plano de exercícios:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor ao gerar plano de exercícios." });
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

    const systemPrompt = `Você é um nutricionista especialista em diabetes, contagem de carboidratos e IA nutricional multimodal.
Sua tarefa é analisar a imagem fornecida (ou a descrição em texto) e identificar visualmente TODOS os alimentos presentes no prato de forma exata e fiel à foto real recebida.
Você deve estimar detalhadamente os valores nutricionais baseados na porção visível ou descrita.

AVISO MÉDICO OBRIGATÓRIO: Sempre inclua na explicação que se trata de uma estimativa informativa e não laboratorial.`;

    const userProfileContext = `
--- DADOS DO PACIENTE ---
Tipo de Diabetes: ${profile?.diabetesType || "Tipo 2"}
Usa Insulina? ${profile?.usesInsulin ? "Sim" : "Não"}
`;

    const systemInstruction = `${systemPrompt}\n\n${userProfileContext}`;

    let promptText = "";
    const contents: any[] = [];

    console.log(`\n--- [DEBUG ANALISADOR DE ALIMENTOS MULTIMODAL] ---`);
    console.log(`[MODELO UTILIZADO]: gemini-3.5-flash`);

    if (base64Image) {
      // Robust Base64 Extraction
      const parts = base64Image.split(";base64,");
      const mimeType = parts[0].split(":")[1] || "image/jpeg";
      const cleanBase64 = parts[1];

      console.log(`[DADOS DA IMAGEM]: Imagem recebida no backend. MimeType: "${mimeType}", Comprimento Base64: ${cleanBase64.length}`);

      contents.push({
        inlineData: {
          mimeType,
          data: cleanBase64
        }
      });

      promptText = `
Você recebeu uma FOTO real de um prato de comida enviada pelo usuário.
Você deve analisar VISUALMENTE esta foto e identificar todos os alimentos individuais visíveis na imagem.

Sua resposta DEVE ser extremamente fiel ao que está de fato na foto. Não use respostas genéricas ou prontas. Se for pizza, descreva a pizza. Se for feijoada, salada ou strogonoff, identifique as guarnições exatas visíveis na foto.

No campo 'explanation', você DEVE iniciar obrigatoriamente informando o que identificou na imagem, no seguinte formato:
"Na imagem identifiquei:
- [alimento 1]
- [alimento 2]
..."
Depois disso, forneça uma análise nutricional completa e amigável contendo orientações práticas focadas em diabetes (ex: ordem de ingestão dos macronutrientes, dicas para achatar a curva glicêmica).

Preencha os campos estruturados de forma realista para o prato e sua porção visível:
- 'foodName': O nome específico e real do prato identificado (ex: "Feijoada Completa", "Pizza de Calabresa", "Strogonoff de Carne com Batata Palha", "Salada de Folhas com Frango", etc.).
- 'portionSize': Estimativa da porção (ex: "Prato de 350g", "1 fatia média de 120g", etc.).
- 'carbohydrates', 'sugar', 'fiber', 'protein', 'fats', 'calories': Estimativa nutricional realista para essa porção.
- 'glycemicLoad': Carga glicêmica estimada da porção.
- 'glycemicIndexRating': 'baixo', 'medio' ou 'alto'.
- 'expectedImpact': 'Baixo', 'Moderado' ou 'Alto' de acordo com o impacto esperado para o diabetes do paciente.
`;
      if (foodDescription) {
        promptText += `\nDescrição adicional do usuário para guiar a análise: "${foodDescription}"`;
      }
    } else {
      console.log(`[DADOS DE TEXTO]: Nenhuma imagem. Descrição de texto recebida: "${foodDescription}"`);

      promptText = `
Analise a seguinte descrição de refeição:
"${foodDescription}"

No campo 'explanation', você DEVE iniciar obrigatoriamente no seguinte formato:
"Na refeição descrita identifiquei:
- [alimento 1]
- [alimento 2]
..."
Depois, forneça as estimativas nutricionais realistas de uma porção padrão desse prato e o impacto esperado para o diabetes do paciente.

Preencha todos os campos estruturados em conformidade com a refeição descrita.
`;
    }

    console.log(`[PROMPT ENVIADO]: ${promptText.trim().substring(0, 300)}...`);

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING, description: "Nome exato e específico do prato identificado." },
            portionSize: { type: Type.STRING, description: "Porção de referência estimada (ex: 1 prato de 300g)." },
            carbohydrates: { type: Type.NUMBER, description: "Gramas de carboidratos estimados." },
            sugar: { type: Type.NUMBER, description: "Gramas de açúcares simples estimados." },
            fiber: { type: Type.NUMBER, description: "Gramas de fibras estimadas." },
            protein: { type: Type.NUMBER, description: "Gramas de proteínas estimadas." },
            fats: { type: Type.NUMBER, description: "Gramas de gorduras estimadas." },
            calories: { type: Type.NUMBER, description: "Quantidade de calorias (kcal)." },
            glycemicLoad: { type: Type.NUMBER, description: "Carga Glicêmica estimada da porção." },
            glycemicIndexRating: { type: Type.STRING, description: "Classificação do índice glicêmico: 'baixo', 'medio' ou 'alto'." },
            expectedImpact: { type: Type.STRING, description: "Impacto esperado na glicemia (ex: 'Baixo', 'Moderado', 'Alto')." },
            explanation: { type: Type.STRING, description: "Explicação detalhada que DEVE começar listando os alimentos identificados na imagem e depois fornecer conselhos práticos e nutricionais inteligentes." }
          },
          required: [
            "foodName",
            "portionSize",
            "carbohydrates",
            "sugar",
            "fiber",
            "protein",
            "fats",
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
    console.log(`[RESPOSTA RETORNADA DO GEMINI]: ${resultText.substring(0, 300)}...`);
    console.log(`--- [FIM DEBUG ANALISADOR DE ALIMENTOS MULTIMODAL] ---\n`);

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
