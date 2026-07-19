import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { Activity, Mail, Lock, Sparkles, ArrowRight, CheckCircle, AlertCircle, Heart } from "lucide-react";

interface AuthViewProps {
  onAuthSuccess: (uid: string, email: string) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [forgotPassword, setForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (forgotPassword) {
        await sendPasswordResetEmail(auth, email);
        setMessage({
          type: "success",
          text: "E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada."
        });
        setForgotPassword(false);
      } else if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(userCredential.user.uid, userCredential.user.email || "");
      } else {
        if (!name.trim()) {
          throw new Error("Por favor, informe seu nome.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        onAuthSuccess(userCredential.user.uid, userCredential.user.email || "");
      }
    } catch (err: any) {
      console.error("Erro na autenticação:", err);
      let errorText = "Ocorreu um erro. Verifique os dados fornecidos.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        errorText = "E-mail ou senha incorretos.";
      } else if (err.code === "auth/email-already-in-use") {
        errorText = "Este e-mail já está em uso.";
      } else if (err.code === "auth/weak-password") {
        errorText = "A senha deve conter pelo menos 6 caracteres.";
      } else if (err.code === "auth/invalid-email") {
        errorText = "E-mail inválido.";
      } else if (err.message) {
        errorText = err.message;
      }
      setMessage({ type: "error", text: errorText });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onAuthSuccess(result.user.uid, result.user.email || "");
    } catch (err: any) {
      console.error("Erro no login do Google:", err);
      setMessage({
        type: "error",
        text: "O login com Google falhou ou foi bloqueado. Se estiver usando o iframe, clique em 'Abrir em nova aba' acima para permitir popups."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-view" className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 text-neutral-100 selection:bg-blue-600/30 selection:text-white relative overflow-hidden">
      {/* Background ambient spots */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3 animate-pulse">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Glyco <span className="text-blue-500">AI</span></h1>
          <p className="text-xs text-neutral-400 mt-1.5 text-center max-w-xs">
            Seu copiloto inteligente para controle da glicemia, alimentação e saúde digital.
          </p>
        </div>

        <motion.div 
          layout
          className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle line decoration */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

          <AnimatePresence mode="wait">
            {forgotPassword ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h2 className="text-lg font-bold text-neutral-100">Recuperar Senha</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Digite seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xxs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">E-mail</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                        placeholder="exemplo@email.com"
                      />
                    </div>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                      message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {message.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                      <span>{message.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-md hover:shadow-blue-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Enviando..." : "Enviar link de recuperação"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotPassword(false);
                      setMessage(null);
                    }}
                    className="w-full text-center text-xs text-neutral-400 hover:text-neutral-200 mt-2 transition-colors"
                  >
                    Voltar para o Login
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key={isLogin ? "login" : "register"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-3">
                  <button 
                    onClick={() => {
                      setIsLogin(true);
                      setMessage(null);
                    }}
                    className={`text-base font-bold pb-2 transition-colors relative cursor-pointer ${isLogin ? "text-neutral-100" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    Entrar
                    {isLogin && <motion.div layoutId="tab-line" className="absolute bottom-0 inset-x-0 h-[2px] bg-blue-500" />}
                  </button>
                  <button 
                    onClick={() => {
                      setIsLogin(false);
                      setMessage(null);
                    }}
                    className={`text-base font-bold pb-2 transition-colors relative cursor-pointer ${!isLogin ? "text-neutral-100" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    Criar Conta
                    {!isLogin && <motion.div layoutId="tab-line" className="absolute bottom-0 inset-x-0 h-[2px] bg-blue-500" />}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="block text-xxs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                        placeholder="João Silva"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xxs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">E-mail</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                        placeholder="exemplo@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xxs font-bold text-neutral-400 uppercase tracking-wider">Senha</label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            setForgotPassword(true);
                            setMessage(null);
                          }}
                          className="text-xxs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                      message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {message.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                      <span>{message.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-md hover:shadow-blue-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Processando..." : isLogin ? "Acessar Plataforma" : "Criar Minha Conta"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-neutral-800"></div>
                    <span className="flex-shrink mx-3 text-xxs font-bold text-neutral-500 uppercase tracking-widest">ou</span>
                    <div className="flex-grow border-t border-neutral-800"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    {/* Google SVG Icon */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    Continuar com o Google
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Regulatory footer */}
        <p className="text-center text-xxs text-neutral-600 mt-6 leading-relaxed">
          Ao prosseguir, você concorda com os Termos de Uso e Política de Privacidade da Glyco AI.<br />
          Plataforma em conformidade com a LGPD. Todos os dados clínicos são criptografados.
        </p>
      </div>
    </div>
  );
}
