"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [wo, setWo] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [partsNeeded, setPartsNeeded] = useState("");

  async function load() {
    const res = await fetch(`/api/work-orders/${id}`);
    const data = await res.json();
    setWo(data);
    if (data && !data.error) setPartsNeeded(data.partsNeeded || "");
  }
   useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (!wo?.siteId) return;
    fetch(`/api/users/assignable?siteId=${wo.siteId}`).then((r) => r.json()).then((data) => Array.isArray(data) && setTechnicians(data));
  }, [wo?.siteId]);
  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then((data) => Array.isArray(data) && setTeams(data));
  }, []);

  const role = session?.user?.role;
  const canEdit = role === "MANAGER" || role === "ADMIN" || role === "MAINTENANCE_LEADER" || role === "MAINTENANCE_TECHNICIAN";
  const canManage = role === "MANAGER" || role === "ADMIN";

  async function toggleArchived() {
    if (wo.archived) {
      await updateField({ archived: false });
    } else if (wo.status === "COMPLETED" || wo.status === "CANCELED") {
      if (!confirm("Archive this work order?")) return;
      await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
      load();
    } else {
      alert("Only completed or canceled work orders can be archived.");
    }
  }

  async function updateField(data: any) {
    const res = await fetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Update failed.");
      return;
    }
    setError("");
    load();
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) { setError("Enter a comment first."); return; }
    await updateField({ comment });
    setComment("");
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/work-orders/${id}/photos`, { method: "POST", body: formData });
    setUploading(false);
    e.target.value = "";
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Photo upload failed.");
      return;
    }
    load();
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Remove this photo?")) return;
    const res = await fetch(`/api/work-orders/${id}/photos/${photoId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Couldn't remove photo.");
      return;
    }
    load();
  }

  if (!wo || wo.error) return <div className="container"><p>{wo?.error || "Loading…"}</p></div>;

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>{wo.title}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <span className={`badge badge-${wo.status.toLowerCase()}`}>{wo.status.replace("_", " ")}</span>
        <span className={`badge badge-${wo.priority.toLowerCase()}`}>{wo.priority}</span>
        {wo.warrantyClaim && <span className="badge badge-urgent">Warranty claim</span>}
        {wo.archived && <span className="badge badge-on_hold">Archived</span>}
        <a href={`/api/work-orders/${id}/report`} target="_blank" rel="noopener noreferrer">
          <button>Download report</button>
        </a>
        {canManage && <button onClick={toggleArchived}>{wo.archived ? "Unarchive" : "Archive"}</button>}
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p>{wo.description}</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Site: {wo.site?.name || "—"} · Team: {wo.team?.name || "—"} · Asset: {wo.asset?.name || "—"} · Requested by {wo.requestedBy?.name} · Created {new Date(wo.createdAt).toLocaleString()}
        </p>
      </div>

      {canEdit && (
        <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div>
            <label>Status</label>
            <select value={wo.status} onChange={(e) => updateField({ status: e.target.value })}>
              {["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELED"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
                    <div>
            <label>Priority</label>
            <select value={wo.priority} onChange={(e) => updateField({ priority: e.target.value })}>
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
                    <div>
            <label>Assigned to</label>
            <select value={wo.assignedToId || ""} onChange={(e) => updateField({ assignedToId: e.target.value || null })}>
              <option value="">Unassigned</option>
              {technicians.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
            </select>
          </div>
          <div>
            <label>Due date</label>
            <input type="date" value={wo.dueDate ? wo.dueDate.slice(0, 10) : ""} onChange={(e) => updateField({ dueDate: e.target.value || null })} />
          </div>
          <div>
            <label>Team</label>
            <select value={wo.teamId || ""} onChange={(e) => updateField({ teamId: e.target.value || null })}>
              <option value="">No team</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label>Parts needed (optional)</label>
            <textarea
              value={partsNeeded}
              onChange={(e) => setPartsNeeded(e.target.value)}
              onBlur={() => updateField({ partsNeeded })}
              rows={2}
              style={{ width: "100%" }}
              placeholder="e.g. 2x AHU filter (24x24x2), 1x contactor 40A"
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "normal" }}>
            <input type="checkbox" checked={!!wo.warrantyClaim} onChange={(e) => updateField({ warrantyClaim: e.target.checked })} />
            This is a warranty claim
          </label>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Photos</h3>
        {wo.photos.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No photos yet.</p>}
        {wo.photos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 12 }}>
            {wo.photos.map((p: any) => (
              <div key={p.id} style={{ position: "relative" }}>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  <img src={p.url} alt={p.fileName} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                </a>
                <button
                  onClick={() => deletePhoto(p.id)}
                  aria-label="Remove photo"
                  style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
                >×</button>
              </div>
            ))}
          </div>
        )}
        {canEdit && (
          <div>
            <input type="file" accept="image/*" onChange={handlePhotoSelect} disabled={uploading} />
            {uploading && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Uploading…</p>}
          </div>
        )}
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <h3>Activity</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {wo.comments.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No comments yet.</p>}
        {wo.comments.map((c: any) => (
          <div key={c.id} className="card">
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{c.author.name} · {new Date(c.createdAt).toLocaleString()}</p>
            <p style={{ margin: "4px 0 0" }}>{c.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={submitComment} style={{ display: "flex", gap: 8 }}>
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add an update" style={{ flex: 1 }} />
        <button className="primary" type="submit">Post</button>
      </form>
    </div>
  );
}