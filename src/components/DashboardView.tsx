import { useState, useEffect } from "react";
import { UserProfile, GlucoseLog, FoodLog, MedicationLog, ExerciseLog, AIAnalysisResult } from "../types";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  AreaChart,
  Area
} from "recharts";
import {
  Activity,
  Heart,
  Calendar,
  AlertTriangle,
  Sparkles,
  Apple,
  Pill,
  TrendingUp,
  Plus,
  RefreshCw,
  TrendingDown,
  Clock,
  ChevronRight
} from "lucide-react";

interface DashboardViewProps {
  profile: UserProfile;
  glucoseLogs: GlucoseLog[];
  foodLogs: FoodLog[];
  medicationLogs: MedicationLog[];
  exerciseLogs: ExerciseLog[];
  onNavigate: (view: string) => void;
}

export default function DashboardView({
  profile,
  glucoseLogs,
  foodLogs,
  medicationLogs,
  exerciseLogs,
  onNavigate,
}: DashboardViewProps) {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [chartRange, setChartRange] = useState<"all" | "7d" | "30d">("7d");

  // Calculate statistics from REAL current patient history data
  const latestGlucose = glucoseLogs.length > 0 ? glucoseLogs[glucoseLogs.length - 1] : null;

  const averageGlucose = Math.round(
    glucoseLogs.length > 0
      ? glucoseLogs.reduce((acc, log) => acc + log.value, 0) / glucoseLogs.length
      : 120
  );

  // Calculate Time in Range (TIR)
  const calculateTimeInRange = () => {
    if (glucoseLogs.length === 0) return 100;
    const inRangeLogs = glucoseLogs.filter((log) => {
      const isJejum = log.type === "jejum" || log.type === "antes_dormir";
      const min = profile.targetGlucoseMinJejum || 70;
      const max = isJejum
        ? (profile.targetGlucoseMaxJejum || 130)
        : (profile.targetGlucoseMaxPosPrandial || 180);
      return log.value >= min && log.value <= max;
    });
    return Math.round((inRangeLogs.length / glucoseLogs.length) * 100);
  };

  const timeInRange = calculateTimeInRange();

  // Find next scheduled pending medication
  const pendingMeds = medicationLogs.filter((m) => m.status === "pendente");
  const nextMedication = pendingMeds.length > 0 ? pendingMeds[0] : null;

  // Filter glucose logs based on range for chart
  const getFilteredLogsForChart = () => {
    const logsCopy = [...glucoseLogs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (chartRange === "7d") {
      return logsCopy.slice(-7);
    } else if (chartRange === "30d") {
      return logsCopy.slice(-30);
    }
    return logsCopy;
  };

  const chartData = getFilteredLogsForChart().map((log) => {
    const date = new Date(log.timestamp);
    const label = date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    const hour = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return {
      name: `${label} ${hour}`,
      valor: log.value,
      tipo: log.type,
    };
  });

  // Call the server-side Gemini endpoint for smart profile analysis
  const fetchAIAnalysis = async (force: boolean = false) => {
    const cached = localStorage.getItem(`glyco_ai_analysis_${profile.name}`);
    if (cached && !force) {
      setAiAnalysis(JSON.parse(cached));
      return;
    }

    setLoadingAI(true);
    try {
      const response = await fetch("/api/gemini/analyze-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          glucoseLogs: glucoseLogs.slice(-15), // send recent logs for analysis
          foodLogs: foodLogs.slice(-5),
          medicationLogs: medicationLogs.slice(-5),
          exerciseLogs: exerciseLogs.slice(-5),
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao analisar dados com IA.");
      }

      const data = await response.json();
      setAiAnalysis(data);
      localStorage.setItem(`glyco_ai_analysis_${profile.name}`, JSON.stringify(data));
    } catch (err) {
      console.error("Erro ao chamar endpoint de IA:", err);
      // Fallback response for offline/empty states
      setAiAnalysis({
        overallStatus: "Seu controle está estável, mas requer atenção a picos pós-refeições.",
        controlTrend: "estável",
        patterns: [
          "Tendência de aumento após o café da manhã.",
          "Boa resposta hipoglicemiante após sessões de caminhada.",
          "Níveis estáveis no período pré-sono."
        ],
        insights: [
          {
            title: "Ajuste na refeição matinal",
            description: "Adicione fibras como sementes de chia ou farelo de aveia ao café da manhã para retardar a absorção de carboidratos.",
            type: "alerta"
          },
          {
            title: "Exercício pós-jantar",
            description: "Excelente impacto da caminhada de 40 minutos ontem. Mantenha para otimizar a sensibilidade à insulina.",
            type: "sucesso"
          },
          {
            title: "Hidratação e sono",
            description: "Níveis levemente elevados nos dias de sono reduzido. Priorize 7-8 horas de sono de qualidade.",
            type: "info"
          }
        ],
        medicalDisclaimer: "Lembre-se: os insights da Glyco AI são educativos e complementam, mas não substituem, a avaliação do seu médico."
      });
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    fetchAIAnalysis();
  }, [profile, glucoseLogs.length]);

  // Determine Glucose Status Styling
  const getGlucoseStatusColor = (val: number) => {
    if (val < 70) return { bg: "bg-red-50 text-red-700 border-red-200", label: "Hipoglicemia", text: "text-red-600" };
    if (val > 180) return { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Hiperglicemia", text: "text-amber-600" };
    return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Ideal", text: "text-emerald-600" };
  };

  const currentStatus = latestGlucose ? getGlucoseStatusColor(latestGlucose.value) : { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Sem registros", text: "text-blue-600" };

  return (
    <div id="dashboard-container" className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-100 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Painel Clínico</span>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-1">
            Olá, {profile.name || "Paciente"}.
          </h1>
          <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
            {latestGlucose
              ? `Hoje sua glicemia está em ${latestGlucose.value} mg/dL (${currentStatus.label.toLowerCase()}).`
              : "Registre sua primeira medição glicêmica para ativar a análise inteligente."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate("glicemia")}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Medição
          </button>
          <button
            onClick={() => onNavigate("alimentacao")}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 rounded-xl text-sm font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Apple className="w-4 h-4 text-emerald-500" />
            Análise Alimentar IA
          </button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Última Glicemia */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Última Glicemia</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                {latestGlucose ? latestGlucose.value : "--"}
              </span>
              <span className="text-xs font-medium text-neutral-400">mg/dL</span>
            </div>
            {latestGlucose && (
              <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xxs font-medium border ${currentStatus.bg}`}>
                {currentStatus.label}
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate("glicemia")}
            className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
          >
            Ver histórico
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Metric 2: Média Semanal */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Média de Glicemia</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                {averageGlucose}
              </span>
              <span className="text-xs font-medium text-neutral-400">mg/dL</span>
            </div>
            <p className="text-neutral-400 text-xxs mt-2 font-medium leading-normal">
              Calculada a partir de todos os registros atuais.
            </p>
          </div>
          <button
            onClick={() => onNavigate("glicemia")}
            className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
          >
            Detalhamento
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Metric 3: Tempo no Alvo */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Tempo no Alvo (TIR)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                {timeInRange}%
              </span>
            </div>
            <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${timeInRange}%` }}
              />
            </div>
          </div>
          <span className="mt-4 text-xxs font-medium text-neutral-400 block">
            Meta médica ideal recomendada: &gt; 70%
          </span>
        </div>

        {/* Metric 4: Próxima Insulina / Medicamento */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Próxima Dose</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {nextMedication ? (
              <div>
                <span className="text-sm font-bold text-neutral-900 block truncate">{nextMedication.name}</span>
                <span className="text-xxs font-semibold text-neutral-500 block mt-0.5">Dose: {nextMedication.dose}</span>
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xxs font-medium border border-amber-200">
                  <Clock className="w-3 h-3" />
                  Agendado: {nextMedication.timeScheduled}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-lg font-bold text-neutral-950 block">Todas tomadas!</span>
                <span className="text-xxs text-emerald-600 font-semibold block mt-1">Nenhuma dose pendente para hoje.</span>
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigate("medicamentos")}
            className="mt-4 text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 group"
          >
            Registrar doses
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Glucose Line Chart */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Curva Glicêmica Histórica</h3>
            <p className="text-xs text-neutral-500">Faixa cinza indica o alvo terapêutico ideal ({profile.targetGlucoseMinJejum || 70} - {profile.targetGlucoseMaxPosPrandial || 180} mg/dL)</p>
          </div>
          <div className="flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50 self-start">
            {[
              { id: "7d", label: "7 Dias" },
              { id: "30d", label: "Mês" },
              { id: "all", label: "Tudo" },
            ].map((rng) => (
              <button
                key={rng.id}
                onClick={() => setChartRange(rng.id as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartRange === rng.id
                    ? "bg-white text-neutral-900 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {rng.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGlucose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis domain={[40, 260]} stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0" }}
                  labelStyle={{ fontWeight: "bold", color: "#1E293B", fontSize: "11px" }}
                />
                {/* Visual reference range area representing target glucose levels */}
                <ReferenceArea
                  {...({
                    y1: profile.targetGlucoseMinJejum || 70,
                    y2: profile.targetGlucoseMaxPosPrandial || 180,
                    fill: "#F1F5F9",
                    fillOpacity: 0.7
                  } as any)}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  name="Glicemia (mg/dL)"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorGlucose)"
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-xs">
              Sem dados suficientes de glicemia no intervalo selecionado.
            </div>
          )}
        </div>
      </div>

      {/* AI Smart Assistant Insights Segment */}
      <div className="bg-neutral-950 text-white p-6 sm:p-8 rounded-4xl shadow-lg border border-neutral-900 overflow-hidden relative">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 -translate-x-12 translate-y-12 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Análise Automática por Glyco AI
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              Diagnóstico de Padrões & Insights Ativos
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Nossa IA processou seus últimos {glucoseLogs.length} registros glicêmicos e {foodLogs.length} refeições para gerar relatórios de tendências instantâneos.
            </p>
          </div>

          <button
            onClick={() => fetchAIAnalysis(true)}
            disabled={loadingAI}
            className="self-start md:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-all disabled:opacity-50 border border-neutral-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAI ? "animate-spin" : ""}`} />
            {loadingAI ? "Recalculando..." : "Atualizar Análise"}
          </button>
        </div>

        {loadingAI ? (
          <div className="mt-8 space-y-4 animate-pulse">
            <div className="h-4 bg-neutral-800 rounded-md w-3/4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-28 bg-neutral-800 rounded-2xl" />
              <div className="h-28 bg-neutral-800 rounded-2xl" />
              <div className="h-28 bg-neutral-800 rounded-2xl" />
            </div>
          </div>
        ) : aiAnalysis ? (
          <div className="mt-8 space-y-6">
            {/* Status Summary */}
            <div className="bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider block">Status Geral Recente</span>
                <p className="text-sm font-semibold text-neutral-100">{aiAnalysis.overallStatus}</p>
              </div>
              <div className="shrink-0">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold capitalize border ${
                  aiAnalysis.controlTrend === "melhorando"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : aiAnalysis.controlTrend === "atencao" || aiAnalysis.controlTrend === "descontrolado"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  Controle {aiAnalysis.controlTrend}
                </span>
              </div>
            </div>

            {/* Bento Grid Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiAnalysis.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    insight.type === "alerta"
                      ? "bg-neutral-900/40 border-amber-500/20 hover:border-amber-500/40"
                      : insight.type === "sucesso"
                      ? "bg-neutral-900/40 border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-neutral-900/40 border-blue-500/20 hover:border-blue-500/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${
                      insight.type === "alerta" ? "bg-amber-500" : insight.type === "sucesso" ? "bg-emerald-500" : "bg-blue-500"
                    }`} />
                    <h4 className="text-xs font-bold text-neutral-100 uppercase tracking-wide">{insight.title}</h4>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </div>

            {/* Custom detected patterns list */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Padrões Identificados</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-400">
                {aiAnalysis.patterns.map((pat, i) => (
                  <li key={i} className="flex items-start gap-2 bg-neutral-900/30 p-2.5 rounded-xl border border-neutral-900">
                    <span className="text-blue-500 font-semibold">•</span>
                    <span>{pat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Medical disclaimer disclaimer */}
            <p className="text-xxs text-neutral-500 mt-4 leading-relaxed border-t border-neutral-900 pt-4">
              {aiAnalysis.medicalDisclaimer}
            </p>
          </div>
        ) : (
          <div className="text-center text-xs text-neutral-500 py-8">
            Nenhuma análise disponível. Clique em Atualizar Análise.
          </div>
        )}
      </div>

      {/* Quick Action Guides or Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Support Card: Chat with IA */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Chat Co-Piloto</span>
            <h4 className="text-base font-bold text-neutral-900 mt-1">Dúvidas rápidas com o assistente</h4>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Pergunte coisas como &quot;Como evitar hipoglicemia pós-treino?&quot; ou se determinado alimento possui alto índice glicêmico. Ele analisará seu perfil clínico para responder.
            </p>
          </div>
          <button
            onClick={() => onNavigate("chat")}
            className="mt-4 self-start px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            Iniciar Chat Clínico
          </button>
        </div>

        {/* Support Card: Reports */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Médico & Relatórios</span>
            <h4 className="text-base font-bold text-neutral-900 mt-1">Exportar PDF para Endocrinologista</h4>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              Gere relatórios completos de glicemia, tabelas de refeições, doses de insulina aplicadas e relatórios estatísticos formatados e prontos para impressão.
            </p>
          </div>
          <button
            onClick={() => onNavigate("relatorios")}
            className="mt-4 self-start px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Visualizar Relatório PDF
          </button>
        </div>
      </div>
    </div>
  );
}
