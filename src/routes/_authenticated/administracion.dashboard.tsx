import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  differenceInCalendarDays,
  addDays,
} from "date-fns";
import {
  Ticket as TicketIcon,
  ShieldCheck,
  Timer,
  TrendingUp,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { AppTopBar } from "@/components/AppTopBar";
import { DateRangePicker } from "@/components/DateRangePicker";
import { getTickets, subscribeTickets, type Ticket } from "@/lib/tickets-store";
import { exportTicketsPDF, exportDashboardXLSX } from "@/lib/report-exports";
import { useAuth } from "@/lib/auth";
import { useCurrentUser } from "@/lib/user-store";
import { usePermissions } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/administracion/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard de reportes — DOKKA Desk" },
      { name: "description", content: "Indicadores y gráficos de tickets." },
    ],
  }),
  component: DashboardReportes,
});

function defaultRange(): DateRange {
  const to = new Date();
  return { from: subDays(to, 29), to };
}

function DashboardReportes() {
  const { roles, loading } = useAuth();
  const canSee = roles.includes("administrador") || roles.includes("supervisor");
  const { can } = usePermissions();
  const canDownload = can("download_records");
  const currentUser = useCurrentUser();

  const [tickets, setTickets] = useState<Ticket[]>(() => getTickets());
  useEffect(() => subscribeTickets(() => setTickets(getTickets())), []);

  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("profiles").select("username, full_name, avatar_url").then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      for (const p of data) {
        if (p.avatar_url) {
          if (p.username) map[p.username.toLowerCase()] = p.avatar_url;
          if (p.full_name) map[p.full_name.toLowerCase()] = p.avatar_url;
        }
      }
      setAvatarMap(map);
    });
  }, []);

  const [range, setRange] = useState<DateRange>(() => defaultRange());

  const from = range.from ?? subDays(new Date(), 29);
  const to = range.to ?? new Date();
  const days = Math.max(1, differenceInCalendarDays(to, from) + 1);

  const filtered = useMemo(() => {
    const start = startOfDay(from).getTime();
    const end = endOfDay(to).getTime();
    return tickets.filter((t) => {
      const ts = new Date(t.fechaCreacion).getTime();
      return ts >= start && ts <= end;
    });
  }, [tickets, from, to]);

  const TMA_MIN = 30;
  const kpis = useMemo(() => {
    const total = filtered.length;
    let dentro = 0;
    let fuera = 0;
    let sumMins = 0;
    let countMins = 0;
    for (const t of filtered) {
      if (t.estado !== "Cerrado") continue;
      const cierreNote = [...t.notes].reverse().find((n) => n.estado === "Cerrado");
      const cierreISO = cierreNote?.fecha ?? t.notes[t.notes.length - 1]?.fecha;
      if (!cierreISO) continue;
      const mins = (new Date(cierreISO).getTime() - new Date(t.fechaCreacion).getTime()) / 60000;
      if (mins <= TMA_MIN) dentro++;
      else fuera++;
      sumMins += mins;
      countMins++;
    }
    const cerrados = dentro + fuera;
    const cumplimiento = cerrados > 0 ? Math.round((dentro / cerrados) * 100) : 0;
    const promedio = countMins > 0 ? Math.round(sumMins / countMins) : 0;
    return { total, dentro, fuera, cumplimiento, promedio };
  }, [filtered]);

  const porTipo = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((t) => m.set(t.tipo, (m.get(t.tipo) ?? 0) + 1));
    return Array.from(m, ([name, value]) => ({ name: name.replace("Asistencia ", ""), value }));
  }, [filtered]);

  const tendencia = useMemo(() => {
    const buckets = new Map<string, number>();
    if (days <= 3) {
      // Bucket by hour
      for (let i = 0; i < days; i++) {
        const dayStart = addDays(startOfDay(from), i);
        for (let h = 0; h < 24; h++) {
          const key = format(new Date(dayStart.getTime() + h * 3600000), "dd/MM HH:mm");
          buckets.set(key, 0);
        }
      }
      filtered.forEach((t) => {
        const d = new Date(t.fechaCreacion);
        const key = format(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0), "dd/MM HH:mm");
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      });
    } else if (days <= 90) {
      // Bucket by day
      for (let i = 0; i < days; i++) {
        const key = format(addDays(startOfDay(from), i), "dd/MM/yy");
        buckets.set(key, 0);
      }
      filtered.forEach((t) => {
        const key = format(startOfDay(new Date(t.fechaCreacion)), "dd/MM/yy");
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      });
    } else {
      // Bucket by week
      const start = startOfDay(from);
      const weeks = Math.ceil(days / 7);
      for (let i = 0; i < weeks; i++) {
        const key = format(addDays(start, i * 7), "dd/MM/yy");
        buckets.set(key, 0);
      }
      filtered.forEach((t) => {
        const d = new Date(t.fechaCreacion);
        const diff = differenceInCalendarDays(d, start);
        const weekIndex = Math.floor(diff / 7);
        const key = format(addDays(start, weekIndex * 7), "dd/MM/yy");
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      });
    }
    return Array.from(buckets, ([fecha, count]) => ({ fecha, count }));
  }, [filtered, from, days]);

  const tipoMax = useMemo(() => Math.max(1, ...porTipo.map((t) => t.value)), [porTipo]);

  const porUsuario = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((t) => {
      if (t.estado !== "Cerrado") return;
      const key = (t.cerradoPor || "").trim();
      if (!key || key === "-") return;
      m.set(key, (m.get(key) ?? 0) + 1);
    });
    return Array.from(m, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.[0] ?? "?").toUpperCase();
  };

  const avatarColors = ["#005da9", "#006b2c", "#575f67", "#ea580c", "#9333ea", "#0891b2", "#db2777", "#ca8a04"];

  if (!loading && !canSee) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
        <AppTopBar />
        <main className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-xl font-semibold mb-2">Sin permisos</h1>
          <p className="text-muted-foreground">
            Solo administradores y supervisores pueden ver el dashboard de reportes.
          </p>
          <Link to="/" className="text-[#005da9] hover:underline mt-4 inline-block">
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground flex flex-col">
      <AppTopBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white p-6 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-headline-sm text-[#191c1e]">Dashboard de Reportes</h2>
              <p className="text-label-sm text-[#575f67]">Seleccione el período y filtros para el análisis de gestión.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportTicketsPDF(filtered, "reporte", currentUser.name || "Usuario")}
                className="flex items-center gap-2 h-10 px-4 rounded-md bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] transition-colors font-body-bold disabled:opacity-50"
                disabled={!canDownload}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>picture_as_pdf</span>
                PDF
              </button>
              <button
                onClick={() => exportDashboardXLSX(filtered, "reporte", currentUser.name || "Usuario")}
                className="flex items-center gap-2 h-10 px-4 rounded-md bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0] transition-colors font-body-bold disabled:opacity-50"
                disabled={!canDownload}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>table_view</span>
                Excel
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-label-sm font-body-bold text-[#414752] block mb-1">Rango de Fechas</label>
              <DateRangePicker value={range} onChange={(r) => setRange({ from: r.from, to: r.to })} />
            </div>
            <div>
              <label className="text-label-sm font-body-bold text-[#414752] block mb-1">Presets</label>
              <div className="flex gap-2">
                {[
                  { label: "Hoy", n: 1 },
                  { label: "7 días", n: 7 },
                  { label: "30 días", n: 30 },
                  { label: "90 días", n: 90 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      const t = new Date();
                      setRange({ from: subDays(t, p.n - 1), to: t });
                    }}
                    className={`h-10 px-4 rounded-md border text-label-sm transition-colors ${
                      days === p.n
                        ? "bg-[rgba(0,93,169,0.1)] text-[#005da9] border-[#005da9] font-bold"
                        : "border-[#d1d5db] hover:bg-[#e7e8eb]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={TicketIcon} label="Total Tickets" value={kpis.total} color="#005da9" hoverColor="#005da9" />
          <KpiCard icon={ShieldCheck} label="Dentro TMA" value={kpis.dentro} color="#006b2c" hoverColor="#006b2c" />
          <KpiCard icon={Timer} label="TMA Promedio" value={`${kpis.promedio}m`} color="#ea580c" hoverColor="#ea580c" />
          <KpiCard icon={TrendingUp} label="Cumplimiento" value={`${kpis.cumplimiento}%`} color="#005da9" hoverColor="#005da9" />
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex justify-between items-center">
            <h3 className="text-headline-sm text-[#191c1e]">Tendencia de Incidencias</h3>
            <span className="flex items-center gap-1 text-label-sm text-[#005da9]">
              <span className="w-2 h-2 rounded-full bg-[#005da9]" /> Creados
            </span>
          </div>
          <div className="p-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tendencia} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  interval={Math.max(0, Math.floor(tendencia.length / 12))}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickFormatter={(val) => days <= 3 ? val.slice(-5) : val}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#005da9" strokeWidth={2.5} dot={{ r: 3, fill: "#005da9" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-[#e2e8f0]">
              <h3 className="text-headline-sm text-[#191c1e]">Tickets por Tipo</h3>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
              {porTipo.length === 0 ? (
                <p className="text-label-sm text-[#64748b] text-center">Sin datos en el período</p>
              ) : (
                porTipo.map((t, i) => {
                  const colors = ["#005da9", "#ea580c", "#006b2c", "#575f67", "#9333ea", "#0891b2"];
                  return (
                    <div key={t.name} className="space-y-2">
                      <div className="flex justify-between text-label-sm font-body-bold text-[#191c1e]">
                        <span>{t.name}</span>
                        <span>{t.value}</span>
                      </div>
                      <div className="w-full h-3 bg-[#e7e8eb] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(t.value / tipoMax) * 100}%`, backgroundColor: colors[i % colors.length] }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm">
            <div className="px-6 py-4 border-b border-[#e2e8f0]">
              <h3 className="text-headline-sm text-[#191c1e]">Top 10 Resolutores</h3>
              <p className="text-label-sm text-[#414752] mt-0.5">Tickets cerrados por usuario en el período</p>
            </div>
            {porUsuario.length === 0 ? (
              <p className="text-label-sm text-[#64748b] text-center py-10">Sin datos en el período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#f2f3f6] border-b border-[#e2e8f0]">
                      <th className="px-6 py-3 text-label-caps text-[#414752]">Usuario</th>
                      <th className="px-6 py-3 text-label-caps text-[#414752] text-right">Tickets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {porUsuario.map((u, i) => {
                      const color = avatarColors[i % avatarColors.length];
                      const avatarUrl = avatarMap[u.name.toLowerCase()];
                      return (
                        <tr key={u.name} className="hover:bg-[#f2f3f6]/50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#e2e8f0]" />
                              ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: color }}
                              >
                                {initials(u.name)}
                              </div>
                              )}
                              <span className="text-body-medium text-[#191c1e]">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right text-body-medium text-[#191c1e]">{u.value}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  hoverColor,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  hoverColor: string;
}) {
  return (
    <div
      className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col justify-between group transition-colors"
      style={{ borderColor: "#e2e8f0" }}
    >
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}1a` }}>
          <Icon className="h-5 w-5" style={{ color }} strokeWidth={2} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-label-sm text-[#575f67] uppercase tracking-wider">{label}</p>
        <h3 className="text-display-lg text-[#191c1e]">{value}</h3>
      </div>
    </div>
  );
}
