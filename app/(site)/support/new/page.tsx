import type { Metadata } from "next";

import { NewTicketForm } from "@/components/shared/new-ticket-form";

export const metadata: Metadata = {
  title: "Abrir ticket",
};

export default function NewTicketPage() {
  return (
    <div className="px-4 py-12">
      <NewTicketForm />
    </div>
  );
}
