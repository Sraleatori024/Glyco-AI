import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, DiabetesType } from "../types";
import { Heart, Activity, User, Target, ChevronRight, ChevronLeft, Check, ShieldAlert } from "lucide-react";

interface OnboardingViewProps {
  onComplete: (profile: UserProfile) => void;
}

const GOALS_PRESETS = [
  "Controlar glicemia diária",
  "Aprender contagem de carboidratos",
  "Evitar episódios de hipoglicemia",
  "Melhorar hábitos de alimentação",
  "Aumentar prática de exercícios físicos",
  "Perder peso de forma saudável",
  "Gerar relatórios claros para meu médico",
];

export default function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
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
  });

  const [currentMed, setCurrentMed] = useState("");
  const [currentInsulin, setCurrentInsulin] = useState("");

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      const completeProfile: UserProfile = {
        name: profile.name || "Paciente",
        age: Number(profile.age) || 35,
        gender: profile.gender || "Não informado",
        height: Number(profile.height) || 170,
        weight: Number(profile.weight) || 70,
        diabetesType: (profile.diabetesType as DiabetesType) || "tipo2",
        medications: profile.medications || [],
        usesInsulin: !!profile.usesInsulin,
        insulinTypes: profile.insulinTypes || [],
        targetGlucoseMinJejum: Number(profile.targetGlucoseMinJejum) || 70,
        targetGlucoseMaxJejum: Number(profile.targetGlucoseMaxJejum) || 130,
        targetGlucoseMaxPosPrandial: Number(profile.targetGlucoseMaxPosPrandial) || 180,
        goals: profile.goals || [],
      };
      onComplete(completeProfile);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const addMedication = () => {
    if (currentMed.trim() && profile.medications) {
      setProfile({
        ...profile,
        medications: [...profile.medications, currentMed.trim()],
      });
      setCurrentMed("");
    }
  };

  const removeMedication = (index: number) => {
    if (profile.medications) {
      setProfile({
        ...profile,
        medications: profile.medications.filter((_, i) => i !== index),
      });
    }
  };

  const addInsulinType = () => {
    if (currentInsulin.trim() && profile.insulinTypes) {
      setProfile({
        ...profile,
        insulinTypes: [...profile.insulinTypes, currentInsulin.trim()],
      });
      setCurrentInsulin("");
    }
  };

  const removeInsulinType = (index: number) => {
    if (profile.insulinTypes) {
      setProfile({
        ...profile,
        insulinTypes: profile.insulinTypes.filter((_, i) => i !== index),
      });
    }
  };

  const toggleGoal = (goal: string) => {
    const goals = profile.goals || [];
    if (goals.includes(goal)) {
      setProfile({ ...profile, goals: goals.filter((g) => g !== goal) });
    } else {
      setProfile({ ...profile, goals: [...goals, goal] });
    }
  };

  const isStepValid = () => {
    if (step === 1) return (profile.name || "").trim().length >= 2;
    return true;
  };

  return (
    <div id="onboarding-root" className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Activity className="w-6 h-6 text-white animate-pulse" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-neutral-900 font-sans">Glyco <span className="text-blue-600">AI</span></span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-neutral-100 rounded-3xl sm:px-10">
          
          {/* Progress Indicators */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      step >= s
                        ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                        : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  <span className="ml-2 text-xs font-medium text-neutral-500 hidden sm:inline">
                    {s === 1 && "Identificação"}
                    {s === 2 && "Dados Físicos"}
                    {s === 3 && "Clínica"}
                    {s === 4 && "Metas"}
                  </span>
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step > s ? "bg-blue-600" : "bg-neutral-100"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-neutral-950 font-sans tracking-tight">
                    Boas-vindas ao cuidado inteligente
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                    Vamos configurar sua conta personalizada. Primeiro, como gostaria de ser chamado(a) e suas informações essenciais?
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name-input" className="block text-sm font-medium text-neutral-700 mb-1">
                      Nome completo
                    </label>
                    <input
                      id="name-input"
                      type="text"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Ex: João da Silva"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="age-input" className="block text-sm font-medium text-neutral-700 mb-1">
                        Idade
                      </label>
                      <input
                        id="age-input"
                        type="number"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Anos"
                        value={profile.age || ""}
                        onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>

                    <div>
                      <label htmlFor="gender-select" className="block text-sm font-medium text-neutral-700 mb-1">
                        Sexo Biológico
                      </label>
                      <select
                        id="gender-select"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={profile.gender}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro / Prefiro não dizer</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-neutral-950 font-sans tracking-tight">
                    Suas medidas físicas
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                    Usamos altura e peso para calcular índices corporais importantes para a dosagem de medicamentos e impacto metabólico.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="height-input" className="block text-sm font-medium text-neutral-700 mb-1">
                      Altura (cm)
                    </label>
                    <input
                      id="height-input"
                      type="number"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Ex: 175"
                      value={profile.height || ""}
                      onChange={(e) => setProfile({ ...profile, height: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label htmlFor="weight-input" className="block text-sm font-medium text-neutral-700 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      id="weight-input"
                      type="number"
                      step="0.1"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Ex: 75.4"
                      value={profile.weight || ""}
                      onChange={(e) => setProfile({ ...profile, weight: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {profile.height && profile.weight && (
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <User className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Seu IMC Estimado: {((profile.weight) / Math.pow((profile.height || 1) / 100, 2)).toFixed(1)}
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Este valor é utilizado pela nossa Inteligência Artificial para correlacionar sua sensibilidade à insulina com atividades físicas.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-neutral-950 font-sans tracking-tight">
                    Perfil Clínico & Tratamento
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                    Essas informações configuram os parâmetros do assistente de IA, gerando análises altamente contextualizadas.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Tipo de Diabetes
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "tipo1", label: "Tipo 1" },
                        { id: "tipo2", label: "Tipo 2" },
                        { id: "gestacional", label: "Gestacional" },
                        { id: "pre_diabetes", label: "Pré-Diabetes" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setProfile({ ...profile, diabetesType: t.id as DiabetesType })}
                          className={`px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all ${
                            profile.diabetesType === t.id
                              ? "bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-500"
                              : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Insulina toggle */}
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-neutral-900">Utiliza Insulina?</h4>
                        <p className="text-xs text-neutral-500">Injeções diárias de ação rápida ou lenta.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProfile({ ...profile, usesInsulin: !profile.usesInsulin, insulinTypes: !profile.usesInsulin ? profile.insulinTypes : [] })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          profile.usesInsulin ? "bg-blue-600" : "bg-neutral-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            profile.usesInsulin ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {profile.usesInsulin && (
                      <div className="mt-4 pt-4 border-t border-neutral-200/60 space-y-3">
                        <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                          Tipos de Insulina em uso
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Lantus, Novorapid, Humalog"
                            value={currentInsulin}
                            onChange={(e) => setCurrentInsulin(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInsulinType())}
                          />
                          <button
                            type="button"
                            onClick={addInsulinType}
                            className="px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 transition-colors"
                          >
                            Adicionar
                          </button>
                        </div>
                        {profile.insulinTypes && profile.insulinTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {profile.insulinTypes.map((ins, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium"
                              >
                                {ins}
                                <button type="button" onClick={() => removeInsulinType(i)} className="hover:text-blue-950 font-bold">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Outros Medicamentos */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-700">
                      Outros Medicamentos Orais (se houver)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Ex: Metformina 850mg, Jardiance"
                        value={currentMed}
                        onChange={(e) => setCurrentMed(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
                      />
                      <button
                        type="button"
                        onClick={addMedication}
                        className="px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 transition-colors"
                      >
                        Adicionar
                      </button>
                    </div>
                    {profile.medications && profile.medications.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {profile.medications.map((med, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800 text-xs font-medium"
                          >
                            {med}
                            <button type="button" onClick={() => removeMedication(i)} className="hover:text-neutral-950 font-bold">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-neutral-950 font-sans tracking-tight">
                    Metas & Objetivos Pessoais
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                    Personalize seus limites de referência glicêmica recomendados pelo seu médico para calcularmos o seu Tempo no Alvo diário.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-blue-600" />
                      Margens Glicêmicas Alvo (mg/dL)
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xxs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                          Mín. Jejum
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={profile.targetGlucoseMinJejum || ""}
                          onChange={(e) => setProfile({ ...profile, targetGlucoseMinJejum: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="block text-xxs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                          Máx. Jejum
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={profile.targetGlucoseMaxJejum || ""}
                          onChange={(e) => setProfile({ ...profile, targetGlucoseMaxJejum: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="block text-xxs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                          Pós-Almoço
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={profile.targetGlucoseMaxPosPrandial || ""}
                          onChange={(e) => setProfile({ ...profile, targetGlucoseMaxPosPrandial: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Selecione seus principais objetivos:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {GOALS_PRESETS.map((preset) => {
                        const isSelected = (profile.goals || []).includes(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => toggleGoal(preset)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100"
                                : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Nota sobre segurança:</strong> Os dados fornecidos são criptografados localmente. O aplicativo auxilia no monitoramento, mas não substitui a orientação do seu endocrinologista.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-neutral-100 flex justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-neutral-200 text-sm font-semibold text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              disabled={!isStepValid()}
              onClick={handleNext}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-lg transition-all ${
                isStepValid()
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-100 cursor-pointer"
                  : "bg-blue-300 shadow-none cursor-not-allowed"
              }`}
            >
              {step === 4 ? "Concluir Perfil" : "Avançar"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
