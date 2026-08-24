"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  INQUIRY: "Inquiry", DRAWING: "Drawing", BOQ: "BoQ",
  SUBMIT_TO_SALE: "Submit to Sale", CONFIRM_PO: "Confirm PO", CANCELLED: "Cancelled",
};

export default function SaleOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sale-orders").then((r) => r.json()).then((data) => { setOrders(data); setLoading(false); });
  }, []);

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Sale Orders</h1>
        <Link href="/sale-orders/new"><button className="primary">New sale order</button></Link>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : orders.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No sale orders yet.</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead><tr><th>Title</th><th>Customer</th><th>Type</th><th>Stage</th><th>Value</th><th>Assigned to</th><th>Updated</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/sale-orders/${o.id}`}>{o.title}</Link></td>
                <td>{o.customerName}</td>
                <td>{o.isCorporatePartner ? "Corporate" : "General"}</td>
                <td><span className="badge badge-medium">{STATUS_LABEL[o.status]}</span></td>
                <td>{o.value ? `$${Number(o.value).toLocaleString()}` : "—"}</td>
                <td>{o.assignedTo?.name || "Unassigned"}</td>
                <td>{new Date(o.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}