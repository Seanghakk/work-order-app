"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [wo, setWo] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/work-orders/${id}`);
    setWo(await res.json());
  }

   useEffect(() => { load(); }, [id]);
  useEffect(() => {
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setTechnicians(data));
  }, []);

  const role = session?.user?.role;
  const canEdit = role === "MANAGER" || role === "ADMIN" || role === "TECHNICIAN";

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

  if (!wo || wo.error) return <div className="container"><p>{wo?.error || "Loading…"}</p></div>;

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>{wo.title}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <span className={`badge badge-${wo.status.toLowerCase()}`}>{wo.status.replace("_", " ")}</span>
        <span className={`badge badge-${wo.priority.toLowerCase()}`}>{wo.priority}</span>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p>{wo.description}</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Asset: {wo.asset?.name || "—"} · Requested by {wo.requestedBy?.name} · Created {new Date(wo.createdAt).toLocaleString()}
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
        </div>
      )}

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
