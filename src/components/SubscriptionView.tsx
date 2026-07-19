import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Check, 
  CreditCard, 
  QrCode, 
  ShieldCheck, 
  HelpCircle, 
  Lock, 
  AlertCircle, 
  RefreshCw,
  Clock,
  Heart
} from "lucide-react";

interface SubscriptionViewProps {
  currentPlan: string;
  subscriptionStatus: string;
  onUpgrade: (plan: "free" | "premium", period: "monthly" | "yearly") => Promise<void>;
  onCancel: () => Promise<void>;
  onReactivate: () => Promise<void>;
}

export default function SubscriptionView({ 
  currentPlan, 
  subscriptionStatus, 
  onUpgrade, 
  onCancel, 
  onReactivate 
}: SubscriptionViewProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [checkoutModal, setCheckoutModal] = useState<"pix" | "card" | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [pixCopied, setPixCopied] = useState(false);
  const [pixCountdown, setPixCountdown] = useState(300); // 5 min countdown

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate real Cakto webhook latency
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await onUpgrade("premium", billingPeriod);
    setLoading(false);
    setCheckoutModal(null);
  };

  const handlePixSimulatePaid = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await onUpgrade("premium", billingPeriod);
    setLoading(false);
    setCheckoutModal(null);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText("00020101021226830014BR.GOV.BCB.PIX2561cakto-checkout-production-glycoai-recurring-subscription-key-9281928");
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  const isPremium = currentPlan === "premium";

  return (
    <div id="subscription-view" className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl text-neutral-100 max-w-4xl mx-auto space-y-6 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-md mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xxs font-black tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          Glyco AI Premium
        </div>
        <h2 className="text-xl font-black">Libere o Poder Total da sua Saúde</h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Histórico clínico ilimitado, análises avançadas com Inteligência Artificial, gerador de relatórios em PDF para consultas médicas e copiloto em tempo real.
        </p>
      </div>

      {/* Current plan card */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xxs font-bold text-neutral-500 uppercase tracking-wider">Seu Plano Atual</span>
          <div className="flex items-center gap-2 mt-1">
            <h3 className="text-base font-black capitalize">
              {currentPlan === "premium" ? "Premium" : "Gratuito"}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              subscriptionStatus === "active" 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-neutral-800 text-neutral-400 border border-neutral-700"
            }`}>
              {subscriptionStatus === "active" ? "Ativo" : "Cancelado / Inativo"}
            </span>
          </div>
          <p className="text-xxs text-neutral-400 mt-1">
            {isPremium 
              ? "Parabéns! Você tem acesso ilimitado a todas as ferramentas clínicas."
              : "Seu plano atual tem limites de histórico e não inclui Copiloto IA."}
          </p>
        </div>

        <div className="flex gap-2">
          {isPremium ? (
            subscriptionStatus === "active" ? (
              <button
                onClick={onCancel}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar Assinatura
              </button>
            ) : (
              <button
                onClick={onReactivate}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Reativar Assinatura
              </button>
            )
          ) : null}
        </div>
      </div>

      {/* Pricing Comparison Columns */}
      {!isPremium && (
        <div className="space-y-6">
          {/* Billing Period Selector */}
          <div className="flex justify-center">
            <div className="bg-neutral-950 border border-neutral-800 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${billingPeriod === "monthly" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${billingPeriod === "yearly" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
              >
                Anual <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Economize</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            {/* Free Plan */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Plano Gratuito</h4>
                  <div className="mt-2.5">
                    <span className="text-3xl font-black">R$ 0</span>
                    <span className="text-neutral-500 text-xs">/ sempre</span>
                  </div>
                </div>

                <div className="space-y-3.5 border-t border-neutral-900 pt-4 text-xs text-neutral-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span>Registro básico de glicose (máx 5)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-neutral-500 line-through">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Histórico ilimitado</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-neutral-500 line-through">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Resumos e insights por IA</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-neutral-500 line-through">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Relatórios profissionais para endocrinologista</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-neutral-500 line-through">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Copiloto de Nutrição inteligente</span>
                  </div>
                </div>
              </div>

              <button
                disabled
                className="w-full bg-neutral-900 text-neutral-500 border border-neutral-800 rounded-2xl py-3 text-xs font-bold transition-all uppercase tracking-wider"
              >
                Seu Plano Atual
              </button>
            </div>

            {/* Premium Plan */}
            <div className="bg-neutral-950 border-2 border-blue-600 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-md">
                Mais Popular
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Premium Saúde</h4>
                  <div className="mt-2.5">
                    <span className="text-3xl font-black">
                      {billingPeriod === "monthly" ? "R$ 29,90" : "R$ 19,90"}
                    </span>
                    <span className="text-neutral-400 text-xs">/ mês {billingPeriod === "yearly" && " (cobrado anualmente)"}</span>
                  </div>
                </div>

                <div className="space-y-3.5 border-t border-neutral-900 pt-4 text-xs text-neutral-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-bold text-neutral-100">Histórico ilimitado permanente</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-bold text-neutral-100">Análise de IA completa &amp; Padrões</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Relatórios profissionais em PDF para médicos</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Copiloto de Nutrição por Fotos &amp; Chat</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Backup automático e sincronização em nuvem</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Apoio a decisões de insulina rápidos</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCheckoutModal("pix")}
                  className="bg-neutral-900 hover:bg-neutral-800 text-neutral-100 border border-neutral-800 rounded-2xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-teal-400" />
                  Pagar com PIX
                </button>
                <button
                  onClick={() => setCheckoutModal("card")}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  Cartão Crédito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modals */}
      <AnimatePresence>
        {checkoutModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl max-w-md w-full space-y-6 relative"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                <h3 className="text-lg font-black flex items-center gap-2">
                  {checkoutModal === "pix" ? <QrCode className="w-5 h-5 text-teal-400" /> : <CreditCard className="w-5 h-5 text-blue-500" />}
                  Checkout Seguro (Cakto)
                </h3>
                <button
                  onClick={() => setCheckoutModal(null)}
                  className="text-neutral-500 hover:text-neutral-300 text-xs font-bold"
                >
                  Fechar
                </button>
              </div>

              {checkoutModal === "pix" ? (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-neutral-400">
                    Escaneie o código PIX abaixo ou copie o código "Copia e Cola" para confirmar sua assinatura recorrente.
                  </p>

                  {/* QR Code Placeholder */}
                  <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=glycoai-simulated-checkout-pix-subscription"
                      alt="PIX QR Code"
                      className="w-44 h-44 object-contain"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={copyPixCode}
                      className="bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer"
                    >
                      {pixCopied ? "Código Copiado!" : "Copiar Código Copia e Cola"}
                    </button>
                    <button
                      onClick={handlePixSimulatePaid}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Confirmando pagamento...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Simular Confirmação de Pagamento
                        </>
                      )}
                    </button>
                  </div>
                  <span className="text-xxs text-neutral-500 font-mono block">PIX processado via Cakto Pagamentos recorrentes</span>
                </div>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xxs font-bold text-neutral-400 uppercase tracking-wider mb-1">Nome no Cartão</label>
                    <input
                      type="text"
                      required
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="JOÃO SILVA"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xxs font-bold text-neutral-400 uppercase tracking-wider mb-1">Número do Cartão</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4000 1234 5678 9010"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xxs font-bold text-neutral-400 uppercase tracking-wider mb-1">Validade</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/AA"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xxs font-bold text-neutral-400 uppercase tracking-wider mb-1">CVV</label>
                      <input
                        type="password"
                        required
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processando assinatura...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Assinar plano recorrente ({billingPeriod === "monthly" ? "R$ 29,90" : "R$ 199,90"})
                      </>
                    )}
                  </button>
                  <span className="text-xxs text-neutral-500 font-mono block text-center">Transação criptografada de ponta-a-ponta via Cakto</span>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
