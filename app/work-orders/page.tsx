"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function WorkOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const canManage = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  function load() {
    setLoading(true);
    fetch(`/api/work-orders?showArchived=${showArchived ? "1" : "0"}`).then((r) => r.json()).then((data) => { setOrders(data); setLoading(false); });
  }
  useEffect(load, [showArchived]);

  async function archiveOrder(id: string) {
    if (!confirm("Archive this work order? It'll be hidden from the main list but you can still find it under \"Show archived.\"")) return;
    const res = await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Couldn't archive this work order.");
      return;
    }
    load();
  }

  async function unarchiveOrder(id: string) {
    const res = await fetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Couldn't unarchive this work order.");
      return;
    }
    load();
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Work orders</h1>
        <Link href="/work-orders/new"><button className="primary">New work order</button></Link>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "normal", fontSize: 13, marginBottom: 12 }}>
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>
      {loading ? (
        <p>Loading…</p>
      ) : orders.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>{showArchived ? "No archived work orders." : "No work orders yet."}</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Title</th><th>Site</th><th>Asset</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>Due</th><th>Created</th>{canManage && <th></th>}</tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/work-orders/${o.id}`}>{o.title}</Link></td>
                <td>{o.site?.name || "—"}</td>
                <td>{o.asset?.name || "—"}</td>
                <td><span className={`badge badge-${o.priority.toLowerCase()}`}>{o.priority}</span></td>
                <td><span className={`badge badge-${o.status.toLowerCase()}`}>{o.status.replace("_", " ")}</span></td>
                <td>{o.assignedTo?.name || "Unassigned"}</td>
                <td>
                  {o.dueDate ? (
                    <span style={{ color: new Date(o.dueDate) < new Date() && o.status !== "COMPLETED" && o.status !== "CANCELED" ? "var(--danger)" : "inherit" }}>
                      {new Date(o.dueDate).toLocaleDateString()}
                    </span>
                  ) : "—"}
                </td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                {canManage && (
                  <td>
                    {showArchived ? (
                      <button onClick={() => unarchiveOrder(o.id)}>Unarchive</button>
                    ) : (
                      (o.status === "COMPLETED" || o.status === "CANCELED") && (
                        <button className="danger" onClick={() => archiveOrder(o.id)}>Archive</button>
                      )
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}