"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EntitySearchCombobox } from "@/components/shared/entity-search-combobox";
import { UniverseBadge } from "@/components/shared/universe-badge";

type UniverseRow = { id: number; name: string; color: string | null };

/** Import de um ou mais arquivos XML de monstro de uma vez — diferente de Item/Movement
 * (um XML bundlando várias linhas), cada monstro é seu próprio arquivo
 * (`data/monster/*.xml`, um único `<monster>` por arquivo). */
export function MonsterXmlImportDialog({
  onImported,
}: {
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [universeId, setUniverseId] = useState<number | null>(null);
  const [subcategory, setSubcategory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    const files = fileInputRef.current?.files;

    if (!universeId) {
      toast.error("Selecione o universo.");
      return;
    }

    if (!subcategory.trim()) {
      toast.error("Informe a subcategoria/subpasta.");
      return;
    }

    if (!files || files.length === 0) {
      toast.error("Selecione ao menos um arquivo XML.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));
    formData.append("replaceExisting", String(replaceExisting));
    formData.append("universeId", String(universeId));
    formData.append("subcategory", subcategory.trim());

    const response = await fetch("/api/admin/monsters/import", {
      method: "POST",
      body: formData,
    });

    setIsSubmitting(false);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(data?.error ?? "Não foi possível importar os arquivos.");
      return;
    }

    toast.success(
      `${data.imported} monstro(s) importado(s)${data.skipped ? `, ${data.skipped} ignorado(s)` : ""}.`,
    );

    if (data.errors?.length) {
      console.warn("Monstros ignorados na importação:", data.errors);
    }

    setOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUniverseId(null);
    setSubcategory("");
    onImported();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload className="size-4" />
            Importar monstro (XML)
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar monstros</DialogTitle>
          <DialogDescription>
            Envie um ou mais arquivos no formato <code>data/monster/*.xml</code>{" "}
            do OTServer (um único <code>{"<monster>"}</code> por arquivo) —
            todos são importados de uma vez, com o universo e a
            subcategoria/subpasta informados abaixo aplicados a todos os
            monstros do lote.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Universo</Label>
            <EntitySearchCombobox<UniverseRow>
              endpoint="/api/admin/universes"
              value={universeId}
              placeholder="Buscar universo..."
              formatOption={(row) => row.name}
              renderOption={(row) => <UniverseBadge name={row.name} color={row.color} />}
              onSelect={(row) => setUniverseId(row?.id ?? null)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monster-import-subcategory">
              Subcategoria / subpasta
            </Label>
            <Input
              id="monster-import-subcategory"
              value={subcategory}
              onChange={(event) => setSubcategory(event.target.value)}
              placeholder='ex.: "1-50" ou "bosses"'
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monster-import-files">Arquivo(s) XML</Label>
            <Input
              id="monster-import-files"
              type="file"
              accept=".xml"
              multiple
              ref={fileInputRef}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="monster-import-replace"
              type="checkbox"
              className="size-4"
              checked={replaceExisting}
              onChange={(event) => setReplaceExisting(event.target.checked)}
            />
            <Label htmlFor="monster-import-replace" className="font-normal">
              Atualizar cadastro se já existir um monstro com esse nome
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleImport} disabled={isSubmitting}>
            {isSubmitting ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
