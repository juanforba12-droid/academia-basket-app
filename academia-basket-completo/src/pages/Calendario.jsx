import { useToast } from "../components/Toast.jsx";
import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc,
  orderBy, query, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { hoyISO } from "../utils/helpers";

const TIPOS = {
  entrenamiento: { color: "#1a7a4a", label: "Entrenamiento" },
  partido:       { color: "#f97316", label: "Partido" },
  academico:     { color: "#3b82f6", label: "Académico" },
  cultural:      { color: "#8b5cf6", label: "Cultural" },
  medico:        { color: "#ef4444", label: "Médico" },
  otro:          { color: "#6b7280", label: "Otro" },
};

const MESES      = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEM   = ["L","M","X","J","V","S","D"];

export default function Calendario() {
  const { perfil } = useAuth();
  const toast = useToast();
  const [eventos,      setEventos]      = useState([]);
  const [hoy]                           = useState(new Date());
  const [mes,          setMes]          = useState(hoy.getMonth());
  const [anio,         setAnio]         = useState(hoy.getFullYear());
  const [diaSelec,     setDiaSelec]     = useState(null);
  const [nuevoEvento,  setNuevoEvento]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form, setForm] = useState({
    titulo: "", tipo: "entrenamiento",
    fecha: "", hora: "", notas: ""
  });

  const puedeEditar =
    perfil?.rol === "admin" || perfil?.rol === "entrenador";
  const hoyStr = hoyISO();

  useEffect(() => {
    getDocs(query(collection(db, "calendario"), orderBy("fecha")))
      .then(snap =>
        setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      );
  }, []);

  const handleGuardar = async () => {
    if (saving) return;
    if (!form.titulo.trim() || !form.fecha) {
      return toast.warning("Título y fecha son obligatorios");
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        titulo:    form.titulo.trim(),
        autorId:   perfil?.uid || "",
        autorNombre: `${perfil?.nombre} ${perfil?.apellidos}`,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "calendario"), data);
      setEventos(e =>
        [...e, { id: docRef.id, ...data }]
          .sort((a, b) => {
            if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
            if (a.hora && b.hora)    return a.hora.localeCompare(b.hora);
            if (a.hora) return -1;
            if (b.hora) return  1;
            return 0;
          })
      );
      setForm({ titulo: "", tipo: "entrenamiento", fecha: "", hora: "", notas: "" });
      setNuevoEvento(false);
    } catch {
      toast.error("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // Construir celdas del mes
  const primerDia = new Date(anio, mes, 1).getDay();
  const offset    = primerDia === 0 ? 6 : primerDia - 1;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas    = Array(offset).fill(null).concat(
    Array.from({ length: diasEnMes }, (_, i) => i + 1)
  );

  const eventosDia = (dia) => {
    if (!dia) return [];
    const f = `${anio}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
    return eventos.filter(e => e.fecha === f);
  };

  // Próximos eventos ordenados por fecha y hora
  const proximosEventos = eventos
    .filter(e => e.fecha >= hoyStr)
    .sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      if (a.hora && b.hora)    return a.hora.localeCompare(b.hora);
      if (a.hora) return -1;
      if (b.hora) return  1;
      return 0;
    })
    .slice(0, 6);

  const eventosSelec = diaSelec ? eventosDia(diaSelec) : [];

  const navMes = (dir) => {
    if (dir === -1 && mes === 0) { setMes(11); setAnio(a => a - 1); }
    else if (dir === 1 && mes === 11) { setMes(0); setAnio(a => a + 1); }
    else setMes(m => m + dir);
    setDiaSelec(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Calendario</div>
          <div className="page-subtitle">
            {MESES[mes]} {anio}
          </div>
        </div>
        {puedeEditar && (
          <button className="btn btn-primary"
            onClick={() => setNuevoEvento(v => !v)}>
            {nuevoEvento ? "Cancelar" : "+ Nuevo evento"}
          </button>
        )}
      </div>

      {/* Leyenda */}
      <div style={{
        display: "flex", gap: "10px", flexWrap: "wrap",
        marginBottom: "16px"
      }}>
        {Object.entries(TIPOS).map(([k, v]) => (
          <div key={k} style={{
            display: "flex", alignItems: "center", gap: "5px"
          }}>
            <div style={{
              width: "10px", height: "10px",
              borderRadius: "50%", background: v.color
            }} />
            <span style={{ color: "#4a7a60", fontSize: "12px" }}>
              {v.label}
            </span>
          </div>
        ))}
      </div>

      {/* Formulario */}
      {nuevoEvento && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 style={{
            color: "#fff", marginBottom: "16px", fontSize: "15px"
          }}>
            Nuevo evento
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Título *</label>
              <input value={form.titulo} maxLength={100}
                placeholder="Nombre del evento"
                onChange={e => setForm(f => ({
                  ...f, titulo: e.target.value
                }))} />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select value={form.tipo}
                onChange={e => setForm(f => ({
                  ...f, tipo: e.target.value
                }))}>
                {Object.entries(TIPOS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" value={form.fecha}
                onChange={e => setForm(f => ({
                  ...f, fecha: e.target.value
                }))} />
            </div>
            <div className="form-group">
              <label>Hora (opcional)</label>
              <input type="time" value={form.hora}
                onChange={e => setForm(f => ({
                  ...f, hora: e.target.value
                }))} />
            </div>
            <div className="form-group full">
              <label>Notas</label>
              <input value={form.notas}
                placeholder="Detalles adicionales..."
                onChange={e => setForm(f => ({
                  ...f, notas: e.target.value
                }))} />
            </div>
          </div>
          <button className="btn btn-primary"
            style={{ marginTop: "14px" }}
            onClick={handleGuardar} disabled={saving}>
            {saving ? "Guardando..." : "Guardar evento"}
          </button>
        </div>
      )}

      {/* Grid calendario + panel — responsive */}
      <div className="calendario-grid" style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: "20px"
      }}>
        {/* Calendario */}
        <div className="card">
          {/* Nav mes */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "16px"
          }}>
            <button className="btn btn-secondary"
              style={{ padding: "6px 12px" }}
              onClick={() => navMes(-1)}>←</button>
            <span style={{
              color: "#fff", fontWeight: "700", fontSize: "16px"
            }}>
              {MESES[mes]} {anio}
            </span>
            <button className="btn btn-secondary"
              style={{ padding: "6px 12px" }}
              onClick={() => navMes(1)}>→</button>
          </div>

          {/* Cabecera días */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            gap: "4px", marginBottom: "8px"
          }}>
            {DIAS_SEM.map(d => (
              <div key={d} style={{
                textAlign: "center", color: "#4a7a60",
                fontSize: "12px", fontWeight: "600", padding: "4px"
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Celdas */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            gap: "3px"
          }}>
            {celdas.map((dia, i) => {
              const evs  = dia ? eventosDia(dia) : [];
              const fStr = dia
                ? `${anio}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`
                : null;
              const esHoy = fStr === hoyStr;
              const selec = diaSelec === dia;
              return (
                <div key={i}
                  className="cal-celda"
                  onClick={() => dia && setDiaSelec(selec ? null : dia)}
                  style={{
                    minHeight: "48px", borderRadius: "6px",
                    padding: "5px",
                    background: selec ? "#1e4030" :
                                esHoy ? "#1a3326" : "transparent",
                    border: `1px solid ${
                      selec ? "#1a7a4a" :
                      esHoy ? "#2a5a40" : "transparent"
                    }`,
                    cursor: dia ? "pointer" : "default",
                    transition: "all 0.12s"
                  }}>
                  {dia && (
                    <>
                      <div style={{
                        color: esHoy ? "#f97316" :
                               selec ? "#fff" : "#ccc",
                        fontSize: "13px",
                        fontWeight: esHoy ? "700" : "400",
                        marginBottom: "3px"
                      }}>
                        {dia}
                      </div>
                      <div style={{
                        display: "flex", flexWrap: "wrap", gap: "2px"
                      }}>
                        {evs.slice(0, 3).map(ev => (
                          <div key={ev.id}
                            title={ev.titulo}
                            style={{
                              width: "6px", height: "6px",
                              borderRadius: "50%",
                              background: TIPOS[ev.tipo]?.color || "#666",
                              cursor: "pointer"
                            }} />
                        ))}
                        {evs.length > 3 && (
                          <span style={{
                            color:"#4a7a60", fontSize:"9px", lineHeight:"1"
                          }}>+{evs.length-3}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel derecho */}
        <div>
          {/* Día seleccionado */}
          {diaSelec ? (
            <div className="card" style={{ marginBottom: "14px" }}>
              <h3 style={{
                color: "#fff", fontSize: "15px", marginBottom: "12px"
              }}>
                {diaSelec} de {MESES[mes]}
              </h3>
              {eventosSelec.length === 0 ? (
                <p style={{ color: "#666", fontSize: "14px" }}>
                  Sin eventos.
                </p>
              ) : (
                eventosSelec.map(ev => (
                  <EventoItem key={ev.id} ev={ev} />
                ))
              )}
            </div>
          ) : (
            <div className="card" style={{
              textAlign: "center", padding: "28px",
              marginBottom: "14px"
            }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>
                📅
              </div>
              <p style={{ color: "#4a7a60", fontSize: "13px" }}>
                Selecciona un día
              </p>
            </div>
          )}

          {/* Próximos eventos */}
          <div className="card">
            <h3 style={{
              color: "#fff", fontSize: "14px", marginBottom: "12px"
            }}>
              Próximos eventos
            </h3>
            {proximosEventos.length === 0 ? (
              <p style={{ color: "#666", fontSize: "13px" }}>
                Sin eventos próximos.
              </p>
            ) : proximosEventos.map(ev => (
              <div key={ev.id} style={{
                display: "flex", gap: "8px", padding: "7px 0",
                borderBottom: "1px solid #1e4030",
                alignItems: "flex-start"
              }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: TIPOS[ev.tipo]?.color || "#666",
                  flexShrink: 0, marginTop: "5px"
                }} />
                <div>
                  <div style={{
                    color: "#ccc", fontSize: "13px", fontWeight: "600"
                  }}>
                    {ev.titulo}
                  </div>
                  <div style={{
                    color: "#4a7a60", fontSize: "11px", marginTop: "2px"
                  }}>
                    {ev.fecha}{ev.hora ? ` · ${ev.hora}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventoItem({ ev }) {
  return (
    <div style={{
      borderLeft: `3px solid ${TIPOS[ev.tipo]?.color || "#666"}`,
      paddingLeft: "10px", marginBottom: "12px"
    }}>
      <div style={{
        color: "#fff", fontWeight: "600", fontSize: "14px"
      }}>
        {ev.titulo}
      </div>
      {ev.hora && (
        <div style={{
          color: "#4a7a60", fontSize: "12px", marginTop: "2px"
        }}>
          🕐 {ev.hora}
        </div>
      )}
      {ev.notas && (
        <div style={{
          color: "#888", fontSize: "12px", marginTop: "4px"
        }}>
          {ev.notas}
        </div>
      )}
      <span style={{
        display: "inline-block", marginTop: "6px",
        background: "#0f1f17", borderRadius: "4px",
        padding: "1px 7px", fontSize: "11px",
        color: TIPOS[ev.tipo]?.color || "#666"
      }}>
        {TIPOS[ev.tipo]?.label}
      </span>
    </div>
  );
}
