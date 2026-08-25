"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function MaintenanceContractDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [contract, setContract] = useState<any>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const canManage = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  function load() {
    fetch(`/api/maintenance-contracts/${id}`).then((r) => r.json()).then(setContract);
  }
  useEffect(load, [id]);

  function startEdit() {
    setForm({
      contractType: contract.contractType,
      clientName: contract.clientName,
      siteLocation: contract.siteLocation,
      originalProjectId: contract.originalProjectId || "",
      startDate: contract.startDate.slice(0, 10),
      endDate: contract.endDate.slice(0, 10),
      contractValue: contract.contractValue || "",
      renewalDate: contract.renewalDate ? contract.renewalDate.slice(0, 10) : "",
      siteVisitsPerYear: contract.siteVisitsPerYear || "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!form.clientName.trim() || !form.siteLocation.trim() || !form.startDate || !form.endDate) {
      setError("Client name, site location, start date, and end date are required.");
      return;
    }
    const res = await fetch(`/api/maintenance-contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        contractValue: form.contractValue || null,
        renewalDate: form.renewalDate || null,
        siteVisitsPerYear: form.siteVisitsPerYear || null,
        originalProjectId: form.originalProjectId || null,
      }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setError("");
    setEditing(false);
    load();
  }

  async function markStatus(status: string) {
    await fetch(`/api/maintenance-contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function removeContract() {
    if (!confirm("Delete this contract? This can't be undone.")) return;
    const res = await fetch(`/api/maintenance-contracts/${id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error); return; }
    router.push("/maintenance-contracts");
  }

  if (!contract || contract.error) return <div className="container"><p>{contract?.error || "Loading…"}</p></div>;

  const days = Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / 86400000);

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1>{contract.clientName}</h1>
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <span className="badge badge-medium">{contract.contractType === "DLP" ? "DLP" : "Maintenance"}</span>
        <span className={`badge ${contract.status === "ACTIVE" ? "badge-open" : "badge-canceled"}`}>{contract.status}</span>
        {contract.status === "ACTIVE" && days <= 30 && (
          <span style={{ color: "var(--danger)", fontSize: 13 }}>{days < 0 ? "Expired" : `${days} days left`}</span>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        {editing ? (
          <>
            <div className="field">
              <label>Contract type</label>
              <select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })} style={{ width: "100%" }}>
                <option value="DLP">DLP (Defect Liability Period / warranty)</option>
                <option value="MAINTENANCE">Maintenance (paid ongoing contract)</option>
              </select>
            </div>
            <div className="field">
              <label>Client name</label>
              <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label>Site location</label>
              <input value={form.siteLocation} onChange={(e) => setForm({ ...form, siteLocation: e.target.value })} style={{ width: "100%" }} />
            </div>
            {form.contractType === "DLP" && (
              <div className="field">
                <label>Original project reference (optional)</label>
                <input value={form.originalProjectId} onChange={(e) => setForm({ ...form, originalProjectId: e.target.value })} style={{ width: "100%" }} />
              </div>
            )}
            <div className="field">
              <label>Start date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label>End date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ width: "100%" }} />
            </div>
            {form.contractType === "MAINTENANCE" && (
              <>
                <div className="field">
                  <label>Contract value (optional)</label>
                  <input type="number" value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value })} style={{ width: "100%" }} />
                </div>
                <div className="field">
                  <label>Renewal date (optional)</label>
                  <input type="date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} style={{ width: "100%" }} />
                </div>
                <div className="field">
                  <label>Site visits per year (optional)</label>
                  <input type="number" value={form.siteVisitsPerYear} onChange={(e) => setForm({ ...form, siteVisitsPerYear: e.target.value })} style={{ width: "100%" }} />
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={saveEdit}>Save</button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p><strong>Site:</strong> {contract.siteLocation}</p>
            {contract.originalProjectId && <p><strong>Project reference:</strong> {contract.originalProjectId}</p>}
            <p><strong>Start:</strong> {new Date(contract.startDate).toLocaleDateString()} · <strong>End:</strong> {new Date(contract.endDate).toLocaleDateString()}</p>
            {contract.contractValue && <p><strong>Value:</strong> ${Number(contract.contractValue).toLocaleString()}</p>}
            {contract.renewalDate && <p><strong>Renewal date:</strong> {new Date(contract.renewalDate).toLocaleDateString()}</p>}
            {contract.siteVisitsPerYear && <p><strong>Site visits per year:</strong> {contract.siteVisitsPerYear}</p>}
            {canManage && <button onClick={startEdit}>Edit</button>}
          </>
        )}
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      {canManage && !editing && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {contract.status === "ACTIVE" ? (
            <button onClick={() => markStatus("CONVERTED")}>Mark converted</button>
          ) : (
            <button onClick={() => markStatus("ACTIVE")}>Reactivate</button>
          )}
          <button className="danger" onClick={removeContract}>Delete</button>
        </div>
      )}
    </div>
  );
}