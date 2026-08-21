import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, runTransaction } from "firebase/firestore";

dotenv.config();

// Initialize Firebase server instance for secure server-side rate limiting
let serverDb: any = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const rawConfig = fs.readFileSync(configPath, "utf8");
    const firebaseConfig = JSON.parse(rawConfig);
    
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const customDbId = process.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
    serverDb = (customDbId && customDbId.trim() !== "" && customDbId !== "(default)")
      ? getFirestore(app, customDbId)
      : getFirestore(app);
    console.log("[SERVER FIRESTORE INIT]: Banco de dados Firestore inicializado no servidor com sucesso.");
  } else {
    console.warn("[SERVER FIRESTORE INIT]: firebase-applet-config.json não encontrado no servidor.");
  }
} catch (err) {
  console.error("[SERVER FIRESTORE INIT ERROR]:", err);
}

interface ReservationResult {
  allowed: boolean;
  isDevMode: boolean;
  isPremium: boolean;
  currentUsage: number;
  reason?: string;
  uid?: string;
  reserved: boolean;
}

// Helper to check and reserve AI slot atomically in Firestore on the server
async function reserveAiSlot(uid: string | undefined, userProfile?: any, requestEmail?: string): Promise<ReservationResult> {
  const userEmail = (
    requestEmail ||
    userProfile?.email ||
    userProfile?.userEmail ||
    (typeof userProfile === "string" && userProfile.includes("@") ? userProfile : "")
  ).toLowerCase().trim();

  // Check Admin / CEO privileges
  const isAdminOrCeo = 
    userEmail === "nickinicolas380@gmail.com" ||
    userProfile?.role === "admin" ||
    userProfile?.role === "ceo" ||
    userProfile?.plan === "admin" ||
    userProfile?.plan === "ceo";

  if (isAdminOrCeo) {
    console.log(`[ETAPA 3: AUTH] Usuário ${userEmail || uid || "N/A"} reconhecido como ADMIN/CEO.`);
    console.log(`[ETAPA 4: QUOTA] Acesso ilimitado concedido (ADMIN/CEO - Isento de cotas de teste).`);
    return { allowed: true, isDevMode: false, isPremium: true, currentUsage: 0, uid, reserved: false, reason: "ADMIN_CEO_UNLIMITED" };
  }

  // 1. Check server-side DEVELOPMENT_MODE flag
  const isDevMode = 
    process.env.DEVELOPMENT_MODE === "true" ||
    process.env.VITE_DEVELOPMENT_MODE === "true" ||
    process.env.DISABLE_AI_LIMITS === "true";

  if (isDevMode) {
    console.log("[ETAPA 4: QUOTA] DEVELOPMENT_MODE ativo no servidor. Acesso ilimitado liberado.");
    return { allowed: true, isDevMode: true, isPremium: false, currentUsage: 0, reserved: false, reason: "DEV_MODE_UNLIMITED" };
  }

  const userId = uid || userProfile?.uid;
  const isPayloadPremium = userProfile?.plan === "premium" || userProfile?.subscriptionStatus === "active";

  if (isPayloadPremium) {
    console.log(`[ETAPA 4: QUOTA] Usuário ${userId || userEmail || "N/A"} possui plano Premium ativo. Acesso liberado.`);
    return { allowed: true, isDevMode: false, isPremium: true, currentUsage: 0, uid: userId, reserved: false, reason: "PREMIUM_UNLIMITED" };
  }

  if (!userId) {
    console.warn(`[ETAPA 3: AUTH & 4: QUOTA] Falha na identificação: UID e Email ausentes na requisição.`);
    return {
      allowed: false,
      isDevMode: false,
      isPremium: false,
      currentUsage: 2,
      reason: "UID do usuário ausente na requisição.",
      reserved: false
    };
  }

  if (!serverDb) {
    // If Firestore server instance is unavailable, fallback safely to local profile state
    const usage = typeof userProfile?.aiUsageCount === "number" ? userProfile.aiUsageCount : 0;
    if (usage < 2) {
      console.log(`[ETAPA 4: QUOTA] Usuário Free (Firestore offline fallback): Uso atual ${usage}/2. Liberado.`);
      return { allowed: true, isDevMode: false, isPremium: false, currentUsage: usage, uid: userId, reserved: false };
    }
    console.warn(`[ETAPA 4: QUOTA] Usuário Free (Firestore offline fallback): Cota de 2 análises excedida (${usage}/2). Bloqueado.`);
    return { allowed: false, isDevMode: false, isPremium: false, currentUsage: usage, reason: "TRIAL_EXHAUSTED", reserved: false };
  }

  // 2. Perform atomic transaction on Firestore
  try {
    const userRef = doc(serverDb, "users", userId);
    
    return await runTransaction(serverDb, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) {
        // User doc doesn't exist yet, create with 1 reserved usage
        console.log(`[ETAPA 4: QUOTA & 7: FIRESTORE] Criando documento inicial para usuário ${userId} com 1 uso reservado.`);
        transaction.set(userRef, {
          aiUsageCount: 1,
          email: userEmail || null,
          plan: userProfile?.plan || "free",
          subscriptionStatus: userProfile?.subscriptionStatus || "inactive",
          updatedAt: new Date().toISOString()
        }, { merge: true });
        return { allowed: true, isDevMode: false, isPremium: false, currentUsage: 1, uid: userId, reserved: true };
      }

      const data = snap.data();
      const docEmail = (data.email || "").toLowerCase().trim();
      if (docEmail === "nickinicolas380@gmail.com" || data.role === "admin" || data.role === "ceo") {
        console.log(`[ETAPA 3: AUTH & 4: QUOTA] Usuário ${userId} (${docEmail}) validado no Firestore como ADMIN/CEO.`);
        return { allowed: true, isDevMode: false, isPremium: true, currentUsage: 0, uid: userId, reserved: false, reason: "ADMIN_CEO_UNLIMITED" };
      }

      const isDbPremium = data.plan === "premium" || data.subscriptionStatus === "active";
      const currentUsage = typeof data.aiUsageCount === "number" ? data.aiUsageCount : 0;

      if (isDbPremium) {
        console.log(`[ETAPA 4: QUOTA] Usuário ${userId} confirmado como Premium no Firestore.`);
        return { allowed: true, isDevMode: false, isPremium: true, currentUsage, uid: userId, reserved: false, reason: "PREMIUM_UNLIMITED" };
      }

      if (currentUsage >= 2) {
        console.warn(`[ETAPA 4: QUOTA] Usuário Free ${userId} atingiu o limite máximo de 2 usos gratuitos (Uso: ${currentUsage}/2).`);
        return { allowed: false, isDevMode: false, isPremium: false, currentUsage, reason: "TRIAL_EXHAUSTED", uid: userId, reserved: false };
      }

      // Safe to reserve slot! Increment count atomically in transaction
      const newUsage = currentUsage + 1;
      console.log(`[ETAPA 4: QUOTA] Reservando slot de IA para usuário ${userId}: ${currentUsage} -> ${newUsage}/2.`);
      transaction.update(userRef, {
        aiUsageCount: newUsage,
        updatedAt: new Date().toISOString()
      });

      return { allowed: true, isDevMode: false, isPremium: false, currentUsage: newUsage, uid: userId, reserved: true };
    });
  } catch (err) {
    console.error("[SERVER AI LIMIT TRANSACTION ERROR]:", err);
    const usage = typeof userProfile?.aiUsageCount === "number" ? userProfile.aiUsageCount : 0;
    if (usage < 2) {
      return { allowed: true, isDevMode: false, isPremium: false, currentUsage: usage, uid: userId, reserved: false };
    }
    return { allowed: false, isDevMode: false, isPremium: false, currentUsage: usage, reason: "TRIAL_EXHAUSTED", reserved: false };
  }
}

// Rollback helper if Gemini API fails after slot was reserved
async function rollbackAiSlot(uid: string | undefined) {
  if (!uid || !serverDb) return;
  try {
    const userRef = doc(serverDb, "users", uid);
    await runTransaction(serverDb, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentUsage = typeof data.aiUsageCount === "number" ? data.aiUsageCount : 0;
        if (currentUsage > 0) {
          transaction.update(userRef, {
            aiUsageCount: currentUsage - 1,
            updatedAt: new Date().toISOString()
          });
        }
      }
    });
    console.log(`[SERVER AI ROLLBACK]: Uso de IA estornado no Firestore para o usuário ${uid}`);
  } catch (err) {
    console.error("[SERVER AI ROLLBACK ERROR]:", err);
  }
}

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

function getGeminiClient(customKey?: string) {
  const key = customKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
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

  console.log(`[GEMINI INIT]: Criando cliente SDK Gemini. (Chave: ${key.substring(0, 6)}... Tamanho: ${key.length})`);
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper function to call Gemini API with retry and model fallbacks
async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
  apiKey?: string;
}) {
  const ai = getGeminiClient(params.apiKey);
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest", "gemini-1.5-pro"];
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
apiRouter.get(["/health", "/gemini/health", "/api/health", "/api/gemini/health"], (req: any, res: any) => {
  const apiKey = req.headers["x-gemini-api-key"] || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const isKeyConfigured = Boolean(apiKey && apiKey.length > 5);

  console.log(`[HEALTH CHECK]: Chamada recebida | User-Agent: ${req.headers["user-agent"] || "mobile/unknown"} | Chave configurada: ${isKeyConfigured}`);

  res.json({
    status: "ok",
    service: "Glyco AI Backend API",
    geminiKeyConfigured: isKeyConfigured,
    keyPrefix: isKeyConfigured ? `${String(apiKey).substring(0, 6)}...` : null,
    keyLength: isKeyConfigured ? String(apiKey).length : 0,
    environment: process.env.VERCEL ? "vercel-serverless" : (process.env.NODE_ENV || "development"),
    isVercel: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString()
  });
});

// 1. Endpoint for automatic trend & pattern analysis of patient's history
apiRouter.post(["/gemini/analyze-history", "/analyze-history", "/ai-analysis", "/api/gemini/analyze-history", "/api/analyze-history", "/api/ai-analysis"], async (req: any, res: any) => {
  const startTime = Date.now();
  let reservedSlot = false;
  let targetUid: string | undefined = undefined;

  console.log(`\n--- [INÍCIO /api/gemini/analyze-history] ---`);
  console.log(`[CLIENTE]: ${req.headers["user-agent"] || "mobile"}`);

  try {
    const customApiKey = req.headers["x-gemini-api-key"] || req.body?.apiKey;
    const { profile, glucoseLogs, foodLogs, medicationLogs } = req.body || {};
    const uid = req.headers["x-user-uid"] || req.body?.uid || profile?.uid;
    targetUid = uid;

    if (!profile) {
      return res.status(400).json({ error: "Perfil de usuário é obrigatório." });
    }

    // 1. Server-Side AI Quota Verification & Atomic Reservation
    const limitCheck = await reserveAiSlot(uid, profile);
    if (!limitCheck.allowed) {
      console.warn(`[AI LIMIT BLOCKED /analyze-history]: Usuário ${uid || "desconhecido"} bloqueado no servidor. Limite atingido.`);
      return res.status(403).json({
        error: "TRIAL_EXHAUSTED",
        code: "TRIAL_EXHAUSTED",
        message: "Sua conta atingiu o limite de 2 utilizações gratuitas da Inteligência Artificial. Assine o plano Premium para acesso ilimitado.",
        aiUsageCount: limitCheck.currentUsage,
        statusCode: 403
      });
    }

    reservedSlot = limitCheck.reserved;

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
`;

    const prompt = `Analise o histórico fornecido acima e identifique exatamente:
1. Padrões identificados (ex: aumentos após café, hipoglicemias recorrentes).
2. Três insights inteligentes acionáveis e específicos para este paciente.
3. Um resumo geral da evolução recente (ex: controle melhorou, está estável ou requer atenção).

Retorne os resultados em um formato JSON estruturado para exibição fluida no dashboard.`;

    const response = await generateContentWithRetry({
      apiKey: customApiKey,
      contents: [
        { role: "user", parts: [{ text: systemPrompt }, { text: patientContext }, { text: prompt }] }
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
    const parsedData = JSON.parse(resultText);
    console.log(`[FIM SUCESSO analyze-history]: Tempo: ${Date.now() - startTime}ms`);
    res.json({
      ...parsedData,
      aiUsageCount: limitCheck.currentUsage
    });
  } catch (error: any) {
    console.error("[ERRO analyze-history]:", error.message || error);
    if (reservedSlot && targetUid) {
      await rollbackAiSlot(targetUid);
    }
    res.status(500).json({
      error: "Erro na Análise do Histórico",
      message: error.message || "Erro interno ao processar histórico do paciente.",
      details: String(error)
    });
  }
});

// 2. Endpoint for smart chat conversations (Copilot)
apiRouter.post(["/gemini/chat", "/chat", "/copilot", "/api/gemini/chat", "/api/chat", "/api/copilot"], async (req: any, res: any) => {
  const startTime = Date.now();
  let reservedSlot = false;
  let targetUid: string | undefined = undefined;

  console.log(`\n--- [INÍCIO /api/gemini/chat / copilot] ---`);
  console.log(`[CLIENTE]: ${req.headers["user-agent"] || "mobile"}`);

  try {
    const customApiKey = req.headers["x-gemini-api-key"] || req.body?.apiKey;
    const { messages, profile, currentStats, recentMeals } = req.body || {};
    const uid = req.headers["x-user-uid"] || req.body?.uid || profile?.uid;
    targetUid = uid;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Histórico de mensagens é obrigatório." });
    }

    // 1. Server-Side AI Quota Verification & Atomic Reservation
    const limitCheck = await reserveAiSlot(uid, profile);
    if (!limitCheck.allowed) {
      console.warn(`[AI LIMIT BLOCKED /chat]: Usuário ${uid || "desconhecido"} bloqueado no servidor. Limite atingido.`);
      return res.status(403).json({
        error: "TRIAL_EXHAUSTED",
        code: "TRIAL_EXHAUSTED",
        message: "Sua conta atingiu o limite de 2 utilizações gratuitas da Inteligência Artificial. Assine o plano Premium para acesso ilimitado.",
        aiUsageCount: limitCheck.currentUsage,
        statusCode: 403
      });
    }

    reservedSlot = limitCheck.reserved;

    const systemInstruction = `Você é o Assistente Virtual da Glyco AI, um companheiro inteligente de suporte para diabetes.
Use as seguintes regras cruciais de comportamento:
1. Responda de forma extremamente empática, objetiva, moderna e acolhedora em português (Brasil).
2. Leve em consideração o perfil clínico do paciente fornecido, suas estatísticas e as refeições recentes.
3. Se o paciente perguntar sobre alimentação (ex: "Posso comer pizza?", ou "O que achei do meu almoço?"), forneça conselhos práticos e nutricionais inteligentes, explicando sobre moderação, contagem de carboidratos, ordem dos alimentos (comer fibras/proteínas antes) e o impacto esperado, sem proibicionismo punitivo.
4. Se o usuário estiver relatando sintomas de hipoglicemia (tontura, suor frio, tremores), oriente IMEDIATAMENTE a regra dos 15g de carboidratos rápidos (ex: 150ml de refrigerante comum ou suco de laranja) e medir novamente em 15 minutos.
5. Sempre exiba um pequeno lembrete humilde de que suas respostas são informativas e não substituem o médico do paciente.
6. EVITE repetição de frases, mensagens prontas ou respostas genéricas. Cada interação deve ser totalmente dinâmica e adaptada especificamente ao conteúdo e tom da pergunta atual.`;

    const mealsContextStr = Array.isArray(recentMeals) && recentMeals.length > 0
      ? recentMeals.slice(0, 4).map((m: any) => `- ${m.nutrition?.foodName || m.description || "Refeição"}: ${m.nutrition?.carbohydrates || 0}g carbos, Carga Glicêmica: ${m.nutrition?.glycemicLoad || "N/A"}`).join('\n')
      : "Nenhuma refeição registrada hoje.";

    const contextData = `
--- CONTEXTO DO PACIENTE ---
Nome: ${profile?.name || "Paciente"}
Tipo de Diabetes: ${profile?.diabetesType || "Tipo 2"}
Insulina: ${profile?.usesInsulin ? "Sim" : "Não"}
Medicamentos: ${JSON.stringify(profile?.medications || [])}
Média recente de glicemia: ${currentStats?.averageGlucose || "135"} mg/dL
Tempo no alvo: ${currentStats?.timeInRange || "75"}%
Metas glicêmicas: Jejum ${profile?.targetGlucoseMinJejum || 70}-${profile?.targetGlucoseMaxJejum || 130} mg/dL | Pós-prandial até ${profile?.targetGlucoseMaxPosPrandial || 180} mg/dL
Refeições recentes do diário:
${mealsContextStr}
`;

    const fullInstruction = `${systemInstruction}\n\n${contextData}`;

    const chatContents = messages.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    const response = await generateContentWithRetry({
      apiKey: customApiKey,
      contents: chatContents,
      config: {
        systemInstruction: fullInstruction,
      }
    });

    console.log(`[FIM SUCESSO chat]: Resposta gerada em ${Date.now() - startTime}ms`);
    res.json({
      text: response.text,
      aiUsageCount: limitCheck.currentUsage
    });
  } catch (error: any) {
    console.error("[ERRO chat]:", error.message || error);
    if (reservedSlot && targetUid) {
      await rollbackAiSlot(targetUid);
    }
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
  let reservedSlot = false;
  let targetUid: string | undefined = undefined;

  console.log(`\n--- [INÍCIO /api/gemini/exercise-plan] ---`);

  try {
    const customApiKey = req.headers["x-gemini-api-key"] || req.body?.apiKey;
    const { profile, currentStats, recentGlucoseLogs } = req.body || {};
    const uid = req.headers["x-user-uid"] || req.body?.uid || profile?.uid;
    targetUid = uid;

    if (!profile) {
      return res.status(400).json({ error: "Perfil do usuário é obrigatório." });
    }

    // 1. Server-Side AI Quota Verification & Atomic Reservation
    const limitCheck = await reserveAiSlot(uid, profile);
    if (!limitCheck.allowed) {
      console.warn(`[AI LIMIT BLOCKED /exercise-plan]: Usuário ${uid || "desconhecido"} bloqueado no servidor. Limite atingido.`);
      return res.status(403).json({
        error: "TRIAL_EXHAUSTED",
        code: "TRIAL_EXHAUSTED",
        message: "Sua conta atingiu o limite de 2 utilizações gratuitas da Inteligência Artificial. Assine o plano Premium para acesso ilimitado.",
        aiUsageCount: limitCheck.currentUsage,
        statusCode: 403
      });
    }

    reservedSlot = limitCheck.reserved;

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
      apiKey: customApiKey,
      contents: [
        { role: "user", parts: [{ text: systemPrompt }, { text: patientContext }, { text: promptText }] }
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
    const parsedData = JSON.parse(resultText);
    console.log(`[FIM SUCESSO exercise-plan]: Tempo: ${Date.now() - startTime}ms`);
    res.json({
      ...parsedData,
      aiUsageCount: limitCheck.currentUsage
    });
  } catch (error: any) {
    console.error("[ERRO exercise-plan]:", error.message || error);
    if (reservedSlot && targetUid) {
      await rollbackAiSlot(targetUid);
    }
    res.status(500).json({
      error: "Erro no Plano de Exercícios",
      message: error.message || "Erro interno do servidor ao gerar plano de exercícios.",
      details: String(error)
    });
  }
});

// 3. Endpoint for food nutritional analysis (text description or base64 photo estimation)
apiRouter.post(["/gemini/analyze-food", "/analyze-food", "/analyze-food-photo", "/food-analysis", "/api/gemini/analyze-food", "/api/analyze-food", "/api/analyze-food-photo", "/api/food-analysis"], async (req: any, res: any) => {
  const startTime = Date.now();
  let foodDescription = "";
  let reservedSlot = false;
  let targetUid: string | undefined = undefined;

  console.log(`\n===========================================================`);
  console.log(`[ETAPA 2: API] Requisição recebida em /api/gemini/analyze-food`);
  console.log(`[CLIENTE]: ${req.headers["user-agent"] || "mobile"}`);
  console.log(`===========================================================`);

  try {
    const customApiKey = req.headers["x-gemini-api-key"] || req.body?.apiKey;
    const { foodDescription: desc, base64Image, profile } = req.body || {};
    foodDescription = desc || "";
    
    // ETAPA 3: Autenticação
    const uid = req.headers["x-user-uid"] || req.body?.uid || profile?.uid;
    const userEmail = (
      req.headers["x-user-email"] ||
      profile?.email ||
      req.body?.email ||
      ""
    ).toLowerCase().trim();
    targetUid = uid;

    console.log(`[ETAPA 3: AUTH] Verificando identificação do usuário...`);
    console.log(`[ETAPA 3: AUTH] UID: "${uid || 'N/A'}" | Email: "${userEmail || 'N/A'}" | Role: "${profile?.role || 'N/A'}"`);

    if (!foodDescription && !base64Image) {
      console.warn(`[ETAPA 2: API] [ERRO] Dados de entrada ausentes (sem texto e sem foto).`);
      return res.status(400).json({
        step: "2. API",
        error: "DADOS_ENTRADA_AUSENTES",
        statusCode: 400,
        message: "Nenhuma descrição em texto ou foto de refeição foi fornecida na requisição.",
        originalError: "Missing foodDescription and base64Image in request body",
        probableCause: "O formulário foi enviado em branco sem arquivo anexado e sem texto digitado.",
        source: "Validação de Entrada (Servidor)",
        timestamp: new Date().toISOString()
      });
    }

    // ETAPA 4: Quota
    console.log(`[ETAPA 4: QUOTA] Consultando permissão de cota no servidor/Firestore...`);
    const limitCheck = await reserveAiSlot(uid, profile, userEmail);
    if (!limitCheck.allowed) {
      console.warn(`[ERRO QUOTA] 403 - Limite de 2 análises gratuitas excedido para o usuário ${userEmail || uid || "desconhecido"}.`);
      return res.status(403).json({
        step: "4. Quota",
        error: "TRIAL_EXHAUSTED",
        code: "TRIAL_EXHAUSTED",
        statusCode: 403,
        message: "Sua conta atingiu o limite de 2 utilizações gratuitas da Inteligência Artificial. Assine o plano Premium para ter análises ilimitadas.",
        originalError: limitCheck.reason || "TRIAL_EXHAUSTED",
        probableCause: "O usuário está no plano Free e já consumiu as 2 análises de demonstração.",
        source: "Controle de Quota do Servidor (reserveAiSlot)",
        aiUsageCount: limitCheck.currentUsage,
        timestamp: new Date().toISOString()
      });
    }

    reservedSlot = limitCheck.reserved;
    console.log(`[ETAPA 4: QUOTA] Cota validada com sucesso. Motivo: ${limitCheck.reason || 'Liberado'}`);

    // ETAPA 5: Gemini API Key Resolution
    const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error(`[ERRO GEMINI] 500 - GEMINI_API_KEY não configurada no ambiente.`);
      if (reservedSlot && targetUid) await rollbackAiSlot(targetUid);
      return res.status(500).json({
        step: "5. Gemini",
        error: "GEMINI_API_KEY_NAO_CONFIGURADA",
        statusCode: 500,
        message: "A chave de API GEMINI_API_KEY não foi encontrada nas variáveis de ambiente do servidor.",
        originalError: "Environment variable GEMINI_API_KEY is undefined or empty",
        probableCause: "A variável de ambiente GEMINI_API_KEY não foi adicionada no painel de produção (Project Settings > Environment Variables no Vercel ou Cloud Run).",
        source: "Servidor Backend / Variáveis de Ambiente",
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[ETAPA 5: GEMINI] Chave GEMINI_API_KEY localizada (${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}). Preparando payload para modelo gemini-2.5-flash...`);

    const systemPrompt = `Você é um nutricionista clínico especialista em diabetes, alimentação funcional, contagem de carboidratos e IA nutricional multimodal.
Sua tarefa é analisar a imagem fornecida (ou a descrição em texto) e identificar visualmente TODOS os alimentos presentes no prato de forma exata e fiel à foto real recebida.
Você deve estimar detalhadamente os valores nutricionais baseados na porção visível ou descrita, decompor os itens individuais do prato e fornecer orientações de nutrição funcional prática.

AVISO MÉDICO OBRIGATÓRIO: Sempre inclua na explicação que se trata de uma estimativa informativa e não laboratorial.`;

    const userProfileContext = `
--- DADOS CLÍNICOS DO PACIENTE ---
Tipo de Diabetes: ${profile?.diabetesType || "Tipo 2"}
Usa Insulina: ${profile?.usesInsulin ? "Sim" : "Não"}
Medicamentos: ${JSON.stringify(profile?.medications || [])}
Meta Glicêmica Pós-Prandial: até ${profile?.targetGlucoseMaxPosPrandial || 180} mg/dL
Idade / Peso: ${profile?.age || "N/A"} anos / ${profile?.weight || "N/A"} kg
`;

    const systemInstruction = `${systemPrompt}\n\n${userProfileContext}`;

    let promptText = "";
    const partsList: any[] = [];

    if (base64Image) {
      const parts = base64Image.split(";base64,");
      const mimeType = parts[0]?.split(":")[1] || "image/jpeg";
      const cleanBase64 = parts[1];

      if (!cleanBase64 || cleanBase64.length < 50) {
        console.error(`[ERRO FRONTEND/API] 400 - Formato Base64 corrompido.`);
        if (reservedSlot && targetUid) await rollbackAiSlot(targetUid);
        return res.status(400).json({
          step: "1. Frontend",
          error: "FOTO_CORROMPIDA",
          statusCode: 400,
          message: "A foto enviada possui formato Base64 incompleto ou corrompido durante o envio.",
          originalError: "Invalid or empty cleanBase64 payload",
          probableCause: "Falha durante o processo de compressão no navegador ou upload interrompido.",
          source: "Processamento de Imagem (Frontend/API)",
          timestamp: new Date().toISOString()
        });
      }

      console.log(`[ETAPA 5: GEMINI] Foto Base64 processada: MimeType: "${mimeType}", Tamanho: ${Math.round(cleanBase64.length / 1024)} KB.`);

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

No campo 'explanation', forneça uma análise acolhedora e prática focada em diabetes.
Preencha a lista 'identifiedItems' com cada alimento individual decomposto no prato.
Preencha 'functionalTips' com 2 a 3 dicas práticas de nutrição funcional (ex: substituições inteligentes, adição de fibras ou gorduras boas para diminuir o pico glicêmico).
Preencha 'consumptionOrder' com a sequência fisiologicamente ideal de ingestão (ex: "1º Fibras/Salada -> 2º Proteínas -> 3º Carboidratos").

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
      console.log(`[ETAPA 5: GEMINI] Descrição em texto: "${foodDescription}"`);

      promptText = `
Analise a seguinte descrição de refeição:
"${foodDescription}"

No campo 'explanation', forneça uma análise nutricional clara e acolhedora.
Decomponha os alimentos em 'identifiedItems', inclua dicas de nutrição funcional em 'functionalTips' e a ordem de consumo ideal em 'consumptionOrder'.
`;
    }

    partsList.push({ text: promptText });

    console.log(`[ETAPA 5: GEMINI] Disparando requisição para a API do Gemini...`);

    const response = await generateContentWithRetry({
      apiKey: customApiKey,
      contents: [{ role: "user", parts: partsList }],
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
            explanation: { type: Type.STRING, description: "Explicação detalhada dos alimentos e conselhos nutricionais." },
            consumptionOrder: { type: Type.STRING, description: "Ordem recomendada de ingestão dos alimentos no prato." },
            functionalTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de 2 a 3 dicas práticas de nutrição funcional e substituições saudáveis."
            },
            identifiedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nome do alimento individual identificado." },
                  portion: { type: Type.STRING, description: "Estimativa da porção deste item." },
                  carbohydrates: { type: Type.NUMBER, description: "Carboidratos deste item em gramas." },
                  protein: { type: Type.NUMBER, description: "Proteína deste item em gramas." },
                  fats: { type: Type.NUMBER, description: "Gordura deste item em gramas." },
                  glycemicImpact: { type: Type.STRING, description: "Impacto glicêmico do item: 'baixo', 'medio' ou 'alto'." }
                },
                required: ["name", "portion", "carbohydrates", "glycemicImpact"]
              },
              description: "Lista de alimentos individuais identificados no prato."
            }
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

    // ETAPA 6: Resposta
    console.log(`[ETAPA 6: RESPOSTA] Processando resposta JSON do Gemini (${duration}ms)...`);
    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(resultText);
    } catch (parseErr) {
      console.error(`[ERRO RESPOSTA] 502 - Resposta do Gemini não é um JSON válido:`, resultText);
      if (reservedSlot && targetUid) await rollbackAiSlot(targetUid);
      return res.status(502).json({
        step: "6. Resposta",
        error: "RESPOSTA_JSON_INVALIDA",
        statusCode: 502,
        message: "O modelo retornou uma estrutura de texto corrompida que não pôde ser interpretada como JSON.",
        originalError: String(parseErr),
        probableCause: "Incompatibilidade no formato retornado pelo modelo de IA.",
        source: "Parser de Resposta do Servidor",
        timestamp: new Date().toISOString()
      });
    }

    const fnLower = (parsedResult.foodName || "").toLowerCase();
    const expLower = (parsedResult.explanation || "").toLowerCase();

    const isUnrecognized = 
      fnLower.includes("nenhum alimento") || 
      fnLower.includes("não foi possível") || 
      fnLower.includes("desconhecido") || 
      fnLower.includes("não identificado") ||
      (parsedResult.carbohydrates === 0 && parsedResult.protein === 0 && parsedResult.fats === 0 && (expLower.includes("nenhum alimento") || expLower.includes("sem alimentos")));

    if (isUnrecognized && base64Image) {
      console.warn(`[ERRO RESPOSTA] 422 - Nenhum alimento identificado na imagem.`);
      if (reservedSlot && targetUid) {
        await rollbackAiSlot(targetUid);
      }
      return res.status(422).json({
        step: "6. Resposta",
        error: "FOTO_NAO_RECONHECIDA",
        statusCode: 422,
        message: "A Inteligência Artificial não conseguiu identificar nenhum alimento visível nesta foto. Por favor, envie uma foto bem iluminada e focada no prato de comida.",
        originalError: "No recognizable food items identified in input image",
        probableCause: "A foto está muito escura, sem foco ou não contém prato/comida visível.",
        source: "Inteligência Artificial (Gemini)",
        details: parsedResult.explanation,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[ETAPA 6: RESPOSTA] [SUCESSO] Alimento identificado: "${parsedResult.foodName}" (${parsedResult.carbohydrates}g carboidratos, ${parsedResult.calories} kcal). Concluído em ${duration}ms.`);

    res.json({
      step: "6. Resposta",
      status: "success",
      ...parsedResult,
      aiUsageCount: limitCheck.currentUsage,
      elapsedTimeMs: duration
    });
  } catch (error: any) {
    const elapsedTime = Date.now() - startTime;
    const errMsg = String(error.message || error);

    let step = "5. Gemini";
    let errorName = "FALHA_GEMINI_API";
    let statusCode = error.status || error.statusCode || 500;
    let probableCause = "Ocorreu uma falha ao comunicar com os servidores do Google Gemini.";
    let source = "Servidor / API Gemini";

    if (errMsg.includes("413") || errMsg.includes("Payload Too Large") || error.type === "entity.too.large") {
      step = "2. API";
      errorName = "PAYLOAD_TOO_LARGE";
      source = "Servidor (Tamanho da Imagem Excede Limite do Vercel/Node)";
      statusCode = 413;
      probableCause = "A imagem enviada excedeu o limite máximo de payload do servidor.";
    } else if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE")) {
      step = "5. Gemini";
      errorName = "GEMINI_SERVICE_UNAVAILABLE";
      source = "API do Gemini (Serviço Temporariamente Indisponível)";
      statusCode = 503;
      probableCause = "Os servidores do Google Gemini estão sob alta demanda temporária. Tente novamente em alguns segundos.";
    } else if (errMsg.includes("429") || errMsg.includes("Quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
      step = "5. Gemini";
      errorName = "GEMINI_RATE_LIMIT";
      source = "API do Gemini (Limite de Quota por Minuto Excedido)";
      statusCode = 429;
      probableCause = "A cota por minuto da chave GEMINI_API_KEY foi atingida no Google Cloud/AI Studio.";
    } else if (errMsg.includes("API key") || errMsg.includes("API_KEY") || errMsg.includes("403") || errMsg.includes("PERMISSION_DENIED")) {
      step = "5. Gemini";
      errorName = "GEMINI_API_KEY_INVALIDA";
      source = "API do Gemini (Chave GEMINI_API_KEY Inválida ou Sem Permissão)";
      statusCode = 403;
      probableCause = "A chave GEMINI_API_KEY configurada no servidor é inválida, foi revogada ou não possui acesso ao modelo gemini-2.5-flash.";
    }

    console.error(`\n[ERRO NA ETAPA ${step}]`);
    console.error(`• NOME DO ERRO: ${errorName}`);
    console.error(`• CÓDIGO HTTP: ${statusCode}`);
    console.error(`• MENSAGEM ORIGINAL: ${errMsg}`);
    console.error(`• CAUSA PROVÁVEL: ${probableCause}`);
    console.error(`• TEMPO: ${elapsedTime}ms\n`);

    if (reservedSlot && targetUid) {
      await rollbackAiSlot(targetUid);
    }

    res.status(statusCode).json({
      step: step,
      error: errorName,
      statusCode: statusCode,
      message: errMsg,
      originalError: errMsg,
      probableCause: probableCause,
      source: source,
      elapsedTimeMs: elapsedTime,
      details: error.stack || String(error),
      timestamp: new Date().toISOString()
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
