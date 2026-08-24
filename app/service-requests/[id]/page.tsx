"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const STAGES = ["REQUEST", "CHECK", "REPORT", "CLOSE"];
const STATUS_LABEL: Record<string, string> = {
  REQUEST: "Request", CHECK: "Check", REPORT: "Report", CLOSE: "Close",
};

export default function ServiceRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/service-requests/${id}`);
    setItem(await res.json());
  }
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
  }, []);

  async function updateField(data: any) {
    const res = await fetch(`/api/service-requests/${id}`, {
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

  async function handleArchive() {
    if (!confirm("Archive this service request? It'll be hidden from the main list but still findable under \"Show archived.\"")) return;
    const res = await fetch(`/api/service-requests/${id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error); return; }
    router.push("/service-requests");
  }

  async function handleUnarchive() {
    await updateField({ archived: false });
  }

  if (!item || item.error) return <div className="container"><p>{item?.error || "Loading…"}</p></div>;

  const canManage = session && ["MANAGER", "ADMIN"].includes(session.user.role);
  const canClose = canManage && item.status === "CLOSE";
  const currentStepIndex = STAGES.indexOf(item.status);

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>{item.title}</h1>
      <div style={{ marginBottom: 16 }}>
        <span className="badge badge-medium">{STATUS_LABEL[item.status]}</span>
        {item.archived && <span className="badge badge-on_hold" style={{ marginLeft: 8 }}>Archived</span>}
        {item.dueDate && (
          <span style={{ marginLeft: 10, fontSize: 13, color: new Date(item.dueDate) < new Date() && item.status !== "CLOSE" ? "var(--danger)" : "var(--text-muted)" }}>
            Due {new Date(item.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: 400 }}>
          {STAGES.map((stage, i) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 70 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  background: i <= currentStepIndex ? "var(--navy)" : "var(--surface-hover)",
                  color: i <= currentStepIndex ? "white" : "var(--text-muted)",
                  border: i === currentStepIndex ? "2px solid var(--navy-deep)" : "none",
                }}>
                  {i < currentStepIndex ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 11, textAlign: "center", color: i <= currentStepIndex ? "var(--text)" : "var(--text-muted)" }}>
                  {STATUS_LABEL[stage]}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < currentStepIndex ? "var(--navy)" : "var(--border)", marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p><strong>Customer:</strong> {item.customerName}</p>
        {item.description && <p>{item.description}</p>}
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Created by {item.createdBy?.name} · {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div>
          <label>Stage</label>
          <select value={item.status} onChange={(e) => updateField({ status: e.target.value })}>
            {STAGES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label>Assigned to</label>
          <select value={item.assignedToId || ""} onChange={(e) => updateField({ assignedToId: e.target.value || null })}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
          </select>
        </div>
        <div>
          <label>Due date</label>
          <input type="date" value={item.dueDate ? item.dueDate.slice(0, 10) : ""} onChange={(e) => updateField({ dueDate: e.target.value || null })} />
        </div>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <h3>Activity</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {item.comments.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No comments yet.</p>}
        {item.comments.map((c: any) => (
          <div key={c.id} className="card">
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{c.author.name} · {new Date(c.createdAt).toLocaleString()}</p>
            <p style={{ margin: "4px 0 0" }}>{c.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={submitComment} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add an update" style={{ flex: 1 }} />
        <button className="primary" type="submit">Post</button>
      </form>

      {canManage && item.archived && (
        <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button onClick={handleUnarchive}>Unarchive this service request</button>
        </div>
      )}
      {canClose && !item.archived && (
        <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button className="danger" onClick={handleArchive}>Archive this service request</button>
        </div>
      )}
    </div>
  );
}