export type DiabetesType = "tipo1" | "tipo2" | "gestacional" | "pre_diabetes";

export interface UserProfile {
  uid?: string;
  name: string;
  email?: string;
  photoURL?: string | null;
  role?: string;
  plan?: string;
  subscriptionStatus?: string;
  aiUsageCount?: number;
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

export interface IdentifiedFoodItem {
  name: string;
  portion: string;
  carbohydrates: number;
  protein?: number;
  fats?: number;
  glycemicImpact: "baixo" | "medio" | "alto";
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
  identifiedItems?: IdentifiedFoodItem[];
  functionalTips?: string[];
  consumptionOrder?: string;
}

export interface FoodLog {
  id: string;
  timestamp: string;
  description: string;
  base64Image?: string;
  nutrition?: FoodNutrition;
  isManual?: boolean;
}

export interface MedicationLog {
  id: string;
  name: string;
  dose: string;
  timeScheduled: string; // e.g. "08:00"
  timestamp?: string; // when actually applied
  status: "aplicado" | "pendente" | "atrasado";
  notes?: string;
}

export type InsulinType = "ultrarrapida" | "rapida" | "nph" | "lenta_basal";

export interface InsulinLog {
  id: string;
  type: InsulinType;
  customName?: string; // e.g. "Lantus", "Humalog", "Tresiba", "Novorap"
  doseUnits: number; // in UI
  timeScheduled: string; // e.g. "22:00"
  timestamp?: string;
  applicationSite?: "abdomen" | "coxa" | "braco" | "gluteo" | "outros";
  status: "aplicado" | "pendente" | "atrasado";
  notes?: string;
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

// Initial Empty State Constants for new users
export const INITIAL_PROFILE: UserProfile = {
  name: "",
  age: 35,
  gender: "Masculino",
  height: 175,
  weight: 75,
  diabetesType: "tipo2",
  medications: [],
  usesInsulin: false,
  insulinTypes: [],
  targetGlucoseMinJejum: 70,
  targetGlucoseMaxJejum: 130,
  targetGlucoseMaxPosPrandial: 180,
  goals: [],
};

export const INITIAL_GLUCOSE_LOGS: GlucoseLog[] = [];

export const INITIAL_FOOD_LOGS: FoodLog[] = [];

export const INITIAL_MEDICATION_LOGS: MedicationLog[] = [];

export const INITIAL_INSULIN_LOGS: InsulinLog[] = [];

export const INITIAL_EXERCISE_LOGS: ExerciseLog[] = [];

export const INITIAL_CHAT_MESSAGES: Message[] = [
  {
    id: "c1",
    sender: "assistant",
    text: "Olá! Sou o seu assistente inteligente Glyco AI. Estou aqui para ajudar você a acompanhar suas glicemias, analisar refeições e tirar dúvidas sobre seu dia a dia. Como posso te ajudar hoje?",
    timestamp: new Date().toISOString(),
  },
];
