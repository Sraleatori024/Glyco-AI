import React, { useState, useEffect } from "react";
import { ExerciseLog, ExerciseType, UserProfile } from "../types";
import { SMART_EXERCISES, SmartExercise } from "../data/exercises";
import {
  Plus,
  Trash2,
  Award,
  Clock,
  Flame,
  Zap,
  Dumbbell,
  Search,
  Heart,
  BookOpen,
  CheckCircle,
  Sparkles,
  Filter,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Layers,
  HeartCrack,
  Check
} from "lucide-react";

interface ExerciciosViewProps {
  logs: ExerciseLog[];
  onAddLog: (log: Omit<ExerciseLog, "id">) => void;
  onDeleteLog: (id: string) => void;
  profile: UserProfile;
  selectedExerciseId?: string | null;
  onClearSelectedExercise?: () => void;
}

interface DailyPlanExercise {
  exerciseId?: string;
  name: string;
  duration: string;
  intensity: string;
  order: number;
}

interface DailyExercisePlan {
  title: string;
  description: string;
  recommendedExercises: DailyPlanExercise[];
  restTimeBetween: string;
  suggestedIntensityText: string;
  glycemicPrecautions: string;
  medicalDisclaimer: string;
}

export default function ExerciciosView({
  logs,
  onAddLog,
  onDeleteLog,
  profile,
  selectedExerciseId,
  onClearSelectedExercise
}: ExerciciosViewProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"library" | "plan" | "history">("library");

  // Search and Filters for the Library
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Todos");
  const [selectedIntensity, setSelectedIntensity] = useState<string>("Todos");

  // Detailed view of an exercise
  const [activeExercise, setActiveExercise] = useState<SmartExercise | null>(null);
  const [visualTab, setVisualTab] = useState<"gif" | "video" | "steps">("gif");
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Video mockup playing state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(35);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("glyco_exercise_favorites");
    return saved ? JSON.parse(saved) : [];
  });

  // Daily AI Plan state
  const [dailyPlan, setDailyPlan] = useState<DailyExercisePlan | null>(() => {
    const saved = localStorage.getItem("glyco_exercise_daily_plan");
    return saved ? JSON.parse(saved) : null;
  });
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Standard logging form state
  const [manualType, setManualType] = useState<ExerciseType>("caminhada");
  const [manualDuration, setManualDuration] = useState(30);
  const [manualIntensity, setManualIntensity] = useState<ExerciseLog["intensity"]>("moderada");

  // Handle outside selected exercise trigger
  useEffect(() => {
    if (selectedExerciseId) {
      const exercise = SMART_EXERCISES.find((e) => e.id === selectedExerciseId);
      if (exercise) {
        setActiveExercise(exercise);
        setActiveTab("library");
        setVisualTab("gif");
        setActiveStepIndex(0);
      }
      onClearSelectedExercise?.();
    }
  }, [selectedExerciseId, onClearSelectedExercise]);

  // Sync favorites
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("glyco_exercise_favorites", JSON.stringify(updated));
  };

  // Generate sensitivity text
  const getSensitivityImpact = (actType: ExerciseType | string, duration: number, intent: string) => {
    const typeLower = actType.toLowerCase();
    if (typeLower.includes("caminhada") || typeLower === "caminhada") {
      return `Ativa os canais GLUT4 musculares de forma independente de insulina, aumentando a captação de glicose circulante por cerca de 12-16 horas. Excelente para reduzir o pico pós-prandial.`;
    } else if (typeLower.includes("corrida") || typeLower === "corrida") {
      return `Otimiza os estoques de glicogênio muscular. Acelera o metabolismo e melhora a sensibilidade à insulina celular por até 24-36 horas após a atividade de intensidade ${intent}.`;
    } else if (typeLower.includes("agachamento") || typeLower.includes("força") || typeLower.includes("musculação") || typeLower === "musculacao") {
      return `O aumento da força e massa muscular magra cria um reservatório maior para armazenamento de glicose, melhorando a sensibilidade à insulina a longo prazo de forma duradoura.`;
    } else if (typeLower.includes("pedalar") || typeLower.includes("bicicleta") || typeLower === "pedalar") {
      return `Atividade aeróbica cíclica excelente para a saúde cardiovascular de diabéticos, promovendo o consumo imediato de glicose e reduzindo a resistência por até 24 horas.`;
    } else if (typeLower.includes("alongamento") || typeLower.includes("stretch")) {
      return `Melhora a amplitude articular e reduz hormônios do estresse como o cortisol, que por si só promovem a liberação hepática de glicose (hiperglicemia reativa).`;
    } else {
      return `Praticar exercícios melhora a circulação periférica, auxilia no controle de peso e otimiza a sensibilidade celular à ação de hormônios reguladores de glicose.`;
    }
  };

  // Log exercise completion directly from catalog
  const handleLogExerciseCompletion = (ex: SmartExercise) => {
    const duration = ex.timeSuggested.includes("30") ? 30 : ex.timeSuggested.includes("15") ? 15 : 20;
    const typeMapping: ExerciseType = ex.gifPlaceholderType === "walk"
      ? "caminhada"
      : ex.gifPlaceholderType === "run"
      ? "corrida"
      : ex.gifPlaceholderType === "bike"
      ? "pedalar"
      : ex.gifPlaceholderType === "strength"
      ? "musculacao"
      : "outros";

    onAddLog({
      timestamp: new Date().toISOString(),
      type: typeMapping,
      durationMinutes: duration,
      intensity: ex.intensity,
      insulinSensitivityImpact: getSensitivityImpact(ex.name, duration, ex.intensity),
    });

    alert(`Sucesso! O exercício "${ex.name}" foi registrado no seu histórico clínico de hoje.`);
  };

  // Submit manual log form
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualDuration <= 0) return;

    onAddLog({
      timestamp: new Date().toISOString(),
      type: manualType,
      durationMinutes: manualDuration,
      intensity: manualIntensity,
      insulinSensitivityImpact: getSensitivityImpact(manualType, manualDuration, manualIntensity),
    });

    setManualDuration(30);
    alert("Exercício manual registrado com sucesso!");
  };

  // Generate Daily AI Exercise Plan
  const generateAIDailyPlan = async () => {
    setLoadingPlan(true);
    setPlanError(null);

    try {
      const response = await fetch("/api/gemini/exercise-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          currentStats: {
            averageGlucose: logs.length > 0 ? 135 : 142,
            timeInRange: 74,
          },
          recentGlucoseLogs: []
        })
      });

      if (!response.ok) {
        throw new Error("Erro na resposta do servidor.");
      }

      const data = await response.json();
      setDailyPlan(data);
      localStorage.setItem("glyco_exercise_daily_plan", JSON.stringify(data));
    } catch (err: any) {
      console.error("Erro ao gerar plano:", err);
      // Fallback local heuristic clinically personalized plan
      const isSenior = profile.age >= 60;
      const fallbackPlan: DailyExercisePlan = {
        title: isSenior ? "Plano Ativo Melhor Idade" : "Plano do Dia Equilíbrio Ativo",
        description: `Olá ${profile.name}! Preparamos um plano focado na redução rápida da resistência à insulina. Por você ter ${profile.age} anos e Diabetes ${profile.diabetesType === "tipo1" ? "Tipo 1" : "Tipo 2"}, priorizamos exercícios de baixo impacto que poupam as articulações e proporcionam estímulos progressivos para os transportadores de glicose musculares.`,
        recommendedExercises: [
          {
            exerciseId: "mobilidade_quadril",
            name: "Mobilidade Dinâmica de Quadril e Tornozelo",
            duration: "8 minutos",
            intensity: "leve",
            order: 1
          },
          {
            exerciseId: isSenior ? "agachamento_casa" : "forca_elastico",
            name: isSenior ? "Agachamento Livre com Cadeira" : "Remada Sentada com Faixa Elástica",
            duration: "12 minutos",
            intensity: "moderada",
            order: 2
          },
          {
            exerciseId: "caminhada_moderada",
            name: "Caminhada Rítmica de Intervalo",
            duration: "20 minutos",
            intensity: "moderada",
            order: 3
          }
        ],
        restTimeBetween: "1 a 2 minutos entre séries e transições de aparelhos.",
        suggestedIntensityText: "Siga uma intensidade moderada, em que você se sinta levemente ofegante, mas ainda consiga formular frases curtas de conversa.",
        glycemicPrecautions: "Meça sua glicemia antes de começar. Se estiver menor que 100 mg/dL, consuma um pequeno carboidrato de absorção lenta (como uma fatia de pão ou frutas com fibras). Não treine se estiver acima de 250 mg/dL.",
        medicalDisclaimer: "Lembrete: Esta é uma sugestão de atividade física de apoio educacional elaborada por inteligência artificial. Consulte sempre seu médico ou profissional de educação física para um acompanhamento seguro."
      };
      setDailyPlan(fallbackPlan);
      localStorage.setItem("glyco_exercise_daily_plan", JSON.stringify(fallbackPlan));
    } finally {
      setLoadingPlan(false);
    }
  };

  // Generate initial fallback plan if none exists
  useEffect(() => {
    if (!dailyPlan) {
      // Create instant fallback on first load to make dashboard full
      const isSenior = profile.age >= 60;
      const defaultPlan: DailyExercisePlan = {
        title: isSenior ? "Plano Ativo Melhor Idade" : "Plano do Dia Equilíbrio Ativo",
        description: `Olá ${profile.name}! Preparamos um plano de atividades focado na redução rápida da resistência à insulina. Por você ter ${profile.age} anos e Diabetes ${profile.diabetesType === "tipo1" ? "Tipo 1" : "Tipo 2"}, priorizamos exercícios de baixo impacto que poupam as articulações e proporcionam estímulos progressivos para os transportadores de glicose musculares.`,
        recommendedExercises: [
          {
            exerciseId: "mobilidade_quadril",
            name: "Mobilidade Dinâmica de Quadril e Tornozelo",
            duration: "8 minutos",
            intensity: "leve",
            order: 1
          },
          {
            exerciseId: isSenior ? "agachamento_casa" : "forca_elastico",
            name: isSenior ? "Agachamento Livre com Cadeira" : "Remada Sentada com Faixa Elástica",
            duration: "12 minutos",
            intensity: "moderada",
            order: 2
          },
          {
            exerciseId: "caminhada_moderada",
            name: "Caminhada Rítmica de Intervalo",
            duration: "20 minutos",
            intensity: "moderada",
            order: 3
          }
        ],
        restTimeBetween: "1 a 2 minutos entre séries e transições.",
        suggestedIntensityText: "Siga uma intensidade moderada, em que você se sinta levemente ofegante, mas ainda consiga formular frases de conversa.",
        glycemicPrecautions: "Meça sua glicemia antes de começar. Se estiver menor que 100 mg/dL, consuma um pequeno carboidrato de absorção lenta. Não treine se estiver acima de 250 mg/dL.",
        medicalDisclaimer: "Lembrete: Esta é uma sugestão de atividade física de apoio educacional elaborada por inteligência artificial. Consulte sempre seu médico ou profissional de educação física para um acompanhamento seguro."
      };
      setDailyPlan(defaultPlan);
      localStorage.setItem("glyco_exercise_daily_plan", JSON.stringify(defaultPlan));
    }
  }, [profile]);

  // Categories list
  const CATEGORIES = [
    "Todos",
    "Caminhada",
    "Corrida",
    "Bicicleta",
    "Alongamentos",
    "Mobilidade",
    "Exercícios de força",
    "Exercícios para iniciantes",
    "Exercícios para idosos",
    "Exercícios para fazer em casa",
    "Exercícios com elástico",
    "Exercícios sem equipamentos"
  ];

  // Filtered exercises list
  const filteredExercises = SMART_EXERCISES.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ex.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ex.objective.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "Todos" || ex.categories.includes(selectedCategory);
    const matchesDifficulty = selectedDifficulty === "Todos" || ex.difficulty === selectedDifficulty;
    const matchesIntensity = selectedIntensity === "Todos" || ex.intensity === selectedIntensity;

    return matchesSearch && matchesCategory && matchesDifficulty && matchesIntensity;
  });

  // Render HTML CSS keyframe visual simulations of walkers, riders, stretchers, etc.
  const renderVisualSimulation = (type: string) => {
    switch (type) {
      case "walk":
        return (
          <div className="relative w-full h-48 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center overflow-hidden border border-neutral-800">
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20" />
            
            {/* Walker SVG Animation */}
            <div className="relative z-10 flex flex-col items-center">
              <svg className="w-24 h-24 text-blue-500 animate-[bounce_1.5s_infinite]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                {/* Body head */}
                <circle cx="50" cy="20" r="6" className="fill-blue-500/10" />
                {/* Torso */}
                <line x1="50" y1="26" x2="50" y2="55" />
                {/* Left arm waving */}
                <line x1="50" y1="32" x2="35" y2="45" className="origin-[50px_32px] animate-[spin_3s_linear_infinite]" style={{ transformBox: "fill-box", transformOrigin: "top center" }} />
                {/* Right arm waving */}
                <line x1="50" y1="32" x2="65" y2="45" />
                {/* Left leg moving */}
                <line x1="50" y1="55" x2="38" y2="78" />
                {/* Right leg moving */}
                <line x1="50" y1="55" x2="62" y2="78" />
                {/* Ground */}
                <line x1="15" y1="85" x2="85" y2="85" strokeWidth="2" strokeDasharray="5 5" className="text-neutral-600" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-blue-500 mt-2 uppercase animate-pulse">Simulação de Caminhada Ativa</span>
            </div>
          </div>
        );
      case "run":
        return (
          <div className="relative w-full h-48 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center overflow-hidden border border-neutral-800">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20" />
            
            <div className="relative z-10 flex flex-col items-center">
              <svg className="w-24 h-24 text-red-500 animate-[bounce_0.8s_infinite]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="55" cy="18" r="6" className="fill-red-500/10" />
                {/* Angled torso for running */}
                <line x1="55" y1="24" x2="45" y2="50" />
                {/* Running arms */}
                <line x1="50" y1="30" x2="35" y2="25" />
                <line x1="50" y1="30" x2="65" y2="42" />
                {/* Fast running legs */}
                <line x1="45" y1="50" x2="28" y2="70" />
                <line x1="45" y1="50" x2="55" y2="74" />
                <line x1="15" y1="80" x2="85" y2="80" strokeWidth="2" strokeDasharray="3 3" className="text-neutral-500" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-red-500 mt-2 uppercase animate-pulse">Ritmo Cardiorrespiratório Acelerado</span>
            </div>
          </div>
        );
      case "strength":
        return (
          <div className="relative w-full h-48 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center overflow-hidden border border-neutral-800">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20" />
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Lifting Weight SVG with translation animation */}
              <div className="animate-[pulse_1.2s_infinite] flex flex-col items-center">
                <svg className="w-24 h-24 text-emerald-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="50" cy="20" r="6" className="fill-emerald-500/10" />
                  {/* Spine doing squat */}
                  <line x1="50" y1="26" x2="50" y2="45" />
                  {/* Bended legs */}
                  <line x1="50" y1="45" x2="35" y2="58" />
                  <line x1="35" y1="58" x2="40" y2="75" />
                  <line x1="50" y1="45" x2="65" y2="58" />
                  <line x1="65" y1="58" x2="60" y2="75" />
                  {/* Holding barbell overhead */}
                  <line x1="20" y1="25" x2="80" y2="25" strokeWidth="6" stroke="currentColor" />
                  <rect x="15" y="18" width="5" height="14" rx="1" fill="currentColor" />
                  <rect x="80" y="18" width="5" height="14" rx="1" fill="currentColor" />
                </svg>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 mt-2 uppercase animate-pulse">Ativação de Receptores GLUT4</span>
            </div>
          </div>
        );
      case "stretch":
        return (
          <div className="relative w-full h-48 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center overflow-hidden border border-neutral-800">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20" />
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Mindful Breathing Circles representing deep muscle stretching */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute w-16 h-16 rounded-full border border-teal-500/40 bg-teal-500/5 animate-[ping_3s_infinite]" />
                <div className="absolute w-12 h-12 rounded-full border-2 border-teal-400 bg-teal-400/10 animate-[pulse_2s_infinite]" />
                <svg className="w-8 h-8 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-teal-400 mt-2 uppercase animate-pulse">Redução de Hormônios do Estresse</span>
            </div>
          </div>
        );
      case "bike":
        return (
          <div className="relative w-full h-48 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center overflow-hidden border border-neutral-800">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20" />
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Rotating wheels bike mockup */}
              <div className="flex gap-4 items-end">
                <div className="w-10 h-10 rounded-full border-4 border-dashed border-sky-400 animate-[spin_4s_linear_infinite]" />
                <svg className="w-16 h-10 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                  <path d="M12 5l4 7-4 7" />
                </svg>
                <div className="w-10 h-10 rounded-full border-4 border-dashed border-sky-400 animate-[spin_4s_linear_infinite]" />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-sky-400 mt-2 uppercase animate-pulse">Ciclismo Aeróbico Estabilizador</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="relative w-full h-48 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center overflow-hidden border border-neutral-800">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20" />
            
            <div className="relative z-10 flex flex-col items-center">
              <svg className="w-16 h-16 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="30 30" />
              </svg>
              <span className="text-[10px] font-bold tracking-widest text-indigo-400 mt-2 uppercase">Gasto Energético Otimizado</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div id="exercicios-view-root" className="space-y-6 pb-12">
      {/* Upper Tab Navigation Selector */}
      <div className="bg-white p-2 rounded-2xl border border-neutral-100 shadow-2xs flex gap-1 max-w-md">
        <button
          onClick={() => {
            setActiveTab("library");
            setActiveExercise(null);
          }}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "library"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          Biblioteca
        </button>
        <button
          onClick={() => setActiveTab("plan")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === "plan"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Plano do Dia
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "history"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          Registrar & Histórico
        </button>
      </div>

      {/* RENDER TAB 1: BIBLIOTECA DE EXERCÍCIOS */}
      {activeTab === "library" && (
        <div id="exercise-library-tab" className="space-y-6 animate-fade-in">
          {/* Detailed Exercise Overlay Panel */}
          {activeExercise ? (
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* Back button and left column (Visual player) */}
              <div className="lg:col-span-5 p-6 bg-neutral-50 border-r border-neutral-100 flex flex-col justify-between space-y-6">
                <div>
                  <button
                    onClick={() => setActiveExercise(null)}
                    className="mb-4 inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 font-bold cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar para a Biblioteca
                  </button>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xxs font-black text-blue-600 uppercase tracking-widest">
                        {activeExercise.categories.slice(0, 2).join(" • ")}
                      </span>
                      <h2 className="text-xl font-black text-neutral-900 mt-1 leading-tight">
                        {activeExercise.name}
                      </h2>
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(activeExercise.id, e)}
                      className="p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-400 hover:text-red-500 hover:border-red-200 transition-all shadow-xxs cursor-pointer"
                      title={favorites.includes(activeExercise.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(activeExercise.id) ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                  </div>

                  {/* Player Media Tabs (GIF, Video, Steps) */}
                  <div className="flex gap-1.5 bg-neutral-200/60 p-1 rounded-xl mb-4 text-neutral-600">
                    <button
                      onClick={() => setVisualTab("gif")}
                      className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        visualTab === "gif" ? "bg-white text-neutral-900 shadow-xxs" : "hover:text-neutral-900"
                      }`}
                    >
                      Animação GIF
                    </button>
                    <button
                      onClick={() => setVisualTab("video")}
                      className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        visualTab === "video" ? "bg-white text-neutral-900 shadow-xxs" : "hover:text-neutral-900"
                      }`}
                    >
                      Vídeo MP4
                    </button>
                    <button
                      onClick={() => setVisualTab("steps")}
                      className={`flex-1 py-1.5 text-center text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                        visualTab === "steps" ? "bg-white text-neutral-900 shadow-xxs" : "hover:text-neutral-900"
                      }`}
                    >
                      Passo a Passo
                    </button>
                  </div>

                  {/* Player Frame View */}
                  <div className="min-h-52">
                    {visualTab === "gif" && (
                      <div className="space-y-3">
                        {renderVisualSimulation(activeExercise.gifPlaceholderType)}
                        <p className="text-[10px] text-neutral-400 text-center italic font-semibold leading-relaxed">
                          Demonstração interativa local em looping infinito. Ideal para referências de postura.
                        </p>
                      </div>
                    )}

                    {visualTab === "video" && (
                      <div className="relative w-full h-48 bg-neutral-950 rounded-2xl flex flex-col justify-between p-4 overflow-hidden border border-neutral-800">
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <button
                            onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer transform hover:scale-105 active:scale-95"
                          >
                            {isVideoPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-1" />}
                          </button>
                        </div>

                        {/* Top indicators */}
                        <div className="flex justify-between items-center z-10 text-white text-[9px] font-bold bg-neutral-900/60 px-2 py-1 rounded-md self-start">
                          <span>Demonstração de Treino • 1080p</span>
                        </div>

                        {/* Bottom controls mockup */}
                        <div className="w-full z-10 space-y-1 bg-gradient-to-t from-black/80 p-2 rounded-xl">
                          <div className="w-full bg-neutral-700 h-1.5 rounded-full overflow-hidden cursor-pointer">
                            <div className="bg-blue-500 h-full" style={{ width: `${isVideoPlaying ? videoProgress : 0}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] text-neutral-300 font-bold">
                            <span>{isVideoPlaying ? "0:12" : "0:00"}</span>
                            <span>{activeExercise.timeSuggested}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {visualTab === "steps" && (
                      <div className="bg-white p-4 rounded-2xl border border-neutral-150 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                            Etapa {activeStepIndex + 1} de {activeExercise.steps.length}
                          </span>
                          <div className="flex gap-1">
                            <button
                              disabled={activeStepIndex === 0}
                              onClick={() => setActiveStepIndex(activeStepIndex - 1)}
                              className="p-1 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-35 cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={activeStepIndex === activeExercise.steps.length - 1}
                              onClick={() => setActiveStepIndex(activeStepIndex + 1)}
                              className="p-1 border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-35 cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="min-h-16 flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                            {activeStepIndex + 1}
                          </span>
                          <p className="text-xs text-neutral-700 font-medium leading-relaxed">
                            {activeExercise.steps[activeStepIndex]}
                          </p>
                        </div>

                        {/* Staggered progress pills */}
                        <div className="flex gap-1 justify-center pt-2">
                          {activeExercise.steps.map((_, i) => (
                            <div
                              key={i}
                              onClick={() => setActiveStepIndex(i)}
                              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                i === activeStepIndex ? "w-6 bg-blue-600" : "w-1.5 bg-neutral-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Log button */}
                <button
                  onClick={() => handleLogExerciseCompletion(activeExercise)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Registrar Realização Deste Exercício
                </button>
              </div>

              {/* Right column (Text descriptions) */}
              <div className="lg:col-span-7 p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1.5">Descrição Geral</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed font-medium">{activeExercise.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                  <div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Nível de Dificuldade</span>
                    <p className="text-xs font-bold text-neutral-800 capitalize mt-0.5">{activeExercise.difficulty === "iniciante" ? "Iniciante" : activeExercise.difficulty === "intermediario" ? "Intermediário" : "Avançado"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Intensidade Cardíaca</span>
                    <p className="text-xs font-bold text-neutral-800 capitalize mt-0.5">{activeExercise.intensity}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Tempo Recomendado</span>
                    <p className="text-xs font-bold text-neutral-800 mt-0.5">{activeExercise.timeSuggested}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Séries e Repetições</span>
                    <p className="text-xs font-bold text-neutral-800 mt-0.5">{activeExercise.setsReps || "Contínuo (Aeróbico)"}</p>
                  </div>
                </div>

                {/* Glycemic Benefits (Crucial for Diabetes) */}
                <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl space-y-2">
                  <span className="text-xxs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    Benefícios Clínicos para Diabéticos
                  </span>
                  <p className="text-xs text-emerald-900 leading-relaxed font-semibold">
                    {activeExercise.benefitsForDiabetes}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Muscles and objectives */}
                  <div>
                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1.5">Objetivo Clínico</h3>
                    <p className="text-xs text-neutral-700 font-bold">{activeExercise.objective}</p>
                    
                    <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mt-4 mb-1.5">Músculos Ativados</h3>
                    <div className="flex flex-wrap gap-1">
                      {activeExercise.musclesWorked.map((m, idx) => (
                        <span key={idx} className="bg-neutral-100 px-2.5 py-1 rounded-lg text-[10px] font-bold text-neutral-600">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contraindications */}
                  <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl space-y-1">
                    <span className="text-xxs font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Contraindicações e Cuidados
                    </span>
                    <p className="text-xxs text-amber-900 leading-relaxed font-medium">
                      {activeExercise.contraindications}
                    </p>
                  </div>
                </div>

                {/* Practical Execution Tips */}
                <div>
                  <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Dicas Para Execução Correta</h3>
                  <ul className="space-y-1.5">
                    {activeExercise.correctExecutionTips.map((tip, idx) => (
                      <li key={idx} className="flex gap-2 text-xs text-neutral-600 font-medium">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            // Search filters and cards grid view
            <div className="space-y-6">
              {/* Filter and search action bar */}
              <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar exercícios (ex: agachamento, caminhada, flexibilidade)..."
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Secondary filter selectors */}
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200">
                      <Filter className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="text-[10px] font-black text-neutral-500 uppercase">Filtros</span>
                    </div>

                    <select
                      className="px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xxs font-bold text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                    >
                      <option value="Todos">Dificuldade (Todos)</option>
                      <option value="iniciante">Iniciante</option>
                      <option value="intermediario">Intermediário</option>
                      <option value="avancado">Avançado</option>
                    </select>

                    <select
                      className="px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xxs font-bold text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      value={selectedIntensity}
                      onChange={(e) => setSelectedIntensity(e.target.value)}
                    >
                      <option value="Todos">Intensidade (Todas)</option>
                      <option value="leve">Leve</option>
                      <option value="moderada">Moderada</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>

                {/* Horizontal Scrollable Categories Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Categorias</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 text-xxs font-extrabold rounded-xl border transition-all cursor-pointer shrink-0 ${
                          selectedCategory === cat
                            ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                            : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid of Exercises */}
              {filteredExercises.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExercises.map((ex) => {
                    const isFav = favorites.includes(ex.id);
                    return (
                      <div
                        key={ex.id}
                        onClick={() => {
                          setActiveExercise(ex);
                          setVisualTab("gif");
                          setActiveStepIndex(0);
                        }}
                        className="bg-white rounded-3xl border border-neutral-100 hover:border-blue-200 shadow-3xs hover:shadow-xs transition-all duration-300 p-5 flex flex-col justify-between space-y-4 group cursor-pointer animate-fade-in relative overflow-hidden"
                      >
                        {/* Favorite Heart Trigger */}
                        <button
                          onClick={(e) => toggleFavorite(ex.id, e)}
                          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-neutral-50/85 text-neutral-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all cursor-pointer"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                        </button>

                        <div className="space-y-2">
                          <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider block">
                            {ex.categories[0]}
                          </span>
                          <h4 className="text-sm font-black text-neutral-900 group-hover:text-blue-600 transition-colors leading-tight">
                            {ex.name}
                          </h4>
                          <p className="text-[11px] text-neutral-500 leading-normal font-medium line-clamp-2">
                            {ex.description}
                          </p>
                        </div>

                        {/* Parameter details badge strip */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-100 text-[10px] font-bold text-neutral-600">
                            <Clock className="w-3 h-3 text-neutral-400" />
                            {ex.timeSuggested}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            ex.intensity === "leve"
                              ? "bg-emerald-50 text-emerald-700"
                              : ex.intensity === "moderada"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-orange-50 text-orange-700"
                          }`}>
                            <Flame className="w-3 h-3" />
                            Intensidade {ex.intensity}
                          </span>
                        </div>

                        {/* Card bottom arrow action */}
                        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-neutral-400 group-hover:text-blue-600 transition-colors">
                          <span className="text-xxs uppercase tracking-wider">Ver demonstração</span>
                          <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-neutral-100 p-16 text-center text-neutral-400 text-xs">
                  <HeartCrack className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                  Nenhum exercício encontrado com os filtros selecionados.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RENDER TAB 2: PLANO DE EXERCÍCIOS DO DIA */}
      {activeTab === "plan" && (
        <div id="ai-exercise-plan-tab" className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xxs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Inteligência Artificial Ativa
                </span>
                <h3 className="text-lg font-black text-neutral-900 mt-1">Plano Clínico Personalizado do Dia</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Sugestões de exercícios otimizadas para o seu metabolismo e metas diárias.</p>
              </div>

              <button
                onClick={generateAIDailyPlan}
                disabled={loadingPlan}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {loadingPlan ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Gerando seu Plano...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Gerar Novo Plano com IA
                  </>
                )}
              </button>
            </div>

            {loadingPlan ? (
              // Sleek loading shimmer state
              <div className="space-y-4 py-8 animate-pulse">
                <div className="h-4 bg-neutral-200 rounded-md w-1/4" />
                <div className="h-3 bg-neutral-100 rounded-md w-3/4" />
                <div className="space-y-2 pt-4">
                  <div className="h-16 bg-neutral-50 rounded-2xl border border-neutral-100" />
                  <div className="h-16 bg-neutral-50 rounded-2xl border border-neutral-100" />
                  <div className="h-16 bg-neutral-50 rounded-2xl border border-neutral-100" />
                </div>
              </div>
            ) : dailyPlan ? (
              <div className="space-y-6">
                {/* Plan Intro card */}
                <div className="bg-blue-50/30 border border-blue-100 p-5 rounded-2xl space-y-2">
                  <h4 className="text-sm font-black text-neutral-900">{dailyPlan.title}</h4>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    {dailyPlan.description}
                  </p>
                </div>

                {/* Sequential Plan Exercises */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Ordem de Execução Recomendada</h4>
                  <div className="space-y-3">
                    {dailyPlan.recommendedExercises.map((pEx, idx) => {
                      const associatedExercise = pEx.exerciseId ? SMART_EXERCISES.find(e => e.id === pEx.exerciseId) : null;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (associatedExercise) {
                              setActiveExercise(associatedExercise);
                              setActiveTab("library");
                              setVisualTab("gif");
                              setActiveStepIndex(0);
                            }
                          }}
                          className={`p-4 rounded-2xl border border-neutral-150 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-all duration-200 ${
                            associatedExercise ? "hover:bg-blue-50/30 hover:border-blue-200 cursor-pointer" : ""
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                              {pEx.order}
                            </span>
                            <div className="text-left">
                              <h5 className="text-xs font-black text-neutral-900 group-hover:text-blue-600 transition-colors">
                                {pEx.name}
                              </h5>
                              <div className="flex items-center gap-2.5 text-[10px] text-neutral-400 font-bold mt-1">
                                <span>Duração sugerida: {pEx.duration}</span>
                                <span>•</span>
                                <span className="capitalize">Intensidade: {pEx.intensity}</span>
                              </div>
                            </div>
                          </div>

                          {associatedExercise && (
                            <span className="text-[10px] text-blue-600 font-extrabold flex items-center gap-1 self-end sm:self-center">
                              Ver demonstração
                              <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grid details: rest, intensity, blood glucose safety */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-150 space-y-1">
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Tempo de Descanso</span>
                    <p className="text-xs text-neutral-700 leading-normal font-semibold">
                      {dailyPlan.restTimeBetween}
                    </p>
                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block pt-3">Percepção de Esforço</span>
                    <p className="text-xs text-neutral-700 leading-normal font-medium">
                      {dailyPlan.suggestedIntensityText}
                    </p>
                  </div>

                  {/* Glycemic safeguards alert */}
                  <div className="bg-amber-50/70 border border-amber-150 p-4 rounded-2xl space-y-1.5">
                    <span className="text-xxs font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Precauções Glicêmicas Importantes
                    </span>
                    <p className="text-xxs text-amber-900 leading-relaxed font-semibold">
                      {dailyPlan.glycemicPrecautions}
                    </p>
                  </div>
                </div>

                {/* Plan medical disclaimer */}
                <p className="text-[10px] text-neutral-400 leading-relaxed italic text-center font-semibold border-t border-neutral-100 pt-3">
                  {dailyPlan.medicalDisclaimer}
                </p>
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400 text-xs">
                Nenhum plano gerado ainda. Clique no botão acima para montar seu Plano com IA.
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER TAB 3: REGISTRAR MANUALMENTE & HISTÓRICO */}
      {activeTab === "history" && (
        <div id="exercise-history-tab" className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Left Panel: Register physical workout manually */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
              <h3 className="text-lg font-black text-neutral-900 mb-4 flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-blue-600" />
                Adicionar Atividade Física
              </h3>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-2 uppercase tracking-wider">
                    Tipo de Exercício
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "caminhada", label: "Caminhada" },
                      { id: "corrida", label: "Corrida" },
                      { id: "musculacao", label: "Musculação" },
                      { id: "pedalar", label: "Pedalar" },
                      { id: "natacao", label: "Nataçao" },
                      { id: "outros", label: "Outros" },
                    ].map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setManualType(act.id as any)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                          manualType === act.id
                            ? "bg-blue-50 border-blue-600 text-blue-950 ring-1 ring-blue-500"
                            : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="manual-duration-input" className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                      Duração (min)
                    </label>
                    <input
                      id="manual-duration-input"
                      type="number"
                      min="5"
                      max="300"
                      value={manualDuration}
                      onChange={(e) => setManualDuration(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="manual-intensity-select" className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                      Intensidade
                    </label>
                    <select
                      id="manual-intensity-select"
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                      value={manualIntensity}
                      onChange={(e) => setManualIntensity(e.target.value as any)}
                    >
                      <option value="leve">Leve</option>
                      <option value="moderada">Moderada</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>

                {/* Live Impact Preview */}
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-1">
                  <span className="text-xxs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Impacto Estimado na Insulina
                  </span>
                  <p className="text-xxs text-blue-800 leading-relaxed font-semibold">
                    {getSensitivityImpact(manualType, manualDuration, manualIntensity)}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Registrar Exercício
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Completed Workouts and Logs List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
              <h3 className="text-lg font-black text-neutral-900">Histórico de Exercícios Realizados</h3>
              <p className="text-xs text-neutral-500 mb-6 font-medium">Visualizar seu desempenho acumulado apoia o controle lipídico e o monitoramento da hemoglobina glicada.</p>

              {logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.map((ex) => {
                    const date = new Date(ex.timestamp);
                    const displayDate = date.toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <div
                        key={ex.id}
                        className="p-5 rounded-2xl border border-neutral-150 bg-neutral-50 hover:bg-neutral-100/40 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 group animate-fade-in"
                      >
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Dumbbell className="w-5 h-5" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-neutral-900 capitalize">{ex.type}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xxs font-black uppercase tracking-wider border ${
                                ex.intensity === "leve"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : ex.intensity === "moderada"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              }`}>
                                {ex.intensity}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xxs text-neutral-400 font-bold">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {ex.durationMinutes} minutos
                              </span>
                              <span>•</span>
                              <span>{displayDate}</span>
                            </div>
                            <p className="text-xxs text-neutral-500 leading-relaxed font-semibold max-w-xl">
                              <strong>Sensibilidade à insulina:</strong> {ex.insulinSensitivityImpact}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => onDeleteLog(ex.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 self-end sm:self-start opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Excluir atividade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-neutral-400 text-xs">
                  Sua lista de atividades está vazia. Registre a primeira no menu lateral ou complete uma atividade do catálogo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
