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
  get_orders_for_account: "Loading orders",
  get_tickets_for_account: "Loading tickets",
  calculate_cancellation_fee: "Calculating cancellation fee",
  calculate_service_credit: "Calculating service credit",
  create_escalation: "Preparing escalation",
  create_task: "Preparing task",
  get_all_tickets: "Loading all tickets",
  get_all_accounts: "Loading accounts",
  get_all_orders: "Loading orders",
  detect_sla_breaches: "Scanning SLA breaches",
  detect_ticket_clusters: "Detecting patterns",
  detect_carrier_anomalies: "Analysing carriers",
};

const AUTHORITY_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: "Customer Agreement", color: "#10b981" },
  4: { label: "Current Policy", color: "#3b82f6" },
  3: { label: "SOP", color: "#8b5cf6" },
  2: { label: "Product Docs", color: "#6b7280" },
  1: { label: "Deprecated", color: "#ef4444" },
  0: { label: "Historical (context only)", color: "#374151" },
};

const SUGGESTED_QUESTIONS_CUSTOMER = [
  "Can I cancel ORD-1001 without a fee?",
  "What are my support SLA targets?",
  "I had a pickup 3 hours late — am I eligible for a credit?",
  "What is the status of my open tickets?",
  "Why is my CSV bulk upload failing?",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
      <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
      <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
    </div>
  );
}

export default function CustomerChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [user, setUser] = useState<{ name: string; email: string; account_id: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("pp_user");
    const token = localStorage.getItem("pp_token");
    if (!userData || !token) {
      router.push("/");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "customer") {
      router.push("/internal");
      return;
    }
    setUser(parsed);

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hello! I'm your ParcelPilot Support AI. I can help you with:\n\n- **Order queries** — status, cancellations, pickup issues\n- **Service credits** — eligibility and calculations\n- **Support tickets** — status and escalations\n- **Policy questions** — what your plan covers\n\nHow can I help you today?`,
      },
    ]);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const getToken = () => localStorage.getItem("pp_token") || "";

  const sendMessage = useCallback(
    async (text: string, confirmedAction?: PendingAction) => {
      if (!text.trim() && !confirmedAction) return;
      setLoading(true);
      setActiveTools([]);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      };

      const newMessages = confirmedAction
        ? messages
        : [...messages, userMessage];
      if (!confirmedAction) setMessages(newMessages);

      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            confirmed_action: confirmedAction || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Request failed");
        }

        // Show active tools briefly
        if (data.tool_calls?.length > 0) {
          setActiveTools(data.tool_calls.map((tc: ToolCall) => tc.name));
          setTimeout(() => setActiveTools([]), 2000);
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text,
          tool_calls: data.tool_calls,
          pending_action: data.pending_action,
          sources: data.sources,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setPendingAction(data.pending_action);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `⚠️ Error: ${(err as Error).message}. Please try again.`,
          },
        ]);
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
    sendMessage("Action confirmed by user.", pendingAction);
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "Action cancelled. Let me know if you need anything else.",
      },
    ]);
  };

  const handleLogout = () => {
    localStorage.removeItem("pp_token");
    localStorage.removeItem("pp_user");
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">ParcelPilot Support</h1>
            <p className="text-xs text-slate-500">Customer Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="text-right">
              <p className="text-xs font-medium text-slate-300">{user.name}</p>
              <p className="text-xs text-slate-500">{user.account_id}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Active Tool Indicator */}
      {activeTools.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ background: "rgba(59,130,246,0.1)", borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-blue-400 font-medium">
            {activeTools.map((t) => `${TOOL_ICONS[t] || "🔧"} ${TOOL_LABELS[t] || t}`).join(" → ")}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 animate-fade-in ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                message.role === "user" ? "bg-blue-600 text-white" : "text-white"
              }`}
              style={message.role === "assistant" ? { background: "linear-gradient(135deg, #1e3a5f, #2563eb)" } : {}}
            >
              {message.role === "user" ? (user?.name?.[0] || "U") : "AI"}
            </div>

            <div className={`flex flex-col gap-2 max-w-[80%] ${message.role === "user" ? "items-end" : "items-start"}`}>
              {/* Message Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  message.role === "user"
                    ? "text-white rounded-tr-sm"
                    : "rounded-tl-sm"
                }`}
                style={
                  message.role === "user"
                    ? { background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }
                    : {
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                      }
                }
              >
                {message.role === "assistant" ? (
                  <div className="message-content">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>

              {/* Tool Calls */}
              {message.tool_calls && message.tool_calls.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(message.tool_calls.map((tc) => tc.name))].map((toolName) => (
                    <span
                      key={toolName}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(59,130,246,0.1)",
                        border: "1px solid rgba(59,130,246,0.25)",
                        color: "#93c5fd",
                      }}
                    >
                      {TOOL_ICONS[toolName] || "🔧"} {TOOL_LABELS[toolName] || toolName}
                    </span>
                  ))}
                </div>
              )}

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {message.sources.slice(0, 3).map((src, i) => {
                    const auth = AUTHORITY_LABELS[src.authority] || AUTHORITY_LABELS[2];
                    return (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: auth.color + "15",
                          border: `1px solid ${auth.color}30`,
                          color: auth.color,
                        }}
                        title={src.section}
                      >
                        📌 {auth.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #1e3a5f, #2563eb)" }}>
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
                <button
                  onClick={handleConfirmAction}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                >
                  ✓ Confirm
                </button>
                <button
                  onClick={handleCancelAction}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-300 border border-slate-600 hover:border-slate-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {SUGGESTED_QUESTIONS_CUSTOMER.map((q) => (
            <button
              key={q}
              onClick={() => { setInput(q); sendMessage(q); }}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:border-blue-500/60 hover:text-blue-400 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask about your orders, tickets, or support policies…"
              rows={1}
              className="w-full px-4 py-3 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none resize-none transition-all"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                maxHeight: "120px",
                minHeight: "44px",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
