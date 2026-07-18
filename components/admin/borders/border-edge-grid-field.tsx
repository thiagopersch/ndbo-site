"use client";

import type { Control, FieldPath } from "react-hook-form";

import { BORDER_EDGES, type BorderFormInput } from "@/lib/validations/admin/border";
import { ItemIdField } from "@/components/shared/item-id-field";

type BorderEdgeGridFieldProps = {
  control: Control<BorderFormInput>;
};

const EDGE_LABELS: Record<(typeof BORDER_EDGES)[number], string> = {
  n: "Norte (n)",
  e: "Leste (e)",
  s: "Sul (s)",
  w: "Oeste (w)",
  cnw: "Canto côncavo NO (cnw)",
  cne: "Canto côncavo NE (cne)",
  cse: "Canto côncavo SE (cse)",
  csw: "Canto côncavo SO (csw)",
  dnw: "Canto diagonal NO (dnw)",
  dne: "Canto diagonal NE (dne)",
  dse: "Canto diagonal SE (dse)",
  dsw: "Canto diagonal SO (dsw)",
};

export function BorderEdgeGridField({ control }: BorderEdgeGridFieldProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {BORDER_EDGES.map((edge, index) => (
        <ItemIdField
          key={edge}
          control={control}
          name={`edges.${index}.itemId` as FieldPath<BorderFormInput>}
          label={`${EDGE_LABELS[edge]} — item ID`}
        />
      ))}
    </div>
  );
}
