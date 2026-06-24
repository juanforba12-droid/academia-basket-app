import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { normalizar } from "../utils/helpers";

const PROGRAMAS = {
  gap_year:  "Gap Year",
  academic:  "Academic",
  semestral: "Semestral",
  summer:    "Summer",
};

const DOCS_LISTA = [
  "pasaporte","antecedentes","seguro_medico","certificados_academicos",
  "visado","nie","contrato_firmado","foto_oficial"
];

export default function Jugadores() {
  const [jugadores, setJugadores]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [busqueda, setBusqueda]       = useState("");
  const [filtroEstado, setFiltroEstado]   = useState("todos");
  const [filtroPrograma, setFiltroPrograma] = useState("todos");
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        // Intentar con campos sort (jugadores creados con la nueva app)
        const q = query(
          collection(db, "jugadores"),
          orderBy("apellidos_sort"),
          orderBy("nombre_sort")
        );
        const snap = await getDocs(q);
        setJugadores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        // Fallback: cargar sin ordenación si no existe el campo sort
        // (jugadores creados antes de la nueva versión)
        const snap = await getDocs(collection(db, "jugadores"));
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ordenar en cliente
        lista.sort((a, b) =>
          `${a.apellidos}${a.nombre}`.localeCompare(`${b.apellidos}${b.nombre}`, "es")
        );
        setJugadores(lista);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const jugadoresFiltrados = jugadores
    .filter(j => filtroEstado === "todos" || (j.estado || "pendiente") === filtroEstado)
    .filter(j => filtroPrograma === "todos" || j.programa === filtroPrograma)
    .filter(j =>
      normalizar(`${j.nombre} ${j.apellidos} ${j.pais} ${j.posicion}`)
        .includes(normalizar(busqueda))
    );

  const docsCompletados = (j) =>
    DOCS_LISTA.filter(d => j.docs?.[d]).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Jugadores</div>
          <div className="page-subtitle">
            {jugadoresFiltrados.length} de {jugadores.length} jugadores
          </div>
        </div>
        <button className="btn btn-primary"
          onClick={() => navigate("/nuevo")}>
          + Nuevo jugador
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: "10px",
        marginBottom: "16px", flexWrap: "wrap"
      }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, país, posición..."
          style={{ flex: 1, minWidth: "200px" }}
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="pendiente">Pendientes</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <select
          value={filtroPrograma}
          onChange={e => setFiltroPrograma(e.target.value)}>
          <option value="todos">Todos los programas</option>
          {Object.entries(PROGRAMAS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {(busqueda || filtroEstado !== "todos" || filtroPrograma !== "todos") && (
          <button
            className="btn btn-secondary"
            onClick={() => {
              setBusqueda("");
              setFiltroEstado("todos");
              setFiltroPrograma("todos");
            }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <p style={{ color: "#666", padding: "24px" }}>Cargando...</p>
        ) : jugadoresFiltrados.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>👥</div>
            <p style={{ color: "#666" }}>
              {jugadores.length === 0
                ? "No hay jugadores. Añade el primero."
                : "No hay jugadores con ese filtro."}
            </p>
          </div>
        ) : (
          <table className="players-table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th className="col-opcional">País</th>
                <th>Programa</th>
                <th className="col-opcional">Posición</th>
                <th>Estado</th>
                <th>Docs</th>
              </tr>
            </thead>
            <tbody>
              {jugadoresFiltrados.map(j => {
                const docs = docsCompletados(j);
                const iniciales =
                  (j.nombre?.[0] || "") + (j.apellidos?.[0] || "");
                return (
                  <tr key={j.id}
                    onClick={() => navigate(`/jugador/${j.id}`)}>
                    <td>
                      <div style={{
                        display: "flex",
                        alignItems: "center", gap: "10px"
                      }}>
                        {/* Avatar */}
                        {j.fotoUrl ? (
                          <img src={j.fotoUrl} alt={j.nombre}
                            loading="lazy"
                            onError={e => { e.target.style.display = "none"; e.target.nextSibling && (e.target.nextSibling.style.display = "flex"); }}
                            style={{
                              width: "32px", height: "32px",
                              borderRadius: "50%", objectFit: "cover",
                              flexShrink: 0
                            }} />
                        ) : (
                          <div style={{
                            width: "32px", height: "32px",
                            borderRadius: "50%", background: "#1a7a4a",
                            display: "flex", alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px", fontWeight: "700",
                            color: "#fff", flexShrink: 0
                          }}>
                            {iniciales.toUpperCase()}
                          </div>
                        )}
                        <div style={{
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          maxWidth: "160px"
                        }}>
                          <strong style={{ color: "#fff" }}>
                            {j.nombre} {j.apellidos}
                          </strong>
                          {j.codigo && (
                            <span style={{
                              color: "#f97316", fontSize: "11px",
                              marginLeft: "6px"
                            }}>
                              {j.codigo}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="col-opcional"
                      style={{ color: "#4a7a60" }}>
                      {j.pais || "—"}
                    </td>
                    <td style={{ color: "#ccc", fontSize: "13px" }}>
                      {PROGRAMAS[j.programa] || j.programa || "—"}
                    </td>
                    <td className="col-opcional"
                      style={{ color: "#4a7a60" }}>
                      {j.posicion || "—"}
                    </td>
                    <td>
                      <span className={`badge badge-${j.estado || "pendiente"}`}>
                        {j.estado || "pendiente"}
                      </span>
                    </td>
                    <td>
                      <div style={{
                        display: "flex", alignItems: "center", gap: "6px"
                      }}>
                        <div style={{
                          width: "48px", height: "4px",
                          background: "#1e4030", borderRadius: "2px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%",
                            width: `${(docs / 8) * 100}%`,
                            background:
                              docs === 8 ? "#4ade80" :
                              docs >= 5  ? "#fbbf24" : "#f87171",
                            borderRadius: "2px"
                          }} />
                        </div>
                        <span style={{
                          fontSize: "12px",
                          color:
                            docs === 8 ? "#4ade80" :
                            docs >= 5  ? "#fbbf24" : "#f87171"
                        }}>
                          {docs}/8
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
