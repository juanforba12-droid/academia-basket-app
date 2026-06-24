import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc,
  orderBy, query, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { hoyISO, ESTADOS_ASISTENCIA } from "../utils/helpers";
import { useTemporada } from "../hooks/useTemporada";
import { crearNotificacion } from "../utils/crearNotificacion";

export default function NuevaSesion() {
  const { user, perfil } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const temporada = useTemporada();
  const navigate = useNavigate();
  const [jugadores, setJugadores] = useState([]);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    fecha: hoyISO(),
    tipo: "entrenamiento",
    notas: "",
    obligatoria: true,
  });
  const [asistencia, setAsistencia] = useState({});

  useEffect(() => {
    const fetch = async () => {
      const snap = await (async () => {
          try {
            return await getDocs(query(collection(db, "jugadores"), orderBy("apellidos_sort")));
          } catch {
            return await getDocs(collection(db, "jugadores"));
          }
        })();
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Solo jugadores activos
      const activos = lista.filter(j =>
        !j.estado || j.estado === "activo" || j.estado === "pendiente"
      );
      setJugadores(activos);
      const init = {};
      activos.forEach(j => { init[j.id] = "presente"; });
      setAsistencia(init);
    };
    fetch();
  }, []);

  const setEstado = (jugadorId, estado) =>
    setAsistencia(a => ({ ...a, [jugadorId]: estado }));

  const toggleTodos = (estado) => {
    const nuevo = {};
    jugadores.forEach(j => { nuevo[j.id] = estado; });
    setAsistencia(nuevo);
  };

  const handleGuardar = async () => {
    if (saving) return;
    if (!form.fecha) return toast.warning("La fecha es obligatoria");
    if (jugadores.length === 0) {
      return toast.warning("No hay jugadores activos registrados");
    }

    // Advertencia si fecha futura
    if (form.fecha > hoyISO()) {
      const ok = confirm(
        "La fecha es futura. ¿Confirmas que es correcta?"
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "sesiones"), {
        ...form,
        asistencia,
        jugadores: jugadores.map(j => j.id),
        entrenadorId:     user.uid,
        entrenadorNombre: `${perfil.nombre} ${perfil.apellidos}`,
        temporada,
        createdAt: serverTimestamp(),
      });

      await crearNotificacion({
        tipo:    "sesion",
        titulo:  "Nueva sesión registrada",
        mensaje: `${form.tipo} — ${form.fecha}`,
        link:    "/seguimiento-deportivo",
        roles:   ["admin"],
      });

      navigate("/seguimiento-deportivo");
    } catch {
      toast.error("Error al guardar la sesión.");
    } finally {
      setSaving(false);
    }
  };

  const presentes = Object.values(asistencia)
    .filter(v => v === "presente").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Nueva sesión</div>
          <div className="page-subtitle">
            {presentes}/{jugadores.length} jugadores presentes
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary"
            onClick={() => navigate("/seguimiento-deportivo")}>
            Cancelar
          </button>
          <button className="btn btn-primary"
            onClick={handleGuardar} disabled={saving}>
            {saving ? "Guardando..." : "Guardar sesión"}
          </button>
        </div>
      </div>

      {/* Datos sesión */}
      <div className="card">
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "15px" }}>
          Datos de la sesión
        </h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="entrenamiento">Entrenamiento</option>
              <option value="tecnificacion">Tecnificación</option>
              <option value="fisico">Preparación física</option>
              <option value="video">Análisis de vídeo</option>
              <option value="partido">Partido</option>
              <option value="playa">Entrenamiento playa</option>
              <option value="montana">Actividad montaña</option>
            </select>
          </div>
          <div className="form-group">
            <label>Asistencia obligatoria</label>
            <select
              value={form.obligatoria ? "si" : "no"}
              onChange={e => setForm(f => ({
                ...f, obligatoria: e.target.value === "si"
              }))}>
              <option value="si">Sí</option>
              <option value="no">No (opcional)</option>
            </select>
          </div>
          <div className="form-group full">
            <label>Notas</label>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones de la sesión..."
              maxLength={500}
            />
          </div>
        </div>
      </div>

      {/* Asistencia */}
      <div className="card">
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "16px"
        }}>
          <h3 style={{ color: "#fff", fontSize: "15px" }}>
            Asistencia
          </h3>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "5px 10px" }}
              onClick={() => toggleTodos("presente")}>
              ✓ Todos presentes
            </button>
            <button className="btn btn-secondary"
              style={{ fontSize: "12px", padding: "5px 10px" }}
              onClick={() => toggleTodos("ausente")}>
              Todos ausentes
            </button>
          </div>
        </div>

        {jugadores.length === 0 ? (
          <p style={{ color: "#666" }}>
            No hay jugadores activos registrados.
          </p>
        ) : (
          jugadores.map(j => {
            const estado = asistencia[j.id] || "presente";
            const info   = ESTADOS_ASISTENCIA[estado];
            return (
              <div key={j.id} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "10px 0",
                borderBottom: "1px solid #1e4030", gap: "12px"
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px"
                }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: "#1a7a4a", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: "700", color: "#fff",
                    flexShrink: 0
                  }}>
                    {(j.nombre?.[0] || "").toUpperCase()}
                  </div>
                  <div>
                    <span style={{
                      color: "#fff", fontSize: "14px", fontWeight: "600"
                    }}>
                      {j.nombre} {j.apellidos}
                    </span>
                    {j.posicion && (
                      <span style={{
                        color: "#4a7a60", fontSize: "12px",
                        marginLeft: "8px"
                      }}>
                        {j.posicion}
                      </span>
                    )}
                  </div>
                </div>

                <select
                  value={estado}
                  onChange={e => setEstado(j.id, e.target.value)}
                  style={{
                    background: "#0f1f17",
                    border: `1px solid ${info?.color || "#1e4030"}40`,
                    borderRadius: "6px", padding: "5px 8px",
                    color: info?.color || "#ccc",
                    fontSize: "12px", fontWeight: "600",
                    cursor: "pointer", minWidth: "110px"
                  }}>
                  {Object.entries(ESTADOS_ASISTENCIA).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
