import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { addTicket } from "@/lib/tickets-store";
import { getUserProfile } from "@/lib/user-store";
import { toast } from "sonner";
import { PhoneInput } from "@/components/PhoneInput";

export const Route = createFileRoute("/_authenticated/tickets/registrar")({
  head: () => ({
    meta: [
      { title: "Registrar ticket — DOKKA Desk" },
      { name: "description", content: "Registrar un nuevo ticket." },
    ],
  }),
  component: RegistrarTicketPage,
});

function RegistrarTicketPage() {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <PageHeader title="Registrar ticket" subtitle="Completa los datos del nuevo ticket." />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <TicketCard />
      </main>
    </div>
  );
}

function TicketCard() {
  const navigate = useNavigate();
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

  const goBack = () => navigate({ to: "/tickets/listado" });

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
        // Guardar descripción del caso como atributo en el ticket vía nota inicial oculta NO,
        // mejor mantenerla como descripción y persistirla como nota especial para no perder info.
        // Pero el usuario pidió que NO se convierta en nota. Guardamos la descripción como nota
        // con un marcador para que el modal pueda mostrarla como "Descripción del caso".
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("ticket_notes").insert({
          ticket_id: t.id,
          fecha: t.fechaCreacion,
          estado: "Pendiente",
          nota: `__DESCRIPCION__:${descripcion.trim()}`,
          usuario,
        });
        toast.success(`Ticket #${t.nro} registrado`);
      }
      goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#c1c7d4] rounded-xl shadow-sm overflow-hidden">
      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <Field label="Nombre del Cliente">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingrese el nombre del cliente"
              className="form-input"
            />
          </Field>
          <Field label="Celular">
            <PhoneInput
              value={celular}
              onChange={(v) => setCelular(v)}
              placeholder="Celular del cliente"
              className="form-input"
            />
          </Field>
          <Field label="Prioridad" required>
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
                      onClick={() => {
                        setPrioridad(opt);
                        setOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </div>

        <Field label="Descripción del caso" required>
          <textarea
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ingresa una pequeña descripción del ticket registrado"
            className="form-input resize-y"
            style={{ height: "auto", padding: "0.5rem 0.75rem" }}
          />
        </Field>

        <div className="pt-4 border-t border-[#e2e8f0] flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[#575f67] hover:bg-[#3f484f] text-white text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[#005da9] hover:bg-[#2868b3] text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
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
      <label className="block text-label-sm text-[#414752]">
        {label}
        {required && <span className="text-[#005da9]"> *</span>}
      </label>
      {children}
    </div>
  );
}
