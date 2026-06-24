import { useToast } from "../components/Toast.jsx";
import { useEffect, useState } from "react";
import {
  collection, addDoc, getDocs, query,
  where, orderBy, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useIsMounted } from "../hooks/useIsMounted.js";
import SliderMovil from "./SliderMovil";
import {
  calcularAsistencia,
  ESTADOS_ASISTENCIA,
  formatearFecha
} from "../utils/helpers";

const HABILIDADES = [
  { key: "tiro",     label: "Tiro" },
  { key: "bote",     label: "Bote" },
  { key: "defensa",  label: "Defensa" },
  { key: "tactica",  label: "Táctica" },
  { key: "fisico",   label: "Físico" },
  { key: "actitud",  label: "Actitud" },
];

export default function TabDeportivo({
  jugadorId,
  jugadorNombre = "",
  soloLectura = false
}) {
  const { user, perfil } = useAuth();
  const toast = useToast();
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [sesiones,     setSesiones]     = useState([]);
  const [partidos,     setPartidos]     = useState([]);
  const [nuevaEval,    setNuevaEval]    = useState(false);
  const [habilidades,  setHabilidades]  = useState({});
  const [notasEval,    setNotasEval]    = useState("");
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);

  const isMounted = useIsMounted();

  const puedeEvaluar =
    !soloLectura &&
    (perfil?.rol === "admin" || perfil?.rol === "entrenador");

  useEffect(() => {
    const fetch = async () => {
      const [eSnap, sSnap, pSnap] = await Promise.all([
        getDocs(query(
          collection(db, "evaluaciones"),
          where("jugadorId", "==", jugadorId),
          orderBy("fecha", "desc")
        )),
        getDocs(query(
          collection(db, "sesiones"),
          orderBy("fecha", "desc")
        )),
        getDocs(query(
          collection(db, "partidos"),
          orderBy("fecha", "desc")
        )),
      ]);
      if (!isMounted()) return;
      setEvaluaciones(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSesiones(
        sSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => s.jugadores?.includes(jugadorId))
      );
      setPartidos(
        pSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.jugadores?.some(j => j.jugadorId === jugadorId))
      );
      setLoading(false);
    };
    fetch();
  }, [jugadorId]);

  const handleGuardarEval = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = {
        jugadorId,
        fecha:       new Date().toISOString().split("T")[0],
        habilidades,
        notas:       notasEval,
        entrenadorId:     user.uid,
        entrenadorNombre: `${perfil.nombre} ${perfil.apellidos}`,
        createdAt:   serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "evaluaciones"), data);
      setEvaluaciones(e => [{ id: docRef.id, ...data }, ...e]);
      setNuevaEval(false);
      setHabilidades({});
      setNotasEval("");
    } catch {
      toast.error("Error al guardar la evaluación.");
    } finally {
      setSaving(false);
    }
  };

  // Estadísticas con asistencia real (excluye justificadas)
  const asistStats = calcularAsistencia(sesiones, jugadorId);

  const statsTotal = partidos.reduce((acc, p) => {
    const j = p.jugadores?.find(j => j.jugadorId === jugadorId);
    if (j) {
      acc.puntos      += j.puntos      || 0;
      acc.rebotes     += j.rebotes     || 0;
      acc.asistencias += j.asistencias || 0;
      acc.minutos     += j.minutos     || 0;
      acc.partidos    += 1;
    }
    return acc;
  }, { puntos: 0, rebotes: 0, asistencias: 0, minutos: 0, partidos: 0 });

  if (loading) return (
    <p style={{ color: "#4a7a60", padding: "20px" }}>Cargando...</p>
  );

  return (
    <div>
      {/* Stats resumen */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "12px", marginBottom: "20px"
      }}>
        {[
          {
            label: "Asistencia real",
            value: asistStats.pct !== null
              ? `${asistStats.pct}%` : "—",
            sub: asistStats.justificadas > 0
              ? `${asistStats.justificadas} justificada${asistStats.justificadas > 1 ? "s" : ""}`
              : `${asistStats.total} sesiones`,
            color: asistStats.pct === null ? "#666" :
                   asistStats.pct >= 80    ? "#4ade80" :
                   asistStats.pct >= 60    ? "#fbbf24" : "#f87171"
          },
          {
            label: "Partidos",
            value: statsTotal.partidos || "—",
            sub:   statsTotal.partidos ? `${statsTotal.minutos} min totales` : "",
            color: "#fff"
          },
          {
            label: "Pts/partido",
            value: statsTotal.partidos
              ? (statsTotal.puntos / statsTotal.partidos).toFixed(1)
              : "—",
            sub: statsTotal.puntos ? `${statsTotal.puntos} pts totales` : "",
            color: "#f97316"
          },
          {
            label: "Reb/partido",
            value: statsTotal.partidos
              ? (statsTotal.rebotes / statsTotal.partidos).toFixed(1)
              : "—",
            sub: statsTotal.rebotes ? `${statsTotal.rebotes} reb totales` : "",
            color: "#60a5fa"
          },
        ].map(s => (
          <div key={s.label} className="card"
            style={{ textAlign: "center", padding: "16px" }}>
            <div style={{
              fontSize: "22px", fontWeight: "700", color: s.color
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: "12px", color: "#4a7a60", marginTop: "4px"
            }}>
              {s.label}
            </div>
            {s.sub && (
              <div style={{
                fontSize: "11px", color: "#2a5a3a", marginTop: "2px"
              }}>
                {s.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Leyenda asistencia */}
      {asistStats.total > 0 && (
        <div style={{
          display: "flex", gap: "12px", flexWrap: "wrap",
          marginBottom: "16px"
        }}>
          {Object.entries(ESTADOS_ASISTENCIA).map(([k, v]) => {
            const count = sesiones.filter(
              s => s.asistencia?.[jugadorId] === k
            ).length;
            if (!count) return null;
            return (
              <span key={k} style={{
                background: "#132d1e", borderRadius: "6px",
                padding: "4px 10px", fontSize: "12px"
              }}>
                <span style={{ color: v.color }}>{v.label}</span>
                <span style={{ color: "#4a7a60", marginLeft: "4px" }}>
                  {count}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Evaluaciones */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "16px"
      }}>
        <h3 style={{ color: "#fff", fontSize: "15px" }}>
          Evaluaciones
        </h3>
        {puedeEvaluar && (
          <button className="btn btn-primary"
            style={{ fontSize: "13px" }}
            onClick={() => setNuevaEval(v => !v)}>
            {nuevaEval ? "Cancelar" : "+ Nueva evaluación"}
          </button>
        )}
      </div>

      {/* Formulario nueva evaluación */}
      {nuevaEval && (
        <div className="card" style={{ marginBottom: "16px" }}>
          {/* Aviso nombre jugador para evitar evaluaciones en ficha equivocada */}
          <div style={{
            background: "#1a1000", border: "1px solid #f97316",
            borderRadius: "8px", padding: "10px 14px",
            marginBottom: "16px",
            display: "flex", alignItems: "center", gap: "8px"
          }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <span style={{ color: "#fbbf24", fontSize: "13px" }}>
              Evaluando a{" "}
              <strong style={{ color: "#fff" }}>{jugadorNombre}</strong>.
              Verifica que es el jugador correcto.
            </span>
          </div>

          <h4 style={{
            color: "#fff", marginBottom: "16px", fontSize: "14px"
          }}>
            {new Date().toLocaleDateString("es-ES", {
              day: "numeric", month: "long", year: "numeric"
            })}
          </h4>

          <div style={{
            display: "flex", flexDirection: "column", gap: "16px",
            marginBottom: "16px"
          }}>
            {HABILIDADES.map(h => (
              <SliderMovil
                key={h.key}
                label={h.label}
                value={habilidades[h.key] || 0}
                onChange={v => setHabilidades(prev => ({
                  ...prev, [h.key]: v
                }))}
              />
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label>Notas</label>
            <textarea
              value={notasEval}
              onChange={e => setNotasEval(e.target.value)}
              placeholder="Observaciones de la evaluación..."
              maxLength={500}
            />
          </div>

          <button className="btn btn-primary"
            onClick={handleGuardarEval} disabled={saving}>
            {saving ? "Guardando..." : "Guardar evaluación"}
          </button>
        </div>
      )}

      {/* Lista evaluaciones */}
      {evaluaciones.length === 0 ? (
        <p style={{ color: "#666", fontSize: "14px" }}>
          No hay evaluaciones registradas.
        </p>
      ) : (
        evaluaciones.map(ev => (
          <div key={ev.id} className="card" style={{ marginBottom: "12px" }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginBottom: "12px", gap: "8px"
            }}>
              <span style={{ color: "#fff", fontWeight: "600", fontSize: "14px" }}>
                {formatearFecha(ev.fecha)}
              </span>
              {ev.entrenadorNombre && (
                <span style={{ color: "#4a7a60", fontSize: "12px" }}>
                  {ev.entrenadorNombre}
                </span>
              )}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px", marginBottom: "12px"
            }}>
              {HABILIDADES.map(h => {
                const val = ev.habilidades?.[h.key] ?? null;
                const color = val === null ? "#4a7a60" :
                              val >= 8    ? "#4ade80" :
                              val >= 5    ? "#fbbf24" : "#f87171";
                return (
                  <div key={h.key} style={{
                    background: "#0f1f17", borderRadius: "6px",
                    padding: "8px 10px",
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ color: "#4a7a60", fontSize: "12px" }}>
                      {h.label}
                    </span>
                    <span style={{
                      color, fontWeight: "700", fontSize: "13px"
                    }}>
                      {val !== null ? `${val}/10` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {ev.notas && (
              <p style={{ color: "#888", fontSize: "13px" }}>{ev.notas}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
