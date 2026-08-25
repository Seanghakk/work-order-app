"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewMaintenanceContract() {
  const [contractType, setContractType] = useState("DLP");
  const [clientName, setClientName] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [originalProjectId, setOriginalProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [siteVisitsPerYear, setSiteVisitsPerYear] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !siteLocation.trim() || !startDate || !endDate) {
      setError("Client name, site location, start date, and end date are required.");
      return;
    }
    const res = await fetch("/api/maintenance-contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractType, clientName, siteLocation, originalProjectId: originalProjectId || null,
        startDate, endDate, contractValue: contractValue || null, renewalDate: renewalDate || null,
        siteVisitsPerYear: siteVisitsPerYear || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/maintenance-contracts");
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1>New maintenance contract</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>Contract type</label>
          <select value={contractType} onChange={(e) => setContractType(e.target.value)} style={{ width: "100%" }}>
            <option value="DLP">DLP (Defect Liability Period / warranty)</option>
            <option value="MAINTENANCE">Maintenance (paid ongoing contract)</option>
          </select>
        </div>
        <div className="field">
          <label>Client name</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div className="field">
          <label>Site location</label>
          <input value={siteLocation} onChange={(e) => setSiteLocation(e.target.value)} style={{ width: "100%" }} />
        </div>
        {contractType === "DLP" && (
          <div className="field">
            <label>Original project reference (optional)</label>
            <input value={originalProjectId} onChange={(e) => setOriginalProjectId(e.target.value)} style={{ width: "100%" }} placeholder="Sale order number or project name" />
          </div>
        )}
        <div className="field">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div className="field">
          <label>End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%" }} />
        </div>
        {contractType === "MAINTENANCE" && (
          <>
            <div className="field">
              <label>Contract value (optional)</label>
              <input type="number" value={contractValue} onChange={(e) => setContractValue(e.target.value)} style={{ width: "100%" }} placeholder="0.00" />
            </div>
            <div className="field">
              <label>Renewal date (optional)</label>
              <input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="field">
              <label>Site visits per year (optional)</label>
              <input type="number" value={siteVisitsPerYear} onChange={(e) => setSiteVisitsPerYear(e.target.value)} style={{ width: "100%" }} />
            </div>
          </>
        )}
        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        <button className="primary" type="submit">Create contract</button>
      </form>
    </div>
  );
}