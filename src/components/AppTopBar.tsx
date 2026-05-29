import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ProfileModal } from "@/components/ProfileModal";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { signOut } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";

type Section = "inicio" | "admin" | "tickets" | "asistencias" | "reporte" | null;

export function AppTopBar() {
  const { profile, user, roles } = useAuth();
  const { can } = usePermissions();
  const isAdmin = roles.includes("administrador");
  const location = useLocation();
  const pathname = location.pathname;

  const showAdminMenu =
    can("view_administracion") ||
    can("view_dashboard") ||
    can("view_auditoria") ||
    can("view_listas");
  const showAsist = can("view_asistencias");
  const showRep = can("view_reporte");
  const showTickets = can("view_tickets");

  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate({ to: "/login", search: { redirect: "/" } });
  };

  const active = (section: Section): boolean => {
    switch (section) {
      case "inicio": return pathname === "/";
      case "tickets": return pathname.startsWith("/tickets");
      case "asistencias": return pathname.startsWith("/asistencias");
      case "reporte": return pathname.startsWith("/reportes");
      case "admin": return pathname.startsWith("/administracion") || pathname.startsWith("/reportes/dashboard") || pathname.startsWith("/reportes/auditoria");
      default: return false;
    }
  };

  const navLinkClass = (section: Section) => {
    const isActive = active(section);
    const base = "text-label-sm font-label-sm transition-colors py-1";
    if (isActive) {
      return `${base} text-primary font-bold border-b-2 border-primary`;
    }
    return `${base} text-secondary hover:text-primary`;
  };

  const username = profile?.username || (user?.email?.split("@")[0] ?? "Usuario");
  const fullName = profile?.full_name || username;
  const avatarUrl = profile?.avatar_url;

  return (
    <nav className="bg-card dark:bg-card sticky top-0 z-50 border-b border-[#e2e8f0] shadow-sm h-16">
      <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto h-full">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-headline-md font-extrabold text-primary no-underline">
            DOKKA Desk
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            <Link to="/" className={navLinkClass("inicio")}>
              Inicio
            </Link>
            {showAdminMenu && (
              <div className="relative group">
                <button className="flex items-center gap-1 text-label-sm font-label-sm text-secondary hover:text-primary transition-colors py-1">
                  Administración
                  <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                </button>
                <div className="absolute left-0 mt-1 w-48 bg-white border border-[#c1c7d4] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60]">
                  <div className="py-1">
                    {isAdmin && (
                      <Link to="/administracion/usuarios" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                        Usuarios
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/administracion/roles" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                        Roles
                      </Link>
                    )}
                    {can("view_dashboard") && (
                      <Link to="/reportes/dashboard" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                        Dashboard
                      </Link>
                    )}
                    {can("view_auditoria") && (
                      <Link to="/reportes/auditoria" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                        Auditoría
                      </Link>
                    )}
                    {can("view_listas") && (
                      <Link to="/administracion/listas" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                        Listas Maestras
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
            {showTickets && (
              <Link to="/tickets/listado" className={navLinkClass("tickets")}>
                Tickets
              </Link>
            )}
            {showAsist && (
              <div className="relative group">
                <button className="flex items-center gap-1 text-label-sm font-label-sm text-secondary hover:text-primary transition-colors py-1">
                  Asistencias
                  <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                </button>
                <div className="absolute left-0 mt-1 w-48 bg-white border border-[#c1c7d4] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60]">
                  <div className="py-1">
                    <Link to="/asistencias/automotor" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                      Automotor
                    </Link>
                    <Link to="/asistencias/mascotas" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                      Mascotas
                    </Link>
                    <Link to="/asistencias/bici" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                      Bici
                    </Link>
                    <Link to="/asistencias/hogar" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                      Hogar
                    </Link>
                    <Link to="/asistencias/dental" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                      Dental
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {showRep && (
              <div className="relative group">
                <button className="flex items-center gap-1 text-label-sm font-label-sm text-secondary hover:text-primary transition-colors py-1">
                  Reporte
                  <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
                </button>
                <div className="absolute left-0 mt-1 w-48 bg-white border border-[#c1c7d4] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60]">
                  <div className="py-1">
                    <Link to="/reportes/accidentes-personales" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                      Accidentes Personales
                    </Link>
                    <Link to="/reportes/casos-generales" className="block px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors">
                      Casos Generales
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/tickets/listado"
            className="hidden lg:flex relative items-center"
          >
            <span className="material-symbols-outlined absolute left-3 text-[#414752]" style={{ fontSize: "20px" }}>search</span>
            <input
              className="pl-10 pr-4 h-9 w-64 bg-[#f2f3f6] border border-[#c1c7d4] rounded-md focus:ring-2 focus:ring-[#005da9]/40 focus:border-[#005da9] outline-none text-body-base cursor-pointer"
              placeholder="Buscar ticket..."
              readOnly
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "/tickets/listado";
              }}
            />
          </Link>
          <button className="material-symbols-outlined text-[#575f67] hover:bg-[#f2f3f6] p-2 rounded-full transition-colors" style={{ fontSize: "24px" }}>
            notifications
          </button>
          <button className="material-symbols-outlined text-[#575f67] hover:bg-[#f2f3f6] p-2 rounded-full transition-colors" style={{ fontSize: "24px" }}>
            help
          </button>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f2f3f6] transition-colors"
            >
              <div className="h-8 w-8 rounded-full overflow-hidden bg-[#2076cc] border border-[#c1c7d4] flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-label-sm text-[#414752] font-medium hidden sm:block">{username}</span>
              <span className="material-symbols-outlined text-[18px] text-[#575f67]">arrow_drop_down</span>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white border border-[#c1c7d4] rounded-lg shadow-xl z-50">
                  <div className="py-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); setProfileOpen(true); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      Mi Perfil
                    </button>
                    <Link
                      to="/configuracion"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-label-sm text-[#414752] hover:bg-[#f2f3f6] hover:text-[#005da9] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">settings</span>
                      Configuración
                    </Link>
                    <hr className="my-1 border-t border-[#e2e8f0]" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-label-sm text-rose-600 hover:bg-[#f2f3f6] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </nav>
  );
}
