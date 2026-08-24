"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  REQUEST: "Request", CHECK: "Check", REPORT: "Report", CLOSE: "Close",
};

export default function ServiceRequestsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/service-requests").then((r) => r.json()).then((data) => { setItems(data); setLoading(false); });
  }, []);

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Service Requests</h1>
        <Link href="/service-requests/new"><button className="primary">New service request</button></Link>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No service requests yet.</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead><tr><th>Title</th><th>Customer</th><th>Stage</th><th>Assigned to</th><th>Due</th><th>Updated</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/service-requests/${s.id}`}>{s.title}</Link></td>
                <td>{s.customerName}</td>
                <td><span className="badge badge-medium">{STATUS_LABEL[s.status]}</span></td>
                <td>{s.assignedTo?.name || "Unassigned"}</td>
                <td>{s.dueDate ? new Date(s.dueDate).toLocaleDateString() : "—"}</td>
                <td>{new Date(s.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}