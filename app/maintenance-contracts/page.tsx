"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function MaintenanceContractsPage() {
  const { data: session } = useSession();
  const [contracts, setContracts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const canManage = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  function load() {
    fetch("/api/maintenance-contracts").then((r) => r.json()).then((data) => Array.isArray(data) ? setContracts(data) : setError(data.error));
  }
  useEffect(load, []);

  function daysUntil(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  }

  async function renew(id: string) {
    const newEndDate = prompt("New end date (YYYY-MM-DD)?");
    if (!newEndDate) return;
    const res = await fetch(`/api/maintenance-contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: newEndDate, status: "ACTIVE" }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setError("");
    load();
  }

  async function markStatus(id: string, status: string) {
    await fetch(`/api/maintenance-contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeContract(id: string) {
    if (!confirm("Delete this contract? This can't be undone.")) return;
    const res = await fetch(`/api/maintenance-contracts/${id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error); return; }
    load();
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Maintenance Contracts</h1>
        {canManage && <Link href="/maintenance-contracts/new"><button className="primary">New contract</button></Link>}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
        DLP (warranty) periods and paid ongoing maintenance contracts. You'll get an alert automatically 30 and 7 days before any contract expires.
      </p>
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      {contracts.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No contracts yet.</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead><tr><th>Client</th><th>Site</th><th>Type</th><th>Start</th><th>End</th><th>Status</th>{canManage && <th></th>}</tr></thead>
          <tbody>
            {contracts.map((c) => {
              const days = daysUntil(c.endDate);
              const expired = days < 0;
              const soon = days >= 0 && days <= 30;
              return (
                <tr key={c.id}>
                  <td>{c.clientName}</td>
                  <td>{c.siteLocation}</td>
                  <td><span className="badge badge-medium">{c.contractType === "DLP" ? "DLP" : "Maintenance"}</span></td>
                  <td>{new Date(c.startDate).toLocaleDateString()}</td>
                  <td>
                    <span style={{ color: c.status === "ACTIVE" && (expired || soon) ? "var(--danger)" : "inherit" }}>
                      {new Date(c.endDate).toLocaleDateString()}
                      {c.status === "ACTIVE" && expired && " (expired)"}
                      {c.status === "ACTIVE" && soon && ` (${days}d left)`}
                    </span>
                  </td>
                  <td><span className={`badge ${c.status === "ACTIVE" ? "badge-open" : "badge-canceled"}`}>{c.status}</span></td>
                  {canManage && (
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => renew(c.id)}>Renew</button>
                        {c.status === "ACTIVE" ? (
                          <button onClick={() => markStatus(c.id, "CONVERTED")}>Mark converted</button>
                        ) : (
                          <button onClick={() => markStatus(c.id, "ACTIVE")}>Reactivate</button>
                        )}
                        <button className="danger" onClick={() => removeContract(c.id)}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}