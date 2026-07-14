"use client";

import { Filter, X } from "lucide-react";

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

export type FilterFieldOption = { value: string; label: string };

/**
 * Descreve um campo de filtro avançado de forma genérica — cada página monta seu
 * próprio array de `FilterFieldConfig` (ex.: vocations = classe/universo/premium,
 * monsters = tipo/universo/subcategoria/race/faixa de exp/HP/loot/attacks/looktype),
 * sem precisar tocar no componente de tabela ou no painel em si.
 */
export type FilterFieldConfig = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  placeholder?: string;
  options?: FilterFieldOption[];
};

export type FilterValues = Record<string, string>;

function FilterField({
  field,
  value,
  onChange,
}: {
  field: FilterFieldConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "select") {
    const allLabel = field.placeholder ?? "Todos";
    const labelOf = (v: string) =>
      v === "__all__" || !v ? allLabel : (field.options?.find((option) => option.value === v)?.label ?? v);

    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <Select
          value={value || "__all__"}
          onValueChange={(v) => onChange(!v || v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{(v: string) => labelOf(v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      <Input
        type={field.type === "number" ? "number" : "text"}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function AdvancedFilterPanel({
  fields,
  values,
  onValuesChange,
  onApply,
  onClear,
  isFiltering,
}: {
  fields: FilterFieldConfig[];
  values: FilterValues;
  onValuesChange: (values: FilterValues) => void;
  onApply: () => void;
  onClear: () => void;
  isFiltering?: boolean;
}) {
  function setFieldValue(key: string, value: string) {
    onValuesChange({ ...values, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <FilterField
            key={field.key}
            field={field}
            value={values[field.key] ?? ""}
            onChange={(value) => setFieldValue(field.key, value)}
          />
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={isFiltering}>
          <X className="size-4" />
          Limpar filtros
        </Button>
        <Button type="button" size="sm" onClick={onApply} disabled={isFiltering}>
          <Filter className="size-4" />
          {isFiltering ? "Filtrando..." : "Filtrar"}
        </Button>
      </div>
    </div>
  );
}
