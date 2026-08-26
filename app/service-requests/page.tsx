"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const STATUS_LABEL: Record<string, string> = {
  REQUEST: "Request", CHECK: "Check", REPORT: "Report", CLOSE: "Close",
};

export default function ServiceRequestsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const canManage = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  function load() {
    setLoading(true);
    fetch(`/api/service-requests?showArchived=${showArchived ? "1" : "0"}`).then((r) => r.json()).then((data) => { setItems(data); setLoading(false); });
  }
  useEffect(load, [showArchived]);

  async function archiveItem(id: string) {
    if (!confirm("Archive this service request?")) return;
    const res = await fetch(`/api/service-requests/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Couldn't archive this service request.");
      return;
    }
    load();
  }

  async function unarchiveItem(id: string) {
    const res = await fetch(`/api/service-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Couldn't unarchive this service request.");
      return;
    }
    load();
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">Maintenance</span>
        <h1>Service Requests</h1>
        <Link href="/service-requests/new"><button className="primary">New service request</button></Link>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "normal", fontSize: 13, marginBottom: 12 }}>
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>
      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>{showArchived ? "No archived service requests." : "No service requests yet."}</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead><tr><th>Title</th><th>Customer</th><th>Type</th><th>S.O. Number</th><th>Team</th><th>Stage</th><th>Assigned to</th><th>Due</th><th>Updated</th>{canManage && <th></th>}</tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/service-requests/${s.id}`}>{s.title}</Link></td>
                <td>{s.customerName}</td>
                <td>{s.isCorporatePartner ? "Corporate" : "General"}</td>
                <td>{s.soNumber || "—"}</td>
                <td>{s.team?.name || "—"}</td>
                <td><span className="badge badge-medium">{STATUS_LABEL[s.status]}</span></td>
                <td>{s.assignedTo?.name || "Unassigned"}</td>
                <td>{s.dueDate ? new Date(s.dueDate).toLocaleDateString() : "—"}</td>
                <td>{new Date(s.updatedAt).toLocaleDateString()}</td>
                {canManage && (
                  <td>
                    {showArchived ? (
                      <button onClick={() => unarchiveItem(s.id)}>Unarchive</button>
                    ) : (
                      s.status === "CLOSE" && (
                        <button className="danger" onClick={() => archiveItem(s.id)}>Archive</button>
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
