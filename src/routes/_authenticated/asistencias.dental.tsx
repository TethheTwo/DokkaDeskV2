import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppTopBar } from "@/components/AppTopBar";
import { useState, useRef } from "react";
import {
  ChevronDown,
  Save,
  X,
  UploadCloud,
  FileText,
} from "lucide-react";
import { addTicket, addTicketNote, type Severidad } from "@/lib/tickets-store";
import { getUserProfile } from "@/lib/user-store";
import { PhoneInput } from "@/components/PhoneInput";

export const Route = createFileRoute("/_authenticated/asistencias/dental")({
  head: () => ({
    meta: [
      { title: "Asistencia Dental — DOKKA Desk" },
      { name: "description", content: "Registrar nueva asistencia dental." },
    ],
  }),
  component: AsistenciaDentalPage,
});

function AsistenciaDentalPage() {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground flex flex-col">
      <AppTopBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-[#005da9] font-body-bold text-body-bold mb-1">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1', fontSize: "20px" }}>dentistry</span>
            <span className="uppercase tracking-wider text-[10px]">Asistencias</span>
          </div>
          <h1 className="text-display-lg text-[#191c1e]">Registrar nueva asistencia para dental</h1>
          <p className="text-body-lg text-[#414752]">Complete los campos para registrar una nueva asistencia para dental.</p>
        </header>
        <AsistenciaCard />
      </main>
    </div>
  );
}

const DEPARTAMENTOS = [
  "La Paz", "Santa Cruz", "Cochabamba", "Oruro", "Potosí",
  "Chuquisaca", "Tarija", "Beni", "Pando",
];

function AsistenciaCard() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({
    vigente: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setAttachments((prev) => [...prev, ...Array.from(list)]);
  };

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    if (e.target.files) e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const resetForm = () => {
    setForm({ vigente: "" });
    setAttachments([]);
  };

  const handleCancel = () => {
    resetForm();
    navigate({ to: "/tickets/listado" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const atts = attachments;
    const usuario = getUserProfile().name || "Usuario";
    const ticket = await addTicket({
      solicitante: (form.solicitante ?? "").trim() || "Sin nombre",
      contratante: (form.contratante ?? "").trim() || undefined,
      departamento: (form.departamento ?? "").trim() || undefined,
      celular: (form.celular ?? "").trim() || undefined,
      poliza: (form.poliza ?? "").trim() || undefined,
      tipo: "Asistencia Dental",
      tipoAsistencia: (form.tipoAsistencia ?? "").trim() || undefined,
      severidad: "Media" as Severidad,
      registradoPor: usuario,
      attachments: atts,
    });
    const extras: { label: string; value: string }[] = [
      { label: "Se encuentra vigente", value: (form.vigente ?? "").trim() },
    ].filter((f) => f.value);
    if (extras.length) {
      const nota = extras.map((f) => `${f.label}: ${f.value}`).join("\n");
      if (ticket)
        await addTicketNote(ticket.nro, {
          fecha: ticket.fechaCreacion,
          estado: "Pendiente",
          nota,
          usuario,
          attachments: [],
        });
    }
    resetForm();
    navigate({ to: "/tickets/listado" });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 md:p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#e2e8f0]">
            <span className="material-symbols-outlined text-[#005da9]" style={{fontSize:"20px",fontVariationSettings:'"FILL" 1'}}>person</span>
            <h3 className="text-body-bold text-[#191c1e] uppercase tracking-wider">Información del solicitante</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Nombre del solicitante" required>
              <input type="text" value={form.solicitante ?? ""} onChange={(e) => set("solicitante", e.target.value)} placeholder="Nombre del solicitante" className="form-input" />
            </Field>
            <Field label="Nombre del Contratante" required>
              <input type="text" value={form.contratante ?? ""} onChange={(e) => set("contratante", e.target.value)} placeholder="Nombre del contratante" className="form-input" />
            </Field>
            <Field label="Celular" required>
              <PhoneInput value={form.celular ?? ""} onChange={(v) => set("celular", v)} placeholder="Número de celular" className="form-input" />
            </Field>
            <Field label="Departamento" required>
              <SelectDepartamento value={form.departamento} onChange={(v) => set("departamento", v)} />
            </Field>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#e2e8f0]">
            <span className="material-symbols-outlined text-[#005da9]" style={{fontSize:"20px",fontVariationSettings:'"FILL" 1'}}>support_agent</span>
            <h3 className="text-body-bold text-[#191c1e] uppercase tracking-wider">Detalles de la asistencia</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Póliza" required>
              <input type="text" value={form.poliza ?? ""} onChange={(e) => set("poliza", e.target.value)} placeholder="Número de póliza" className="form-input" />
            </Field>
            <Field label="Tipo de asistencia" required>
              <div className="relative">
                <select value={form.tipoAsistencia ?? ""} onChange={(e) => set("tipoAsistencia", e.target.value)} className="form-input appearance-none pr-10 text-muted-foreground">
                  <option value="">Seleccione el tipo de asistencia</option>
                  <option value="Limpieza dental">Limpieza dental</option>
                  <option value="Extracción">Extracción</option>
                  <option value="Empaste">Empaste</option>
                  <option value="Endodoncia">Endodoncia</option>
                  <option value="Ortodoncia">Ortodoncia</option>
                  <option value="Urgencia">Urgencia</option>
                  <option value="Otro">Otro</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </Field>
            <Field label="Se encuentra vigente" required>
              <SelectSiNo value={form.vigente} onChange={(v) => set("vigente", v)} />
            </Field>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#e2e8f0]">
            <span className="material-symbols-outlined text-[#005da9] text-[20px]">attach_file</span>
            <h3 className="text-body-bold text-[#191c1e] uppercase tracking-wider">Adjuntos</h3>
          </div>
          <div className="space-y-1.5">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                dragOver
                  ? "border-[#005da9] bg-[rgba(0,93,169,0.1)]"
                  : "border-[#d1d5db] hover:border-[#005da9] hover:bg-[rgba(0,93,169,0.05)]"
              }`}
            >
              <UploadCloud className="h-10 w-10 text-[#575f67] mb-2" />
              <p className="text-body-medium text-[#575f67]">Haga clic o arrastre archivos aquí</p>
              <p className="text-label-sm text-muted-foreground mt-1">{attachments.length > 0 ? `${attachments.length} archivo(s) seleccionado(s)` : "PDF, JPG, PNG (máx. 10 MB)"}</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleAttach} />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#f2f3f6] rounded-md px-3 py-1.5 text-sm">
                    <FileText className="h-4 w-4 text-[#005da9]" />
                    <span className="truncate max-w-[140px]">{f.name}</span>
                    <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="text-[#ba1a1a] hover:text-[#93000a]"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
        <button type="button" onClick={handleCancel} className="px-6 h-10 rounded-md border border-[#d1d5db] font-body-bold text-body-bold text-[#575f67] hover:bg-[#e7e8eb] transition-all">Cancelar</button>
        <button type="submit" className="px-8 h-10 rounded-md bg-[#005da9] hover:bg-[#2868b3] text-white font-body-bold text-body-bold shadow-sm transition-all">Guardar</button>
      </div>
    </form>
  );
}

function SelectDepartamento({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="form-input appearance-none pr-10 text-muted-foreground">
        <option value="">Seleccione un departamento</option>
        {DEPARTAMENTOS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function SelectSiNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="form-input appearance-none pr-10 text-muted-foreground">
        <option value="">Seleccione una opción</option>
        <option value="Sí">Sí</option>
        <option value="No">No</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-label-sm text-[#414752]">
        {label}
        {required && <span className="text-[#005da9]"> *</span>}
      </label>
      {children}
    </div>
  );
}
