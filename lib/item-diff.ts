/** Compara duas versões de um mesmo tipo de registro campo a campo (chaves de topo), usado
 * pelo dialog de edição em massa de items pra mostrar o que mudaria antes de sobrescrever um
 * item já existente. Comparação por `JSON.stringify` — suficiente pro `ItemInput`, que é um
 * objeto plano de campos JSON-serializáveis (inclui os grupos aninhados como `skills`,
 * `elements`, `extraAttributes`, `field`, etc. sem precisar mapear cada campo individualmente). */
export function diffObjects<T extends Record<string, unknown>>(
  before: T,
  after: T,
): { key: string; before: unknown; after: unknown }[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs: { key: string; before: unknown; after: unknown }[] = [];

  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diffs.push({ key, before: before[key], after: after[key] });
    }
  }

  return diffs;
}
