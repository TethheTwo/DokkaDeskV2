import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Paperclip,
  Send,
  FileText,
  FileDown,
  Image as ImageIcon,
  Search,
  Plus,
  Save,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  addTicket,
  addTicketNote,
  getTickets,
  openAttachment,
  removeTicket,
  subscribeTickets,
  updateTicketEstado,
  type Severidad,
  type Estado,
  type Ticket,
  type TicketAttachment,
} from "@/lib/tickets-store";
import { useCurrentUser, getUserProfile } from "@/lib/user-store";
import { downloadTicketPDF } from "@/lib/reports";
import { exportTicketsPDF, exportTicketsXLSX } from "@/lib/report-exports";
import { DownloadMenu } from "@/components/DownloadMenu";
import { AppTopBar } from "@/components/AppTopBar";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/lib/permissions";
import { formatCode } from "@/lib/utils";
import { getPaginationItems } from "@/lib/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/tickets/listado")({
  head: () => ({
    meta: [
      { title: "Listado de tickets — DOKKA Desk" },
      { name: "description", content: "Listado de tickets registrados." },
    ],
  }),
  component: ListadoTicketsPage,
});

function ListadoTicketsPage() {
  return <TicketsCard />;
}

function TicketsCard() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canDelete = can("delete_tickets");
  const canDownload = can("download_records");
  const currentUser = useCurrentUser();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("__all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [tickets, setTickets] = useState<Ticket[]>(() => getTickets());
  const [viewing, setViewing] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  useEffect(() => subscribeTickets(() => setTickets(getTickets())), []);

  // Mantener sincronizado el modal abierto cuando llegan notas en tiempo real
  useEffect(() => {
    setViewing((cur) => {
      if (!cur) return cur;
      const fresh = tickets.find((t) => t.nro === cur.nro);
      return fresh ?? cur;
    });
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (estadoFilter !== "__all" && t.estado !== estadoFilter) return false;
      if (!q) return true;
      const notesText = (t.notes ?? []).map((n) => n.nota).join(" ");
      return [
        t.nro,
        format(new Date(t.fechaCreacion), "dd/MM/yyyy HH:mm"),
        t.solicitante,
        t.tipo,
        t.severidad,
        t.registradoPor,
        t.estado,
        t.cerradoPor,
        notesText,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [search, tickets, estadoFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, estadoFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const cerrados = tickets.filter((t) => t.estado === "Cerrado").length;

  const sevPill = (s: Severidad) => {
    const map: Record<Severidad, string> = {
      Alta: "bg-orange-50 text-orange-700 ring-orange-200",
      Media: "bg-amber-50 text-amber-700 ring-amber-200",
      Baja: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
    return map[s];
  };

  const sevColor = (s: Severidad) => {
    const map: Record<Severidad, string> = {
      Alta: "text-[#ea580c]",
      Media: "text-[#575f67]",
      Baja: "text-[#717783]",
    };
    return map[s];
  };

  const sevDot = (s: Severidad) => {
    const map: Record<Severidad, string> = {
      Alta: "bg-[#ea580c]",
      Media: "bg-[#575f67]",
      Baja: "bg-[#717783]",
    };
    return map[s];
  };

  const estadoPill = (e: Estado) => {
    const map: Record<Estado, string> = {
      Pendiente: "bg-rose-50 text-rose-700 ring-rose-200",
      "En atención": "bg-sky-50 text-sky-700 ring-sky-200",
      "Esperando Respuesta": "bg-indigo-50 text-indigo-700 ring-indigo-200",
      "Cliente no responde": "bg-cyan-50 text-cyan-700 ring-cyan-200",
      Actualizado: "bg-violet-50 text-violet-700 ring-violet-200",
      Cerrado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
    return map[e];
  };

  const ESTADOS: Estado[] = [
    "Pendiente",
    "En atención",
    "Esperando Respuesta",
    "Cliente no responde",
    "Actualizado",
    "Cerrado",
  ];

  const confirmDelete = (t: Ticket) => {
    if (t.estado === "Cerrado") {
      toast.error("No es posible eliminar casos cerrados", { duration: 3000 });
      return;
    }
    setTicketToDelete(t);
  };

  const handleDelete = async () => {
    if (!ticketToDelete) return;
    const ok = await removeTicket(ticketToDelete.nro);
    if (ok) toast.success(`Ticket #${ticketToDelete.nro} eliminado`, { duration: 3000 });
    else toast.error("No se pudo eliminar el ticket", { duration: 3000 });
    setTicketToDelete(null);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground flex flex-col">
      <AppTopBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-display-lg text-[#191c1e] tracking-tight">Tickets</h1>
            <p className="text-body-base text-[#414752]">Gestión de requerimientos y soporte técnico centralizado.</p>
          </div>
          <div className="flex items-center gap-2">
            <DownloadMenu
              hidden={!canDownload}
              onPDF={(r) => exportTicketsPDF(tickets, r, currentUser.name || "Usuario")}
              onExcel={(r) => exportTicketsXLSX(tickets, r, currentUser.name || "Usuario")}
            />
            <button
              onClick={() => setShowNewTicket(true)}
              className="bg-[#005da9] hover:bg-[#2868b3] text-white h-10 px-6 rounded-md font-body-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Nuevo ticket
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:flex-grow">
            <label className="block text-label-sm mb-1 text-[#414752]">Buscar ticket</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#414752]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ID, solicitante o tipo..."
                className="w-full h-10 pl-10 pr-4 rounded-md border border-[#d1d5db] bg-[#f8f9fc] focus:border-[#005da9] focus:ring-2 focus:ring-[#005da9]/40 outline-none transition-all text-body-base"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-label-sm mb-1 text-[#414752]">Estado</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-[#d1d5db] bg-[#f8f9fc] focus:border-[#005da9] focus:ring-2 focus:ring-[#005da9]/40 outline-none transition-all text-body-base appearance-none cursor-pointer"
            >
              <option value="__all">Todos los estados</option>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f2f3f6] border-b border-[#e2e8f0]">
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Ticket #</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Solicitante</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Tipo</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Prioridad</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Estado</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Registrado por</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Cerrado por</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Fecha</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {paged.map((t) => {
                  const d = new Date(t.fechaCreacion);
                  return (
                    <tr key={t.nro} className="hover:bg-[#f2f3f6]/50 transition-colors">
                      <td className="px-6 py-4 text-body-bold text-[#005da9]">
                        {formatCode("TK", t.nro)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-body-bold text-[#191c1e]">{t.solicitante}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-body-base text-[#191c1e]">{t.tipo}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-body-base ${sevColor(t.severidad)}`}>
                          <span className={`w-2 h-2 rounded-full ${sevDot(t.severidad)}`} />
                          {t.severidad}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${estadoPill(t.estado)}`}>
                          {t.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-base text-[#191c1e]">{t.registradoPor}</td>
                      <td className="px-6 py-4 text-body-base text-[#191c1e]">{t.cerradoPor || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="text-body-bold text-[#191c1e]">{format(d, "dd MMM,")}</div>
                        <div className="text-label-sm text-[#575f67]">{format(d, "HH:mm")}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setViewing(t)}
                            className="p-1.5 rounded-md hover:bg-[rgba(0,93,169,0.1)] hover:text-[#005da9] transition-all text-[#575f67]"
                            title="Ver"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>visibility</span>
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => confirmDelete(t)}
                              disabled={t.estado === "Cerrado"}
                              className={`p-1.5 rounded-md transition-all text-[#575f67] ${t.estado === "Cerrado" ? "opacity-40 cursor-not-allowed" : "hover:bg-[rgba(186,26,26,0.1)] hover:text-[#ba1a1a]"}`}
                              title={t.estado === "Cerrado" ? "No es posible eliminar casos cerrados" : "Eliminar"}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-[#64748b]">Sin resultados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f8f9fc] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-label-sm text-[#575f67]">Mostrando {filtered.length} tickets</span>
              <div className="flex items-center gap-1">
                {getPaginationItems(currentPage, totalPages).map((item, i) => {
                  if (item.type === "prev") {
                    return (
                      <button key="prev" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={item.disabled}
                        className="w-8 h-8 flex items-center justify-center rounded border border-[#e2e8f0] text-[#575f67] hover:bg-[#e7e8eb] transition-all disabled:opacity-50">
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_left</span>
                      </button>
                    );
                  }
                  if (item.type === "next") {
                    return (
                      <button key="next" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={item.disabled}
                        className="w-8 h-8 flex items-center justify-center rounded border border-[#e2e8f0] text-[#575f67] hover:bg-[#e7e8eb] transition-all disabled:opacity-50">
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>chevron_right</span>
                      </button>
                    );
                  }
                  if (item.type === "ellipsis") {
                    return <span key={"e" + i} className="px-2 text-[#575f67]">…</span>;
                  }
                  return (
                    <button key={item.page} onClick={() => setPage(item.page)}
                      className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-all ${item.page === currentPage ? "bg-[#005da9] text-white shadow-sm" : "border border-[#e2e8f0] text-[#575f67] hover:bg-[#e7e8eb]"}`}>
                      {item.page}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {viewing && (
          <TicketDetailModal
            ticket={viewing}
            onClose={() => setViewing(null)}
            onChanged={(t) => setViewing(t)}
          />
        )}
        {showNewTicket && (
          <NewTicketModal onClose={() => setShowNewTicket(false)} />
        )}
        <AlertDialog
          open={!!ticketToDelete}
          onOpenChange={(open) => !open && setTicketToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar ticket?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el ticket{" "}
                <strong>{ticketToDelete ? formatCode("TK", ticketToDelete.nro) : ""}</strong> de{" "}
                <strong>{ticketToDelete?.solicitante}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTicketToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-32 text-muted-foreground">{k}:</div>
      <div className="flex-1 text-foreground">{v}</div>
    </div>
  );
}

const EDITABLE_ESTADOS: Estado[] = [
  "En atención",
  "Esperando Respuesta",
  "Cliente no responde",
  "Actualizado",
  "Cerrado",
];

function TicketDetailModal({
  ticket,
  onClose,
  onChanged,
}: {
  ticket: Ticket;
  onClose: () => void;
  onChanged: (t: Ticket) => void;
}) {
  const currentUser = useCurrentUser();
  const { can } = usePermissions();
  const isClosed = ticket.estado === "Cerrado";
  const canReopen = can("reopen_closed_cases");
  const locked = isClosed && !canReopen;
  const initialEstado: Estado = ticket.estado === "Pendiente" ? "En atención" : ticket.estado;
  const [estado, setEstado] = useState<Estado>(initialEstado);
  const [noteText, setNoteText] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const sendingLock = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setNoteFiles((p) => [...p, ...files]);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (sendingLock.current || locked) return;
    if (!noteText.trim() && noteFiles.length === 0) {
      toast.error("Escribe una nota o adjunta un archivo", { duration: 3000 });
      return;
    }
    sendingLock.current = true;
    setSending(true);
    try {
      const usuario = currentUser.username || currentUser.name || "Usuario";
      await addTicketNote(ticket.nro, {
        estado,
        nota: noteText.trim(),
        usuario,
        attachments: noteFiles,
      });
      const updated = getTickets().find((t) => t.nro === ticket.nro);
      if (updated) onChanged(updated);
      setNoteText("");
      setNoteFiles([]);
      toast.success("Nota agregada", { duration: 3000 });
    } finally {
      sendingLock.current = false;
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-md shadow-xl border border-border w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-t-2 border-[#005da9]" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h3 className="text-base font-semibold">
            Detalle de ticket {formatCode("TK", ticket.nro)} - {ticket.tipo}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm overflow-y-auto flex-1">
          {(() => {
            const descNote = ticket.notes.find((n) => n.nota?.startsWith("__DESCRIPCION__:"));
            const desc = descNote ? descNote.nota.replace(/^__DESCRIPCION__:/, "").trim() : "";
            if (desc) {
              return (
                <div className="rounded-md border-l-4 border-[#005da9] bg-[color-mix(in_oklab,#005da9_6%,transparent)] p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#005da9] mb-1">
                    Descripción del caso
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">{desc}</div>
                </div>
              );
            }
            return null;
          })()}
          <div className="space-y-2">
            {(() => {
              const d = new Date(ticket.fechaCreacion);
              const fecha = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              return <Row k="Registrado el" v={fecha} />;
            })()}
            {ticket.departamento && <Row k="Departamento" v={ticket.departamento} />}
            <Row k="Solicitante" v={ticket.solicitante} />
            {ticket.contratante && <Row k="Contratante" v={ticket.contratante} />}
            {ticket.celular && <Row k="Celular" v={ticket.celular} />}
            {ticket.poliza && <Row k="Póliza" v={ticket.poliza} />}

            {ticket.tipoAsistencia && <Row k="Tipo de asistencia" v={ticket.tipoAsistencia} />}

            <Row k="Registrado por" v={ticket.registradoPor} />
            <div className="flex gap-3 items-center">
              <div className="w-32 text-muted-foreground">Estado:</div>
              <select
                value={estado}
                disabled={locked}
                onChange={(e) => setEstado(e.target.value as Estado)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#005da9] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {EDITABLE_ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Row k="Cerrado por" v={ticket.cerradoPor} />
          </div>

          <div>
            <div className="text-muted-foreground text-xs mb-1 font-semibold uppercase tracking-wide">
              Adjuntos del ticket
            </div>
            <div className="rounded border border-border bg-muted/20 p-3">
              {ticket.attachments.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sin adjuntos</div>
              ) : (
                <AttachmentList items={ticket.attachments} />
              )}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground text-xs mb-1 font-semibold uppercase tracking-wide">
              Notas del ticket
            </div>

            {locked && (
              <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                No tienes permiso para modificar casos cerrados.
              </div>
            )}
            <div className="rounded border border-border bg-muted/10 p-3 space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                disabled={locked}
                placeholder={
                  locked ? "Caso cerrado — sin permiso para editar" : "Escribe una nota…"
                }
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#005da9] disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {noteFiles.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {noteFiles.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded bg-card px-2 py-1 border border-border"
                    >
                      <span className="truncate">{f.name}</span>
                      <button
                        onClick={() => setNoteFiles((p) => p.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={locked}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-card hover:bg-muted text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Adjuntar"
                >
                  <Paperclip className="h-3.5 w-3.5 text-[#005da9]" /> Adjuntar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={handleAttach}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || locked}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#005da9" }}
                >
                  <Send className="h-3.5 w-3.5" /> Enviar
                </button>
              </div>
            </div>

              <div className="mt-4">
              <div className="text-foreground text-sm mb-2 font-semibold">Historial</div>
              <div className="rounded border border-border bg-card overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr className="text-left text-foreground">
                        <th className="px-3 py-2 font-semibold w-32">Fecha</th>
                        <th className="px-3 py-2 font-semibold w-28">Estado</th>
                        <th className="px-3 py-2 font-semibold">Nota</th>
                        <th className="px-3 py-2 font-semibold w-40">Adjuntos</th>
                        <th className="px-3 py-2 font-semibold w-44">Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticket.notes.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-4 text-center text-muted-foreground italic"
                          >
                            Aún no hay notas registradas.
                          </td>
                        </tr>
                      )}
                      {[...ticket.notes]
                        .filter((n) => !n.nota?.startsWith("__DESCRIPCION__:"))
                        .reverse()
                        .map((n, idx) => {
                          const d = new Date(n.fecha);
                          const fecha = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                          return (
                            <tr
                              key={n.id}
                              className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                            >
                              <td className="px-3 py-3 align-top whitespace-pre-line text-foreground">
                                {fecha.replace(" ", "\n")}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <HistoryBadge estado={n.estado} />
                              </td>
                              <td className="px-3 py-3 align-top text-foreground">
                                <div className="whitespace-pre-line">
                                  {n.nota || <em className="text-muted-foreground">(sin texto)</em>}
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top">
                                {n.attachments.length > 0 ? (
                                  <NoteAttachmentList items={n.attachments} />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 align-top text-foreground">{n.usuario}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-muted/20 shrink-0">
          <button
            onClick={() => downloadTicketPDF(ticket)}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-input text-sm hover:bg-muted"
          >
            <FileDown className="h-3.5 w-3.5" /> Descargar PDF
          </button>
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-md border border-input text-sm hover:bg-muted"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [prioridad, setPrioridad] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim() || !prioridad) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);
    try {
      const usuario = getUserProfile().name || "Usuario";
      const t = await addTicket({
        solicitante: nombre.trim() || "Sin nombre",
        celular: celular.trim() || undefined,
        tipo: "Derivado a Conecta",
        severidad: prioridad as any,
        registradoPor: usuario,
      });
      if (t) {
        await supabase.from("ticket_notes").insert({
          ticket_id: t.id,
          fecha: t.fechaCreacion,
          estado: "Pendiente",
          nota: `__DESCRIPCION__:${descripcion.trim()}`,
          usuario,
        });
        toast.success(`Ticket #${t.nro} registrado`);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-[#e2e8f0] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] shrink-0">
          <h2 className="text-lg font-semibold text-[#191c1e]">Nuevo ticket</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="space-y-1.5">
              <label className="text-label-sm text-[#414752]">Nombre del Cliente</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente" className="form-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-label-sm text-[#414752]">Celular</label>
              <input type="text" value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="Celular del cliente" className="form-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-label-sm text-[#414752]">
                Prioridad <span className="text-[#005da9]"> *</span>
              </label>
              <div ref={ref} className="relative">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="w-full h-10 flex items-center justify-between rounded-md border border-[#d1d5db] bg-[#f2f3f6] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,93,169,0.1)] focus:border-[#005da9] transition-all"
                >
                  <span className={prioridad ? "text-[#191c1e]" : "text-[#64748b]"}>
                    {prioridad || "Seleccione la prioridad"}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </button>
                {open && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-[#e2e8f0] bg-white shadow-lg py-1 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                    {["Baja", "Media", "Alta"].map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => { setPrioridad(opt); setOpen(false); }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-label-sm text-[#414752]">
              Descripción del caso <span className="text-[#005da9]"> *</span>
            </label>
            <textarea
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del ticket"
              className="form-input resize-y"
              style={{ height: "auto", padding: "0.5rem 0.75rem" }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-md border border-[#d1d5db] text-sm text-[#575f67] hover:bg-[#e7e8eb] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-md bg-[#005da9] hover:bg-[#2868b3] text-white text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryBadge({ estado }: { estado: Estado }) {
  const map: Record<Estado, string> = {
    Pendiente: "bg-emerald-500 text-white border-transparent",
    "En atención": "bg-sky-500 text-white border-transparent",
    "Esperando Respuesta": "bg-amber-200 text-amber-900 border-transparent",
    "Cliente no responde": "bg-cyan-500 text-white border-transparent",
    Actualizado: "bg-emerald-500 text-white border-transparent",
    Cerrado: "bg-rose-500 text-white border-transparent",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${map[estado]}`}
    >
      {estado}
    </span>
  );
}

function AttachmentList({ items }: { items: TicketAttachment[] }) {
  const images = useMemo(() => items.filter((a) => a.type.startsWith("image/")), [items]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const prev = () => setPreviewIdx((i) => (i !== null && i > 0 ? i - 1 : images.length - 1));
  const next = () => setPreviewIdx((i) => (i !== null && i < images.length - 1 ? i + 1 : 0));

  useEffect(() => {
    if (previewIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "Escape") { e.preventDefault(); setPreviewIdx(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewIdx]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {items.map((a, i) => {
          const isImg = a.type.startsWith("image/");
          return (
            <div key={i} className="group relative">
              {isImg ? (
                <button type="button" onClick={() => setPreviewIdx(images.indexOf(a))} className="block">
                  <img
                    src={supabase.storage.from("ticket-attachments").getPublicUrl(a.storage_path).data.publicUrl}
                    alt={a.name}
                    className="h-16 w-16 rounded-md border border-[#e2e8f0] object-cover hover:opacity-80 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                  />
                  <div className="hidden flex items-center gap-1 text-xs text-[#005da9]">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate max-w-[120px]">{a.name}</span>
                  </div>
                </button>
              ) : (
                <button type="button" onClick={() => openAttachment(a)} className="flex items-center gap-1 text-xs text-[#005da9] hover:underline p-1 rounded border border-[#e2e8f0] hover:bg-[#f2f3f6] transition-colors">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[120px]">{a.name}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {previewIdx !== null && images.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
          onClick={() => setPreviewIdx(null)}
        >
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="fixed left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-[#191c1e] transition-colors z-30"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="fixed right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-[#191c1e] transition-colors z-30"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <button
            onClick={() => setPreviewIdx(null)}
            className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-[#191c1e] transition-colors z-30"
          >
            <X className="h-5 w-5" />
          </button>

          <div onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center">
              <img
                src={supabase.storage.from("ticket-attachments").getPublicUrl(images[previewIdx].storage_path).data.publicUrl}
                alt={images[previewIdx].name}
                className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
              />
            </div>
            <div className="flex justify-center mt-3">
              <span className="px-3 py-1 rounded-full bg-black/50 text-white text-xs">
                {images[previewIdx].name}
                {images.length > 1 && ` (${previewIdx + 1} / ${images.length})`}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NoteAttachmentList({ items }: { items: TicketAttachment[] }) {
  const images = useMemo(() => items.filter((a) => a.type.startsWith("image/")), [items]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const prev = () => setPreviewIdx((i) => (i !== null && i > 0 ? i - 1 : images.length - 1));
  const next = () => setPreviewIdx((i) => (i !== null && i < images.length - 1 ? i + 1 : 0));

  useEffect(() => {
    if (previewIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "Escape") { e.preventDefault(); setPreviewIdx(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewIdx]);

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {items.map((a, i) => {
          const isImg = a.type.startsWith("image/");
          return (
            <div key={i}>
              {isImg ? (
                <button type="button" onClick={() => setPreviewIdx(images.indexOf(a))} className="block">
                  <img
                    src={supabase.storage.from("ticket-attachments").getPublicUrl(a.storage_path).data.publicUrl}
                    alt={a.name}
                    className="h-10 w-10 rounded border border-[#e2e8f0] object-cover hover:opacity-80 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                  />
                  <div className="hidden flex items-center gap-1 text-xs text-[#005da9]">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[80px]">{a.name}</span>
                  </div>
                </button>
              ) : (
                <button type="button" onClick={() => openAttachment(a)} className="flex items-center gap-1 text-xs text-[#005da9] hover:underline p-1 rounded border border-[#e2e8f0] hover:bg-[#f2f3f6] transition-colors">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[80px]">{a.name}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {previewIdx !== null && images.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
          onClick={() => setPreviewIdx(null)}
        >
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="fixed left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-[#191c1e] transition-colors z-30"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="fixed right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-[#191c1e] transition-colors z-30"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <button
            onClick={() => setPreviewIdx(null)}
            className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-[#191c1e] transition-colors z-30"
          >
            <X className="h-5 w-5" />
          </button>

          <div onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center">
              <img
                src={supabase.storage.from("ticket-attachments").getPublicUrl(images[previewIdx].storage_path).data.publicUrl}
                alt={images[previewIdx].name}
                className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
              />
            </div>
            <div className="flex justify-center mt-3">
              <span className="px-3 py-1 rounded-full bg-black/50 text-white text-xs">
                {images[previewIdx].name}
                {images.length > 1 && ` (${previewIdx + 1} / ${images.length})`}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
