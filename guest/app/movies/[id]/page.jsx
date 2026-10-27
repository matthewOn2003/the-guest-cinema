"use client";

import { use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useApiData } from "@/hooks/useApiData";
import { GlassCard, LoadingBlock, EmptyState, PrimaryButton, GhostButton } from "@/components/portal/primitives";
import { Icon } from "@/components/ui/Icon";
import { ratingLabel, youtubeEmbed } from "@/lib/cinema";
import ReviewList from "@/components/cinema/ReviewList";

// Movie intro: details, trailer and recent reviews (SSC MovieIntroPage).
export default function MovieIntroPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, error } = useApiData("/cinema/movie/detail", { movieId: Number(id) });

  if (loading && !data) return <LoadingBlock rows={3} />;
  if (error) return <EmptyState icon="error" title="Movie not found" description={error.message} />;
  if (!data) return null;
  const { movie, rating, reviews } = data;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-extrabold">Movie Information</h1>
      <GlassCard className="flex gap-4 p-4">
        <div className="w-32 shrink-0 rounded-xl border border-white/10 bg-cover bg-center" style={{ aspectRatio: "2/3", backgroundImage: `url(${movie.posterImage})` }} />
        <dl className="flex min-w-0 flex-col gap-1.5 text-xs">
          <div><dt className="inline text-on-surface-variant">Title: </dt><dd className="inline font-bold">{movie.title}</dd></div>
          <div><dt className="inline text-on-surface-variant">Genre: </dt><dd className="inline font-bold">{movie.genre}</dd></div>
          <div><dt className="inline text-on-surface-variant">Duration: </dt><dd className="inline font-bold">{movie.duration} min</dd></div>
          <div><dt className="inline text-on-surface-variant">Language: </dt><dd className="inline font-bold">{movie.language}</dd></div>
          <div><dt className="inline text-on-surface-variant">Subtitle: </dt><dd className="inline font-bold">{movie.subtitle}</dd></div>
          <div><dt className="inline text-on-surface-variant">Director: </dt><dd className="inline font-bold">{movie.director}</dd></div>
          <div className="flex items-center gap-1">
            <dt className="text-on-surface-variant">Movie Rate: </dt>
            <dd className="font-bold">{ratingLabel(rating)}</dd>
            {rating ? <Icon name="star" className="fill-1 text-[16px] text-amber-400" /> : null}
          </div>
        </dl>
      </GlassCard>

      <GlassCard className="flex flex-col gap-2 p-4">
        <h2 className="text-sm font-extrabold">Synopsis</h2>
        <p className="text-xs leading-relaxed text-on-surface-variant">{movie.synopsis}</p>
      </GlassCard>

      <PrimaryButton className="w-full" onClick={() => router.push(`/booking?movieId=${movie.movieId}`)}>Buy Now</PrimaryButton>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-extrabold">Movie Trailer</h2>
        {movie.trailerLink ? (
          <iframe
            className="w-full rounded-2xl"
            style={{ aspectRatio: "16/9" }}
            src={youtubeEmbed(movie.trailerLink)}
            title="Trailer"
            allowFullScreen
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-extrabold">Recent Comments</h2>
        <p className="text-xs text-on-surface-variant">Latest comments for the movie &quot;{movie.title}&quot;</p>
        <ReviewList reviews={reviews} />
      </section>

      <GhostButton className="w-full" onClick={() => router.push("/movies")}>Back to movies</GhostButton>
    </div>
  );
}
