import type { NpcInput } from "@/lib/validations/admin/npc";

/** 1 crystal coin = 10000 gold coin — mesma conversão usada em data/lib/autoloot_lib.lua. */
const GOLD_PER_CRYSTAL = 10000;

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildShopList(items: NpcInput["shopItems"], direction: "buy" | "sell"): string {
  const lines = items
    .filter((item) => item.direction === direction && item.itemId != null && item.valueCrystal > 0)
    .map((item) => `${item.name},${item.itemId},${Math.round(item.valueCrystal * GOLD_PER_CRYSTAL)}`);

  return lines.join(";\n               ");
}

/** Montagem pura do XML (sem I/O) — usada tanto na pré-visualização client-side (`NpcForm`)
 * quanto na gravação real dos arquivos (`lib/npc-generator.ts`). */
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

export const DEFAULT_NPC_SCRIPT_TEMPLATE = `local npcHandler = NpcHandler:new()
NpcSystem.parseParameters(npcHandler)

function onCreatureAppear(cid) npcHandler:onCreatureAppear(cid) end
function onCreatureDisappear(cid) npcHandler:onCreatureDisappear(cid) end
function onCreatureSay(cid, type, msg) npcHandler:onCreatureSay(cid, type, msg) end
function onThink() npcHandler:onThink() end

npcHandler:setMessage(MESSAGE_GREET, "Hello, |PLAYERNAME|!")
npcHandler:setMessage(MESSAGE_FAREWELL, "Farewell!")
npcHandler:addModule(FocusModule:new())
`;
