"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCall[];
  pending_action?: PendingAction;
  sources?: Source[];
  id: string;
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

interface PendingAction {
  type: string;
  args: Record<string, unknown>;
  description: string;
}

interface Source {
  name: string;
  authority: number;
  section: string;
}

interface DashboardData {
  snapshot_time: string;
  summary: {
    total_open_tickets: number;
    p1_open: number;
    p2_open: number;
    p3_open: number;
    sla_breaches: number;
    open_escalations: number;
    active_ticket_clusters: number;
    carrier_anomalies: number;
  };
  sla_breaches: SLABreach[];
  ticket_clusters: TicketCluster[];
  carrier_anomalies: CarrierAnomaly[];
  recent_escalations: Escalation[];
}

interface SLABreach {
  ticket: { ticket_id: string; severity: string; subject: string; account_id: string };
  account: { company_name: string; plan: string };
  target_minutes: number;
  elapsed_minutes: number;
  breached: boolean;
  minutes_over: number;
}

interface TicketCluster {
  tag: string;
  count: number;
  accounts: string[];
  severity_distribution: Record<string, number>;
  tickets: { ticket_id: string; subject: string }[];
}

interface CarrierAnomaly {
  carrier: string;
  late_pickup_rate: number;
  affected_accounts: string[];
  late_pickups: { order_id: string }[];
}

interface Escalation {
  escalation_id: string;
  ticket_id: string;
  priority: string;
  status: string;
  reason: string;
}

const TOOL_ICONS: Record<string, string> = {
  search_documents: "📄",
  get_order: "📦",
  get_ticket: "🎫",
  get_account_summary: "🏢",
  get_orders_for_account: "📦",
  get_tickets_for_account: "🎫",
  calculate_cancellation_fee: "💰",
  calculate_service_credit: "✨",
  create_escalation: "🚨",
  create_task: "✅",
  get_all_tickets: "🎫",
  get_all_accounts: "🏢",
  get_all_orders: "📦",
  detect_sla_breaches: "⏱️",
  detect_ticket_clusters: "🔍",
  detect_carrier_anomalies: "🚚",
};

const TOOL_LABELS: Record<string, string> = {
  search_documents: "Searching documents",
  get_order: "Looking up order",
  get_ticket: "Looking up ticket",
  get_account_summary: "Checking account",
  calculate_cancellation_fee: "Calculating cancellation fee",
  calculate_service_credit: "Calculating service credit",
  create_escalation: "Preparing escalation",
  create_task: "Preparing task",
  get_all_tickets: "Loading all tickets",
  get_all_accounts: "Loading accounts",
  detect_sla_breaches: "Scanning SLA breaches",
  detect_ticket_clusters: "Detecting patterns",
  detect_carrier_anomalies: "Analysing carriers",
};

const SUGGESTED_INTERNAL = [
  "Which tickets are approaching or past SLA?",
  "Show me all bulk upload issues across accounts",
  "Analyse SwiftShip carrier performance",
  "Check Northstar's open tickets and status",
  "Calculate service credit for ORD-2002",
  "What issues need attention right now?",
];

const severityColor: Record<string, string> = {
  P1: "#ef4444",
  P2: "#f59e0b",
  P3: "#3b82f6",
};

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className="text-2xl">{icon}</div>
      <div>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-amber-400 typing-dot" />
      <div className="w-2 h-2 rounded-full bg-amber-400 typing-dot" />
      <div className="w-2 h-2 rounded-full bg-amber-400 typing-dot" />
    </div>
  );
}

export default function InternalPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<"chat" | "dashboard">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const getToken = () => localStorage.getItem("pp_token") || "";

  useEffect(() => {
    const userData = localStorage.getItem("pp_user");
    const token = localStorage.getItem("pp_token");
    if (!userData || !token) { router.push("/"); return; }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "internal") { router.push("/customer"); return; }
    setUser(parsed);

    setMessages([{
      id: "welcome",
      role: "assistant",
      content: `Welcome to the **ParcelPilot Internal Support Dashboard**.\n\nI have full access to all customer accounts, orders, and tickets. I can:\n\n- 🔍 **Investigate** specific customer issues across all accounts\n- 📊 **Analyse patterns** — SLA breaches, ticket clusters, carrier anomalies\n- 💰 **Calculate** service credits and cancellation fees\n- 🚨 **Create escalations** and follow-up tasks\n- 📄 **Search** all policy documents and customer agreements\n\nThe dashboard panel shows real-time proactive insights. What would you like to investigate?`,
    }]);

    // Load dashboard
    fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { setDashboard(data); setDashboardLoading(false); })
      .catch(() => setDashboardLoading(false));
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string, confirmedAction?: PendingAction) => {
      if (!text.trim() && !confirmedAction) return;
      setLoading(true);
      setActiveTools([]);

      const userMessage: Message = { id: Date.now().toString(), role: "user", content: text };
      const newMessages = confirmedAction ? messages : [...messages, userMessage];
      if (!confirmedAction) setMessages(newMessages);

      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ messages: apiMessages, confirmed_action: confirmedAction }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");

        if (data.tool_calls?.length > 0) {
          setActiveTools(data.tool_calls.map((tc: ToolCall) => tc.name));
          setTimeout(() => setActiveTools([]), 3000);
        }

        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text,
          tool_calls: data.tool_calls,
          pending_action: data.pending_action,
          sources: data.sources,
        }]);
        setPendingAction(data.pending_action);
      } catch (err) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Error: ${(err as Error).message}`,
        }]);
      } finally {
        setLoading(false);
        setInput("");
      }
    },
    [messages]
  );

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    setPendingAction(null);
    sendMessage("Action confirmed.", pendingAction);
  };

  const handleLogout = () => {
    localStorage.removeItem("pp_token");
    localStorage.removeItem("pp_user");
    router.push("/");
  };

  const investigateCluster = (cluster: TicketCluster) => {
    setActivePanel("chat");
    const q = `Investigate the "${cluster.tag}" issue cluster — ${cluster.count} tickets across ${cluster.accounts.length} accounts. What's happening and what should we do?`;
    sendMessage(q);
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">ParcelPilot Internal Dashboard</h1>
            <p className="text-xs text-amber-500/80">Staff Access — Full data visibility</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Panel Tabs */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setActivePanel("chat")}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${activePanel === "chat" ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
              style={{ background: activePanel === "chat" ? "var(--accent)" : "var(--bg-secondary)" }}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActivePanel("dashboard")}
              className={`px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1 ${activePanel === "dashboard" ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
              style={{ background: activePanel === "dashboard" ? "#f59e0b" : "var(--bg-secondary)" }}
            >
              📊 Insights
              {dashboard?.summary.sla_breaches && dashboard.summary.sla_breaches > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{dashboard.summary.sla_breaches}</span>
              )}
            </button>
          </div>
          {user && <p className="text-xs text-slate-400">{user.email}</p>}
          <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      {/* Active Tool Bar */}
      {activeTools.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ background: "rgba(245,158,11,0.1)", borderBottom: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 font-medium">
            {activeTools.map((t) => `${TOOL_ICONS[t] || "🔧"} ${TOOL_LABELS[t] || t}`).join(" → ")}
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Chat Panel ─── */}
        {activePanel === "chat" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 animate-fade-in ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={message.role === "user"
                      ? { background: "#f59e0b" }
                      : { background: "linear-gradient(135deg, #92400e, #d97706)" }
                    }
                  >
                    {message.role === "user" ? (user?.name?.[0] || "S") : "AI"}
                  </div>

                  <div className={`flex flex-col gap-2 max-w-[85%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className="px-4 py-3 rounded-2xl text-sm"
                      style={message.role === "user"
                        ? { background: "linear-gradient(135deg, #92400e, #d97706)", color: "white", borderRadius: "16px 16px 4px 16px" }
                        : { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "4px 16px 16px 16px" }
                      }
                    >
                      {message.role === "assistant" ? (
                        <div className="message-content"><ReactMarkdown>{message.content}</ReactMarkdown></div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>

                    {message.tool_calls && message.tool_calls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {[...new Set(message.tool_calls.map((tc) => tc.name))].map((toolName) => (
                          <span key={toolName} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
                            {TOOL_ICONS[toolName] || "🔧"} {TOOL_LABELS[toolName] || toolName}
                          </span>
                        ))}
                      </div>
                    )}

                    {message.sources && message.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {message.sources.slice(0, 4).map((src, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#93c5fd" }}
                            title={src.section}>
                            📌 {src.name.split("(")[0].trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #92400e, #d97706)" }}>
                    AI
                  </div>
                  <div className="rounded-2xl rounded-tl-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Confirmation Modal */}
            {pendingAction && (
              <div className="mx-4 mb-3 p-4 rounded-xl border" style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)" }}>
                <div className="flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-400 mb-1">Confirm Action</p>
                    <p className="text-sm text-slate-300">{pendingAction.description}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleConfirmAction}
                        className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
                        style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                        ✓ Confirm
                      </button>
                      <button onClick={() => setPendingAction(null)}
                        className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-300 border border-slate-600">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                {SUGGESTED_INTERNAL.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-amber-500/60 hover:text-amber-400 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  placeholder="Investigate a customer issue, analyse patterns, or query any order/ticket…"
                  rows={1}
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none resize-none transition-all"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", maxHeight: "120px", minHeight: "44px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 4px 12px rgba(245,158,11,0.3)" }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Dashboard Panel ─── */}
        {activePanel === "dashboard" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {dashboardLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Loading intelligence…</span>
                </div>
              </div>
            ) : dashboard ? (
              <>
                {/* Summary Stats */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Snapshot: {new Date(dashboard.snapshot_time).toLocaleString()}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Open Tickets" value={dashboard.summary.total_open_tickets} color="#f1f5f9" icon="🎫" />
                    <StatCard label="SLA Breaches" value={dashboard.summary.sla_breaches} color="#ef4444" icon="⏱️" />
                    <StatCard label="Issue Clusters" value={dashboard.summary.active_ticket_clusters} color="#f59e0b" icon="🔍" />
                    <StatCard label="Carrier Anomalies" value={dashboard.summary.carrier_anomalies} color="#8b5cf6" icon="🚚" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <StatCard label="P1 Open" value={dashboard.summary.p1_open} color="#ef4444" icon="🔴" />
                    <StatCard label="P2 Open" value={dashboard.summary.p2_open} color="#f59e0b" icon="🟡" />
                    <StatCard label="P3 Open" value={dashboard.summary.p3_open} color="#3b82f6" icon="🔵" />
                  </div>
                </div>

                {/* SLA Breaches */}
                {dashboard.sla_breaches.filter(b => b.breached).length > 0 && (
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                      ⏱️ SLA Response Breaches
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        {dashboard.sla_breaches.filter(b => b.breached).length}
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {dashboard.sla_breaches.filter(b => b.breached).map((breach) => (
                        <div key={breach.ticket.ticket_id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: severityColor[breach.ticket.severity] + "22", color: severityColor[breach.ticket.severity] }}>
                            {breach.ticket.severity}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 truncate">{breach.ticket.subject}</p>
                            <p className="text-xs text-slate-500">{breach.account.company_name} · {breach.ticket.ticket_id}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-red-400">+{Math.round(breach.minutes_over)}m</p>
                            <p className="text-xs text-slate-500">over target</p>
                          </div>
                          <button
                            onClick={() => { setActivePanel("chat"); sendMessage(`Investigate ${breach.ticket.ticket_id} — SLA breach for ${breach.account.company_name}. ${breach.ticket.subject}`); }}
                            className="text-xs px-2 py-1 rounded-lg text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-all"
                          >
                            Investigate →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ticket Clusters */}
                {dashboard.ticket_clusters.length > 0 && (
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-amber-400 mb-3">🔍 Recurring Issue Clusters</h3>
                    <div className="space-y-2">
                      {dashboard.ticket_clusters.map((cluster) => (
                        <div key={cluster.tag} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-slate-200">{cluster.tag}</p>
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{cluster.count} tickets</span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {cluster.accounts.length} account{cluster.accounts.length > 1 ? "s" : ""} affected
                              {Object.entries(cluster.severity_distribution).map(([sev, cnt]) => ` · ${cnt}×${sev}`)}
                            </p>
                          </div>
                          <button
                            onClick={() => investigateCluster(cluster)}
                            className="text-xs px-2 py-1 rounded-lg text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-all"
                          >
                            Investigate →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Carrier Anomalies */}
                {dashboard.carrier_anomalies.length > 0 && (
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-purple-400 mb-3">🚚 Carrier Performance Anomalies</h3>
                    <div className="space-y-2">
                      {dashboard.carrier_anomalies.map((anomaly) => (
                        <div key={anomaly.carrier} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-200">{anomaly.carrier}</p>
                            <p className="text-xs text-slate-500">
                              {anomaly.late_pickups.length} late pickup{anomaly.late_pickups.length > 1 ? "s" : ""} · {(anomaly.late_pickup_rate * 100).toFixed(0)}% late rate · {anomaly.affected_accounts.length} account{anomaly.affected_accounts.length > 1 ? "s" : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => { setActivePanel("chat"); sendMessage(`Analyse ${anomaly.carrier} pickup performance issues affecting accounts: ${anomaly.affected_accounts.join(", ")}`); }}
                            className="text-xs px-2 py-1 rounded-lg text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all"
                          >
                            Analyse →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Escalations */}
                {dashboard.recent_escalations.length > 0 && (
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-slate-400 mb-3">🚨 Active Escalations</h3>
                    <div className="space-y-2">
                      {dashboard.recent_escalations.map((esc) => (
                        <div key={esc.escalation_id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: severityColor[esc.priority] + "22", color: severityColor[esc.priority] }}>
                            {esc.priority}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 truncate">{esc.reason}</p>
                            <p className="text-xs text-slate-500">{esc.escalation_id} · {esc.ticket_id}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${esc.status === "OPEN" ? "text-red-400 bg-red-500/10" : "text-green-400 bg-green-500/10"}`}>
                            {esc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">Failed to load dashboard data.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
