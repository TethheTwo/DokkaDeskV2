import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { Ticket as TicketIcon, ShieldCheck, ShieldAlert, TrendingUp, Timer } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { useCurrentUser } from "@/lib/user-store";
import { getTickets, subscribeTickets, type Ticket } from "@/lib/tickets-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inicio — DOKKA Desk" },
      { name: "description", content: "Panel principal de gestión de tickets y asistencias." },
    ],
  }),
  component: HomePage,
});

const DAYS = 7;
const TMA_MIN = 30;

function HomePage() {
  const user = useCurrentUser();
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

  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), DAYS).getTime();
    return tickets.filter((t) => new Date(t.fechaCreacion).getTime() >= cutoff);
  }, [tickets]);

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
    for (let i = DAYS - 1; i >= 0; i--) {
      buckets.set(format(subDays(new Date(), i), "dd/MM/yy"), 0);
    }
    filtered.forEach((t) => {
      const key = format(startOfDay(new Date(t.fechaCreacion)), "dd/MM/yy");
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets, ([fecha, count]) => ({ fecha, count }));
  }, [filtered]);

  const maxCount = useMemo(() => Math.max(1, ...tendencia.map((t) => t.count)), [tendencia]);

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

  const tipoMax = useMemo(() => Math.max(1, ...porTipo.map((t) => t.value)), [porTipo]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground flex flex-col">
      <AppTopBar />
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-display-lg text-[#191c1e]">Inicio</h1>
            <p className="text-body-lg text-[#414752]">Panel de control de rendimiento y gestión de tickets.</p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCardV2 label="Total tickets" value={kpis.total} icon={TicketIcon} tone="#005da9" />
          <StatCardV2 label={`Dentro TMA (\u2264${TMA_MIN}m)`} value={kpis.dentro} icon={ShieldCheck} tone="#006b2c" />
          <StatCardV2 label={`Fuera TMA (>${TMA_MIN}m)`} value={kpis.fuera} icon={ShieldAlert} tone="#ba1a1a" />
          <StatCardV2 label="Cumplimiento TMA" value={`${kpis.cumplimiento}%`} icon={TrendingUp} tone="#005da9" topAccent />
          <StatCardV2 label="Tiempo promedio" value={`${kpis.promedio}m`} icon={Timer} tone="#575f67" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-12 bg-white p-6 rounded-xl shadow-sm border border-[#c1c7d4]">
            <div className="mb-6">
              <h2 className="text-headline-sm text-[#191c1e]">Tendencia diaria de tickets creados</h2>
              <p className="text-label-sm text-[#414752]">Últimos {DAYS} días de operación</p>
            </div>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tendencia} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#005da9" strokeWidth={2.5} dot={{ r: 3, fill: "#005da9" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="lg:col-span-6 bg-white p-6 rounded-xl shadow-sm border border-[#c1c7d4]">
            <div className="mb-6">
              <h2 className="text-headline-sm text-[#191c1e]">Tickets por tipo</h2>
              <p className="text-label-sm text-[#414752]">Distribución de categorías</p>
            </div>
            <div className="space-y-4">
              {porTipo.length === 0 && (
                <p className="text-label-sm text-[#64748b] text-center py-8">Sin datos en los últimos {DAYS} días</p>
              )}
              {porTipo.map((t, i) => {
                const colors = ["#005da9", "#ea580c", "#006b2c", "#575f67", "#9333ea", "#0891b2"];
                return (
                <div key={t.name} className="space-y-1">
                  <div className="flex justify-between text-body-medium text-[#191c1e]">
                    <span>{t.name}</span>
                    <span className="text-[#414752]">{t.value}</span>
                  </div>
                  <div className="w-full bg-[#e7e8eb] rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${(t.value / tipoMax) * 100}%`, backgroundColor: colors[i % colors.length] }} />
                  </div>
                </div>
                );
              })}
            </div>
          </section>

          <section className="lg:col-span-6 bg-white p-6 rounded-xl shadow-sm border border-[#c1c7d4]">
            <div className="mb-6">
              <h2 className="text-headline-sm text-[#191c1e]">Top 10 Resolutores</h2>
              <p className="text-label-sm text-[#414752]">Tickets cerrados por usuario</p>
            </div>
            {porUsuario.length === 0 ? (
              <p className="text-label-sm text-[#64748b] text-center py-8">Sin datos en los últimos {DAYS} días</p>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#f2f3f6] border-b border-[#c1c7d4]">
                      <th className="px-4 py-3 text-label-caps text-[#414752]">Usuario</th>
                      <th className="px-4 py-3 text-label-caps text-[#414752] text-right">Tickets</th>
                      <th className="px-4 py-3 text-label-caps text-[#414752] text-center">TMA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c1c7d4]">
                    {porUsuario.map((u, i) => {
                      const color = avatarColors[i % avatarColors.length];
                      const avatarUrl = avatarMap[u.name.toLowerCase()];
                      return (
                        <tr key={u.name} className="hover:bg-[#edeef1] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-[#e2e8f0]" />
                              ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {initials(u.name)}
                              </div>
                              )}
                              <span className="text-body-medium text-[#191c1e]">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-body-medium text-[#191c1e]">{u.value}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-[rgba(0,107,44,0.1)] text-[#006b2c] text-xs font-semibold ring-1 ring-[rgba(0,107,44,0.3)]">
                              &lt;{TMA_MIN}m
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCardV2({
  label,
  value,
  icon: Icon,
  tone,
  topAccent,
}: {
  label: string;
  value: number | string;
  icon: import("lucide-react").LucideIcon;
  tone: string;
  topAccent?: boolean;
}) {
  const cardClass = topAccent
    ? "bg-white p-4 rounded-xl shadow-sm border border-[#c1c7d4] border-t-2 hover:shadow-md transition-shadow"
    : "bg-white p-4 rounded-xl shadow-sm border border-[#c1c7d4] hover:shadow-md transition-shadow";
  return (
    <div className={cardClass}>
      <div className="flex justify-between items-start mb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${tone}1a`, color: tone }}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      <div className="text-label-caps text-[#414752] uppercase tracking-wider">{label}</div>
      <div className="text-display-lg text-[#191c1e] mt-1">{value}</div>
    </div>
  );
}
