import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { auth, isAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user || !isAdmin(session.user.groupId)) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/20 md:flex">
        <div className="flex h-16 shrink-0 items-center border-b px-6 font-bold">
          Administração
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminSidebar />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:hidden">
          <AdminMobileNav />
          <span className="font-bold">Administração</span>
        </div>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
