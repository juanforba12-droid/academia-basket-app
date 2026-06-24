import { lazy, Suspense, useState, useEffect } from "react";
import {
  BrowserRouter, Routes, Route,
  NavLink, Navigate, useLocation
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RutaProtegida  from "./components/RutaProtegida";
import SplashScreen   from "./components/SplashScreen";
import ScrollToTop from "./components/ScrollToTop";
import Notificaciones from "./components/Notificaciones";
import { useConexion } from "./hooks/useConexion";
import "./App.css";

const Dashboard            = lazy(() => import("./pages/Dashboard"));
const Jugadores            = lazy(() => import("./pages/Jugadores"));
const FichaJugador         = lazy(() => import("./pages/FichaJugador"));
const NuevoJugador         = lazy(() => import("./pages/NuevoJugador"));
const SeguimientoDeportivo = lazy(() => import("./pages/SeguimientoDeportivo"));
const NuevaSesion          = lazy(() => import("./pages/NuevaSesion"));
const NuevoPartido         = lazy(() => import("./pages/NuevoPartido"));
const Noticias             = lazy(() => import("./pages/Noticias"));
const Foro                 = lazy(() => import("./pages/Foro"));
const Galeria              = lazy(() => import("./pages/Galeria"));
const Calendario           = lazy(() => import("./pages/Calendario"));
const Ajustes              = lazy(() => import("./pages/Ajustes"));
const GestionUsuarios      = lazy(() => import("./pages/GestionUsuarios"));
const PortalFamilia        = lazy(() => import("./pages/PortalFamilia"));
const PerfilJugador        = lazy(() => import("./pages/PerfilJugador"));
const Contactos            = lazy(() => import("./pages/Contactos"));
const TodasNotificaciones  = lazy(() => import("./pages/TodasNotificaciones"));
const Login                = lazy(() => import("./pages/Login"));
const Registro             = lazy(() => import("./pages/Registro"));
const Publica              = lazy(() => import("./pages/Publica"));
const SinAcceso            = lazy(() => import("./pages/SinAcceso"));
const NotFound             = lazy(() => import("./pages/NotFound"));

const NAV_ITEMS = [
  { to: "/",                      label: "🏠 Dashboard",    roles: ["admin","entrenador"] },
  { to: "/jugadores",             label: "👥 Jugadores",    roles: ["admin","entrenador"] },
  { to: "/nuevo",                 label: "➕ Nuevo jugador", roles: ["admin"] },
  { to: "/seguimiento-deportivo", label: "📊 Deportivo",    roles: ["admin","entrenador"] },
  { to: "/calendario",            label: "📅 Calendario",   roles: ["admin","entrenador","jugador","familia"] },
  { to: "/galeria",               label: "📷 Galería",      roles: ["admin","entrenador","jugador","familia"] },
  { to: "/noticias",              label: "📰 Noticias",     roles: ["admin","entrenador","jugador","familia"] },
  { to: "/foro",                  label: "💬 Foro",         roles: ["admin","entrenador","jugador","familia"] },
  { to: "/mi-perfil",             label: "👤 Mi perfil",    roles: ["jugador"] },
  { to: "/contactos",             label: "📩 Contactos",    roles: ["admin"] },
  { to: "/usuarios",              label: "👥 Usuarios",     roles: ["admin"] },
  { to: "/ajustes",               label: "⚙️ Ajustes",      roles: ["admin"] },
];

// Layout DENTRO de BrowserRouter para que useLocation funcione
function Layout({ children }) {
  const { perfil, logout }            = useAuth();
  const location                      = useLocation();
  const online                        = useConexion();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => { setMenuAbierto(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = menuAbierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuAbierto]);

  const navVisibles = NAV_ITEMS.filter(n =>
    perfil && n.roles.includes(perfil.rol)
  );

  return (
    <div className="app-layout">
      {!online && <div className="banner-offline">⚠️ Sin conexión — Los cambios no se guardarán</div>}
      <div className={`overlay ${menuAbierto ? "visible" : ""}`} onClick={() => setMenuAbierto(false)} />

      <div className="topbar-mobile" style={{ top: online ? 0 : "36px" }}>
        <button className="hamburger" onClick={() => setMenuAbierto(v => !v)} aria-label="Menú">
          {menuAbierto ? "✕" : "☰"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🏀</span>
          <span style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>Academia Basket</span>
        </div>
        <Notificaciones />
      </div>

      <aside className={`sidebar ${menuAbierto ? "open" : ""}`} style={{ top: online ? 0 : "36px" }}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🏀</span>
            <span className="logo-text">Academia<strong> Basket</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div className="desktop-only"><Notificaciones /></div>
            <button className="sidebar-close" onClick={() => setMenuAbierto(false)} aria-label="Cerrar">✕</button>
          </div>
        </div>

        <nav>
          {navVisibles.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"}
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
              onClick={() => setMenuAbierto(false)}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ color: "#4a7a60", fontSize: "12px", marginBottom: "8px" }}>
            <strong style={{ color: "#ccc", display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "160px" }}>
              {perfil?.nombre} {perfil?.apellidos}
            </strong>
            <span style={{ background: "#0f1f17", borderRadius: "4px", padding: "2px 6px", fontSize: "11px", color: "#6ab88a", marginTop: "4px", display: "inline-block" }}>
              {perfil?.rol}
            </span>
          </div>
          <button className="btn btn-secondary" style={{ width: "100%", fontSize: "13px" }} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main-content" style={{ paddingTop: online ? undefined : "calc(28px + 36px)" }}>
        {children}
      </main>
    </div>
  );
}

function RedireccionInicio() {
  const { user, perfil, loading, initialized } = useAuth();
  if (!initialized || loading) return <SplashScreen />;
  if (!user || !perfil)        return <Navigate to="/inicio" replace />;
  if (perfil.activo === false) return <Navigate to="/sin-acceso" replace />;
  if (perfil.rol === "familia")  return <Navigate to="/familia"   replace />;
  if (perfil.rol === "jugador")  return <Navigate to="/mi-perfil" replace />;
  return <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <ScrollToTop />
      <Routes>
        <Route path="/inicio"     element={<Publica />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/registro"   element={<Registro />} />
        <Route path="/sin-acceso" element={<SinAcceso />} />
        <Route path="/start"      element={<RedireccionInicio />} />

        <Route path="/" element={<RutaProtegida roles={["admin","entrenador"]}><Layout><Dashboard /></Layout></RutaProtegida>} />
        <Route path="/jugadores" element={<RutaProtegida roles={["admin","entrenador"]}><Layout><Jugadores /></Layout></RutaProtegida>} />
        <Route path="/jugador/:id" element={<RutaProtegida roles={["admin","entrenador"]}><Layout><FichaJugador /></Layout></RutaProtegida>} />
        <Route path="/nuevo" element={<RutaProtegida roles={["admin"]}><Layout><NuevoJugador /></Layout></RutaProtegida>} />
        <Route path="/seguimiento-deportivo" element={<RutaProtegida roles={["admin","entrenador"]}><Layout><SeguimientoDeportivo /></Layout></RutaProtegida>} />
        <Route path="/sesion/nueva" element={<RutaProtegida roles={["admin","entrenador"]}><Layout><NuevaSesion /></Layout></RutaProtegida>} />
        <Route path="/partido/nuevo" element={<RutaProtegida roles={["admin","entrenador"]}><Layout><NuevoPartido /></Layout></RutaProtegida>} />
        <Route path="/contactos" element={<RutaProtegida roles={["admin"]}><Layout><Contactos /></Layout></RutaProtegida>} />
        <Route path="/ajustes" element={<RutaProtegida roles={["admin"]}><Layout><Ajustes /></Layout></RutaProtegida>} />
        <Route path="/usuarios" element={<RutaProtegida roles={["admin"]}><Layout><GestionUsuarios /></Layout></RutaProtegida>} />
        <Route path="/noticias" element={<RutaProtegida><Layout><Noticias /></Layout></RutaProtegida>} />
        <Route path="/foro" element={<RutaProtegida><Layout><Foro /></Layout></RutaProtegida>} />
        <Route path="/galeria" element={<RutaProtegida><Layout><Galeria /></Layout></RutaProtegida>} />
        <Route path="/calendario" element={<RutaProtegida><Layout><Calendario /></Layout></RutaProtegida>} />
        <Route path="/notificaciones" element={<RutaProtegida><Layout><TodasNotificaciones /></Layout></RutaProtegida>} />
        <Route path="/mi-perfil" element={<RutaProtegida roles={["jugador"]}><Layout><PerfilJugador /></Layout></RutaProtegida>} />
        <Route path="/familia" element={<RutaProtegida roles={["familia"]}><PortalFamilia /></RutaProtegida>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
