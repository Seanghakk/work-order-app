"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CORPORATE_PARTNERS = ["SCE", "DBD", "PITTA", "CE&P", "ESD", "CAIC", "LGT", "ACT", "ET&S", "GGEAR", "LBL"];

export default function NewSaleOrder() {
  const [title, setTitle] = useState("");
  const [customerType, setCustomerType] = useState<"GENERAL" | "CORPORATE">("GENERAL");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
    fetch("/api/teams").then((r) => r.json()).then((data) => Array.isArray(data) && setTeams(data));
  }, []);

  function handleCustomerTypeChange(type: "GENERAL" | "CORPORATE") {
    setCustomerType(type);
    setCustomerName("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !customerName.trim()) {
      setError("Title and customer name are required.");
      return;
    }
    const res = await fetch("/api/sale-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, customerName, description, value: value || null,
        assignedToId: assignedToId || null, dueDate: dueDate || null,
        isCorporatePartner: customerType === "CORPORATE",
        teamId: teamId || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/sale-orders");
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1>New sale order</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} placeholder="CCTV upgrade — ABC Tower" />
        </div>
        <div className="field">
          <label>Customer type</label>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "normal" }}>
              <input type="radio" checked={customerType === "GENERAL"} onChange={() => handleCustomerTypeChange("GENERAL")} />
              General customer
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: "normal" }}>
              <input type="radio" checked={customerType === "CORPORATE"} onChange={() => handleCustomerTypeChange("CORPORATE")} />
              Corporate partner
            </label>
          </div>
        </div>
        <div className="field">
          <label>Customer name</label>
          {customerType === "CORPORATE" ? (
            <select value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: "100%" }}>
              <option value="">Select partner</option>
              {CORPORATE_PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: "100%" }} />
          )}
        </div>
        <div className="field">
          <label>Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ width: "100%" }} />
        </div>
        <div className="field">
          <label>Estimated value (optional)</label>
          <input type="number" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: "100%" }} placeholder="0.00" />
        </div>
        <div className="field">
          <label>Due date (optional)</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div className="field">
          <label>Assign to (optional)</label>
          <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} style={{ width: "100%" }}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
          </select>
        </div>
        <div className="field">
          <label>Team (optional)</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ width: "100%" }}>
            <option value="">No team</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        <button className="primary" type="submit">Create sale order</button>
      </form>
    </div>
  );
}