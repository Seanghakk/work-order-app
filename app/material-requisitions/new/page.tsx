"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Item = { productCode: string; productName: string; description: string; brandName: string; supplier: string; unit: string; qty: string; remark: string };
const emptyItem = (): Item => ({ productCode: "", productName: "", description: "", brandName: "", supplier: "", unit: "", qty: "", remark: "" });

export default function NewMaterialRequisition() {
  const { data: session } = useSession();
  const [referenceNo, setReferenceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [object, setObject] = useState("");
  const [requisitionType, setRequisitionType] = useState("MATERIAL");
  const [systemCheck, setSystemCheck] = useState("");
  const [applicantName, setApplicantName] = useState(session?.user?.name || "");
  const [soNumber, setSoNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [error, setError] = useState("");
  const router = useRouter();

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
    const validItems = items.filter((it) => it.productName.trim() || it.description.trim());
    if (validItems.length === 0) {
      setError("Add at least one item.");
      return;
    }
    const res = await fetch("/api/material-requisitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceNo: referenceNo || null, date, object: object || null, requisitionType,
        systemCheck: systemCheck || null, applicantName: applicantName || null,
        soNumber: soNumber || null, projectName: projectName || null,
        expectedDelivery: expectedDelivery || null, items: validItems,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/material-requisitions");
  }

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h1>New material / tool / service requisition</h1>
      <form onSubmit={handleSubmit} className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 180 }}><label>Reference (optional)</label><input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} style={{ width: "100%" }} /></div>
          <div style={{ flex: 1, minWidth: 180 }}><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%" }} /></div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>Requisition for</label>
            <select value={requisitionType} onChange={(e) => setRequisitionType(e.target.value)} style={{ width: "100%" }}>
              <option value="MATERIAL">Material</option>
              <option value="TOOL">Tool</option>
              <option value="SERVICE">Service</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Object (optional)</label>
          <input value={object} onChange={(e) => setObject(e.target.value)} style={{ width: "100%" }} placeholder="What is this requisition for?" />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>System check (optional)</label>
            <select value={systemCheck} onChange={(e) => setSystemCheck(e.target.value)} style={{ width: "100%" }}>
              <option value="">Not set</option>
              <option value="BMS_FA_FSS_LEADER">BMS/FA/FSS Leader</option>
              <option value="ICT_LEADER">ICT Leader</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}><label>Applicant name</label><input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} style={{ width: "100%" }} /></div>
          <div style={{ flex: 1, minWidth: 180 }}><label>SO number (optional)</label><input value={soNumber} onChange={(e) => setSoNumber(e.target.value)} style={{ width: "100%" }} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}><label>Project name (optional)</label><input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={{ width: "100%" }} /></div>
          <div style={{ flex: 1, minWidth: 200 }}><label>Expected delivery (optional)</label><input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} style={{ width: "100%" }} /></div>
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

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        <button className="primary" type="submit">Create requisition</button>
      </form>
    </div>
  );
}