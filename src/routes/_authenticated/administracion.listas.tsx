import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppTopBar } from "@/components/AppTopBar";
import { useAuth } from "@/lib/auth";
import {
  useMasterList,
  addListItem,
  updateListItem,
  deleteListItem,
  type ListKey,
  type ListItem,
} from "@/lib/master-lists";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/administracion/listas")({
  ssr: false,
  head: () => ({ meta: [{ title: "Listas maestras — DOKKA Desk" }] }),
  component: ListasPage,
});

const TABS: { key: ListKey; label: string; icon: string; withPhone?: boolean; withDept?: boolean }[] = [
  { key: "ejecutivos", label: "Ejecutivos", icon: "person", withPhone: true },
  { key: "correos", label: "Correos", icon: "mail", withDept: true },
  { key: "asist_mascotas", label: "Asist. Mascotas", icon: "pets" },
  { key: "asist_bici", label: "Asist. Bici", icon: "pedal_bike" },
  { key: "asist_automotor", label: "Asist. Automotor", icon: "directions_car" },
  { key: "asist_hogar", label: "Asist. Hogar", icon: "home" },
];

const ICON_MAP: Record<ListKey, string> = {
  ejecutivos: "person",
  correos: "mail",
  departamentos: "map",
  asist_mascotas: "pets",
  asist_bici: "pedal_bike",
  asist_automotor: "directions_car",
  asist_hogar: "home",
};

function ListasPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("administrador");
  const [active, setActive] = useState<ListKey>("ejecutivos");
  const items = useMasterList(active);
  const tab = TABS.find((t) => t.key === active)!;

  const [editing, setEditing] = useState<ListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [dept, setDept] = useState("");

  const nameLabel = tab.withDept ? "Correo" : "Nombre";

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setLabel("");
    setPhone("");
    setDept("");
  };
  const openEdit = (it: ListItem) => {
    setCreating(false);
    setEditing(it);
    setLabel(it.label);
    setPhone(((it.value as any)?.phone as string) ?? "");
    setDept(((it.value as any)?.department as string) ?? "");
  };
  const close = () => { setEditing(null); setCreating(false); };

  const save = async () => {
    if (!label.trim()) return;
    const value: Record<string, unknown> = {};
    if (tab.withPhone) value.phone = phone.trim();
    if (tab.withDept) value.department = dept.trim();
    if (creating) await addListItem(active, label.trim(), value);
    else if (editing) await updateListItem(editing.id, { label: label.trim(), value });
    close();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este elemento?")) return;
    await deleteListItem(id);
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.[0] ?? "?").toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground flex flex-col">
      <AppTopBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-headline-md text-[#191c1e]">Listas Maestras</h1>
            <p className="text-body-base text-[#575f67] mt-1">Gestión centralizada de catálogos y configuraciones del sistema.</p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="bg-[#005da9] hover:bg-[#2868b3] text-white px-6 h-10 rounded-md font-body-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>add</span>
              Añadir Nuevo
            </button>
          )}
        </div>

        {!isAdmin && (
          <p className="mb-4 text-sm text-muted-foreground">Solo administradores pueden editar las listas.</p>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden mb-6">
          <div className="flex border-b border-[#e2e8f0] overflow-x-auto bg-[#f2f3f6]">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`px-6 py-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  active === t.key
                    ? "border-[#005da9] text-[#005da9] bg-white font-body-bold"
                    : "border-transparent text-[#575f67] hover:text-[#005da9] hover:bg-white/50 font-body-medium"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 border-b border-[#e2e8f0] flex flex-col sm:flex-row gap-4 items-center justify-between bg-white">
            <div className="relative w-full sm:max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#717783]" style={{ fontSize: "20px" }}>search</span>
              <input
                className="w-full pl-10 pr-4 h-10 border border-[#d1d5db] rounded-md text-body-base bg-[#f8f9fc] focus:ring-2 focus:ring-[#005da9]/40 focus:border-[#005da9] outline-none transition-all"
                placeholder={`Buscar ${tab.label.toLowerCase()}...`}
                value=""
                onChange={() => {}}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-label-sm text-[#575f67]">{items.length} registros</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f2f3f6] border-b border-[#e2e8f0]">
                  {tab.withDept && <th className="px-6 py-3 text-label-caps text-[#575f67]">Departamento</th>}
                  <th className="px-6 py-3 text-label-caps text-[#575f67]">{nameLabel}</th>
                  {tab.withPhone && <th className="px-6 py-3 text-label-caps text-[#575f67]">Celular</th>}
                  {isAdmin && <th className="px-6 py-3 text-label-caps text-[#575f67] text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Sin elementos.</td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#f2f3f6]/50 transition-colors group">
                      {tab.withDept && (
                        <td className="px-6 py-4 text-body-base text-[#575f67]">{(it.value as any)?.department ?? "—"}</td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {tab.withPhone ? (
                            <div className="w-8 h-8 rounded-full bg-[rgba(0,93,169,0.1)] text-[#005da9] flex items-center justify-center font-bold text-xs">
                              {initials(it.label)}
                            </div>
                          ) : null}
                          <span className="text-body-bold text-[#191c1e]">{it.label}</span>
                        </div>
                      </td>
                      {tab.withPhone && (
                        <td className="px-6 py-4 text-body-base text-[#575f67]">{(it.value as any)?.phone ?? "—"}</td>
                      )}
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(it)}
                              className="p-2 text-[#575f67] hover:text-[#005da9] hover:bg-[rgba(0,93,169,0.1)] rounded-md transition-all"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>edit</span>
                            </button>
                            <button
                              onClick={() => remove(it.id)}
                              className="p-2 text-[#575f67] hover:text-[#ba1a1a] hover:bg-[rgba(186,26,26,0.1)] rounded-md transition-all"
                              title="Eliminar"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between bg-white">
            <span className="text-label-sm text-[#575f67]">Mostrando {items.length} registros</span>
          </div>
        </div>
      </main>

      <Dialog open={creating || !!editing} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{creating ? "Añadir nuevo elemento" : "Editar elemento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {tab.withDept && (
              <div className="space-y-1.5">
                <label className="text-label-sm text-[#414752]">Departamento</label>
                <input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Ej. Santa Cruz" className="form-input" autoFocus />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-label-sm text-[#414752]">{nameLabel}</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tab.withDept ? "correo@dominio.com" : ""} className="form-input" autoFocus={!tab.withDept} />
            </div>
            {tab.withPhone && (
              <div className="space-y-1.5">
                <label className="text-label-sm text-[#414752]">Celular</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" />
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={close} className="h-10 px-4 rounded-md bg-[#575f67] text-white text-sm hover:bg-[#3f484f]">Cancelar</button>
            <button onClick={save} className="h-10 px-4 rounded-md bg-[#005da9] text-white text-sm font-medium hover:bg-[#2868b3]">Guardar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
