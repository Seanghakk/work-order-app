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

type Item = { id?: string; partNumber: string; description: string; brand: string; unit: string; qty: string; defectDescription: string; photoReference: string };
const emptyItem = (): Item => ({ partNumber: "", description: "", brand: "", unit: "", qty: "", defectDescription: "", photoReference: "" });

export default function DefectReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [items, setItems] = useState<Item[]>([]);
  const [originalItemsJson, setOriginalItemsJson] = useState("");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendUserIds, setSendUserIds] = useState<string[]>([]);
  const [sendMessage, setSendMessage] = useState("");
  const [sendResult, setSendResult] = useState("");
  const canManage = session && ["MANAGER", "ADMIN"].includes(session.user.role);
  const canEdit = session && session.user.role !== "REQUESTER";

  function load() {
    fetch(`/api/defect-reports/${id}`).then((r) => r.json()).then(setReport);
  }
  useEffect(load, [id]);
  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then((data) => Array.isArray(data) && setSites(data));
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
    fetch("/api/teams").then((r) => r.json()).then((data) => Array.isArray(data) && setTeams(data));
  }, []);

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

  function startEdit() {
    setForm({
      dfNumber: report.dfNumber || "",
      projectName: report.projectName,
      mainContractor: report.mainContractor || "",
      subContractor: report.subContractor,
      date: report.date.slice(0, 10),
      section: report.section || "",
      discipline: report.discipline || "",
      otherDisciplineText: report.otherDisciplineText || "",
      siteId: report.siteId || "",
      remark: report.remark || "",
    });
    const mappedItems =
      report.items.length > 0
        ? report.items.map((it: any) => ({
            id: it.id, partNumber: it.partNumber || "", description: it.description || "", brand: it.brand || "",
            unit: it.unit || "", qty: it.qty != null ? String(it.qty) : "", defectDescription: it.defectDescription || "",
            photoReference: it.photoReference || "",
          }))
        : [emptyItem()];
    setItems(mappedItems);
    setOriginalItemsJson(JSON.stringify(mappedItems));
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
    if (!form.projectName.trim()) { setError("Project name can't be empty."); return; }
    const payload: any = {
      ...form,
      otherDisciplineText: form.discipline === "OTHER" ? form.otherDisciplineText : null,
    };
    // Only include items in the request if they actually changed — items are gated by
    // the same creator/assignee/leader/manager check as workflow fields (see the API
    // route), so resending an unmodified items array on every content-only save would
    // wrongly block a legitimate content edit for someone who can't touch items.
    if (JSON.stringify(items) !== originalItemsJson) {
      payload.items = items.filter((it) => it.description.trim() || it.defectDescription.trim());
    }
    await updateField(payload);
    setEditing(false);
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>, itemId?: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = itemId || "general";
    setUploadingKey(key);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    if (itemId) formData.append("itemId", itemId);
    const res = await fetch(`/api/defect-reports/${id}/photos`, { method: "POST", body: formData });
    setUploadingKey(null);
    e.target.value = "";
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Photo upload failed.");
      return;
    }
    load();
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Remove this photo?")) return;
    const res = await fetch(`/api/defect-reports/${id}/photos/${photoId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Couldn't remove photo.");
      return;
    }
    load();
  }

  function toggleSendUser(userId: string) {
    setSendUserIds((prev) => (prev.includes(userId) ? prev.filter((u) => u !== userId) : [...prev, userId]));
  }

  async function sendReport() {
    if (sendUserIds.length === 0) { setError("Select at least one recipient."); return; }
    setSending(true);
    setError("");
    setSendResult("");
    const res = await fetch(`/api/defect-reports/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: sendUserIds, message: sendMessage || undefined }),
    });
    setSending(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Couldn't send the report.");
      return;
    }
    const d = await res.json();
    setSendResult(`Sent to ${d.sentTo} recipient${d.sentTo !== 1 ? "s" : ""}.`);
    setSendUserIds([]);
    setSendMessage("");
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
        <div>
          <label>Assigned to</label>
          <select value={report.assignedToId || ""} onChange={(e) => updateField({ assignedToId: e.target.value || null })}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
          </select>
        </div>
        <div>
          <label>Team</label>
          <select value={report.teamId || ""} onChange={(e) => updateField({ teamId: e.target.value || null })}>
            <option value="">No team</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        {editing ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 180 }}><label>DF No.</label><input value={form.dfNumber} onChange={(e) => setForm({ ...form, dfNumber: e.target.value })} style={{ width: "100%" }} /></div>
              <div style={{ flex: 1, minWidth: 180 }}><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ width: "100%" }} /></div>
              <div style={{ flex: 1, minWidth: 180 }}><label>Section</label><input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} style={{ width: "100%" }} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Project name</label>
              <input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} style={{ width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}><label>Main contractor</label><input value={form.mainContractor} onChange={(e) => setForm({ ...form, mainContractor: e.target.value })} style={{ width: "100%" }} /></div>
              <div style={{ flex: 1, minWidth: 200 }}><label>Sub contractor</label><input value={form.subContractor} onChange={(e) => setForm({ ...form, subContractor: e.target.value })} style={{ width: "100%" }} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label>Discipline</label>
                <select value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} style={{ width: "100%" }}>
                  <option value="">Not set</option>
                  {DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>)}
                </select>
              </div>
              {form.discipline === "OTHER" && (
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label>Specify</label>
                  <input value={form.otherDisciplineText} onChange={(e) => setForm({ ...form, otherDisciplineText: e.target.value })} style={{ width: "100%" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <label>Site</label>
                <select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} style={{ width: "100%" }}>
                  <option value="">None</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <h3>Items</h3>
            <div className="table-scroll" style={{ marginBottom: 12 }}>
              <table>
                <thead><tr><th>Part Number</th><th>Description</th><th>Brand</th><th>Unit</th><th>Qty</th><th>Defect Description</th><th>Photo Ref.</th><th></th></tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td><input value={it.partNumber} onChange={(e) => updateItem(i, "partNumber", e.target.value)} style={{ width: 100 }} /></td>
                      <td><input value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} style={{ width: 140 }} /></td>
                      <td><input value={it.brand} onChange={(e) => updateItem(i, "brand", e.target.value)} style={{ width: 90 }} /></td>
                      <td><input value={it.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} style={{ width: 70 }} /></td>
                      <td><input type="number" value={it.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} style={{ width: 60 }} /></td>
                      <td><input value={it.defectDescription} onChange={(e) => updateItem(i, "defectDescription", e.target.value)} style={{ width: 160 }} /></td>
                      <td><input value={it.photoReference} onChange={(e) => updateItem(i, "photoReference", e.target.value)} style={{ width: 90 }} /></td>
                      <td>{items.length > 1 && <button type="button" className="danger" onClick={() => removeItem(i)}>Remove</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8, marginBottom: 12 }}>Save first, then add photos to each item below.</p>
            <button type="button" onClick={addItem} style={{ marginBottom: 16 }}>+ Add item</button>

            <div style={{ marginBottom: 16 }}>
              <label>Remark</label>
              <textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} rows={3} style={{ width: "100%" }} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={saveEdit}>Save</button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p><strong>Project:</strong> {report.projectName}</p>
            {report.site && <p><strong>Site:</strong> {report.site.name}</p>}
            {report.workOrder && <p><strong>Linked work order:</strong> {report.workOrder.title}</p>}
            <p><strong>Main contractor:</strong> {report.mainContractor || "—"} · <strong>Sub contractor:</strong> {report.subContractor}</p>
            <p><strong>Section:</strong> {report.section || "—"} · <strong>Discipline:</strong> {report.discipline ? (DISCIPLINE_LABEL[report.discipline] || report.discipline) : "—"}{report.discipline === "OTHER" && report.otherDisciplineText ? ` (${report.otherDisciplineText})` : ""}</p>
            <p><strong>Date:</strong> {new Date(report.date).toLocaleDateString()} · Created by {report.createdBy?.name}</p>
            {report.remark && <p><strong>Remark:</strong> {report.remark}</p>}
            {canEdit && <button onClick={startEdit}>Edit</button>}
          </>
        )}
      </div>

      {!editing && (
        <>
          <h3>Items</h3>
          {report.items.map((it: any) => (
            <div key={it.id} className="card" style={{ marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Item {it.itemNo}{it.description ? `: ${it.description}` : ""}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Part: {it.partNumber || "—"} · Brand: {it.brand || "—"} · Unit: {it.unit || "—"} · Qty: {it.qty ?? "—"}
              </p>
              {it.defectDescription && <p style={{ marginTop: 4 }}><strong>Defect:</strong> {it.defectDescription}</p>}
              {it.photoReference && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Reference: {it.photoReference}</p>}

              {it.photos && it.photos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8, marginTop: 10, marginBottom: 8 }}>
                  {it.photos.map((p: any) => (
                    <div key={p.id} style={{ position: "relative" }}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer">
                        <img src={p.url} alt={p.fileName} style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                      </a>
                      <button
                        onClick={() => deletePhoto(p.id)}
                        aria-label="Remove photo"
                        style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 11, lineHeight: 1, padding: 0 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              {canEdit && (
                <div style={{ marginTop: 8 }}>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoSelect(e, it.id)} disabled={uploadingKey === it.id} />
                  {uploadingKey === it.id && <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>Uploading…</span>}
                </div>
              )}
            </div>
          ))}

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>General Photos</h3>
            {report.photos.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No general photos yet — attach photos to specific items above, or add general ones here.</p>}
            {report.photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 12 }}>
                {report.photos.map((p: any) => (
                  <div key={p.id} style={{ position: "relative" }}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      <img src={p.url} alt={p.fileName} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                    </a>
                    <button
                      onClick={() => deletePhoto(p.id)}
                      aria-label="Remove photo"
                      style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <div>
                <input type="file" accept="image/*" onChange={(e) => handlePhotoSelect(e)} disabled={uploadingKey === "general"} />
                {uploadingKey === "general" && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Uploading…</p>}
              </div>
            )}
          </div>
        </>
      )}

      {showSend && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Send report</h3>
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
            <button className="primary" onClick={sendReport} disabled={sending}>{sending ? "Sending…" : "Send"}</button>
            <button onClick={() => setShowSend(false)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

      {!editing && (
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/api/defect-reports/${id}/report`} target="_blank" rel="noopener noreferrer">
            <button>Download report</button>
          </a>
          {canEdit && !showSend && <button onClick={() => setShowSend(true)}>Send report</button>}
          {canManage && <button className="danger" onClick={removeReport}>Delete this defect report</button>}
        </div>
      )}
    </div>
  );
}