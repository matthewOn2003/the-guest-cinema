"use client";

import { Link } from "@/i18n/navigation";
import { useApiData } from "@/hooks/useApiData";
import { LoadingBlock, EmptyState, PrimaryButton, GhostButton, GlassCard } from "@/components/portal/primitives";
import { useRouter } from "@/i18n/navigation";

// Movie list: each poster offers "View More" (movie intro) and "Buy Now" (booking, as on SSC).
export default function MoviesPage() {
  const { data, loading, error } = useApiData("/cinema/movie/list", {});
  const router = useRouter();

  if (loading && !data) return <LoadingBlock rows={3} />;
  if (error) return <EmptyState icon="error" title="Could not load movies" description={error.message} />;
  if (!data || data.length === 0) return <EmptyState icon="movie" title="No movies yet" />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold">Movies</h1>
      <ul className="grid grid-cols-2 gap-3">
        {data.map((movie) => (
          <li key={movie.movieId}>
            <GlassCard className="flex h-full flex-col gap-3 p-3">
              <div
                className="aspect-[2/3] w-full rounded-xl border border-white/10 bg-surface-container-high bg-cover bg-center"
                style={{ backgroundImage: `url(${movie.posterImage})` }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{movie.title}</p>
                <p className="truncate text-[11px] text-on-surface-variant">{movie.genre} · {movie.duration} min</p>
                <p className="truncate text-[11px] text-on-surface-variant">{movie.language} · {movie.subtitle}</p>
              </div>
              <div className="mt-auto flex flex-col gap-2">
                <GhostButton className="w-full" onClick={() => router.push(`/movies/${movie.movieId}`)}>View More</GhostButton>
                <PrimaryButton className="w-full" onClick={() => router.push(`/booking?movieId=${movie.movieId}`)}>Buy Now</PrimaryButton>
              </div>
            </GlassCard>
          </li>
        ))}
      </ul>
      <Link href="/cinemas" className="text-center text-xs font-bold text-primary">Find a cinema near you</Link>
    </div>
  );
}
