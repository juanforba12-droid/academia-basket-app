import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "100vh", background: "#0f1f17",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "16px", padding: "20px", textAlign: "center"
    }}>
      <div style={{ fontSize: "80px" }}>🏀</div>
      <h1 style={{ color: "#fff", fontSize: "48px", fontWeight: "800" }}>404</h1>
      <p style={{ color: "#4a7a60", fontSize: "16px", maxWidth: "320px" }}>
        Esta página no existe o no tienes acceso a ella.
      </p>
      <div style={{ display: "flex", gap: "10px" }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          ← Volver
        </button>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
