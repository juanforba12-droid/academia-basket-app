import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { tiempoTranscurrido } from "../utils/helpers";

export default function Notificaciones() {
  const {
    notificaciones, noLeidas,
    marcarLeida, marcarTodasLeidas
  } = useNotificaciones();

  const [abierto, setAbierto] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotif = async (n) => {
    try {
      if (!n.leida) await marcarLeida(n.id);
    } catch { /* silencioso — no bloquear la navegación */ }
    setAbierto(false);
    navigate(n.link || "/");
  };

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      {/* Campana */}
      <button
        onClick={() => setAbierto(v => !v)}
        style={{
          background: abierto ? "#1e4030" : "none",
          border: `1px solid ${abierto ? "#2a5a40" : "transparent"}`,
          borderRadius: "8px", padding: "7px 10px",
          cursor: "pointer", position: "relative",
          transition: "all 0.15s",
          display: "flex", alignItems: "center",
          minWidth: "40px", minHeight: "40px",
          justifyContent: "center"
        }}
        aria-label="Notificaciones">
        <span style={{ fontSize: "18px" }}>🔔</span>
        {noLeidas > 0 && (
          <span style={{
            position: "absolute", top: "2px", right: "2px",
            background: "#f97316", color: "#fff",
            borderRadius: "50%", width: "18px", height: "18px",
            fontSize: "10px", fontWeight: "700",
            display: "flex", alignItems: "center",
            justifyContent: "center",
            border: "2px solid #132d1e"
          }}>
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div style={{
          position: "absolute", right: 0,
          top: "calc(100% + 8px)",
          width: "340px",
          background: "#132d1e",
          border: "1px solid #1e4030",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 1000, overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "12px 16px",
            borderBottom: "1px solid #1e4030"
          }}>
            <span style={{
              color: "#fff", fontWeight: "700", fontSize: "14px"
            }}>
              Notificaciones
              {noLeidas > 0 && (
                <span style={{
                  background: "#f97316", color: "#fff",
                  borderRadius: "20px", padding: "1px 7px",
                  fontSize: "11px", marginLeft: "8px"
                }}>
                  {noLeidas}
                </span>
              )}
            </span>
            {noLeidas > 0 && (
              <button onClick={marcarTodasLeidas}
                style={{
                  background: "none", border: "none",
                  color: "#4a7a60", fontSize: "12px",
                  cursor: "pointer"
                }}>
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {notificaciones.length === 0 ? (
              <div style={{
                padding: "32px", textAlign: "center"
              }}>
                <div style={{
                  fontSize: "28px", marginBottom: "8px"
                }}>🔔</div>
                <p style={{ color: "#4a7a60", fontSize: "13px" }}>
                  Sin notificaciones
                </p>
              </div>
            ) : notificaciones.map(n => (
              <div key={n.id}
                onClick={() => handleNotif(n)}
                style={{
                  display: "flex", gap: "10px",
                  padding: "11px 16px",
                  borderBottom: "1px solid #0f1f17",
                  cursor: "pointer",
                  background: n.leida ? "transparent" : "#1a3326",
                  transition: "background 0.12s"
                }}
                onMouseEnter={e =>
                  e.currentTarget.style.background = "#1e4030"
                }
                onMouseLeave={e =>
                  e.currentTarget.style.background =
                    n.leida ? "transparent" : "#1a3326"
                }>
                {/* Icono */}
                <div style={{
                  width: "34px", height: "34px", borderRadius: "50%",
                  background: "#0f1f17",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "15px",
                  flexShrink: 0
                }}>
                  {n.icono}
                </div>

                {/* Texto */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: "6px"
                  }}>
                    <span style={{
                      color: n.leida ? "#888" : "#fff",
                      fontSize: "13px",
                      fontWeight: n.leida ? "400" : "600",
                      lineHeight: "1.3"
                    }}>
                      {n.titulo}
                    </span>
                    <span style={{
                      color: "#4a7a60", fontSize: "11px",
                      whiteSpace: "nowrap", flexShrink: 0
                    }}>
                      {tiempoTranscurrido(n.createdAt)}
                    </span>
                  </div>
                  <p style={{
                    color: "#666", fontSize: "12px",
                    marginTop: "2px", overflow: "hidden",
                    whiteSpace: "nowrap", textOverflow: "ellipsis"
                  }}>
                    {n.mensaje}
                  </p>
                </div>

                {/* Punto no leída */}
                {!n.leida && (
                  <div style={{
                    width: "7px", height: "7px",
                    borderRadius: "50%", background: "#f97316",
                    flexShrink: 0, marginTop: "5px"
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div style={{
              padding: "10px 16px",
              borderTop: "1px solid #1e4030",
              textAlign: "center"
            }}>
              <button
                onClick={() => {
                  navigate("/notificaciones");
                  setAbierto(false);
                }}
                style={{
                  background: "none", border: "none",
                  color: "#4a7a60", fontSize: "12px",
                  cursor: "pointer"
                }}>
                Ver todas →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
