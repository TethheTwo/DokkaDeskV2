import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AppTopBar } from "@/components/AppTopBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { exportAuditXLSX, type AuditRow as AuditRowExport } from "@/lib/report-exports";
import { formatCode } from "@/lib/utils";
import { getPaginationItems } from "@/lib/pagination";

export const Route = createFileRoute("/_authenticated/administracion/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría — DOKKA Desk" },
      { name: "description", content: "Registro de acciones del sistema." },
    ],
  }),
  component: AuditoriaPage,
});

interface AuditRow {
  id: string;
  created_at: string;
  username: string | null;
  user_email: string | null;
  action: string;
  entity: string;
  ticket_nro: number | null;
  details: Record<string, unknown>;
}

const ACTION_LABEL: Record<string, string> = {
  ticket_created: "Ticket Creado",
  ticket_deleted: "Ticket Eliminado",
  ticket_state_changed: "Cambio de Estado",
  note_added: "Nota Agregada",
  note_deleted: "Nota Eliminada",
  attachment_added: "Adjunto Agregado",
  attachment_deleted: "Adjunto Eliminado",
  cg_created: "Caso General Creado",
  cg_updated: "Caso General Editado",
  cg_deleted: "Caso General Eliminado",
  ap_created: "Accidente Personal Creado",
  ap_updated: "Accidente Personal Editado",
  ap_deleted: "Accidente Personal Eliminado",
};

const ACTION_BADGE: Record<string, string> = {
  ticket_created: "bg-[#dbeafe] text-[#1d4ed8] border-[#1d4ed8]",
  ticket_deleted: "bg-[#fee2e2] text-[#b91c1c] border-[#b91c1c]",
  ticket_state_changed: "bg-[#fee2e2] text-[#b91c1c] border-[#b91c1c]",
  note_added: "bg-[#d1fae5] text-[#047857] border-[#047857]",
  note_deleted: "bg-[#ffe4e6] text-[#be123c] border-[#be123c]",
  attachment_added: "bg-[#ede9fe] text-[#6d28d9] border-[#6d28d9]",
  attachment_deleted: "bg-[#ffe4e6] text-[#be123c] border-[#be123c]",
  cg_created: "bg-[#dbeafe] text-[#1d4ed8] border-[#1d4ed8]",
  cg_updated: "bg-[#fee2e2] text-[#b91c1c] border-[#b91c1c]",
  cg_deleted: "bg-[#fee2e2] text-[#b91c1c] border-[#b91c1c]",
  ap_created: "bg-[#dbeafe] text-[#1d4ed8] border-[#1d4ed8]",
  ap_updated: "bg-[#fee2e2] text-[#b91c1c] border-[#b91c1c]",
  ap_deleted: "bg-[#fee2e2] text-[#b91c1c] border-[#b91c1c]",
};

function displayUser(r: { username: string | null; user_email: string | null }) {
  return r.username || (r.user_email ? r.user_email.split("@")[0] : "—");
}

function codeFromRow(r: { entity: string; ticket_nro: number | null }) {
  if (r.ticket_nro == null) return "—";
  const prefix = r.entity === "reporte_cg" ? "CG" : r.entity === "reporte_ap" ? "AP" : "TK";
  return formatCode(prefix as "TK" | "CG" | "AP", r.ticket_nro);
}



function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

const AVATAR_COLORS = ["#dbeafe", "#d1fae5", "#fee2e2", "#ede9fe", "#cffafe", "#fef3c7"];

function avatarStyle(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];
  const textMap: Record<string, string> = {
    "#dbeafe": "#1d4ed8", "#d1fae5": "#047857", "#fee2e2": "#b91c1c",
    "#ede9fe": "#6d28d9", "#cffafe": "#0e7490", "#fef3c7": "#b45309",
  };
  return { bg: color, fg: textMap[color] || "#575f67" };
}

function AuditoriaPage() {
  const { roles, loading: authLoading } = useAuth();
  const canSee = roles.includes("administrador") || roles.includes("supervisor");

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!canSee) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const [auditResult, profilesResult] = await Promise.all([
        supabase
          .from("audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("profiles")
          .select("email, avatar_url"),
      ]);
      if (!active) return;
      if (profilesResult.data) {
        const map: Record<string, string> = {};
        for (const p of profilesResult.data) {
          if (p.email && p.avatar_url) map[p.email.toLowerCase()] = p.avatar_url;
        }
        setAvatarMap(map);
      }
      const { data, error } = auditResult;
      if (!active) return;
      if (error) {
        console.error(error);
        setRows([]);
      } else setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    };
    void load();
    const ch = supabase
      .channel("audit-log-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, () => void load())
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [canSee]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter && r.action !== actionFilter) return false;
      if (q) {
        const blob = [displayUser(r), r.user_email ?? "", r.action, r.entity, codeFromRow(r), JSON.stringify(r.details ?? {})].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, actionFilter, search]);

  useEffect(() => { setPage(1); }, [search, actionFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!authLoading && !canSee) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <AppTopBar />
        <main className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-xl font-semibold mb-2">Sin permisos</h1>
          <p className="text-muted-foreground">Solo administradores y supervisores pueden ver el registro de auditoría.</p>
          <Link to="/" className="text-[#005da9] hover:underline mt-4 inline-block">Volver al inicio</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground flex flex-col">
      <AppTopBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-display-lg text-[#191c1e] mb-1">Auditoría del Sistema</h1>
            <p className="text-body-lg text-[#575f67]">Registro en tiempo real de acciones administrativas y de soporte.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                await exportAuditXLSX(filtered as unknown as AuditRowExport[], "auditoria");
              }}
              className="bg-[#f2f3f6] text-[#575f67] border border-[#e2e8f0] px-4 h-10 rounded-md flex items-center gap-2 hover:bg-[#edeef1] transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>download</span>
              <span className="text-body-bold">Descargar PDF/Excel</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div>
              <label className="text-label-sm font-bold text-[#414752] block mb-1.5">Tipo de Acción</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full h-10 rounded-md border border-[#d1d5db] text-body-medium bg-[#f8f9fc] focus:ring-[#005da9] focus:border-[#005da9] outline-none px-3"
              >
                <option value="">Todas</option>
                {Object.entries(ACTION_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label-sm font-bold text-[#414752] block mb-1.5">Usuario / Ticket</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#575f67]" style={{ fontSize: "20px" }}>search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 rounded-md border border-[#d1d5db] text-body-medium bg-[#f8f9fc] focus:ring-[#005da9] focus:border-[#005da9] outline-none"
                  placeholder="Ej. Juan Pérez o #1024"
                />
              </div>
            </div>
            <div>
              <label className="text-label-sm font-bold text-[#414752] block mb-1.5">Por página</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-full h-10 rounded-md border border-[#d1d5db] text-body-medium bg-[#f8f9fc] focus:ring-[#005da9] focus:border-[#005da9] outline-none px-3"
              >
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
              </select>
            </div>
            <div>
              <button
                onClick={() => { setActionFilter(""); setSearch(""); }}
                className="w-full h-10 bg-[#edeef1] text-[#191c1e] rounded-md hover:bg-[#e7e8eb] transition-colors text-body-bold"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f2f3f6] border-b border-[#e2e8f0]">
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Fecha / Hora</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Usuario</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Acción</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Ticket #</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Cargando…</td>
                  </tr>
                )}
                {!loading && paged.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Sin registros</td>
                  </tr>
                )}
                {!loading && paged.map((r) => {
                  const badgeClass = ACTION_BADGE[r.action] || "bg-[#edeef1] text-[#575f67] border-[#575f67]";
                  const user = displayUser(r);
                  const av = avatarStyle(user);
                  return (
                    <tr key={r.id} className="hover:bg-[#f2f3f6]/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-body-bold text-[#191c1e]">{format(new Date(r.created_at), "dd MMM, yyyy")}</div>
                        <div className="text-label-sm text-[#575f67]">{format(new Date(r.created_at), "HH:mm:ss")}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden relative" style={{ backgroundColor: av.bg, color: av.fg }}>
                            {(() => {
                              const avatarUrl = r.user_email ? avatarMap[r.user_email.toLowerCase()] : undefined;
                              return avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.style.display = "none";
                                    img.parentElement!.innerText = initials(user);
                                  }}
                                />
                              ) : initials(user);
                            })()}
                          </div>
                          <span className="text-body-medium text-[#191c1e]">{user}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                          {ACTION_LABEL[r.action] || r.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-body-medium font-bold text-[#005da9]">{codeFromRow(r)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <DetailCell details={r.details} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="bg-[#f2f3f6] px-6 py-4 flex items-center justify-between border-t border-[#e2e8f0]">
              <span className="text-label-sm text-[#575f67]">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} registros
              </span>
              <div className="flex items-center gap-2">
                {getPaginationItems(currentPage, totalPages).map((item, i) => {
                  if (item.type === "prev") {
                    return (
                      <button key="prev" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={item.disabled}
                        className="w-8 h-8 flex items-center justify-center rounded border border-[#d1d5db] bg-white hover:bg-[#edeef1] transition-colors disabled:opacity-50">
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>chevron_left</span>
                      </button>
                    );
                  }
                  if (item.type === "next") {
                    return (
                      <button key="next" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={item.disabled}
                        className="w-8 h-8 flex items-center justify-center rounded border border-[#d1d5db] bg-white hover:bg-[#edeef1] transition-colors disabled:opacity-50">
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>chevron_right</span>
                      </button>
                    );
                  }
                  if (item.type === "ellipsis") {
                    return <span key={"e" + i} className="px-1 text-[#575f67]">…</span>;
                  }
                  return (
                    <button key={item.page} onClick={() => setPage(item.page)}
                      className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${item.page === currentPage ? "bg-[#005da9] text-white" : "border border-[#d1d5db] bg-white hover:bg-[#edeef1]"}`}>
                      {item.page}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DetailCell({ details }: { details: Record<string, unknown> }) {
  if (!details || Object.keys(details).length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="text-xs text-[#414752] space-y-0.5 max-w-xs truncate">
      {Object.entries(details).map(([k, v]) => (
        <div key={k} className="truncate">
          <span className="font-semibold text-[#191c1e]/70">{k}:</span>{" "}
          <span>{typeof v === "string" ? v : JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  );
}
