"use client";

import { usePathname } from "@/i18n/navigation";
import PortalHeader from "./shell/PortalHeader";
import BottomNav from "./shell/BottomNav";
import { activeTabFor } from "@/config/menu";

// Pages that render without the app chrome (sign-in and sign-up).
const BARE_PAGES = new Set(["/", "/register"]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_PAGES.has(pathname)) return <>{children}</>;

  const tab = activeTabFor(pathname);
  return (
    <div className="min-h-screen bg-background font-sans text-on-surface antialiased selection:bg-primary-container selection:text-white">
      <PortalHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg px-4 pb-32 pt-20">
        {/* Keyed by path so every navigation replays the page entrance. */}
        <div key={pathname} className="animate-fade-up">
          {children}
        </div>
      </main>
      <BottomNav activeKey={tab.key} />
    </div>
  );
}
