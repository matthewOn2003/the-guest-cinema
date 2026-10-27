"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useApiData } from "@/hooks/useApiData";
import { GlassCard, LoadingBlock, EmptyState, PrimaryButton, GhostButton } from "@/components/portal/primitives";
import { parseIdList, parseFoodList } from "@/lib/bookingParams";
import { formatRM, dateLabel, timeLabel, splitDateTime } from "@/lib/cinema";

// Step 4 (SSC PaymentPage): review the order, then pay with Touch 'n Go.
function PaymentPage() {
  const router = useRouter();
  const params = useSearchParams();
  const showtimeId = Number(params.get("showtimeId") ?? 0);
  const seatIds = parseIdList(params.get("seats"));
  const foodLines = parseFoodList(params.get("foods"));

  const showtime = useApiData("/cinema/showtime/detail", { showtimeId }, { skip: !showtimeId });
  const seats = useApiData("/cinema/seat/list", { showtimeId }, { skip: !showtimeId });
  const foods = useApiData("/cinema/food/list", {});

  const seatLines = useMemo(
    () => (seats.data ?? []).filter((s) => seatIds.includes(s.seatId)).sort((a, b) => a.seatId - b.seatId),
    [seats.data, seatIds.join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const foodDetails = useMemo(
    () => foodLines.map((line) => {
      const food = (foods.data ?? []).find((f) => f.foodId === line.foodId);
      return { ...line, name: food?.name ?? `Food #${line.foodId}`, price: food?.price ?? 0 };
    }),
    [foods.data, foodLines.map((l) => `${l.foodId}:${l.quantity}`).join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const seatTotal = seatLines.reduce((sum, s) => sum + s.price, 0);
  const foodTotal = foodDetails.reduce((sum, f) => sum + f.price * f.quantity, 0);
  const total = Math.round((seatTotal + foodTotal) * 100) / 100;

  function payWithTng() {
    sessionStorage.setItem("pendingOrder", JSON.stringify({ showtimeId, seatIds, foods: foodLines }));
    router.push("/booking/tng");
  }

  if (!showtimeId || seatIds.length === 0) return <EmptyState icon="receipt_long" title="No order in progress" />;
  if (showtime.loading && !showtime.data) return <LoadingBlock rows={3} />;
  if (!showtime.data) return <EmptyState icon="error" title="Screening not found" />;
  const s = showtime.data;
  const { date } = splitDateTime(s.showDate);

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="flex gap-4 p-4">
        <div className="w-24 shrink-0 rounded-xl border border-white/10 bg-cover bg-center" style={{ aspectRatio: "2/3", backgroundImage: `url(${s.movie.posterImage})` }} />
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-3 text-xs">
          <div className="col-span-2"><p className="text-sm font-extrabold">{s.movie.title}</p><p className="text-on-surface-variant">{s.movie.language} | {s.movie.duration} min | {s.hall.experienceType}</p></div>
          <div><p className="text-on-surface-variant">Cinema</p><p className="font-bold">{s.cinema.city} - {s.cinema.name}</p></div>
          <div><p className="text-on-surface-variant">Hall</p><p className="font-bold">{s.hall.hallName}</p></div>
          <div><p className="text-on-surface-variant">Time</p><p className="font-bold">{dateLabel(date)} {timeLabel(s.showDate)}</p></div>
          <div><p className="text-on-surface-variant">Seats</p><p className="font-bold">{seatLines.map((x) => x.seatNumber).join(", ")}</p></div>
        </div>
      </GlassCard>

      <GlassCard className="flex flex-col gap-3 p-4 text-sm">
        <p className="text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">Seat</p>
        {seatLines.map((seat) => (
          <div key={seat.seatId} className="flex justify-between"><span>Adult x 1 · {seat.seatNumber}</span><span>{formatRM(seat.price)}</span></div>
        ))}
        {foodDetails.length > 0 ? <p className="pt-2 text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">Food</p> : null}
        {foodDetails.map((f) => (
          <div key={f.foodId} className="flex justify-between"><span>{f.name} x {f.quantity}</span><span>{formatRM(f.price * f.quantity)}</span></div>
        ))}
        <div className="mt-2 flex justify-between border-t border-white/10 pt-3 font-extrabold"><span>Total:</span><span>{formatRM(total)}</span></div>
      </GlassCard>

      <div className="flex gap-2">
        <GhostButton className="flex-1" onClick={() => router.back()}>Back</GhostButton>
        <PrimaryButton className="flex-1" onClick={payWithTng}>Pay With Touch n Go</PrimaryButton>
      </div>
    </div>
  );
}

export default function PaymentWrapper() {
  return (
    <Suspense fallback={<LoadingBlock rows={3} />}>
      <PaymentPage />
    </Suspense>
  );
}
