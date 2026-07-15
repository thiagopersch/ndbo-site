"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type CopyXmlButtonProps = {
  /** Retorna o texto a copiar — pode buscar de uma rota (lista) ou usar um preview já calculado (form). */
  getText: () => string | Promise<string>;
  label?: string;
};

/** Botão genérico "Copiar XML": copia direto pro clipboard sem precisar baixar o arquivo. */
export function CopyXmlButton({ getText, label = "Copiar XML" }: CopyXmlButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  async function handleClick() {
    setIsCopying(true);

    try {
      const text = await getText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("XML copiado para a área de transferência.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o XML.");
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isCopying}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label}
    </Button>
  );
}
