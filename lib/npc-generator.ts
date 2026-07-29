import fs from "node:fs/promises";
import path from "node:path";

import type { NpcInput } from "@/lib/validations/admin/npc";

/** 1 crystal coin = 10000 gold coin — mesma conversão usada em data/lib/autoloot_lib.lua. */
const GOLD_PER_CRYSTAL = 10000;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildShopList(
  items: NpcInput["shopItems"],
  direction: "buy" | "sell",
): string {
  const lines = items
    .map((item) => {
      const priceCrystal = direction === "buy" ? item.buyPriceCrystal : item.sellPriceCrystal;
      if (!priceCrystal || priceCrystal <= 0) return null;
      const priceGold = Math.round(priceCrystal * GOLD_PER_CRYSTAL);
      return `${item.name},${item.itemId},${priceGold}`;
    })
    .filter((line): line is string => line !== null);

  return lines.join(";\n               ");
}

export function buildNpcXml(npc: NpcInput): string {
  const name = xmlEscape(npc.name);

  if (npc.type === "shop") {
    const buyable = buildShopList(npc.shopItems, "buy");
    const sellable = buildShopList(npc.shopItems, "sell");
    const greet = xmlEscape(`Hello, |PLAYERNAME|! Say {trade} to see my wares.`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<npc name="${name}" script="default.lua" walkinterval="2000" floorchange="0">
   <health now="100" max="100" />
   <look type="${npc.lookTypeId}" head="0" body="0" legs="0" feet="0" addons="3" />
   <parameters>
      <parameter key="module_shop" value="1" />
      <parameter key="message_greet" value="${greet}" />${buyable ? `\n      <parameter key="shop_buyable" value="\n               ${buyable}" />` : ""}${sellable ? `\n      <parameter key="shop_sellable" value="\n               ${sellable}" />` : ""}
   </parameters>
</npc>
`;
  }

  const scriptFile = `${npc.name}.lua`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<npc name="${name}" script="${scriptFile}" walkinterval="2000" floorchange="0">
   <health now="100" max="100" />
   <look type="${npc.lookTypeId}" head="0" body="0" legs="0" feet="0" addons="3" />
</npc>
`;
}

const DEFAULT_NPC_SCRIPT_TEMPLATE = `local npcHandler = NpcHandler:new()
NpcSystem.parseParameters(npcHandler)

function onCreatureAppear(cid) npcHandler:onCreatureAppear(cid) end
function onCreatureDisappear(cid) npcHandler:onCreatureDisappear(cid) end
function onCreatureSay(cid, type, msg) npcHandler:onCreatureSay(cid, type, msg) end
function onThink() npcHandler:onThink() end

npcHandler:setMessage(MESSAGE_GREET, "Hello, |PLAYERNAME|!")
npcHandler:setMessage(MESSAGE_FAREWELL, "Farewell!")
npcHandler:addModule(FocusModule:new())
`;

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
 */
export async function writeNpcFiles(npc: NpcInput): Promise<void> {
  const dataPath = getNpcDataPath();
  const xmlPath = path.join(dataPath, "npc", `${npc.name}.xml`);
  await fs.writeFile(xmlPath, buildNpcXml(npc), "utf-8");

  if (npc.type !== "shop") {
    const scriptsDir = path.join(dataPath, "npc", "scripts");
    const scriptPath = path.join(scriptsDir, `${npc.name}.lua`);
    await fs.mkdir(scriptsDir, { recursive: true });
    await fs.writeFile(scriptPath, npc.scriptContent || DEFAULT_NPC_SCRIPT_TEMPLATE, "utf-8");
  }
}

export async function deleteNpcFiles(name: string): Promise<void> {
  const dataPath = getNpcDataPath();
  await fs.rm(path.join(dataPath, "npc", `${name}.xml`), { force: true });
  await fs.rm(path.join(dataPath, "npc", "scripts", `${name}.lua`), { force: true });
}
