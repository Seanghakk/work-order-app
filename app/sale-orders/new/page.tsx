"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSaleOrder() {
  const [title, setTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [siteId, setSiteId] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/sites").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setSites(data);
        if (data.length === 1) setSiteId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!siteId) { setPeople([]); return; }
    fetch(`/api/users/assignable?siteId=${siteId}`).then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
  }, [siteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !customerName.trim() || !siteId) {
      setError("Title, customer name, and site are required.");
      return;
    }
    const res = await fetch("/api/sale-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, customerName, description, value: value || null, assignedToId: assignedToId || null, dueDate: dueDate || null, siteId }),
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
          <label>Site</label>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)} style={{ width: "100%" }}>
            <option value="">Select</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} placeholder="CCTV upgrade — ABC Tower" />
        </div>
        <div className="field">
          <label>Customer name</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: "100%" }} />
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
        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        <button className="primary" type="submit">Create sale order</button>
      </form>
    </div>
  );
}
