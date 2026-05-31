import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Search, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { ShareReportModal } from "@/components/ShareReportModal";
import { DownloadMenu } from "@/components/DownloadMenu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { useMasterList } from "@/lib/master-lists";
import { exportAPPDF, exportAPXLSX, type ReportAPRow } from "@/lib/report-exports";
import { PhoneInput } from "@/components/PhoneInput";
import { getPaginationItems } from "@/lib/pagination";
import { formatCode } from "@/lib/utils";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reportes/accidentes-personales")({
  ssr: false,
  head: () => ({ meta: [{ title: "Accidentes Personales — DOKKA Desk" }] }),
  component: APPage,
});

type Row = ReportAPRow & { id: string };

const YESNO = ["Sí", "No"];

const today = () => new Date().toISOString().slice(0, 10);

function APPage() {
  const { profile, user } = useAuth();
  const { can } = usePermissions();
  const canDownload = can("download_records");
  const canDeleteReport = can("delete_reports");
  const canShare = can("share_reports");

  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Row | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [toShare, setToShare] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const ejecutivos = useMasterList("ejecutivos");
  const correos = useMasterList("correos");
  const departamentos = useMemo(
    () => [...new Set(correos.map((c) => ((c.value as any)?.department as string) ?? "").filter(Boolean))],
    [correos],
  );

  const colaborador = profile?.full_name || profile?.username || user?.email || "";

  const empty = useMemo(
    () => ({
      colaborador,
      fecha_solicitud: today(),
      fecha_siniestro: today(),
      nombre_accidentado: "",
      carnet_accidentado: "",
      solicitante: "",
      celular: "",
      departamento: "",
      poliza: "",
      direccion: "",
      descripcion: "",
      ejecutivo_nombre: "",
      ejecutivo_celular: "",
      intentos_llamada: "",
      observaciones: "",
      hubo_tripartita: "",
      hora_contacto: "",
    }),
    [colaborador],
  );

  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, val: string) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };
  useEffect(() => {
    setForm((f) => ({ ...f, colaborador }));
  }, [colaborador]);

  const load = async () => {
    const { data } = await supabase
      .from("reportes_ap")
      .select("*")
      .order("nro", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
  };
  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const onEjecutivo = (label: string) => {
    const it = ejecutivos.find((e) => e.label === label);
    setForm((f) => ({
      ...f,
      ejecutivo_nombre: label,
      ejecutivo_celular: (it?.value as any)?.phone ?? "",
    }));
  };

  const submit = async () => {
    const required = [
      "fecha_solicitud", "fecha_siniestro", "nombre_accidentado", "carnet_accidentado",
      "solicitante", "celular", "departamento", "poliza", "direccion", "descripcion",
      "ejecutivo_nombre", "intentos_llamada", "hubo_tripartita", "hora_contacto",
    ] as const;
    const newErrors: Record<string, string> = {};
    for (const field of required) {
      if (!(form as any)[field]?.toString().trim()) {
        newErrors[field] = "Campo obligatorio";
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Completa todos los campos");
      return;
    }
    setSaving(true);
    try {
      await supabase.from("reportes_ap").insert({ ...form, created_by: user?.id ?? null });
      setForm(empty);
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await supabase.from("reportes_ap").delete().eq("id", toDelete.id);
    toast.success(`Reporte #${toDelete.nro} eliminado`);
    setToDelete(null);
    await load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.nro,
        r.created_at && format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
        r.nombre_accidentado,
        r.carnet_accidentado,
        r.solicitante,
        r.departamento,
        r.ejecutivo_nombre,
        r.colaborador,
        r.celular,
        r.poliza,
        r.direccion,
        r.descripcion,
        r.observaciones,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground flex flex-col">
      <AppTopBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#005da9] font-body-bold text-body-bold mb-1">
              <span className="material-symbols-outlined" style={{fontVariationSettings:'"FILL" 1',fontSize:"20px"}}>medical_information</span>
              <span className="uppercase tracking-wider text-[10px]">Gestión Técnica</span>
            </div>
            <h1 className="text-display-lg text-[#191c1e] tracking-tight">Reportes AP — Accidentes Personales</h1>
            <p className="text-[#414752] font-body-medium text-body-medium">Administración y seguimiento de Formulario F-775 de siniestros técnicos.</p>
          </div>
          <div className="flex items-center gap-2">
            <DownloadMenu
              hidden={!canDownload}
              onPDF={(r) => exportAPPDF(rows, r, profile?.full_name || (user?.email?.split("@")[0] ?? "Usuario"))}
              onExcel={(r) => exportAPXLSX(rows, r)}
            />
            <button
              onClick={() => { setOpen(true); setForm(empty); setErrors({}); }}
              className="flex items-center gap-2 bg-[#005da9] hover:bg-[#2868b3] text-white px-6 h-11 rounded-md font-body-bold text-body-bold transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined" style={{fontSize:"20px"}}>add</span>
              Nuevo registro
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#414752]" style={{fontSize:"20px"}}>search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-md border border-[#d1d5db] bg-[#f2f3f6] focus:border-[#005da9] focus:ring-4 focus:ring-[rgba(0,93,169,0.1)] text-body-medium transition-all outline-none"
              placeholder="Filtrar por Ticket, Accidentado o Carnet..."
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select className="h-10 rounded-md border border-[#d1d5db] text-body-medium bg-[#f2f3f6] px-3 outline-none focus:ring-2 focus:ring-[rgba(0,93,169,0.1)] min-w-[140px]">
              <option>Todo el tiempo</option>
              <option>Últimos 30 días</option>
              <option>Este año</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
                <tr className="bg-[#f2f3f6] border-b border-[#e2e8f0]">
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Ticket #</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Fecha</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Accidentado</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Carnet</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Departamento</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752]">Colaborador</th>
                  <th className="px-6 py-4 text-label-caps text-[#414752] text-right">Acciones</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Sin registros.
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const d = r.created_at ? new Date(r.created_at) : null;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[#f2f3f6]/50 cursor-pointer transition-colors"
                      onClick={() => setPreview(r)}
                    >
                      <td className="px-6 py-4"><span className="font-body-bold text-[#005da9]">{formatCode("AP", r.nro)}</span></td>
                      <td className="px-6 py-4 text-[#414752] font-body-base text-body-base">
                        {d ? (
                          <>
                            <div>{format(d, "dd/MM/yyyy")}</div>
                            <div className="text-xs">{format(d, "HH:mm")}</div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-body-medium text-[#191c1e]">{r.nombre_accidentado ?? "-"}</span>
                          <span className="text-[#64748b] text-[13px]">Sol.: {r.solicitante ?? "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-body-medium text-[#575f67]">{r.carnet_accidentado ?? "-"}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full bg-[#d8e1ea] text-[#5b646b] text-[11px] font-bold uppercase">{r.departamento ?? "-"}</span>
                      </td>
                      <td className="px-6 py-4 text-[#414752] font-body-base text-body-base">{r.colaborador}</td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {canShare && (
                            <button onClick={() => setToShare(r)} className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center" title="Compartir">
                              <span className="material-symbols-outlined" style={{fontSize:"20px"}}>share</span>
                            </button>
                          )}
                          {canDeleteReport && (
                            <button onClick={() => setToDelete(r)} className="w-10 h-10 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center" title="Eliminar">
                              <span className="material-symbols-outlined" style={{fontSize:"20px"}}>delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1">
            {getPaginationItems(currentPage, totalPages).map((item, i) => {
              if (item.type === "prev") {
                return (
                  <button
                    key="prev"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={item.disabled}
                    className="h-8 min-w-8 px-2 rounded-md text-sm border border-input hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                );
              }
              if (item.type === "next") {
                return (
                  <button
                    key="next"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={item.disabled}
                    className="h-8 min-w-8 px-2 rounded-md text-sm border border-input hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              }
              if (item.type === "ellipsis") {
                return <span key={"e" + i} className="px-1 text-muted-foreground select-none">…</span>;
              }
              return (
                <button
                  key={item.page}
                  onClick={() => setPage(item.page)}
                  className={`h-8 min-w-8 px-2 rounded-md text-sm transition-colors ${
                    item.page === currentPage
                      ? "bg-[#005da9] text-white"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {item.page}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl flex flex-col my-8">
            <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f2f3f6] rounded-t-xl">
              <h2 className="text-headline-sm text-[#191c1e]">Nuevo registro — Accidentes Personales</h2>
              <button onClick={() => setOpen(false)} className="material-symbols-outlined text-[#575f67] hover:bg-[#e7e8eb] p-2 rounded-full transition-colors" style={{ fontSize: "24px" }}>close</button>
            </div>
            <form className="p-6 space-y-8" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#e2e8f0]">
                    <span className="material-symbols-outlined text-[#005da9] text-[20px]">person</span>
                    <h3 className="text-body-bold text-[#191c1e] uppercase tracking-wider">Información del accidente</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Colaborador">
                      <input disabled value={form.colaborador} className="form-input opacity-70" />
                    </Field>
                    <Field label="Fecha de solicitud" error={errors.fecha_solicitud}>
                      <input type="date" value={form.fecha_solicitud} onChange={(e) => set("fecha_solicitud", e.target.value)} className="form-input" />
                    </Field>
                    <Field label="Fecha de siniestro" error={errors.fecha_siniestro}>
                      <input type="date" value={form.fecha_siniestro} onChange={(e) => set("fecha_siniestro", e.target.value)} className="form-input" />
                    </Field>
                    <Field label="Nombre del accidentado" error={errors.nombre_accidentado}>
                      <input value={form.nombre_accidentado} onChange={(e) => set("nombre_accidentado", e.target.value)} className="form-input" placeholder="Nombre completo" />
                    </Field>
                    <Field label="Carnet del accidentado" error={errors.carnet_accidentado}>
                      <input value={form.carnet_accidentado} onChange={(e) => set("carnet_accidentado", e.target.value)} className="form-input" placeholder="N° de carnet" />
                    </Field>
                    <Field label="Solicitante" error={errors.solicitante}>
                      <input value={form.solicitante} onChange={(e) => set("solicitante", e.target.value)} className="form-input" placeholder="Nombre del solicitante" />
                    </Field>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#e2e8f0]">
                    <span className="material-symbols-outlined text-[#005da9] text-[20px]">contact_phone</span>
                    <h3 className="text-body-bold text-[#191c1e] uppercase tracking-wider">Contacto y ubicación</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Celular" error={errors.celular}>
                      <PhoneInput value={form.celular} onChange={(v) => set("celular", v)} className="form-input" />
                    </Field>
                    <Field label="Departamento" error={errors.departamento}>
                      <SelectBox value={form.departamento} onChange={(v) => set("departamento", v)} options={departamentos} />
                    </Field>
                    <Field label="Póliza" error={errors.poliza}>
                      <input value={form.poliza} onChange={(e) => set("poliza", e.target.value)} className="form-input" placeholder="N° de póliza" />
                    </Field>
                    <Field label="Dirección" full error={errors.direccion}>
                      <input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} className="form-input" placeholder="Calle, N° y Zona" />
                    </Field>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#e2e8f0]">
                    <span className="material-symbols-outlined text-[#005da9] text-[20px]">support_agent</span>
                    <h3 className="text-body-bold text-[#191c1e] uppercase tracking-wider">Gestión del caso</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Ejecutivo de cuenta" error={errors.ejecutivo_nombre}>
                      <SelectBox value={form.ejecutivo_nombre} onChange={onEjecutivo} options={ejecutivos.map((e) => e.label)} />
                    </Field>
                    <Field label="Celular del ejecutivo">
                      <PhoneInput value={form.ejecutivo_celular} onChange={(v) => setForm({ ...form, ejecutivo_celular: v })} className="form-input" />
                    </Field>
                    <Field label="Intentos de llamada" error={errors.intentos_llamada}>
                      <input type="number" min="0" value={form.intentos_llamada} onChange={(e) => set("intentos_llamada", e.target.value)} className="form-input" />
                    </Field>
                    <Field label="Hubo tripartita" error={errors.hubo_tripartita}>
                      <SelectBox value={form.hubo_tripartita} onChange={(v) => set("hubo_tripartita", v)} options={YESNO} />
                    </Field>
                    <Field label="Hora de contacto" error={errors.hora_contacto}>
                      <input type="time" value={form.hora_contacto} onChange={(e) => set("hora_contacto", e.target.value)} className="form-input" />
                    </Field>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#e2e8f0]">
                    <span className="material-symbols-outlined text-[#005da9] text-[20px]">description</span>
                    <h3 className="text-body-bold text-[#191c1e] uppercase tracking-wider">Detalles</h3>
                  </div>
                  <div className="space-y-4">
                    <Field label="Descripción" error={errors.descripcion}>
                      <textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} className="form-input" style={{ height: "auto", padding: "0.5rem 0.75rem" }} rows={3} placeholder="Detalles del accidente..." />
                    </Field>
                    <Field label="Observaciones">
                      <textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} className="form-input" style={{ height: "auto", padding: "0.5rem 0.75rem" }} rows={2} placeholder="Comentarios adicionales..." />
                    </Field>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
                <button type="button" onClick={() => setOpen(false)} className="px-6 h-10 rounded-md border border-[#d1d5db] font-body-bold text-body-bold text-[#575f67] hover:bg-[#e7e8eb] transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 h-10 rounded-md bg-[#005da9] hover:bg-[#2868b3] text-white font-body-bold text-body-bold shadow-sm transition-all disabled:opacity-60">{saving ? "Guardando…" : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el reporte{" "}
              <strong>{toDelete ? formatCode("AP", toDelete.nro) : ""}</strong> de{" "}
              <strong>{toDelete?.nombre_accidentado ?? "—"}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Accidentes Personales"
        nro={preview?.nro ?? ""}
        variant="ap"
        data={preview ?? undefined}
      />

      {toShare && (
        <ShareReportModal
          open={!!toShare}
          onClose={() => setToShare(null)}
          variant="ap"
          data={toShare as any}
        />
      )}
    </div>
  );
}

function Field({
  label,
  full,
  error,
  children,
}: {
  label: string;
  full?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2 space-y-1" : "space-y-1"}>
      <label className="text-label-sm text-[#414752]">{label}</label>
      {children}
      <div className="h-0 overflow-visible leading-none">
        <span className={`text-[11px] text-rose-600 ${error ? "" : "invisible"}`}>
          Campo obligatorio
        </span>
      </div>
    </div>
  );
}

function SelectBox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-10">
        <SelectValue placeholder="Seleccionar…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
