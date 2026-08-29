import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { spellToFormInput } from "@/lib/spell-mapper";
import { spellsToXmlDocument } from "@/lib/spell-xml";

/** Serve tanto o download (link "Exportar XML") quanto o botão "Copiar XML" (fetch + clipboard,
 * sem baixar arquivo — ver `components/shared/copy-xml-button.tsx`). */
export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const [spells, vocations] = await Promise.all([
    prisma.spell.findMany({ orderBy: { id: "asc" }, include: { vocations: true } }),
    prisma.vocation.findMany({ select: { id: true, name: true } }),
  ]);
  const vocationNameById = new Map(vocations.map((vocation) => [vocation.id, vocation.name]));
  const xml = spellsToXmlDocument(spells.map(spellToFormInput), vocationNameById);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="spells.xml"',
    },
  });
}
