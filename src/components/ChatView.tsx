import { useState, useRef, useEffect } from "react";
import { Message, UserProfile } from "../types";
import { incrementAiUsageCount } from "../firebaseUtils";
import { Send, Sparkles, User, Brain, AlertTriangle, RefreshCw, Lock, Copy, Share2, Bookmark } from "lucide-react";

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onReceiveAssistantMessage: (text: string) => void;
  profile: UserProfile;
  currentStats: {
    averageGlucose: number;
    timeInRange: number;
  };
  isPremium: boolean;
  onNavigateToSubscription?: () => void;
}

const CHAT_PRESETS = [
  { label: "Posso comer pizza?", query: "Tenho diabetes e gostaria de saber se posso comer pizza, qual o impacto e como amenizar o pico glicêmico?" },
  { label: "O que fazer em hipoglicemia?", query: "Estou sentindo suor frio, tontura e tremores. O que devo fazer imediatamente?" },
  { label: "Medição de Glicemia", query: "Qual é o melhor momento para medir a glicemia e como avaliar o impacto das refeições?" },
  { label: "Açúcar oculto em alimentos", query: "Quais alimentos comuns possuem açúcar oculto que eu deveria evitar?" },
];

export default function ChatView({
  messages,
  onSendMessage,
  onReceiveAssistantMessage,
  profile,
  currentStats,
  isPremium,
  onNavigateToSubscription,
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isDevMode = (import.meta as any).env?.DEV || (import.meta as any).env?.VITE_DEVELOPMENT_MODE === "true" || (import.meta as any).env?.VITE_DISABLE_AI_LIMITS === "true";
  const usedCount = profile?.aiUsageCount || 0;
  const isChatLimitReached = !isDevMode && !isPremium && usedCount >= 2;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    if (isChatLimitReached) {
      if (onNavigateToSubscription) {
        onNavigateToSubscription();
      } else {
        alert("Sua conta atingiu o limite de 2 utilizações gratuitas da Inteligência Artificial. Por favor, assine o plano Premium para acesso ilimitado.");
      }
      return;
    }

    onSendMessage(textToSend);
    setInputText("");
    setLoading(true);

    try {
      // Create message thread list to send to the backend
      const updatedMessages = [
        ...messages,
        { id: Date.now().toString(), sender: "user", text: textToSend, timestamp: new Date().toISOString() },
      ];

      const payload = JSON.stringify({
        messages: updatedMessages.slice(-10), // send last 10 messages for context
        profile,
        currentStats,
      });

      const chatEndpoints = ["/api/gemini/chat", "/api/copilot", "/api/chat", "/copilot", "/chat"];
      let response: Response | null = null;
      let lastErrorMsg = "Falha ao comunicar com assistente virtual.";

      for (const endpoint of chatEndpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });

          if (res.ok) {
            response = res;
            break;
          } else {
            try {
              const errData = await res.json();
              if (errData.message) lastErrorMsg = errData.message;
              if (res.status === 403 || errData.code === "TRIAL_EXHAUSTED") {
                if (profile) profile.aiUsageCount = errData.aiUsageCount || 2;
                if (onNavigateToSubscription) onNavigateToSubscription();
                throw new Error(errData.message || "Sua conta atingiu o limite de 2 utilizações gratuitas da Inteligência Artificial.");
              }
            } catch (jsonErr: any) {
              if (jsonErr.message && jsonErr.message.includes("2 utilizações")) throw jsonErr;
            }
          }
        } catch (err: any) {
          if (err.message && err.message.includes("2 utilizações")) throw err;
          console.warn(`[CHAT RETRY] Falha no endpoint ${endpoint}:`, err);
        }
      }

      if (!response || !response.ok) {
        throw new Error(lastErrorMsg);
      }

      const data = await response.json();
      onReceiveAssistantMessage(data.text);

      if (typeof data.aiUsageCount === "number" && profile) {
        profile.aiUsageCount = data.aiUsageCount;
      }
    } catch (error: any) {
      console.error("Erro no chat inteligente:", error);
      const userFacingMsg = error.message && error.message.includes("GEMINI_API_KEY") 
        ? "Nota do Sistema: A chave GEMINI_API_KEY precisa ser adicionada nas variáveis de ambiente da Vercel (Project Settings > Environment Variables)."
        : "Olá! Tive um pequeno problema ao conectar com meu cérebro inteligente, mas posso te adiantar o seguinte: Para um controle ótimo, evite picos e meça a glicemia com frequência. Como posso te ajudar a reestruturar sua próxima refeição?";
      onReceiveAssistantMessage(userFacingMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="chat-view-container" className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-12">
      {/* Sidebar presets */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs">
          <span className="text-xxs font-bold text-blue-600 uppercase tracking-widest block">Menu Copiloto</span>
          <h3 className="text-base font-bold text-neutral-900 mt-1">Sua IA Clínica</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Nossa Inteligência Artificial analisa suas informações clínicas (Diabetes {profile.diabetesType === "tipo2" ? "Tipo 2" : "Tipo 1"}) e medicamentos atuais para dar respostas mais completas.
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs space-y-3">
          <span className="text-xxs font-bold text-neutral-400 uppercase tracking-wider block">Temas Frequentes</span>
          <div className="flex flex-col gap-2">
            {CHAT_PRESETS.map((preset, i) => (
              <button
                key={i}
                onClick={() => handleSend(preset.query)}
                disabled={loading}
                className="w-full text-left p-3 rounded-2xl border border-neutral-150 hover:border-blue-300 hover:bg-blue-50/10 text-xs text-neutral-700 font-bold transition-all disabled:opacity-50 disabled:hover:border-neutral-150 disabled:hover:bg-transparent cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-3xl border border-amber-150 flex gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xxs text-amber-800 leading-normal">
            <strong>Importante:</strong> Nossas respostas são educativas e amparadas por literatura de saúde, mas nunca substituem exames laboratoriais ou a avaliação individualizada do seu médico.
          </p>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="lg:col-span-3 bg-white border border-neutral-100 shadow-2xs rounded-3xl flex flex-col h-[600px] overflow-hidden">
        {/* Chat header */}
        <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-100">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900">Glyco AI Assistant</h4>
              <span className="text-xxs text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Dicas de saúde e dietas personalizadas
              </span>
            </div>
          </div>
        </div>

        {/* Message bubble stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            const cleanMessageText = msg.text.replace(/\[EXERCISE:[a-zA-Z0-9_-]+\]/g, "").trim();

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${isUser ? "bg-blue-600" : "bg-neutral-900"}`}>
                  {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                </div>

                <div className="flex flex-col gap-2 max-w-full">
                  <div className={`p-4 rounded-3xl border text-sm leading-relaxed ${
                    isUser
                      ? "bg-blue-600 border-blue-600 text-white rounded-tr-none shadow-sm shadow-blue-100"
                      : "bg-neutral-50 border-neutral-150 text-neutral-800 rounded-tl-none"
                  }`}>
                    <p className="whitespace-pre-wrap">{cleanMessageText}</p>
                    
                    {!isUser && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-200/60 text-xxs text-neutral-500 font-bold">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cleanMessageText);
                            alert("Mensagem copiada para a área de transferência!");
                          }}
                          className="hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </button>
                        <button
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: "Dicas Glyco AI Assistant",
                                text: cleanMessageText
                              }).catch(console.error);
                            } else {
                              navigator.clipboard.writeText(cleanMessageText);
                              alert("Mensagem copiada! Pronto para compartilhar.");
                            }
                          }}
                          className="hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Compartilhar
                        </button>
                        <span className="ml-auto text-[9px] text-emerald-600 font-extrabold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <Bookmark className="w-3 h-3 text-emerald-500" /> Salvo
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div className="bg-neutral-50 border border-neutral-150 p-4 rounded-3xl rounded-tl-none flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50">
          {isChatLimitReached ? (
            <div className="bg-neutral-900 border border-neutral-800 text-white rounded-2xl p-5 text-center space-y-3 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Lock className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">Limite do Assistente IA Atingido</span>
              </div>
              <p className="text-[11px] text-neutral-400 max-w-md mx-auto leading-relaxed">
                Você utilizou {usedCount} de 2 testes gratuitos do assistente. Assine o **Plano Premium** para continuar tirando dúvidas sobre nutrição, receitas e comportamento glicêmico sem restrições.
              </p>
              <button
                type="button"
                onClick={onNavigateToSubscription}
                className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-all shadow-md cursor-pointer inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Liberar Chat Ilimitado (R$ 29,90)
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(inputText);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                className="flex-1 px-4 py-3 border border-neutral-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Pergunte sobre alimentos, sintomas ou dicas de medicação..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
