import { Badge } from "@/components/ui/badge";

type UniverseBadgeProps = {
  name: string;
  color?: string | null;
};

/** Determina se o texto deve ser claro ou escuro conforme o brilho da cor de fundo
 * (luminância relativa simplificada), para manter contraste legível em qualquer cor. */
function textColorFor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

/** Badge de universo — usado em toda listagem/select que referencia um `Universe`
 * (Vocações, Monstros, ...) pra refletir a cor cadastrada no CRUD de Universos. */
export function UniverseBadge({ name, color }: UniverseBadgeProps) {
  if (!color) return <Badge variant="outline">{name}</Badge>;

  return (
    <Badge style={{ backgroundColor: color, color: textColorFor(color), borderColor: color }}>
      {name}
    </Badge>
  );
}
