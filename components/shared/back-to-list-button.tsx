import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Botão de voltar exibido no início de cada form de create/edit do admin — leva de volta pra
 * listagem sem depender do usuário usar o botão "voltar" do navegador. */
export function BackToListButton({ href }: { href: string }) {
  return (
    <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link href={href} />}>
      <ArrowLeft className="size-4" />
      Voltar para a listagem
    </Button>
  );
}
