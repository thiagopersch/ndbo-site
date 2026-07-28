"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DuplicatedRecord = { id: number; name: string };

type DuplicateButtonProps = {
  /** Rota POST que cria a cópia, ex.: `/api/admin/vocations/${id}/duplicate`. */
  endpoint: string;
  /** Base da rota de edição do módulo, ex.: `/admin/vocations` (navega para `${editPathBase}/${id}`). */
  editPathBase: string;
  /**
   * "icon": botão compacto para a coluna de ações da listagem — duplica e permanece na lista.
   * "header": botão com rótulo para o cabeçalho do CRUD em edição — duplica e pergunta se o
   * usuário quer ir para o novo registro ou permanecer no atual.
   */
  variant?: "icon" | "header";
  /** Chamado após duplicar com sucesso, ex.: `mutate()` para atualizar a listagem. */
  onDuplicated?: (record: DuplicatedRecord) => void;
};

export function DuplicateButton({
  endpoint,
  editPathBase,
  variant = "icon",
  onDuplicated,
}: DuplicateButtonProps) {
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicated, setDuplicated] = useState<DuplicatedRecord | null>(null);

  async function handleDuplicate() {
    setIsDuplicating(true);
    const response = await fetch(endpoint, { method: "POST" });
    const body = await response.json().catch(() => null);
    setIsDuplicating(false);

    if (!response.ok) {
      toast.error(body?.error ?? "Não foi possível duplicar o registro.");
      return;
    }

    const record: DuplicatedRecord = body;
    toast.success(`Duplicado como "${record.name}".`);
    onDuplicated?.(record);

    if (variant === "header") {
      setDuplicated(record);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDuplicate}
          disabled={isDuplicating}
          title="Duplicar"
        >
          <CopyPlus className="size-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleDuplicate}
          disabled={isDuplicating}
        >
          <CopyPlus className="size-4" />
          Duplicar
        </Button>
      )}

      {variant === "header" ? (
        <AlertDialog
          open={duplicated != null}
          onOpenChange={(open) => {
            if (!open) setDuplicated(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Registro duplicado</AlertDialogTitle>
              <AlertDialogDescription>
                {duplicated
                  ? `Foi criado um novo registro ("${duplicated.name}"). Deseja ir para o novo registro duplicado ou permanecer editando o registro atual?`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDuplicated(null)}>
                Permanecer aqui
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (duplicated) router.push(`${editPathBase}/${duplicated.id}`);
                }}
              >
                Ir para o novo registro
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
