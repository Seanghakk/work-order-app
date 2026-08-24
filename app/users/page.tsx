"use client";
import { useEffect, useState } from "react";

const ROLES = ["REQUESTER", "TECHNICIAN", "MANAGER", "ADMIN", "SALES", "ENGINEERING", "AA", "TNC_ENGINEER", "TNC_LEADER", "MAINTENANCE_SUP"];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "", role: "REQUESTER" });
  const [formSiteIds, setFormSiteIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editingInfoId, setEditingInfoId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editingSitesId, setEditingSitesId] = useState<string | null>(null);
  const [editSiteIds, setEditSiteIds] = useState<string[]>([]);

  function load() {
    fetch("/api/users").then((r) => r.json()).then((data) => Array.isArray(data) ? setUsers(data) : setError(data.error));
    fetch("/api/sites").then((r) => r.json()).then((data) => Array.isArray(data) && setSites(data));
  }
  useEffect(load, []);

  function toggleFormSite(id: string) {
    setFormSiteIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError("Name, email, and a password of at least 8 characters are required.");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, siteIds: formSiteIds }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setForm({ name: "", email: "", username: "", password: "", role: "REQUESTER" });
    setFormSiteIds([]);
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

  function startEditInfo(u: any) {
    setEditingInfoId(u.id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditUsername(u.username || "");
  }

  async function saveInfo(id: string) {
    if (!editName.trim() || !editEmail.trim()) { setError("Name and email can't be empty."); return; }
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, email: editEmail, username: editUsername }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setEditingInfoId(null);
    setError("");
    load();
  }

  function startEditSites(u: any) {
    setEditingSitesId(u.id);
    setEditSiteIds((u.sites || []).map((s: any) => s.site.id));
  }

  function toggleEditSite(id: string) {
    setEditSiteIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function saveSites(id: string) {
    const res = await fetch(`/api/users/${id}/sites`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteIds: editSiteIds }),
    });
    if (!res.ok) { setError((await res.json()).error || "Couldn't update site assignments."); return; }
    setEditingSitesId(null);
    setError("");
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    load();
  }

  async function approveUser(id: string) {
    await fetch(`/api/users/${id}/approve`, { method: "POST" });
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

      <form onSubmit={handleCreate} className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
          <div><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label>Username (optional)</label><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. jdoe" /></div>
          <div><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8+ characters" /></div>
          <div>
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Sites (leave empty for Admins — they see everything regardless)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {sites.map((s) => (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: "normal", fontSize: 13 }}>
                <input type="checkbox" checked={formSiteIds.includes(s.id)} onChange={() => toggleFormSite(s.id)} />
                {s.name}
              </label>
            ))}
            {sites.length === 0 && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No sites created yet — add one from the Sites page first.</span>}
          </div>
        </div>
        <button className="primary" type="submit">Add user</button>
      </form>
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <div className="table-scroll">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Username</th><th>Role</th><th>Sites</th><th>Status</th><th>Reset password</th><th></th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              {editingInfoId === u.id ? (
                <>
                  <td><input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: 130 }} /></td>
                  <td><input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ width: 170 }} /></td>
                  <td><input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username" style={{ width: 120 }} /></td>
                </>
              ) : (
                <>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.username || "—"}</td>
                </>
              )}
              <td>
                <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td style={{ minWidth: 220 }}>
                {editingSitesId === u.id ? (
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6, maxWidth: 260 }}>
                      {sites.map((s) => (
                        <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: "normal", fontSize: 12, whiteSpace: "nowrap" }}>
                          <input type="checkbox" checked={editSiteIds.includes(s.id)} onChange={() => toggleEditSite(s.id)} />
                          {s.name}
                        </label>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => saveSites(u.id)}>Save</button>
                      <button onClick={() => setEditingSitesId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                      {u.role === "ADMIN" ? "All sites" : (u.sites?.length ? u.sites.map((s: any) => s.site.name).join(", ") : "None assigned")}
                    </div>
                    <button onClick={() => startEditSites(u)}>Edit sites</button>
                  </div>
                )}
              </td>
              <td>
                {u.pendingApproval ? (
                  <div>
                    <span className="badge badge-assigned" style={{ marginBottom: 6, display: "inline-block" }}>Pending approval</span>
                    <br />
                    <button className="primary" onClick={() => approveUser(u.id)}>Approve</button>
                  </div>
                ) : (
                  <button onClick={() => toggleActive(u.id, !u.active)}>
                    {u.active ? "Active — deactivate" : "Inactive — reactivate"}
                  </button>
                )}
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
              <td>
                {editingInfoId === u.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => saveInfo(u.id)}>Save</button>
                    <button onClick={() => setEditingInfoId(null)}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => startEditInfo(u)}>Edit info</button>
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