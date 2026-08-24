"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AccountPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [telegramConnected, setTelegramConnected] = useState<boolean | null>(null);

  function loadTelegramStatus() {
    fetch("/api/account").then((r) => r.json()).then((data) => setTelegramConnected(!!data.telegramConnected));
  }
  useEffect(loadTelegramStatus, []);

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

  async function disconnectTelegram() {
    if (!confirm("Disconnect Telegram? You'll stop receiving notifications there.")) return;
    await fetch("/api/account/telegram", { method: "DELETE" });
    loadTelegramStatus();
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const connectUrl = session?.user?.id && botUsername ? `https://t.me/${botUsername}?start=${session.user.id}` : null;

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>My account</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Telegram notifications</h3>
        {telegramConnected === null ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Checking…</p>
        ) : telegramConnected ? (
          <>
            <p style={{ fontSize: 13, color: "var(--success)" }}>✓ Connected — you'll get notifications on Telegram as well as email.</p>
            <button className="danger" onClick={disconnectTelegram}>Disconnect Telegram</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Get instant notifications on Telegram in addition to email.
            </p>
            {connectUrl ? (
              <a href={connectUrl} target="_blank" rel="noreferrer"><button className="primary">Connect Telegram</button></a>
            ) : (
              <p style={{ fontSize: 13, color: "var(--danger)" }}>Telegram isn't configured yet — ask your administrator.</p>
            )}
          </>
        )}
      </div>

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