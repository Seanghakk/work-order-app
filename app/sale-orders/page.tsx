"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const STATUS_LABEL: Record<string, string> = {
  INQUIRY: "Inquiry", DRAWING: "Drawing", BOQ: "BoQ",
  SUBMIT_TO_SALE: "Submit to Sale", CONFIRM_PO: "Confirm PO", CANCELLED: "Cancelled",
};

export default function SaleOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const canManage = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  function load() {
    setLoading(true);
    fetch(`/api/sale-orders?showArchived=${showArchived ? "1" : "0"}`).then((r) => r.json()).then((data) => { setOrders(data); setLoading(false); });
  }
  useEffect(load, [showArchived]);

  async function archiveOrder(id: string) {
    if (!confirm("Archive this sale order?")) return;
    const res = await fetch(`/api/sale-orders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Couldn't archive this sale order.");
      return;
    }
    load();
  }

  async function unarchiveOrder(id: string) {
    const res = await fetch(`/api/sale-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Couldn't unarchive this sale order.");
      return;
    }
    load();
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">Sales</span>
        <h1>Sale Orders</h1>
        <Link href="/sale-orders/new"><button className="primary">New sale order</button></Link>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "normal", fontSize: 13, marginBottom: 12 }}>
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Show archived
      </label>
      {loading ? (
        <p>Loadingâ€¦</p>
      ) : orders.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>{showArchived ? "No archived sale orders." : "No sale orders yet."}</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead><tr><th>Title</th><th>Customer</th><th>Type</th><th>Team</th><th>Stage</th><th>Value</th><th>Assigned to</th><th>Updated</th>{canManage && <th></th>}</tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/sale-orders/${o.id}`}>{o.title}</Link></td>
                <td>{o.customerName}</td>
                <td>{o.isCorporatePartner ? "Corporate" : "General"}</td>
                <td>{o.team?.name || "â€”"}</td>
                <td><span className="badge badge-medium">{STATUS_LABEL[o.status]}</span></td>
                <td>{o.value ? `$${Number(o.value).toLocaleString()}` : "â€”"}</td>
                <td>{o.assignedTo?.name || "Unassigned"}</td>
                <td>{new Date(o.updatedAt).toLocaleDateString()}</td>
                {canManage && (
                  <td>
                    {showArchived ? (
                      <button onClick={() => unarchiveOrder(o.id)}>Unarchive</button>
                    ) : (
                      (o.status === "CONFIRM_PO" || o.status === "CANCELLED") && (
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
