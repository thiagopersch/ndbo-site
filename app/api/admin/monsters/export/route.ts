import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { monstersToXmlDocument } from "@/lib/monster-xml";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const monsters = await prisma.monster.findMany({
    select: { name: true, category: true, subcategory: true },
  });

  const xml = monstersToXmlDocument(monsters);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="monsters.xml"',
    },
  });
}
