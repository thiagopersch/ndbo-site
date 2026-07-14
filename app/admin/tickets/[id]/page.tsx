import { TicketThread } from "@/components/shared/ticket-thread";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TicketThread ticketId={Number(id)} isStaff />;
}
