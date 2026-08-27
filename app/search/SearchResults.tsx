"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isRequestPhase, workOrderTypeLabel } from "@/lib/workOrderLabels";

type SearchResult = {
  id: string;
  title: string;
  soNumber: string | null;
  status: string;
  site?: string | null;
  customerName?: string | null;
  href: string;
  // Only present on workOrders results — Service Requests/Defect Reports/Assets
  // have no approval-phase concept.
  approvedById?: string | null;
};

type SearchResults = {
  workOrders: SearchResult[];
  serviceRequests: SearchResult[];
  defectReports: SearchResult[];
  assets: SearchResult[];
};

const EMPTY_RESULTS: SearchResults = { workOrders: [], serviceRequests: [], defectReports: [], assets: [] };

const CATEGORIES: { key: keyof SearchResults; label: string }[] = [
  { key: "workOrders", label: "Work Orders" },
  { key: "serviceRequests", label: "Service Requests" },
  { key: "defectReports", label: "Defect Reports" },
  { key: "assets", label: "Assets" },
];

const RESULTS_LIMIT = 50;

export default function SearchResults() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").trim();
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=${RESULTS_LIMIT}`)
      .then((r) => (r.ok ? r.json() : EMPTY_RESULTS))
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  const hasAnyResults = !!results && CATEGORIES.some((c) => results[c.key].length > 0);

  return (
    <div className="container">
      <span className="eyebrow">Search</span>
      <h1>Results for "{q}"</h1>

      {q.length < 2 && <p style={{ color: "var(--text-muted)" }}>Enter at least 2 characters to search.</p>}
      {loading && <p style={{ color: "var(--text-muted)" }}>Searching…</p>}
      {!loading && results && !hasAnyResults && q.length >= 2 && (
        <p style={{ color: "var(--text-muted)" }}>No results found across Work Orders, Service Requests, Defect Reports, or Assets.</p>
      )}

      {results && CATEGORIES.map(({ key, label }) => {
        const items = results[key];
        if (items.length === 0) return null;
        return (
          <div key={key} className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>{label} ({items.length})</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Reference</th>
                    <th>{key === "serviceRequests" ? "Customer" : "Site"}</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {key === "workOrders" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span className={`type-tag${isRequestPhase({ approvedById: item.approvedById ?? null }) ? " type-tag-request" : ""}`}>
                              {workOrderTypeLabel({ approvedById: item.approvedById ?? null })}
                            </span>
                            <Link href={item.href}>{item.title}</Link>
                          </div>
                        )}
                        {key !== "workOrders" && <Link href={item.href}>{item.title}</Link>}
                      </td>
                      <td>{item.soNumber || "—"}</td>
                      <td>{(key === "serviceRequests" ? item.customerName : item.site) || "—"}</td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
