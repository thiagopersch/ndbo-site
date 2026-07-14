import { z } from "zod";

export const TICKET_CATEGORIES = [
  "Conta",
  "Pagamento",
  "Bug",
  "Denúncia",
  "Outro",
] as const;

export const createTicketSchema = z.object({
  subject: z.string().min(3).max(255),
  category: z.enum(TICKET_CATEGORIES),
  message: z.string().min(5).max(2000),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const ticketMessageSchema = z.object({
  message: z.string().min(1).max(2000),
});

export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;

export const TICKET_STATUSES = ["open", "answered", "closed"] as const;
