"use client";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Password and confirmation don't match.");
      return;
    }
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Registration submitted</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Your account is waiting for approval. You'll receive an email once a manager assigns your access — then you'll be able to sign in.
            </p>
            <Link href="/login"><button className="primary" style={{ width: "100%" }}>Back to sign in</button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>Create an account</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0, marginBottom: 20 }}>
            Your account will need approval before you can sign in.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%" }} placeholder="8+ characters" />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: "100%" }} />
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
            <button className="primary" type="submit" style={{ width: "100%" }}>Register</button>
          </form>
          <p style={{ fontSize: 13, textAlign: "center", marginTop: 16 }}>
            <Link href="/login">Already have an account? Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}