"use client";

import { Link } from "@/i18n/navigation";
import { useApiData } from "@/hooks/useApiData";
import AccountMenu from "@/components/shell/AccountMenu";
import { initialsOf } from "@/lib/cinema";

export default function PortalHeader() {
  const { data: user } = useApiData("/cinema/auth/session", {});

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-background/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-baseline gap-2">
          <span className="text-base font-extrabold tracking-tight text-on-surface">The Guest</span>
          <span className="text-xs font-semibold text-primary">座上宾</span>
        </Link>
        {user ? <AccountMenu name={user.fullName} initials={initialsOf(user.fullName)} /> : null}
      </div>
    </header>
  );
}
