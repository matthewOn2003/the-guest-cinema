"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { GlassCard, PrimaryButton, GhostButton } from "@/components/portal/primitives";
import { apiRequest } from "@/utils/apiRequest";
import { formatRM } from "@/lib/cinema";

// Step 5 (SSC TngPage): mock e-wallet confirmation. Confirming places the order, creates the ticket,
// and books the seats in one request.
export default function TngPage() {
  const router = useRouter();
  const [pending, setPending] = useState(undefined); // undefined = not read yet
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("pendingOrder");
    setPending(raw ? JSON.parse(raw) : null);
  }, []);

  useEffect(() => {
    if (pending === null) router.replace("/movies");
  }, [pending, router]);

  async function confirmPayment() {
    setBusy(true);
    setError("");
    try {
      await apiRequest("/cinema/order/create", {
        showtimeId: pending.showtimeId,
        seatIds: pending.seatIds,
        foods: pending.foods,
      });
      sessionStorage.removeItem("pendingOrder");
      window.alert("Successful!!");
      router.push("/profile?tab=tickets");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function cancelPayment() {
    sessionStorage.removeItem("pendingOrder");
    router.push("/movies");
  }

  if (!pending) return null;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <h1 className="text-center text-xl font-extrabold">The Guest · 座上宾</h1>
      <GlassCard className="flex w-full flex-col items-center gap-4 p-6">
        <div className="grid h-48 w-48 place-items-center rounded-3xl bg-gradient-to-br from-sky-500 to-blue-700 text-center text-white shadow-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Touch &apos;n Go</p>
            <p className="mt-1 text-lg font-extrabold">eWallet</p>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant">Mock payment: confirm below to complete the purchase.</p>
      </GlassCard>
      {error ? <p role="alert" className="w-full rounded-xl border border-rose-500/25 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{error}</p> : null}
      <div className="flex w-full gap-3">
        <GhostButton className="flex-1" onClick={cancelPayment}>Cancel</GhostButton>
        <PrimaryButton className="flex-1" onClick={confirmPayment} disabled={busy}>{busy ? "Processing..." : "Confirm Payment"}</PrimaryButton>
      </div>
      <p className="text-[11px] text-on-surface-variant">{pending.seatIds.length} seat(s){pending.foods.length ? ` · ${pending.foods.reduce((n, f) => n + f.quantity, 0)} food item(s)` : ""}</p>
    </div>
  );
}
