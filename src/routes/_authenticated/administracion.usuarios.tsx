import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil as PencilIcon, KeyRound as KeyIcon, Trash2 as TrashIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AppTopBar } from "@/components/AppTopBar";
import { PhoneInput } from "@/components/PhoneInput";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listManagedUsers,
  createManagedUser,
  updateManagedProfile,
  setManagedRoles,
  resetManagedPassword,
  deleteManagedUser,
  type AdminRole,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/administracion/usuarios")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gestión de usuarios — DOKKA Desk" },
      { name: "description", content: "Administración de usuarios y roles." },
    ],
  }),
  component: UsuariosAdminPage,
});

const ALL_ROLES: AdminRole[] = ["administrador", "supervisor", "operador", "addiuva"];
const ROLE_LABEL: Record<AdminRole, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
  addiuva: "Addiuva",
};

const ROLE_BADGE: Record<AdminRole, string> = {
  administrador: "bg-[#dbeafe] text-[#1d4ed8] ring-[#1d4ed8]/20",
  supervisor: "bg-[#d1fae5] text-[#047857] ring-[#047857]/20",
  operador: "bg-[#edeef1] text-[#575f67] ring-[#575f67]/20",
  addiuva: "bg-[#fee2e2] text-[#b91c1c] ring-[#b91c1c]/20",
};

type Row = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  roles: AdminRole[];
  avatar_url?: string | null;
};

function UsuariosAdminPage() {
  const { roles, loading: authLoading } = useAuth();
  const isAdmin = roles.includes("administrador");

  const fetchAll = useServerFn(listManagedUsers);
  const createFn = useServerFn(createManagedUser);
  const updateProfileFn = useServerFn(updateManagedProfile);
  const setRolesFn = useServerFn(setManagedRoles);
  const resetFn = useServerFn(resetManagedPassword);
  const deleteFn = useServerFn(deleteManagedUser);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [filterRole, setFilterRole] = useState<string>("__all");
  const [filterStatus, setFilterStatus] = useState<string>("__all");

  async function reload() {
    setLoading(true);
    try {
      const data = await fetchAll();
      setRows(data as Row[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) void reload();
  }, [authLoading, isAdmin]);

  const filtered = rows.filter((r) => {
    if (filterRole !== "__all" && !r.roles.includes(filterRole as AdminRole)) return false;
    if (filterStatus !== "__all" && r.status !== filterStatus) return false;
    return true;
  });

  if (!authLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <AppTopBar />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-xl font-semibold mb-2">Sin permisos</h1>
          <p className="text-muted-foreground">
            Solo administradores pueden acceder a la gestión de usuarios.
          </p>
          <Link to="/" className="text-[#005da9] hover:underline mt-4 inline-block">
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  async function quickSetRole(r: Row, role: AdminRole | "") {
    try {
      await setRolesFn({ data: { id: r.id, roles: role ? [role] : ([] as any) } });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Error al cambiar rol");
    }
  }

  async function setStatus(r: Row, next: "Activo" | "Inactivo") {
    if (next === r.status) return;
    try {
      await updateProfileFn({
        data: { id: r.id, full_name: r.full_name, status: next as any },
      });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Error");
    }
  }

  function initial(name: string, email: string) {
    const src = (name || email || "?").trim();
    const parts = src.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.charAt(0).toUpperCase();
  }

  const AVATAR_COLORS = [
    "#005da9", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#db2777", "#ca8a04", "#575f67",
  ];
  function avatarColor(id: string) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground flex flex-col">
      <AppTopBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-display-lg text-[#191c1e]">Administración</h1>
            <p className="text-body-lg text-muted-foreground">Gestiona el acceso y los roles de tu equipo de asistencia técnica.</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="h-10 px-6 bg-[#005da9] text-white rounded-md font-body-bold shadow-sm hover:bg-[#2868b3] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Nuevo usuario
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0] mb-8 flex flex-wrap gap-4 items-center">
          <span className="text-label-caps text-[#414752]">FILTRAR POR:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="h-9 px-3 rounded-md border border-[#d1d5db] text-body-medium bg-[#f8f9fc] focus:ring-1 focus:ring-[#005da9] outline-none"
          >
            <option value="__all">Todos los roles</option>
            {ALL_ROLES.map((rol) => (
              <option key={rol} value={rol}>{ROLE_LABEL[rol]}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-md border border-[#d1d5db] text-body-medium bg-[#f8f9fc] focus:ring-1 focus:ring-[#005da9] outline-none"
          >
            <option value="__all">Estado: Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <div className="ml-auto">
            <span className="text-label-sm text-muted-foreground">Mostrando {filtered.length} usuarios</span>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted-foreground py-10">Cargando…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((r) => {
              const primaryRole = r.roles[0];
              const isActive = r.status === "Activo";
              const badgeClass = primaryRole ? ROLE_BADGE[primaryRole] : "bg-muted text-muted-foreground";
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-md transition-shadow flex flex-col p-5 ${isActive ? "" : "opacity-75"}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="w-12 h-12 rounded-full border border-[#e2e8f0] object-cover" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-headline-sm"
                        style={{ backgroundColor: avatarColor(r.id) }}
                      >
                        {initial(r.full_name, r.email)}
                      </div>
                    )}
                    <div className="flex flex-col items-end gap-2">
                      {primaryRole && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${badgeClass}`}>
                          {ROLE_LABEL[primaryRole]}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        {isActive ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00873a] opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006b2c]" />
                            </span>
                            <span className="text-[10px] text-[#006b2c] font-bold tracking-wider">ACTIVO</span>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[#c1c7d4]" />
                            <span className="text-[10px] text-[#414752] font-bold tracking-wider">INACTIVO</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-headline-sm text-[#191c1e]">{r.full_name || r.email.split("@")[0]}</h3>
                    <p className="text-body-base text-muted-foreground">{r.email}</p>
                    {r.username && (
                      <p className="text-label-sm text-[#414752] mt-1">@{r.username}</p>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-[#e2e8f0] flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditing(r)}
                        className="p-2 text-[#414752] hover:bg-[#e7e8eb] rounded-md transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>edit</span>
                      </button>
                      <button
                        onClick={() => setResetTarget(r)}
                        className="p-2 text-[#414752] hover:bg-[#e7e8eb] rounded-md transition-colors"
                        title="Reiniciar Password"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>lock_reset</span>
                      </button>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select
                        value={primaryRole ?? "__none__"}
                        onValueChange={(v) => quickSetRole(r, v === "__none__" ? "" : (v as AdminRole))}
                      >
                        <SelectTrigger className="h-9 px-3 rounded-md bg-[#f8f9fc] border border-[#d1d5db] text-body-medium hover:bg-[#edeef1] gap-1 min-w-[100px]">
                          <SelectValue placeholder="Rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin rol</SelectItem>
                          {ALL_ROLES.map((rol) => (
                            <SelectItem key={rol} value={rol}>{ROLE_LABEL[rol]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={async () => {
                          if (!confirm(`¿Eliminar a ${r.email}? Esta acción no se puede deshacer.`))
                            return;
                          try {
                            await deleteFn({ data: { id: r.id } });
                            await reload();
                          } catch (e: any) {
                            alert(e?.message ?? "Error");
                          }
                        }}
                        className="p-2 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-md transition-colors"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setShowNew(true)}
              className="border-2 border-dashed border-[#c1c7d4] rounded-xl flex flex-col items-center justify-center p-8 hover:bg-[#edeef1] transition-all group min-h-[220px]"
            >
              <div className="w-14 h-14 rounded-full bg-[#edeef1] flex items-center justify-center text-[#c1c7d4] group-hover:bg-[rgba(0,93,169,0.1)] group-hover:text-[#005da9] transition-all mb-4">
                <span className="material-symbols-outlined" style={{ fontSize: "32px" }}>add</span>
              </div>
              <span className="text-body-bold text-[#414752] group-hover:text-[#005da9]">Registrar nuevo usuario</span>
              <span className="text-label-sm text-muted-foreground mt-1">Configura accesos de forma rápida</span>
            </button>
          </div>
        )}
      </main>

      {showNew && (
        <NewUserModal
          onClose={() => setShowNew(false)}
          onSave={async (payload) => {
            await createFn({ data: payload });
            setShowNew(false);
            await reload();
          }}
        />
      )}

      {editing && (
        <EditUserModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={async (p) => {
            await updateProfileFn({ data: { id: editing.id, ...p } });
          }}
          afterSave={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          row={resetTarget}
          onClose={() => setResetTarget(null)}
          onSave={async (password) => {
            await resetFn({ data: { id: resetTarget.id, password } });
            setResetTarget(null);
            alert("Contraseña actualizada");
          }}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  description,
  children,
  footer,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

function NewUserModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: { email: string; password: string; full_name: string; username: string; roles: AdminRole[] }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<AdminRole>("operador");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSaving(true);
    try {
      await onSave({ email, password, full_name: fullName, username, roles: [role] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Nuevo usuario"
      description="Crea una cuenta para un nuevo miembro del equipo."
      onClose={onClose}
      footer={
        <div className="flex gap-2 ml-auto">
          <button onClick={onClose} className="h-9 px-4 rounded-md bg-[#575f67] text-white text-sm hover:bg-[#3f484f]">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving} className="h-9 px-4 rounded-md bg-[#005da9] text-white text-sm hover:bg-[#2868b3] disabled:opacity-60">
            {saving ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Nombre completo</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" placeholder="Nombre y apellido" />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Nombre de usuario</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="form-input" placeholder="username" />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Correo electrónico</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" className="form-input" placeholder="correo@ejemplo.com" />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Contraseña</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" className="form-input" placeholder="••••••••" />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Rol</label>
          <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
            <SelectTrigger className="w-full h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map((rol) => (
                <SelectItem key={rol} value={rol}>{ROLE_LABEL[rol]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>
    </ModalShell>
  );
}

function EditUserModal({
  row,
  onClose,
  onSave,
  afterSave,
}: {
  row: Row;
  onClose: () => void;
  onSave: (p: { full_name: string; username: string; phone: string; status: string }) => Promise<void>;
  afterSave: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(row.full_name);
  const [username, setUsername] = useState(row.username);
  const [phone, setPhone] = useState(row.phone || "");
  const [status, setStatus] = useState(row.status);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ full_name: fullName, username, phone, status });
      await afterSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Editar usuario"
      description={`Editando a ${row.email}`}
      onClose={onClose}
      footer={
        <div className="flex gap-2 ml-auto">
          <button onClick={onClose} className="h-9 px-4 rounded-md bg-[#575f67] text-white text-sm hover:bg-[#3f484f]">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving} className="h-9 px-4 rounded-md bg-[#005da9] text-white text-sm hover:bg-[#2868b3] disabled:opacity-60">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Nombre completo</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Nombre de usuario</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="form-input" />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Teléfono</label>
          <PhoneInput value={phone} onChange={setPhone} className="form-input" />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Estado</label>
          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className="w-full h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>
    </ModalShell>
  );
}

function ResetPasswordModal({
  row,
  onClose,
  onSave,
}: {
  row: Row;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      await onSave(password);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Restablecer contraseña"
      description={`Nueva contraseña para ${row.email}`}
      onClose={onClose}
      footer={
        <div className="flex gap-2 ml-auto">
          <button onClick={onClose} className="h-9 px-4 rounded-md bg-[#575f67] text-white text-sm hover:bg-[#3f484f]">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving} className="h-9 px-4 rounded-md bg-[#005da9] text-white text-sm hover:bg-[#2868b3] disabled:opacity-60">
            {saving ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Nueva contraseña</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" className="form-input" placeholder="••••••••" minLength={6} />
        </div>
        <div className="space-y-1.5">
          <label className="text-label-sm text-[#414752]">Confirmar contraseña</label>
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} required type="password" className="form-input" placeholder="••••••••" />
        </div>
      </form>
    </ModalShell>
  );
}
