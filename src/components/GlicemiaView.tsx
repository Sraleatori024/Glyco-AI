import React, { useState } from "react";
import { GlucoseLog } from "../types";
import { motion } from "motion/react";
import { Plus, Trash2, Calendar, Clock, Smile, Frown, Award, AlertCircle, Sparkles, Filter } from "lucide-react";

interface GlicemiaViewProps {
  logs: GlucoseLog[];
  onAddLog: (log: Omit<GlucoseLog, "id">) => void;
  onDeleteLog: (id: string) => void;
  targetMin: number;
  targetMaxJejum: number;
  targetMaxPos: number;
}

export default function GlicemiaView({
  logs,
  onAddLog,
  onDeleteLog,
  targetMin,
  targetMaxJejum,
  targetMaxPos,
}: GlicemiaViewProps) {
  // Form State
  const [value, setValue] = useState<number>(110);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState<string>(
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
  const [type, setType] = useState<GlucoseLog["type"]>("jejum");
  const [notes, setNotes] = useState<string>("");

  // Filter State
  const [filterType, setFilterType] = useState<GlucoseLog["type"] | "all">("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value <= 0) return;

    // Construct local timestamp
    const timestampStr = `${date}T${time}:00`;

    onAddLog({
      value,
      timestamp: new Date(timestampStr).toISOString(),
      type,
      notes: notes.trim() || undefined,
    });

    // Reset some fields
    setNotes("");
    // Give some success visual signal or keep the user informed.
  };

  // Helper: check range
  const getGlicemiaStatus = (val: number, logType: GlucoseLog["type"]) => {
    const isJejum = logType === "jejum" || logType === "antes_dormir";
    const maxVal = isJejum ? targetMaxJejum : targetMaxPos;

    if (val < targetMin) {
      return {
        label: "Hipoglicemia",
        color: "text-red-700 bg-red-50 border-red-200",
        desc: "Abaixo do limite de segurança.",
        indicator: "🔴",
      };
    } else if (val > maxVal) {
      return {
        label: "Hiperglicemia",
        color: "text-amber-700 bg-amber-50 border-amber-200",
        desc: "Acima da meta ideal definida.",
        indicator: "🟡",
      };
    } else {
      return {
        label: "Na Meta",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        desc: "Excelente controle glicêmico.",
        indicator: "🟢",
      };
    }
  };

  // Group logs by day
  const getGroupedLogs = () => {
    const sorted = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const filtered = filterType === "all" ? sorted : sorted.filter((l) => l.type === filterType);

    const groups: { [key: string]: GlucoseLog[] } = {};
    filtered.forEach((log) => {
      const d = new Date(log.timestamp).toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(log);
    });
    return groups;
  };

  const groupedLogs = getGroupedLogs();

  // Statistics summaries
  const totalLogs = logs.length;
  const hypoglicemias = logs.filter((l) => l.value < targetMin).length;
  const inRangeLogs = logs.filter((log) => {
    const isJejum = log.type === "jejum" || log.type === "antes_dormir";
    const max = isJejum ? targetMaxJejum : targetMaxPos;
    return log.value >= targetMin && log.value <= max;
  }).length;
  const inRangePercentage = totalLogs > 0 ? Math.round((inRangeLogs / totalLogs) * 100) : 0;

  return (
    <div id="glicemia-view-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      {/* Left panel: Form and stats */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-1.5">
            <Plus className="w-5 h-5 text-blue-600" />
            Nova Medição Glicêmica
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Value slider and input */}
            <div>
              <label htmlFor="glucose-value-slider" className="block text-sm font-semibold text-neutral-700 mb-2">
                Valor da Glicemia: <span className="text-blue-600 text-lg font-extrabold">{value}</span> mg/dL
              </label>
              <input
                id="glucose-value-slider"
                type="range"
                min="40"
                max="350"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-2"
              />
              <div className="flex justify-between text-xxs font-semibold text-neutral-400 uppercase tracking-wider">
                <span>40 (Extremo Baixo)</span>
                <span>120 (Normal)</span>
                <span>350 (Extremo Alto)</span>
              </div>
            </div>

            {/* Quick value offset adjusters */}
            <div className="flex gap-1.5 justify-center">
              {[80, 100, 120, 140, 180].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValue(v)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                    value === v
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Period selector */}
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                Momento da Medição
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "jejum", label: "Em Jejum" },
                  { id: "pre_refeicao", label: "Pré-Refeição" },
                  { id: "pos_refeicao", label: "Pós-Refeição" },
                  { id: "antes_dormir", label: "Antes de Dormir" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setType(p.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                      type === p.id
                        ? "bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-500"
                        : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DateTime selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="log-date" className="block text-xxs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Data
                </label>
                <input
                  id="log-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="log-time" className="block text-xxs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Hora
                </label>
                <input
                  id="log-time"
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="glucose-notes" className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1">
                Observações
              </label>
              <input
                id="glucose-notes"
                type="text"
                placeholder="Ex: Tontura leve, dor de cabeça..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-neutral-50 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              Registrar Medição
            </button>
          </form>
        </div>

        {/* Quick analytics card */}
        <div className="bg-neutral-900 text-white p-5 rounded-3xl border border-neutral-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Aderência às Metas
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-neutral-400 text-xs">Total de logs registrados</span>
              <span className="text-lg font-bold text-white">{totalLogs}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-neutral-400 text-xs">Aderência no Alvo (TIR)</span>
              <span className="text-lg font-bold text-emerald-400">{inRangePercentage}%</span>
            </div>
            {hypoglicemias > 0 && (
              <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xxs text-red-300 leading-relaxed">
                  Detectamos <strong>{hypoglicemias} hipoglicemias</strong> recentes. Reduza as doses de insulina ou carboidratos lentos de acordo com as instruções médicas e carregue carboidratos rápidos para reversão instantânea.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel: Historical journal timeline with filters */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Diário de Glicemias</h3>
              <p className="text-xs text-neutral-500">Histórico cronológico detalhado com filtros de período.</p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
              <select
                className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-none"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="all">Todas as medições</option>
                <option value="jejum">Apenas Jejum</option>
                <option value="pre_refeicao">Pré-Refeição</option>
                <option value="pos_refeicao">Pós-Refeição</option>
                <option value="antes_dormir">Antes de Dormir</option>
              </select>
            </div>
          </div>

          {Object.keys(groupedLogs).length > 0 ? (
            <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2">
              {Object.keys(groupedLogs).map((dateGroup) => (
                <div key={dateGroup} className="space-y-2">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-2">
                    {dateGroup}
                  </h4>
                  <div className="space-y-2">
                    {groupedLogs[dateGroup].map((log) => {
                      const stat = getGlicemiaStatus(log.value, log.type);
                      const displayTime = new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200/60 rounded-2xl transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            {/* Circle Indicator */}
                            <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 shadow-3xs flex flex-col items-center justify-center">
                              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider scale-90">
                                {log.type === "jejum" && "JEJ"}
                                {log.type === "pre_refeicao" && "PRÉ"}
                                {log.type === "pos_refeicao" && "PÓS"}
                                {log.type === "antes_dormir" && "SON"}
                                {log.type === "outros" && "OUT"}
                              </span>
                              <span className="text-xxs text-neutral-400 font-medium scale-90 -mt-0.5">
                                {displayTime}
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-neutral-900 tracking-tight">
                                  {log.value}
                                </span>
                                <span className="text-xxs text-neutral-400 font-bold">mg/dL</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xxs font-bold uppercase tracking-wider border ${stat.color}`}>
                                  {stat.label}
                                </span>
                                {log.notes && (
                                  <span className="text-neutral-500 text-xxs truncate max-w-xs block">
                                    • {log.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onDeleteLog(log.id)}
                              className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Excluir medição"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-neutral-400">
              <Calendar className="w-8 h-8 mx-auto text-neutral-200 mb-2" />
              <p className="text-xs">Nenhum registro glicêmico encontrado com esse filtro.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
