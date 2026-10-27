"use client";

import { use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useApiData } from "@/hooks/useApiData";
import { GlassCard, LoadingBlock, EmptyState, PrimaryButton } from "@/components/portal/primitives";
import { Icon } from "@/components/ui/Icon";
import { ratingLabel } from "@/lib/cinema";
import ReviewList from "@/components/cinema/ReviewList";

// Cinema intro: location, halls, rating and comments (SSC CinemaIntroPage).
export default function CinemaIntroPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, error } = useApiData("/cinema/cinema/detail", { cinemaId: Number(id) });

  if (loading && !data) return <LoadingBlock rows={3} />;
  if (error) return <EmptyState icon="error" title="Cinema not found" description={error.message} />;
  if (!data) return null;
  const { cinema, halls, rating, reviews } = data;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-extrabold">Cinema Information</h1>
      <GlassCard className="overflow-hidden p-0">
        <div className="h-40 w-full bg-cover bg-center" style={{ backgroundImage: `url(${cinema.cinemaImage})` }} />
        <div className="flex flex-col gap-4 p-4 text-xs">
          <h2 className="text-base font-extrabold">{cinema.name}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="font-bold">Location</p><p className="text-on-surface-variant">{cinema.city}</p></div>
            <div><p className="font-bold">Rating</p><p className="flex items-center gap-1 text-on-surface-variant">{ratingLabel(rating)}{rating ? <Icon name="star" className="fill-1 text-[14px] text-amber-400" /> : null}</p></div>
            <div><p className="font-bold">Address</p><p className="text-on-surface-variant">{cinema.address}</p></div>
            <div><p className="font-bold">Contact No</p><p className="text-on-surface-variant">{cinema.contactNo}</p></div>
          </div>
          <div>
            <p className="mb-2 font-bold">Halls</p>
            <ul className="flex flex-wrap gap-2">
              {halls.map((hall) => (
                <li key={hall.hallId} className="rounded-full border border-white/10 px-3 py-1 text-[11px]">{hall.hallName} · {hall.experienceType}</li>
              ))}
            </ul>
          </div>
        </div>
      </GlassCard>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-extrabold">Cinema Location</h2>
        <iframe className="w-full rounded-2xl" style={{ aspectRatio: "1/1" }} src={cinema.locationLink} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-extrabold">Recent Comments</h2>
        <p className="text-xs text-on-surface-variant">Latest comment for the cinema &quot;{cinema.name}&quot;</p>
        <ReviewList reviews={reviews} />
      </section>

      <PrimaryButton className="w-full" onClick={() => router.push("/movies")}>See what is showing</PrimaryButton>
    </div>
  );
}
