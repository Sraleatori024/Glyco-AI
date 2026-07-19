import React, { useState } from "react";
import { MedicationLog } from "../types";
import { Plus, Trash2, CheckCircle, Clock, Sparkles, Check, AlertCircle } from "lucide-react";

interface MedicamentosViewProps {
  logs: MedicationLog[];
  onAddLog: (med: Omit<MedicationLog, "id" | "status">) => void;
  onToggleStatus: (id: string) => void;
  onDeleteLog: (id: string) => void;
}

export default function MedicamentosView({
  logs,
  onAddLog,
  onToggleStatus,
  onDeleteLog,
}: MedicamentosViewProps) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [timeScheduled, setTimeScheduled] = useState("08:00");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dose.trim()) return;

    onAddLog({
      name: name.trim(),
      dose: dose.trim(),
      timeScheduled,
    });

    setName("");
    setDose("");
  };

  // Stats
  const totalDoses = logs.length;
  const takenDoses = logs.filter((l) => l.status === "aplicado").length;
  const progressPercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  return (
    <div id="medicamentos-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      {/* Left panel: Form */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-1.5">
            <Plus className="w-5 h-5 text-blue-600" />
            Adicionar Medicamento / Insulina
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="med-name" className="block text-sm font-medium text-neutral-700 mb-1">
                Nome do Medicamento ou Insulina
              </label>
              <input
                id="med-name"
                type="text"
                placeholder="Ex: Insulina Lantus, Metformina 850mg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="med-dose" className="block text-sm font-medium text-neutral-700 mb-1">
                  Dosagem
                </label>
                <input
                  id="med-dose"
                  type="text"
                  placeholder="Ex: 1 comp, 14 UI"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>
              <div>
                <label htmlFor="med-time" className="block text-sm font-medium text-neutral-700 mb-1">
                  Horário
                </label>
                <input
                  id="med-time"
                  type="text"
                  value={timeScheduled}
                  onChange={(e) => setTimeScheduled(e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              Agendar Medicamento
            </button>
          </form>
        </div>

        {/* Adherence Card */}
        <div className="bg-neutral-900 text-white p-5 rounded-3xl border border-neutral-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Meta de Adesão Diária
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-neutral-400 text-xs">Doses Tomadas Hoje</span>
              <span className="text-lg font-bold text-white">
                {takenDoses} de {totalDoses}
              </span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {progressPercent === 100 && totalDoses > 0 ? (
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xxs text-emerald-300">
                  Parabéns! Você completou 100% da sua rotina de medicamentos recomendada para o dia de hoje.
                </p>
              </div>
            ) : (
              <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xxs text-amber-300">
                  Lembre-se de tomar seus medicamentos nos horários previstos. A consistência apoia a estabilidade glicêmica.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel: Active tracker list */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
          <h3 className="text-lg font-bold text-neutral-900">Agenda de Doses de Hoje</h3>
          <p className="text-xs text-neutral-500 mb-6">Confirme a aplicação ou ingestão clicando nos botões de marcação abaixo.</p>

          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((med) => (
                <div
                  key={med.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 group ${
                    med.status === "aplicado"
                      ? "bg-emerald-50/40 border-emerald-100"
                      : "bg-neutral-50 border-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => onToggleStatus(med.id)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                        med.status === "aplicado"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-neutral-300 bg-white hover:border-blue-500"
                      }`}
                    >
                      {med.status === "aplicado" ? <Check className="w-4 h-4" /> : null}
                    </button>

                    <div>
                      <h4 className={`text-sm font-bold ${med.status === "aplicado" ? "line-through text-neutral-400" : "text-neutral-900"}`}>
                        {med.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xxs font-semibold text-neutral-400">Dose: {med.dose}</span>
                        <div className="w-1 h-1 rounded-full bg-neutral-300" />
                        <span className="inline-flex items-center gap-1 text-xxs font-bold text-neutral-500">
                          <Clock className="w-3.5 h-3.5" />
                          Previsto: {med.timeScheduled}
                        </span>
                        {med.status === "aplicado" && med.timestamp && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-neutral-300" />
                            <span className="text-xxs font-bold text-emerald-600">
                              Aplicado às {new Date(med.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeleteLog(med.id)}
                      className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Excluir agendamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-neutral-400 text-xs">
              Sua lista de medicamentos agendados está vazia. Adicione o primeiro no menu lateral.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
