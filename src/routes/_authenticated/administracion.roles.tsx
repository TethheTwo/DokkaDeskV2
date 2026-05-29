import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppTopBar } from "@/components/AppTopBar";
import { useAuth, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { refreshPermissions, setRolePermission, type Permission } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/administracion/roles")({
  ssr: false,
  head: () => ({ meta: [{ title: "Roles y permisos — DOKKA Desk" }] }),
  component: RolesPage,
});

const ROLES: { key: AppRole; label: string; icon: string }[] = [
  { key: "administrador", label: "Admin", icon: "security" },
  { key: "supervisor", label: "Supervisor", icon: "manage_accounts" },
  { key: "operador", label: "Operador", icon: "person" },
  { key: "addiuva", label: "Addiuva", icon: "partner_exchange" },
];

const PERMS: { key: Permission; label: string; desc: string }[] = [
  { key: "view_tickets", label: "Ver tickets", desc: "Permite visualizar el listado general de tickets." },
  { key: "view_asistencias", label: "Ver asistencias", desc: "Acceso al módulo de asistencias técnicas." },
  { key: "view_reporte", label: "Ver reportes", desc: "Generación y descarga de informes PDF/Excel." },
  { key: "view_dashboard", label: "Ver dashboard", desc: "Acceso al panel de métricas y KPIs en tiempo real." },
  { key: "view_auditoria", label: "Ver auditoría", desc: "Registro histórico de acciones de usuarios." },
  { key: "view_administracion", label: "Administrar usuarios", desc: "Crear, editar y dar de baja cuentas de usuario." },
  { key: "view_listas", label: "Gestionar listas", desc: "Configuración de catálogos y listas desplegables." },
  { key: "delete_tickets", label: "Eliminar tickets", desc: "Borrado lógico de registros del sistema." },
  { key: "download_records", label: "Descargar registros", desc: "Exportación de datos a PDF/Excel." },
  { key: "delete_reports", label: "Eliminar reportes", desc: "Borrado de reportes generados." },
  { key: "share_reports", label: "Compartir reportes", desc: "Envío de reportes por correo electrónico." },
  { key: "reopen_closed_cases", label: "Reabrir casos cerrados", desc: "Permite cambiar estado de Cerrado a otro." },
];

function RolesPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("administrador");
  const navigate = useNavigate();
  const [matrix, setMatrix] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("role_permissions").select("role,permission,allowed");
      const m: Record<string, boolean> = {};
      (data ?? []).forEach((r: any) => {
        m[`${r.role}|${r.permission}`] = !!r.allowed;
      });
      setMatrix(m);
    })();
  }, []);

  const toggle = async (role: AppRole, perm: Permission) => {
    if (!isAdmin) return;
    const key = `${role}|${perm}`;
    const next = !matrix[key];
    setMatrix((m) => ({ ...m, [key]: next }));
    setSaving(key);
    try {
      await setRolePermission(role, perm, next);
      refreshPermissions();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground flex flex-col">
      <AppTopBar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-label-sm text-[#575f67] mb-2">
              <span>Administración</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-[#005da9] font-semibold">Matriz de Roles y Permisos</span>
            </nav>
            <h1 className="text-display-lg text-[#191c1e]">Matriz de Roles y Permisos</h1>
            <p className="text-body-base text-[#575f67] mt-1">
              Gestione los niveles de acceso y capacidades operativas para cada perfil del sistema.
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <Link
                to="/reportes/auditoria"
                className="h-10 px-4 rounded-md border border-[#d1d5db] bg-white text-[#575f67] font-body-bold hover:bg-[#edeef1] transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">history</span>
                Auditoría
              </Link>
            </div>
          )}
        </div>

        {!isAdmin && (
          <p className="mb-4 text-sm text-muted-foreground">
            Solo administradores pueden modificar permisos.
          </p>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f2f3f6] border-b border-[#e2e8f0]">
                  <th className="p-4 text-label-caps text-[#414752] min-w-[280px]">Permiso / Acción</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="p-4 text-center min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-[#005da9]" style={{ fontSize: "20px" }}>{r.icon}</span>
                        <span className="text-label-caps text-[#414752]">{r.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {PERMS.map((p) => (
                  <tr key={p.key} className="hover:bg-[#f2f3f6]/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-body-bold text-[#191c1e]">{p.label}</span>
                        <span className="text-label-sm text-[#575f67]">{p.desc}</span>
                      </div>
                    </td>
                    {ROLES.map((r) => {
                      const key = `${r.key}|${p.key}`;
                      const checked = r.key === "administrador" ? true : !!matrix[key];
                      const disabled = !isAdmin || r.key === "administrador" || saving === key;
                      return (
                        <td key={key} className="p-4 text-center">
                          <input
                            type="checkbox"
 checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(r.key, p.key)}
                            className="h-5 w-5 rounded border-[#d1d5db] text-[#005da9] focus:ring-[#005da9]/40 transition-all cursor-pointer"
                            style={{ accentColor: "#005da9" }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-[#f2f3f6]/50 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ea580c] text-[20px]">info</span>
            <p className="text-label-sm text-[#575f67]">
              El rol <b>Admin</b> posee permisos globales heredados que no pueden ser revocados por seguridad del sistema.
            </p>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          <Link to="/administracion/usuarios" className="text-[#005da9] hover:underline">
            Asignar roles a usuarios →
          </Link>
        </p>
      </main>
    </div>
  );
}
