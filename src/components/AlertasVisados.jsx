import { useNavigate } from "react-router-dom";

/**
 * Muestra alertas de visados expirados o próximos a expirar.
 * Se usa en el Dashboard del admin.
 */
export default function AlertasVisados({ jugadores }) {
  const navigate = useNavigate();

  const hoy = new Date();
  const hoyStr = hoy.toISOString().split("T")[0];

  const en30 = new Date();
  en30.setDate(en30.getDate() + 30);
  const en30Str = en30.toISOString().split("T")[0];

  const expirados = jugadores.filter(j => {
    const exp = j.visado?.fecha_expiracion;
    return exp && exp < hoyStr && j.visado?.estado === "aprobado";
  });

  const proximos = jugadores.filter(j => {
    const exp = j.visado?.fecha_expiracion;
    return exp && exp >= hoyStr && exp <= en30Str;
  });

  if (!expirados.length && !proximos.length) return null;

  return (
    <div style={{ marginBottom: "20px" }}>

      {/* Visados expirados */}
      {expirados.length > 0 && (
        <div style={{
          background: "#1a0505",
          border: "1px solid #dc2626",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "10px"
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "10px"
          }}>
            <span style={{
              color: "#f87171", fontWeight: "700", fontSize: "14px"
            }}>
              🚨 {expirados.length} visado{expirados.length > 1 ? "s" : ""} expirado{expirados.length > 1 ? "s" : ""}
            </span>
            <span style={{
              color: "#dc2626", fontSize: "11px",
              background: "#2a0a0a", borderRadius: "4px",
              padding: "2px 8px"
            }}>URGENTE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {expirados.map(j => (
              <div
                key={j.id}
                onClick={() => navigate(`/jugador/${j.id}`)}
                style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", cursor: "pointer",
                  padding: "6px 10px", background: "#200a0a",
                  borderRadius: "8px",
                  transition: "background 0.15s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#2a0f0f"}
                onMouseLeave={e => e.currentTarget.style.background = "#200a0a"}
              >
                <span style={{ color: "#ccc", fontSize: "13px" }}>
                  {j.nombre} {j.apellidos}
                </span>
                <span style={{ color: "#f87171", fontSize: "12px" }}>
                  Expiró {j.visado.fecha_expiracion}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visados próximos a expirar */}
      {proximos.length > 0 && (
        <div style={{
          background: "#1a1000",
          border: "1px solid #f97316",
          borderRadius: "12px",
          padding: "16px"
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "10px"
          }}>
            <span style={{
              color: "#fbbf24", fontWeight: "700", fontSize: "14px"
            }}>
              ⚠️ {proximos.length} visado{proximos.length > 1 ? "s" : ""} expira{proximos.length > 1 ? "n" : ""} en 30 días
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {proximos.map(j => {
              const diasRestantes = Math.ceil(
                (new Date(j.visado.fecha_expiracion) - hoy) / (1000 * 60 * 60 * 24)
              );
              return (
                <div
                  key={j.id}
                  onClick={() => navigate(`/jugador/${j.id}`)}
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", cursor: "pointer",
                    padding: "6px 10px", background: "#201500",
                    borderRadius: "8px",
                    transition: "background 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2a1c00"}
                  onMouseLeave={e => e.currentTarget.style.background = "#201500"}
                >
                  <span style={{ color: "#ccc", fontSize: "13px" }}>
                    {j.nombre} {j.apellidos}
                  </span>
                  <span style={{
                    color: diasRestantes <= 7 ? "#f87171" : "#fbbf24",
                    fontSize: "12px", fontWeight: "600"
                  }}>
                    {diasRestantes} día{diasRestantes !== 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
