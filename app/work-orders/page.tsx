"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/work-orders").then((r) => r.json()).then((data) => { setOrders(data); setLoading(false); });
  }, []);

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
            <tr><th>Title</th><th>Asset</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>Created</th></tr>
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
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
