"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWorkOrder() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assetId, setAssetId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [siteId, setSiteId] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    fetch("/api/assets").then((r) => r.json()).then(setAssets);
    fetch("/api/teams").then((r) => r.json()).then((data) => Array.isArray(data) && setTeams(data));
    fetch("/api/sites").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setSites(data);
        if (data.length === 1) setSiteId(data[0].id);
      }
    });
  }, []);

  const assetsForSite = siteId ? assets.filter((a) => a.siteId === siteId) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !siteId) {
      setError("Title, description, and site are required.");
      return;
    }
    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority, assetId: assetId || null, dueDate: dueDate || null, siteId, teamId: teamId || null }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/work-orders");
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1>New work order</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>Site</label>
          <select value={siteId} onChange={(e) => { setSiteId(e.target.value); setAssetId(""); }} style={{ width: "100%" }}>
            <option value="">Select</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} placeholder="AHU-01 not reaching setpoint" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ width: "100%" }} placeholder="What's happening, and where" />
        </div>
        <div className="field">
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: "100%" }}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div className="field">
          <label>Asset (optional)</label>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} style={{ width: "100%" }} disabled={!siteId}>
            <option value="">None</option>
            {assetsForSite.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
          </select>
          {!siteId && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Choose a site first to see its assets.</p>}
        </div>
        <div className="field">
          <label>Due date (optional)</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div className="field">
          <label>Team (optional)</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ width: "100%" }}>
            <option value="">No team</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        <button className="primary" type="submit">Submit work order</button>
      </form>
    </div>
  );
}
