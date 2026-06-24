import { useNavigate } from "react-router-dom";

export default function SinAcceso() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh", background: "#0f1f17",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "16px", padding: "20px", textAlign: "center"
    }}>
      <div style={{ fontSize: "64px" }}>🔒</div>
      <h2 style={{ color: "#fff", fontSize: "24px", fontWeight: "700" }}>
        Sin acceso
      </h2>
      <p style={{
        color: "#4a7a60", fontSize: "14px",
        maxWidth: "300px", lineHeight: "1.6"
      }}>
        No tienes permisos para ver esta sección.
        Si crees que es un error, contacta con el administrador.
      </p>
      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}>
          ← Volver
        </button>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/")}>
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
