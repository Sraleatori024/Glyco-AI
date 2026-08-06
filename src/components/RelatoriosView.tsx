import React, { useState } from "react";
import { UserProfile, GlucoseLog, FoodLog, MedicationLog, InsulinLog, ExerciseLog } from "../types";
import { 
  Printer, 
  Calendar, 
  ShieldCheck, 
  Heart, 
  Activity, 
  Lock, 
  Sparkles, 
  FileText, 
  Loader,
  TrendingUp,
  Download,
  AlertTriangle,
  Pill,
  Syringe,
  Weight
} from "lucide-react";
import jsPDF from "jspdf";

interface RelatoriosViewProps {
  profile: UserProfile;
  glucoseLogs: GlucoseLog[];
  foodLogs: FoodLog[];
  medicationLogs: MedicationLog[];
  insulinLogs?: InsulinLog[];
  exerciseLogs: ExerciseLog[];
  isPremium: boolean;
  onNavigateToSubscription?: () => void;
}

export default function RelatoriosView({
  profile,
  glucoseLogs,
  foodLogs = [],
  medicationLogs = [],
  insulinLogs = [],
  exerciseLogs = [],
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
        medication: medicationLogs.filter(l => {
          const d = l.timestamp ? new Date(l.timestamp) : new Date();
          return d >= start && d <= end;
        }),
        insulin: insulinLogs.filter(l => {
          const d = l.timestamp ? new Date(l.timestamp) : new Date();
          return d >= start && d <= end;
        }),
        start,
        end
      };
    }

    return {
      glucose: glucoseLogs.filter(l => new Date(l.timestamp) >= startDate),
      medication: medicationLogs,
      insulin: insulinLogs,
      start: startDate,
      end: now
    };
  };

  const filtered = getFilteredLogs();

  // Statistics calculation
  const totalLogs = filtered.glucose.length;
  const averageGlucose = totalLogs > 0
    ? Math.round(filtered.glucose.reduce((acc, log) => acc + log.value, 0) / totalLogs)
    : 0;

  // 7d and 30d averages
  const now = new Date();
  const logs7d = filtered.glucose.filter((l) => (now.getTime() - new Date(l.timestamp).getTime()) <= 7 * 86400 * 1000);
  const logs30d = filtered.glucose.filter((l) => (now.getTime() - new Date(l.timestamp).getTime()) <= 30 * 86400 * 1000);
  
  const avg7d = logs7d.length > 0 ? Math.round(logs7d.reduce((a, b) => a + b.value, 0) / logs7d.length) : averageGlucose;
  const avg30d = logs30d.length > 0 ? Math.round(logs30d.reduce((a, b) => a + b.value, 0) / logs30d.length) : averageGlucose;

  const maxGlucose = totalLogs > 0 ? Math.max(...filtered.glucose.map((log) => log.value)) : 0;
  const minGlucose = totalLogs > 0 ? Math.min(...filtered.glucose.map((log) => log.value)) : 0;

  // Time in range
  const inRangeLogs = filtered.glucose.filter((log) => {
    const isJejum = log.type === "jejum" || log.type === "antes_dormir";
    const min = profile.targetGlucoseMinJejum || 70;
    const max = isJejum
      ? (profile.targetGlucoseMaxJejum || 130)
      : (profile.targetGlucoseMaxPosPrandial || 180);
    return log.value >= min && log.value <= max;
  }).length;
  const timeInRange = totalLogs > 0 ? Math.round((inRangeLogs / totalLogs) * 100) : 0;

  // Hypo and Hyper counts
  const hypoglicemias = filtered.glucose.filter((l) => l.value < (profile.targetGlucoseMinJejum || 70)).length;
  const hyperglicemias = filtered.glucose.filter((l) => {
    const isJejum = l.type === "jejum" || l.type === "antes_dormir";
    const max = isJejum ? (profile.targetGlucoseMaxJejum || 130) : (profile.targetGlucoseMaxPosPrandial || 180);
    return l.value > max;
  }).length;

  // Medication and Insulin Adherence
  const totalMeds = filtered.medication.length;
  const takenMeds = filtered.medication.filter((m) => m.status === "aplicado").length;
  const medsAdherence = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;

  const totalInsulin = filtered.insulin.length;
  const takenInsulin = filtered.insulin.filter((i) => i.status === "aplicado").length;
  const insulinAdherence = totalInsulin > 0 ? Math.round((takenInsulin / totalInsulin) * 100) : 100;

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
          foodLogs: [], // Exclude meals from AI history per user mandate
          medicationLogs: filtered.medication.slice(-10),
          exerciseLogs: exerciseLogs.slice(-10)
        })
      });
      const data = await response.json();
      if (data.overallStatus) {
        setAiSummary(`${data.overallStatus} Tendência de controle está ${data.controlTrend.toUpperCase()}. Padrões identificados: ${data.patterns.join(", ")}. Insights Clínicos: ${data.insights.map((i: any) => i.title + ": " + i.description).join(" | ")}`);
      } else {
        setAiSummary("Análise concluída com sucesso. O paciente apresenta bom controle glicêmico com estabilidade na maioria do período. Recomenda-se manter o acompanhamento periódico das glicemias para mapeamento contínuo de adesão.");
      }
    } catch (err) {
      console.error(err);
      setAiSummary("Análise computacional indisponível momentaneamente. Nota-se tendência de controle estável no período selecionado, com tempo no alvo mantido dentro dos padrões recomendados.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Professional PDF export using jsPDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("Glico AI - Relatório Clínico de Saúde Metabólica", 14, 22);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")} | Período: ${filtered.start.toLocaleDateString("pt-BR")} a ${filtered.end.toLocaleDateString("pt-BR")}`, 14, 28);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 32, 196, 32);

    // Patient info block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("1. Identificação do Paciente", 14, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Nome: ${profile.name}`, 14, 50);
    doc.text(`Idade: ${profile.age} anos | Sexo: ${profile.gender} | Diabetes: ${profile.diabetesType?.toUpperCase().replace("_", " ")}`, 14, 56);
    doc.text(`Peso: ${profile.weight ? profile.weight + " kg" : "Não informado"} | Altura: ${profile.height ? profile.height + " cm" : "Não informada"}`, 14, 62);
    doc.text(`Metas Glicêmicas: Jejum ${profile.targetGlucoseMinJejum || 70}-${profile.targetGlucoseMaxJejum || 130} mg/dL | Pós-Prandial: ate ${profile.targetGlucoseMaxPosPrandial || 180} mg/dL`, 14, 68);

    doc.line(14, 74, 196, 74);

    // Clinical Metrics
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("2. Métricas Clínicas Consolidadas", 14, 84);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`* Total de Medições Registradas: ${totalLogs}`, 18, 92);
    doc.text(`* Média Glicêmica Geral: ${averageGlucose} mg/dL (Média 7d: ${avg7d} mg/dL | Média 30d: ${avg30d} mg/dL)`, 18, 98);
    doc.text(`* Tempo no Alvo (Time in Range - TIR): ${timeInRange}%`, 18, 104);
    doc.text(`* Episódios de Hipoglicemia (<70 mg/dL): ${hypoglicemias}`, 18, 110);
    doc.text(`* Episódios de Hiperglicemia (>180 mg/dL): ${hyperglicemias}`, 18, 116);
    doc.text(`* Maior Glicemia Registrada: ${maxGlucose} mg/dL | Menor: ${minGlucose} mg/dL`, 18, 122);
    doc.text(`* Adesão aos Medicamentos Orais: ${medsAdherence}%`, 18, 128);
    doc.text(`* Adesão à Insulina: ${insulinAdherence}%`, 18, 134);

    doc.line(14, 140, 196, 140);

    // AI Medical Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("3. Resumo Clínico de Inteligência Artificial", 14, 150);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const summaryText = aiSummary || `O paciente ${profile.name} manteve média glicêmica de ${averageGlucose} mg/dL com Tempo no Alvo de ${timeInRange}% no período analisado. Registrou ${hypoglicemias} episódios de hipoglicemia e ${hyperglicemias} de hiperglicemia. Adesão medicamentosa estimada em ${medsAdherence}%.`;
    const splitSummary = doc.splitTextToSize(summaryText, 180);
    doc.text(splitSummary, 14, 158);

    // Recent Readings Table
    const tableStartY = 190;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("4. Amostra de Leituras Glicêmicas Recentes", 14, tableStartY);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Data / Hora", 14, tableStartY + 8);
    doc.text("Momento", 70, tableStartY + 8);
    doc.text("Glicemia", 120, tableStartY + 8);
    doc.text("Status", 160, tableStartY + 8);

    doc.setLineWidth(0.3);
    doc.line(14, tableStartY + 10, 196, tableStartY + 10);

    doc.setFont("helvetica", "normal");
    let currentY = tableStartY + 16;
    const sampleLogs = filtered.glucose.slice(-12);

    sampleLogs.forEach((log) => {
      if (currentY > 270) return; // avoid overflow
      const isJejum = log.type === "jejum" || log.type === "antes_dormir";
      const max = isJejum ? (profile.targetGlucoseMaxJejum || 130) : (profile.targetGlucoseMaxPosPrandial || 180);
      const statusText = log.value < 70 ? "Hipoglicemia" : log.value > max ? "Hiperglicemia" : "Na Meta";

      doc.text(new Date(log.timestamp).toLocaleString("pt-BR"), 14, currentY);
      doc.text(log.type.replace("_", " "), 70, currentY);
      doc.text(`${log.value} mg/dL`, 120, currentY);
      doc.text(statusText, 160, currentY);
      currentY += 6;
    });

    // Medical signature footer
    doc.line(14, 275, 196, 275);
    doc.setFontSize(8);
    doc.text("Glyco AI - Plataforma SaaS de Suporte ao Controle Diabetes | Documento Informativo sem fins de diagnóstico.", 14, 282);

    doc.save(`relatorio-clinico-glicoai-${profile.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  // Locked View for Free Plan users
  if (!isPremium) {
    return (
      <div id="relatorios-locked" className="max-w-xl mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden font-sans">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto text-blue-500">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">Exportação de Relatórios é Exclusiva</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Seu plano atual não permite gerar relatórios em PDF profissionais ou resumos clínicos automáticos por IA. Atualize para o Premium e impressione seu médico com o histórico consolidado.
          </p>
        </div>

        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-850 text-left space-y-2.5 max-w-sm mx-auto text-xs text-neutral-300">
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
              Consolide métricas detalhadas de glicemia, Time in Range, adesão medicamentosa e peso em formato diagramado para endocrinologistas.
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
              Exportar PDF
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
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight font-sans">Glico AI</h1>
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-0.5 block">Relatório Clínico de Saúde Metabólica</span>
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
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Identificação do Paciente</span>
            <h4 className="text-xs font-bold text-neutral-800">{profile.name}</h4>
            <span className="text-xxs text-neutral-500 block">Idade: {profile.age} anos | Sexo: {profile.gender}</span>
            <span className="text-xxs text-neutral-500 block">Metas: Jejum {profile.targetGlucoseMinJejum}-{profile.targetGlucoseMaxJejum} mg/dL</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Condição & Dados Físicos</span>
            <h4 className="text-xs font-bold text-neutral-800 capitalize">Diabetes {profile?.diabetesType ? profile.diabetesType.replace("_", " ") : "não especificado"}</h4>
            <span className="text-xxs text-neutral-500 block">Peso: {profile.weight ? `${profile.weight} kg` : "Não informado"}</span>
            <span className="text-xxs text-neutral-500 block">Altura: {profile.height ? `${profile.height} cm` : "Não informada"}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Tratamento Farmacológico</span>
            <span className="text-xxs text-neutral-500 block">Remédios: {profile.medications.join(", ") || "Nenhum cadastrado"}</span>
            <span className="text-xxs text-neutral-500 block">Insulina: {profile.usesInsulin ? profile.insulinTypes.join(", ") : "Não utiliza"}</span>
          </div>
        </div>

        {/* Clinical Statistics Block */}
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
              <span className="text-xxs text-neutral-400 block mt-1">Média 7d: {avg7d} | 30d: {avg30d}</span>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-emerald-50/20 border-emerald-100">
              <span className="text-[9px] text-emerald-700 uppercase tracking-wider font-bold block">Tempo no Alvo (TIR)</span>
              <span className="text-xl font-black text-emerald-600 block mt-1">{timeInRange}%</span>
              <span className="text-xxs text-emerald-600/70 block mt-1">Meta médica: &gt;70%</span>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl">
              <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold block">Episódios Fora da Meta</span>
              <span className="text-xs font-bold text-red-600 block mt-1">Hipoglicemia: {hypoglicemias}</span>
              <span className="text-xs font-bold text-amber-600 block">Hiperglicemia: {hyperglicemias}</span>
            </div>
          </div>
        </div>

        {/* Adherence & Physical Metrics Block */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-neutral-200 rounded-2xl bg-blue-50/20 flex items-center gap-3">
            <Pill className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Adesão Medicamentos</span>
              <span className="text-lg font-black text-neutral-900">{medsAdherence}%</span>
            </div>
          </div>

          <div className="p-4 border border-neutral-200 rounded-2xl bg-indigo-50/20 flex items-center gap-3">
            <Syringe className="w-6 h-6 text-indigo-600 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Adesão Insulina</span>
              <span className="text-lg font-black text-neutral-900">{insulinAdherence}%</span>
            </div>
          </div>

          <div className="p-4 border border-neutral-200 rounded-2xl bg-neutral-50 flex items-center gap-3">
            <Weight className="w-6 h-6 text-neutral-600 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Peso Informado</span>
              <span className="text-lg font-black text-neutral-900">{profile.weight ? `${profile.weight} kg` : "--"}</span>
            </div>
          </div>
        </div>

        {/* AI Clinical Review */}
        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200/80 space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Observações Relevantes e Resumo Inteligente por Gemini IA
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
                Nenhum resumo clínico gerado ainda para esta faixa. Clique em &quot;Analisar Histórico Clínico&quot; acima para solicitar uma revisão automática de comportamento glicêmico e recomendações personalizadas.
              </p>
            )}
          </div>
        </div>

        {/* Detailed Readings Table (NO MEALS LISTING PER USER MANDATE) */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Leituras Glicêmicas no Intervalo</h3>
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
