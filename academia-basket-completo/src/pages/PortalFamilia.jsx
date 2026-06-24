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
import Notificaciones from "../components/Notificaciones";
import { useConexion } from "../hooks/useConexion";

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

export default function PortalFamilia() {
  const { perfil, logout } = useAuth();
  const online = useConexion();

  const [jugadores,     setJugadores]     = useState([]);
  const [jugadorActivo, setJugadorActivo] = useState(null);
  const [tab,           setTab]           = useState("ficha");
  const [loading,       setLoading]       = useState(true);
  const [errorMsg,      setErrorMsg]      = useState("");

  useEffect(() => {
    const fetch = async () => {
      if (!perfil?.jugadoresIds?.length) {
        setLoading(false);
        return;
      }
      const lista = await Promise.all(
        perfil.jugadoresIds.map(async id => {
          try {
            const snap = await getDoc(doc(db, "jugadores", id));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
          } catch {
            return null;
          }
        })
      );
      const validos = lista.filter(Boolean);
      const eliminados = lista.length - validos.length;

      if (eliminados > 0) {
        setErrorMsg(
          `${eliminados} jugador${eliminados > 1 ? "es" : ""} vinculado${eliminados > 1 ? "s" : ""} ya no exist${eliminados > 1 ? "en" : "e"}. Contacta con la academia.`
        );
      }
      setJugadores(validos);
      if (validos.length > 0) setJugadorActivo(validos[0]);
      setLoading(false);
    };
    fetch();
  }, [perfil]);

  if (loading) return (
    <div style={{
      minHeight: "100svh", background: "#0f1f17",
      display: "flex", alignItems: "center",
      justifyContent: "center"
    }}>
      <p style={{ color: "#4a7a60" }}>Cargando...</p>
    </div>
  );

  if (!jugadores.length) return (
    <div style={{
      minHeight: "100svh", background: "#0f1f17",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "12px", padding: "20px", textAlign: "center"
    }}>
      <div style={{ fontSize: "48px" }}>🏀</div>
      <h2 style={{ color: "#fff" }}>Sin jugadores asignados</h2>
      {errorMsg ? (
        <p style={{
          color: "#f87171", fontSize: "14px", maxWidth: "320px"
        }}>
          {errorMsg}
        </p>
      ) : (
        <p style={{ color: "#4a7a60", fontSize: "14px" }}>
          Contacta con la academia para vincular tu cuenta.
        </p>
      )}
      <button className="btn btn-secondary" onClick={logout}>
        Cerrar sesión
      </button>
    </div>
  );

  const docsOk = DOCS_LISTA.filter(
    d => jugadorActivo?.docs?.[d.key]
  ).length;
  const iniciales =
    (jugadorActivo?.nombre?.[0] || "") +
    (jugadorActivo?.apellidos?.[0] || "");

  const tabs = [
    { key: "ficha",         label: "📋 Ficha" },
    { key: "documentacion", label: `📄 Docs (${docsOk}/8)` },
    { key: "deportivo",     label: "🏀 Deportivo" },
    { key: "noticias",      label: "📰 Noticias" },
    { key: "foro",          label: "💬 Foro" },
  ];

  return (
    <div style={{
      background: "#0f1f17", minHeight: "100svh",
      fontFamily: "Inter, system-ui, sans-serif",
      color: "#e8e8e8"
    }}>
      {/* Banner offline */}
      {!online && (
        <div className="banner-offline">
          ⚠️ Sin conexión
        </div>
      )}

      {/* Nav */}
      <nav style={{
        background: "#132d1e", borderBottom: "1px solid #1e4030",
        padding: "0 20px",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", height: "56px",
        position: "sticky", top: online ? 0 : "36px", zIndex: 100
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px"
        }}>
          <span style={{ fontSize: "22px" }}>🏀</span>
          <span style={{
            color: "#fff", fontWeight: "700", fontSize: "14px"
          }}>
            Academia Basket
          </span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px"
        }}>
          <Notificaciones />
          <button
            onClick={logout}
            style={{
              background: "#1e4030", color: "#6ab88a",
              border: "none", borderRadius: "6px",
              padding: "6px 12px", fontSize: "13px",
              cursor: "pointer", minHeight: "36px"
            }}>
            Salir
          </button>
        </div>
      </nav>

      <div style={{
        maxWidth: "800px", margin: "0 auto", padding: "24px 16px"
      }}>

        {/* Aviso jugadores eliminados */}
        {errorMsg && (
          <div style={{
            background: "#1a0505", border: "1px solid #dc2626",
            borderRadius: "8px", padding: "10px 14px",
            marginBottom: "16px", fontSize: "13px", color: "#f87171"
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Selector si hay varios jugadores */}
        {jugadores.length > 1 && (
          <div style={{
            display: "flex", gap: "8px",
            marginBottom: "20px", flexWrap: "wrap"
          }}>
            {jugadores.map(j => (
              <button key={j.id}
                onClick={() => {
                  setJugadorActivo(j);
                  setTab("ficha");
                }}
                style={{
                  background: jugadorActivo?.id === j.id
                    ? "#1a7a4a" : "#132d1e",
                  border: `1px solid ${jugadorActivo?.id === j.id
                    ? "#1a7a4a" : "#1e4030"}`,
                  borderRadius: "8px", padding: "8px 16px",
                  color: "#fff", fontSize: "14px",
                  fontWeight: "600", cursor: "pointer",
                  minHeight: "44px"
                }}>
                {j.nombre} {j.apellidos}
              </button>
            ))}
          </div>
        )}

        {/* Header jugador */}
        <div style={{
          background: "#132d1e", border: "1px solid #1e4030",
          borderRadius: "12px", padding: "18px",
          marginBottom: "20px",
          display: "flex", alignItems: "center",
          gap: "14px", flexWrap: "wrap"
        }}>
          {jugadorActivo?.fotoUrl ? (
            <img src={jugadorActivo.fotoUrl} alt="foto"
              style={{
                width: "52px", height: "52px",
                borderRadius: "50%", objectFit: "cover",
                flexShrink: 0
              }}
              onError={e => { e.target.style.display = "none"; }}
            />
          ) : (
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "linear-gradient(135deg, #1a7a4a, #2da866)",
              display: "flex", alignItems: "center",
              justifyContent: "center",
              fontSize: "20px", fontWeight: "700",
              color: "#fff", flexShrink: 0
            }}>
              {iniciales.toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              color: "#fff", fontSize: "18px", fontWeight: "700",
              overflow: "hidden", whiteSpace: "nowrap",
              textOverflow: "ellipsis"
            }}>
              {jugadorActivo?.nombre} {jugadorActivo?.apellidos}
            </h2>
            <p style={{ color: "#4a7a60", fontSize: "13px" }}>
              {jugadorActivo?.posicion || "—"} ·{" "}
              {jugadorActivo?.pais || "—"} ·{" "}
              {PROGRAMAS[jugadorActivo?.programa] || jugadorActivo?.programa || "—"}
            </p>
          </div>
          <span className={`badge badge-${jugadorActivo?.estado || "pendiente"}`}>
            {jugadorActivo?.estado || "pendiente"}
          </span>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: "20px" }}>
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
                ["Programa",  PROGRAMAS[jugadorActivo?.programa] || jugadorActivo?.programa],
                ["País",      jugadorActivo?.pais],
                ["Posición",  jugadorActivo?.posicion],
                ["Altura",    jugadorActivo?.altura ? jugadorActivo.altura + " cm" : null],
                ["Peso",      jugadorActivo?.peso   ? jugadorActivo.peso   + " kg" : null],
                ["Llegada",   jugadorActivo?.fecha_llegada],
                ["Salida",    jugadorActivo?.fecha_salida],
              ].map(([k, v]) => (
                <div key={k} className="form-group">
                  <label>{k}</label>
                  <div style={{ color: "#ccc", fontSize: "14px", padding: "6px 0" }}>
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
              Estado de la documentación.
              Contacta con la academia para actualizar.
            </p>
            {DOCS_LISTA.map(d => (
              <div key={d.key} className="doc-item">
                <span className="doc-name">{d.label}</span>
                <span style={{
                  color: jugadorActivo?.docs?.[d.key] ? "#4ade80" : "#6b7280",
                  fontSize: "13px", fontWeight: "600"
                }}>
                  {jugadorActivo?.docs?.[d.key] ? "✓ Recibido" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Deportivo */}
        {tab === "deportivo" && jugadorActivo && (
          <TabDeportivo
            jugadorId={jugadorActivo.id}
            jugadorNombre={`${jugadorActivo.nombre} ${jugadorActivo.apellidos}`}
            soloLectura={true}
          />
        )}

        {/* Noticias */}
        {tab === "noticias" && <NoticiasLectura />}

        {/* Foro */}
        {tab === "foro" && <ForoLectura />}
      </div>
    </div>
  );
}

// ── Noticias lectura ─────────────────────────────────────
function NoticiasLectura() {
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
            <img loading="lazy" src={abierta.fotoUrl} alt={abierta.titulo}
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
          <p style={{ color: "#888", fontSize: "12px", marginBottom: "12px" }}>
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
          <p style={{ color: "#666" }}>No hay noticias todavía.</p>
        </div>
      ) : noticias.map(n => (
        <div key={n.id} className="card"
          style={{ cursor: "pointer" }}
          onClick={() => setAbierta(n)}>
          {n.fotoUrl && (
            <img loading="lazy" src={n.fotoUrl} alt={n.titulo}
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

// ── Foro lectura con respuestas ──────────────────────────
function ForoLectura() {
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
      // Incrementar contador en el hilo
      await updateDoc(doc(db, "foro_hilos", abierto.id), {
        numRespuestas: increment(1)
      });
      setRespuestas(r => [...r, { id: ref.id, ...data }]);
      setTexto("");
    } catch {
      toast.error("Error al enviar la respuesta.");
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
        <p style={{ color: "#888", fontSize: "12px", marginBottom: "10px" }}>
          {abierto.autorNombre} · {abierto.fecha}
        </p>
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
          placeholder="Tu respuesta..." rows="3"
          maxLength={2000}
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
