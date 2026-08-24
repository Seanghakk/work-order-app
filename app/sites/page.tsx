"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function SitesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [sites, setSites] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  function load() {
    fetch("/api/sites").then((r) => r.json()).then((data) => Array.isArray(data) && setSites(data));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Site name is required."); return; }
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setName(""); setAddress(""); setError("");
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/sites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    load();
  }

  async function removeSite(id: string) {
    if (!confirm("Delete this site? It must have no assets, work orders, or sale orders linked to it.")) return;
    const res = await fetch(`/api/sites/${id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error); return; }
    load();
  }

  return (
    <div className="container">
      <h1>Sites</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
        Manage the physical sites your team operates across. Assign users to sites from the Users page.
      </p>
      {isAdmin && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Phnom Penh HQ" /></div>
          <div><label>Address (optional)</label><input value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: 260 }} /></div>
          <button className="primary" type="submit">Add site</button>
        </form>
      )}
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      <div className="table-scroll">
      <table>
        <thead><tr><th>Name</th><th>Address</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.address || "—"}</td>
              <td>
                {isAdmin ? (
                  <button onClick={() => toggleActive(s.id, !s.active)}>
                    {s.active ? "Active — deactivate" : "Inactive — reactivate"}
                  </button>
                ) : (
                  s.active ? "Active" : "Inactive"
                )}
              </td>
              {isAdmin && <td><button className="danger" onClick={() => removeSite(s.id)}>Delete</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
