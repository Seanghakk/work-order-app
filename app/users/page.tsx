"use client";
import { useEffect, useState } from "react";

const ROLES = ["REQUESTER", "TECHNICIAN", "MANAGER", "ADMIN", "SALES", "ENGINEERING", "AA"];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "REQUESTER" });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  function load() {
    fetch("/api/users").then((r) => r.json()).then((data) => Array.isArray(data) ? setUsers(data) : setError(data.error));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError("Name, email, and a password of at least 8 characters are required.");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setForm({ name: "", email: "", password: "", role: "REQUESTER" });
    setError("");
    load();
  }

  async function updateRole(id: string, role: string) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function resetPassword(id: string) {
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setEditingId(null);
    setNewPassword("");
    setError("");
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    load();
  }

  async function removeUser(id: string) {
    if (!confirm("Remove this user? This can't be undone.")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error); return; }
    load();
  }

  return (
    <div className="container">
      <h1>Users</h1>

      <form onSubmit={handleCreate} className="card" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8+ characters" /></div>
        <div>
          <label>Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button className="primary" type="submit">Add user</button>
      </form>
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <div className="table-scroll">
      <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Reset password</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td>
                <button onClick={() => toggleActive(u.id, !u.active)}>
                  {u.active ? "Active — deactivate" : "Inactive — reactivate"}
                </button>
              </td>
              <td>
                {editingId === u.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: 140 }} />
                    <button onClick={() => resetPassword(u.id)}>Save</button>
                    <button onClick={() => { setEditingId(null); setNewPassword(""); }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditingId(u.id)}>Reset password</button>
                )}
              </td>
              <td><button className="danger" onClick={() => removeUser(u.id)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}