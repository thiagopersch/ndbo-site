"use client";

import { ChevronDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";

type CollapsibleSectionCardProps = {
  title: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  /** Conteúdo extra no cabeçalho, fora do gatilho (ex.: um botão de ação da seção). */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
};

/** Card de seção de formulário que pode ser recolhida — usado nos CRUDs com muitas
 * seções (ex.: Item) para reduzir o quanto precisa rolar quando uma seção não é
 * relevante pro registro atual. */
export function CollapsibleSectionCard({
  title,
  defaultOpen = true,
  className,
  contentClassName,
  headerExtra,
  children,
}: CollapsibleSectionCardProps) {
  return (
    <Card className={className}>
      <Collapsible defaultOpen={defaultOpen}>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CollapsibleTrigger className="flex-1 justify-between">
            <CardTitle>{title}</CardTitle>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 data-panel-open:rotate-180" />
          </CollapsibleTrigger>
          {headerExtra}
        </CardHeader>
        <CollapsiblePanel>
          <CardContent className={contentClassName}>{children}</CardContent>
        </CollapsiblePanel>
      </Collapsible>
    </Card>
  );
}
