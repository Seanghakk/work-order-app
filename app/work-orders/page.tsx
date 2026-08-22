"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function WorkOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  function load() {
    fetch("/api/work-orders").then((r) => r.json()).then((data) => { setOrders(data); setLoading(false); });
  }
  useEffect(load, []);

  async function clearOrder(id: string) {
    if (!confirm("Clear this work order? This removes it and its comments permanently.")) return;
    const res = await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Couldn't clear this work order.");
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
      {loading ? (
        <p>Loading…</p>
      ) : orders.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No work orders yet.</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Title</th><th>Asset</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>Created</th>{canManage && <th></th>}</tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/work-orders/${o.id}`}>{o.title}</Link></td>
                <td>{o.asset?.name || "—"}</td>
                <td><span className={`badge badge-${o.priority.toLowerCase()}`}>{o.priority}</span></td>
                <td><span className={`badge badge-${o.status.toLowerCase()}`}>{o.status.replace("_", " ")}</span></td>
                <td>{o.assignedTo?.name || "Unassigned"}</td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                {canManage && (
                  <td>
                    {(o.status === "COMPLETED" || o.status === "CANCELED") && (
                      <button className="danger" onClick={() => clearOrder(o.id)}>Clear</button>
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