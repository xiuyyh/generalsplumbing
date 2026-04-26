'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@/firebase";
import { usePathname } from "next/navigation";

/**
 * @fileOverview A persistent header component that provides the sidebar toggle.
 * It only renders when the user is authenticated and not on the auth page.
 */
export function NavHeader() {
  const { user } = useUser();
  const pathname = usePathname();

  // Hide header on auth page or if not logged in
  if (!user || pathname === "/auth") return null;

  return (
    <header className="flex h-12 items-center border-b-4 border-black px-3 bg-white shrink-0 sticky top-0 z-30">
      <SidebarTrigger className="-ml-1 mr-3 border-4 border-black rounded-none h-8 w-8 bg-white hover:bg-black hover:text-white transition-colors" />
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-black" />
        <h1 className="text-lg font-black uppercase tracking-tighter">System Terminal</h1>
      </div>
    </header>
  );
}
