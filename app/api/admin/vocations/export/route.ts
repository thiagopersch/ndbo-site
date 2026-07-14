import { requireAdminSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { vocationsToXmlDocument } from "@/lib/vocation-xml";
import { vocationToInput } from "@/lib/vocation-mapper";

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const vocations = await prisma.vocation.findMany({
    orderBy: { id: "asc" },
    include: { typeClass: true, typeUniverse: true },
  });

  const xml = vocationsToXmlDocument(
    vocations.map((vocation) => ({
      ...vocationToInput(vocation),
      typeClassName: vocation.typeClass?.name ?? "",
      typeUniverseName: vocation.typeUniverse?.name ?? "",
    }))
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vocations.xml"',
    },
  });
}
