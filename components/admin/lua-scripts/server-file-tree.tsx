"use client";

import { useEffect, useState } from "react";
import { ChevronRight, File, Folder, FolderOpen, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";

export type ServerFileTreeEntry = {
  name: string;
  path: string;
  type: "file" | "directory";
};

type ServerFileTreeNodeProps = {
  entry: ServerFileTreeEntry;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
};

function ServerFileTreeNode({ entry, depth, selectedPath, onSelectFile }: ServerFileTreeNodeProps) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<ServerFileTreeEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const indent = { paddingLeft: `${depth * 14 + 8}px` };

  if (entry.type === "file") {
    const isSelected = selectedPath === entry.path;
    return (
      <button
        type="button"
        onClick={() => onSelectFile(entry.path)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-sm py-1 text-left text-sm hover:bg-accent",
          isSelected && "bg-accent font-medium",
        )}
        style={indent}
        title={entry.path}
      >
        <File className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{entry.name}</span>
      </button>
    );
  }

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && children === null && !isLoading) {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetcher<{ entries: ServerFileTreeEntry[] }>(
          `/api/admin/server-files/tree?path=${encodeURIComponent(entry.path)}`,
        );
        setChildren(data.entries);
      } catch {
        setError("Não foi possível carregar esta pasta.");
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-1.5 rounded-sm py-1 text-left text-sm hover:bg-accent"
        style={indent}
        title={entry.path}
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
        />
        {open ? (
          <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{entry.name}</span>
        {isLoading && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsiblePanel className="gap-0 pt-0">
        {error && (
          <p className="text-xs text-destructive" style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}>
            {error}
          </p>
        )}
        {children?.map((child) => (
          <ServerFileTreeNode
            key={child.path}
            entry={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
          />
        ))}
      </CollapsiblePanel>
    </Collapsible>
  );
}

type ServerFileTreeProps = {
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
};

/** Árvore de arquivos do servidor (raiz de `OTSERVER_ROOT_PATH`/`OTSERVER_DATA_PATH`, ver
 * `lib/server-files.ts`) com carregamento sob demanda — só busca os filhos de uma pasta quando
 * ela é expandida (a árvore inteira tem milhares de arquivos, boa parte deles irrelevante pra
 * esse propósito, ex. o editor de mapas `RME/`). */
export function ServerFileTree({ selectedPath, onSelectFile }: ServerFileTreeProps) {
  const [entries, setEntries] = useState<ServerFileTreeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetcher<{ entries: ServerFileTreeEntry[] }>("/api/admin/server-files/tree?path=")
      .then((data) => {
        if (!cancelled) setEntries(data.entries);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar a raiz do servidor.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="p-2 text-sm text-destructive">{error}</p>;
  if (entries === null) return <p className="p-2 text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="flex flex-col">
      {entries.map((entry) => (
        <ServerFileTreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
