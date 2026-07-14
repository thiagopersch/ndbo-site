"use client";

import { useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";
import { TICKET_STATUSES } from "@/lib/validations/ticket";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TicketMessage = {
  id: number;
  message: string;
  isStaff: boolean;
  accountId: number;
  createdAt: string;
};

type Ticket = {
  id: number;
  subject: string;
  category: string;
  status: string;
  accountId: number;
  messages: TicketMessage[];
};

const statusLabel: Record<string, string> = {
  open: "Aberto",
  answered: "Respondido",
  closed: "Fechado",
};

export function TicketThread({ ticketId, isStaff = false }: { ticketId: number; isStaff?: boolean }) {
  const { data, isLoading, mutate } = useSWR<{ ticket: Ticket }>(
    `/api/tickets/${ticketId}`,
    fetcher
  );
  const [reply, setReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function sendReply() {
    if (!reply.trim()) return;
    setIsSubmitting(true);

    const response = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      toast.error("Não foi possível enviar a mensagem.");
      return;
    }

    setReply("");
    mutate();
  }

  async function changeStatus(status: string) {
    const response = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      toast.error("Não foi possível atualizar o status.");
      return;
    }

    toast.success("Status atualizado.");
    mutate();
  }

  if (isLoading || !data?.ticket) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  const { ticket } = data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{ticket.subject}</CardTitle>
          <CardDescription>Categoria: {ticket.category}</CardDescription>
        </div>
        {isStaff ? (
          <Select
            value={ticket.status}
            onValueChange={(value) => value && changeStatus(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabel[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge>{statusLabel[ticket.status] ?? ticket.status}</Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {ticket.messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-lg rounded-md border p-3 text-sm",
                message.isStaff ? "self-start bg-muted" : "self-end bg-primary/10"
              )}
            >
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {message.isStaff ? "Suporte" : "Você"} ·{" "}
                {dayjs(message.createdAt).format("DD/MM/YYYY HH:mm")}
              </p>
              <p className="whitespace-pre-wrap">{message.message}</p>
            </div>
          ))}
        </div>

        {ticket.status !== "closed" && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <Textarea
              rows={3}
              placeholder="Escreva sua resposta..."
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
            <Button onClick={sendReply} disabled={isSubmitting} className="self-end">
              {isSubmitting ? "Enviando..." : "Responder"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
