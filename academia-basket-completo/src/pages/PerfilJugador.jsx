import { useToast } from "../components/Toast.jsx";
import { useEffect, useState } from "react";
import {
  doc, getDoc, collection, getDocs,
  query, where, orderBy, addDoc, serverTimestamp,
  updateDoc, increment
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import TabDeportivo from "../components/TabDeportivo";
import { extraerVideo } from "../utils/helpers";

const DOCS_LISTA = [
  { key: "pasaporte",               label: "Pasaporte" },
  { key: "antecedentes",            label: "Antecedentes penales (FBI)" },
  { key: "seguro_medico",           label: "Seguro médico privado" },
  { key: "certificados_academicos", label: "Certificados académicos" },
  { key: "visado",                  label: "Visado" },
  { key: "nie",                     label: "NIE/TIE" },
  { key: "contrato_firmado",        label: "Contrato firmado" },
  { key: "foto_oficial",            label: "Foto oficial" },
];

const PROGRAMAS = {
  gap_year:  "Gap Year",
  academic:  "Academic + Athletic",
  semestral: "Semestral",
  summer:    "Summer",
};

export default function PerfilJugador() {
  const { perfil } = useAuth();
  const [jugador, setJugador] = useState(null);
  const [tab,     setTab]     = useState("ficha");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!perfil?.jugadorId) { setLoading(false); return; }
      const snap = await getDoc(doc(db, "jugadores", perfil.jugadorId));
      if (snap.exists()) setJugador({ id: snap.id, ...snap.data() });
      setLoading(false);
    };
    fetch();
  }, [perfil]);

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "center", height: "60vh"
    }}>
      <p style={{ color: "#4a7a60" }}>Cargando...</p>
    </div>
  );

  if (!jugador) return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "60vh", gap: "12px", textAlign: "center",
      padding: "20px"
    }}>
      <div style={{ fontSize: "48px" }}>🏀</div>
      <h2 style={{ color: "#fff" }}>Sin perfil asignado</h2>
      <p style={{ color: "#4a7a60", fontSize: "14px", maxWidth: "300px" }}>
        El administrador debe vincular tu cuenta a un jugador.
        Contacta con la academia.
      </p>
    </div>
  );

  const iniciales = (jugador.nombre?.[0] || "") + (jugador.apellidos?.[0] || "");
  const docsOk    = DOCS_LISTA.filter(d => jugador.docs?.[d.key]).length;

  const tabs = [
    { key: "ficha",         label: "👤 Mi perfil" },
    { key: "documentacion", label: `📄 Docs (${docsOk}/8)` },
    { key: "deportivo",     label: "🏀 Deportivo" },
    { key: "noticias",      label: "📰 Noticias" },
    { key: "foro",          label: "💬 Foro" },
  ];

  return (
    <div>
      {/* Stats rápidos */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: "12px", marginBottom: "20px"
      }}>
        {[
          { label: "Programa",  valor: PROGRAMAS[jugador.programa] || jugador.programa || "—", icon: "🎓" },
          { label: "Llegada",   valor: jugador.fecha_llegada || "—", icon: "✈️" },
          { label: "Docs",      valor: `${docsOk}/8`, icon: "📄",
            color: docsOk === 8 ? "#4ade80" : docsOk >= 5 ? "#fbbf24" : "#f87171" },
        ].map(s => (
          <div key={s.label} className="card"
            style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "22px", marginBottom: "4px" }}>
              {s.icon}
            </div>
            <div style={{
              fontSize: "15px", fontWeight: "700",
              color: s.color || "#fff"
            }}>
              {s.valor}
            </div>
            <div style={{
              fontSize: "12px", color: "#4a7a60", marginTop: "2px"
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Header jugador */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="ficha-header">
          {jugador.fotoUrl ? (
            <img src={jugador.fotoUrl} alt={jugador.nombre}
              style={{
                width: "56px", height: "56px",
                borderRadius: "50%", objectFit: "cover"
              }}
              onError={e => { e.target.style.display = "none"; }}
            />
          ) : (
            <div className="avatar">{iniciales.toUpperCase()}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              color: "#fff", fontSize: "20px", fontWeight: "700",
              overflow: "hidden", whiteSpace: "nowrap",
              textOverflow: "ellipsis"
            }}>
              {jugador.nombre} {jugador.apellidos}
            </h2>
            <p style={{ color: "#4a7a60", fontSize: "13px" }}>
              {jugador.posicion || "—"} · {jugador.pais || "—"}
            </p>
          </div>
          <span className={`badge badge-${jugador.estado || "pendiente"}`}>
            {jugador.estado || "pendiente"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <div key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Ficha */}
      {tab === "ficha" && (
        <div className="card">
          <div className="form-grid">
            {[
              ["Nombre completo", `${jugador.nombre} ${jugador.apellidos}`],
              ["País",            jugador.pais],
              ["Nacimiento",      jugador.fecha_nacimiento],
              ["Posición",        jugador.posicion],
              ["Altura",          jugador.altura ? `${jugador.altura} cm` : null],
              ["Peso",            jugador.peso   ? `${jugador.peso} kg`   : null],
              ["Email",           jugador.email_jugador],
              ["Teléfono",        jugador.telefono],
              ["Llegada",         jugador.fecha_llegada],
              ["Salida",          jugador.fecha_salida],
            ].map(([k, v]) => (
              <div key={k} className="form-group">
                <label>{k}</label>
                <div style={{
                  color: "#fff", fontSize: "14px", padding: "6px 0"
                }}>
                  {v || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentación — solo lectura */}
      {tab === "documentacion" && (
        <div className="card">
          <p style={{
            color: "#4a7a60", fontSize: "13px", marginBottom: "16px"
          }}>
            Contacta con la academia para actualizar tu documentación.
          </p>
          {DOCS_LISTA.map(d => (
            <div key={d.key} className="doc-item">
              <span className="doc-name">{d.label}</span>
              <span style={{
                color: jugador.docs?.[d.key] ? "#4ade80" : "#6b7280",
                fontSize: "13px", fontWeight: "600"
              }}>
                {jugador.docs?.[d.key] ? "✓ Recibido" : "Pendiente"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Deportivo */}
      {tab === "deportivo" && (
        <TabDeportivo
          jugadorId={jugador.id}
          jugadorNombre={`${jugador.nombre} ${jugador.apellidos}`}
          soloLectura={true}
        />
      )}

      {/* Noticias */}
      {tab === "noticias" && <NoticiasTab />}

      {/* Foro */}
      {tab === "foro" && <ForoTab jugadorId={jugador.id} />}
    </div>
  );
}

// ── Noticias tab ─────────────────────────────────────────
function NoticiasTab() {
  const [noticias, setNoticias] = useState([]);
  const [abierta,  setAbierta]  = useState(null);

  useEffect(() => {
    getDocs(query(
      collection(db, "noticias"),
      orderBy("createdAt", "desc")
    )).then(snap =>
      setNoticias(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  if (abierta) {
    const video = extraerVideo(abierta.videoUrl);
    return (
      <div>
        <button className="btn btn-secondary"
          style={{ marginBottom: "16px" }}
          onClick={() => setAbierta(null)}>
          ← Volver
        </button>
        <div className="card">
          {abierta.fotoUrl && (
            <img src={abierta.fotoUrl} alt={abierta.titulo}
              style={{
                width: "100%", borderRadius: "8px",
                marginBottom: "14px", maxHeight: "300px",
                objectFit: "cover"
              }}
              onError={e => { e.target.style.display = "none"; }}
            />
          )}
          {video?.tipo === "youtube" && (
            <div style={{
              position: "relative", paddingBottom: "56.25%",
              marginBottom: "14px"
            }}>
              <iframe
                src={`https://www.youtube.com/embed/${video.id}`}
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  borderRadius: "8px", border: "none"
                }}
                allowFullScreen
              />
            </div>
          )}
          <h2 style={{ color: "#fff", marginBottom: "8px" }}>
            {abierta.titulo}
          </h2>
          <p style={{
            color: "#888", fontSize: "12px", marginBottom: "12px"
          }}>
            {abierta.autorNombre} · {abierta.fecha}
          </p>
          <p style={{
            color: "#ccc", fontSize: "14px",
            lineHeight: "1.7", whiteSpace: "pre-wrap"
          }}>
            {abierta.contenido}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {noticias.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📰</div>
          <p style={{ color: "#666" }}>Sin noticias todavía.</p>
        </div>
      ) : noticias.map(n => (
        <div key={n.id} className="card"
          style={{ cursor: "pointer" }}
          onClick={() => setAbierta(n)}>
          {n.fotoUrl && (
            <img src={n.fotoUrl} alt={n.titulo}
              style={{
                width: "100%", maxHeight: "160px",
                objectFit: "cover", borderRadius: "8px",
                marginBottom: "10px"
              }}
              onError={e => { e.target.style.display = "none"; }}
            />
          )}
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginBottom: "4px"
          }}>
            <strong style={{ color: "#fff" }}>{n.titulo}</strong>
            <span style={{ color: "#4a7a60", fontSize: "12px" }}>
              {n.fecha}
            </span>
          </div>
          <p style={{
            color: "#888", fontSize: "13px",
            overflow: "hidden", whiteSpace: "nowrap",
            textOverflow: "ellipsis"
          }}>
            {n.contenido}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Foro tab ─────────────────────────────────────────────
function ForoTab() {
  const { user, perfil } = useAuth();
  const toast = useToast();
  const [hilos,     setHilos]     = useState([]);
  const [abierto,   setAbierto]   = useState(null);
  const [respuestas, setRespuestas] = useState([]);
  const [texto,     setTexto]     = useState("");
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    getDocs(query(
      collection(db, "foro_hilos"),
      orderBy("createdAt", "desc")
    )).then(snap =>
      setHilos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const abrirHilo = async (hilo) => {
    setAbierto(hilo);
    const snap = await getDocs(query(
      collection(db, "foro_respuestas"),
      where("hiloId", "==", hilo.id),
      orderBy("createdAt", "asc")
    ));
    setRespuestas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleResponder = async () => {
    if (saving || !texto.trim()) return;
    setSaving(true);
    try {
      const data = {
        hiloId:      abierto.id,
        contenido:   texto.trim(),
        autorId:     user.uid,
        autorNombre: `${perfil.nombre} ${perfil.apellidos}`,
        autorRol:    perfil.rol,
        fecha:       new Date().toISOString().split("T")[0],
        createdAt:   serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "foro_respuestas"), data);
      // Incrementar contador
      await updateDoc(doc(db, "foro_hilos", abierto.id), {
        numRespuestas: increment(1)
      });
      setRespuestas(r => [...r, { id: ref.id, ...data }]);
      setTexto("");
    } catch {
      toast.error("Error al enviar.");
    } finally {
      setSaving(false);
    }
  };

  if (abierto) return (
    <div>
      <button className="btn btn-secondary"
        style={{ marginBottom: "16px" }}
        onClick={() => setAbierto(null)}>
        ← Volver
      </button>
      <div className="card" style={{ marginBottom: "14px" }}>
        <h3 style={{ color: "#fff", marginBottom: "8px" }}>
          {abierto.titulo}
        </h3>
        <p style={{
          color: "#ccc", fontSize: "14px", lineHeight: "1.6"
        }}>
          {abierto.contenido}
        </p>
      </div>
      <div style={{
        display: "flex", flexDirection: "column",
        gap: "8px", marginBottom: "14px"
      }}>
        {respuestas.map(r => (
          <div key={r.id} style={{
            background: r.autorId === user?.uid
              ? "#1a3326" : "#132d1e",
            border: "1px solid #1e4030",
            borderRadius: "10px", padding: "12px"
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginBottom: "4px"
            }}>
              <span style={{
                color: "#fff", fontWeight: "600", fontSize: "13px"
              }}>
                {r.autorNombre}
              </span>
              <span style={{ color: "#4a7a60", fontSize: "12px" }}>
                {r.fecha}
              </span>
            </div>
            <p style={{ color: "#ccc", fontSize: "14px" }}>
              {r.contenido}
            </p>
          </div>
        ))}
      </div>
      <div className="card">
        <textarea value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Tu respuesta..."
          rows="3" maxLength={2000}
          style={{ marginBottom: "10px" }}
        />
        <button className="btn btn-primary"
          onClick={handleResponder}
          disabled={saving || !texto.trim()}>
          {saving ? "Enviando..." : "Responder"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {hilos.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>💬</div>
          <p style={{ color: "#4a7a60", fontSize: "14px" }}>
            Aún no hay hilos en el foro.
          </p>
          <p style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
            El staff publicará aquí novedades del equipo.
          </p>
        </div>
      ) : hilos.map(h => (
        <div key={h.id} className="card"
          style={{ cursor: "pointer" }}
          onClick={() => abrirHilo(h)}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginBottom: "4px"
          }}>
            <strong style={{ color: "#fff" }}>{h.titulo}</strong>
            <span style={{ color: "#4a7a60", fontSize: "12px" }}>
              {h.fecha}
            </span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between"
          }}>
            <span style={{ color: "#888", fontSize: "13px" }}>
              {h.autorNombre}
            </span>
            <span style={{ color: "#4a7a60", fontSize: "13px" }}>
              💬 {h.numRespuestas || 0}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
