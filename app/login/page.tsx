"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Logo from "@/components/Logo";
import Link from "next/link";

const TIPS = [
  { label: "Multi-site work orders", body: "Track maintenance across every site from one dashboard." },
  { label: "Automated PM scheduling", body: "Preventive maintenance work orders generate themselves, on schedule." },
  { label: "Instant PDF reports", body: "Service reports and defect forms generate and email themselves." },
  { label: "Real-time alerts", body: "Telegram and email notifications keep your team in sync." },
  { label: "Team-based routing", body: "Work automatically routes to the right team, every time." },
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Enter your email or username, and password.");
      return;
    }
    const res = await signIn("credentials", { identifier, password, redirect: false });
    if (res?.error) {
      setError("That email/username or password isn't right.");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="login-shell">
      <div className={`login-form-side ${mounted ? "in" : ""}`}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div className="card login-card">
            <Logo size={22} />
            <h2 style={{ marginTop: 16, marginBottom: 4 }}>Sign in</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0, marginBottom: 20 }}>
              ADTECH Maintenance Work Order System
            </p>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Email or Username</label>
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%" }} />
              </div>
              {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
              <button className="primary" type="submit" style={{ width: "100%", marginTop: 8 }}>Sign in</button>
            </form>
            <p style={{ fontSize: 13, textAlign: "center", marginTop: 16 }}>
              <Link href="/register">Don't have an account? Register</Link>
            </p>
          </div>
        </div>
      </div>

      <div className={`login-showcase-side ${mounted ? "in" : ""}`}>
        <svg className="login-network" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
          <g stroke="var(--login-teal)" strokeWidth="1" opacity="0.5">
            <line x1="60" y1="90" x2="180" y2="60" />
            <line x1="180" y1="60" x2="320" y2="110" />
            <line x1="320" y1="110" x2="440" y2="70" />
            <line x1="60" y1="90" x2="100" y2="220" />
            <line x1="100" y1="220" x2="240" y2="200" />
            <line x1="240" y1="200" x2="320" y2="110" />
            <line x1="240" y1="200" x2="260" y2="330" />
            <line x1="100" y1="220" x2="70" y2="360" />
            <line x1="260" y1="330" x2="70" y2="360" />
            <line x1="260" y1="330" x2="400" y2="380" />
            <line x1="320" y1="110" x2="440" y2="230" />
            <line x1="440" y1="230" x2="400" y2="380" />
            <line x1="440" y1="70" x2="440" y2="230" />
          </g>
          {[
            [60, 90], [180, 60], [320, 110], [440, 70], [100, 220],
            [240, 200], [260, 330], [70, 360], [400, 380], [440, 230],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="5" fill="var(--login-teal)" className="login-node" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </svg>
        <div className="login-showcase-content">
          <h1 className="login-showcase-title">Built for how your team actually works.</h1>
          <div className="login-tip-stack">
            {TIPS.map((tip, i) => (
              <div key={tip.label} className={`login-tip ${i === tipIndex ? "active" : ""}`}>
                <span className="login-tip-label">{tip.label}</span>
                <span className="login-tip-body">{tip.body}</span>
              </div>
            ))}
          </div>
          <div className="login-tip-dots">
            {TIPS.map((_, i) => (
              <span key={i} className={`login-tip-dot ${i === tipIndex ? "active" : ""}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}