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

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [uploadingSignature, setUploadingSignature] = useState(false);

  function loadAccount() {
    fetch("/api/account").then((r) => r.json()).then((data) => {
      setTelegramConnected(!!data.telegramConnected);
      setEditName(data.name || "");
      setEditUsername(data.username || "");
      setEditPosition(data.position || "");
      setSignatureUrl(data.signatureUrl || null);
    });
  }
  useEffect(loadAccount, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    if (!editName.trim()) {
      setProfileError("Name can't be empty.");
      return;
    }
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, username: editUsername, position: editPosition }),
    });
    if (!res.ok) {
      const data = await res.json();
      setProfileError(data.error || "Something went wrong.");
      return;
    }
    setProfileSuccess("Profile updated.");
    loadAccount();
  }

  async function handleSignatureSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSignature(true);
    setProfileError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/account/signature", { method: "POST", body: formData });
    setUploadingSignature(false);
    e.target.value = "";
    if (!res.ok) {
      const d = await res.json();
      setProfileError(d.error || "Signature upload failed.");
      return;
    }
    loadAccount();
  }

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
    loadAccount();
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const connectUrl = session?.user?.id && botUsername ? `https://t.me/${botUsername}?start=${session.user.id}` : null;

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>My account</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Profile</h3>
        <form onSubmit={saveProfile}>
          <div className="field">
            <label>Full name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: "100%" }} />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Name changes take effect the next time you sign in.
            </p>
          </div>
          <div className="field">
            <label>Username (optional)</label>
            <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} style={{ width: "100%" }} placeholder="e.g. jdoe" />
          </div>
          <div className="field">
            <label>Position (optional)</label>
            <input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} style={{ width: "100%" }} placeholder="e.g. Senior Technician" />
          </div>
          {profileError && <p style={{ color: "var(--danger)", fontSize: 13 }}>{profileError}</p>}
          {profileSuccess && <p style={{ color: "var(--success)", fontSize: 13 }}>{profileSuccess}</p>}
          <button className="primary" type="submit">Save profile</button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Signature</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Used on work order reports wherever you appear as the preparer, checker, or approver.
        </p>
        {signatureUrl && (
          <img src={signatureUrl} alt="Your signature" style={{ maxWidth: 220, maxHeight: 80, display: "block", marginBottom: 10, border: "1px solid var(--border)", borderRadius: 6, background: "white" }} />
        )}
        <input type="file" accept="image/*" onChange={handleSignatureSelect} disabled={uploadingSignature} />
        {uploadingSignature && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Uploading…</p>}
        {!signatureUrl && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>No signature uploaded yet.</p>}
      </div>

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
