"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const STAGES = ["INQUIRY", "QUOTATION", "CONFIRMED", "PROCUREMENT", "DELIVERED", "INVOICED", "CLOSED", "CANCELLED"];
const STATUS_LABEL: Record<string, string> = {
  INQUIRY: "Inquiry", QUOTATION: "Quotation", CONFIRMED: "Confirmed",
  PROCUREMENT: "Procurement", DELIVERED: "Delivered", INVOICED: "Invoiced",
  CLOSED: "Closed", CANCELLED: "Cancelled",
};

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
  const canClose = canManage && (order.status === "CLOSED" || order.status === "CANCELLED");

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>{order.title}</h1>
      <div style={{ marginBottom: 16 }}>
        <span className="badge badge-medium">{STATUS_LABEL[order.status]}</span>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p><strong>Customer:</strong> {order.customerName}</p>
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