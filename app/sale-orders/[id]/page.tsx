"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const CORPORATE_PARTNERS = ["SCE", "DBD", "PITTA", "CE&P", "ESD", "CAIC", "LGT", "ACT", "ET&S", "GGEAR", "LBL"];
const STAGES = ["INQUIRY", "DRAWING", "BOQ", "SUBMIT_TO_SALE", "CONFIRM_PO", "CANCELLED"];
const STATUS_LABEL: Record<string, string> = {
  INQUIRY: "Inquiry", DRAWING: "Drawing", BOQ: "BoQ",
  SUBMIT_TO_SALE: "Submit to Sale", CONFIRM_PO: "Confirm PO", CANCELLED: "Cancelled",
};
const STEP_STAGES = ["INQUIRY", "DRAWING", "BOQ", "SUBMIT_TO_SALE", "CONFIRM_PO"];

export default function SaleOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/sale-orders/${id}`);
    setOrder(await res.json());
  }
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
  }, []);

  async function updateField(data: any) {
    const res = await fetch(`/api/sale-orders/${id}`, {
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

  async function handleDelete() {
    if (!confirm("Remove this sale order? This can't be undone.")) return;
    const res = await fetch(`/api/sale-orders/${id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error); return; }
    router.push("/sale-orders");
  }

  if (!order || order.error) return <div className="container"><p>{order?.error || "Loading…"}</p></div>;

  const canManage = session && ["MANAGER", "ADMIN"].includes(session.user.role);
  const canClose = canManage && (order.status === "CONFIRM_PO" || order.status === "CANCELLED");
  const currentStepIndex = STEP_STAGES.indexOf(order.status);

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>{order.title}</h1>
      <div style={{ marginBottom: 16 }}>
        <span className="badge badge-medium">{STATUS_LABEL[order.status]}</span>
        {order.dueDate && (
          <span style={{ marginLeft: 10, fontSize: 13, color: new Date(order.dueDate) < new Date() && order.status !== "CONFIRM_PO" && order.status !== "CANCELLED" ? "var(--danger)" : "var(--text-muted)" }}>
            Due {new Date(order.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {order.status !== "CANCELLED" && (
        <div className="card" style={{ marginBottom: 16, overflowX: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", minWidth: 600 }}>
            {STEP_STAGES.map((stage, i) => (
              <div key={stage} style={{ display: "flex", alignItems: "center", flex: i < STEP_STAGES.length - 1 ? 1 : "none" }}>
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
                {i < STEP_STAGES.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: i < currentStepIndex ? "var(--navy)" : "var(--border)", marginBottom: 20 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <p><strong>Customer:</strong> {order.customerName} ({order.isCorporatePartner ? "Corporate partner" : "General customer"})</p>
        {order.description && <p>{order.description}</p>}
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Value: {order.value ? `$${Number(order.value).toLocaleString()}` : "—"} · Created by {order.createdBy?.name} · {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div>
          <label>Stage</label>
          <select value={order.status} onChange={(e) => updateField({ status: e.target.value })}>
            {STAGES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label>Assigned to</label>
          <select value={order.assignedToId || ""} onChange={(e) => updateField({ assignedToId: e.target.value || null })}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
          </select>
        </div>
        <div>
          <label>Due date</label>
          <input type="date" value={order.dueDate ? order.dueDate.slice(0, 10) : ""} onChange={(e) => updateField({ dueDate: e.target.value || null })} />
        </div>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <h3>Activity</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {order.comments.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No comments yet.</p>}
        {order.comments.map((c: any) => (
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

      {canClose && (
        <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button className="danger" onClick={handleDelete}>Remove this sale order</button>
        </div>
      )}
    </div>
  );
}