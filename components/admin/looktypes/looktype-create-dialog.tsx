"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import type { Looktype } from "@/lib/generated/prisma/client";
import {
  DEFAULT_LOOKTYPE_FRAME_SPEED_MS,
  extractLooktypeNumberFromFileName,
  fileNameToLooktypeName,
  type LooktypeCategory,
} from "@/lib/validations/admin/looktype";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LooktypeCategoryFields } from "@/components/admin/looktypes/looktype-category-fields";

const MAX_FILES = 100;
/** Requisições simultâneas ao criar em lote — cada upload envolve parse/render de OBD no
 * servidor (CPU-bound), então um valor alto satura o processo Node em vez de acelerar. */
const UPLOAD_CONCURRENCY = 4;

type PendingFile = {
  file: File;
  name: string;
  looktypeNumber: number | null;
};

type LooktypeCreateDialogProps = {
  trigger: React.ReactNode;
  onCreated: (looktype: Looktype) => void;
};

export function LooktypeCreateDialog({ trigger, onCreated }: LooktypeCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<LooktypeCategory>("item");
  const [sharedLooktypeNumber, setSharedLooktypeNumber] = useState<number | null>(null);
  const [frameSpeedMs, setFrameSpeedMs] = useState(DEFAULT_LOOKTYPE_FRAME_SPEED_MS.item);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // O seletor nativo de arquivos do SO tira o foco da janela; sem essa trava o base-ui pode
  // interpretar isso como um clique/foco fora do dialog e fechá-lo antes do usuário escolher
  // os arquivos. Fica true enquanto o seletor está (provavelmente) aberto.
  const filePickerOpenRef = useRef(false);

  useEffect(() => {
    function handleWindowFocus() {
      // Adia um tick pro base-ui processar o foco relacionado ao seletor nativo antes de destravar.
      setTimeout(() => {
        filePickerOpenRef.current = false;
      }, 0);
    }
    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, []);

  function reset() {
    setCategory("item");
    setSharedLooktypeNumber(null);
    setFrameSpeedMs(DEFAULT_LOOKTYPE_FRAME_SPEED_MS.item);
    setPendingFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleCategoryChange(next: LooktypeCategory) {
    setCategory(next);
    setFrameSpeedMs(DEFAULT_LOOKTYPE_FRAME_SPEED_MS[next]);
  }

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (files.length > MAX_FILES) {
      toast.error(`Selecione no máximo ${MAX_FILES} arquivos por vez.`);
      return;
    }

    setPendingFiles(
      files.map((file) => ({
        file,
        name: fileNameToLooktypeName(file.name),
        // Padrão `nome_NUMERO_860v2[...].ext` dos lotes exportados do Object Builder — quando o
        // arquivo não segue esse padrão, cai pro número compartilhado (se o admin já tiver
        // digitado um) ou fica em branco, exigindo preenchimento manual antes de enviar.
        looktypeNumber: extractLooktypeNumberFromFileName(file.name) ?? sharedLooktypeNumber,
      })),
    );
  }

  function updatePendingFile(index: number, patch: Partial<PendingFile>) {
    setPendingFiles((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removePendingFile(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (pendingFiles.length === 0) {
      toast.error("Selecione ao menos um arquivo (.obd, PNG ou GIF).");
      return;
    }
    if (pendingFiles.some((row) => !row.name.trim())) {
      toast.error("Informe um nome para todos os arquivos.");
      return;
    }
    if (category !== "item" && pendingFiles.some((row) => row.looktypeNumber === null)) {
      toast.error("Informe o número da sprite no Object Builder para todos os arquivos.");
      return;
    }

    // Detecta nome/número repetido dentro do próprio lote antes de subir qualquer coisa — evita
    // condição de corrida entre uploads concorrentes disputando o mesmo nome/número (o servidor
    // ainda faz a checagem definitiva contra o que já existe no banco, ver
    // `POST /api/admin/looktypes`). Mantém a primeira ocorrência de cada nome/número, marca as
    // seguintes como duplicata.
    const seenNames = new Map<string, PendingFile>();
    const seenNumbers = new Map<string, PendingFile>();
    const toUpload: PendingFile[] = [];
    const clientDuplicates: {
      fileName: string;
      name: string;
      looktypeNumber: number | null;
      category: string;
      reason: string;
    }[] = [];

    for (const row of pendingFiles) {
      const nameKey = row.name.trim().toLowerCase();
      const numberKey = row.looktypeNumber !== null ? String(row.looktypeNumber) : null;
      const duplicateOfName = seenNames.get(nameKey);
      const duplicateOfNumber = numberKey ? seenNumbers.get(numberKey) : undefined;

      if (duplicateOfName || duplicateOfNumber) {
        const conflictFile = (duplicateOfName ?? duplicateOfNumber)!.file.name;
        clientDuplicates.push({
          fileName: row.file.name,
          name: row.name,
          looktypeNumber: row.looktypeNumber,
          category,
          reason: duplicateOfName
            ? `Nome duplicado no mesmo lote (mesmo nome que "${conflictFile}").`
            : `Número duplicado no mesmo lote (mesmo número que "${conflictFile}").`,
        });
        continue;
      }

      seenNames.set(nameKey, row);
      if (numberKey) seenNumbers.set(numberKey, row);
      toUpload.push(row);
    }

    setIsSubmitting(true);
    setProgress({ done: 0, total: toUpload.length });

    const batchId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;

    if (clientDuplicates.length > 0) {
      await fetch("/api/admin/looktypes/import-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, entries: clientDuplicates }),
      }).catch(() => null);
    }

    let createdCount = 0;
    let duplicateCount = clientDuplicates.length;
    let firstError: string | null = null;

    async function uploadRow(row: PendingFile) {
      const formData = new FormData();
      formData.append("file", row.file);
      formData.append("fileName", row.file.name);
      formData.append("name", row.name.trim());
      formData.append("category", category);
      formData.append("frameSpeedMs", String(frameSpeedMs));
      formData.append("batchId", batchId);
      if (row.looktypeNumber !== null) formData.append("looktypeNumber", String(row.looktypeNumber));

      const response = await fetch("/api/admin/looktypes", { method: "POST", body: formData });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.skipped) {
          duplicateCount += 1;
        }
        if (!firstError) {
          firstError = data?.error ?? `Não foi possível criar "${row.name}".`;
        }
      } else {
        const data = await response.json();
        onCreated(data.looktype);
        createdCount += 1;
      }

      setProgress((current) => (current ? { ...current, done: current.done + 1 } : current));
    }

    // Sobe em lotes com concorrência limitada: paraleliza a rede sem estourar o processo do
    // servidor, que faz parse/render de OBD (CPU-bound) por requisição.
    let cursor = 0;
    async function worker() {
      while (cursor < toUpload.length) {
        const row = toUpload[cursor];
        cursor += 1;
        await uploadRow(row);
      }
    }
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, toUpload.length) }, worker));

    setIsSubmitting(false);
    setProgress(null);

    if (createdCount > 0) toast.success(`${createdCount} looktype(s) criada(s) com sucesso.`);
    if (duplicateCount > 0) {
      toast.error(
        `${duplicateCount} arquivo(s) ignorado(s) por nome/número duplicado — veja os detalhes em Auditoria.`,
      );
    }
    if (firstError && duplicateCount === 0) toast.error(firstError);

    if (firstError === null) {
      reset();
      setOpen(false);
    }
  }

  const showReview = pendingFiles.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Bloqueia fechamento enquanto o seletor nativo de arquivos está aberto (ver
        // `filePickerOpenRef`) ou enquanto o lote está sendo enviado — nesses casos um
        // clique fora/perda de foco é provavelmente espúrio, não uma intenção de fechar.
        if (!next && (filePickerOpenRef.current || isSubmitting)) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className={showReview ? "sm:max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>Nova sprite / looktype</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Arquivos (.obd, PNG ou GIF — até {MAX_FILES} por vez)</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                filePickerOpenRef.current = true;
                inputRef.current?.click();
              }}
            >
              {pendingFiles.length > 0
                ? `${pendingFiles.length} arquivo(s) selecionado(s)`
                : "Selecionar arquivos..."}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".obd,image/png,image/gif"
              multiple
              className="absolute h-px w-px opacity-0"
              onChange={handleFilesSelected}
            />
            <p className="text-xs text-muted-foreground">
              `.obd` do Object Builder vira animação; PNG/GIF ficam estáticos.
            </p>
          </div>

          <LooktypeCategoryFields
            category={category}
            onCategoryChange={handleCategoryChange}
            looktypeNumber={sharedLooktypeNumber}
            onLooktypeNumberChange={setSharedLooktypeNumber}
          />

          <div className="flex flex-col gap-1.5">
            <Label>Velocidade dos quadros (ms) — só afeta arquivos .obd animados</Label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={frameSpeedMs}
              onChange={(event) => setFrameSpeedMs(Number(event.target.value))}
              className="w-32"
            />
          </div>

          {showReview && (
            <div className="flex flex-col gap-2">
              <Label>Revisar antes de salvar</Label>
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-md border border-border p-2">
                {pendingFiles.map((row, index) => (
                  <div key={`${row.file.name}-${index}`} className="flex items-center gap-2">
                    <span className="w-40 shrink-0 truncate text-xs text-muted-foreground" title={row.file.name}>
                      {row.file.name}
                    </span>
                    <Input
                      value={row.name}
                      onChange={(event) => updatePendingFile(index, { name: event.target.value })}
                      placeholder="Nome"
                      className="flex-1"
                    />
                    {category !== "item" && (
                      <Input
                        type="number"
                        value={row.looktypeNumber ?? ""}
                        onChange={(event) =>
                          updatePendingFile(index, {
                            looktypeNumber: event.target.value === "" ? null : Number(event.target.value),
                          })
                        }
                        placeholder="Número"
                        className="w-24 shrink-0"
                      />
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => removePendingFile(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || pendingFiles.length === 0}>
              {isSubmitting
                ? progress
                  ? `Criando... (${progress.done}/${progress.total})`
                  : "Criando..."
                : `Criar${pendingFiles.length > 1 ? ` (${pendingFiles.length})` : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
