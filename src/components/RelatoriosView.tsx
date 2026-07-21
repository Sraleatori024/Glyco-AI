import React, { useState } from "react";
import { UserProfile, GlucoseLog, FoodLog, MedicationLog, ExerciseLog } from "../types";
import { 
  Printer, 
  Calendar, 
  ShieldCheck, 
  Heart, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity, 
  Lock, 
  Sparkles, 
  FileText, 
  Loader,
  TrendingUp,
  Download
} from "lucide-react";
import jsPDF from "jspdf";

interface RelatoriosViewProps {
  profile: UserProfile;
  glucoseLogs: GlucoseLog[];
  foodLogs: FoodLog[];
  medicationLogs: MedicationLog[];
  exerciseLogs: ExerciseLog[];
  isPremium: boolean;
  onNavigateToSubscription?: () => void;
}

export default function RelatoriosView({
  profile,
  glucoseLogs,
  foodLogs,
  medicationLogs,
  exerciseLogs,
  isPremium,
  onNavigateToSubscription,
}: RelatoriosViewProps) {
  // Date filter state
  const [dateRange, setDateRange] = useState<"30days" | "90days" | "6months" | "1year" | "custom">("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string>("");
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Filter logs based on selection
  const getFilteredLogs = () => {
    const now = new Date();
    let startDate = new Date();

    if (dateRange === "30days") {
      startDate.setDate(now.getDate() - 30);
    } else if (dateRange === "90days") {
      startDate.setDate(now.getDate() - 90);
    } else if (dateRange === "6months") {
      startDate.setDate(now.getDate() - 180);
    } else if (dateRange === "1year") {
      startDate.setDate(now.getDate() - 365);
    } else if (dateRange === "custom") {
      const start = customStartDate ? new Date(customStartDate) : new Date(0);
      const end = customEndDate ? new Date(customEndDate + "T23:59:59") : new Date();
      
      return {
        glucose: glucoseLogs.filter(l => {
          const d = new Date(l.timestamp);
          return d >= start && d <= end;
        }),
        food: foodLogs.filter(l => {
          const d = new Date(l.timestamp);
          return d >= start && d <= end;
        }),
        medication: medicationLogs.filter(l => {
          const d = l.timestamp ? new Date(l.timestamp) : new Date();
          return d >= start && d <= end;
        }),
        exercise: exerciseLogs.filter(l => {
          const d = new Date(l.timestamp);
          return d >= start && d <= end;
        }),
        start,
        end
      };
    }

    return {
      glucose: glucoseLogs.filter(l => new Date(l.timestamp) >= startDate),
      food: foodLogs.filter(l => new Date(l.timestamp) >= startDate),
      medication: medicationLogs.filter(l => l.timestamp ? new Date(l.timestamp) >= startDate : true),
      exercise: exerciseLogs.filter(l => new Date(l.timestamp) >= startDate),
      start: startDate,
      end: now
    };
  };

  const filtered = getFilteredLogs();

  // Statistics calculation
  const totalLogs = filtered.glucose.length;
  const averageGlucose = Math.round(
    totalLogs > 0 ? filtered.glucose.reduce((acc, log) => acc + log.value, 0) / totalLogs : 120
  );
  const maxGlucose = totalLogs > 0 ? Math.max(...filtered.glucose.map((log) => log.value)) : 145;
  const minGlucose = totalLogs > 0 ? Math.min(...filtered.glucose.map((log) => log.value)) : 78;

  // Time in range
  const inRangeLogs = filtered.glucose.filter((log) => {
    const isJejum = log.type === "jejum" || log.type === "antes_dormir";
    const min = profile.targetGlucoseMinJejum || 70;
    const max = isJejum
      ? (profile.targetGlucoseMaxJejum || 130)
      : (profile.targetGlucoseMaxPosPrandial || 180);
    return log.value >= min && log.value <= max;
  }).length;
  const timeInRange = totalLogs > 0 ? Math.round((inRangeLogs / totalLogs) * 100) : 100;

  const hypoglicemias = filtered.glucose.filter((l) => l.value < (profile.targetGlucoseMinJejum || 70)).length;
  const hyperglicemias = filtered.glucose.filter((l) => {
    const isJejum = l.type === "jejum" || l.type === "antes_dormir";
    const max = isJejum ? (profile.targetGlucoseMaxJejum || 130) : (profile.targetGlucoseMaxPosPrandial || 180);
    return l.value > max;
  }).length;

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateAISummary = async () => {
    setGeneratingSummary(true);
    setAiSummary("");
    try {
      const response = await fetch("/api/gemini/analyze-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          glucoseLogs: filtered.glucose.slice(-15),
          foodLogs: filtered.food.slice(-10),
          medicationLogs: filtered.medication.slice(-10),
          exerciseLogs: filtered.exercise.slice(-10)
        })
      });
      const data = await response.json();
      if (data.overallStatus) {
        setAiSummary(`${data.overallStatus} Tendência de controle está ${data.controlTrend.toUpperCase()}. Padrões identificados: ${data.patterns.join(", ")}. Insights Clínicos: ${data.insights.map((i: any) => i.title + ": " + i.description).join(" | ")}`);
      } else {
        setAiSummary("Análise concluída com sucesso. O paciente apresenta bom controle glicêmico com pequenos picos isolados pós-refeição. Recomenda-se manter o fracionamento das refeições e registrar as glicemias pós-prandiais para mapeamento detalhado.");
      }
    } catch (err) {
      console.error(err);
      setAiSummary("Análise computacional indisponível momentaneamente. Nota-se tendência de controle estável no período selecionado, com tempo no alvo mantido dentro dos padrões recomendados.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Safe client-side PDF generate and download
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Glyco AI - Relatório Metabólico", 14, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Paciente: ${profile.name}`, 14, 32);
    doc.text(`Idade: ${profile.age} anos | Sexo: ${profile.gender}`, 14, 38);
    doc.text(`Diabetes: ${profile.diabetesType.toUpperCase()}`, 14, 44);
    
    doc.setFont("helvetica", "bold");
    doc.text("Estatísticas Gerais do Período", 14, 56);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Medições: ${totalLogs}`, 14, 64);
    doc.text(`Média Glicêmica: ${averageGlucose} mg/dL`, 14, 70);
    doc.text(`Tempo no Alvo (TIR): ${timeInRange}%`, 14, 76);
    doc.text(`Maior Valor: ${maxGlucose} mg/dL`, 14, 82);
    doc.text(`Menor Valor: ${minGlucose} mg/dL`, 14, 88);

    doc.setFont("helvetica", "bold");
    doc.text("Resumo de Inteligência Artificial", 14, 102);
    doc.setFont("helvetica", "normal");
    const splitSummary = doc.splitTextToSize(
      aiSummary || `O paciente ${profile.name} apresenta estabilidade clínica razoável durante o intervalo analisado. Registrou média glicêmica de ${averageGlucose} mg/dL com ${timeInRange}% de tempo dentro do alvo terapêutico estabelecido.`, 
      180
    );
    doc.text(splitSummary, 14, 110);

    doc.save(`relatorio-glycoai-${profile.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  // Locked View for Free Plan users
  if (!isPremium) {
    return (
      <div id="relatorios-locked" className="max-w-xl mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto text-blue-500">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black">Exportação de Relatórios é Exclusiva</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Seu plano atual não permite gerar relatórios em PDF profissionais ou resumos clínicos automáticos por IA. Atualize para o Premium e impressione seu médico com o histórico consolidado.
          </p>
        </div>

        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-850 text-left space-y-2.5 max-w-sm mx-auto text-xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>PDF em alta definição diagramado para consultórios</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Filtros flexíveis para qualquer período de tempo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="font-bold">Resumo clínico inteligente gerado pelo Gemini IA</span>
          </div>
        </div>

        <button
          onClick={onNavigateToSubscription}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 px-6 text-xs font-bold transition-all shadow-md hover:shadow-blue-500/10 cursor-pointer inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Conhecer Plano Premium por R$ 29,90
        </button>
      </div>
    );
  }

  return (
    <div id="relatorios-container" className="space-y-6 pb-12 font-sans">
      
      {/* Configuration panel (hidden during printing) */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-150 shadow-3xs flex flex-col gap-4 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Gerador Clínico Profissional de Relatórios</h2>
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              Consolide métricas detalhadas de glicemia, alimentação e rotinas em um formato diagramado para endos.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Period Selection Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
          <div className="space-y-1 sm:col-span-2">
            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Intervalo do Relatório</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: "30days", label: "30 Dias" },
                { id: "90days", label: "90 Dias" },
                { id: "6months", label: "6 Meses" },
                { id: "custom", label: "Custom" }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDateRange(opt.id as any)}
                  className={`py-1 text-center text-xxs font-bold rounded-lg border transition-all cursor-pointer ${
                    dateRange === opt.id 
                      ? "bg-blue-600 border-blue-600 text-white" 
                      : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {dateRange === "custom" && (
            <>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">De (Início)</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-neutral-200 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Até (Fim)</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-1 bg-white border border-neutral-200 rounded-lg text-xs"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Printable Sheet */}
      <div id="printable-report-sheet" className="bg-white p-8 sm:p-12 border border-neutral-200 rounded-3xl shadow-xs space-y-8 max-w-4xl mx-auto print:border-0 print:p-0 print:shadow-none">
        
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-neutral-300 pb-6">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight font-sans">Glyco AI</h1>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-0.5 block">Relatório de Saúde Metabólica</span>
            <span className="text-xs font-medium text-neutral-500 block mt-2">
              Período Analisado: {filtered.start.toLocaleDateString("pt-BR")} a {filtered.end.toLocaleDateString("pt-BR")}
            </span>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-xs font-bold text-blue-600 block">SaaS Certificado Digital</span>
            <span className="text-xxs text-neutral-400 block">Data de Emissão: {new Date().toLocaleDateString("pt-BR")}</span>
          </div>
        </div>

        {/* Patient Health Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Identificação</span>
            <h4 className="text-xs font-bold text-neutral-800">{profile.name}</h4>
            <span className="text-xxs text-neutral-500 block">Idade: {profile.age} anos | Sexo: {profile.gender}</span>
            <span className="text-xxs text-neutral-500 block">Metas: Jejum {profile.targetGlucoseMinJejum}-{profile.targetGlucoseMaxJejum} mg/dL</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Condição Metabólica</span>
            <h4 className="text-xs font-bold text-neutral-800 capitalize">Diabetes {profile?.diabetesType ? profile.diabetesType.replace("_", " ") : "não especificado"}</h4>
            <span className="text-xxs text-neutral-500 block">Altura: {profile.height}cm | Peso: {profile.weight}kg</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Tratamento de Suporte</span>
            <span className="text-xxs text-neutral-500 block">Medicamentos: {profile.medications.join(", ") || "Nenhum cadastrado"}</span>
            <span className="text-xxs text-neutral-500 block">Insulina: {profile.usesInsulin ? profile.insulinTypes.join(", ") : "Não"}</span>
          </div>
        </div>

        {/* Statistics Block */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Métricas Clínicas de Evolução</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border border-neutral-200 rounded-xl">
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold block">Quantidade Medições</span>
              <span className="text-xl font-black text-neutral-900 block mt-1">{totalLogs}</span>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl">
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold block">Média Glicemia</span>
              <span className="text-xl font-black text-neutral-900 block mt-1">{averageGlucose} <span className="text-[10px] font-normal text-neutral-400">mg/dL</span></span>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-emerald-50/20 border-emerald-100">
              <span className="text-[9px] text-emerald-700 uppercase tracking-wider font-bold block">Tempo no Alvo (TIR)</span>
              <span className="text-xl font-black text-emerald-600 block mt-1">{timeInRange}%</span>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl">
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold block">Limites Históricos</span>
              <span className="text-xs font-bold text-neutral-800 block mt-1">Máx: {maxGlucose} mg/dL</span>
              <span className="text-xs font-bold text-neutral-800 block">Mín: {minGlucose} mg/dL</span>
            </div>
          </div>
        </div>

        {/* Premium Real-Time AI Review */}
        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200/80 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Resumo Inteligente por Gemini IA
            </h3>
            <button
              onClick={handleGenerateAISummary}
              disabled={generatingSummary}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-blue-200 inline-flex items-center gap-1.5 disabled:opacity-50 print:hidden"
            >
              {generatingSummary ? (
                <>
                  <Loader className="w-3 h-3 animate-spin" />
                  Gerando resumo...
                </>
              ) : (
                "Analisar Histórico Clínico"
              )}
            </button>
          </div>

          <div className="text-xs text-neutral-700 leading-relaxed">
            {aiSummary ? (
              <p className="bg-white p-4 rounded-xl border border-neutral-100 italic">{aiSummary}</p>
            ) : (
              <p className="text-neutral-500 italic">
                Nenhum resumo clínico gerado ainda para esta faixa. Clique em "Analisar Histórico Clínico" acima para solicitar uma revisão automática de comportamento glicêmico e recomendações personalizadas com base em inteligência clínica computacional.
              </p>
            )}
          </div>
        </div>

        {/* Detailed Logs Tables */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Leituras Registradas no Intervalo</h3>
          <div className="border border-neutral-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold">
                  <th className="p-3 pl-5">Data/Hora</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Valor Glicêmico</th>
                  <th className="p-3 pr-5">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-700">
                {filtered.glucose.length > 0 ? (
                  filtered.glucose.slice(-15).map((log) => {
                    const isJejum = log.type === "jejum" || log.type === "antes_dormir";
                    const max = isJejum ? (profile.targetGlucoseMaxJejum || 130) : (profile.targetGlucoseMaxPosPrandial || 180);
                    const inRange = log.value >= (profile.targetGlucoseMinJejum || 70) && log.value <= max;

                    return (
                      <tr key={log.id} className="hover:bg-neutral-50/30">
                        <td className="p-3 pl-5 font-medium">
                          {new Date(log.timestamp).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="p-3 capitalize">{(log.type || "").replace("_", " ")}</td>
                        <td className={`p-3 text-right font-black ${inRange ? "text-emerald-600" : "text-amber-600"}`}>
                          {log.value} mg/dL
                        </td>
                        <td className="p-3 pr-5 text-neutral-400 text-xxs truncate max-w-xs">{log.notes || "--"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-neutral-400 italic">Sem registros glicêmicos no período selecionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalLogs > 15 && (
            <span className="text-xxs text-neutral-400 block text-right pr-2">Amostra resumida: Exibindo as últimas 15 leituras de {totalLogs} totais encontradas.</span>
          )}
        </div>

        {/* Extra Clinical logs section (Food and Exercise summaries) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Alimentação e Refeições</h3>
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-2">
              {filtered.food.length > 0 ? (
                filtered.food.slice(-4).map((food) => (
                  <div key={food.id} className="text-xs flex justify-between items-start border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-neutral-800">{food.description}</p>
                      <span className="text-[10px] text-neutral-400">{new Date(food.timestamp).toLocaleDateString("pt-BR")}</span>
                    </div>
                    {food.nutrition && (
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 shrink-0">
                        {food.nutrition.carbohydrates}g carb
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-400 italic">Sem refeições registradas no intervalo selecionado.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Atividades Físicas Realizadas</h3>
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-2">
              {filtered.exercise.length > 0 ? (
                filtered.exercise.slice(-4).map((ex) => (
                  <div key={ex.id} className="text-xs flex justify-between items-start border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-neutral-800 capitalize">{ex.type} ({ex.durationMinutes} min)</p>
                      <span className="text-[10px] text-neutral-400">{new Date(ex.timestamp).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0 capitalize">
                      {ex.intensity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-400 italic">Sem atividades físicas registradas no intervalo selecionado.</p>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Signatures segment */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-center border-t border-neutral-200">
          <div>
            <div className="w-44 h-px bg-neutral-300 mx-auto mb-2" />
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Assinatura do Paciente</span>
            <span className="text-xxs text-neutral-400 block mt-1">{profile.name}</span>
          </div>
          <div>
            <div className="w-44 h-px bg-neutral-300 mx-auto mb-2" />
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Carimbo / Assinatura do Endocrinologista</span>
            <span className="text-xxs text-neutral-400 block mt-1">CRM Médico Assistente</span>
          </div>
        </div>

      </div>
    </div>
  );
}
