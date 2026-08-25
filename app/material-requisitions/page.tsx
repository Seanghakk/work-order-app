"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const TYPE_LABEL: Record<string, string> = { MATERIAL: "Material", TOOL: "Tool", SERVICE: "Service" };

export default function MaterialRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/material-requisitions").then((r) => r.json()).then((data) => { setRequisitions(Array.isArray(data) ? data : []); setLoading(false); });
  }
  useEffect(load, []);

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">Project</span>
        <h1>Material / Tool / Service Requisitions</h1>
        <Link href="/material-requisitions/new"><button className="primary">New requisition</button></Link>
      </div>
      {loading ? (
        <p>Loadingâ€¦</p>
      ) : requisitions.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No requisitions yet.</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead><tr><th>Reference</th><th>Type</th><th>Project</th><th>Applicant</th><th>Items</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {requisitions.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/material-requisitions/${r.id}`}>{r.referenceNo || r.id.slice(-8).toUpperCase()}</Link></td>
                <td>{TYPE_LABEL[r.requisitionType] || r.requisitionType}</td>
                <td>{r.projectName || "â€”"}</td>
                <td>{r.applicantName || "â€”"}</td>
                <td>{r.items?.length || 0}</td>
                <td><span className="badge badge-medium">{r.status}</span></td>
                <td>{new Date(r.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
