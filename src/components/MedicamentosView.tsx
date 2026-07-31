import React, { useState } from "react";
import { MedicationLog, InsulinLog, InsulinType } from "../types";
import { Plus, Trash2, Clock, Sparkles, Check, AlertCircle, Bell, Syringe, Pill, ShieldCheck } from "lucide-react";

interface MedicamentosViewProps {
  logs: MedicationLog[];
  onAddLog: (med: Omit<MedicationLog, "id" | "status">) => void;
  onToggleStatus: (id: string) => void;
  onDeleteLog: (id: string) => void;

  insulinLogs?: InsulinLog[];
  onAddInsulinLog?: (ins: Omit<InsulinLog, "id" | "status">) => void;
  onToggleInsulinStatus?: (id: string) => void;
  onDeleteInsulinLog?: (id: string) => void;
}

export default function MedicamentosView({
  logs,
  onAddLog,
  onToggleStatus,
  onDeleteLog,
  insulinLogs = [],
  onAddInsulinLog,
  onToggleInsulinStatus,
  onDeleteInsulinLog,
}: MedicamentosViewProps) {
  const [activeTab, setActiveTab] = useState<"medications" | "insulin">("medications");
  
  // Notification Permission state
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  });

  // Oral Medication Form state
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [timeScheduled, setTimeScheduled] = useState("08:00");
  const [medNotes, setMedNotes] = useState("");

  // Insulin Form state
  const [insulinType, setInsulinType] = useState<InsulinType>("lenta_basal");
  const [customName, setCustomName] = useState("");
  const [doseUnits, setDoseUnits] = useState<number>(14);
  const [insulinTimeScheduled, setInsulinTimeScheduled] = useState("22:00");
  const [applicationSite, setApplicationSite] = useState<InsulinLog["applicationSite"]>("coxa");
  const [insulinNotes, setInsulinNotes] = useState("");

  const handleRequestNotification = async () => {
    if (typeof Notification === "undefined") {
      alert("Seu navegador não possui suporte para notificações de sistema.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotificationsEnabled(true);
      new Notification("Glico AI - Lembretes Ativados!", {
        body: "Você receberá alertas automáticos para tomadas de medicamentos e aplicações de insulina nos horários agendados.",
        icon: "/favicon.ico"
      });
    } else {
      alert("Permissão para notificações foi negada no navegador.");
    }
  };

  const handleSubmitMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dose.trim()) return;

    onAddLog({
      name: name.trim(),
      dose: dose.trim(),
      timeScheduled,
      notes: medNotes.trim() || undefined,
    });

    setName("");
    setDose("");
    setMedNotes("");
  };

  const handleSubmitInsulin = (e: React.FormEvent) => {
    e.preventDefault();
    if (doseUnits <= 0 || !onAddInsulinLog) return;

    const defaultNames: Record<InsulinType, string> = {
      ultrarrapida: "Insulina Ultrarrápida (Humalog/Novorap)",
      rapida: "Insulina Rápida (Regular)",
      nph: "Insulina NPH (Intermediária)",
      lenta_basal: "Insulina Lenta/Basal (Lantus/Tresiba/Toujeo)"
    };

    onAddInsulinLog({
      type: insulinType,
      customName: customName.trim() || defaultNames[insulinType],
      doseUnits: Number(doseUnits),
      timeScheduled: insulinTimeScheduled,
      applicationSite,
      notes: insulinNotes.trim() || undefined,
    });

    setCustomName("");
    setInsulinNotes("");
  };

  // Stats
  const totalMeds = logs.length;
  const takenMeds = logs.filter((l) => l.status === "aplicado").length;
  
  const totalInsulin = insulinLogs.length;
  const takenInsulin = insulinLogs.filter((l) => l.status === "aplicado").length;

  const totalDoses = totalMeds + totalInsulin;
  const totalTaken = takenMeds + takenInsulin;
  const progressPercent = totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 0;

  return (
    <div id="medicamentos-container" className="space-y-6 pb-12 font-sans">
      
      {/* Notifications Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-3xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-blue-300 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Lembretes e Notificações Automáticas</h3>
            <p className="text-xs text-blue-200 mt-0.5 leading-relaxed">
              Receba alertas visuais e sonoros nos horários exatos de tomadas de medicação e aplicação de insulina.
            </p>
          </div>
        </div>
        <button
          onClick={handleRequestNotification}
          disabled={notificationsEnabled}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            notificationsEnabled
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-md"
          }`}
        >
          {notificationsEnabled ? (
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Lembretes Ativos
            </span>
          ) : (
            "Ativar Lembretes no Navegador"
          )}
        </button>
      </div>

      {/* Navigation Tabs (Medicamentos Orais vs. Insulina) */}
      <div className="flex bg-neutral-100 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab("medications")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "medications"
              ? "bg-white text-neutral-900 shadow-xs"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Pill className="w-4 h-4 text-blue-600" />
          Comprimidos / Medicamentos ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab("insulin")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "insulin"
              ? "bg-white text-neutral-900 shadow-xs"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Syringe className="w-4 h-4 text-indigo-600" />
          Insulina ({insulinLogs.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left panel: Form */}
        <div className="lg:col-span-1 space-y-6">
          {activeTab === "medications" ? (
            <div className="bg-white p-6 rounded-3xl border border-neutral-150 shadow-2xs">
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-blue-600" />
                Cadastrar Medicamento Oral
              </h3>

              <form onSubmit={handleSubmitMedication} className="space-y-4">
                <div>
                  <label htmlFor="med-name" className="block text-xs font-medium text-neutral-700 mb-1">
                    Nome do Medicamento
                  </label>
                  <input
                    id="med-name"
                    type="text"
                    placeholder="Ex: Metformina, Gliclazida, Dapagliflozina"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="med-dose" className="block text-xs font-medium text-neutral-700 mb-1">
                      Dosagem
                    </label>
                    <input
                      id="med-dose"
                      type="text"
                      placeholder="Ex: 850mg, 1 cp"
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="med-time" className="block text-xs font-medium text-neutral-700 mb-1">
                      Horário
                    </label>
                    <input
                      id="med-time"
                      type="time"
                      value={timeScheduled}
                      onChange={(e) => setTimeScheduled(e.target.value)}
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="med-notes" className="block text-xs font-medium text-neutral-700 mb-1">
                    Observações (Opcional)
                  </label>
                  <input
                    id="med-notes"
                    type="text"
                    placeholder="Ex: Tomar após as refeições"
                    value={medNotes}
                    onChange={(e) => setMedNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Agendar Medicamento
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-neutral-150 shadow-2xs">
              <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-indigo-600" />
                Cadastrar Aplicação de Insulina
              </h3>

              <form onSubmit={handleSubmitInsulin} className="space-y-4">
                <div>
                  <label htmlFor="ins-type" className="block text-xs font-medium text-neutral-700 mb-1">
                    Tipo de Insulina
                  </label>
                  <select
                    id="ins-type"
                    value={insulinType}
                    onChange={(e) => setInsulinType(e.target.value as InsulinType)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="lenta_basal">Lenta / Basal (Lantus, Tresiba, Toujeo, Levemir)</option>
                    <option value="ultrarrapida">Ultrarrápida (Humalog, Novorap, Apidra, Fiasp)</option>
                    <option value="rapida">Rápida (Regular)</option>
                    <option value="nph">NPH (Intermediária)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ins-name" className="block text-xs font-medium text-neutral-700 mb-1">
                    Nome Comercial / Rótulo (Opcional)
                  </label>
                  <input
                    id="ins-name"
                    type="text"
                    placeholder="Ex: Insulina Lantus SoloStar"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ins-units" className="block text-xs font-medium text-neutral-700 mb-1">
                      Dose (Unidades UI)
                    </label>
                    <input
                      id="ins-units"
                      type="number"
                      min="1"
                      value={doseUnits}
                      onChange={(e) => setDoseUnits(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="ins-time" className="block text-xs font-medium text-neutral-700 mb-1">
                      Horário Programado
                    </label>
                    <input
                      id="ins-time"
                      type="time"
                      value={insulinTimeScheduled}
                      onChange={(e) => setInsulinTimeScheduled(e.target.value)}
                      className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ins-site" className="block text-xs font-medium text-neutral-700 mb-1">
                    Local Recomendado de Aplicação
                  </label>
                  <select
                    id="ins-site"
                    value={applicationSite}
                    onChange={(e) => setApplicationSite(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="abdomen">Abdômen (Absorção rápida)</option>
                    <option value="coxa">Coxa (Absorção lenta)</option>
                    <option value="braco">Braço (Absorção média)</option>
                    <option value="gluteo">Glúteo (Absorção lenta)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="ins-notes" className="block text-xs font-medium text-neutral-700 mb-1">
                    Observações (Opcional)
                  </label>
                  <input
                    id="ins-notes"
                    type="text"
                    placeholder="Ex: Correção de hiperglicemia pós-almoço"
                    value={insulinNotes}
                    onChange={(e) => setInsulinNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl bg-neutral-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Agendar Aplicação de Insulina
                </button>
              </form>
            </div>
          )}

          {/* Adherence Card */}
          <div className="bg-neutral-900 text-white p-5 rounded-3xl border border-neutral-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Meta de Adesão Geral Hoje
            </h4>
            
            <div className="flex justify-between items-baseline">
              <span className="text-neutral-400 text-xs">Total Concluído</span>
              <span className="text-lg font-bold text-white">
                {totalTaken} de {totalDoses} doses
              </span>
            </div>

            <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {progressPercent === 100 && totalDoses > 0 ? (
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xxs text-emerald-300 leading-normal">
                  Excelente! Todas as doses de medicamentos e aplicações de insulina programadas para hoje foram concluídas.
                </p>
              </div>
            ) : (
              <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xxs text-amber-300 leading-normal">
                  Siga os horários prescritos por seu endocrinologista. O cumprimento pontual estabiliza a variabilidade glicêmica.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Active tracker list */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "medications" ? (
            <div className="bg-white p-6 rounded-3xl border border-neutral-150 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Agenda de Medicamentos Orais</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Clique na caixa de seleção ao lado do remédio para confirmar a tomada.</p>
              </div>

              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map((med) => (
                    <div
                      key={med.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 group ${
                        med.status === "aplicado"
                          ? "bg-emerald-50/40 border-emerald-150"
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
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xxs font-semibold text-neutral-500">Dose: {med.dose}</span>
                            <span className="text-neutral-300">•</span>
                            <span className="inline-flex items-center gap-1 text-xxs font-bold text-neutral-600">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              Previsto: {med.timeScheduled}
                            </span>
                            {med.notes && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="text-xxs text-neutral-400 italic">{med.notes}</span>
                              </>
                            )}
                            {med.status === "aplicado" && med.timestamp && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="text-xxs font-bold text-emerald-600">
                                  Tomado às {new Date(med.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteLog(med.id)}
                        className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Excluir agendamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-neutral-400 text-xs bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  Nenhum medicamento oral agendado ainda. Utilize o formulário ao lado para cadastrar.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-neutral-150 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Agenda de Aplicações de Insulina</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Confirme cada aplicação e acompanhe o local e dose prescrita.</p>
              </div>

              {insulinLogs.length > 0 ? (
                <div className="space-y-3">
                  {insulinLogs.map((ins) => (
                    <div
                      key={ins.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 group ${
                        ins.status === "aplicado"
                          ? "bg-emerald-50/40 border-emerald-150"
                          : "bg-neutral-50 border-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => onToggleInsulinStatus?.(ins.id)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            ins.status === "aplicado"
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-neutral-300 bg-white hover:border-indigo-500"
                          }`}
                        >
                          {ins.status === "aplicado" ? <Check className="w-4 h-4" /> : null}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-bold ${ins.status === "aplicado" ? "line-through text-neutral-400" : "text-neutral-900"}`}>
                              {ins.customName || ins.type.toUpperCase()}
                            </h4>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {ins.type.replace("_", " ")}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xxs font-extrabold text-neutral-700">Dose: {ins.doseUnits} UI</span>
                            <span className="text-neutral-300">•</span>
                            <span className="inline-flex items-center gap-1 text-xxs font-bold text-neutral-600">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              Previsto: {ins.timeScheduled}
                            </span>
                            {ins.applicationSite && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="text-xxs text-neutral-500 capitalize">Local: {ins.applicationSite}</span>
                              </>
                            )}
                            {ins.notes && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="text-xxs text-neutral-400 italic">{ins.notes}</span>
                              </>
                            )}
                            {ins.status === "aplicado" && ins.timestamp && (
                              <>
                                <span className="text-neutral-300">•</span>
                                <span className="text-xxs font-bold text-emerald-600">
                                  Aplicado às {new Date(ins.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteInsulinLog?.(ins.id)}
                        className="p-2 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Excluir agendamento de insulina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-neutral-400 text-xs bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  Nenhum registro de insulina agendado. Alterne no menu ao lado para programar sua rotina de insulina.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
