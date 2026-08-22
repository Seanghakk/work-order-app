"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWorkOrder() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assetId, setAssetId] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/assets").then((r) => r.json()).then(setAssets);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority, assetId: assetId || null }),
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
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)} style={{ width: "100%" }}>
            <option value="">None</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
          </select>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        <button className="primary" type="submit">Submit work order</button>
      </form>
    </div>
  );
}
