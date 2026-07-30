import type { Metadata } from "next";
import dayjs from "dayjs";
import { Ghost, Sparkles, Ticket, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { RecentListCard } from "@/components/admin/dashboard/recent-list-card";
import { DashboardCharts } from "@/components/admin/dashboard/dashboard-charts";
import { EntityThumb } from "@/components/shared/entity-thumb";
import { LooktypeAnimatedImage } from "@/components/shared/looktype-animated-image";

export const metadata: Metadata = {
  title: "Painel administrativo",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [session, stats] = await Promise.all([auth(), getDashboardStats()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel administrativo</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {session?.user?.name}. Nível de acesso:{" "}
          {session?.user?.groupId}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="Contas"
          value={stats.accounts.total}
          description="Últimos 7 dias vs. 7 dias anteriores"
          trend={{
            delta: stats.accounts.delta,
            percent: stats.accounts.percent,
          }}
        />
        <StatCard
          title="Players"
          value={stats.players.total}
          description="Ignorando personagens deletados"
          trend={{ delta: stats.players.delta, percent: stats.players.percent }}
        />
        <StatCard title="Monstros cadastrados" value={stats.monsters.total} />
        <StatCard
          title="Banimentos"
          value={stats.bans.total}
          description={`${stats.bans.active} ativo(s) no momento`}
        />
        <StatCard title="Tickets abertos" value={stats.tickets.open} />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monstro impulsionado hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monsterBoostToday ? (
              <div className="flex items-center gap-3">
                {stats.monsterBoostToday.looktype ? (
                  <LooktypeAnimatedImage
                    looktypeId={stats.monsterBoostToday.looktype.id}
                    frameCount={stats.monsterBoostToday.looktype.frameCount}
                    frameDurationsMs={stats.monsterBoostToday.looktype.frameDurationsMs as number[]}
                    updatedAt={stats.monsterBoostToday.looktype.updatedAt.toISOString()}
                    size="md"
                  />
                ) : (
                  stats.monsterBoostToday.monsterId != null && (
                    <EntityThumb
                      entityType="monster"
                      id={stats.monsterBoostToday.monsterId}
                      name={stats.monsterBoostToday.monster}
                      image={
                        stats.monsterBoostToday.image
                          ? {
                              extension: stats.monsterBoostToday.image.extension,
                              updatedAt:
                                stats.monsterBoostToday.image.updatedAt.toISOString(),
                            }
                          : null
                      }
                      size="md"
                    />
                  )
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold">
                    {stats.monsterBoostToday.monster}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      Loot +{stats.monsterBoostToday.loot}%
                    </Badge>
                    <Badge variant="secondary">
                      Exp +{stats.monsterBoostToday.exp}%
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum monstro impulsionado hoje.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DashboardCharts
        createdTrend={stats.createdTrend}
        accountsByGroup={stats.accounts.byGroup}
        bansByType={stats.bans.byType}
        monstersByCategory={stats.monsters.byCategory}
        ticketsByStatus={stats.tickets.byStatus}
        itemsByType={stats.items.byType}
        vocationsByTypeClass={stats.vocations.byTypeClass}
        vocationsByTypeUniverse={stats.vocations.byTypeUniverse}
        vocationsByPremium={stats.vocations.byPremium}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <RecentListCard
          title="Últimas contas criadas"
          items={stats.accounts.latest.map((account) => ({
            key: account.id,
            primary: (
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                {account.name}
              </span>
            ),
            secondary: `group_id ${account.groupId}`,
            meta: dayjs(account.createdAt).format("DD/MM/YYYY HH:mm"),
          }))}
          emptyLabel="Nenhuma conta cadastrada ainda."
        />

        <RecentListCard
          title="Últimos players criados"
          items={stats.players.latest.map((player) => ({
            key: player.id,
            primary: (
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-muted-foreground" />
                {player.name}
              </span>
            ),
            secondary: `Level ${player.level}`,
            meta: dayjs(player.createdAt).format("DD/MM/YYYY HH:mm"),
          }))}
          emptyLabel="Nenhum player cadastrado ainda."
        />

        <RecentListCard
          title="Últimos banimentos"
          items={stats.bans.latest.map((ban) => ({
            key: ban.id,
            primary: (
              <span className="flex items-center gap-1.5">
                <Ghost className="size-3.5 text-muted-foreground" />
                Alvo #{ban.value}
              </span>
            ),
            secondary: (
              <Badge variant={ban.active ? "destructive" : "secondary"}>
                {ban.active ? "Ativo" : "Inativo"}
              </Badge>
            ),
            meta: dayjs.unix(ban.added).format("DD/MM/YYYY HH:mm"),
          }))}
          emptyLabel="Nenhum banimento registrado ainda."
        />
      </div>

      {stats.tickets.open > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Ticket className="size-4" />
          Existem {stats.tickets.open} ticket(s) aguardando atendimento.
        </p>
      )}
    </div>
  );
}
