import { useToast } from "../components/Toast.jsx";
import { useEffect, useState } from "react";
import {
  collection, getDocs, orderBy, query,
  doc, updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ESTADOS_ASISTENCIA, calcularAsistencia
} from "../utils/helpers";

export default function SeguimientoDeportivo() {
  const { perfil }  = useAuth();
  const toast = useToast();
  const navigate    = useNavigate();
  const [jugadores, setJugadores] = useState([]);
  const [sesiones,  setSesiones]  = useState([]);
  const [partidos,  setPartidos]  = useState([]);
  const [tab,       setTab]       = useState("resumen");
  const [loading,   setLoading]   = useState(true);

  // Edición sesión
  const [sesionEditando, setSesionEditando] = useState(null);
  const [asistEdit,      setAsistEdit]      = useState({});
  const [savingEdit,     setSavingEdit]     = useState(false);

  const esAdmin = perfil?.rol === "admin";
  const esStaff = perfil?.rol === "admin" || perfil?.rol === "entrenador";

  useEffect(() => {
    const fetch = async () => {
      const [jSnap, sSnap, pSnap] = await Promise.all([
        (async () => { try { return await getDocs(query(collection(db, "jugadores"), orderBy("apellidos_sort"))); } catch { return await getDocs(collection(db, "jugadores")); } })(),
        getDocs(query(collection(db, "sesiones"),  orderBy("fecha", "desc"))),
        getDocs(query(collection(db, "partidos"),  orderBy("fecha", "desc"))),
      ]);
      setJugadores(jSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSesiones(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPartidos(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  const abrirEdicion = (sesion) => {
    setSesionEditando(sesion);
    setAsistEdit({ ...sesion.asistencia });
  };

  const guardarEdicion = async () => {
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, "sesiones", sesionEditando.id), {
        asistencia: asistEdit
      });
      setSesiones(s => s.map(ses =>
        ses.id === sesionEditando.id
          ? { ...ses, asistencia: asistEdit }
          : ses
      ));
      setSesionEditando(null);
    } catch {
      toast.error("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSavingEdit(false);
    }
  };

  const statsJugador = (jugadorId) => {
    const stats = {
      puntos: 0, rebotes: 0, asistencias: 0, partidos: 0
    };
    partidos.forEach(p => {
      const j = p.jugadores?.find(j => j.jugadorId === jugadorId);
      if (j) {
        stats.puntos      += j.puntos      || 0;
        stats.rebotes     += j.rebotes     || 0;
        stats.asistencias += j.asistencias || 0;
        stats.partidos    += 1;
      }
    });
    return stats;
  };

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "center", height: "60vh"
    }}>
      <p style={{ color: "#4a7a60" }}>Cargando...</p>
    </div>
  );

  // Modal edición sesión
  if (sesionEditando) {
    const jugadoresSesion = jugadores.filter(j =>
      sesionEditando.jugadores?.includes(j.id)
    );
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Editar sesión</div>
            <div className="page-subtitle">
              {sesionEditando.tipo} · {sesionEditando.fecha}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-secondary"
              onClick={() => setSesionEditando(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary"
              onClick={guardarEdicion} disabled={savingEdit}>
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{
            color: "#fff", fontSize: "15px", marginBottom: "16px"
          }}>
            Corregir asistencia
          </h3>
          {jugadoresSesion.map(j => {
            const estado = asistEdit[j.id] || "ausente";
            const info   = ESTADOS_ASISTENCIA[estado];
            return (
              <div key={j.id} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "10px 0",
                borderBottom: "1px solid #1e4030", gap: "12px"
              }}>
                <span style={{ color: "#fff", fontSize: "14px" }}>
                  {j.nombre} {j.apellidos}
                </span>
                <select
                  value={estado}
                  onChange={e => setAsistEdit(a => ({
                    ...a, [j.id]: e.target.value
                  }))}
                  style={{
                    background: "#0f1f17",
                    border: `1px solid ${info?.color || "#1e4030"}40`,
                    borderRadius: "6px", padding: "5px 8px",
                    color: info?.color || "#ccc",
                    fontSize: "12px", fontWeight: "600",
                    minWidth: "110px"
                  }}>
                  {Object.entries(ESTADOS_ASISTENCIA).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Seguimiento Deportivo</div>
          <div className="page-subtitle">Vista global del equipo</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-primary"
            onClick={() => navigate("/sesion/nueva")}>
            + Sesión
          </button>
          <button className="btn btn-secondary"
            onClick={() => navigate("/partido/nuevo")}>
            + Partido
          </button>
        </div>
      </div>

      <div className="tabs">
        {["resumen","sesiones","partidos"].map(t => (
          <div key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}>
            {t === "resumen"   ? "Resumen equipo"
              : t === "sesiones" ? `Sesiones (${sesiones.length})`
              : `Partidos (${partidos.length})`}
          </div>
        ))}
      </div>

      {/* Resumen */}
      {tab === "resumen" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="players-table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Asistencia</th>
                <th className="col-opcional">Partidos</th>
                <th>Pts/P</th>
                <th className="col-opcional">Reb/P</th>
                <th className="col-opcional">Ast/P</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map(j => {
                const asist = calcularAsistencia(sesiones, j.id);
                const stats = statsJugador(j.id);
                return (
                  <tr key={j.id}
                    onClick={() => navigate(`/jugador/${j.id}`)}>
                    <td>
                      <strong style={{ color: "#fff" }}>
                        {j.nombre} {j.apellidos}
                      </strong>
                    </td>
                    <td>
                      {asist.pct !== null ? (
                        <span style={{
                          color: asist.pct >= 80 ? "#4ade80" :
                                 asist.pct >= 60 ? "#fbbf24" : "#f87171",
                          fontWeight: "600"
                        }}>
                          {asist.pct}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="col-opcional">
                      {stats.partidos || "—"}
                    </td>
                    <td style={{ color: "#f97316", fontWeight: "600" }}>
                      {stats.partidos
                        ? (stats.puntos / stats.partidos).toFixed(1)
                        : "—"}
                    </td>
                    <td className="col-opcional">
                      {stats.partidos
                        ? (stats.rebotes / stats.partidos).toFixed(1)
                        : "—"}
                    </td>
                    <td className="col-opcional">
                      {stats.partidos
                        ? (stats.asistencias / stats.partidos).toFixed(1)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sesiones */}
      {tab === "sesiones" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {sesiones.length === 0 ? (
            <p style={{ color: "#666", padding: "24px" }}>
              No hay sesiones registradas.
            </p>
          ) : (
            <table className="players-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Presentes</th>
                  <th className="col-opcional">Notas</th>
                  {esAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {sesiones.map(s => {
                  const total   = Object.keys(s.asistencia || {}).length;
                  const present = Object.values(s.asistencia || {})
                    .filter(v => v === "presente").length;
                  return (
                    <tr key={s.id}>
                      <td>{s.fecha}</td>
                      <td>
                        <span style={{
                          background: "#1e4030", borderRadius: "4px",
                          padding: "2px 8px", fontSize: "12px",
                          color: "#6ab88a"
                        }}>
                          {s.tipo}
                        </span>
                      </td>
                      <td>
                        {total > 0 ? (
                          <span style={{
                            color: present / total >= 0.8 ? "#4ade80" :
                                   present / total >= 0.6 ? "#fbbf24" : "#f87171"
                          }}>
                            {present}/{total}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="col-opcional" style={{
                        color: "#666", fontSize: "13px"
                      }}>
                        {s.notas || "—"}
                      </td>
                      {esAdmin && (
                        <td>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: "11px", padding: "3px 8px" }}
                            onClick={() => abrirEdicion(s)}>
                            ✏️ Editar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Partidos */}
      {tab === "partidos" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {partidos.length === 0 ? (
            <p style={{ color: "#666", padding: "24px" }}>
              No hay partidos registrados.
            </p>
          ) : (
            <table className="players-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Rival</th>
                  <th>Resultado</th>
                  <th className="col-opcional">Lugar</th>
                  <th className="col-opcional">Jugadores</th>
                </tr>
              </thead>
              <tbody>
                {partidos.map(p => (
                  <tr key={p.id}
                    onClick={() => {
                      const id = p.jugadores?.[0]?.jugadorId;
                      if (id) navigate(`/jugador/${id}`);
                    }}>
                    <td>{p.fecha}</td>
                    <td>
                      <strong style={{ color: "#fff" }}>{p.rival}</strong>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: "700",
                        color: p.resultado_tipo === "V" ? "#4ade80" :
                               p.resultado_tipo === "D" ? "#f87171" : "#fbbf24"
                      }}>
                        {p.resultado || "—"}
                      </span>
                    </td>
                    <td className="col-opcional" style={{
                      color: "#4a7a60", fontSize: "13px"
                    }}>
                      {p.lugar || "—"}
                    </td>
                    <td className="col-opcional" style={{
                      color: "#4a7a60"
                    }}>
                      {p.jugadores?.length || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
