import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable CORS for all origins - critical for mobile browsers & WebViews on Vercel
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Configure JSON payload limit (up to 25MB for mobile photo uploads)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

let aiClient: any = null;

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    console.error("==========================================================");
    console.error("[ERRO GRAVE DE CONFIGURAÇÃO - VERCEL / SERVIDOR]");
    console.error("A variável de ambiente GEMINI_API_KEY não foi encontrada!");
    console.error("Para corrigir no Vercel:");
    console.error("1. Acesse o painel do seu projeto na Vercel");
    console.error("2. Vá em Settings > Environment Variables");
    console.error("3. Adicione a chave GEMINI_API_KEY com a sua API Key do Google AI Studio");
    console.error("==========================================================");
    throw new Error("A chave GEMINI_API_KEY não está configurada no ambiente do Vercel. Por favor, adicione GEMINI_API_KEY no painel da Vercel em Project Settings > Environment Variables.");
  }

  if (!aiClient) {
    console.log(`[GEMINI INIT]: Inicializando SDK do Gemini. Chave configurada (Comprimento: ${key.length}, Prefixo: ${key.substring(0, 6)}...)`);
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

// Helper function to call Gemini API with retry and model fallbacks
async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
}) {
  const ai = getGeminiClient();
  const modelsToTry = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let delay = 1000;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[AI REQUEST] Modelo: ${modelName} | Tentativa ${attempt}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI WARNING] Falha na tentativa ${attempt} com modelo ${modelName}. Erro:`, err.message || err);
        
        const errMsg = (err.message || "").toUpperCase();
        const isTransient = 
          err.status === "UNAVAILABLE" || 
          err.statusCode === 503 || 
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          err.status === "RESOURCE_EXHAUSTED" || 
          err.statusCode === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("LIMIT");

        if (isTransient && attempt < 3) {
          console.log(`[AI RETRY] Aguardando ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("Falha ao gerar conteúdo com a API do Gemini após tentar múltiplos modelos.");
}

// Create Express Router to handle API routes consistently in both Vercel and standalone Node
const apiRouter = express.Router();

// 0. Diagnostic Health Endpoint to test Vercel deployment and API Key presence
apiRouter.get(["/health", "/gemini/health"], (req: any, res: any) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const isKeyConfigured = Boolean(apiKey && apiKey.length > 5);

  console.log(`[HEALTH CHECK]: Chamada recebida | User-Agent: ${req.headers["user-agent"] || "mobile/unknown"} | Chave configurada: ${isKeyConfigured}`);

  res.json({
    status: "ok",
    service: "Glyco AI Backend API",
    geminiKeyConfigured: isKeyConfigured,
    keyPrefix: isKeyConfigured ? `${apiKey!.substring(0, 6)}...` : null,
    keyLength: isKeyConfigured ? apiKey!.length : 0,
    environment: process.env.VERCEL ? "vercel-serverless" : (process.env.NODE_ENV || "development"),
    isVercel: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString()
  });
});

// 1. Endpoint for automatic trend & pattern analysis of patient's history
apiRouter.post(["/gemini/analyze-history", "/analyze-history", "/api/gemini/analyze-history"], async (req: any, res: any) => {
  const startTime = Date.now();
  console.log(`\n--- [INÍCIO /api/gemini/analyze-history] ---`);
  console.log(`[CLIENTE]: ${req.headers["user-agent"] || "mobile"}`);

  try {
    const { profile, glucoseLogs, foodLogs, medicationLogs, exerciseLogs } = req.body || {};

    if (!profile) {
      return res.status(400).json({ error: "Perfil de usuário é obrigatório." });
    }

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

    const response = await generateContentWithRetry({
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
    console.log(`[FIM SUCESSO analyze-history]: Tempo: ${Date.now() - startTime}ms`);
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("[ERRO analyze-history]:", error.message || error);
    res.status(500).json({
      error: "Erro na Análise do Histórico",
      message: error.message || "Erro interno ao processar histórico do paciente.",
      details: String(error)
    });
  }
});

// 2. Endpoint for smart chat conversations
apiRouter.post(["/gemini/chat", "/chat", "/api/gemini/chat"], async (req: any, res: any) => {
  const startTime = Date.now();
  console.log(`\n--- [INÍCIO /api/gemini/chat] ---`);
  console.log(`[CLIENTE]: ${req.headers["user-agent"] || "mobile"}`);

  try {
    const { messages, profile, currentStats } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Histórico de mensagens é obrigatório." });
    }

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

    const chatContents = messages.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    const response = await generateContentWithRetry({
      contents: chatContents,
      config: {
        systemInstruction: fullInstruction,
      }
    });

    console.log(`[FIM SUCESSO chat]: Resposta gerada em ${Date.now() - startTime}ms`);
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("[ERRO chat]:", error.message || error);
    res.status(500).json({
      error: "Erro no Chat Inteligente",
      message: error.message || "Erro interno do servidor no chat.",
      details: String(error)
    });
  }
});

// 2.5. Endpoint for smart exercise daily plan generation
apiRouter.post(["/gemini/exercise-plan", "/exercise-plan", "/api/gemini/exercise-plan"], async (req: any, res: any) => {
  const startTime = Date.now();
  console.log(`\n--- [INÍCIO /api/gemini/exercise-plan] ---`);

  try {
    const { profile, currentStats, recentGlucoseLogs } = req.body || {};

    if (!profile) {
      return res.status(400).json({ error: "Perfil do usuário é obrigatório." });
    }

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

    const response = await generateContentWithRetry({
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
            title: { type: Type.STRING, description: "Título curto e acolhedor para o plano do dia." },
            description: { type: Type.STRING, description: "Resumo explicativo de por que esse plano foi selecionado." },
            recommendedExercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  exerciseId: { type: Type.STRING, description: "ID do exercício correspondente no nosso catálogo." },
                  name: { type: Type.STRING, description: "Nome do exercício." },
                  duration: { type: Type.STRING, description: "Duração recomendada." },
                  intensity: { type: Type.STRING, description: "Intensidade recomendada." },
                  order: { type: Type.NUMBER, description: "Ordem sequencial da atividade." }
                },
                required: ["name", "duration", "intensity", "order"]
              },
              description: "Lista de 1 a 3 atividades sequenciais sugeridas."
            },
            restTimeBetween: { type: Type.STRING, description: "Recomendação de tempo de descanso." },
            suggestedIntensityText: { type: Type.STRING, description: "Orientações gerais sobre percepção de esforço." },
            glycemicPrecautions: { type: Type.STRING, description: "Precauções de segurança glicêmica essenciais." },
            medicalDisclaimer: { type: Type.STRING, description: "Aviso médico obrigatório." }
          },
          required: ["title", "description", "recommendedExercises", "restTimeBetween", "suggestedIntensityText", "glycemicPrecautions", "medicalDisclaimer"]
        }
      }
    });

    const resultText = response.text || "{}";
    console.log(`[FIM SUCESSO exercise-plan]: Tempo: ${Date.now() - startTime}ms`);
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("[ERRO exercise-plan]:", error.message || error);
    res.status(500).json({
      error: "Erro no Plano de Exercícios",
      message: error.message || "Erro interno do servidor ao gerar plano de exercícios.",
      details: String(error)
    });
  }
});

// 3. Endpoint for food nutritional analysis (text description or base64 photo estimation)
apiRouter.post(["/gemini/analyze-food", "/analyze-food", "/api/gemini/analyze-food"], async (req: any, res: any) => {
  const startTime = Date.now();
  let foodDescription = "";
  console.log(`\n--- [INÍCIO /api/gemini/analyze-food] ---`);
  console.log(`[CLIENTE]: ${req.headers["user-agent"] || "mobile"}`);

  try {
    const { foodDescription: desc, base64Image, profile } = req.body || {};
    foodDescription = desc || "";

    if (!foodDescription && !base64Image) {
      return res.status(400).json({
        error: "Dados de Entrada Ausentes",
        message: "Forneça uma descrição do alimento ou tire/selecione uma foto da refeição.",
        source: "Validação de Entrada (Servidor)",
        statusCode: 400
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[ERRO VERCEL]: GEMINI_API_KEY não encontrada nas variáveis de ambiente!");
      return res.status(500).json({
        error: "Chave do Gemini Não Configurada",
        message: "A chave de API GEMINI_API_KEY não foi configurada nas variáveis de ambiente do Vercel.",
        source: "Painel da Vercel (Project Settings > Environment Variables)",
        statusCode: 500
      });
    }

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
    const partsList: any[] = [];

    if (base64Image) {
      const parts = base64Image.split(";base64,");
      const mimeType = parts[0]?.split(":")[1] || "image/jpeg";
      const cleanBase64 = parts[1];

      if (!cleanBase64 || cleanBase64.length < 50) {
        return res.status(400).json({
          error: "Formato de Imagem Inválido",
          message: "A foto enviada possui formato Base64 corrompido ou incompleto.",
          source: "Processamento de Imagem (Servidor)",
          statusCode: 400
        });
      }

      console.log(`[DADOS DA FOTO]: MimeType: "${mimeType}", Tamanho Base64: ${cleanBase64.length} caracteres.`);

      partsList.push({
        inlineData: {
          mimeType,
          data: cleanBase64
        }
      });

      promptText = `
Você recebeu uma FOTO real de um prato de comida enviada pelo usuário via celular/navegador.
Você deve analisar VISUALMENTE esta foto e identificar todos os alimentos individuais visíveis na imagem.

Sua resposta DEVE ser extremamente fiel ao que está de fato na foto. Não use respostas genéricas.

No campo 'explanation', você DEVE iniciar obrigatoriamente informando o que identificou na imagem, no seguinte formato:
"Na imagem identifiquei:
- [alimento 1]
- [alimento 2]
..."
Depois disso, forneça uma análise nutricional completa contendo orientações práticas focadas em diabetes.

Preencha os campos estruturados de forma realista para o prato e sua porção visível:
- 'foodName': O nome específico e real do prato identificado.
- 'portionSize': Estimativa da porção.
- 'carbohydrates', 'sugar', 'fiber', 'protein', 'fats', 'calories': Estimativa nutricional realista.
- 'glycemicLoad': Carga glicêmica estimada da porção.
- 'glycemicIndexRating': 'baixo', 'medio' ou 'alto'.
- 'expectedImpact': 'Baixo', 'Moderado' ou 'Alto'.
`;
      if (foodDescription) {
        promptText += `\nDescrição adicional do usuário: "${foodDescription}"`;
      }
    } else {
      console.log(`[DADOS DE TEXTO]: Descrição recebida: "${foodDescription}"`);

      promptText = `
Analise a seguinte descrição de refeição:
"${foodDescription}"

No campo 'explanation', você DEVE iniciar obrigatoriamente no seguinte formato:
"Na refeição descrita identifiquei:
- [alimento 1]
- [alimento 2]
..."
Depois, forneça as estimativas nutricionais realistas e o impacto esperado para o diabetes do paciente.
`;
    }

    partsList.push({ text: promptText });

    const response = await generateContentWithRetry({
      contents: { parts: partsList },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING, description: "Nome exato e específico do prato identificado." },
            portionSize: { type: Type.STRING, description: "Porção de referência estimada." },
            carbohydrates: { type: Type.NUMBER, description: "Gramas de carboidratos estimados." },
            sugar: { type: Type.NUMBER, description: "Gramas de açúcares simples estimados." },
            fiber: { type: Type.NUMBER, description: "Gramas de fibras estimadas." },
            protein: { type: Type.NUMBER, description: "Gramas de proteínas estimadas." },
            fats: { type: Type.NUMBER, description: "Gramas de gorduras estimadas." },
            calories: { type: Type.NUMBER, description: "Quantidade de calorias (kcal)." },
            glycemicLoad: { type: Type.NUMBER, description: "Carga Glicêmica estimada da porção." },
            glycemicIndexRating: { type: Type.STRING, description: "Classificação do índice glicêmico: 'baixo', 'medio' ou 'alto'." },
            expectedImpact: { type: Type.STRING, description: "Impacto esperado na glicemia ('Baixo', 'Moderado', 'Alto')." },
            explanation: { type: Type.STRING, description: "Explicação detalhada dos alimentos e conselhos nutricionais." }
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

    const duration = Date.now() - startTime;
    const resultText = response.text || "{}";
    const parsedResult = JSON.parse(resultText);

    const fnLower = (parsedResult.foodName || "").toLowerCase();
    const expLower = (parsedResult.explanation || "").toLowerCase();

    const isUnrecognized = 
      fnLower.includes("nenhum alimento") || 
      fnLower.includes("não foi possível") || 
      fnLower.includes("desconhecido") || 
      fnLower.includes("não identificado") ||
      (parsedResult.carbohydrates === 0 && parsedResult.protein === 0 && parsedResult.fats === 0 && (expLower.includes("nenhum alimento") || expLower.includes("sem alimentos")));

    if (isUnrecognized && base64Image) {
      console.warn(`[RECONHECIMENTO INCOMPLETO]: Nenhum alimento identificado na imagem.`);
      return res.status(422).json({
        error: "Foto Não Reconhecida",
        message: "A Inteligência Artificial não conseguiu identificar nenhum alimento visível nesta foto. Por favor, envie uma foto bem iluminada e focada no prato de comida.",
        source: "Inteligência Artificial (Gemini)",
        statusCode: 422,
        details: parsedResult.explanation
      });
    }

    console.log(`[FIM SUCESSO analyze-food]: Concluído em ${duration}ms`);
    res.json(parsedResult);
  } catch (error: any) {
    const elapsedTime = Date.now() - startTime;
    const errMsg = String(error.message || error);

    let source = "Servidor Backend";
    let statusCode = error.status || error.statusCode || 500;

    if (errMsg.includes("413") || errMsg.includes("Payload Too Large") || error.type === "entity.too.large") {
      source = "Servidor (Tamanho da Imagem Excede o Limite do Vercel Serverless)";
      statusCode = 413;
    } else if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429") || errMsg.includes("Quota")) {
      source = "API do Gemini (Limite de Requisições / Serviço Temporariamente Indisponível)";
      statusCode = 503;
    } else if (errMsg.includes("API key") || errMsg.includes("API_KEY") || errMsg.includes("403")) {
      source = "API do Gemini (Chave de API GEMINI_API_KEY Inválida ou Não Configurada)";
      statusCode = 403;
    }

    console.error(`[ERRO CRÍTICO analyze-food]: ${errMsg} (Status: ${statusCode}, Tempo: ${elapsedTime}ms)`);

    res.status(statusCode).json({
      error: "Falha na Análise da Foto / Refeição",
      message: errMsg,
      source: source,
      statusCode: statusCode,
      elapsedTimeMs: elapsedTime,
      details: error.stack || String(error)
    });
  }
});

// Mount router on both /api and / root path for Vercel Serverless rewriting compatibility
app.use("/api", apiRouter);
app.use("/", apiRouter);

// Export express app as default for Vercel Serverless Functions
export default app;

// If running in traditional Node.js environment (Cloud Run / Local Dev Server)
if (process.env.VERCEL !== "1") {
  async function setupViteOrStatic() {
    if (process.env.NODE_ENV !== "production") {
      console.log("Iniciando servidor Express em modo Desenvolvimento com Vite...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Iniciando servidor Express em modo Produção servindo arquivos estáticos...");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req: any, res: any) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Glyco AI rodando com sucesso na porta ${PORT}`);
    });
  }

  setupViteOrStatic();
}
