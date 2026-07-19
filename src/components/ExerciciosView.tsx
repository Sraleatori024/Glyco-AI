import React, { useState } from "react";
import { ExerciseLog, ExerciseType } from "../types";
import { Plus, Trash2, Award, Clock, Flame, Zap, Dumbbell } from "lucide-react";

interface ExerciciosViewProps {
  logs: ExerciseLog[];
  onAddLog: (log: Omit<ExerciseLog, "id">) => void;
  onDeleteLog: (id: string) => void;
}

export default function ExerciciosView({ logs, onAddLog, onDeleteLog }: ExerciciosViewProps) {
  const [type, setType] = useState<ExerciseType>("caminhada");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [intensity, setIntensity] = useState<ExerciseLog["intensity"]>("moderada");

  // Clinical insulin sensitivity estimator logic
  const getSensitivityImpact = (actType: ExerciseType, duration: number, intent: string) => {
    switch (actType) {
      case "caminhada":
        return `Ativa os canais GLUT4 musculares de forma independente de insulina, aumentando a captação de glicose circulante por cerca de 12-16 horas. Excelente para reduzir o pico pós-prandial.`;
      case "corrida":
        return `Otimiza os estoques de glicogênio muscular. Acelera o metabolismo e melhora a sensibilidade à insulina celular por até 24-36 horas após a atividade de intensidade ${intent}.`;
      case "musculacao":
        return `O aumento da massa muscular magra cria um reservatório maior para armazenamento de glicose, melhorando a sensibilidade à insulina a longo prazo de forma duradoura.`;
      case "pedalar":
        return `Atividade aeróbica cíclica excelente para a saúde cardiovascular de diabéticos, promovendo o consumo imediato de glicose e reduzindo a resistência por até 24 horas.`;
      case "natacao":
        return `Trabalha grandes grupos musculares sem impacto articular. Eleva o consumo periférico de glicose e estabiliza as curvas glicêmicas pós-atividade de forma segura.`;
      default:
        return `Praticar exercícios melhora a circulação periférica, auxilia no controle de peso e otimiza a sensibilidade celular à ação de hormônios reguladores de glicose.`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMinutes <= 0) return;

    onAddLog({
      timestamp: new Date().toISOString(),
      type,
      durationMinutes,
      intensity,
      insulinSensitivityImpact: getSensitivityImpact(type, durationMinutes, intensity),
    });

    setDurationMinutes(30);
  };

  return (
    <div id="exercicios-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      {/* Left panel: Form */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-1.5">
            <Plus className="w-5 h-5 text-blue-600" />
            Adicionar Atividade Física
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Tipo de Exercício
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "caminhada", label: "Caminhada" },
                  { id: "corrida", label: "Corrida" },
                  { id: "musculacao", label: "Musculação" },
                  { id: "pedalar", label: "Pedalar" },
                  { id: "natacao", label: "Natação" },
                  { id: "outros", label: "Outros" },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setType(act.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                      type === act.id
                        ? "bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-500"
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
                <label htmlFor="duration-input" className="block text-sm font-medium text-neutral-700 mb-1">
                  Duração (min)
                </label>
                <input
                  id="duration-input"
                  type="number"
                  min="5"
                  max="300"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>

              <div>
                <label htmlFor="intensity-select" className="block text-sm font-medium text-neutral-700 mb-1">
                  Intensidade
                </label>
                <select
                  id="intensity-select"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value as any)}
                >
                  <option value="leve">Leve</option>
                  <option value="moderada">Moderada</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>

            {/* Live Impact Preview */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-1">
              <span className="text-xxs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Impacto Estimado na Insulina
              </span>
              <p className="text-xxs text-blue-800 leading-relaxed font-medium">
                {getSensitivityImpact(type, durationMinutes, intensity)}
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              Registrar Exercício
            </button>
          </form>
        </div>
      </div>

      {/* Right panel: History log list */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
          <h3 className="text-lg font-bold text-neutral-900">Histórico de Atividades Recentes</h3>
          <p className="text-xs text-neutral-500 mb-6">Praticar pelo menos 150 minutos de exercícios semanais apoia o controle do diabetes tipo 1 e tipo 2.</p>

          {logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((ex) => {
                const date = new Date(ex.timestamp);
                const displayDate = date.toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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
                          <h4 className="text-sm font-bold text-neutral-900 capitalize">{ex.type}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xxs font-bold uppercase tracking-wider border ${
                            ex.intensity === "leve"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : ex.intensity === "moderada"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-orange-50 text-orange-700 border-orange-200"
                          }`}>
                            Intensidade {ex.intensity}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xxs text-neutral-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Duração: {ex.durationMinutes} minutos
                          </span>
                          <span>•</span>
                          <span>{displayDate}</span>
                        </div>
                        <p className="text-xxs text-neutral-500 leading-relaxed max-w-xl">
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
              Sua lista de atividades está vazia. Registre a primeira no menu lateral.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
