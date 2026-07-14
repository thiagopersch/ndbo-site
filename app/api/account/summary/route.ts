import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-guard";
import { getAccountSummary } from "@/lib/account-summary";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const summary = await getAccountSummary(Number(session.user.id));
  return NextResponse.json(summary);
}
