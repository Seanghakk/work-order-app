"use client";
import { useEffect, useState } from "react";

export default function PMSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", assetId: "", frequencyDays: "90", taskTemplate: "" });
  const [error, setError] = useState("");

  function load() {
    fetch("/api/pm-schedules").then((r) => r.json()).then(setSchedules);
    fetch("/api/assets").then((r) => r.json()).then(setAssets);
  }
  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.assetId || !form.taskTemplate.trim()) {
      setError("Name, asset, and task are required.");
      return;
    }
    const res = await fetch("/api/pm-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setForm({ name: "", assetId: "", frequencyDays: "90", taskTemplate: "" });
    setError("");
    load();
  }

  async function removeSchedule(id: string) {
    if (!confirm("Delete this PM schedule? This can't be undone.")) return;
    const res = await fetch(`/api/pm-schedules/${id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error); return; }
    setError("");
    load();
  }

  return (
    <div className="container">
      <span className="eyebrow">Maintenance</span>
      <h1>PM schedules</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
        Recurring preventive maintenance tasks. A scheduled job checks daily for schedules that are due and
        automatically creates a work order — see the README for how to wire up the cron job.
      </p>
      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div>
          <label>Asset</label>
          <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
            <option value="">Select</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.site?.name}</option>)}
          </select>
        </div>
        <div><label>Frequency (days)</label><input type="number" value={form.frequencyDays} onChange={(e) => setForm({ ...form, frequencyDays: e.target.value })} style={{ width: 90 }} /></div>
        <div style={{ flex: 1, minWidth: 200 }}><label>Task</label><input value={form.taskTemplate} onChange={(e) => setForm({ ...form, taskTemplate: e.target.value })} placeholder="Replace filters, inspect belts" style={{ width: "100%" }} /></div>
        <button className="primary" type="submit">Add schedule</button>
      </form>
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      <div className="table-scroll">
      <table>
        <thead><tr><th>Name</th><th>Asset</th><th>Site</th><th>Every</th><th>Next due</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td><td>{s.asset.name}</td><td>{s.asset.site?.name || "—"}</td><td>{s.frequencyDays} days</td>
              <td>{new Date(s.nextDueAt).toLocaleDateString()}</td><td>{s.active ? "Yes" : "No"}</td>
              <td><button className="danger" onClick={() => removeSchedule(s.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

