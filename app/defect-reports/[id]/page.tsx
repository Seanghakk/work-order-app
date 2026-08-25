"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const DISCIPLINES = ["LIGHTING", "AUTOMATION", "FIRE_ALARM", "PA_SYSTEM", "BMS", "ACCESS_CONTROL_INTRUSION", "CAR_PARKING", "CCTV", "DATA_TEL_TV", "OTHER"];
const DISCIPLINE_LABEL: Record<string, string> = {
  LIGHTING: "Lighting System", AUTOMATION: "Automation", FIRE_ALARM: "Fire Alarm System",
  PA_SYSTEM: "Public Address System", BMS: "Building Management System",
  ACCESS_CONTROL_INTRUSION: "Access Control System & Intrusion", CAR_PARKING: "Car Parking System",
  CCTV: "CCTV System", DATA_TEL_TV: "Data, Tel & TV System", OTHER: "Others (specify)",
};

export default function DefectReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");
  const canManage = session && ["MANAGER", "ADMIN"].includes(session.user.role);

  function load() {
    fetch(`/api/defect-reports/${id}`).then((r) => r.json()).then(setReport);
  }
  useEffect(load, [id]);

  async function updateField(data: any) {
    const res = await fetch(`/api/defect-reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setError("");
    load();
  }

  async function removeReport() {
    if (!confirm("Delete this defect report? This can't be undone.")) return;
    const res = await fetch(`/api/defect-reports/${id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error); return; }
    router.push("/defect-reports");
  }

  if (!report || report.error) return <div className="container"><p>{report?.error || "Loading…"}</p></div>;

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h1>{report.dfNumber || report.id.slice(-8).toUpperCase()}</h1>
      <div style={{ marginBottom: 16 }}>
        <span className="badge badge-medium">{report.status}</span>
      </div>

      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div><label>Status</label>
          <select value={report.status} onChange={(e) => updateField({ status: e.target.value })}>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p><strong>Project:</strong> {report.projectName}</p>
        {report.site && <p><strong>Site:</strong> {report.site.name}</p>}
        {report.workOrder && <p><strong>Linked work order:</strong> {report.workOrder.title}</p>}
        <p><strong>Main contractor:</strong> {report.mainContractor || "—"} · <strong>Sub contractor:</strong> {report.subContractor}</p>
        <p><strong>Section:</strong> {report.section || "—"} · <strong>Discipline:</strong> {report.discipline ? (DISCIPLINE_LABEL[report.discipline] || report.discipline) : "—"}{report.discipline === "OTHER" && report.otherDisciplineText ? ` (${report.otherDisciplineText})` : ""}</p>
        <p><strong>Date:</strong> {new Date(report.date).toLocaleDateString()} · Created by {report.createdBy?.name}</p>
        {report.remark && <p><strong>Remark:</strong> {report.remark}</p>}
      </div>

      <h3>Items</h3>
      <div className="table-scroll" style={{ marginBottom: 16 }}>
        <table>
          <thead><tr><th>#</th><th>Part Number</th><th>Description</th><th>Brand</th><th>Unit</th><th>Qty</th><th>Defect Description</th><th>Photo Ref.</th></tr></thead>
          <tbody>
            {report.items.map((it: any) => (
              <tr key={it.id}>
                <td>{it.itemNo}</td>
                <td>{it.partNumber || "—"}</td>
                <td>{it.description || "—"}</td>
                <td>{it.brand || "—"}</td>
                <td>{it.unit || "—"}</td>
                <td>{it.qty ?? "—"}</td>
                <td>{it.defectDescription || "—"}</td>
                <td>{it.photoReference || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <a href={`/api/defect-reports/${id}/report`} target="_blank" rel="noopener noreferrer">
          <button>Download report</button>
        </a>
        {canManage && <button className="danger" onClick={removeReport}>Delete this defect report</button>}
      </div>
    </div>
  );
}