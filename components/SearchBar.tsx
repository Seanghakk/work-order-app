"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setOpen(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((r) => (r.ok ? r.json() : EMPTY_RESULTS))
        .then((data) => {
          if (cancelled) return;
          setResults(data);
          setOpen(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function goToFullResults() {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter") goToFullResults();
  }

  const hasAnyResults = !!results && CATEGORIES.some((c) => results[c.key].length > 0);

  return (
    <div className="search-bar-wrap" ref={wrapRef}>
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= MIN_QUERY_LENGTH && results && setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-label="Search work orders, service requests, defect reports, and assets"
      />
      {open && (
        <div className="search-results-panel">
          {loading && !results && <div className="search-empty">Searching…</div>}
          {results && !hasAnyResults && !loading && <div className="search-empty">No results for "{query.trim()}".</div>}
          {results && CATEGORIES.map(({ key, label }) => {
            const items = results[key];
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <div className="search-group-label">{label}</div>
                {items.map((item) => (
                  <Link key={item.id} href={item.href} className="search-result-item" onClick={() => setOpen(false)}>
                    {key === "workOrders" && (
                      <span className={`type-tag${isRequestPhase({ approvedById: item.approvedById ?? null }) ? " type-tag-request" : ""}`}>
                        {workOrderTypeLabel({ approvedById: item.approvedById ?? null })}
                      </span>
                    )}
                    <div className="search-result-title">{item.title}</div>
                    <div className="search-result-meta">
                      {[item.soNumber, item.site || item.customerName, item.status].filter(Boolean).join(" · ")}
                    </div>
                  </Link>
                ))}
              </div>
            );
          })}
          {results && (
            <button type="button" className="search-see-all" onClick={goToFullResults}>
              See all results for "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
