"use client";

import { PrimaryButton } from "@/components/portal/primitives";

// Fixed bottom bar with the current selection and the step's confirm button (SSC ItemSelectedPane).
export default function SelectionBar({ title, summary, buttonTitle, onConfirm, disabled }) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 border-t border-white/10 bg-background/95 px-4 py-3 backdrop-blur-xl">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{title}</p>
        <p className="truncate text-sm font-bold text-primary">{summary}</p>
      </div>
      <PrimaryButton onClick={onConfirm} disabled={disabled} className="shrink-0">{buttonTitle}</PrimaryButton>
    </div>
  );
}
