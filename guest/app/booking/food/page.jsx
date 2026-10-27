"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useApiData } from "@/hooks/useApiData";
import { GlassCard, LoadingBlock, EmptyState } from "@/components/portal/primitives";
import BookingHeader from "@/components/cinema/BookingHeader";
import SelectionBar from "@/components/cinema/SelectionBar";
import { parseIdList } from "@/lib/bookingParams";
import { formatRM } from "@/lib/cinema";

// Step 3 (SSC FoodSelectionPage): add concessions, grouped by category, before payment.
function FoodSelectionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const showtimeId = Number(params.get("showtimeId") ?? 0);
  const seatIds = parseIdList(params.get("seats"));

  const showtime = useApiData("/cinema/showtime/detail", { showtimeId }, { skip: !showtimeId });
  const seats = useApiData("/cinema/seat/list", { showtimeId }, { skip: !showtimeId });
  const foods = useApiData("/cinema/food/list", {});
  const [quantities, setQuantities] = useState({}); // foodId -> quantity

  const seatTotal = useMemo(
    () => (seats.data ?? []).filter((s) => seatIds.includes(s.seatId)).reduce((sum, s) => sum + s.price, 0),
    [seats.data, seatIds.join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const categories = useMemo(() => {
    const groups = new Map();
    for (const food of foods.data ?? []) {
      if (!groups.has(food.category)) groups.set(food.category, []);
      groups.get(food.category).push(food);
    }
    return [...groups.entries()];
  }, [foods.data]);

  const selectedFoods = (foods.data ?? []).filter((f) => quantities[f.foodId] > 0);
  const foodTotal = selectedFoods.reduce((sum, f) => sum + f.price * quantities[f.foodId], 0);
  const itemCount = selectedFoods.reduce((sum, f) => sum + quantities[f.foodId], 0);

  function change(foodId, delta) {
    setQuantities((current) => {
      const next = Math.max(0, (current[foodId] ?? 0) + delta);
      return { ...current, [foodId]: next };
    });
  }

  function confirm() {
    const foodParam = selectedFoods.map((f) => `${f.foodId}:${quantities[f.foodId]}`).join(",");
    const query = `showtimeId=${showtimeId}&seats=${seatIds.join(",")}${foodParam ? `&foods=${foodParam}` : ""}`;
    router.push(`/booking/payment?${query}`);
  }

  if (!showtimeId || seatIds.length === 0) return <EmptyState icon="event_seat" title="Choose your seats first" />;
  if (showtime.loading && !showtime.data) return <LoadingBlock rows={3} />;

  return (
    <div className="flex flex-col gap-5 pb-32">
      <BookingHeader showtime={showtime.data} />

      {categories.map(([category, list]) => (
        <section key={category} className="flex flex-col gap-3">
          <h2 className="inline-block w-fit rounded-full bg-primary/15 px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-primary">{category}</h2>
          <ul className="flex flex-col gap-3">
            {list.map((food) => (
              <li key={food.foodId}>
                <GlassCard className="flex gap-3 p-3">
                  <div className="h-20 w-20 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${food.foodImage})` }} />
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <p className="text-sm font-bold">{food.name}</p>
                      <p className="text-[11px] text-on-surface-variant">{food.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{formatRM(food.price)}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" aria-label="Remove one" onClick={() => change(food.foodId, -1)} className="h-8 w-8 rounded-full bg-amber-400 text-lg font-bold text-black">-</button>
                        <span className="w-5 text-center text-sm font-bold">{quantities[food.foodId] ?? 0}</span>
                        <button type="button" aria-label="Add one" onClick={() => change(food.foodId, 1)} className="h-8 w-8 rounded-full bg-amber-400 text-lg font-bold text-black">+</button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <SelectionBar
        title="Food Selection"
        summary={itemCount > 0 ? `${itemCount} items` : "- Please Select Food (optional) -"}
        buttonTitle={`Confirm - ${formatRM(seatTotal + foodTotal)}`}
        onConfirm={confirm}
      />
    </div>
  );
}

export default function FoodSelectionWrapper() {
  return (
    <Suspense fallback={<LoadingBlock rows={3} />}>
      <FoodSelectionPage />
    </Suspense>
  );
}
