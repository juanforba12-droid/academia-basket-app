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
import { hoyISO } from "../utils/helpers";
import { useTemporada } from "../hooks/useTemporada";
import { crearNotificacion } from "../utils/crearNotificacion";

export default function NuevoPartido() {
  const { user, perfil } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const temporada = useTemporada();
  const navigate = useNavigate();
  const [jugadores, setJugadores] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fecha:               hoyISO(),
    rival:               "",
    resultado_tipo:      "V",   // V / D / E
    resultado_local:     "",
    resultado_visitante: "",
    lugar:               "local",
    notas:               "",
  });
  const [stats, setStats] = useState({});

  useEffect(() => {
    const fetch = async () => {
      const snap = await (async () => {
          try {
            return await getDocs(query(collection(db, "jugadores"), orderBy("apellidos_sort")));
          } catch {
            return await getDocs(collection(db, "jugadores"));
          }
        })();
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(j => !j.estado || j.estado === "activo" || j.estado === "pendiente");
      setJugadores(lista);
      const init = {};
      lista.forEach(j => {
        init[j.id] = {
          convocado: false, puntos: 0,
          rebotes: 0, asistencias: 0, minutos: 0
        };
      });
      setStats(init);
    };
    fetch();
  }, []);

  const setStat = (jugadorId, campo, valor) =>
    setStats(s => ({
      ...s,
      [jugadorId]: { ...s[jugadorId], [campo]: valor }
    }));

  const convocados = jugadores.filter(j => stats[j.id]?.convocado);

  const handleGuardar = async () => {
    if (saving) return;
    if (!form.rival.trim()) return toast.warning("El nombre del rival es obligatorio");
    if (!form.fecha)        return toast.warning("La fecha es obligatoria");

    if (convocados.length === 0) {
      const ok = confirm(
        "No hay jugadores convocados. ¿Guardar el partido igualmente?"
      );
      if (!ok) return;
    }

    if (form.fecha > hoyISO()) {
      const ok = confirm("La fecha es futura. ¿Confirmas?");
      if (!ok) return;
    }

    setSaving(true);
    try {
      // Construir string de resultado
      const resultado =
        form.resultado_local && form.resultado_visitante
          ? `${form.resultado_tipo} ${form.resultado_local}-${form.resultado_visitante}`
          : form.resultado_tipo;

      const jugadoresConvocados = convocados.map(j => ({
        jugadorId:    j.id,
        nombre:       `${j.nombre} ${j.apellidos}`,
        ...stats[j.id]
      }));

      await addDoc(collection(db, "partidos"), {
        fecha:      form.fecha,
        rival:      form.rival.trim(),
        resultado,
        resultado_tipo:      form.resultado_tipo,
        resultado_local:     form.resultado_local,
        resultado_visitante: form.resultado_visitante,
        lugar:      form.lugar,
        notas:      form.notas,
        jugadores:  jugadoresConvocados,
        entrenadorId:     user.uid,
        entrenadorNombre: `${perfil.nombre} ${perfil.apellidos}`,
        temporada,
        createdAt:  serverTimestamp(),
      });

      await crearNotificacion({
        tipo:    "partido",
        titulo:  "Partido registrado",
        mensaje: `vs ${form.rival} — ${resultado}`,
        link:    "/seguimiento-deportivo",
        roles:   ["admin"],
      });

      navigate("/seguimiento-deportivo");
    } catch {
      toast.error("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Nuevo partido</div>
          <div className="page-subtitle">
            {convocados.length} jugadores convocados
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary"
            onClick={() => navigate("/seguimiento-deportivo")}>
            Cancelar
          </button>
          <button className="btn btn-primary"
            onClick={handleGuardar} disabled={saving}>
            {saving ? "Guardando..." : "Guardar partido"}
          </button>
        </div>
      </div>

      {/* Datos del partido */}
      <div className="card">
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "15px" }}>
          Datos del partido
        </h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Rival</label>
            <input value={form.rival} placeholder="Nombre del equipo rival"
              onChange={e => setForm(f => ({ ...f, rival: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Lugar</label>
            <select value={form.lugar}
              onChange={e => setForm(f => ({ ...f, lugar: e.target.value }))}>
              <option value="local">Local</option>
              <option value="visitante">Visitante</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>

          {/* Resultado estructurado */}
          <div className="form-group">
            <label>Resultado</label>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <select
                value={form.resultado_tipo}
                onChange={e => setForm(f => ({
                  ...f, resultado_tipo: e.target.value
                }))}
                style={{ width: "110px" }}>
                <option value="V">Victoria</option>
                <option value="D">Derrota</option>
                <option value="E">Empate</option>
              </select>
              <input
                type="number" min="0" placeholder="85"
                value={form.resultado_local}
                onChange={e => setForm(f => ({
                  ...f, resultado_local: e.target.value
                }))}
                style={{ width: "64px" }}
              />
              <span style={{ color: "#4a7a60", fontWeight: "700" }}>—</span>
              <input
                type="number" min="0" placeholder="72"
                value={form.resultado_visitante}
                onChange={e => setForm(f => ({
                  ...f, resultado_visitante: e.target.value
                }))}
                style={{ width: "64px" }}
              />
            </div>
          </div>

          <div className="form-group full">
            <label>Notas</label>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones del partido..."
              maxLength={500}
            />
          </div>
        </div>
      </div>

      {/* Convocatoria y estadísticas */}
      <div className="card">
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "15px" }}>
          Convocatoria y estadísticas
        </h3>

        {jugadores.length === 0 ? (
          <p style={{ color: "#666" }}>
            No hay jugadores activos registrados.
          </p>
        ) : (
          jugadores.map(j => (
            <div key={j.id} style={{
              borderBottom: "1px solid #1e4030",
              paddingBottom: "12px", marginBottom: "12px"
            }}>
              {/* Checkbox convocado */}
              <label style={{
                display: "flex", alignItems: "center",
                gap: "10px", cursor: "pointer", marginBottom: "8px"
              }}>
                <input
                  type="checkbox"
                  checked={!!stats[j.id]?.convocado}
                  onChange={e => setStat(j.id, "convocado", e.target.checked)}
                  style={{
                    width: "16px", height: "16px",
                    accentColor: "#1a7a4a"
                  }}
                />
                <span style={{ color: "#fff", fontWeight: "600" }}>
                  {j.nombre} {j.apellidos}
                </span>
                {j.posicion && (
                  <span style={{ color: "#4a7a60", fontSize: "12px" }}>
                    {j.posicion}
                  </span>
                )}
              </label>

              {/* Stats solo si convocado */}
              {stats[j.id]?.convocado && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "8px", paddingLeft: "26px"
                }}>
                  {[
                    { campo: "puntos",      label: "Pts" },
                    { campo: "rebotes",     label: "Reb" },
                    { campo: "asistencias", label: "Ast" },
                    { campo: "minutos",     label: "Min" },
                  ].map(({ campo, label }) => (
                    <div key={campo}>
                      <label style={{
                        color: "#4a7a60", fontSize: "11px",
                        display: "block", marginBottom: "4px"
                      }}>
                        {label}
                      </label>
                      <input
                        type="number" min="0"
                        value={stats[j.id]?.[campo] || 0}
                        onChange={e => setStat(
                          j.id, campo,
                          parseInt(e.target.value) || 0
                        )}
                        style={{ textAlign: "center" }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {convocados.length > 0 && (
          <p style={{ color: "#4a7a60", fontSize: "13px" }}>
            {convocados.length} jugadores convocados
          </p>
        )}
      </div>
    </div>
  );
}
