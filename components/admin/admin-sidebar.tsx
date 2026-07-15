"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bug,
  Coins,
  Ghost,
  Gift,
  LayoutDashboard,
  Layers,
  Newspaper,
  ScrollText,
  Shapes,
  ShieldBan,
  Sparkles,
  SquareStack,
  FolderTree,
  Ticket,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AdminLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type AdminSection = {
  title: string;
  links: AdminLink[];
};

const dashboardLink: AdminLink = { label: "Dashboard", href: "/admin", icon: LayoutDashboard };

const adminSections: AdminSection[] = [
  {
    title: "Contas e jogadores",
    links: [
      { label: "Contas", href: "/admin/accounts", icon: Users },
      { label: "Jogadores", href: "/admin/players", icon: BadgeCheck },
      { label: "Banimentos", href: "/admin/bans", icon: ShieldBan },
    ],
  },
  {
    title: "Vocações",
    links: [
      { label: "Vocações", href: "/admin/vocations", icon: Sparkles },
      { label: "Classes de vocação", href: "/admin/vocation-classes", icon: Layers },
      { label: "Universos de vocação", href: "/admin/vocation-universes", icon: SquareStack },
    ],
  },
  {
    title: "Editor de mapa",
    links: [
      { label: "Tilesets", href: "/admin/tilesets", icon: FolderTree },
      { label: "Doodads", href: "/admin/doodads", icon: Shapes },
      { label: "Walls", href: "/admin/walls", icon: Shapes },
      { label: "Borders", href: "/admin/borders", icon: Shapes },
      { label: "Grounds", href: "/admin/grounds", icon: Shapes },
    ],
  },
  {
    title: "Bestiário",
    links: [
      { label: "Monstros", href: "/admin/monsters", icon: Bug },
      { label: "Monstros impulsionados", href: "/admin/monster-boost", icon: Ghost },
    ],
  },
  {
    title: "Feitiços",
    links: [{ label: "Spells", href: "/admin/spells", icon: Wand2 }],
  },
  {
    title: "Economia",
    links: [
      { label: "Loteria", href: "/admin/lottery", icon: Coins },
      { label: "Recompensas diárias", href: "/admin/daily-rewards", icon: Gift },
    ],
  },
  {
    title: "Conteúdo",
    links: [{ label: "Posts", href: "/admin/posts", icon: Newspaper }],
  },
  {
    title: "Suporte",
    links: [{ label: "Tickets", href: "/admin/tickets", icon: Ticket }],
  },
  {
    title: "Sistema",
    links: [{ label: "Auditoria", href: "/admin/audit-logs", icon: ScrollText }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavLink({
  link,
  active,
  onNavigate,
}: {
  link: AdminLink;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{link.label}</span>
    </Link>
  );
}

export function AdminSidebar({
  className,
  onNavigate,
}: {
  className?: string;
  /** Chamado ao clicar em um link — usado para fechar o drawer mobile. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-4 p-4", className)}>
      <AdminNavLink
        link={dashboardLink}
        active={isActive(pathname, dashboardLink.href)}
        onNavigate={onNavigate}
      />

      {adminSections.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {section.title}
          </p>
          {section.links.map((link) => (
            <AdminNavLink
              key={link.href}
              link={link}
              active={isActive(pathname, link.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}
