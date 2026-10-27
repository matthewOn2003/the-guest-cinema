"use client";

import { timeLabel, dateLabel, splitDateTime } from "@/lib/cinema";
import { GlassCard } from "@/components/portal/primitives";

// Movie / cinema / time summary shown on every booking step (SSC MovieInfo bar).
export default function BookingHeader({ showtime }) {
  if (!showtime) return null;
  const { date } = splitDateTime(showtime.showDate);
  return (
    <GlassCard className="flex gap-3 p-3 text-xs">
      <div className="w-16 shrink-0 rounded-lg border border-white/10 bg-cover bg-center" style={{ aspectRatio: "2/3", backgroundImage: `url(${showtime.movie.posterImage})` }} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-extrabold">{showtime.movie.title}</p>
        <p className="truncate text-on-surface-variant">{showtime.movie.language} · {showtime.movie.duration} min · {showtime.hall.experienceType}</p>
        <p className="truncate text-on-surface-variant">{showtime.cinema.name} · {showtime.hall.hallName}</p>
        <p className="font-bold text-primary">{dateLabel(date)} · {timeLabel(showtime.showDate)}</p>
      </div>
    </GlassCard>
  );
}
