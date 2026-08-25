"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DefectReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/defect-reports").then((r) => r.json()).then((data) => { setReports(Array.isArray(data) ? data : []); setLoading(false); });
  }
  useEffect(load, []);

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">Project</span>
        <h1>Defect Reports</h1>
        <Link href="/defect-reports/new"><button className="primary">New defect report</button></Link>
      </div>
      {loading ? (
        <p>Loadingâ€¦</p>
      ) : reports.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No defect reports yet.</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead><tr><th>DF No.</th><th>Project</th><th>Site</th><th>Discipline</th><th>Items</th><th>Status</th><th>Date</th><th>Created by</th></tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/defect-reports/${r.id}`}>{r.dfNumber || r.id.slice(-8).toUpperCase()}</Link></td>
                <td>{r.projectName}</td>
                <td>{r.site?.name || "â€”"}</td>
                <td>{r.discipline || "â€”"}</td>
                <td>{r.items?.length || 0}</td>
                <td><span className="badge badge-medium">{r.status}</span></td>
                <td>{new Date(r.date).toLocaleDateString()}</td>
                <td>{r.createdBy?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
