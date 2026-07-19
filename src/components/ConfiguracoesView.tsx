import React, { useState } from "react";
import { UserProfile } from "../types";
import { Settings, Shield, Target, Bell, Heart, Save, CheckCircle, Database, Moon, Sun } from "lucide-react";

interface ConfiguracoesViewProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onResetData: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function ConfiguracoesView({
  profile,
  onUpdateProfile,
  onResetData,
  darkMode,
  onToggleDarkMode,
}: ConfiguracoesViewProps) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [height, setHeight] = useState(profile.height);
  const [weight, setWeight] = useState(profile.weight);
  const [diabetesType, setDiabetesType] = useState(profile.diabetesType);
  const [targetGlucoseMinJejum, setTargetGlucoseMinJejum] = useState(profile.targetGlucoseMinJejum);
  const [targetGlucoseMaxJejum, setTargetGlucoseMaxJejum] = useState(profile.targetGlucoseMaxJejum);
  const [targetGlucoseMaxPosPrandial, setTargetGlucoseMaxPosPrandial] = useState(profile.targetGlucoseMaxPosPrandial);

  // Simulated alert toggles
  const [alertHipo, setAlertHipo] = useState(true);
  const [alertHiper, setAlertHiper] = useState(true);
  const [remindMed, setRemindMed] = useState(true);

  const [savedSignal, setSavedSignal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onUpdateProfile({
      ...profile,
      name,
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      diabetesType,
      targetGlucoseMinJejum: Number(targetGlucoseMinJejum),
      targetGlucoseMaxJejum: Number(targetGlucoseMaxJejum),
      targetGlucoseMaxPosPrandial: Number(targetGlucoseMaxPosPrandial),
    });

    setSavedSignal(true);
    setTimeout(() => setSavedSignal(false), 2500);
  };

  return (
    <div id="settings-view-container" className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      {/* Settings Form */}
      <div className="lg:col-span-2 bg-white p-6 sm:p-8 border border-neutral-100 rounded-3xl shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-neutral-900">Configurações do Perfil</h3>
          </div>
          {savedSignal && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5" />
              Salvo com sucesso!
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General data */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Informações Pessoais</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-name" className="block text-xs font-medium text-neutral-700 mb-1">
                  Nome Completo
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="settings-age" className="block text-xs font-medium text-neutral-700 mb-1">
                  Idade
                </label>
                <input
                  id="settings-age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="settings-height" className="block text-xs font-medium text-neutral-700 mb-1">
                  Altura (cm)
                </label>
                <input
                  id="settings-height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="settings-weight" className="block text-xs font-medium text-neutral-700 mb-1">
                  Peso (kg)
                </label>
                <input
                  id="settings-weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Targets Configuration Section */}
          <div className="space-y-4 pt-4 border-t border-neutral-150">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
              <Target className="w-4 h-4 text-blue-600" />
              Configuração das Metas Glicêmicas
            </h4>
            <p className="text-xxs text-neutral-500 leading-normal">
              Ajuste as faixas ideais recomendadas por seu endocrinologista para recalcular os gráficos e Tempo no Alvo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
              <div>
                <label htmlFor="settings-target-min" className="block text-xxs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Mín. Jejum (mg/dL)
                </label>
                <input
                  id="settings-target-min"
                  type="number"
                  value={targetGlucoseMinJejum}
                  onChange={(e) => setTargetGlucoseMinJejum(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="settings-target-max-jejum" className="block text-xxs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Máx. Jejum (mg/dL)
                </label>
                <input
                  id="settings-target-max-jejum"
                  type="number"
                  value={targetGlucoseMaxJejum}
                  onChange={(e) => setTargetGlucoseMaxJejum(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="settings-target-max-pos" className="block text-xxs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  Máx. Pós-Almoço (mg/dL)
                </label>
                <input
                  id="settings-target-max-pos"
                  type="number"
                  value={targetGlucoseMaxPosPrandial}
                  onChange={(e) => setTargetGlucoseMaxPosPrandial(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Salvar Alterações
          </button>
        </form>
      </div>

      {/* Sidebar Utilities */}
      <div className="lg:col-span-1 space-y-6">
        {/* Theme select & system togglers */}
        <div className="bg-white p-6 border border-neutral-100 rounded-3xl shadow-2xs space-y-4">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Tema do Aplicativo</h4>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-700 font-semibold">Simular Modo Escuro</span>
            <button
              onClick={onToggleDarkMode}
              className={`p-2 rounded-xl border transition-all ${
                darkMode ? "bg-neutral-900 border-neutral-800 text-yellow-400" : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-150"
              }`}
              title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Notifications and Safety alerts config */}
        <div className="bg-white p-6 border border-neutral-100 rounded-3xl shadow-2xs space-y-4">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
            <Bell className="w-3.5 h-3.5 text-blue-600" />
            Configuração de Alertas
          </h4>
          <p className="text-xxs text-neutral-500 leading-normal">
            Receba lembretes sonoros ou avisos rápidos ao atingir leituras fora das metas.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-800 block">Alerta Hipoglicemia</span>
                <span className="text-xxs text-neutral-400 font-semibold block">Glicemias abaixo de {targetGlucoseMinJejum} mg/dL</span>
              </div>
              <button
                type="button"
                onClick={() => setAlertHipo(!alertHipo)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  alertHipo ? "bg-blue-600" : "bg-neutral-300"
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  alertHipo ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-800 block">Alerta Hiperglicemia</span>
                <span className="text-xxs text-neutral-400 font-semibold block">Glicemias acima de {targetGlucoseMaxPosPrandial} mg/dL</span>
              </div>
              <button
                type="button"
                onClick={() => setAlertHiper(!alertHiper)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  alertHiper ? "bg-blue-600" : "bg-neutral-300"
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  alertHiper ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-800 block">Lembretes de Doses</span>
                <span className="text-xxs text-neutral-400 font-semibold block">Notificação de medicamentos e insulina</span>
              </div>
              <button
                type="button"
                onClick={() => setRemindMed(!remindMed)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  remindMed ? "bg-blue-600" : "bg-neutral-300"
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  remindMed ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Data administration card */}
        <div className="bg-white p-6 border border-neutral-100 rounded-3xl shadow-2xs space-y-4">
          <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            Administração de Dados
          </h4>
          <p className="text-xxs text-neutral-500 leading-normal">
            Você pode limpar todo o armazenamento local e restaurar os dados de demonstração originais caso queira testar a onboarding ou o dashboard do início.
          </p>

          <button
            onClick={() => {
              if (confirm("Tem certeza que deseja apagar todos os dados registrados localmente? Esta ação é irreversível e resetará o aplicativo.")) {
                onResetData();
              }
            }}
            className="w-full py-2.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Resetar Todos os Dados
          </button>
        </div>
      </div>
    </div>
  );
}
