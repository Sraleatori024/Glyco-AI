import React, { useState, useRef } from "react";
import { FoodLog, UserProfile, FoodNutrition, IdentifiedFoodItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Apple, 
  Upload, 
  Image as ImageIcon, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  Camera, 
  AlertTriangle, 
  X, 
  Trash2, 
  PlusCircle, 
  Edit3, 
  Info, 
  Utensils, 
  PieChart, 
  Flame, 
  Layers, 
  Activity, 
  Lightbulb,
  Check,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface AlimentacaoViewProps {
  logs: FoodLog[];
  onAddLog: (log: Omit<FoodLog, "id">) => void;
  onDeleteLog?: (id: string) => void;
  profile: UserProfile;
  isPremium: boolean;
  onNavigateToSubscription?: () => void;
}

interface DiagnosticError {
  step: string;
  errorName: string;
  statusCode?: number;
  message: string;
  originalMessage?: string;
  probableCause: string;
  source: string;
  details?: string;
}

export default function AlimentacaoView({ 
  logs, 
  onAddLog, 
  onDeleteLog,
  profile, 
  isPremium, 
  onNavigateToSubscription 
}: AlimentacaoViewProps) {
  // Tabs: 'ai' (photo/description with Gemini) or 'manual' (direct logging without AI quota)
  const [entryMode, setEntryMode] = useState<"ai" | "manual">("ai");

  // AI Mode State
  const [description, setDescription] = useState("");
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodNutrition | null>(null);
  const [showTipsExpanded, setShowTipsExpanded] = useState(false);
  const [showExplanationExpanded, setShowExplanationExpanded] = useState(false);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [analysisError, setAnalysisError] = useState<DiagnosticError | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Manual Mode State
  const [manualName, setManualName] = useState("");
  const [manualMealType, setManualMealType] = useState<"Cafe" | "Almoco" | "Lanche" | "Jantar" | "Ceia">("Almoco");
  const [manualCarbs, setManualCarbs] = useState<number | "">("");
  const [manualCalories, setManualCalories] = useState<number | "">("");
  const [manualProtein, setManualProtein] = useState<number | "">("");
  const [manualFats, setManualFats] = useState<number | "">("");
  const [manualFiber, setManualFiber] = useState<number | "">("");
  const [manualGlycemicIndex, setManualGlycemicIndex] = useState<"baixo" | "medio" | "alto">("medio");
  const [manualNotes, setManualNotes] = useState("");

  // Deletion confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Helper to resize and compress image to keep payload lightweight (< 200KB)
  const resizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(blobUrl);
            reject(new Error("Não foi possível obter o contexto de renderização 2D."));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
          URL.revokeObjectURL(blobUrl);
          
          if (!dataUrl || dataUrl.length < 100) {
            reject(new Error("Falha ao gerar o Data URL da imagem comprimida."));
            return;
          }

          console.log(`[COMPRESSÃO DE FOTO]: Redimensionada de ${img.width}x${img.height} para ${width}x${height}. Tamanho do payload: ${Math.round(dataUrl.length / 1024)} KB`);
          resolve(dataUrl);
        } catch (err) {
          URL.revokeObjectURL(blobUrl);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("Erro ao carregar o arquivo de imagem no elemento HTML."));
      };
      img.src = blobUrl;
    });
  };

  const fallbackCompress = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawUrl = e.target?.result as string;
        if (!rawUrl) {
          reject(new Error("Erro ao ler dados da foto."));
          return;
        }
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 600;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
          } else {
            if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.60));
          } else {
            resolve(rawUrl.substring(0, 1000000));
          }
        };
        img.onerror = () => reject(new Error("Falha no fallback de imagem."));
        img.src = rawUrl;
      };
      reader.onerror = () => reject(new Error("Erro no FileReader."));
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    try {
      setAnalysisError(null);
      const compressedDataUrl = await resizeAndCompressImage(file);
      setBase64Image(compressedDataUrl);
    } catch (err: any) {
      console.warn("[WARN COMPRESSÃO]: Tentando método alternativo de compressão...", err);
      try {
        const fallbackDataUrl = await fallbackCompress(file);
        setBase64Image(fallbackDataUrl);
      } catch (fallbackErr: any) {
        setAnalysisError({
          title: "Erro ao Processar Foto",
          source: "Navegador / Memória do Celular",
          message: "Não foi possível comprimir a foto selecionada. Tente capturar uma foto com resolução menor ou selecionar outro arquivo de imagem.",
          details: String(fallbackErr)
        });
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Run the full-stack Gemini analysis
  const handleAnalyze = async () => {
    const isDevMode = (import.meta as any).env?.DEV || (import.meta as any).env?.VITE_DEVELOPMENT_MODE === "true" || (import.meta as any).env?.VITE_DISABLE_AI_LIMITS === "true";
    const userEmail = (profile?.email || "").toLowerCase().trim();
    const isAdmin = userEmail === "nickinicolas380@gmail.com" || profile?.role === "admin" || profile?.role === "ceo";
    const usedCount = profile?.aiUsageCount || 0;
    const canUseAI = isDevMode || isAdmin || isPremium || usedCount < 2;

    console.log(`\n===========================================================`);
    console.log(`[ETAPA 1: FRONTEND] Iniciando fluxo de análise de refeição...`);
    console.log(`• Usuário: ${userEmail || profile?.uid || 'Anônimo'}`);
    console.log(`• Perfil: ${isAdmin ? 'ADMIN/CEO (Ilimitado)' : isPremium ? 'Premium (Ilimitado)' : `Free (${usedCount}/2 usos)`}`);
    console.log(`• Descrição em texto: "${description || 'Nenhuma'}"`);
    console.log(`• Foto anexada: ${base64Image ? `Sim (${Math.round(base64Image.length / 1024)} KB)` : 'Não'}`);
    console.log(`===========================================================`);

    if (!canUseAI) {
      console.warn(`[ETAPA 4: QUOTA] Usuário bloqueado no frontend: Limite de 2 análises atingido.`);
      setShowPremiumPrompt(true);
      return;
    }

    if (!description.trim() && !base64Image) {
      console.warn(`[ETAPA 1: FRONTEND] Validação falhou: Nenhum dado de entrada fornecido.`);
      setAnalysisError({
        step: "1. Frontend",
        errorName: "DADOS_INSUFICIENTES",
        message: "Por favor, digite o que você comeu ou tire uma foto do prato antes de analisar.",
        originalMessage: "Validation error: description and base64Image are empty.",
        probableCause: "O formulário foi acionado sem foto e sem descrição digitada.",
        source: "Validação da Interface (Frontend)",
      });
      return;
    }

    console.log(`[ALIMENTAÇÃO] INÍCIO`);
    setAnalysisError(null);
    setAnalysisResult(null);
    setIsEditingResult(false);
    setAnalyzing(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout preventivo

    try {
      const payload = JSON.stringify({
        foodDescription: description,
        base64Image: base64Image || undefined,
        profile,
        email: userEmail
      });

      console.log(`[ALIMENTAÇÃO] REQUEST ENVIADA (/api/gemini/analyze-food)`);
      const response = await fetch("/api/gemini/analyze-food", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": userEmail,
          "x-user-uid": profile?.uid || "",
          "x-user-role": profile?.role || ""
        },
        body: payload,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let parsedErrorData: any = null;
        try {
          parsedErrorData = await response.json();
        } catch (_) {
          try {
            const txt = await response.text();
            parsedErrorData = { message: txt, error: "HTTP_ERROR" };
          } catch (_) {}
        }

        const step = parsedErrorData?.step || "2. API";
        const errorName = parsedErrorData?.error || "FALHA_NA_COMUNICACAO";
        const statusCode = response.status;
        const origMsg = parsedErrorData?.message || parsedErrorData?.originalError || "Falha ao processar análise da refeição.";
        const probCause = parsedErrorData?.probableCause || (
          statusCode === 404 
            ? "O endpoint de backend não foi encontrado. Verifique se as rotas /api estão configuradas."
            : statusCode === 500 
            ? "Erro interno no servidor. Verifique a chave GEMINI_API_KEY no painel de ambiente." 
            : "Falha de rede ou instabilidade temporária na API."
        );
        const source = parsedErrorData?.source || "Servidor / API";

        console.error(
          `%c[ERRO NA ANÁLISE DE REFEIÇÃO]\n` +
          `• ETAPA DO ERRO: ${step}\n` +
          `• NOME DO ERRO: ${errorName}\n` +
          `• CÓDIGO HTTP: ${statusCode}\n` +
          `• MENSAGEM ORIGINAL: ${origMsg}\n` +
          `• CAUSA PROVÁVEL: ${probCause}`,
          "color: #ef4444; font-weight: bold; font-size: 13px;"
        );

        if (statusCode === 403 && (errorName === "TRIAL_EXHAUSTED" || parsedErrorData?.code === "TRIAL_EXHAUSTED")) {
          setShowPremiumPrompt(true);
          if (profile) profile.aiUsageCount = parsedErrorData?.aiUsageCount || 2;
        } else {
          setAnalysisError({
            step,
            errorName,
            statusCode,
            message: origMsg,
            originalMessage: origMsg,
            probableCause: probCause,
            source,
            details: parsedErrorData?.details
          });
        }
        return;
      }

      console.log(`[ALIMENTAÇÃO] FRONTEND RECEBEU`);
      const result = await response.json();
      console.log(
        `%c[SUCESSO NA ANÁLISE DE REFEIÇÃO]\n` +
        `• ETAPA: 6. Resposta\n` +
        `• ALIMENTO: ${result.foodName}\n` +
        `• CARBOIDRATOS: ${result.carbohydrates}g | CALORIAS: ${result.calories} kcal\n` +
        `• IMPACTO: ${result.expectedImpact}`,
        "color: #10b981; font-weight: bold; font-size: 13px;"
      );

      setAnalysisResult(result);

      if (typeof result.aiUsageCount === "number" && profile) {
        profile.aiUsageCount = result.aiUsageCount;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      const isAbort = error.name === "AbortError";
      const errMsg = isAbort ? "A requisição excedeu o tempo limite (20s). Tente novamente." : (error.message || String(error));

      console.error(
        `%c[ERRO NA ANÁLISE DE REFEIÇÃO]\n` +
        `• ETAPA DO ERRO: 2. API\n` +
        `• NOME DO ERRO: ${isAbort ? "CLIENT_TIMEOUT" : "CLIENT_NETWORK_EXCEPTION"}\n` +
        `• CÓDIGO HTTP: 0\n` +
        `• MENSAGEM: ${errMsg}`,
        "color: #ef4444; font-weight: bold; font-size: 13px;"
      );

      setAnalysisError({
        step: "2. API",
        errorName: isAbort ? "CLIENT_TIMEOUT" : "CLIENT_NETWORK_EXCEPTION",
        statusCode: 0,
        message: errMsg,
        originalMessage: String(error),
        probableCause: isAbort ? "O servidor demorou mais de 20s para responder." : "Falha na conexão com o servidor.",
        source: "Rede / Conexão do Cliente",
        details: String(error)
      });
    } finally {
      console.log(`[ALIMENTAÇÃO] FINALIZADO`);
      setAnalyzing(false);
    }
  };

  const handleSaveMealFromAI = () => {
    if (!analysisResult) return;

    console.log(`[ETAPA 7: FIRESTORE] Salvando refeição analisada pela IA no diário (Coleção: 'meals')...`);
    onAddLog({
      timestamp: new Date().toISOString(),
      description: description || analysisResult.foodName,
      base64Image: base64Image || undefined,
      nutrition: analysisResult,
      isManual: false,
    });

    console.log(`[ETAPA 7: FIRESTORE] Refeição gravada com sucesso.`);

    // Reset AI Form
    setDescription("");
    setBase64Image(null);
    setAnalysisResult(null);
    setIsEditingResult(false);
  };

  const handleSaveManualMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      alert("Por favor, informe o nome do alimento ou prato.");
      return;
    }

    console.log(`[ETAPA 7: FIRESTORE] Salvando refeição manual no diário (Coleção: 'meals')...`);

    const carbsNum = typeof manualCarbs === "number" ? manualCarbs : 0;
    const calsNum = typeof manualCalories === "number" ? manualCalories : Math.round(carbsNum * 4);
    const protNum = typeof manualProtein === "number" ? manualProtein : 0;
    const fatsNum = typeof manualFats === "number" ? manualFats : 0;
    const fiberNum = typeof manualFiber === "number" ? manualFiber : 0;

    // Calculate approximate Glycemic Load from manual carbs and GI rating
    const giMultiplier = manualGlycemicIndex === "baixo" ? 0.4 : manualGlycemicIndex === "medio" ? 0.6 : 0.85;
    const calculatedGL = Math.round((carbsNum * giMultiplier * 100) / 100);

    const nutritionData: FoodNutrition = {
      foodName: manualName,
      portionSize: "1 porção informada",
      carbohydrates: carbsNum,
      sugar: 0,
      fiber: fiberNum,
      protein: protNum,
      fats: fatsNum,
      calories: calsNum,
      glycemicLoad: calculatedGL,
      glycemicIndexRating: manualGlycemicIndex,
      expectedImpact: calculatedGL < 10 ? "Baixo" : calculatedGL < 20 ? "Moderado" : "Alto",
      explanation: manualNotes || `Registro manual de ${manualName} (${carbsNum}g de carboidratos, ${calsNum} kcal).`,
      identifiedItems: [
        {
          name: manualName,
          portion: "1 porção",
          carbohydrates: carbsNum,
          protein: protNum,
          fats: fatsNum,
          glycemicImpact: manualGlycemicIndex
        }
      ],
      functionalTips: [
        "Acompanhe o impacto glicêmico medindo a glicemia 2 horas após a refeição.",
        "Consumir fibras ou vegetais junto com a refeição atenua a absorção de glicose."
      ],
      consumptionOrder: "1º Vegetais/Fibras -> 2º Proteínas -> 3º Carboidratos"
    };

    onAddLog({
      timestamp: new Date().toISOString(),
      description: manualName,
      nutrition: nutritionData,
      isManual: true,
    });

    console.log(`[ETAPA 7: FIRESTORE] Refeição manual gravada com sucesso.`);

    // Reset manual form
    setManualName("");
    setManualCarbs("");
    setManualCalories("");
    setManualProtein("");
    setManualFats("");
    setManualFiber("");
    setManualNotes("");
  };

  const getGlycemicLoadBadge = (score: number) => {
    if (score < 10) return { label: "Carga Baixa", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (score < 20) return { label: "Carga Média", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Carga Alta", color: "bg-red-50 text-red-700 border-red-200" };
  };

  // Today's summary calculations
  const todayStr = new Date().toDateString();
  const todayLogs = logs.filter((l) => new Date(l.timestamp).toDateString() === todayStr);
  const totalCarbsToday = todayLogs.reduce((acc, l) => acc + (l.nutrition?.carbohydrates || 0), 0);
  const totalCaloriesToday = todayLogs.reduce((acc, l) => acc + (l.nutrition?.calories || 0), 0);
  const totalMealsToday = todayLogs.length;

  return (
    <div id="alimentacao-container" className="space-y-6 pb-16">
      {/* 1. Daily Nutritional Summary Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-neutral-100 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <div>
            <span className="text-xxs font-bold text-neutral-400 uppercase tracking-widest block">Painel Nutricional Diário</span>
            <h2 className="text-lg font-black text-neutral-900 mt-0.5 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Consumo de Hoje ({new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium">Refeições no diário:</span>
            <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-800 rounded-full text-xs font-black">
              {totalMealsToday}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
            <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Carboidratos Totais</span>
            <p className="text-xl font-black text-neutral-900 mt-1">{totalCarbsToday} <span className="text-xs font-semibold text-neutral-500">g</span></p>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
            <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Calorias Ingeridas</span>
            <p className="text-xl font-black text-neutral-900 mt-1">{totalCaloriesToday} <span className="text-xs font-semibold text-neutral-500">kcal</span></p>
          </div>

          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
            <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Meta de Carbos / Refeição</span>
            <p className="text-base font-bold text-neutral-800 mt-1">30g a 50g <span className="text-xxs text-neutral-400 font-normal block">recomendação padrão</span></p>
          </div>

          <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex flex-col justify-center">
            <span className="text-xxs font-bold text-emerald-800 uppercase tracking-wider block">Status Glicêmico</span>
            <span className="text-xs font-extrabold text-emerald-900 mt-0.5">
              {totalCarbsToday < 120 ? "Carga Controlada 🟢" : totalCarbsToday < 180 ? "Moderada 🟡" : "Atenção a Picos 🔴"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Food Registrator Form (Dual Mode: AI vs Manual) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
            {/* Mode Switcher Tabs */}
            <div className="flex bg-neutral-100 p-1 rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => setEntryMode("ai")}
                className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  entryMode === "ai"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Análise com IA
              </button>

              <button
                type="button"
                onClick={() => setEntryMode("manual")}
                className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  entryMode === "manual"
                    ? "bg-white text-emerald-600 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Registro Manual
              </button>
            </div>

            {entryMode === "ai" ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                    <Apple className="w-4 h-4 text-emerald-600" />
                    Análise Fotográfica / IA
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-normal">
                    Tire uma foto ou digite a refeição. O Gemini estimará os carboidratos, carga glicêmica e decomporá os alimentos.
                  </p>
                </div>

                {/* Description textarea */}
                <div>
                  <label htmlFor="food-text-desc" className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                    O que você comeu / vai comer?
                  </label>
                  <textarea
                    id="food-text-desc"
                    rows={3}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all resize-none"
                    placeholder="Ex: Arroz integral, filé de frango grelhado, salada de alface e tomate..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Drag & Drop Photo Uploader */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all flex flex-col justify-center min-h-[150px] ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50"
                      : base64Image
                      ? "border-emerald-400 bg-emerald-50/10"
                      : "border-neutral-200 bg-neutral-50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handleCameraChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />

                  {base64Image ? (
                    <div className="space-y-3 py-2">
                      <div className="relative w-28 h-28 mx-auto rounded-xl overflow-hidden border border-neutral-200 shadow-sm">
                        <img src={base64Image} alt="Refeição" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-700 block">Foto pronta para análise!</span>
                        <p className="text-[10px] text-neutral-400">O Gemini analisará os ingredientes visíveis.</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBase64Image(null);
                        }}
                        className="px-3 py-1 bg-white hover:bg-neutral-100 text-red-500 hover:text-red-600 rounded-lg text-xxs font-extrabold border border-neutral-200 transition-all cursor-pointer"
                      >
                        Remover e Tirar Outra
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Como deseja enviar a foto?</p>
                        <p className="text-xxs text-neutral-400 mt-0.5">Tire uma foto ou carregue da galeria</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="p-3 border border-neutral-200/80 bg-white hover:bg-neutral-50 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Camera className="w-5 h-5 text-blue-600" />
                          <span className="text-[11px] font-bold text-neutral-800">Tirar Foto</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 border border-neutral-200/80 bg-white hover:bg-neutral-50 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <ImageIcon className="w-5 h-5 text-emerald-600" />
                          <span className="text-[11px] font-bold text-neutral-800">Galeria</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-neutral-400">Arraste a foto diretamente aqui se preferir</p>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || (!description.trim() && !base64Image)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processando Nutrientes...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analisar Refeição com IA
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Manual Entry Form (No AI Quota Spent) */
              <form onSubmit={handleSaveManualMeal} className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-emerald-600" />
                    Lançamento Manual Rápido
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-normal">
                    Registre qualquer alimento sem gastar sua cota de IA. Preencha os carboidratos diretamente.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Tipo de Refeição
                  </label>
                  <select
                    value={manualMealType}
                    onChange={(e: any) => setManualMealType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-neutral-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Cafe">Café da Manhã</option>
                    <option value="Almoco">Almoço</option>
                    <option value="Lanche">Lanche da Tarde</option>
                    <option value="Jantar">Jantar</option>
                    <option value="Ceia">Ceia / Noite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Nome do Alimento / Prato *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pão integral com ovos mexidos"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-neutral-50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                      Carboidratos (g) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="Ex: 28"
                      value={manualCarbs}
                      onChange={(e) => setManualCarbs(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-neutral-50 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                      Calorias (kcal)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 220"
                      value={manualCalories}
                      onChange={(e) => setManualCalories(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl bg-neutral-50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xxs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Proteínas (g)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={manualProtein}
                      onChange={(e) => setManualProtein(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-xs focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Gorduras (g)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={manualFats}
                      onChange={(e) => setManualFats(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-xs focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Fibras (g)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={manualFiber}
                      onChange={(e) => setManualFiber(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-xs focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xxs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                    Índice Glicêmico Estimado
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["baixo", "medio", "alto"] as const).map((gi) => (
                      <button
                        key={gi}
                        type="button"
                        onClick={() => setManualGlycemicIndex(gi)}
                        className={`py-1.5 rounded-lg text-xxs font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                          manualGlycemicIndex === gi
                            ? gi === "baixo"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : gi === "medio"
                              ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                              : "bg-red-600 text-white border-red-600 shadow-xs"
                            : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        {gi}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Salvar Refeição no Diário
                </button>
              </form>
            )}
          </div>

          {/* Nutritional advice quick block */}
          <div className="bg-emerald-50/90 p-5 rounded-3xl border border-emerald-100 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Estratégia de Absorção</h4>
              <p className="text-xxs text-emerald-800 mt-1 leading-relaxed">
                Consumir vegetais e proteínas antes de ingerir carboidratos em uma refeição reduz sensivelmente o pico glicêmico subsequente. Tente manter sua carga glicêmica diária controlada.
              </p>
            </div>
          </div>
        </div>

        {/* Right panel: Live results & Recent History */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {/* Active Error Card */}
            {analysisError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-rose-50/90 p-6 rounded-3xl border-2 border-rose-300 shadow-md space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-rose-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-100 rounded-2xl text-rose-600">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-xxs font-extrabold uppercase tracking-wider">
                          {analysisError.step}
                        </span>
                        {analysisError.statusCode !== undefined && analysisError.statusCode > 0 && (
                          <span className="px-2 py-0.5 bg-rose-200/80 text-rose-900 rounded-md text-xxs font-bold">
                            HTTP {analysisError.statusCode}
                          </span>
                        )}
                        <span className="text-xxs font-mono font-bold text-rose-800 bg-white/80 px-2 py-0.5 rounded border border-rose-200">
                          {analysisError.errorName}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-rose-950 mt-1">
                        Diagnóstico da Análise de Refeição
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setAnalysisError(null)}
                    className="text-rose-400 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100/50 transition-all cursor-pointer"
                    title="Fechar mensagem de erro"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Structured Diagnostic Grid */}
                <div className="space-y-3">
                  {/* Mensagem Original */}
                  <div className="bg-white/90 p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs">
                    <span className="text-xxs font-bold text-rose-700 uppercase tracking-wider block mb-1">
                      Mensagem Original do Erro
                    </span>
                    <p className="text-xs text-rose-950 font-medium leading-relaxed font-mono bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                      {analysisError.message}
                    </p>
                  </div>

                  {/* Causa Provável */}
                  <div className="bg-white/90 p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs">
                    <span className="text-xxs font-bold text-amber-700 uppercase tracking-wider block mb-1">
                      Causa Provável
                    </span>
                    <p className="text-xs text-neutral-800 font-medium leading-relaxed">
                      {analysisError.probableCause}
                    </p>
                  </div>

                  {/* Origem e Detalhes Técnicos */}
                  <div className="flex flex-wrap items-center gap-2 text-xxs text-rose-700 pt-1">
                    <span className="font-bold uppercase">Origem:</span>
                    <span className="bg-white px-2 py-1 rounded-md border border-rose-200 font-semibold text-rose-900">
                      {analysisError.source}
                    </span>
                    {analysisError.details && (
                      <details className="w-full mt-1 bg-white/60 p-2.5 rounded-xl border border-rose-200/60 text-xxs text-neutral-600 font-mono">
                        <summary className="font-bold text-rose-800 cursor-pointer">Ver Detalhes Técnicos / Stack</summary>
                        <pre className="mt-2 whitespace-pre-wrap overflow-x-auto text-xxs p-2 bg-neutral-900 text-neutral-200 rounded-lg">
                          {analysisError.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2 border-t border-rose-200/60">
                  <button
                    onClick={() => {
                      setAnalysisError(null);
                      handleAnalyze();
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tentar Novamente
                  </button>
                  <button
                    onClick={() => {
                      setAnalysisError(null);
                      setBase64Image(null);
                    }}
                    className="px-4 py-2 bg-white hover:bg-rose-100/60 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Remover Foto e Selecionar Outra
                  </button>
                </div>
              </motion.div>
            ) : analysisResult ? (
              /* Analysis Result Card with Inline Editing */
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white p-6 rounded-3xl border-2 border-blue-500 shadow-md space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-neutral-100 pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xxs font-bold text-blue-600 uppercase tracking-widest block">Análise Nutricional Concluída</span>
                      <button
                        type="button"
                        onClick={() => setIsEditingResult(!isEditingResult)}
                        className="text-xxs text-neutral-500 hover:text-blue-600 font-bold flex items-center gap-1 bg-neutral-100 hover:bg-blue-50 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        {isEditingResult ? "Finalizar Edição" : "Ajustar Valores"}
                      </button>
                    </div>

                    {isEditingResult ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={analysisResult.foodName}
                          onChange={(e) => setAnalysisResult({ ...analysisResult, foodName: e.target.value })}
                          className="text-lg font-bold text-neutral-900 border border-neutral-300 rounded-lg px-2.5 py-1 w-full"
                        />
                        <input
                          type="text"
                          value={analysisResult.portionSize}
                          onChange={(e) => setAnalysisResult({ ...analysisResult, portionSize: e.target.value })}
                          placeholder="Porção estimada"
                          className="text-xs text-neutral-600 border border-neutral-300 rounded-lg px-2.5 py-1 w-full"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold text-neutral-900 mt-1">{analysisResult.foodName}</h3>
                        <span className="text-xs text-neutral-500 font-medium mt-0.5 block">Porção: {analysisResult.portionSize}</span>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setAnalysisResult(null)}
                      className="px-3 py-1.5 border border-neutral-200 text-xs font-semibold rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={handleSaveMealFromAI}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Salvar no Diário
                    </button>
                  </div>
                </div>

                {/* Nutritional values Label Grid (Editable when isEditingResult is true) */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/80 relative">
                  <div className="absolute right-4 top-4">
                    <Flame className="w-5 h-5 text-amber-500" />
                  </div>
                  <h4 className="text-xs font-extrabold text-neutral-800 uppercase tracking-widest border-b border-neutral-300 pb-2 mb-4">
                    Valores Nutricionais {isEditingResult && <span className="text-blue-600">(Modo Edição)</span>}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                    <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                      <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Calorias</span>
                      {isEditingResult ? (
                        <input
                          type="number"
                          value={analysisResult.calories}
                          onChange={(e) => setAnalysisResult({ ...analysisResult, calories: Number(e.target.value) })}
                          className="w-16 px-1.5 py-0.5 border rounded text-xs font-bold"
                        />
                      ) : (
                        <p className="text-base font-black text-neutral-900">{analysisResult.calories} <span className="text-xxs font-normal">kcal</span></p>
                      )}
                    </div>

                    <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                      <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Carboidratos</span>
                      {isEditingResult ? (
                        <input
                          type="number"
                          value={analysisResult.carbohydrates}
                          onChange={(e) => setAnalysisResult({ ...analysisResult, carbohydrates: Number(e.target.value) })}
                          className="w-16 px-1.5 py-0.5 border rounded text-xs font-bold text-blue-600"
                        />
                      ) : (
                        <p className="text-base font-black text-blue-600">{analysisResult.carbohydrates} <span className="text-xxs font-normal">g</span></p>
                      )}
                    </div>

                    <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                      <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Açúcar</span>
                      {isEditingResult ? (
                        <input
                          type="number"
                          value={analysisResult.sugar}
                          onChange={(e) => setAnalysisResult({ ...analysisResult, sugar: Number(e.target.value) })}
                          className="w-16 px-1.5 py-0.5 border rounded text-xs font-bold"
                        />
                      ) : (
                        <p className="text-base font-black text-neutral-900">{analysisResult.sugar} <span className="text-xxs font-normal">g</span></p>
                      )}
                    </div>

                    <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                      <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Fibras</span>
                      {isEditingResult ? (
                        <input
                          type="number"
                          value={analysisResult.fiber}
                          onChange={(e) => setAnalysisResult({ ...analysisResult, fiber: Number(e.target.value) })}
                          className="w-16 px-1.5 py-0.5 border rounded text-xs font-bold"
                        />
                      ) : (
                        <p className="text-base font-black text-neutral-900">{analysisResult.fiber} <span className="text-xxs font-normal">g</span></p>
                      )}
                    </div>

                    <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                      <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Proteínas</span>
                      {isEditingResult ? (
                        <input
                          type="number"
                          value={analysisResult.protein}
                          onChange={(e) => setAnalysisResult({ ...analysisResult, protein: Number(e.target.value) })}
                          className="w-16 px-1.5 py-0.5 border rounded text-xs font-bold"
                        />
                      ) : (
                        <p className="text-base font-black text-neutral-900">{analysisResult.protein} <span className="text-xxs font-normal">g</span></p>
                      )}
                    </div>

                    <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                      <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Gorduras</span>
                      {isEditingResult ? (
                        <input
                          type="number"
                          value={analysisResult.fats}
                          onChange={(e) => setAnalysisResult({ ...analysisResult, fats: Number(e.target.value) })}
                          className="w-16 px-1.5 py-0.5 border rounded text-xs font-bold"
                        />
                      ) : (
                        <p className="text-base font-black text-neutral-900">{analysisResult.fats || 0} <span className="text-xxs font-normal">g</span></p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Decomposed Identified Food Items */}
                {analysisResult.identifiedItems && analysisResult.identifiedItems.length > 0 && (
                  <div className="bg-neutral-50/80 p-4 rounded-2xl border border-neutral-200">
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Alimentos Identificados no Prato
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {analysisResult.identifiedItems.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-neutral-200/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-neutral-900 block">{item.name}</span>
                            <span className="text-xxs text-neutral-400 font-medium">{item.portion}</span>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-xxs">
                              {item.carbohydrates}g carb
                            </span>
                            <span className={`text-xxs font-bold px-2 py-0.5 rounded-md ${
                              item.glycemicImpact === "baixo" ? "bg-emerald-50 text-emerald-700" :
                              item.glycemicImpact === "medio" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                            }`}>
                              {item.glycemicImpact}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Glycemic Load & Impact Meter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-neutral-100 bg-neutral-50">
                    <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Carga Glicêmica Estimada</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-neutral-900">{analysisResult.glycemicLoad}</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xxs font-bold uppercase tracking-wider border ${getGlycemicLoadBadge(analysisResult.glycemicLoad).color}`}>
                        {getGlycemicLoadBadge(analysisResult.glycemicLoad).label}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          analysisResult.glycemicLoad < 10 ? "bg-emerald-500" : analysisResult.glycemicLoad < 20 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min((analysisResult.glycemicLoad / 30) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-neutral-100 bg-neutral-50 flex flex-col justify-between">
                    <div>
                      <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Impacto Glicêmico Estimado</span>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-xl text-xs font-extrabold border ${
                        analysisResult.expectedImpact === "Baixo" || analysisResult.expectedImpact === "Moderado"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}>
                        Impacto {analysisResult.expectedImpact}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Consumption Order & Functional Tips */}
                {analysisResult.consumptionOrder && (
                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-emerald-600" />
                      Ordem Recomendada de Ingestão:
                    </h4>
                    <p className="text-xs font-semibold text-emerald-800">
                      {analysisResult.consumptionOrder}
                    </p>
                  </div>
                )}

                {analysisResult.functionalTips && analysisResult.functionalTips.length > 0 && (
                  <div className="bg-amber-50/70 rounded-2xl border border-amber-100 overflow-hidden transition-all">
                    <button
                      type="button"
                      id="toggle-functional-tips-btn"
                      onClick={() => setShowTipsExpanded(!showTipsExpanded)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-amber-100/40 transition-colors"
                      aria-expanded={showTipsExpanded}
                    >
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        Dicas Funcionais & Substituições
                      </h4>
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 shrink-0 select-none">
                        {showTipsExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Ver mais
                          </>
                        )}
                      </span>
                    </button>
                    {showTipsExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-amber-100/80">
                        <ul className="text-xs text-amber-900 space-y-1.5 pl-4 list-disc leading-relaxed">
                          {analysisResult.functionalTips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanations */}
                {analysisResult.explanation && (
                  <div className="bg-blue-50/50 rounded-2xl border border-blue-100 overflow-hidden transition-all">
                    <button
                      type="button"
                      id="toggle-expert-evaluation-btn"
                      onClick={() => setShowExplanationExpanded(!showExplanationExpanded)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-blue-100/40 transition-colors"
                      aria-expanded={showExplanationExpanded}
                    >
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        Avaliação do Especialista Virtual
                      </h4>
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 shrink-0 select-none">
                        {showExplanationExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Ver mais
                          </>
                        )}
                      </span>
                    </button>
                    {showExplanationExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-blue-100/80">
                        <p className="text-xs text-blue-900 leading-relaxed">
                          {analysisResult.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Meal History Table / Journal List */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-neutral-900">Histórico de Refeições</h3>
              <span className="text-xs text-neutral-400 font-semibold">{logs.length} registro(s)</span>
            </div>

            {logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log) => {
                  const date = new Date(log.timestamp);
                  const showDate = date.toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

                  return (
                    <div key={log.id} className="p-4 rounded-2xl border border-neutral-100 bg-neutral-50 hover:bg-neutral-100/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {log.base64Image ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-neutral-200 shrink-0">
                            <img src={log.base64Image} alt="Refeição" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                            <Apple className="w-6 h-6 text-emerald-600" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-neutral-900">{log.description}</h4>
                            {log.isManual ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded-md">Manual</span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> IA
                              </span>
                            )}
                          </div>
                          <span className="text-xxs text-neutral-400 font-semibold block mt-0.5">{showDate}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                        {log.nutrition ? (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xxs text-neutral-400 font-bold uppercase tracking-wider block">Carbos</span>
                              <span className="text-xs font-extrabold text-neutral-900">{log.nutrition.carbohydrates}g</span>
                            </div>
                            <div className="h-6 w-px bg-neutral-200" />
                            <div className="text-right">
                              <span className="text-xxs text-neutral-400 font-bold uppercase tracking-wider block">Calorias</span>
                              <span className="text-xs font-extrabold text-neutral-900">{log.nutrition.calories || 0}</span>
                            </div>
                            <div className="h-6 w-px bg-neutral-200" />
                            <div className="text-right">
                              <span className="text-xxs text-neutral-400 font-bold uppercase tracking-wider block">Carga</span>
                              <span className="text-xs font-extrabold text-blue-600">{log.nutrition.glycemicLoad}</span>
                            </div>
                            <div className="h-6 w-px bg-neutral-200" />
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xxs font-bold uppercase tracking-wider border ${
                              log.nutrition.glycemicIndexRating === "baixo"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : log.nutrition.glycemicIndexRating === "medio"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}>
                              IG {log.nutrition.glycemicIndexRating}
                            </span>
                          </div>
                        ) : null}

                        {/* Delete Button */}
                        {onDeleteLog && (
                          <div className="pl-2 border-l border-neutral-200">
                            {deletingId === log.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteLog(log.id);
                                    setDeletingId(null);
                                  }}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xxs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingId(null)}
                                  className="px-1.5 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xxs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingId(log.id)}
                                title="Excluir refeição"
                                className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400 text-xs">
                Sua lista de refeições está vazia. Comece analisando uma foto ou registrando manualmente acima.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Prompt Dialog Overlay */}
      {showPremiumPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 text-white rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500 to-blue-500" />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight">Análise Inteligente de Refeições</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                A leitura nutricional avançada de pratos por fotos ou texto é um recurso exclusivo para assinantes **Premium**. Receba contagem exata de carboidratos, carga glicêmica calculada e dicas personalizadas.
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 text-left text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Reconhecimento fotográfico instantâneo de pratos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Impacto glicêmico estimado com base no seu perfil</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Sugestões funcionais e ordem de ingestão de alimentos</span>
              </div>
            </div>

            <div className="flex gap-2 justify-stretch pt-2">
              <button
                onClick={() => setShowPremiumPrompt(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  setShowPremiumPrompt(false);
                  if (onNavigateToSubscription) onNavigateToSubscription();
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Assinar Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
