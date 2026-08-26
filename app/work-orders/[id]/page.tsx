"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { isValidHttpUrl } from "@/lib/url";

const SERVICE_TYPES = ["REPAIR", "TROUBLESHOOTING", "WARRANTY", "EMERGENCY_OT", "MAINTENANCE", "INSTALLATION", "OTHER"];
const SERVICE_TYPE_LABEL: Record<string, string> = {
  REPAIR: "Repair", TROUBLESHOOTING: "Troubleshooting (minor repair)", WARRANTY: "Warranty",
  EMERGENCY_OT: "Emergency on duty (OT)", MAINTENANCE: "Maintenance", INSTALLATION: "Installation", OTHER: "Other",
};
const DISCIPLINES = ["FAS", "BMS", "FSS", "ACS", "CCTV", "PA", "OTHER"];
const DISCIPLINE_LABEL: Record<string, string> = {
  FAS: "FAS (Fire Alarm)", BMS: "BMS", FSS: "FSS (Fire Suppression)", ACS: "ACS (Access Control)",
  CCTV: "CCTV", PA: "PA (Public Address)", OTHER: "Other",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Requested", PENDING_APPROVAL: "Pending approval", APPROVED: "Approved",
  ASSIGNED: "Assigned", IN_PROGRESS: "In progress", PENDING_SIGNOFF: "Pending sign-off",
  COMPLETED: "Completed", ON_HOLD: "On hold", CANCELED: "Canceled",
};

// The status dropdown only ever offers the "still open" transitions — the approval-
// workflow's gated moves (Requested→Pending approval, Pending approval→Approved/
// Rejected, Pending sign-off→Completed/In progress) go through the dedicated
// Approve/Reject/Sign-off/Send-back/Resubmit buttons below instead. ON_HOLD/CANCELED
// stay reachable from (and back out to OPEN/IN_PROGRESS from) anywhere, unchanged from
// today's behavior — they're explicitly out of scope for this workflow.
const DROPDOWN_OPTIONS: Record<string, string[]> = {
  OPEN: ["ON_HOLD", "CANCELED"],
  PENDING_APPROVAL: ["ON_HOLD", "CANCELED"],
  APPROVED: ["IN_PROGRESS", "ON_HOLD", "CANCELED"],
  ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "CANCELED"],
  IN_PROGRESS: ["PENDING_SIGNOFF", "ON_HOLD", "CANCELED"],
  PENDING_SIGNOFF: ["ON_HOLD", "CANCELED"],
  COMPLETED: ["ON_HOLD", "CANCELED"],
  ON_HOLD: ["OPEN", "IN_PROGRESS", "CANCELED"],
  CANCELED: ["OPEN", "IN_PROGRESS", "ON_HOLD"],
};

// Which lifecycle stage's fields to show. Not a 1:1 mirror of wo.status — ON_HOLD (and a
// rejected-back-to-OPEN that already has data recorded) don't map cleanly onto a single
// status. Falls back to whichever fields already have data so a paused or reopened work
// order never hides information that was already entered, even if its current status
// alone would suggest an earlier stage than it's actually reached.
function getStage(wo: any): "intake" | "inprogress" | "signoff" | "closed" {
  if (wo.status === "COMPLETED" || wo.status === "CANCELED") return "closed";
  const hasSignoffData = !!wo.departureAt || wo.problemFixed !== null;
  if (wo.status === "PENDING_SIGNOFF" || hasSignoffData) return "signoff";
  if (wo.status === "OPEN" || wo.status === "PENDING_APPROVAL") {
    const hasInProgressData = !!(wo.serviceType || wo.discipline || wo.soNumber || wo.documentControlUrl || wo.arrivalAt || wo.partsNeeded || wo.warrantyClaim);
    return hasInProgressData ? "inprogress" : "intake";
  }
  // APPROVED, ASSIGNED, IN_PROGRESS, ON_HOLD, or anything else in between.
  return "inprogress";
}

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [wo, setWo] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [partsNeeded, setPartsNeeded] = useState("");
  const [soNumber, setSoNumber] = useState("");
  const [documentControlUrl, setDocumentControlUrl] = useState("");
  const [problemNotFixedReason, setProblemNotFixedReason] = useState("");
  const [sending, setSending] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendUserIds, setSendUserIds] = useState<string[]>([]);
  const [sendMessage, setSendMessage] = useState("");
  const [sendResult, setSendResult] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function load() {
    const res = await fetch(`/api/work-orders/${id}`);
    const data = await res.json();
    setWo(data);
    if (data && !data.error) {
      setPartsNeeded(data.partsNeeded || "");
      setSoNumber(data.soNumber || "");
      setDocumentControlUrl(data.documentControlUrl || "");
      setProblemNotFixedReason(data.problemNotFixedReason || "");
    }
  }
   useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (!wo?.siteId) return;
    fetch(`/api/users/assignable?siteId=${wo.siteId}`).then((r) => r.json()).then((data) => Array.isArray(data) && setTechnicians(data));
  }, [wo?.siteId]);
  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then((data) => Array.isArray(data) && setTeams(data));
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
  }, []);

  const role = session?.user?.role;
  const canEdit = role === "MANAGER" || role === "ADMIN" || role === "MAINTENANCE_LEADER" || role === "MAINTENANCE_TECHNICIAN";
  const canManage = role === "MANAGER" || role === "ADMIN";
  // Client-side mirror of canApproveOrSignOff, purely to show/hide the workflow buttons —
  // the backend re-checks this independently, same defense-in-depth pattern used
  // everywhere else in this app (client-side hiding never substitutes for the API check).
  const isApprover =
    role === "MANAGER" || role === "ADMIN" ||
    (!!wo?.teamId && teams.find((t) => t.id === wo.teamId)?.teamLeader?.id === session?.user?.id);
  // Client-side mirror of canEditWorkflowFields (creator/assignee/leader/manager),
  // purely to show/hide the Edit details button — the backend re-checks independently.
  const canEditContent =
    role === "MANAGER" || role === "ADMIN" ||
    wo?.requestedById === session?.user?.id ||
    wo?.assignedToId === session?.user?.id ||
    (!!wo?.teamId && teams.find((t) => t.id === wo.teamId)?.teamLeader?.id === session?.user?.id);
  // Same canEditWorkflowFields mirror as canEditContent, kept as its own named boolean
  // (matching the PATCH route's separate touchesContent/touchesWorkflow checks) to gate
  // the Status/Assigned to/Team/Due date controls specifically.
  const canEditWorkflow =
    role === "MANAGER" || role === "ADMIN" ||
    wo?.requestedById === session?.user?.id ||
    wo?.assignedToId === session?.user?.id ||
    (!!wo?.teamId && teams.find((t) => t.id === wo.teamId)?.teamLeader?.id === session?.user?.id);

  function startEditDetails() {
    setEditTitle(wo.title);
    setEditDescription(wo.description);
    setEditingDetails(true);
  }
  async function saveDetails() {
    if (!editTitle.trim() || !editDescription.trim()) { setError("Title and description can't be empty."); return; }
    await updateField({ title: editTitle, description: editDescription });
    setEditingDetails(false);
  }

  async function doAction(action: string, reason?: string) {
    await updateField({ action, reason });
  }
  async function handleApprove() {
    await doAction("approve");
  }
  async function handleReject() {
    const reason = window.prompt("Why is this work order being rejected? A reason is required.");
    if (reason === null) return;
    if (!reason.trim()) { setError("A reason is required to reject."); return; }
    await doAction("reject", reason.trim());
  }
  async function handleSignoff() {
    await doAction("signoff");
  }
  async function handleSendBack() {
    const reason = window.prompt("Reason for sending this back to In Progress (optional):");
    if (reason === null) return;
    await doAction("sendback", reason.trim() || undefined);
  }
  async function handleResubmit() {
    await doAction("resubmit");
  }

  async function toggleArchived() {
    if (wo.archived) {
      await updateField({ archived: false });
    } else if (wo.status === "COMPLETED" || wo.status === "CANCELED") {
      if (!confirm("Archive this work order?")) return;
      await fetch(`/api/work-orders/${id}`, { method: "DELETE" });
      load();
    } else {
      alert("Only completed or canceled work orders can be archived.");
    }
  }

  async function updateField(data: any) {
    const res = await fetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Update failed.");
      return;
    }
    setError("");
    load();
  }

  function saveDocumentControlUrl() {
    const trimmed = documentControlUrl.trim();
    if (trimmed && !isValidHttpUrl(trimmed)) {
      setError("Document Control link must be a valid http(s) URL.");
      return;
    }
    updateField({ documentControlUrl: trimmed || null });
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) { setError("Enter a comment first."); return; }
    await updateField({ comment });
    setComment("");
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/work-orders/${id}/photos`, { method: "POST", body: formData });
    setUploading(false);
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
    const res = await fetch(`/api/work-orders/${id}/photos/${photoId}`, { method: "DELETE" });
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
    const res = await fetch(`/api/work-orders/${id}/send`, {
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

  if (!wo || wo.error) return <div className="container"><p>{wo?.error || "Loading…"}</p></div>;

  const stage = getStage(wo);

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>{wo.title}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span className={`badge badge-${wo.status.toLowerCase()}`}>{STATUS_LABEL[wo.status] || wo.status}</span>
        <span className={`badge badge-${wo.priority.toLowerCase()}`}>{wo.priority}</span>
        {wo.warrantyClaim && <span className="badge badge-urgent">Warranty claim</span>}
        {wo.archived && <span className="badge badge-on_hold">Archived</span>}
      </div>

      {stage === "closed" && (
        <div className="closed-ribbon">✓ {STATUS_LABEL[wo.status] || wo.status} — shown as a read-only record. No open fields, nothing left to fill in.</div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        {editingDetails ? (
          <>
            <div className="field">
              <label>Title</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} style={{ width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={saveDetails}>Save</button>
              <button onClick={() => setEditingDetails(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p>{wo.description}</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Site: {wo.site?.name || "—"} · Team: {wo.team?.name || "—"} · Asset: {wo.asset?.name || "—"} · Requested by {wo.requestedBy?.name} · Created {new Date(wo.createdAt).toLocaleString()}
            </p>
            {canEditContent && stage !== "closed" && <button onClick={startEditDetails}>Edit details</button>}
          </>
        )}
      </div>

      {canEdit && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div>
              <label>Status</label>
              <select value={wo.status} disabled={!canEditWorkflow} onChange={(e) => updateField({ status: e.target.value })}>
                {Array.from(new Set([wo.status, ...(DROPDOWN_OPTIONS[wo.status] || [])])).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Priority</label>
              <select value={wo.priority} onChange={(e) => updateField({ priority: e.target.value })}>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label>Assigned to</label>
              <select value={wo.assignedToId || ""} disabled={!canEditWorkflow} onChange={(e) => updateField({ assignedToId: e.target.value || null })}>
                <option value="">Unassigned</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
              </select>
            </div>
            <div>
              <label>Due date</label>
              <input type="date" value={wo.dueDate ? wo.dueDate.slice(0, 10) : ""} disabled={!canEditWorkflow} onChange={(e) => updateField({ dueDate: e.target.value || null })} />
            </div>
            <div>
              <label>Team</label>
              <select value={wo.teamId || ""} disabled={!canEditWorkflow} onChange={(e) => updateField({ teamId: e.target.value || null })}>
                <option value="">No team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          {!canEditWorkflow && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
              Only the creator, assignee, team leader, or a manager can change status, assignment, team, or due date.
            </p>
          )}
        </div>
      )}

      {/* Approve/Reject/Resubmit sit right after the fields an approver needs to review
          before deciding, rather than buried near the bottom past sections that don't
          exist yet at this stage. Sign-off/Send-back get the same treatment further down,
          positioned after Photos so the reviewer sees the evidence before deciding. */}
      {isApprover && (wo.status === "PENDING_APPROVAL" || wo.status === "OPEN") && (
        <div className="action-row" style={{ marginBottom: 16 }}>
          {wo.status === "PENDING_APPROVAL" && (
            <>
              <button className="primary" onClick={handleApprove}>Approve</button>
              <button className="danger" onClick={handleReject}>Reject</button>
            </>
          )}
          {wo.status === "OPEN" && (
            <button className="primary" onClick={handleResubmit}>Resubmit for approval</button>
          )}
        </div>
      )}

      {canEdit && stage === "intake" && (
        <div className="hint-card">
          <div className="hint-label">Unlocks after approval</div>
          <p>Service type, discipline, S.O. number, arrival time, parts needed, and photo upload become available once this moves out of Pending approval.</p>
        </div>
      )}

      {canEdit && stage !== "intake" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Service Report Details</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <label>Service type</label>
              <select value={wo.serviceType || ""} onChange={(e) => updateField({ serviceType: e.target.value || null })}>
                <option value="">Not set</option>
                {SERVICE_TYPES.map((s) => <option key={s} value={s}>{SERVICE_TYPE_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label>Discipline</label>
              <select value={wo.discipline || ""} onChange={(e) => updateField({ discipline: e.target.value || null })}>
                <option value="">Not set</option>
                {DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>)}
              </select>
            </div>
            <div>
              <label>S.O. number (optional)</label>
              <input value={soNumber} onChange={(e) => setSoNumber(e.target.value)} onBlur={() => updateField({ soNumber })} placeholder="e.g. SO-2026-0142" />
            </div>
            <div>
              <label>Document Control link (optional)</label>
              <input
                value={documentControlUrl}
                onChange={(e) => setDocumentControlUrl(e.target.value)}
                onBlur={saveDocumentControlUrl}
                placeholder="https://..."
                style={{ minWidth: 260 }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <label>Arrival</label>
              <input type="datetime-local" value={wo.arrivalAt ? wo.arrivalAt.slice(0, 16) : ""} onChange={(e) => updateField({ arrivalAt: e.target.value || null })} />
            </div>
            {(stage === "signoff" || stage === "closed") && (
              <div>
                <label>Departure</label>
                <input type="datetime-local" value={wo.departureAt ? wo.departureAt.slice(0, 16) : ""} onChange={(e) => updateField({ departureAt: e.target.value || null })} />
              </div>
            )}
          </div>
          {(stage === "signoff" || stage === "closed") && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label>Problem fixed upon departure?</label>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "normal" }}>
                    <input type="radio" checked={wo.problemFixed === true} onChange={() => updateField({ problemFixed: true, problemNotFixedReason: null })} />
                    Yes
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "normal" }}>
                    <input type="radio" checked={wo.problemFixed === false} onChange={() => updateField({ problemFixed: false })} />
                    No
                  </label>
                </div>
              </div>
              {wo.problemFixed === false && (
                <div>
                  <label>If not, why?</label>
                  <textarea
                    value={problemNotFixedReason}
                    onChange={(e) => setProblemNotFixedReason(e.target.value)}
                    onBlur={() => updateField({ problemNotFixedReason })}
                    rows={2}
                    style={{ width: "100%" }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {canEdit && stage === "inprogress" && (
        <div className="hint-card">
          <div className="hint-label">Unlocks at sign-off</div>
          <p>Departure time and "Problem fixed?" appear once this moves to Pending sign-off — no point asking before the visit is over.</p>
        </div>
      )}

      {canEdit && stage !== "intake" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label>Parts needed (optional)</label>
            <textarea
              value={partsNeeded}
              onChange={(e) => setPartsNeeded(e.target.value)}
              onBlur={() => updateField({ partsNeeded })}
              rows={2}
              style={{ width: "100%" }}
              placeholder="e.g. 2x AHU filter (24x24x2), 1x contactor 40A"
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "normal" }}>
            <input type="checkbox" checked={!!wo.warrantyClaim} onChange={(e) => updateField({ warrantyClaim: e.target.checked })} />
            This is a warranty claim
          </label>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Photos</h3>
        {wo.photos.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No photos yet.</p>}
        {wo.photos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 12 }}>
            {wo.photos.map((p: any) => (
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
        {canEdit && stage !== "closed" && (
          <div>
            <input type="file" accept="image/*" onChange={handlePhotoSelect} disabled={uploading} />
            {uploading && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Uploading…</p>}
          </div>
        )}
      </div>

      {isApprover && wo.status === "PENDING_SIGNOFF" && (
        <div className="action-row" style={{ marginBottom: 16 }}>
          <button className="primary" onClick={handleSignoff}>Sign off</button>
          <button onClick={handleSendBack}>Send back to In Progress</button>
        </div>
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

      {/* Approve/Reject/Resubmit and Sign-off/Send-back moved up to sit next to the
          fields relevant to each decision — see the two action-rows above. */}

      <div className="action-row" style={{ marginBottom: 16 }}>
        <a href={`/api/work-orders/${id}/report`} target="_blank" rel="noopener noreferrer">
          <button>Download report</button>
        </a>
        {stage !== "intake" && wo.documentControlUrl && (
          <a href={wo.documentControlUrl} target="_blank" rel="noopener noreferrer">
            <button>Open in Document Control ↗</button>
          </a>
        )}
        {canEdit && stage !== "intake" && <button onClick={() => setShowSend((v) => !v)}>Send report</button>}
        {canManage && stage === "closed" && <button onClick={toggleArchived}>{wo.archived ? "Unarchive" : "Archive"}</button>}
      </div>

      <h3>Activity</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {wo.comments.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No comments yet.</p>}
        {wo.comments.map((c: any) => (
          <div key={c.id} className="card">
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{c.author.name} · {new Date(c.createdAt).toLocaleString()}</p>
            <p style={{ margin: "4px 0 0" }}>{c.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={submitComment} style={{ display: "flex", gap: 8 }}>
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add an update" style={{ flex: 1 }} />
        <button className="primary" type="submit">Post</button>
      </form>
    </div>
  );
}