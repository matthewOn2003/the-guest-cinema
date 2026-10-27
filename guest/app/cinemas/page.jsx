"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useApiData } from "@/hooks/useApiData";
import { GlassCard, LoadingBlock, EmptyState, FilterChips } from "@/components/portal/primitives";

// Cinema list with city filter (SSC CinemaListPage).
export default function CinemasPage() {
  const { data, loading, error } = useApiData("/cinema/cinema/list", {});
  const router = useRouter();
  const [city, setCity] = useState("all");

  const cities = useMemo(() => [...new Set((data ?? []).map((c) => c.city))], [data]);
  const shown = useMemo(() => (data ?? []).filter((c) => city === "all" || c.city === city), [data, city]);

  if (loading && !data) return <LoadingBlock rows={3} />;
  if (error) return <EmptyState icon="error" title="Could not load cinemas" description={error.message} />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold">Cinemas</h1>
      <FilterChips
        items={[{ key: "all", label: "All" }, ...cities.map((c) => ({ key: c, label: c }))]}
        value={city}
        onChange={setCity}
      />
      <ul className="flex flex-col gap-3">
        {shown.map((cinema) => (
          <li key={cinema.cinemaId}>
            <GlassCard className="flex flex-col gap-2 overflow-hidden p-0">
              <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${cinema.cinemaImage})` }} />
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{cinema.name}</p>
                  <p className="truncate text-xs text-on-surface-variant">{cinema.city}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"
                  onClick={() => router.push(`/cinemas/${cinema.cinemaId}`)}
                >
                  View More
                </button>
              </div>
            </GlassCard>
          </li>
        ))}
      </ul>
    </div>
  );
}
