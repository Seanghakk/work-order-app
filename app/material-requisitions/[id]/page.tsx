"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Item = { id?: string; productCode: string; productName: string; description: string; brandName: string; supplier: string; unit: string; qty: string; remark: string };
const emptyItem = (): Item => ({ productCode: "", productName: "", description: "", brandName: "", supplier: "", unit: "", qty: "", remark: "" });
const TYPE_LABEL: Record<string, string> = { MATERIAL: "Material", TOOL: "Tool", SERVICE: "Service" };

export default function MaterialRequisitionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [requisition, setRequisition] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [items, setItems] = useState<Item[]>([]);
  const [sending, setSending] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendUserIds, setSendUserIds] = useState<string[]>([]);
  const [sendMessage, setSendMessage] = useState("");
  const [sendResult, setSendResult] = useState("");
  const canManage = session && ["MANAGER", "ADMIN"].includes(session.user.role);
  const canEdit = session && session.user.role !== "REQUESTER";

  function load() {
    fetch(`/api/material-requisitions/${id}`).then((r) => r.json()).then(setRequisition);
  }
  useEffect(load, [id]);
  useEffect(() => {
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
  }, []);

  async function updateField(data: any) {
    const res = await fetch(`/api/material-requisitions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setError("");
    load();
  }

  async function removeRequisition() {
    if (!confirm("Delete this requisition? This can't be undone.")) return;
    const res = await fetch(`/api/material-requisitions/${id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error); return; }
    router.push("/material-requisitions");
  }

  function startEdit() {
    setForm({
      referenceNo: requisition.referenceNo || "",
      date: requisition.date.slice(0, 10),
      object: requisition.object || "",
      requisitionType: requisition.requisitionType,
      systemCheck: requisition.systemCheck || "",
      applicantName: requisition.applicantName || "",
      soNumber: requisition.soNumber || "",
      projectName: requisition.projectName || "",
      expectedDelivery: requisition.expectedDelivery ? requisition.expectedDelivery.slice(0, 10) : "",
    });
    setItems(
      requisition.items.length > 0
        ? requisition.items.map((it: any) => ({
            id: it.id, productCode: it.productCode || "", productName: it.productName || "", description: it.description || "",
            brandName: it.brandName || "", supplier: it.supplier || "", unit: it.unit || "",
            qty: it.qty != null ? String(it.qty) : "", remark: it.remark || "",
          }))
        : [emptyItem()]
    );
    setEditing(true);
  }

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveEdit() {
    const validItems = items.filter((it) => it.productName.trim() || it.description.trim());
    if (validItems.length === 0) { setError("Add at least one item."); return; }
    await updateField({ ...form, items: validItems });
    setEditing(false);
  }

  function toggleSendUser(userId: string) {
    setSendUserIds((prev) => (prev.includes(userId) ? prev.filter((u) => u !== userId) : [...prev, userId]));
  }

  async function sendRequisition() {
    if (sendUserIds.length === 0) { setError("Select at least one recipient."); return; }
    setSending(true);
    setError("");
    setSendResult("");
    const res = await fetch(`/api/material-requisitions/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: sendUserIds, message: sendMessage || undefined }),
    });
    setSending(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Couldn't send the requisition.");
      return;
    }
    const d = await res.json();
    setSendResult(`Sent to ${d.sentTo} recipient${d.sentTo !== 1 ? "s" : ""}.`);
    setSendUserIds([]);
    setSendMessage("");
  }

  if (!requisition || requisition.error) return <div className="container"><p>{requisition?.error || "Loading…"}</p></div>;

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h1>{requisition.referenceNo || requisition.id.slice(-8).toUpperCase()}</h1>
      <div style={{ marginBottom: 16 }}>
        <span className="badge badge-medium">{requisition.status}</span>
      </div>

      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div><label>Status</label>
          <select value={requisition.status} onChange={(e) => updateField({ status: e.target.value })}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        {editing ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 180 }}><label>Reference</label><input value={form.referenceNo} onChange={(e) => setForm({ ...form, referenceNo: e.target.value })} style={{ width: "100%" }} /></div>
              <div style={{ flex: 1, minWidth: 180 }}><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ width: "100%" }} /></div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label>Requisition for</label>
                <select value={form.requisitionType} onChange={(e) => setForm({ ...form, requisitionType: e.target.value })} style={{ width: "100%" }}>
                  <option value="MATERIAL">Material</option>
                  <option value="TOOL">Tool</option>
                  <option value="SERVICE">Service</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Object</label>
              <input value={form.object} onChange={(e) => setForm({ ...form, object: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label>System check</label>
                <select value={form.systemCheck} onChange={(e) => setForm({ ...form, systemCheck: e.target.value })} style={{ width: "100%" }}>
                  <option value="">Not set</option>
                  <option value="BMS_FA_FSS_LEADER">BMS/FA/FSS Leader</option>
                  <option value="ICT_LEADER">ICT Leader</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}><label>Applicant name</label><input value={form.applicantName} onChange={(e) => setForm({ ...form, applicantName: e.target.value })} style={{ width: "100%" }} /></div>
              <div style={{ flex: 1, minWidth: 180 }}><label>SO number</label><input value={form.soNumber} onChange={(e) => setForm({ ...form, soNumber: e.target.value })} style={{ width: "100%" }} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 200 }}><label>Project name</label><input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} style={{ width: "100%" }} /></div>
              <div style={{ flex: 1, minWidth: 200 }}><label>Expected delivery</label><input type="date" value={form.expectedDelivery} onChange={(e) => setForm({ ...form, expectedDelivery: e.target.value })} style={{ width: "100%" }} /></div>
            </div>

            <h3>Items</h3>
            <div className="table-scroll" style={{ marginBottom: 12 }}>
              <table>
                <thead><tr><th>Product Code</th><th>Product Name / Service</th><th>Description</th><th>Brand</th><th>Supplier</th><th>Unit</th><th>Qty</th><th>Remark</th><th></th></tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td><input value={it.productCode} onChange={(e) => updateItem(i, "productCode", e.target.value)} style={{ width: 90 }} /></td>
                      <td><input value={it.productName} onChange={(e) => updateItem(i, "productName", e.target.value)} style={{ width: 130 }} /></td>
                      <td><input value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} style={{ width: 130 }} /></td>
                      <td><input value={it.brandName} onChange={(e) => updateItem(i, "brandName", e.target.value)} style={{ width: 90 }} /></td>
                      <td><input value={it.supplier} onChange={(e) => updateItem(i, "supplier", e.target.value)} style={{ width: 100 }} /></td>
                      <td><input value={it.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} style={{ width: 60 }} /></td>
                      <td><input type="number" value={it.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} style={{ width: 60 }} /></td>
                      <td><input value={it.remark} onChange={(e) => updateItem(i, "remark", e.target.value)} style={{ width: 90 }} /></td>
                      <td>{items.length > 1 && <button type="button" className="danger" onClick={() => removeItem(i)}>Remove</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addItem} style={{ marginBottom: 16 }}>+ Add item</button>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={saveEdit}>Save</button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p><strong>Type:</strong> {TYPE_LABEL[requisition.requisitionType] || requisition.requisitionType}</p>
            {requisition.object && <p><strong>Object:</strong> {requisition.object}</p>}
            {requisition.systemCheck && <p><strong>System check:</strong> {requisition.systemCheck === "BMS_FA_FSS_LEADER" ? "BMS/FA/FSS Leader" : "ICT Leader"}</p>}
            <p><strong>Applicant:</strong> {requisition.applicantName || "—"}</p>
            <p><strong>SO number:</strong> {requisition.soNumber || "—"} · <strong>Project:</strong> {requisition.projectName || "—"}</p>
            <p><strong>Date:</strong> {new Date(requisition.date).toLocaleDateString()} · <strong>Expected delivery:</strong> {requisition.expectedDelivery ? new Date(requisition.expectedDelivery).toLocaleDateString() : "—"}</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Created by {requisition.createdBy?.name}</p>
            {canEdit && <button onClick={startEdit}>Edit</button>}
          </>
        )}
      </div>

      {!editing && (
        <div className="table-scroll" style={{ marginBottom: 16 }}>
          <table>
            <thead><tr><th>No.</th><th>Product Code</th><th>Product Name / Service</th><th>Description</th><th>Brand</th><th>Supplier</th><th>Unit</th><th>Qty</th><th>Remark</th></tr></thead>
            <tbody>
              {requisition.items.map((it: any) => (
                <tr key={it.id}>
                  <td>{it.itemNo}</td>
                  <td>{it.productCode || "—"}</td>
                  <td>{it.productName || "—"}</td>
                  <td>{it.description || "—"}</td>
                  <td>{it.brandName || "—"}</td>
                  <td>{it.supplier || "—"}</td>
                  <td>{it.unit || "—"}</td>
                  <td>{it.qty ?? "—"}</td>
                  <td>{it.remark || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSend && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Send requisition</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, maxHeight: 160, overflowY: "auto" }}>
            {people.map((p) => (
              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: "normal", fontSize: 13 }}>
                <input type="checkbox" checked={sendUserIds.includes(p.id)} onChange={() => toggleSendUser(p.id)} />
                {p.name} ({p.role})
              </label>
            ))}
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Message (optional)</label>
            <textarea value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} rows={2} style={{ width: "100%" }} />
          </div>
          {sendResult && <p style={{ color: "var(--success)", fontSize: 13 }}>{sendResult}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary" onClick={sendRequisition} disabled={sending}>{sending ? "Sending…" : "Send"}</button>
            <button onClick={() => setShowSend(false)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      {!editing && (
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/api/material-requisitions/${id}/report`} target="_blank" rel="noopener noreferrer">
            <button>Download form</button>
          </a>
          {canEdit && !showSend && <button onClick={() => setShowSend(true)}>Send requisition</button>}
          {canManage && <button className="danger" onClick={removeRequisition}>Delete this requisition</button>}
        </div>
      )}
    </div>
  );
}