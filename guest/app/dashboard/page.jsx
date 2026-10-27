"use client";

import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/ui/Icon";
import { useApiData } from "@/hooks/useApiData";
import { GlassCard, LoadingBlock, EmptyState, PrimaryButton, GhostButton } from "@/components/portal/primitives";

// Home: what is showing now, and where to watch.
export default function DashboardPage() {
  const movies = useApiData("/cinema/movie/list", {});
  const cinemas = useApiData("/cinema/cinema/list", {});

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="flex flex-col gap-3 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Welcome, our guest</p>
        <h1 className="text-xl font-extrabold tracking-tight">Every screening, served with care.</h1>
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Choose a film, pick your seats, and we will take care of the rest.
        </p>
        <div className="flex gap-2">
          <Link href="/movies" className="flex-1"><PrimaryButton className="w-full">Book a movie</PrimaryButton></Link>
          <Link href="/cinemas" className="flex-1"><GhostButton className="w-full">Our cinemas</GhostButton></Link>
        </div>
      </GlassCard>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">Now showing</h2>
          <Link href="/movies" className="text-xs font-bold text-primary">See all</Link>
        </div>
        {movies.loading && !movies.data ? <LoadingBlock rows={2} /> : null}
        {movies.data && movies.data.length === 0 ? <EmptyState icon="movie" title="No films showing yet" /> : null}
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {(movies.data ?? []).map((movie) => (
            <Link key={movie.movieId} href={`/movies/${movie.movieId}`} className="w-36 shrink-0 snap-start">
              <div
                className="aspect-[2/3] w-full rounded-2xl border border-white/10 bg-surface-container-high bg-cover bg-center"
                style={{ backgroundImage: `url(${movie.posterImage})` }}
              />
              <p className="mt-2 truncate text-xs font-bold">{movie.title}</p>
              <p className="truncate text-[10px] text-on-surface-variant">{movie.genre} · {movie.duration} min</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-extrabold">Cinemas</h2>
        {cinemas.loading && !cinemas.data ? <LoadingBlock rows={2} /> : null}
        <ul className="flex flex-col gap-2">
          {(cinemas.data ?? []).slice(0, 4).map((cinema) => (
            <li key={cinema.cinemaId}>
              <Link href={`/cinemas/${cinema.cinemaId}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface-container-high/60 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold">{cinema.name}</span>
                  <span className="text-xs text-on-surface-variant">{cinema.city}</span>
                </span>
                <Icon name="chevron_right" className="text-on-surface-variant" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

