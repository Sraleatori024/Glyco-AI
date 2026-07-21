export type DiabetesType = "tipo1" | "tipo2" | "gestacional" | "pre_diabetes";

export interface UserProfile {
  uid?: string;
  name: string;
  email?: string;
  photoURL?: string | null;
  role?: string;
  plan?: string;
  subscriptionStatus?: string;
  createdAt?: string;
  updatedAt?: string;

  age: number;
  gender: string;
  height: number | null; // in cm
  weight: number | null; // in kg
  diabetesType: DiabetesType | null;
  medications: string[];
  usesInsulin: boolean;
  insulinTypes: string[];
  targetGlucoseMinJejum: number; // default: 70
  targetGlucoseMaxJejum: number; // default: 130
  targetGlucoseMaxPosPrandial: number; // default: 180
  goals: string[];
}

export interface GlucoseLog {
  id: string;
  value: number; // in mg/dL
  timestamp: string; // ISO String
  type: "jejum" | "pre_refeicao" | "pos_refeicao" | "antes_dormir" | "outros";
  notes?: string;
}

export interface FoodNutrition {
  foodName: string;
  portionSize: string;
  carbohydrates: number; // grams
  sugar: number; // grams
  fiber: number; // grams
  protein: number; // grams
  fats: number; // grams
  calories: number; // kcal
  glycemicLoad: number; // score
  glycemicIndexRating: "baixo" | "medio" | "alto";
  expectedImpact: string; // e.g., 'Baixo', 'Moderado', 'Rápido', 'Muito Alto'
  explanation: string;
}

export interface FoodLog {
  id: string;
  timestamp: string;
  description: string;
  base64Image?: string;
  nutrition?: FoodNutrition;
}

export interface MedicationLog {
  id: string;
  name: string;
  dose: string;
  timeScheduled: string; // e.g. "08:00"
  timestamp?: string; // when actually applied
  status: "aplicado" | "pendente" | "atrasado";
}

export type ExerciseType = "caminhada" | "corrida" | "musculacao" | "pedalar" | "natacao" | "outros";

export interface ExerciseLog {
  id: string;
  timestamp: string;
  type: ExerciseType;
  durationMinutes: number;
  intensity: "leve" | "moderada" | "alta";
  insulinSensitivityImpact: string; // Estimação da melhora na sensibilidade
}

export interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface AIAnalysisResult {
  overallStatus: string;
  controlTrend: "melhorando" | "estável" | "atencao" | "descontrolado";
  patterns: string[];
  insights: {
    title: string;
    description: string;
    type: "sucesso" | "alerta" | "info";
  }[];
  medicalDisclaimer: string;
}

// Initial Mock Values for beautiful dashboard charts and previews on first load
export const INITIAL_PROFILE: UserProfile = {
  name: "João Silva",
  age: 42,
  gender: "Masculino",
  height: 178,
  weight: 84,
  diabetesType: "tipo2",
  medications: ["Metformina 850mg (Almoço/Jantar)"],
  usesInsulin: true,
  insulinTypes: ["Glargina (Lantus) - Longa Duração"],
  targetGlucoseMinJejum: 70,
  targetGlucoseMaxJejum: 130,
  targetGlucoseMaxPosPrandial: 180,
  goals: ["Controlar glicemia", "Melhorar alimentação", "Evitar hipoglicemia"],
};

export const INITIAL_GLUCOSE_LOGS: GlucoseLog[] = [
  { id: "1", value: 112, timestamp: "2026-07-13T07:30:00-03:00", type: "jejum", notes: "Jejum de 8h" },
  { id: "2", value: 154, timestamp: "2026-07-13T14:15:00-03:00", type: "pos_refeicao", notes: "Pós almoço - arroz e frango" },
  { id: "3", value: 98, timestamp: "2026-07-13T22:30:00-03:00", type: "antes_dormir" },
  { id: "4", value: 125, timestamp: "2026-07-14T07:45:00-03:00", type: "jejum" },
  { id: "5", value: 165, timestamp: "2026-07-14T14:30:00-03:00", type: "pos_refeicao", notes: "Lasanha" },
  { id: "6", value: 104, timestamp: "2026-07-14T20:15:00-03:00", type: "outros", notes: "Antes da caminhada" },
  { id: "7", value: 87, timestamp: "2026-07-14T21:45:00-03:00", type: "pos_refeicao", notes: "Após caminhar" },
  { id: "8", value: 102, timestamp: "2026-07-15T07:15:00-03:00", type: "jejum" },
  { id: "9", value: 132, timestamp: "2026-07-15T13:45:00-03:00", type: "pos_refeicao", notes: "Almoço equilibrado" },
  { id: "10", value: 145, timestamp: "2026-07-16T07:30:00-03:00", type: "jejum", notes: "Dormiu mal" },
  { id: "11", value: 184, timestamp: "2026-07-16T14:00:00-03:00", type: "pos_refeicao", notes: "Pizza no almoço" },
  { id: "12", value: 68, timestamp: "2026-07-16T17:30:00-03:00", type: "outros", notes: "Hipoglicemia leve, tontura" },
  { id: "13", value: 105, timestamp: "2026-07-16T18:00:00-03:00", type: "pos_refeicao", notes: "Suco de laranja e torrada" },
  { id: "14", value: 118, timestamp: "2026-07-17T07:20:00-03:00", type: "jejum" },
  { id: "15", value: 139, timestamp: "2026-07-17T13:50:00-03:00", type: "pos_refeicao" },
  { id: "16", value: 110, timestamp: "2026-07-18T07:10:00-03:00", type: "jejum" },
  { id: "17", value: 148, timestamp: "2026-07-18T14:00:00-03:00", type: "pos_refeicao" },
  { id: "18", value: 122, timestamp: "2026-07-18T20:30:00-03:00", type: "pre_refeicao", notes: "Antes da janta" },
  { id: "19", value: 115, timestamp: "2026-07-19T07:00:00-03:00", type: "jejum" },
];

export const INITIAL_FOOD_LOGS: FoodLog[] = [
  {
    id: "f1",
    timestamp: "2026-07-18T08:15:00-03:00",
    description: "Tapioca com queijo coalho e café com leite desnatado",
    nutrition: {
      foodName: "Tapioca com Queijo Coalho",
      portionSize: "1 tapioca média (120g) + 150ml café com leite",
      carbohydrates: 45,
      sugar: 6,
      fiber: 1,
      protein: 12,
      fats: 9,
      calories: 340,
      glycemicLoad: 28,
      glycemicIndexRating: "alto",
      expectedImpact: "Rápido",
      explanation: "A tapioca possui alto índice glicêmico e pode causar picos rápidos. Sugere-se adicionar farelo de aveia ou sementes de chia à massa para aumentar as fibras e retardar a absorção.",
    },
  },
  {
    id: "f2",
    timestamp: "2026-07-18T13:00:00-03:00",
    description: "Salada verde, peito de frango grelhado, 3 colheres de arroz integral e feijão",
    nutrition: {
      foodName: "Peito de Frango com Arroz Integral e Feijão",
      portionSize: "Prato saudável (350g)",
      carbohydrates: 35,
      sugar: 2,
      fiber: 8,
      protein: 32,
      fats: 11,
      calories: 420,
      glycemicLoad: 12,
      glycemicIndexRating: "baixo",
      expectedImpact: "Moderado",
      explanation: "Excelente combinação! O teor elevado de proteínas e fibras do arroz integral e feijão amortece a curva glicêmica, mantendo a glicemia estável.",
    },
  },
];

export const INITIAL_MEDICATION_LOGS: MedicationLog[] = [
  { id: "m1", name: "Metformina 850mg", dose: "1 comprimido", timeScheduled: "08:00", status: "aplicado", timestamp: "2026-07-19T08:05:00-03:00" },
  { id: "m2", name: "Metformina 850mg", dose: "1 comprimido", timeScheduled: "20:00", status: "pendente" },
  { id: "m3", name: "Insulina Glargina", dose: "14 UI", timeScheduled: "22:00", status: "pendente" },
];

export const INITIAL_EXERCISE_LOGS: ExerciseLog[] = [
  {
    id: "e1",
    timestamp: "2026-07-18T18:30:00-03:00",
    type: "caminhada",
    durationMinutes: 40,
    intensity: "moderada",
    insulinSensitivityImpact: "Aumenta a captação de glicose muscular de forma independente de insulina por até 16-24 horas, auxiliando no controle pós-prandial.",
  },
];

export const INITIAL_CHAT_MESSAGES: Message[] = [
  {
    id: "c1",
    sender: "assistant",
    text: "Olá! Sou o assistente inteligente da Glyco AI. Estou aqui para te ajudar a entender seus padrões glicêmicos, estimar carboidratos das suas refeições e dar dicas de hábitos saudáveis. Como posso te apoiar hoje?",
    timestamp: "2026-07-19T07:05:00-03:00",
  },
];
