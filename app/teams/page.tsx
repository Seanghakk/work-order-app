"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const CATEGORY_LABEL: Record<string, string> = { SALES: "Sales", PROJECT: "Project", MAINTENANCE: "Maintenance" };

export default function TeamsPage() {
  const { data: session } = useSession();
  const [teams, setTeams] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [error, setError] = useState("");
  const isAdmin = session?.user?.role === "ADMIN";

  function load() {
    fetch("/api/teams").then((r) => r.json()).then((data) => Array.isArray(data) && setTeams(data));
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
  }
  useEffect(load, []);

  async function setLeader(teamId: string, leaderId: string) {
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamLeaderId: leaderId || null }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setError("");
    load();
  }

  async function setBackupApprover(teamId: string, backupApproverId: string) {
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupApproverId: backupApproverId || null }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setError("");
    load();
  }

  const grouped = ["MAINTENANCE", "PROJECT", "SALES"].map((cat) => ({
    category: cat,
    teams: teams.filter((t) => t.category === cat),
  }));

  return (
    <div className="container">
      <h1>Teams</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
        Assign each team's leader here. Assign individual members from the Users page.
      </p>
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      {grouped.map((g) => g.teams.length > 0 && (
        <div key={g.category} style={{ marginBottom: 24 }}>
          <h3>{CATEGORY_LABEL[g.category]}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {g.teams.map((t) => (
              <div key={t.id} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.colorHex, display: "inline-block" }} />
                  <strong>{t.name}</strong>
                  {t.isCrossCategory && <span className="badge badge-medium" style={{ marginLeft: "auto" }}>Cross-category</span>}
                </div>
                <label>Team leader</label>
                {isAdmin ? (
                  <select value={t.teamLeaderId || ""} onChange={(e) => setLeader(t.id, e.target.value)} style={{ width: "100%", fontSize: 14 }}>
                    <option value="">None assigned</option>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
                  </select>
                ) : (
                  <p style={{ margin: "4px 0" }}>{t.teamLeader?.name || "None assigned"}</p>
                )}
                <label style={{ marginTop: 10, display: "block" }}>Backup approver</label>
                {isAdmin ? (
                  <select value={t.backupApproverId || ""} onChange={(e) => setBackupApprover(t.id, e.target.value)} style={{ width: "100%", fontSize: 14 }}>
                    <option value="">None assigned</option>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
                  </select>
                ) : (
                  <p style={{ margin: "4px 0" }}>{t.backupApprover?.name || "None assigned"}</p>
                )}
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10, marginBottom: 0 }}>
                  {t.members.length} member{t.members.length !== 1 ? "s" : ""}: {t.members.map((m: any) => m.name).join(", ") || "none yet"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}