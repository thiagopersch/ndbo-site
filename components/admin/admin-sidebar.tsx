"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Bug,
  ChevronDown,
  Coins,
  Crown,
  Footprints,
  FolderTree,
  Ghost,
  Gift,
  Home,
  LayoutDashboard,
  Layers,
  ListChecks,
  Map,
  MessageSquare,
  Newspaper,
  Package,
  PackageOpen,
  ScrollText,
  Settings,
  Shapes,
  ShieldBan,
  Sparkles,
  SquareStack,
  Terminal,
  Ticket,
  Trash2,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type AdminLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type AdminSection = {
  title: string;
  /** Ícone representativo do grupo — mostrado no modo recolhido (trilho de ícones). */
  icon: LucideIcon;
  links: AdminLink[];
};

const dashboardLink: AdminLink = {
  label: "Dashboard",
  href: "/admin",
  icon: LayoutDashboard,
};

const backToSiteLink: AdminLink = {
  label: "Voltar ao site",
  href: "/",
  icon: Home,
};

const adminSections: AdminSection[] = [
  {
    title: "Contas e jogadores",
    icon: Users,
    links: [
      { label: "Contas", href: "/admin/accounts", icon: Users },
      { label: "Jogadores", href: "/admin/players", icon: BadgeCheck },
      { label: "Banimentos", href: "/admin/bans", icon: ShieldBan },
      { label: "Guilds", href: "/admin/guilds", icon: Crown },
      { label: "Houses", href: "/admin/houses", icon: Building2 },
    ],
  },
  {
    title: "Vocações",
    icon: Sparkles,
    links: [
      { label: "Vocações", href: "/admin/vocations", icon: Sparkles },
      {
        label: "Arquétipos de vocação",
        href: "/admin/vocation-archetypes",
        icon: Layers,
      },
    ],
  },
  {
    title: "Editor de mapa",
    icon: Map,
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
    icon: Bug,
    links: [
      { label: "Monstros", href: "/admin/monsters", icon: Bug },
      {
        label: "Monstros impulsionados",
        href: "/admin/monster-boost",
        icon: Ghost,
      },
      { label: "NPCs", href: "/admin/npcs", icon: MessageSquare },
    ],
  },
  {
    title: "Itens",
    icon: Package,
    links: [
      { label: "Items", href: "/admin/items", icon: Package },
      { label: "Movements", href: "/admin/movements", icon: Footprints },
      { label: "Scripts Lua", href: "/admin/lua-scripts", icon: Terminal },
      { label: "Looktypes", href: "/admin/looktypes", icon: Shapes },
    ],
  },
  {
    title: "Feitiços",
    icon: Wand2,
    links: [{ label: "Spells", href: "/admin/spells", icon: Wand2 }],
  },
  {
    title: "Economia",
    icon: Coins,
    links: [
      { label: "Loteria", href: "/admin/lottery", icon: Coins },
      {
        label: "Recompensas diárias",
        href: "/admin/daily-rewards",
        icon: Gift,
      },
      { label: "Doações", href: "/admin/donations", icon: Coins },
      { label: "Quests", href: "/admin/quests", icon: ScrollText },
      { label: "Tasks", href: "/admin/tasks", icon: ListChecks },
      { label: "Categorias", href: "/admin/categories", icon: FolderTree },
    ],
  },
  {
    title: "Sistemas",
    icon: PackageOpen,
    links: [
      { label: "Autoloot", href: "/admin/autoloot-items", icon: Trash2 },
      { label: "Battle Pass", href: "/admin/battle-pass", icon: Crown },
      { label: "Baús", href: "/admin/chests", icon: PackageOpen },
    ],
  },
  {
    title: "Conteúdo",
    icon: Newspaper,
    links: [{ label: "Posts", href: "/admin/posts", icon: Newspaper }],
  },
  {
    title: "Suporte",
    icon: Ticket,
    links: [{ label: "Tickets", href: "/admin/tickets", icon: Ticket }],
  },
  {
    title: "Sistema",
    icon: ScrollText,
    links: [
      { label: "Auditoria", href: "/admin/audit-logs", icon: ScrollText },
      { label: "Configurações", href: "/admin/settings", icon: Settings },
      { label: "Universos", href: "/admin/universes", icon: SquareStack },
      { label: "Towns", href: "/admin/towns", icon: Map },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavLink({
  link,
  active,
  collapsed,
  onNavigate,
}: {
  link: AdminLink;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = link.icon;

  const linkEl = (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{link.label}</span>}
    </Link>
  );

  if (!collapsed) return linkEl;

  return (
    <Tooltip>
      <TooltipTrigger render={linkEl} />
      <TooltipContent side="right">{link.label}</TooltipContent>
    </Tooltip>
  );
}

/** Ícone do grupo no modo recolhido — clicar abre um popover com os links da seção. */
function AdminNavGroupPopover({
  section,
  pathname,
  open,
  onOpenChange,
  onNavigate,
}: {
  section: AdminSection;
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
}) {
  const Icon = section.icon;
  const hasActiveLink = section.links.some((link) => isActive(pathname, link.href));

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className={cn(
          "flex items-center justify-center rounded-md p-2 transition-colors",
          hasActiveLink
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        title={section.title}
        aria-label={section.title}
      >
        <Icon className="size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent>
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {section.title}
        </p>
        <div className="flex flex-col gap-0.5">
          {section.links.map((link) => (
            <AdminNavLink
              key={link.href}
              link={link}
              active={isActive(pathname, link.href)}
              onNavigate={() => {
                onOpenChange(false);
                onNavigate?.();
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Grupo de links com cabeçalho colapsável — modo "sanfona": só uma seção fica aberta
 * por vez (abrir outra fecha as demais, mesmo a que contém a rota ativa). */
function AdminNavSection({
  section,
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  section: AdminSection;
  pathname: string;
  open: boolean;
  onToggle: (title: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={() => onToggle(section.title)}>
      <CollapsibleTrigger className="w-full justify-between rounded-md px-3 py-1.5 hover:bg-muted">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {section.title}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200 data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsiblePanel className="flex flex-col gap-1 pt-1">
        {section.links.map((link) => (
          <AdminNavLink
            key={link.href}
            link={link}
            active={isActive(pathname, link.href)}
            onNavigate={onNavigate}
          />
        ))}
      </CollapsiblePanel>
    </Collapsible>
  );
}

export function AdminSidebar({
  className,
  collapsed = false,
  onNavigate,
}: {
  className?: string;
  /** Modo "trilho de ícones" (sidebar recolhida) — sem agrupamentos, só ícones + tooltip. */
  collapsed?: boolean;
  /** Chamado ao clicar em um link — usado para fechar o drawer mobile. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  // Popover de grupo aberto no modo recolhido (só um por vez).
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  // Estado inicial: só a seção que contém a rota ativa começa aberta (as demais, fechadas).
  const [openSection, setOpenSection] = useState<string | null>(() => {
    const active = adminSections.find((section) =>
      section.links.some((link) => isActive(pathname, link.href)),
    );
    return active?.title ?? null;
  });

  // Sanfona: abrir uma seção fecha qualquer outra que estivesse aberta (inclusive a
  // que contém a rota ativa, se o usuário escolher fechá-la).
  function toggleSection(title: string) {
    setOpenSection((prev) => (prev === title ? null : title));
  }

  if (collapsed) {
    return (
      <TooltipProvider>
        <nav className={cn("flex flex-col items-center gap-1 p-2", className)}>
          <AdminNavLink
            link={dashboardLink}
            active={isActive(pathname, dashboardLink.href)}
            collapsed
            onNavigate={onNavigate}
          />
          <div className="my-1 h-px w-6 bg-border" />
          {adminSections.map((section) => (
            <AdminNavGroupPopover
              key={section.title}
              section={section}
              pathname={pathname}
              open={openPopover === section.title}
              onOpenChange={(open) => setOpenPopover(open ? section.title : null)}
              onNavigate={onNavigate}
            />
          ))}
          <div className="my-1 h-px w-6 bg-border" />
          <AdminNavLink link={backToSiteLink} active={false} collapsed onNavigate={onNavigate} />
        </nav>
      </TooltipProvider>
    );
  }

  return (
    <nav className={cn("flex flex-col gap-3 p-4", className)}>
      <AdminNavLink
        link={dashboardLink}
        active={isActive(pathname, dashboardLink.href)}
        onNavigate={onNavigate}
      />

      {adminSections.map((section) => (
        <AdminNavSection
          key={section.title}
          section={section}
          pathname={pathname}
          open={openSection === section.title}
          onToggle={toggleSection}
          onNavigate={onNavigate}
        />
      ))}

      <div className="my-1 border-t border-border pt-2">
        <AdminNavLink link={backToSiteLink} active={false} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}
