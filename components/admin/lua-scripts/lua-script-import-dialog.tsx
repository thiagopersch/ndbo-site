"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import {
  LUA_SCRIPT_CATEGORIES,
  type LuaScriptCategory,
} from "@/lib/validations/admin/lua-script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Import de um ou mais arquivos `.lua` — a categoria (pasta de scripts) é obrigatória e
 * se aplica a todos os arquivos selecionados no lote. */
export function LuaScriptImportDialog({
  onImported,
}: {
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<LuaScriptCategory | "">("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    const files = fileInputRef.current?.files;

    if (!category) {
      toast.error("Selecione a categoria (pasta de scripts).");
      return;
    }

    if (!files || files.length === 0) {
      toast.error("Selecione ao menos um arquivo .lua.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));
    formData.append("category", category);
    formData.append("replaceExisting", String(replaceExisting));

    const response = await fetch("/api/admin/lua-scripts/import", {
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
      `${data.imported} script(s) importado(s)${data.skipped ? `, ${data.skipped} ignorado(s)` : ""}.`,
    );

    if (data.errors?.length) {
      console.warn("Scripts ignorados na importação:", data.errors);
    }

    setOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImported();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload className="size-4" />
            Importar .lua
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar scripts Lua</DialogTitle>
          <DialogDescription>
            Selecione um ou mais arquivos <code>.lua</code>. A categoria é
            obrigatória e se aplica a todos os arquivos deste lote — reflete a
            pasta de scripts real do OTServer
            (data/&#123;categoria&#125;/scripts).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Categoria (obrigatório)</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as LuaScriptCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {LUA_SCRIPT_CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lua-import-files">Arquivo(s) .lua</Label>
            <Input
              id="lua-import-files"
              type="file"
              accept=".lua"
              multiple
              ref={fileInputRef}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="lua-import-replace"
              type="checkbox"
              className="size-4"
              checked={replaceExisting}
              onChange={(event) => setReplaceExisting(event.target.checked)}
            />
            <Label htmlFor="lua-import-replace" className="font-normal">
              Substituir scripts existentes com o mesmo nome de arquivo
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
