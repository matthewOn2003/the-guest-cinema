"use client";

import { Icon } from "@/components/ui/Icon";
import { EmptyState, GlassCard } from "@/components/portal/primitives";

export default function ReviewList({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return <EmptyState icon="rate_review" title="No comments yet" />;
  }
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => (
        <li key={review.reviewId}>
          <GlassCard className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold">{review.userFullName}</span>
              <span className="text-on-surface-variant">{review.reviewDate.split(" ")[0]}</span>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: review.rating }).map((_, i) => (
                <Icon key={i} name="star" className="fill-1 text-[14px]" />
              ))}
            </div>
            <p className="text-xs leading-relaxed">{review.reviewText}</p>
            <p className="text-[11px] text-on-surface-variant">{review.targetTable === "movies" ? "Movie" : "Cinema"}: {review.targetName}</p>
          </GlassCard>
        </li>
      ))}
    </ul>
  );
}
