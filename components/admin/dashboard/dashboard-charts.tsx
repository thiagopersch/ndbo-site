"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GRID_STROKE = "var(--border)";
const AXIS_STROKE = "var(--muted-foreground)";
const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
};

type TrendPoint = { label: string; contas: number; players: number };
type CategoryPoint = { label: string; total: number };

export function CreatedTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS_STROKE} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS_STROKE} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="contas"
          name="Contas criadas"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="players"
          name="Players criados"
          stroke="var(--chart-3)"
          fill="var(--chart-3)"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CategoryBarChart({ data, color, height = 240 }: { data: CategoryPoint[]; color: string; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Sem dados para exibir.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS_STROKE} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS_STROKE} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="total" name="Total" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DashboardCharts({
  createdTrend,
  accountsByGroup,
  bansByType,
  monstersByCategory,
  ticketsByStatus,
}: {
  createdTrend: TrendPoint[];
  accountsByGroup: CategoryPoint[];
  bansByType: CategoryPoint[];
  monstersByCategory: CategoryPoint[];
  ticketsByStatus: CategoryPoint[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Contas e players criados (últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatedTrendChart data={createdTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas por nível de acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBarChart data={accountsByGroup} color="var(--chart-1)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banimentos por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBarChart data={bansByType} color="var(--chart-4)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monstros por universo</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBarChart data={monstersByCategory} color="var(--chart-2)" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets por status</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBarChart data={ticketsByStatus} color="var(--chart-5)" />
        </CardContent>
      </Card>
    </div>
  );
}
