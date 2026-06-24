import { useNavigate } from "react-router-dom";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { tiempoTranscurrido } from "../utils/helpers";

export default function TodasNotificaciones() {
  const { notificaciones, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const navigate = useNavigate();

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const handleClick = async (n) => {
    try {
      if (!n.leida) await marcarLeida(n.id);
    } catch { /* silencioso */ }
    navigate(n.link || "/");
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Notificaciones</div>
          <div className="page-subtitle">
            {noLeidas > 0
              ? `${noLeidas} sin leer`
              : "Todo al día"}
          </div>
        </div>
        {noLeidas > 0 && (
          <button className="btn btn-secondary"
            onClick={marcarTodasLeidas}>
            ✓ Marcar todas leídas
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {notificaciones.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔔</div>
            <p style={{ color: "#666" }}>Sin notificaciones.</p>
          </div>
        ) : (
          notificaciones.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: "flex", gap: "14px",
                padding: "14px 20px",
                borderBottom: "1px solid #0f1f17",
                cursor: "pointer",
                background: n.leida ? "transparent" : "#1a3326",
                transition: "background 0.15s"
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
                width: "40px", height: "40px", borderRadius: "50%",
                background: "#0f1f17",
                display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "18px",
                flexShrink: 0
              }}>
                {n.icono}
              </div>

              {/* Texto */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginBottom: "3px", gap: "8px"
                }}>
                  <span style={{
                    color: n.leida ? "#888" : "#fff",
                    fontWeight: n.leida ? "400" : "600",
                    fontSize: "14px"
                  }}>
                    {n.titulo}
                  </span>
                  <span style={{
                    color: "#4a7a60", fontSize: "11px",
                    whiteSpace: "nowrap"
                  }}>
                    {tiempoTranscurrido(n.createdAt)}
                  </span>
                </div>
                <p style={{
                  color: "#666", fontSize: "13px",
                  overflow: "hidden", whiteSpace: "nowrap",
                  textOverflow: "ellipsis"
                }}>
                  {n.mensaje}
                </p>
              </div>

              {/* Punto no leída */}
              {!n.leida && (
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#f97316", flexShrink: 0, marginTop: "6px"
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
