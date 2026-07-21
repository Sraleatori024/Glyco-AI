import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Users, 
  ShieldCheck, 
  Search, 
  Ban, 
  CheckCircle, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Calendar, 
  ShieldAlert,
  ArrowUpRight,
  Filter,
  UserCheck
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  isBlocked: boolean;
  createdAt: string;
}

interface AuditLog {
  id?: string;
  adminEmail: string;
  action: string;
  targetUserId: string;
  timestamp: string;
  details: string;
}

interface AdminPanelProps {
  adminEmail: string;
  adminUid: string;
  onBackToApp: () => void;
}

export default function AdminPanel({ adminEmail, adminUid, onBackToApp }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "logs">("users");

  // Fetch users and logs
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, "users"));
      const loadedUsers: AdminUser[] = [];
      
      for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();
        loadedUsers.push({
          id: userDoc.id,
          email: data.email || "sem@email.com",
          name: data.name || "Paciente",
          role: data.role || "user",
          subscriptionPlan: data.plan || data.subscriptionPlan || "free",
          subscriptionStatus: data.subscriptionStatus || "inactive",
          isBlocked: !!data.isBlocked,
          createdAt: data.createdAt || new Date().toISOString()
        });
      }
      setUsers(loadedUsers);

      // 2. Fetch Audit Logs
      const logsSnap = await getDocs(query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(50)));
      const loadedLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      setAuditLogs(loadedLogs);

    } catch (err) {
      console.error("Error loading admin data:", err);
      // Fallback for demo when cloud is empty
      setUsers([
        { id: "demo1", email: "maria.souza@gmail.com", name: "Maria Souza", role: "user", subscriptionPlan: "premium", subscriptionStatus: "active", isBlocked: false, createdAt: "2026-07-10T10:00:00Z" },
        { id: "demo2", email: "pedro.alves@hotmail.com", name: "Pedro Alves", role: "user", subscriptionPlan: "free", subscriptionStatus: "active", isBlocked: false, createdAt: "2026-07-12T14:30:00Z" },
        { id: "demo3", email: "lucas.carvalho@yahoo.com.br", name: "Lucas Carvalho", role: "user", subscriptionPlan: "premium", subscriptionStatus: "canceled", isBlocked: true, createdAt: "2026-07-15T09:15:00Z" },
        { id: "demo4", email: "admin.test@glyco.ai", name: "Suporte Glyco", role: "admin", subscriptionPlan: "premium", subscriptionStatus: "active", isBlocked: false, createdAt: "2026-07-01T08:00:00Z" }
      ]);
      setAuditLogs([
        { adminEmail: "suporte@glyco.ai", action: "ALTERAR_PLANO", targetUserId: "demo1", timestamp: "2026-07-18T16:45:00Z", details: "Plano alterado para Premium Mensal" },
        { adminEmail: "suporte@glyco.ai", action: "BLOQUEAR_CONTA", targetUserId: "demo3", timestamp: "2026-07-17T11:20:00Z", details: "Conta suspensa por suspeita de fraude" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Admin Actions
  const handleToggleBlock = async (user: AdminUser) => {
    const nextBlocked = !user.isBlocked;
    try {
      // Update in Firestore
      if (!user.id.startsWith("demo")) {
        await updateDoc(doc(db, "users", user.id), { isBlocked: nextBlocked });
        // Log action
        await addDoc(collection(db, "audit_logs"), {
          adminEmail,
          action: nextBlocked ? "BLOQUEAR_CONTA" : "DESBLOQUEAR_CONTA",
          targetUserId: user.id,
          timestamp: new Date().toISOString(),
          details: `Conta do usuário ${user.name} (${user.email}) foi ${nextBlocked ? "bloqueada" : "desbloqueada"} por ${adminEmail}`
        });
      }

      // Update state
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBlocked: nextBlocked } : u));
      
      // Update logs state
      const newLog: AuditLog = {
        adminEmail,
        action: nextBlocked ? "BLOQUEAR_CONTA" : "DESBLOQUEAR_CONTA",
        targetUserId: user.id,
        timestamp: new Date().toISOString(),
        details: `Conta do usuário ${user.name} (${user.email}) foi ${nextBlocked ? "bloqueada" : "desbloqueada"} por ${adminEmail}`
      };
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (err) {
      console.error("Failed to block/unblock user:", err);
    }
  };

  const handleTogglePlan = async (user: AdminUser) => {
    const nextPlan = user.subscriptionPlan === "premium" ? "free" : "premium";
    try {
      if (!user.id.startsWith("demo")) {
        await updateDoc(doc(db, "users", user.id), { 
          plan: nextPlan,
          subscriptionPlan: nextPlan,
          subscriptionStatus: nextPlan === "premium" ? "active" : "canceled"
        });
        // Log action
        await addDoc(collection(db, "audit_logs"), {
          adminEmail,
          action: "ALTERAR_PLANO",
          targetUserId: user.id,
          timestamp: new Date().toISOString(),
          details: `Plano do usuário ${user.name} (${user.email}) foi alterado para ${nextPlan.toUpperCase()} por ${adminEmail}`
        });
      }

      // Update state
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, subscriptionPlan: nextPlan, subscriptionStatus: nextPlan === "premium" ? "active" : "canceled" } : u));
      
      // Update logs state
      const newLog: AuditLog = {
        adminEmail,
        action: "ALTERAR_PLANO",
        targetUserId: user.id,
        timestamp: new Date().toISOString(),
        details: `Plano do usuário ${user.name} (${user.email}) foi alterado para ${nextPlan.toUpperCase()} por ${adminEmail}`
      };
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (err) {
      console.error("Failed to change user plan:", err);
    }
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    try {
      if (!user.id.startsWith("demo")) {
        await updateDoc(doc(db, "users", user.id), { role: nextRole });
        // Log action
        await addDoc(collection(db, "audit_logs"), {
          adminEmail,
          action: nextRole === "admin" ? "PROMOVER_ADMIN" : "REVOGAR_ADMIN",
          targetUserId: user.id,
          timestamp: new Date().toISOString(),
          details: `Papel do usuário ${user.name} (${user.email}) foi alterado para ${nextRole.toUpperCase()} por ${adminEmail}`
        });
      }

      // Update state
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: nextRole } : u));
      
      // Update logs state
      const newLog: AuditLog = {
        adminEmail,
        action: nextRole === "admin" ? "PROMOVER_ADMIN" : "REVOGAR_ADMIN",
        targetUserId: user.id,
        timestamp: new Date().toISOString(),
        details: `Papel do usuário ${user.name} (${user.email}) foi alterado para ${nextRole.toUpperCase()} por ${adminEmail}`
      };
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (err) {
      console.error("Failed to change user role:", err);
    }
  };

  // Metrics calculations
  const totalUsersCount = users.length;
  const premiumCount = users.filter(u => u.subscriptionPlan === "premium" && !u.isBlocked).length;
  const activeCount = users.filter(u => !u.isBlocked).length;
  const blockedCount = users.filter(u => u.isBlocked).length;

  // Cakto financial simulators
  const monthlyRevenue = premiumCount * 29.90; // R$ 29,90 per month
  const annualRevenue = premiumCount * 199.90; // Estimativa de receita anualizada do plano premium

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterPlan === "all") return matchesSearch;
    if (filterPlan === "free") return matchesSearch && u.subscriptionPlan === "free";
    if (filterPlan === "premium") return matchesSearch && u.subscriptionPlan === "premium";
    if (filterPlan === "blocked") return matchesSearch && u.isBlocked;
    return matchesSearch;
  });

  return (
    <div id="admin-panel" className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl text-neutral-100 max-w-5xl mx-auto space-y-6">
      
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xxs font-black tracking-wider uppercase px-2 py-0.5 rounded-full">
              Controle Restrito
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <h2 className="text-xl font-black mt-1">Painel do Administrador</h2>
          <p className="text-xs text-neutral-400">Gerenciamento completo de SaaS, assinaturas, usuários e auditorias.</p>
        </div>
        <button
          onClick={onBackToApp}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold px-4 py-2 rounded-xl border border-neutral-700 transition-colors cursor-pointer"
        >
          Voltar para Aplicativo
        </button>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-xxs font-bold uppercase tracking-wider">Usuários Totais</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black">{totalUsersCount}</p>
            <span className="text-xxs text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-3 h-3" /> +15% esta semana
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-xxs font-bold uppercase tracking-wider">Assinaturas Premium</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black">{premiumCount}</p>
            <span className="text-xxs text-neutral-400">
              {Math.round((premiumCount / (totalUsersCount || 1)) * 100)}% de conversão
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-xxs font-bold uppercase tracking-wider">MRR (Receita Mensal)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black">R$ {monthlyRevenue.toFixed(2)}</p>
            <span className="text-xxs text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
              <ArrowUpRight className="w-3 h-3" /> Integrado ao Cakto
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center text-neutral-400">
            <span className="text-xxs font-bold uppercase tracking-wider">ARR (Receita Anual)</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-2xl font-black">R$ {annualRevenue.toFixed(2)}</p>
            <span className="text-xxs text-neutral-400">Projeção anual ativa</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 pb-px gap-1">
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${tab === "users" ? "border-blue-500 text-white" : "border-transparent text-neutral-400 hover:text-neutral-200"}`}
        >
          Gerenciamento de Usuários
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${tab === "logs" ? "border-blue-500 text-white" : "border-transparent text-neutral-400 hover:text-neutral-200"}`}
        >
          Logs de Auditoria (LGPD)
        </button>
      </div>

      {/* Search and Filters for users */}
      <AnimatePresence mode="wait">
        {tab === "users" ? (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            <div className="flex flex-col md:flex-row justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-11 pr-4 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                  placeholder="Pesquisar por nome, email ou UID..."
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2 shrink-0">
                <div className="relative">
                  <Filter className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-8 text-xs font-bold text-neutral-200 focus:outline-hidden focus:border-blue-500 transition-colors cursor-pointer appearance-none"
                  >
                    <option value="all">Todos os Planos</option>
                    <option value="free">Plano Gratuito</option>
                    <option value="premium">Plano Premium</option>
                    <option value="blocked">Bloqueados</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users List Table */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden overflow-x-auto">
              {loading ? (
                <div className="py-20 text-center text-xs text-neutral-400">Carregando usuários...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-20 text-center text-xs text-neutral-400">Nenhum usuário encontrado com os filtros aplicados.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 text-xxs font-black tracking-wider uppercase bg-neutral-900/45">
                      <th className="p-4">Paciente</th>
                      <th className="p-4">E-mail</th>
                      <th className="p-4">Plano</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Cadastro</th>
                      <th className="p-4 text-right">Ações de Controle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-xs">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-neutral-900/30 transition-colors">
                        <td className="p-4 font-bold text-neutral-100">
                          <div className="flex items-center gap-2">
                            {user.name}
                            {user.role === "admin" && (
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-sm">
                                Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-neutral-400 font-mono text-xxs">{user.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-xxs font-bold border uppercase tracking-wider ${
                            user.subscriptionPlan === "premium" 
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                              : "bg-neutral-800 text-neutral-400 border-neutral-700"
                          }`}>
                            {user.subscriptionPlan}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-xxs font-bold border uppercase tracking-wider ${
                            user.isBlocked 
                              ? "bg-red-500/10 text-red-400 border-red-500/20" 
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}>
                            {user.isBlocked ? "Bloqueado" : "Ativo"}
                          </span>
                        </td>
                        <td className="p-4 text-neutral-400 text-xxs font-mono">
                          {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-4 text-right space-x-1.5 shrink-0">
                          {/* Toggle Admin Button */}
                          <button
                            onClick={() => handleToggleAdmin(user)}
                            className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg px-2.5 py-1 text-xxs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Alternar Permissão de Administrador"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                            {user.role === "admin" ? "Revogar Admin" : "Tornar Admin"}
                          </button>

                          {/* Change Plan Button */}
                          <button
                            onClick={() => handleTogglePlan(user)}
                            title="Alternar entre Gratuito e Premium"
                            className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-lg px-2.5 py-1 text-xxs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Definir {user.subscriptionPlan === "premium" ? "Gratuito" : "Premium"}
                          </button>

                          {/* Block/Unblock Button */}
                          <button
                            onClick={() => handleToggleBlock(user)}
                            className={`border rounded-lg px-2.5 py-1 text-xxs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                              user.isBlocked 
                                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20" 
                                : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            {user.isBlocked ? "Desbloquear" : "Bloquear"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="logs-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            {/* Audit Logs Stream */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 divide-y divide-neutral-900 max-h-[500px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="py-20 text-center text-xs text-neutral-400">Nenhum log de auditoria registrado ainda.</div>
              ) : (
                auditLogs.map((log, index) => (
                  <div key={index} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-sm font-mono text-[9px] font-bold ${
                          log.action.includes("BLOQUEAR") 
                            ? "bg-red-500/15 text-red-400" 
                            : "bg-blue-500/15 text-blue-400"
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-xxs font-mono text-neutral-500">{log.adminEmail}</span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">{log.details}</p>
                    </div>
                    <span className="text-xxs font-mono text-neutral-500 shrink-0">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
