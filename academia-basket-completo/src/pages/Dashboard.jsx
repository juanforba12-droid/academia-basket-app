import { useEffect, useState } from "react";
import {
  collection, getDocs, query, orderBy,
  where, limit, doc, getDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import AlertasVisados from "../components/AlertasVisados";

const DOCS_LISTA = [
  "pasaporte","antecedentes","seguro_medico","certificados_academicos",
  "visado","nie","contrato_firmado","foto_oficial"
];

export default function Dashboard() {
  const { perfil } = useAuth();
  const navigate   = useNavigate();

  const [jugadores,  setJugadores]  = useState([]);
  const [sesiones,   setSesiones]   = useState([]);
  const [partidos,   setPartidos]   = useState([]);
  const [mensajes,   setMensajes]   = useState([]);
  const [temporada,  setTemporada]  = useState("todas");
  const [loading,    setLoading]    = useState(true);

  const esAdmin = perfil?.rol === "admin";

  // Cargar temporada activa desde Firestore
  useEffect(() => {
    getDoc(doc(db, "config", "temporada_activa"))
      .then(snap => {
        if (snap.exists()) setTemporada(snap.data().temporada || "todas");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!perfil) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const [jSnap, sSnap, pSnap] = await Promise.all([
          getDocs(query(collection(db, "jugadores"), orderBy("apellidos_sort"))),
          getDocs(query(collection(db, "sesiones"),  orderBy("fecha", "desc"), limit(8))),
          getDocs(query(collection(db, "partidos"),  orderBy("fecha", "desc"), limit(8))),
        ]);
        setJugadores(jSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSesiones(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPartidos(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Mensajes sin leer solo para admin
        if (esAdmin) {
          const mSnap = await getDocs(query(
            collection(db, "contacto"),
            where("leido", "==", false)
          ));
          setMensajes(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) {
        console.error("Dashboard fetch:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [perfil]);

  // Filtrar por temporada
  const jugadoresFiltrados = temporada === "todas"
    ? jugadores
    : jugadores.filter(j => j.temporada === temporada || !j.temporada);

  const sesionesFiltradas = temporada === "todas"
    ? sesiones
    : sesiones.filter(s => s.temporada === temporada);

  const partidosFiltrados = temporada === "todas"
    ? partidos
    : partidos.filter(p => p.temporada === temporada);

  const activos   = jugadoresFiltrados.filter(j => j.estado === "activo").length;
  const pendientes = jugadoresFiltrados.filter(j => !j.estado || j.estado === "pendiente").length;

  const jugadoresDocsPendientes = jugadoresFiltrados.filter(j => {
    const ok = DOCS_LISTA.filter(d => j.docs?.[d]).length;
    return ok < DOCS_LISTA.length;
  });

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "center", height: "60vh"
    }}>
      <p style={{ color: "#4a7a60" }}>Cargando dashboard...</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">
            Hola, {perfil?.nombre} 👋
          </div>
          <div className="page-subtitle">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long", year: "numeric",
              month: "long", day: "numeric"
            })}
          </div>
        </div>
        <select
          value={temporada}
          onChange={e => setTemporada(e.target.value)}
          style={{ maxWidth: "200px" }}>
          <option value="todas">Todas las temporadas</option>
          <option value="2026-2027">Temporada 2026-27</option>
          <option value="2025-2026">Temporada 2025-26</option>
          <option value="2024-2025">Temporada 2024-25</option>
        </select>
      </div>

      {/* Alertas visados — solo admin */}
      {esAdmin && <AlertasVisados jugadores={jugadoresFiltrados} />}

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: esAdmin ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
        gap: "14px", marginBottom: "24px"
      }}>
        <StatCard valor={jugadoresFiltrados.length}
          label="Total jugadores" color="#fff" icon="👥"
          onClick={() => navigate("/jugadores")} />
        <StatCard valor={activos}
          label="Activos" color="#4ade80" icon="✅"
          onClick={() => navigate("/jugadores")} />
        <StatCard valor={pendientes}
          label="Pendientes" color="#fbbf24" icon="⏳"
          onClick={() => navigate("/jugadores")} />
        {esAdmin && (
          <StatCard valor={mensajes.length}
            label="Mensajes sin leer"
            color={mensajes.length > 0 ? "#f97316" : "#4a7a60"}
            icon="📩"
            onClick={() => navigate("/contactos")} />
        )}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "20px"
      }}>
        {/* Documentación pendiente */}
        <div className="card">
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "16px"
          }}>
            <h3 style={{ color: "#fff", fontSize: "15px" }}>
              📄 Docs pendientes
            </h3>
            <span style={{ color: "#4a7a60", fontSize: "12px" }}>
              {jugadoresDocsPendientes.length} jugadores
            </span>
          </div>
          {jugadoresDocsPendientes.length === 0 ? (
            <p style={{ color: "#4ade80", fontSize: "14px" }}>
              ✓ Todo en orden
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {jugadoresDocsPendientes.slice(0, 6).map(j => {
                const ok  = DOCS_LISTA.filter(d => j.docs?.[d]).length;
                const pct = Math.round((ok / DOCS_LISTA.length) * 100);
                const color = pct === 100 ? "#4ade80" :
                              pct >= 50   ? "#fbbf24" : "#f87171";
                return (
                  <div key={j.id}
                    onClick={() => navigate(`/jugador/${j.id}`)}
                    style={{ cursor: "pointer" }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      marginBottom: "4px"
                    }}>
                      <span style={{
                        color: "#ccc", fontSize: "13px",
                        overflow: "hidden", whiteSpace: "nowrap",
                        textOverflow: "ellipsis", maxWidth: "160px"
                      }}>
                        {j.nombre} {j.apellidos}
                      </span>
                      <span style={{ color, fontSize: "12px", fontWeight: "600" }}>
                        {ok}/{DOCS_LISTA.length}
                      </span>
                    </div>
                    <div style={{
                      height: "4px", background: "#1e4030",
                      borderRadius: "2px", overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%", borderRadius: "2px",
                        width: `${pct}%`, background: color,
                        transition: "width 0.3s"
                      }} />
                    </div>
                  </div>
                );
              })}
              {jugadoresDocsPendientes.length > 6 && (
                <p style={{ color: "#4a7a60", fontSize: "12px" }}>
                  +{jugadoresDocsPendientes.length - 6} más...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Últimas sesiones */}
        <div className="card">
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "16px"
          }}>
            <h3 style={{ color: "#fff", fontSize: "15px" }}>
              🏋️ Últimas sesiones
            </h3>
            <button onClick={() => navigate("/seguimiento-deportivo")}
              style={{
                background: "none", border: "none",
                color: "#4a7a60", fontSize: "12px", cursor: "pointer"
              }}>
              Ver todas →
            </button>
          </div>
          {sesionesFiltradas.length === 0 ? (
            <p style={{ color: "#666", fontSize: "14px" }}>
              Sin sesiones registradas.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {sesionesFiltradas.slice(0, 5).map(s => {
                const total  = Object.keys(s.asistencia || {}).length;
                const asist  = Object.values(s.asistencia || {})
                  .filter(v => v === "presente").length;
                return (
                  <div key={s.id} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "8px 0",
                    borderBottom: "1px solid #0f2015"
                  }}>
                    <div>
                      <span style={{ color: "#ccc", fontSize: "13px" }}>
                        {s.fecha}
                      </span>
                      <span style={{
                        background: "#1e4030", borderRadius: "4px",
                        padding: "1px 6px", fontSize: "11px",
                        color: "#6ab88a", marginLeft: "8px"
                      }}>
                        {s.tipo}
                      </span>
                    </div>
                    <span style={{ color: "#4a7a60", fontSize: "12px" }}>
                      {total > 0 ? `${asist}/${total}` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos partidos */}
        <div className="card">
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "16px"
          }}>
            <h3 style={{ color: "#fff", fontSize: "15px" }}>
              🏀 Últimos partidos
            </h3>
            <button onClick={() => navigate("/seguimiento-deportivo")}
              style={{
                background: "none", border: "none",
                color: "#4a7a60", fontSize: "12px", cursor: "pointer"
              }}>
              Ver todos →
            </button>
          </div>
          {partidosFiltrados.length === 0 ? (
            <p style={{ color: "#666", fontSize: "14px" }}>
              Sin partidos registrados.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {partidosFiltrados.slice(0, 5).map(p => (
                <div key={p.id} style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "8px 0",
                  borderBottom: "1px solid #0f2015"
                }}>
                  <div>
                    <span style={{ color: "#ccc", fontSize: "13px" }}>
                      {p.fecha}
                    </span>
                    <span style={{
                      color: "#888", fontSize: "12px", marginLeft: "8px"
                    }}>
                      vs {p.rival}
                    </span>
                  </div>
                  <span style={{
                    fontWeight: "700", fontSize: "13px",
                    color: p.resultado_tipo === "V" ? "#4ade80" :
                           p.resultado_tipo === "D" ? "#f87171" : "#fbbf24"
                  }}>
                    {p.resultado || "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="card">
          <h3 style={{ color: "#fff", fontSize: "15px", marginBottom: "16px" }}>
            ⚡ Accesos rápidos
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px"
          }}>
            {[
              { label: "Nueva sesión",    icon: "🏋️", path: "/sesion/nueva",   roles: ["admin","entrenador"] },
              { label: "Nuevo partido",   icon: "🏀", path: "/partido/nuevo",  roles: ["admin","entrenador"] },
              { label: "Nuevo jugador",   icon: "➕", path: "/nuevo",          roles: ["admin"] },
              { label: "Publicar noticia",icon: "📰", path: "/noticias",       roles: ["admin","entrenador"] },
              { label: "Ver foro",        icon: "💬", path: "/foro",           roles: ["admin","entrenador"] },
              { label: "Contactos",       icon: "📩", path: "/contactos",      roles: ["admin"] },
            ]
              .filter(a => a.roles.includes(perfil?.rol))
              .map(a => (
                <button key={a.path}
                  onClick={() => navigate(a.path)}
                  style={{
                    background: "#0f1f17", border: "1px solid #1e4030",
                    borderRadius: "8px", padding: "12px",
                    cursor: "pointer",
                    display: "flex", alignItems: "center",
                    gap: "8px", color: "#ccc", fontSize: "13px",
                    fontWeight: "500", transition: "background 0.15s",
                    textAlign: "left", minHeight: "44px"
                  }}
                  onMouseEnter={e =>
                    e.currentTarget.style.background = "#1a3326"
                  }
                  onMouseLeave={e =>
                    e.currentTarget.style.background = "#0f1f17"
                  }>
                  <span style={{ fontSize: "18px" }}>{a.icon}</span>
                  {a.label}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Mensajes recientes — solo admin */}
      {esAdmin && mensajes.length > 0 && (
        <div className="card" style={{ marginTop: "4px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "16px"
          }}>
            <h3 style={{ color: "#fff", fontSize: "15px" }}>
              📩 Mensajes sin leer
              <span style={{
                background: "#f97316", color: "#fff",
                borderRadius: "20px", padding: "1px 8px",
                fontSize: "11px", marginLeft: "8px"
              }}>
                {mensajes.length}
              </span>
            </h3>
            <button onClick={() => navigate("/contactos")}
              style={{
                background: "none", border: "none",
                color: "#4a7a60", fontSize: "12px", cursor: "pointer"
              }}>
              Ver todos →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {mensajes.slice(0, 3).map(m => (
              <div key={m.id} style={{
                padding: "10px", background: "#0f1f17",
                borderRadius: "8px", borderLeft: "3px solid #f97316"
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginBottom: "4px"
                }}>
                  <span style={{
                    color: "#fff", fontSize: "13px", fontWeight: "600"
                  }}>
                    {m.nombre}
                  </span>
                  <span style={{ color: "#4a7a60", fontSize: "11px" }}>
                    {m.fecha}
                  </span>
                </div>
                <p style={{
                  color: "#888", fontSize: "12px",
                  overflow: "hidden", whiteSpace: "nowrap",
                  textOverflow: "ellipsis"
                }}>
                  {m.mensaje}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ valor, label, color, icon, onClick }) {
  return (
    <div className="card"
      onClick={onClick}
      style={{ cursor: "pointer", textAlign: "center", padding: "20px" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#2a5a40"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#1e4030"}>
      <div style={{ fontSize: "28px", marginBottom: "6px" }}>{icon}</div>
      <div style={{ fontSize: "32px", fontWeight: "800", color }}>
        {valor}
      </div>
      <div style={{ fontSize: "12px", color: "#4a7a60", marginTop: "4px" }}>
        {label}
      </div>
    </div>
  );
}
