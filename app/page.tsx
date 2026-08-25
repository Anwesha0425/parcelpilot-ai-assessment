"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type DemoUser = {
  email: string;
  label: string;
  role: "customer" | "internal";
  badge: string;
  color: string;
};

const DEMO_USERS: DemoUser[] = [
  {
    email: "customer@northstar.com",
    label: "Northstar Logistics",
    role: "customer",
    badge: "Enterprise",
    color: "#3b82f6",
  },
  {
    email: "customer@lumenworks.com",
    label: "LumenWorks",
    role: "customer",
    badge: "Growth",
    color: "#10b981",
  },
  {
    email: "customer@brightmove.com",
    label: "BrightMove Retail",
    role: "customer",
    badge: "Standard",
    color: "#6b7280",
  },
  {
    email: "ops@parcelpilot.com",
    label: "ParcelPilot Ops Team",
    role: "internal",
    badge: "Internal",
    color: "#f59e0b",
  },
  {
    email: "admin@parcelpilot.com",
    label: "ParcelPilot Admin",
    role: "internal",
    badge: "Admin",
    color: "#ef4444",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("pass");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent | null, prefillEmail?: string) => {
    if (e) e.preventDefault();
    const loginEmail = prefillEmail || email;
    if (!loginEmail) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      localStorage.setItem("pp_token", data.token);
      localStorage.setItem("pp_user", JSON.stringify(data.user));

      if (data.user.role === "internal") {
        router.push("/internal");
      } else {
        router.push("/customer");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gradient-bg">
      {/* Logo / Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg" style={{ boxShadow: "0 0 32px rgba(59,130,246,0.4)" }}>
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">ParcelPilot Support AI</h1>
        <p className="text-slate-400 text-sm">AI-powered logistics support platform</p>
      </div>

      <div className="w-full max-w-md">
        {/* Quick Demo Login */}
        <div className="glass-card p-5 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Demo Login (password: pass)</p>
          <div className="space-y-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                onClick={() => handleLogin(null, u.email)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:border-blue-500/60 hover:bg-slate-800/60 transition-all duration-200 text-left group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: u.color }}
                >
                  {u.label[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{u.label}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: u.color + "22",
                    color: u.color,
                    border: `1px solid ${u.color}44`,
                  }}
                >
                  {u.badge}
                </span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Login */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Manual Login</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 placeholder-slate-500 outline-none transition-all"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-200 placeholder-slate-500 outline-none transition-all"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? "#2563eb" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Assessment submission for ParcelPilot AI Support System
        </p>
      </div>
    </div>
  );
}
