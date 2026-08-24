"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>Sign in</h2>
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
            <button className="primary" type="submit" style={{ width: "100%" }}>Sign in</button>
          </form>
        </div>
      </div>
    </div>
  );
}