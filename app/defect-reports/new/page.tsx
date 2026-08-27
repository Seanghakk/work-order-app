"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Wizard, { WizardStep } from "@/components/Wizard";

const DISCIPLINES = ["LIGHTING", "AUTOMATION", "FIRE_ALARM", "PA_SYSTEM", "BMS", "ACCESS_CONTROL_INTRUSION", "CAR_PARKING", "CCTV", "DATA_TEL_TV", "OTHER"];
const DISCIPLINE_LABEL: Record<string, string> = {
  LIGHTING: "Lighting System", AUTOMATION: "Automation", FIRE_ALARM: "Fire Alarm System",
  PA_SYSTEM: "Public Address System", BMS: "Building Management System",
  ACCESS_CONTROL_INTRUSION: "Access Control System & Intrusion", CAR_PARKING: "Car Parking System",
  CCTV: "CCTV System", DATA_TEL_TV: "Data, Tel & TV System", OTHER: "Others (specify)",
};

type Item = { partNumber: string; description: string; brand: string; unit: string; qty: string; defectDescription: string; photoReference: string };
const emptyItem = (): Item => ({ partNumber: "", description: "", brand: "", unit: "", qty: "", defectDescription: "", photoReference: "" });

export default function NewDefectReport() {
  const [dfNumber, setDfNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [mainContractor, setMainContractor] = useState("");
  const [subContractor, setSubContractor] = useState("ADTECH CO., LTD");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [section, setSection] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [otherDisciplineText, setOtherDisciplineText] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<any[]>([]);
  const [assignedToId, setAssignedToId] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then((data) => Array.isArray(data) && setSites(data));
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
    fetch("/api/teams").then((r) => r.json()).then((data) => Array.isArray(data) && setTeams(data));
  }, []);

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    const res = await fetch("/api/defect-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dfNumber: dfNumber || null, projectName, mainContractor: mainContractor || null,
        subContractor, date, section: section || null, discipline: discipline || null,
        otherDisciplineText: discipline === "OTHER" ? otherDisciplineText : null,
        siteId: siteId || null, assignedToId: assignedToId || null, teamId: teamId || null, remark: remark || null,
        items: items.filter((it) => it.description.trim() || it.defectDescription.trim()),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/defect-reports");
  }

  const steps: WizardStep[] = [
    {
      label: "Report Info",
      validate: () => (!projectName.trim() ? "Project name is required." : null),
      content: (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 180 }}><label>DF No. (optional)</label><input value={dfNumber} onChange={(e) => setDfNumber(e.target.value)} style={{ width: "100%" }} placeholder="DF-26-0004" /></div>
            <div style={{ flex: 1, minWidth: 180 }}><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%" }} /></div>
            <div style={{ flex: 1, minWidth: 180 }}><label>Section (optional)</label><input value={section} onChange={(e) => setSection(e.target.value)} style={{ width: "100%" }} placeholder="Engineering" /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Project name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}><label>Main contractor (optional)</label><input value={mainContractor} onChange={(e) => setMainContractor(e.target.value)} style={{ width: "100%" }} /></div>
            <div style={{ flex: 1, minWidth: 200 }}><label>Sub contractor</label><input value={subContractor} onChange={(e) => setSubContractor(e.target.value)} style={{ width: "100%" }} /></div>
          </div>
        </>
      ),
    },
    {
      label: "Classification",
      content: (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Discipline (optional)</label>
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} style={{ width: "100%" }}>
                <option value="">Not set</option>
                {DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABEL[d]}</option>)}
              </select>
            </div>
            {discipline === "OTHER" && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <label>Specify</label>
                <input value={otherDisciplineText} onChange={(e) => setOtherDisciplineText(e.target.value)} style={{ width: "100%" }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Site (optional)</label>
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)} style={{ width: "100%" }}>
                <option value="">None</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Assigned to (optional)</label>
              <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} style={{ width: "100%" }}>
                <option value="">Unassigned</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Team (optional)</label>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ width: "100%" }}>
                <option value="">No team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
            Setting an assignee or team lets that person (or team leader) edit status, assignment, and line items later — otherwise only you or a manager can.
          </p>
        </>
      ),
    },
    {
      label: "Items",
      content: (
        <>
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
                    <td><input value={it.photoReference} onChange={(e) => updateItem(i, "photoReference", e.target.value)} style={{ width: 90 }} placeholder="e.g. Photo 1-2" /></td>
                    <td>{items.length > 1 && <button type="button" className="danger" onClick={() => removeItem(i)}>Remove</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addItem} style={{ marginBottom: 16 }}>+ Add item</button>

          <div className="field">
            <label>Remark (optional)</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} style={{ width: "100%" }} />
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="container wizard-container-wide">
      <h1>New defect report</h1>
      <Wizard steps={steps} step={step} setStep={setStep} onSubmit={handleSubmit} submitLabel="Create defect report" error={error} setError={setError} />
    </div>
  );
}
