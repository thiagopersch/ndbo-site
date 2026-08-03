import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import type { NpcInput } from "@/lib/validations/admin/npc";
import { buildDefaultNpcScript, buildNpcScriptWithMessages, buildNpcXml } from "@/lib/npc-xml";

export { buildNpcXml };

export function getNpcDataPath(): string {
  const base = process.env.OTSERVER_DATA_PATH;
  if (!base) {
    throw new Error("OTSERVER_DATA_PATH não configurado (.env)");
  }
  return base;
}

/**
 * Grava data/npc/{name}.xml (e data/npc/scripts/{name}.lua quando não é NPC de venda) no
 * servidor OTServer. Efeito colateral explícito de POST/PATCH em /api/admin/npcs — NPCs são
 * carregados pelo C++ a partir desses arquivos no boot (ver Npcs::loadFromXml), então não dá
 * para manter só no banco como o resto do admin (tasks/lua-scripts).
 *
 * O conteúdo do script Lua vem do cadastro de Script Lua (`npc.scriptId`) — o NPC só referencia
 * um script já existente, não escreve conteúdo próprio.
 */
export async function writeNpcFiles(npc: NpcInput): Promise<void> {
  const dataPath = getNpcDataPath();
  const xmlPath = path.join(dataPath, "npc", `${npc.name}.xml`);
  await fs.writeFile(xmlPath, buildNpcXml(npc), "utf-8");

  if (npc.type !== "shop") {
    const scriptsDir = path.join(dataPath, "npc", "scripts");
    const scriptPath = path.join(scriptsDir, `${npc.name}.lua`);
    await fs.mkdir(scriptsDir, { recursive: true });

    const linkedScript = npc.scriptId
      ? await prisma.luaScript.findUnique({ where: { id: npc.scriptId }, select: { content: true } })
      : null;
    const scriptContent =
      linkedScript?.content ??
      (npc.customMessages.length > 0
        ? buildNpcScriptWithMessages(npc.customMessages, npc.defaultMessages)
        : buildDefaultNpcScript(npc.defaultMessages));
    await fs.writeFile(scriptPath, scriptContent, "utf-8");
  }
}

export async function deleteNpcFiles(name: string): Promise<void> {
  const dataPath = getNpcDataPath();
  await fs.rm(path.join(dataPath, "npc", `${name}.xml`), { force: true });
  await fs.rm(path.join(dataPath, "npc", "scripts", `${name}.lua`), { force: true });
}
