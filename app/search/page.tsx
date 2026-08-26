import { Suspense } from "react";
import SearchResults from "./SearchResults";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container"><p>Loading…</p></div>}>
      <SearchResults />
    </Suspense>
  );
}
