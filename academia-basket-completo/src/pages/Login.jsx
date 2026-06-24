import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, perfil, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Si ya está autenticado con perfil, redirigir
  if (user && perfil) {
    if (perfil.rol === "familia")  return <Navigate to="/familia"   replace />;
    if (perfil.rol === "jugador")  return <Navigate to="/mi-perfil" replace />;
    return <Navigate to="/" replace />;
  }

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { tienePerfilCompleto } = await loginGoogle();
      if (tienePerfilCompleto) {
        // RedireccionInicio se encargará del rol
        navigate("/start", { replace: true });
      } else {
        navigate("/registro", { replace: true });
      }
    } catch (e) {
      // Popup cerrado voluntariamente — silencioso
      if (e.code === "auth/popup-closed-by-user" ||
          e.code === "auth/cancelled-popup-request") {
        setLoading(false);
        return;
      }
      setError("Error al iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100svh", background: "#0f1f17",
      display: "flex", alignItems: "center",
      justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        background: "#132d1e", border: "1px solid #1e4030",
        borderRadius: "16px", padding: "40px",
        width: "100%", maxWidth: "380px", textAlign: "center"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>🏀</div>
        <h1 style={{
          color: "#fff", fontSize: "22px",
          fontWeight: "700", marginBottom: "4px"
        }}>
          Academia Basket
        </h1>
        <p style={{
          color: "#4a7a60", fontSize: "14px", marginBottom: "32px"
        }}>
          Panel de gestión · Castellón
        </p>

        {error && (
          <div style={{
            background: "#1a0505", border: "1px solid #dc2626",
            borderRadius: "8px", padding: "10px 14px",
            marginBottom: "16px"
          }}>
            <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%", background: "#fff", color: "#1a1a1a",
            border: "none", borderRadius: "8px",
            padding: "13px 16px", fontSize: "15px",
            fontWeight: "600", cursor: "pointer",
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: "10px",
            opacity: loading ? 0.7 : 1,
            minHeight: "44px", transition: "opacity 0.15s"
          }}>
          <img
            src="https://www.google.com/favicon.ico"
            width="18" height="18" alt="Google"
          />
          {loading ? "Conectando..." : "Continuar con Google"}
        </button>

        <p style={{
          color: "#2a5a3a", fontSize: "12px", marginTop: "20px",
          lineHeight: "1.5"
        }}>
          Acceso exclusivo para miembros de la academia.
          <br />Necesitas un código de acceso para registrarte.
        </p>
      </div>
    </div>
  );
}
