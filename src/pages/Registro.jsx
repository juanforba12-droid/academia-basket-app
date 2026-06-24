import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MAX_INTENTOS = 5;

export default function Registro() {
  const { user, perfil, completarPerfil, logout } = useAuth();
  const navigate = useNavigate();

  const [nombre,    setNombre]    = useState("");
  const [apellidos, setApellidos] = useState("");
  const [codigo,    setCodigo]    = useState("");
  const [mostrar,   setMostrar]   = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [intentos,  setIntentos]  = useState(0);
  const [bloqueado, setBloqueado] = useState(false);

  // Si ya tiene perfil, redirigir
  if (user && perfil) return <Navigate to="/" replace />;

  const handleRegistro = async () => {
    if (bloqueado || loading) return;
    if (!nombre.trim() || !apellidos.trim() || !codigo.trim()) {
      return setError("Rellena todos los campos");
    }

    setLoading(true);
    setError("");

    try {
      const rol = await completarPerfil(
        user.uid, nombre, apellidos, codigo
      );
      // Redirigir según rol
      if (rol === "familia")  return navigate("/familia",   { replace: true });
      if (rol === "jugador")  return navigate("/mi-perfil", { replace: true });
      navigate("/", { replace: true });
    } catch (e) {
      if (e.message === "Código incorrecto") {
        const nuevos = intentos + 1;
        setIntentos(nuevos);
        if (nuevos >= MAX_INTENTOS) {
          setBloqueado(true);
          setError(
            `Demasiados intentos fallidos. Contacta con la academia para obtener el código correcto.`
          );
        } else {
          setError(
            `Código incorrecto. ${MAX_INTENTOS - nuevos} intento${MAX_INTENTOS - nuevos !== 1 ? "s" : ""} restante${MAX_INTENTOS - nuevos !== 1 ? "s" : ""}.`
          );
        }
      } else {
        setError(e.message || "Error al completar el registro");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    try {
      await logout();
    } catch { /* si logout falla, la UI ya limpió el estado */ }
  };

  return (
    <div style={{
      minHeight: "100svh", background: "#0f1f17",
      display: "flex", alignItems: "center",
      justifyContent: "center", padding: "20px"
    }}>
      <div style={{
        background: "#132d1e", border: "1px solid #1e4030",
        borderRadius: "16px", padding: "36px",
        width: "100%", maxWidth: "400px"
      }}>
        {/* Cabecera */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>👋</div>
          <h2 style={{
            color: "#fff", fontSize: "20px", fontWeight: "700"
          }}>
            Completa tu perfil
          </h2>
          <p style={{ color: "#4a7a60", fontSize: "13px", marginTop: "6px" }}>
            {user?.email}
          </p>
        </div>

        <div style={{
          display: "flex", flexDirection: "column", gap: "14px"
        }}>
          {/* Nombre */}
          <div>
            <label style={{
              color: "#4a7a60", fontSize: "13px",
              display: "block", marginBottom: "6px"
            }}>Nombre</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre"
              disabled={bloqueado || loading}
            />
          </div>

          {/* Apellidos */}
          <div>
            <label style={{
              color: "#4a7a60", fontSize: "13px",
              display: "block", marginBottom: "6px"
            }}>Apellidos</label>
            <input
              value={apellidos}
              onChange={e => setApellidos(e.target.value)}
              placeholder="Tus apellidos"
              disabled={bloqueado || loading}
            />
          </div>

          {/* Código */}
          <div>
            <label style={{
              color: "#4a7a60", fontSize: "13px",
              display: "block", marginBottom: "6px"
            }}>Código de acceso</label>
            <div style={{ position: "relative" }}>
              <input
                type={mostrar ? "text" : "password"}
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRegistro()}
                placeholder="Código proporcionado por la academia"
                disabled={bloqueado || loading}
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setMostrar(v => !v)}
                style={{
                  position: "absolute", right: "12px", top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none",
                  cursor: "pointer", color: "#4a7a60", fontSize: "16px"
                }}>
                {mostrar ? "🙈" : "👁️"}
              </button>
            </div>
            <p style={{
              color: "#2a5a3a", fontSize: "12px", marginTop: "6px"
            }}>
              El código te lo facilita el staff de la academia
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: bloqueado ? "#1a0505" : "#0f1f17",
              border: `1px solid ${bloqueado ? "#dc2626" : "#f87171"}`,
              borderRadius: "8px", padding: "10px 14px"
            }}>
              <p style={{
                color: bloqueado ? "#f87171" : "#fca5a5",
                fontSize: "13px", margin: 0
              }}>
                {error}
              </p>
            </div>
          )}

          {/* Botón principal */}
          <button
            onClick={handleRegistro}
            disabled={loading || bloqueado}
            style={{
              background: bloqueado ? "#1e4030" : "#1a7a4a",
              color: bloqueado ? "#4a7a60" : "#fff",
              border: "none", borderRadius: "8px",
              padding: "13px", fontSize: "15px",
              fontWeight: "700", cursor: bloqueado ? "not-allowed" : "pointer",
              marginTop: "4px",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.15s"
            }}>
            {loading ? "Verificando..." : "Entrar a la academia"}
          </button>

          {/* Cancelar */}
          <button
            onClick={handleCancelar}
            style={{
              background: "none", color: "#4a7a60",
              border: "none", fontSize: "13px",
              cursor: "pointer", padding: "4px"
            }}>
            Cancelar y salir
          </button>
        </div>
      </div>
    </div>
  );
}
