import { NPC_DEFAULT_MESSAGE_KEYS, type NpcDefaultMessagesInput, type NpcInput } from "@/lib/validations/admin/npc";

/** 1 crystal coin = 10000 gold coin — mesma conversão usada em data/lib/autoloot_lib.lua. */
const GOLD_PER_CRYSTAL = 10000;

const DEFAULT_GREET = "Hello, |PLAYERNAME|! Say {trade} to see my wares.";

/** `message_x` -> `MESSAGE_X` (constante esperada por `npcHandler:setMessage`). */
function messageKeyToConstant(key: string): string {
  return `MESSAGE_${key.slice("message_".length).toUpperCase()}`;
}

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
    const messages = npc.defaultMessages ?? {};
    const greet = xmlEscape(messages.message_greet || DEFAULT_GREET);

    const extraMessageParams = NPC_DEFAULT_MESSAGE_KEYS.filter((entry) => entry.key !== "message_greet")
      .filter((entry) => messages[entry.key])
      .map((entry) => `\n      <parameter key="${entry.key}" value="${xmlEscape(messages[entry.key])}" />`)
      .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<npc name="${name}" script="default.lua" walkinterval="2000" floorchange="0">
   <health now="100" max="100" />
   <look type="${npc.lookTypeId}" head="0" body="0" legs="0" feet="0" addons="3" />
   <parameters>
      <parameter key="module_shop" value="1" />
      <parameter key="message_greet" value="${greet}" />${extraMessageParams}${buyable ? `\n      <parameter key="shop_buyable" value="\n               ${buyable}" />` : ""}${sellable ? `\n      <parameter key="shop_sellable" value="\n               ${sellable}" />` : ""}
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

function luaStringLiteral(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Linhas `npcHandler:setMessage(MESSAGE_X, "...")` pras mensagens de categoria "general"
 * (as únicas que fazem sentido fora do módulo de loja nativo) — greet/farewell sempre saem
 * (com fallback quando não customizados), as demais só quando o admin preencheu um valor. */
function buildSetMessageLines(defaultMessages: NpcDefaultMessagesInput): string {
  const greet = defaultMessages.message_greet || "Hello, |PLAYERNAME|!";
  const farewell = defaultMessages.message_farewell || "Farewell!";

  const extraLines = NPC_DEFAULT_MESSAGE_KEYS.filter((entry) => entry.category === "general")
    .filter((entry) => entry.key !== "message_greet" && entry.key !== "message_farewell")
    .filter((entry) => defaultMessages[entry.key])
    .map(
      (entry) =>
        `npcHandler:setMessage(${messageKeyToConstant(entry.key)}, ${luaStringLiteral(defaultMessages[entry.key])})`,
    );

  return [
    `npcHandler:setMessage(MESSAGE_GREET, ${luaStringLiteral(greet)})`,
    `npcHandler:setMessage(MESSAGE_FAREWELL, ${luaStringLiteral(farewell)})`,
    ...extraLines,
  ].join("\n");
}

/** Script padrão (sem falas ambiente) — usado quando o NPC não tem Script Lua próprio
 * vinculado (`scriptId`) nem falas ambiente configuradas. */
export function buildDefaultNpcScript(defaultMessages: NpcDefaultMessagesInput = {}): string {
  return `local npcHandler = NpcHandler:new()
NpcSystem.parseParameters(npcHandler)

function onCreatureAppear(cid) npcHandler:onCreatureAppear(cid) end
function onCreatureDisappear(cid) npcHandler:onCreatureDisappear(cid) end
function onCreatureSay(cid, type, msg) npcHandler:onCreatureSay(cid, type, msg) end
function onThink() npcHandler:onThink() end

${buildSetMessageLines(defaultMessages)}
npcHandler:addModule(FocusModule:new())
`;
}

/** Script padrão com falas ambiente (`selfSay`, sem exigir um alvo/conversa) — cada mensagem
 * tem seu próprio cooldown (`intervalMs`) e chance (%) de ser dita quando o cooldown vence.
 * Usado só quando o NPC não tem um Script Lua próprio vinculado (`scriptId`). */
export function buildNpcScriptWithMessages(
  messages: { text: string; intervalMs: number; chance: number }[],
  defaultMessages: NpcDefaultMessagesInput = {},
): string {
  if (messages.length === 0) return buildDefaultNpcScript(defaultMessages);

  const entries = messages
    .map(
      (message) =>
        `\t{ text = ${luaStringLiteral(message.text)}, intervalSec = ${Math.max(1, Math.round(message.intervalMs / 1000))}, chance = ${message.chance}, nextAt = 0 },`
    )
    .join("\n");

  return `local npcHandler = NpcHandler:new()
NpcSystem.parseParameters(npcHandler)

function onCreatureAppear(cid) npcHandler:onCreatureAppear(cid) end
function onCreatureDisappear(cid) npcHandler:onCreatureDisappear(cid) end
function onCreatureSay(cid, type, msg) npcHandler:onCreatureSay(cid, type, msg) end

-- Falas ambiente configuradas no admin (portal) — independem de conversa/foco.
local ambientMessages = {
${entries}
}

function onThink()
	npcHandler:onThink()

	local now = os.time()
	for _, message in ipairs(ambientMessages) do
		if now >= message.nextAt then
			message.nextAt = now + message.intervalSec
			if math.random(1, 100) <= message.chance then
				selfSay(message.text)
			end
		end
	end
end

${buildSetMessageLines(defaultMessages)}
npcHandler:addModule(FocusModule:new())
`;
}
