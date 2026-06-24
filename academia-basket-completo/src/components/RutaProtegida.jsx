import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SplashScreen from "./SplashScreen";

/**
 * Protege una ruta:
 * - Si aún no se ha inicializado Firebase Auth → SplashScreen
 * - Si no hay usuario → /login
 * - Si no tiene perfil → /registro
 * - Si está desactivado → /sin-acceso
 * - Si su rol no está permitido → /sin-acceso
 */
export default function RutaProtegida({ children, roles }) {
  const { user, perfil, loading, initialized } = useAuth();

  // Mientras Firebase inicializa, mostrar splash
  if (!initialized || loading) return <SplashScreen />;

  // Sin autenticar → login
  if (!user) return <Navigate to="/login" replace />;

  // Autenticado pero sin perfil → completar registro
  if (!perfil) return <Navigate to="/registro" replace />;

  // Usuario desactivado por admin
  if (perfil.activo === false) return <Navigate to="/sin-acceso" replace />;

  // Rol no permitido
  if (roles && !roles.includes(perfil.rol)) {
    return <Navigate to="/sin-acceso" replace />;
  }

  return children;
}
