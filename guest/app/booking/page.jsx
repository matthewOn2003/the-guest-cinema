"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useApiData } from "@/hooks/useApiData";
import { GlassCard, LoadingBlock, EmptyState, FilterChips } from "@/components/portal/primitives";
import { dateLabel, timeLabel } from "@/lib/cinema";

// Step 1 (SSC MoviesPage + CinemaAndTime): movie -> date -> experience -> cinema & time.
function BookingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const movieParam = Number(params.get("movieId") ?? 0);
  const movies = useApiData("/cinema/movie/list", {});
  const [movieId, setMovieId] = useState(movieParam || 0);
  const [date, setDate] = useState("");
  const [experience, setExperience] = useState("");

  useEffect(() => {
    if (!movieId && movies.data?.length) setMovieId(movies.data[0].movieId);
  }, [movies.data, movieId]);

  const selectedMovie = useMemo(() => (movies.data ?? []).find((m) => m.movieId === movieId), [movies.data, movieId]);
  const dates = useApiData("/cinema/showtime/dates", { movieId }, { skip: !movieId });
  const experiences = useApiData("/cinema/showtime/experiences", { movieId, showDate: date }, { skip: !movieId || !date });
  const showtimes = useApiData(
    "/cinema/showtime/list",
    { movieId, showDate: date, experienceType: experience },
    { skip: !movieId || !date || !experience },
  );

  function pickMovie(id) {
    setMovieId(id);
    setDate("");
    setExperience("");
  }

  const byCinema = useMemo(() => {
    const groups = new Map();
    for (const showtime of showtimes.data ?? []) {
      if (!groups.has(showtime.cinema.cinemaId)) groups.set(showtime.cinema.cinemaId, { cinema: showtime.cinema, items: [] });
      groups.get(showtime.cinema.cinemaId).items.push(showtime);
    }
    return [...groups.values()];
  }, [showtimes.data]);

  if (movies.loading && !movies.data) return <LoadingBlock rows={3} />;
  if (!movies.data || movies.data.length === 0) return <EmptyState icon="movie" title="No movies to book" />;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-extrabold">Movies</h1>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {movies.data.map((movie) => (
            <button
              key={movie.movieId}
              type="button"
              onClick={() => pickMovie(movie.movieId)}
              className={`w-32 shrink-0 snap-start rounded-2xl text-left transition-all ${movie.movieId === movieId ? "scale-[1.02] ring-2 ring-primary" : "opacity-70"}`}
            >
              <div className="aspect-[2/3] w-full rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${movie.posterImage})` }} />
              <p className="mt-2 truncate text-xs font-bold">{movie.title}</p>
            </button>
          ))}
        </div>
        {selectedMovie ? <p className="text-xs text-on-surface-variant">{selectedMovie.genre} · {selectedMovie.duration} min · {selectedMovie.language}</p> : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-extrabold">- Select Date -</h2>
        {dates.loading && !dates.data ? <LoadingBlock rows={1} /> : null}
        {dates.data && dates.data.length === 0 ? <EmptyState icon="event_busy" title="No screenings for this movie" /> : null}
        <FilterChips
          items={(dates.data ?? []).map((d) => ({ key: d, label: dateLabel(d) }))}
          value={date}
          onChange={(d) => { setDate(d); setExperience(""); }}
        />
      </section>

      {date ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-extrabold">- Select Experience -</h2>
          <FilterChips
            items={(experiences.data ?? []).map((e) => ({ key: e, label: e }))}
            value={experience}
            onChange={setExperience}
          />
        </section>
      ) : null}

      {date && experience ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-extrabold">- Select Cinema -</h2>
          {showtimes.loading && !showtimes.data ? <LoadingBlock rows={2} /> : null}
          {byCinema.map((group) => (
            <GlassCard key={group.cinema.cinemaId} className="flex flex-col gap-3 p-4">
              <p className="text-sm font-bold">{group.cinema.name}</p>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((showtime) => (
                  <li key={showtime.showtimeId}>
                    <button
                      type="button"
                      onClick={() => router.push(`/booking/seats?showtimeId=${showtime.showtimeId}`)}
                      className="flex w-28 flex-col items-center gap-1 rounded-xl border border-primary/40 bg-primary/10 px-2 py-2 text-xs font-bold transition-colors hover:bg-primary/20"
                    >
                      <span>{timeLabel(showtime.showDate)}</span>
                      <span className="text-[10px] font-semibold text-on-surface-variant">{showtime.hall.hallName} · {showtime.hall.experienceType}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
          {showtimes.data && byCinema.length === 0 ? <EmptyState icon="event_busy" title="No screenings for this combination" /> : null}
        </section>
      ) : (
        <p className="py-6 text-center text-sm text-on-surface-variant">- Please Select Date &amp; Experience first -</p>
      )}
    </div>
  );
}

export default function BookingPageWrapper() {
  return (
    <Suspense fallback={<LoadingBlock rows={3} />}>
      <BookingPage />
    </Suspense>
  );
}
