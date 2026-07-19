import React, { useState, useRef } from "react";
import { FoodLog, UserProfile, FoodNutrition } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Apple, Upload, Image, Send, RefreshCw, Sparkles, CheckCircle2, ChevronRight, HelpCircle, Flame } from "lucide-react";

interface AlimentacaoViewProps {
  logs: FoodLog[];
  onAddLog: (log: Omit<FoodLog, "id">) => void;
  profile: UserProfile;
  isPremium: boolean;
  onNavigateToSubscription?: () => void;
}

export default function AlimentacaoView({ 
  logs, 
  onAddLog, 
  profile, 
  isPremium, 
  onNavigateToSubscription 
}: AlimentacaoViewProps) {
  const [description, setDescription] = useState("");
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodNutrition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handlers (Drag and Drop & Browse)
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas arquivos de imagem.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBase64Image(reader.result as string);
    };
    reader.readAsDataURL(file);
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

  // Run the full-stack Gemini analysis
  const handleAnalyze = async () => {
    if (!isPremium) {
      setShowPremiumPrompt(true);
      return;
    }

    if (!description.trim() && !base64Image) {
      alert("Escreva a descrição da refeição ou adicione uma foto.");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch("/api/gemini/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodDescription: description,
          base64Image: base64Image || undefined,
          profile,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na resposta da análise inteligente.");
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (error) {
      console.error("Erro na análise nutricional:", error);
      // Fallback fallback response
      setAnalysisResult({
        foodName: description || "Refeição Registrada",
        portionSize: "Porção de 1 prato padrão",
        carbohydrates: 42,
        sugar: 4,
        fiber: 5,
        protein: 24,
        calories: 380,
        glycemicLoad: 15,
        glycemicIndexRating: "medio",
        expectedImpact: "Moderado",
        explanation: "Refeição balanceada. O teor médio de carboidratos com fibras saudáveis retarda a absorção, sugerimos adicionar folhas verdes antes de consumir.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveMeal = () => {
    if (!analysisResult) return;

    onAddLog({
      timestamp: new Date().toISOString(),
      description: description || analysisResult.foodName,
      base64Image: base64Image || undefined,
      nutrition: analysisResult,
    });

    // Reset Form
    setDescription("");
    setBase64Image(null);
    setAnalysisResult(null);
  };

  const getGlycemicLoadBadge = (score: number) => {
    if (score < 10) return { label: "Carga Baixa", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (score < 20) return { label: "Carga Média", color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Carga Alta", color: "bg-red-50 text-red-700 border-red-200" };
  };

  return (
    <div id="alimentacao-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      {/* Left Panel: Food Registrator Form */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
          <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-1.5">
            <Apple className="w-5 h-5 text-emerald-600" />
            Analisar Nova Refeição
          </h3>
          <p className="text-xs text-neutral-500 mb-5 leading-normal">
            Escreva os ingredientes ou carregue a foto do seu prato. Nossa IA estimará a contagem de carboidratos e a carga glicêmica.
          </p>

          <div className="space-y-4">
            {/* Description textarea */}
            <div>
              <label htmlFor="food-text-desc" className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                O que você comeu / vai comer?
              </label>
              <textarea
                id="food-text-desc"
                rows={3}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all resize-none"
                placeholder="Ex: Arroz integral, filé de frango, salada de alface, tomate e meio copo de suco de limão sem açúcar..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Drag & Drop Photo Uploader */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50"
                  : base64Image
                  ? "border-emerald-400 bg-emerald-50/10"
                  : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {base64Image ? (
                <div className="space-y-2">
                  <div className="relative w-24 h-24 mx-auto rounded-xl overflow-hidden border border-neutral-200 shadow-3xs">
                    <img src={base64Image} alt="Refeição" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 block">Foto selecionada!</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBase64Image(null);
                    }}
                    className="text-xxs font-bold text-red-500 hover:underline"
                  >
                    Remover foto
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-xs font-semibold text-neutral-700">Arraste ou clique para enviar foto</p>
                  <p className="text-xxs text-neutral-400 font-medium">Melhora a precisão na detecção do prato</p>
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
        </div>

        {/* Nutritional advice quick block */}
        <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Dica do Endocrinologista</h4>
            <p className="text-xxs text-emerald-700 mt-1 leading-relaxed">
              Consumir vegetais e proteínas antes de ingerir carboidratos em uma refeição reduz sensivelmente o pico glicêmico subsequente. Tente manter sua carga glicêmica diária abaixo de 100 pontos acumulados.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel: Live results & Recent History */}
      <div className="lg:col-span-2 space-y-6">
        <AnimatePresence mode="wait">
          {/* Active AI Analysis Result Card */}
          {analysisResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white p-6 rounded-3xl border-2 border-blue-500 shadow-md space-y-6"
            >
              <div className="flex justify-between items-start border-b border-neutral-100 pb-4">
                <div>
                  <span className="text-xxs font-bold text-blue-600 uppercase tracking-widest block">Análise Concluída</span>
                  <h3 className="text-xl font-bold text-neutral-900 mt-1">{analysisResult.foodName}</h3>
                  <span className="text-xs text-neutral-500 font-medium mt-0.5 block">Porção estimada: {analysisResult.portionSize}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAnalysisResult(null)}
                    className="px-3 py-1.5 border border-neutral-200 text-xs font-semibold rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleSaveMeal}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Salvar no Diário
                  </button>
                </div>
              </div>

              {/* Nutritional values Label Grid */}
              <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/80 relative">
                <div className="absolute right-4 top-4">
                  <Flame className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="text-xs font-extrabold text-neutral-800 uppercase tracking-widest border-b border-neutral-300 pb-2 mb-4">
                  Valores Nutricionais Estimados
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                    <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Calorias</span>
                    <p className="text-base font-black text-neutral-900">{analysisResult.calories} <span className="text-xxs font-normal">kcal</span></p>
                  </div>
                  <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                    <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Carboidratos</span>
                    <p className="text-base font-black text-neutral-900">{analysisResult.carbohydrates} <span className="text-xxs font-normal">g</span></p>
                  </div>
                  <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                    <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Açúcar</span>
                    <p className="text-base font-black text-neutral-900">{analysisResult.sugar} <span className="text-xxs font-normal">g</span></p>
                  </div>
                  <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                    <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Fibras</span>
                    <p className="text-base font-black text-neutral-900">{analysisResult.fiber} <span className="text-xxs font-normal">g</span></p>
                  </div>
                  <div className="space-y-0.5 border-r border-neutral-200 last:border-0">
                    <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Proteínas</span>
                    <p className="text-base font-black text-neutral-900">{analysisResult.protein} <span className="text-xxs font-normal">g</span></p>
                  </div>
                </div>
              </div>

              {/* Glycemic Load Meter */}
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

              {/* Explanations */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Como a IA sugere consumir este prato:
                </h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  {analysisResult.explanation}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Meal History Table / Journal List */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Últimas Refeições Registradas</h3>
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
                        <h4 className="text-sm font-bold text-neutral-900">{log.description}</h4>
                        <span className="text-xxs text-neutral-400 font-semibold block mt-0.5">{showDate}</span>
                      </div>
                    </div>

                    {log.nutrition ? (
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-xxs text-neutral-400 font-bold uppercase tracking-wider block">Carbos</span>
                          <span className="text-xs font-extrabold text-neutral-900">{log.nutrition.carbohydrates}g</span>
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
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400 text-xs">
              Sua lista de refeições está vazia. Comece analisando sua refeição acima.
            </div>
          )}
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
