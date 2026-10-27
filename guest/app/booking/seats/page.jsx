"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useApiData } from "@/hooks/useApiData";
import { LoadingBlock, EmptyState } from "@/components/portal/primitives";
import BookingHeader from "@/components/cinema/BookingHeader";
import SelectionBar from "@/components/cinema/SelectionBar";
import { formatRM } from "@/lib/cinema";

// Step 2 (SSC SeatSelectionPage): pick seats from the hall's map for this screening.
function SeatSelectionPage() {
  const router = useRouter();
  const showtimeId = Number(useSearchParams().get("showtimeId") ?? 0);
  const showtime = useApiData("/cinema/showtime/detail", { showtimeId }, { skip: !showtimeId });
  const seats = useApiData("/cinema/seat/list", { showtimeId }, { skip: !showtimeId });
  const [selected, setSelected] = useState([]); // seat objects, sorted by seatId as in SSC

  const rows = useMemo(() => {
    const map = new Map();
    for (const seat of seats.data ?? []) {
      if (!map.has(seat.seatRow)) map.set(seat.seatRow, []);
      map.get(seat.seatRow).push(seat);
    }
    return [...map.entries()];
  }, [seats.data]);

  function toggle(seat) {
    setSelected((current) => {
      const exists = current.some((s) => s.seatId === seat.seatId);
      const next = exists ? current.filter((s) => s.seatId !== seat.seatId) : [...current, seat];
      return next.sort((a, b) => a.seatId - b.seatId);
    });
  }

  function confirm() {
    if (selected.length === 0) {
      window.alert("please select atleast 1 seat!!");
      return;
    }
    router.push(`/booking/food?showtimeId=${showtimeId}&seats=${selected.map((s) => s.seatId).join(",")}`);
  }

  if (!showtimeId) return <EmptyState icon="event_busy" title="No screening selected" />;
  if (showtime.loading && !showtime.data) return <LoadingBlock rows={3} />;
  if (showtime.error) return <EmptyState icon="error" title="Screening not found" description={showtime.error.message} />;

  return (
    <div className="flex flex-col gap-5 pb-32">
      <BookingHeader showtime={showtime.data} />

      <div className="flex justify-center">
        <div className="w-4/5 rounded-b-3xl border-b-4 border-primary/60 bg-primary/10 py-1 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-on-surface-variant">Screen</div>
      </div>

      <div className="flex flex-col gap-2 overflow-x-auto">
        {rows.map(([row, list]) => (
          <div key={row} className="flex items-center justify-center gap-2">
            <span className="w-4 text-xs font-bold text-on-surface-variant">{row}</span>
            {list.map((seat) => {
              const isSelected = selected.some((s) => s.seatId === seat.seatId);
              const available = seat.status === "AVAILABLE";
              return (
                <button
                  key={seat.seatId}
                  type="button"
                  disabled={!available}
                  onClick={() => toggle(seat)}
                  title={`${seat.seatNumber} · ${formatRM(seat.price)} · ${seat.status}`}
                  className={`h-8 w-8 rounded-lg text-[10px] font-bold transition-colors ${
                    isSelected
                      ? "bg-amber-400 text-black"
                      : available
                        ? "bg-white/10 text-on-surface hover:bg-white/20"
                        : seat.status === "BOOKED"
                          ? "bg-rose-900/60 text-rose-300/60 line-through"
                          : "bg-surface-container-highest text-on-surface-variant/40"
                  }`}
                >
                  {seat.seatNumber.slice(1)}
                </button>
              );
            })}
            <span className="w-4 text-right text-xs font-bold text-on-surface-variant">{row}</span>
          </div>
        ))}
      </div>

      <ul className="flex flex-wrap justify-center gap-3 text-[11px] text-on-surface-variant">
        <li className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> Selected</li>
        <li className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-white/10" /> Available</li>
        <li className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-rose-900/60" /> Booked</li>
        <li className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-surface-container-highest" /> Blocked</li>
      </ul>

      <SelectionBar
        title="Seat Selection"
        summary={selected.length > 0 ? selected.map((s) => s.seatNumber).join(", ") : "- Please Select Seats -"}
        buttonTitle={`Confirm - ${selected.length} ticket(s)`}
        onConfirm={confirm}
      />
    </div>
  );
}

export default function SeatSelectionWrapper() {
  return (
    <Suspense fallback={<LoadingBlock rows={3} />}>
      <SeatSelectionPage />
    </Suspense>
  );
}
