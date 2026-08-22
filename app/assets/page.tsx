"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AssetsPage() {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", tag: "", location: "", category: "" });
  const [error, setError] = useState("");
  const canAdd = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  function load() {
    fetch("/api/assets").then((r) => r.json()).then(setAssets);
  }
  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.tag.trim()) { setError("Name and tag are required."); return; }
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setForm({ name: "", tag: "", location: "", category: "" });
    setError("");
    load();
  }

  return (
    <div className="container">
      <h1>Assets</h1>
      {canAdd && (
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Tag</label><input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="AHU-02" /></div>
          <div><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div><label>Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="HVAC" /></div>
          <button className="primary" type="submit">Add asset</button>
        </form>
      )}
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      <table>
        <thead><tr><th>Name</th><th>Tag</th><th>Location</th><th>Category</th><th>Status</th></tr></thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id}><td>{a.name}</td><td>{a.tag}</td><td>{a.location || "—"}</td><td>{a.category || "—"}</td><td>{a.status}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
