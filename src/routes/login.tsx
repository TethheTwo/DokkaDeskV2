import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { signIn, initAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import dokkaLoginLogo from "@/assets/dokka-desk-login.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — DOKKA Desk" },
      { name: "description", content: "Acceso al sistema DOKKA Desk." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) throw error;
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", uid)
          .maybeSingle();
        if (prof && prof.status !== "Activo") {
          await supabase.auth.signOut();
          throw new Error("Tu cuenta está inactiva. Contacta a un administrador.");
        }
      }
      toast.success("Sesión iniciada");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{
        background: "radial-gradient(circle at 50% 50%, #f1f5f9 0%, #f8f9fc 100%)",
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="mb-8 transition-transform duration-500 hover:scale-105">
          <img
            src={dokkaLoginLogo}
            alt="DOKKA Desk Logo"
            className="mx-auto h-20 w-auto"
          />
        </div>
        <h2
          className="text-center"
          style={{ fontSize: "24px", lineHeight: "32px", fontWeight: 700, letterSpacing: "-0.01em", color: "#191c1e" }}
        >
          Acceso a la Plataforma
        </h2>
        <p
          className="mt-2 text-center"
          style={{ fontSize: "14px", lineHeight: "20px", fontWeight: 400, color: "#64748b" }}
        >
          Soporte Técnico y Gestión de Tickets
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-[#e2e8f0] rounded-xl sm:px-10">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label
                className="block mb-1.5"
                style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 700, color: "#414752", letterSpacing: "0.05em", textTransform: "uppercase" }}
              >
                Correo Electrónico o Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span style={{ color: "#575f67", fontSize: "20px" }} className="material-symbols-outlined">mail</span>
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="ejemplo@dokkadesk.com"
                  className="block w-full pl-10 h-10 border border-[#d1d5db] rounded-lg bg-[#f2f3f6] text-[#191c1e] outline-none transition-all duration-200"
                  style={{ fontSize: "14px", lineHeight: "20px", fontWeight: 400 }}
                  onFocus={(e) => { e.target.style.boxShadow = "0 0 0 2px rgba(0, 93, 169, 0.4)"; e.target.style.borderColor = "#005da9"; }}
                  onBlur={(e) => { e.target.style.boxShadow = "none"; e.target.style.borderColor = "#d1d5db"; }}
                />
              </div>
            </div>

            <div>
              <label
                className="block mb-1.5"
                style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 700, color: "#414752", letterSpacing: "0.05em", textTransform: "uppercase" }}
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span style={{ color: "#575f67", fontSize: "20px" }} className="material-symbols-outlined">lock</span>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 h-10 border border-[#d1d5db] rounded-lg bg-[#f2f3f6] text-[#191c1e] outline-none transition-all duration-200"
                  style={{ fontSize: "14px", lineHeight: "20px", fontWeight: 400 }}
                  onFocus={(e) => { e.target.style.boxShadow = "0 0 0 2px rgba(0, 93, 169, 0.4)"; e.target.style.borderColor = "#005da9"; }}
                  onBlur={(e) => { e.target.style.boxShadow = "none"; e.target.style.borderColor = "#d1d5db"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  style={{ color: "#575f67" }}
                >
                  <span style={{ fontSize: "20px" }} className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#c1c7d4]"
                  style={{ accentColor: "#005da9" }}
                />
                <label htmlFor="remember-me" className="ml-2 block" style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: "#414752" }}>
                  Recordarme
                </label>
              </div>
              <div>
                <a href="#" style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 600, color: "#005da9" }}>
                  ¿Olvidó su contraseña?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={busy}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-white font-semibold transition-all duration-200 shadow-sm active:scale-[0.98]"
                style={{ fontSize: "14px", lineHeight: "20px", fontWeight: 600, backgroundColor: "#005da9" }}
                onMouseEnter={(e) => { if (!busy) e.currentTarget.style.backgroundColor = "#2868b3"; }}
                onMouseLeave={(e) => { if (!busy) e.currentTarget.style.backgroundColor = "#005da9"; }}
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <span style={{ fontSize: "20px", opacity: 0.6 }} className="material-symbols-outlined">login</span>
                </span>
                {busy ? "Procesando…" : "Iniciar sesión"}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e2e8f0]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white" style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: "#64748b" }}>
                  Asistencia Técnica Corporativa
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <a
                href="#"
                className="w-full inline-flex justify-center py-2 px-4 border border-[#e2e8f0] rounded-lg bg-white shadow-sm transition-colors"
                style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: "#575f67" }}
              >
                <span style={{ fontSize: "18px", marginRight: "8px" }} className="material-symbols-outlined">help_outline</span>
                Soporte
              </a>
              <a
                href="#"
                className="w-full inline-flex justify-center py-2 px-4 border border-[#e2e8f0] rounded-lg bg-white shadow-sm transition-colors"
                style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: "#575f67" }}
              >
                <span style={{ fontSize: "18px", marginRight: "8px" }} className="material-symbols-outlined">info</span>
                Guía
              </a>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center flex items-center justify-center gap-2" style={{ fontSize: "12px", lineHeight: "16px", fontWeight: 500, color: "#64748b" }}>
          <span style={{ fontSize: "14px" }} className="material-symbols-outlined">verified_user</span>
          © 2024 DOKKA Desk. v2.4.0 Technical Assistance Platform.
        </p>
      </div>

      <div className="fixed bottom-6 right-6 hidden md:block">
        <div className="flex items-center gap-3 bg-[#e7e8eb]/50 backdrop-blur-sm px-4 py-2 rounded-full border border-[#c1c7d4]/30">
          <div className="w-2 h-2 rounded-full bg-[#006b2c] animate-pulse"></div>
          <span className="font-semibold uppercase tracking-wider" style={{ fontSize: "12px", lineHeight: "16px", letterSpacing: "0.05em", color: "#414752" }}>
            Servidor Seguro
          </span>
        </div>
      </div>
    </div>
  );
}
