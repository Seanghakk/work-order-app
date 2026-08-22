"use client";
import { useState } from "react";

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    setSuccess("Password updated.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>My account</h1>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Change password</h3>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Current password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div className="field">
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: "100%" }} placeholder="8+ characters" />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: "100%" }} />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
          {success && <p style={{ color: "var(--success)", fontSize: 13 }}>{success}</p>}
          <button className="primary" type="submit">Update password</button>
        </form>
      </div>
    </div>
  );
}