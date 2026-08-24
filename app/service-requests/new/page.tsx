"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewServiceRequest() {
  const [title, setTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/users/assignable").then((r) => r.json()).then((data) => Array.isArray(data) && setPeople(data));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !customerName.trim()) {
      setError("Title and customer name are required.");
      return;
    }
    const res = await fetch("/api/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, customerName, description, dueDate: dueDate || null, assignedToId: assignedToId || null }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/service-requests");
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1>New service request</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} placeholder="CCTV not recording — floor 3" />
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
        <button className="primary" type="submit">Create service request</button>
      </form>
    </div>
  );
}