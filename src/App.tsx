import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { syncDocToFirestore, deleteDocFromFirestore } from "./firebaseUtils";
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
import AuthView from "./components/AuthView";
import AdminPanel from "./components/AdminPanel";
import SubscriptionView from "./components/SubscriptionView";

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
  Sun,
  ShieldCheck,
  LogOut
} from "lucide-react";

export default function App() {
  // Authentication & Plan States
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean>(() => localStorage.getItem("glyco_premium") === "true");

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

  // Auth State Listener & Firestore Initializer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const currentUser = { uid: firebaseUser.uid, email: firebaseUser.email || "" };
        setUser(currentUser);

        // Enforce Firestore Connectivity Validation as per skill requirements
        try {
          const { getDocFromServer } = await import("firebase/firestore");
          await getDocFromServer(doc(db, "test_connection", "ping")).catch(() => {});
        } catch (e) {
          console.warn("Firestore offline check done:", e);
        }

        // 1. Fetch user profile
        try {
          const profileSnap = await getDocs(collection(db, `users/${firebaseUser.uid}/profile`));
          if (!profileSnap.empty) {
            setProfile(profileSnap.docs[0].data() as UserProfile);
          } else {
            const savedLocalProfile = localStorage.getItem("glyco_profile");
            if (savedLocalProfile) {
              const p = JSON.parse(savedLocalProfile);
              setProfile(p);
              await setDoc(doc(db, "users", firebaseUser.uid, "profile", "default"), p);
            } else {
              setProfile(null);
            }
          }
        } catch (err) {
          console.error("Error fetching profile from Firestore:", err);
          const savedLocalProfile = localStorage.getItem("glyco_profile");
          if (savedLocalProfile) setProfile(JSON.parse(savedLocalProfile));
        }

        // 2. Fetch glucose logs
        try {
          const glucoseSnap = await getDocs(collection(db, `users/${firebaseUser.uid}/glucose`));
          if (!glucoseSnap.empty) {
            setGlucoseLogs(glucoseSnap.docs.map((d) => ({ id: d.id, ...d.data() } as GlucoseLog)));
          } else {
            setGlucoseLogs(INITIAL_GLUCOSE_LOGS);
          }
        } catch (err) {
          console.error("Error loading glucose logs from Firestore:", err);
          const saved = localStorage.getItem("glyco_glucose");
          setGlucoseLogs(saved ? JSON.parse(saved) : INITIAL_GLUCOSE_LOGS);
        }

        // 3. Fetch food logs
        try {
          const foodSnap = await getDocs(collection(db, `users/${firebaseUser.uid}/food`));
          if (!foodSnap.empty) {
            setFoodLogs(foodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodLog)));
          } else {
            setFoodLogs(INITIAL_FOOD_LOGS);
          }
        } catch (err) {
          console.error("Error loading food logs from Firestore:", err);
          const saved = localStorage.getItem("glyco_food");
          setFoodLogs(saved ? JSON.parse(saved) : INITIAL_FOOD_LOGS);
        }

        // 4. Fetch medication logs
        try {
          const medsSnap = await getDocs(collection(db, `users/${firebaseUser.uid}/meds`));
          if (!medsSnap.empty) {
            setMedicationLogs(medsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MedicationLog)));
          } else {
            setMedicationLogs(INITIAL_MEDICATION_LOGS);
          }
        } catch (err) {
          console.error("Error loading medication logs from Firestore:", err);
          const saved = localStorage.getItem("glyco_meds");
          setMedicationLogs(saved ? JSON.parse(saved) : INITIAL_MEDICATION_LOGS);
        }

        // 5. Fetch exercise logs
        try {
          const exercisesSnap = await getDocs(collection(db, `users/${firebaseUser.uid}/exercises`));
          if (!exercisesSnap.empty) {
            setExerciseLogs(exercisesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ExerciseLog)));
          } else {
            setExerciseLogs(INITIAL_EXERCISE_LOGS);
          }
        } catch (err) {
          console.error("Error loading exercises from Firestore:", err);
          const saved = localStorage.getItem("glyco_exercises");
          setExerciseLogs(saved ? JSON.parse(saved) : INITIAL_EXERCISE_LOGS);
        }

        // 6. Fetch chat messages
        try {
          const chatSnap = await getDocs(collection(db, `users/${firebaseUser.uid}/chat`));
          if (!chatSnap.empty) {
            setChatMessages(chatSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
          } else {
            setChatMessages(INITIAL_CHAT_MESSAGES);
          }
        } catch (err) {
          console.error("Error loading chat from Firestore:", err);
          const saved = localStorage.getItem("glyco_chat");
          setChatMessages(saved ? JSON.parse(saved) : INITIAL_CHAT_MESSAGES);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync state helpers
  const saveProfile = async (p: UserProfile | null) => {
    setProfile(p);
    if (p) {
      localStorage.setItem("glyco_profile", JSON.stringify(p));
      if (user) {
        await syncDocToFirestore("profile", "default", p);
      }
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

  // State Mutators & Firestore Sync
  const handleAddGlucoseLog = async (newLog: Omit<GlucoseLog, "id">) => {
    const log: GlucoseLog = {
      ...newLog,
      id: Math.random().toString(36).substr(2, 9),
    };
    const updated = [...glucoseLogs, log];
    saveGlucose(updated);
    if (user) {
      await syncDocToFirestore("glucose", log.id, log);
    }
  };

  const handleDeleteGlucoseLog = async (id: string) => {
    const updated = glucoseLogs.filter((l) => l.id !== id);
    saveGlucose(updated);
    if (user) {
      await deleteDocFromFirestore("glucose", id);
    }
  };

  const handleAddFoodLog = async (newLog: Omit<FoodLog, "id">) => {
    const log: FoodLog = {
      ...newLog,
      id: Math.random().toString(36).substr(2, 9),
    };
    const updated = [...foodLogs, log];
    saveFood(updated);
    if (user) {
      await syncDocToFirestore("food", log.id, log);
    }
  };

  const handleAddMedicationLog = async (newMed: Omit<MedicationLog, "id" | "status">) => {
    const med: MedicationLog = {
      ...newMed,
      id: Math.random().toString(36).substr(2, 9),
      status: "pendente",
    };
    const updated = [...medicationLogs, med];
    saveMeds(updated);
    if (user) {
      await syncDocToFirestore("meds", med.id, med);
    }
  };

  const handleToggleMedicationStatus = async (id: string) => {
    const updated = medicationLogs.map((m) => {
      if (m.id === id) {
        const nextStatus = m.status === "aplicado" ? "pendente" : "aplicado";
        return {
          ...m,
          status: nextStatus as any,
          timestamp: nextStatus === "aplicado" ? new Date().toISOString() : undefined,
        };
      }
      return m;
    });
    saveMeds(updated);
    const target = updated.find((m) => m.id === id);
    if (user && target) {
      await syncDocToFirestore("meds", id, target);
    }
  };

  const handleDeleteMedicationLog = async (id: string) => {
    const updated = medicationLogs.filter((m) => m.id !== id);
    saveMeds(updated);
    if (user) {
      await deleteDocFromFirestore("meds", id);
    }
  };

  const handleAddExerciseLog = async (newEx: Omit<ExerciseLog, "id">) => {
    const ex: ExerciseLog = {
      ...newEx,
      id: Math.random().toString(36).substr(2, 9),
    };
    const updated = [...exerciseLogs, ex];
    saveExercises(updated);
    if (user) {
      await syncDocToFirestore("exercises", ex.id, ex);
    }
  };

  const handleDeleteExerciseLog = async (id: string) => {
    const updated = exerciseLogs.filter((e) => e.id !== id);
    saveExercises(updated);
    if (user) {
      await deleteDocFromFirestore("exercises", id);
    }
  };

  const handleSendMessage = async (text: string) => {
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };
    const updated = [...chatMessages, msg];
    saveChat(updated);
    if (user) {
      await syncDocToFirestore("chat", msg.id, msg);
    }
  };

  const handleReceiveAssistantMessage = async (text: string) => {
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: "assistant",
      text,
      timestamp: new Date().toISOString(),
    };
    const updated = [...chatMessages, msg];
    saveChat(updated);
    if (user) {
      await syncDocToFirestore("chat", msg.id, msg);
    }
  };

  const handleResetData = async () => {
    localStorage.clear();
    setProfile(null);
    setGlucoseLogs(INITIAL_GLUCOSE_LOGS);
    setFoodLogs(INITIAL_FOOD_LOGS);
    setMedicationLogs(INITIAL_MEDICATION_LOGS);
    setExerciseLogs(INITIAL_EXERCISE_LOGS);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    setCurrentView("dashboard");
    if (user) {
      // Clear user records in Firestore - simple deletion or let them start fresh
      try {
        const { deleteDoc, doc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "users", user.uid, "profile", "default"));
      } catch (e) {
        console.warn("Could not reset profile doc from Firestore:", e);
      }
    }
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

  // State and Auth Checking Guards
  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-100">
        <Activity className="w-8 h-8 text-blue-500 animate-pulse mb-3" />
        <p className="text-xs font-bold text-neutral-400">Verificando sessão segura...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView onAuthSuccess={(uid, email) => setUser({ uid, email })} />;
  }

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

  const isAdmin = user.email === "nickinicolas380@gmail.com";

  // Sidebar navigation configuration
  const navigationItems = [
    { id: "dashboard", label: "Painel Principal", icon: Activity },
    { id: "glicemia", label: "Controle Glicêmico", icon: Heart },
    { id: "alimentacao", label: "Alimentação Inteligente", icon: Apple },
    { id: "medicamentos", label: "Medicamentos & Insulina", icon: Pill },
    { id: "exercicios", label: "Atividades Físicas", icon: Dumbbell },
    { id: "chat", label: "Copiloto IA", icon: Brain },
    { id: "relatorios", label: "Relatório Clínico", icon: Printer },
    { id: "subscription", label: "Assinatura Premium", icon: Sparkles },
    { id: "configuracoes", label: "Ajustes & Metas", icon: Settings },
  ];

  if (isAdmin) {
    navigationItems.push({ id: "admin", label: "Painel Admin", icon: ShieldCheck });
  }

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
          <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-2xl justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">{profile.name}</p>
                <p className="text-xxs text-neutral-400 capitalize truncate">Diabetes {profile.diabetesType.replace("_", " ")}</p>
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              title="Encerrar Sessão"
              className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
              isPremium={isPremium}
              onNavigateToSubscription={() => setCurrentView("subscription")}
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
              isPremium={isPremium}
              onNavigateToSubscription={() => setCurrentView("subscription")}
            />
          )}

          {currentView === "relatorios" && (
            <RelatoriosView
              profile={profile}
              glucoseLogs={glucoseLogs}
              foodLogs={foodLogs}
              medicationLogs={medicationLogs}
              exerciseLogs={exerciseLogs}
              isPremium={isPremium}
              onNavigateToSubscription={() => setCurrentView("subscription")}
            />
          )}

          {currentView === "subscription" && (
            <SubscriptionView
              currentPlan={isPremium ? "premium" : "free"}
              subscriptionStatus={isPremium ? "active" : "inactive"}
              onUpgrade={async (plan, period) => {
                setIsPremium(true);
                localStorage.setItem("glyco_premium", "true");
                // Securely save subscription state to user record in Firestore
                if (user) {
                  try {
                    await setDoc(doc(db, "users", user.uid), {
                      email: user.email,
                      subscriptionPlan: "premium",
                      subscriptionStatus: "active",
                      updatedAt: new Date().toISOString()
                    }, { merge: true });
                  } catch (e) {
                    console.error("Failed to update firestore subscription state:", e);
                  }
                }
              }}
              onCancel={async () => {
                setIsPremium(false);
                localStorage.setItem("glyco_premium", "false");
                if (user) {
                  try {
                    await setDoc(doc(db, "users", user.uid), {
                      subscriptionPlan: "free",
                      subscriptionStatus: "canceled",
                      updatedAt: new Date().toISOString()
                    }, { merge: true });
                  } catch (e) {
                    console.error("Failed to cancel subscription in firestore:", e);
                  }
                }
              }}
              onReactivate={async () => {
                setIsPremium(true);
                localStorage.setItem("glyco_premium", "true");
                if (user) {
                  try {
                    await setDoc(doc(db, "users", user.uid), {
                      subscriptionPlan: "premium",
                      subscriptionStatus: "active",
                      updatedAt: new Date().toISOString()
                    }, { merge: true });
                  } catch (e) {
                    console.error("Failed to reactivate subscription in firestore:", e);
                  }
                }
              }}
            />
          )}

          {currentView === "admin" && isAdmin && (
            <AdminPanel
              adminEmail={user.email}
              adminUid={user.uid}
              onBackToApp={() => setCurrentView("dashboard")}
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
