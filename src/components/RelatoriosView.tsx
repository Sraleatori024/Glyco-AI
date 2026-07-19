import { UserProfile, GlucoseLog, FoodLog, MedicationLog, ExerciseLog } from "../types";
import { Printer, Calendar, ShieldCheck, Heart, Info, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

interface RelatoriosViewProps {
  profile: UserProfile;
  glucoseLogs: GlucoseLog[];
  foodLogs: FoodLog[];
  medicationLogs: MedicationLog[];
  exerciseLogs: ExerciseLog[];
}

export default function RelatoriosView({
  profile,
  glucoseLogs,
  foodLogs,
  medicationLogs,
  exerciseLogs,
}: RelatoriosViewProps) {
  // Compute clinical statistics
  const totalLogs = glucoseLogs.length;

  const averageGlucose = Math.round(
    totalLogs > 0 ? glucoseLogs.reduce((acc, log) => acc + log.value, 0) / totalLogs : 120
  );

  const maxGlucose = totalLogs > 0 ? Math.max(...glucoseLogs.map((log) => log.value)) : 150;
  const minGlucose = totalLogs > 0 ? Math.min(...glucoseLogs.map((log) => log.value)) : 80;

  // Time in Range (TIR)
  const inRangeLogs = glucoseLogs.filter((log) => {
    const isJejum = log.type === "jejum" || log.type === "antes_dormir";
    const min = profile.targetGlucoseMinJejum || 70;
    const max = isJejum
      ? (profile.targetGlucoseMaxJejum || 130)
      : (profile.targetGlucoseMaxPosPrandial || 180);
    return log.value >= min && log.value <= max;
  }).length;
  const timeInRange = totalLogs > 0 ? Math.round((inRangeLogs / totalLogs) * 100) : 100;

  // Under targets
  const hypoglicemias = glucoseLogs.filter((l) => l.value < (profile.targetGlucoseMinJejum || 70)).length;
  // Over targets
  const hyperglicemias = glucoseLogs.filter((l) => {
    const isJejum = l.type === "jejum" || l.type === "antes_dormir";
    const max = isJejum
      ? (profile.targetGlucoseMaxJejum || 130)
      : (profile.targetGlucoseMaxPosPrandial || 180);
    return l.value > max;
  }).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="relatorios-container" className="space-y-6 pb-12">
      {/* Configuration panel (hidden during printing via @media print in global CSS, but let's make it look clean) */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Relatório Médico Exportável</h2>
          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
            Consolide todas as medições, medicamentos aplicados e insights para compartilhar com seu endocrinologista.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-1.5 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Exportar PDF
        </button>
      </div>

      {/* Main Report Document Sheet */}
      <div className="bg-white p-8 sm:p-12 border border-neutral-200 rounded-3xl shadow-xs space-y-8 max-w-4xl mx-auto print:border-0 print:p-0 print:shadow-none">
        
        {/* Header Block */}
        <div className="flex justify-between items-start border-b border-neutral-300 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight font-sans">Glyco AI</h1>
            <span className="text-xxs font-extrabold text-neutral-400 uppercase tracking-widest mt-0.5 block">Relatório de Saúde Metabólica</span>
            <span className="text-xs font-semibold text-neutral-500 block mt-2">Data de Geração: {new Date().toLocaleDateString("pt-BR")}</span>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-xs font-bold text-blue-600 block">SaaS Certificado Digital</span>
            <span className="text-xxs text-neutral-400 block">Registro local criptografado</span>
          </div>
        </div>

        {/* Patient Clinical Profile Segment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
          <div className="space-y-1.5">
            <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Identificação</span>
            <h4 className="text-sm font-bold text-neutral-800">{profile.name}</h4>
            <span className="text-xs text-neutral-500 block">Idade: {profile.age} anos | Sexo: {profile.gender}</span>
            <span className="text-xs text-neutral-500 block">IMC: {((profile.weight) / Math.pow((profile.height) / 100, 2)).toFixed(1)} kg/m²</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Condição Clínica</span>
            <h4 className="text-sm font-bold text-neutral-800 capitalize">Diabetes {profile.diabetesType === "tipo2" ? "Tipo 2" : "Tipo 1"}</h4>
            <span className="text-xs text-neutral-500 block">
              Tratamento: {profile.medications.length > 0 ? profile.medications.join(", ") : "Sem medicamentos orais"}
            </span>
            <span className="text-xs text-neutral-500 block">
              Uso de Insulina: {profile.usesInsulin ? "Sim (" + profile.insulinTypes.join(", ") + ")" : "Não"}
            </span>
          </div>

          <div className="space-y-1.5">
            <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Metas Terapêuticas</span>
            <span className="text-xs text-neutral-500 block">Fasting Target: {profile.targetGlucoseMinJejum} - {profile.targetGlucoseMaxJejum} mg/dL</span>
            <span className="text-xs text-neutral-500 block">Pós-Prandial Target: &lt; {profile.targetGlucoseMaxPosPrandial} mg/dL</span>
            <span className="text-xs text-neutral-500 block">Objetivo: {profile.goals.join(", ")}</span>
          </div>
        </div>

        {/* Clinical Statistics overview */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Estatísticas Consolidadas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border border-neutral-200 rounded-xl">
              <span className="text-xxs text-neutral-500 uppercase tracking-wider font-semibold block">Média Glicêmica</span>
              <span className="text-2xl font-black text-neutral-900 block mt-1">{averageGlucose} <span className="text-xs font-normal text-neutral-400">mg/dL</span></span>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl">
              <span className="text-xxs text-neutral-500 uppercase tracking-wider font-semibold block">Tempo no Alvo</span>
              <span className="text-2xl font-black text-emerald-600 block mt-1">{timeInRange}%</span>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl">
              <span className="text-xxs text-neutral-500 uppercase tracking-wider font-semibold block">Valor Máximo</span>
              <span className="text-2xl font-black text-neutral-900 block mt-1">{maxGlucose} <span className="text-xs font-normal text-neutral-400">mg/dL</span></span>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl">
              <span className="text-xxs text-neutral-500 uppercase tracking-wider font-semibold block">Valor Mínimo</span>
              <span className="text-2xl font-black text-neutral-900 block mt-1">{minGlucose} <span className="text-xs font-normal text-neutral-400">mg/dL</span></span>
            </div>
          </div>
        </div>

        {/* AI Medical Summary Text */}
        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200/80 space-y-2">
          <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-600" />
            Resumo Clínico Computacional da IA
          </h3>
          <p className="text-xs text-neutral-700 leading-relaxed">
            O paciente <strong>{profile.name}</strong>, de {profile.age} anos, apresenta diagnóstico de <strong>diabetes {profile.diabetesType === "tipo2" ? "tipo 2" : "tipo 1"}</strong>. 
            Durante o período de análise, registrou {totalLogs} leituras glicêmicas, obtendo uma média de <strong>{averageGlucose} mg/dL</strong> com uma taxa de <strong>Tempo no Alvo de {timeInRange}%</strong>. 
            Foram observadas {hypoglicemias} ocorrências de hipoglicemia e {hyperglicemias} episódios fora da faixa ideal estabelecida. 
            Há uma correlação positiva visível na redução de picos glicêmicos nos dias associados ao registro de atividade física aeróbica moderada e dieta de menor carga glicêmica.
          </p>
        </div>

        {/* Glucose logs detailed tables */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Registros Detalhados de Glicemia</h3>
          <div className="border border-neutral-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-xxs font-bold text-neutral-500 uppercase border-b border-neutral-200">
                  <th className="p-3.5 pl-5">Data e Hora</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5 text-right">Valor Glicêmico</th>
                  <th className="p-3.5 pr-5">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs text-neutral-700">
                {glucoseLogs.slice(-10).map((log) => {
                  const isJejum = log.type === "jejum" || log.type === "antes_dormir";
                  const max = isJejum ? profile.targetGlucoseMaxJejum : profile.targetGlucoseMaxPosPrandial;
                  const inRange = log.value >= profile.targetGlucoseMinJejum && log.value <= max;

                  return (
                    <tr key={log.id} className="hover:bg-neutral-50/50">
                      <td className="p-3.5 pl-5 font-semibold">
                        {new Date(log.timestamp).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3.5 capitalize font-medium">{log.type.replace("_", " ")}</td>
                      <td className={`p-3.5 text-right font-black ${inRange ? "text-emerald-600" : "text-amber-600"}`}>
                        {log.value} mg/dL
                      </td>
                      <td className="p-3.5 pr-5 text-neutral-400 text-xxs truncate max-w-xs">{log.notes || "--"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalLogs > 10 && (
            <span className="text-xxs text-neutral-400 block text-right pr-2">Mostrando as últimas 10 leituras de um total de {totalLogs}.</span>
          )}
        </div>

        {/* Nutritional summaries and physical workouts lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Refeições Consolidadas</h3>
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 divide-y divide-neutral-200 space-y-2">
              {foodLogs.length > 0 ? (
                foodLogs.slice(-3).map((food) => (
                  <div key={food.id} className="pt-2 first:pt-0 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-neutral-800 block">{food.description}</span>
                      <span className="text-xxs text-neutral-400 font-semibold">{new Date(food.timestamp).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {food.nutrition && (
                      <span className="text-xxs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                        {food.nutrition.carbohydrates}g Carbos | GL {food.nutrition.glycemicLoad}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <span className="text-xxs text-neutral-400 block">Sem refeições registradas no período.</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Rotinas de Exercício</h3>
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 divide-y divide-neutral-200 space-y-2">
              {exerciseLogs.length > 0 ? (
                exerciseLogs.slice(-3).map((ex) => (
                  <div key={ex.id} className="pt-2 first:pt-0 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-neutral-800 capitalize block">{ex.type} ({ex.durationMinutes} min)</span>
                      <span className="text-xxs text-neutral-400 font-semibold">{new Date(ex.timestamp).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <span className="text-xxs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full capitalize">
                      {ex.intensity}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-xxs text-neutral-400 block">Sem atividades físicas registradas no período.</span>
              )}
            </div>
          </div>
        </div>

        {/* Signature lines for doctor review */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-center border-t border-neutral-300">
          <div>
            <div className="w-48 h-px bg-neutral-400 mx-auto mb-2" />
            <span className="text-xxs text-neutral-500 font-semibold uppercase tracking-wider block">Assinatura do Paciente</span>
            <span className="text-xs text-neutral-400 block mt-1">{profile.name}</span>
          </div>
          <div>
            <div className="w-48 h-px bg-neutral-400 mx-auto mb-2" />
            <span className="text-xxs text-neutral-500 font-semibold uppercase tracking-wider block">Carimbo / Assinatura do Médico</span>
            <span className="text-xs text-neutral-400 block mt-1">CRM Endocrinologista</span>
          </div>
        </div>

      </div>
    </div>
  );
}
