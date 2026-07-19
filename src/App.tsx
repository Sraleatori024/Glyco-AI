import { useState, useEffect } from "react";
import {
  UserProfile,
  GlucoseLog,
  FoodLog,
  MedicationLog,
  ExerciseLog,
  Message,
  INITIAL_PROFILE,
  INITIAL_GLUCOSE_LOGS,
  INITIAL_FOOD_LOGS,
  INITIAL_MEDICATION_LOGS,
  INITIAL_EXERCISE_LOGS,
  INITIAL_CHAT_MESSAGES
} from "./types";
import OnboardingView from "./components/OnboardingView";
import DashboardView from "./components/DashboardView";
import GlicemiaView from "./components/GlicemiaView";
import AlimentacaoView from "./components/AlimentacaoView";
import MedicamentosView from "./components/MedicamentosView";
import ExerciciosView from "./components/ExerciciosView";
import ChatView from "./components/ChatView";
import RelatoriosView from "./components/RelatoriosView";
import ConfiguracoesView from "./components/ConfiguracoesView";

import {
  Activity,
  Heart,
  Apple,
  Pill,
  Dumbbell,
  Brain,
  Printer,
  Settings,
  Menu,
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  User,
  Moon,
  Sun
} from "lucide-react";

export default function App() {
  // Application State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [glucoseLogs, setGlucoseLogs] = useState<GlucoseLog[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  
  const [currentView, setCurrentView] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize and load from LocalStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("glyco_profile");
    const savedGlucose = localStorage.getItem("glyco_glucose");
    const savedFood = localStorage.getItem("glyco_food");
    const savedMeds = localStorage.getItem("glyco_meds");
    const savedExercises = localStorage.getItem("glyco_exercises");
    const savedChat = localStorage.getItem("glyco_chat");

    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    // Load existing database logs or pre-fill with beautiful default mock values
    setGlucoseLogs(savedGlucose ? JSON.parse(savedGlucose) : INITIAL_GLUCOSE_LOGS);
    setFoodLogs(savedFood ? JSON.parse(savedFood) : INITIAL_FOOD_LOGS);
    setMedicationLogs(savedMeds ? JSON.parse(savedMeds) : INITIAL_MEDICATION_LOGS);
    setExerciseLogs(savedExercises ? JSON.parse(savedExercises) : INITIAL_EXERCISE_LOGS);
    setChatMessages(savedChat ? JSON.parse(savedChat) : INITIAL_CHAT_MESSAGES);
  }, []);

  // Sync state helpers
  const saveProfile = (p: UserProfile | null) => {
    setProfile(p);
    if (p) {
      localStorage.setItem("glyco_profile", JSON.stringify(p));
    } else {
      localStorage.removeItem("glyco_profile");
    }
  };

  const saveGlucose = (logs: GlucoseLog[]) => {
    setGlucoseLogs(logs);
    localStorage.setItem("glyco_glucose", JSON.stringify(logs));
  };

  const saveFood = (logs: FoodLog[]) => {
    setFoodLogs(logs);
    localStorage.setItem("glyco_food", JSON.stringify(logs));
  };

  const saveMeds = (logs: MedicationLog[]) => {
    setMedicationLogs(logs);
    localStorage.setItem("glyco_meds", JSON.stringify(logs));
  };

  const saveExercises = (logs: ExerciseLog[]) => {
    setExerciseLogs(logs);
    localStorage.setItem("glyco_exercises", JSON.stringify(logs));
  };

  const saveChat = (messages: Message[]) => {
    setChatMessages(messages);
    localStorage.setItem("glyco_chat", JSON.stringify(messages));
  };

  // State Mutators
  const handleAddGlucoseLog = (newLog: Omit<GlucoseLog, "id">) => {
    const log: GlucoseLog = {
      ...newLog,
      id: Math.random().toString(36).substr(2, 9),
    };
    saveGlucose([...glucoseLogs, log]);
  };

  const handleDeleteGlucoseLog = (id: string) => {
    saveGlucose(glucoseLogs.filter((l) => l.id !== id));
  };

  const handleAddFoodLog = (newLog: Omit<FoodLog, "id">) => {
    const log: FoodLog = {
      ...newLog,
      id: Math.random().toString(36).substr(2, 9),
    };
    saveFood([...foodLogs, log]);
  };

  const handleAddMedicationLog = (newMed: Omit<MedicationLog, "id" | "status">) => {
    const med: MedicationLog = {
      ...newMed,
      id: Math.random().toString(36).substr(2, 9),
      status: "pendente",
    };
    saveMeds([...medicationLogs, med]);
  };

  const handleToggleMedicationStatus = (id: string) => {
    saveMeds(
      medicationLogs.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === "aplicado" ? "pendente" : "aplicado";
          return {
            ...m,
            status: nextStatus as any,
            timestamp: nextStatus === "aplicado" ? new Date().toISOString() : undefined,
          };
        }
        return m;
      })
    );
  };

  const handleDeleteMedicationLog = (id: string) => {
    saveMeds(medicationLogs.filter((m) => m.id !== id));
  };

  const handleAddExerciseLog = (newEx: Omit<ExerciseLog, "id">) => {
    const ex: ExerciseLog = {
      ...newEx,
      id: Math.random().toString(36).substr(2, 9),
    };
    saveExercises([...exerciseLogs, ex]);
  };

  const handleDeleteExerciseLog = (id: string) => {
    saveExercises(exerciseLogs.filter((e) => e.id !== id));
  };

  const handleSendMessage = (text: string) => {
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };
    saveChat([...chatMessages, msg]);
  };

  const handleReceiveAssistantMessage = (text: string) => {
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: "assistant",
      text,
      timestamp: new Date().toISOString(),
    };
    saveChat([...chatMessages, msg]);
  };

  const handleResetData = () => {
    localStorage.clear();
    setProfile(null);
    setGlucoseLogs(INITIAL_GLUCOSE_LOGS);
    setFoodLogs(INITIAL_FOOD_LOGS);
    setMedicationLogs(INITIAL_MEDICATION_LOGS);
    setExerciseLogs(INITIAL_EXERCISE_LOGS);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setCurrentView("dashboard");
  };

  // Determine current stats for grounding chat/AI
  const latestGlucose = glucoseLogs.length > 0 ? glucoseLogs[glucoseLogs.length - 1] : null;
  const averageGlucose = Math.round(
    glucoseLogs.length > 0
      ? glucoseLogs.reduce((acc, log) => acc + log.value, 0) / glucoseLogs.length
      : 120
  );

  const calculateTimeInRange = () => {
    if (glucoseLogs.length === 0) return 100;
    if (!profile) return 75;
    const inRangeLogs = glucoseLogs.filter((log) => {
      const isJejum = log.type === "jejum" || log.type === "antes_dormir";
      const min = profile.targetGlucoseMinJejum || 70;
      const max = isJejum
        ? (profile.targetGlucoseMaxJejum || 130)
        : (profile.targetGlucoseMaxPosPrandial || 180);
      return log.value >= min && log.value <= max;
    });
    return Math.round((inRangeLogs.length / glucoseLogs.length) * 100);
  };

  const currentStats = {
    averageGlucose,
    timeInRange: calculateTimeInRange(),
  };

  // Onboarding Interception
  if (!profile) {
    return (
      <OnboardingView
        onComplete={(newProfile) => {
          saveProfile(newProfile);
          setCurrentView("dashboard");
        }}
      />
    );
  }

  // Sidebar navigation configuration
  const navigationItems = [
    { id: "dashboard", label: "Painel Principal", icon: Activity },
    { id: "glicemia", label: "Controle Glicêmico", icon: Heart },
    { id: "alimentacao", label: "Alimentação Inteligente", icon: Apple },
    { id: "medicamentos", label: "Medicamentos & Insulina", icon: Pill },
    { id: "exercicios", label: "Atividades Físicas", icon: Dumbbell },
    { id: "chat", label: "Copiloto IA", icon: Brain },
    { id: "relatorios", label: "Relatório Clínico", icon: Printer },
    { id: "configuracoes", label: "Ajustes & Metas", icon: Settings },
  ];

  return (
    <div id="app-root" className={`min-h-screen font-sans flex flex-col md:flex-row ${darkMode ? "dark bg-neutral-950 text-neutral-100" : "bg-neutral-50/50 text-neutral-800"}`}>
      
      {/* 1. Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col w-64 shrink-0 border-r ${darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-150"} print:hidden`}>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-inherit gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200 dark:shadow-none">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Glyco <span className="text-blue-600">AI</span></span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-neutral-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User context info block */}
        <div className="p-4 border-t border-inherit">
          <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">{profile.name}</p>
              <p className="text-xxs text-neutral-400 capitalize truncate">Diabetes {profile.diabetesType.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Header */}
      <header className={`md:hidden flex items-center justify-between px-6 h-16 border-b ${darkMode ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-150"} print:hidden`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight">Glyco <span className="text-blue-600">AI</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* 3. Mobile Navigation Menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white/95 dark:bg-neutral-950/95 pt-16 flex flex-col print:hidden animate-fade-in">
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* 4. Main Panel */}
      <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Active clinical indicator alerts header (e.g. low values) */}
          {latestGlucose && latestGlucose.value < (profile.targetGlucoseMinJejum || 70) && (
            <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-2xl flex items-start gap-3 animate-pulse shadow-sm print:hidden">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">ALERTA CRÍTICO: Glicemia Baixa ({latestGlucose.value} mg/dL)</p>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                  Recomendamos a ingestão imediata de 15g de carboidratos rápidos (ex: 150ml de refrigerante normal ou suco de frutas) e verificar os níveis novamente em 15 minutos. Evite esforços.
                </p>
              </div>
            </div>
          )}

          {/* Active dynamic views routers */}
          {currentView === "dashboard" && (
            <DashboardView
              profile={profile}
              glucoseLogs={glucoseLogs}
              foodLogs={foodLogs}
              medicationLogs={medicationLogs}
              exerciseLogs={exerciseLogs}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {currentView === "glicemia" && (
            <GlicemiaView
              logs={glucoseLogs}
              onAddLog={handleAddGlucoseLog}
              onDeleteLog={handleDeleteGlucoseLog}
              targetMin={profile.targetGlucoseMinJejum}
              targetMaxJejum={profile.targetGlucoseMaxJejum}
              targetMaxPos={profile.targetGlucoseMaxPosPrandial}
            />
          )}

          {currentView === "alimentacao" && (
            <AlimentacaoView
              logs={foodLogs}
              onAddLog={handleAddFoodLog}
              profile={profile}
            />
          )}

          {currentView === "medicamentos" && (
            <MedicamentosView
              logs={medicationLogs}
              onAddLog={handleAddMedicationLog}
              onToggleStatus={handleToggleMedicationStatus}
              onDeleteLog={handleDeleteMedicationLog}
            />
          )}

          {currentView === "exercicios" && (
            <ExerciciosView
              logs={exerciseLogs}
              onAddLog={handleAddExerciseLog}
              onDeleteLog={handleDeleteExerciseLog}
            />
          )}

          {currentView === "chat" && (
            <ChatView
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onReceiveAssistantMessage={handleReceiveAssistantMessage}
              profile={profile}
              currentStats={currentStats}
            />
          )}

          {currentView === "relatorios" && (
            <RelatoriosView
              profile={profile}
              glucoseLogs={glucoseLogs}
              foodLogs={foodLogs}
              medicationLogs={medicationLogs}
              exerciseLogs={exerciseLogs}
            />
          )}

          {currentView === "configuracoes" && (
            <ConfiguracoesView
              profile={profile}
              onUpdateProfile={saveProfile}
              onResetData={handleResetData}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
            />
          )}

        </div>
      </main>
    </div>
  );
}
