import { useToast } from "../components/Toast.jsx";
import { useEffect, useState, useRef } from "react";
import {
  doc, getDoc, updateDoc, addDoc,
  collection, getDocs, query, where,
  orderBy, limit, serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TabDeportivo from "../components/TabDeportivo";
import TabFamilia from "../components/TabFamilia";
import { camposSort, formatearFecha } from "../utils/helpers";
import { crearNotificacion } from "../utils/crearNotificacion";

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

export default function FichaJugador() {
  const { id }   = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { user, perfil } = useAuth();

  const [jugador,      setJugador]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [tab,          setTab]          = useState("datos");

  // Edición
  const [editando,  setEditando]  = useState(false);
  const [formEdit,  setFormEdit]  = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Historial docs
  const [historialDocs, setHistorialDocs] = useState([]);
  const [savingDoc,     setSavingDoc]     = useState(null);

  // Foto perfil
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fotoInputRef = useRef();

  const esAdmin      = perfil?.rol === "admin";
  const esStaff      = perfil?.rol === "admin" || perfil?.rol === "entrenador";

  // ── Carga inicial ──────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "jugadores", id));
      if (!snap.exists()) {
        setNoEncontrado(true);
        setLoading(false);
        return;
      }
      setJugador({ id: snap.id, ...snap.data() });
      setLoading(false);
    };
    fetch();
  }, [id]);

  // Cargar historial cuando abre tab documentación
  useEffect(() => {
    if (tab !== "documentacion" || !jugador) return;
    getDocs(query(
      collection(db, "doc_historial"),
      where("jugadorId", "==", id),
      orderBy("timestamp", "desc"),
      limit(20)
    )).then(snap =>
      setHistorialDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [tab, id, jugador]);

  // ── Edición de datos ──────────────────────────────────
  const iniciarEdicion = () => {
    setFormEdit({
      nombre:           jugador.nombre,
      apellidos:        jugador.apellidos,
      codigo:           jugador.codigo || "",
      pais:             jugador.pais || "",
      fecha_nacimiento: jugador.fecha_nacimiento || "",
      posicion:         jugador.posicion || "",
      programa:         jugador.programa || "gap_year",
      estado:           jugador.estado || "pendiente",
      altura:           jugador.altura || "",
      peso:             jugador.peso || "",
      email_jugador:    jugador.email_jugador || "",
      email_familia:    jugador.email_familia || "",
      telefono:         jugador.telefono || "",
      fecha_llegada:    jugador.fecha_llegada || "",
      fecha_salida:     jugador.fecha_salida || "",
      notas:            jugador.notas || "",
    });
    setEditando(true);
  };

  const cancelarEdicion = () => setEditando(false);

  const guardarEdicion = async () => {
    if (!formEdit.nombre?.trim() || !formEdit.apellidos?.trim()) {
      return toast.warning("Nombre y apellidos son obligatorios");
    }
    setSavingEdit(true);
    try {
      const updates = {
        ...formEdit,
        ...camposSort(formEdit.nombre, formEdit.apellidos),
      };
      await updateDoc(doc(db, "jugadores", id), updates);
      setJugador(j => ({ ...j, ...updates }));
      setEditando(false);
    } catch {
      toast.error("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Documentación ─────────────────────────────────────
  const toggleDoc = async (key, val) => {
    if (savingDoc) return;
    setSavingDoc(key);
    try {
      // Dot notation para evitar sobrescribir otros campos
      await updateDoc(doc(db, "jugadores", id), {
        [`docs.${key}`]: val
      });

      // Guardar historial
      const entrada = {
        jugadorId:      id,
        jugadorNombre:  `${jugador.nombre} ${jugador.apellidos}`,
        campo:          key,
        valor_nuevo:    val,
        accion:         val ? "recibido" : "pendiente",
        fecha:          new Date().toISOString().split("T")[0],
        autorId:        user.uid,
        autorNombre:    `${perfil.nombre} ${perfil.apellidos}`,
        timestamp:      serverTimestamp(),
      };
      await addDoc(collection(db, "doc_historial"), entrada);
      setHistorialDocs(h => [{ id: Date.now().toString(), ...entrada }, ...h]);

      // Actualizar estado local
      setJugador(j => ({ ...j, docs: { ...(j.docs || {}), [key]: val } }));

      // Notificar a familias vinculadas
      const familiasIds = jugador.familiasIds || [];
      if (familiasIds.length > 0) {
        const docLabel = DOCS_LISTA.find(d => d.key === key)?.label || key;
        await crearNotificacion({
          tipo:       "documento",
          titulo:     "Documentación actualizada",
          mensaje:    `${val ? "✓ Recibido" : "Pendiente"}: ${docLabel}`,
          link:       "/familia",
          usuarioIds: familiasIds,
        });
      }
    } catch {
      toast.error("Error al actualizar.");
    } finally {
      setSavingDoc(null);
    }
  };

  // ── Foto de perfil ────────────────────────────────────
  const subirFotoPerfil = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      return toast.warning("La foto no puede superar 5MB");
    }
    if (!file.type.startsWith("image/")) {
      return toast.warning("Solo se aceptan imágenes");
    }
    setSubiendoFoto(true);
    try {
      const storageRef = ref(storage, `jugadores/${id}/foto_perfil`);
      await uploadBytes(storageRef, file);
      const fotoUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "jugadores", id), { fotoUrl });
      setJugador(j => ({ ...j, fotoUrl }));
    } catch {
      toast.error("Error al subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  };

  // ── Estados de carga ──────────────────────────────────
  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "center", height: "60vh"
    }}>
      <p style={{ color: "#4a7a60" }}>Cargando...</p>
    </div>
  );

  if (noEncontrado) return (
    <div style={{
      textAlign: "center", padding: "60px"
    }}>
      <div style={{ fontSize: "48px", marginBottom: "12px" }}>🏀</div>
      <h2 style={{ color: "#fff", marginBottom: "8px" }}>
        Jugador no encontrado
      </h2>
      <p style={{ color: "#4a7a60", marginBottom: "20px" }}>
        Este jugador ya no existe en el sistema.
      </p>
      <button className="btn btn-primary"
        onClick={() => navigate("/jugadores")}>
        Ver todos los jugadores
      </button>
    </div>
  );

  const docsOk = DOCS_LISTA.filter(d => jugador.docs?.[d.key]).length;
  const iniciales = (jugador.nombre?.[0] || "") + (jugador.apellidos?.[0] || "");

  // ── Tabs visibles según rol ───────────────────────────
  const tabs = [
    { key: "datos",         label: "📋 Datos" },
    ...(esAdmin ? [{ key: "documentacion", label: `📄 Docs (${docsOk}/8)` }] : []),
    { key: "deportivo",     label: "🏀 Deportivo" },
    ...(esAdmin ? [{ key: "familia", label: "👨‍👩‍👧 Familia" }] : []),
  ];

  return (
    <div>
      {/* Botón volver */}
      <button className="btn btn-secondary"
        style={{ marginBottom: "20px" }}
        onClick={() => navigate("/jugadores")}>
        ← Volver
      </button>

      {/* Header jugador */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="ficha-header">
          {/* Avatar / foto */}
          <div style={{ position: "relative" }}>
            {jugador.fotoUrl ? (
              <img src={jugador.fotoUrl} alt={jugador.nombre}
                style={{
                  width: "64px", height: "64px",
                  borderRadius: "50%", objectFit: "cover"
                }}
                onError={e => { e.target.style.display = "none"; }}
              />
            ) : (
              <div className="avatar">{iniciales.toUpperCase()}</div>
            )}
            {esAdmin && (
              <>
                <button
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={subiendoFoto}
                  title="Cambiar foto"
                  style={{
                    position: "absolute", bottom: "-2px", right: "-2px",
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: "#1a7a4a", border: "2px solid #0f1f17",
                    cursor: "pointer", fontSize: "11px",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#fff"
                  }}>
                  {subiendoFoto ? "⏳" : "📷"}
                </button>
                <input
                  ref={fotoInputRef}
                  type="file" accept="image/*"
                  onChange={subirFotoPerfil}
                  style={{ display: "none" }}
                />
              </>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              color: "#fff", fontSize: "20px",
              fontWeight: "700", marginBottom: "4px",
              overflow: "hidden", whiteSpace: "nowrap",
              textOverflow: "ellipsis"
            }}>
              {jugador.nombre} {jugador.apellidos}
              {jugador.codigo && (
                <span style={{
                  color: "#f97316", fontSize: "13px",
                  marginLeft: "8px", fontWeight: "400"
                }}>
                  {jugador.codigo}
                </span>
              )}
            </h2>
            <p style={{ color: "#4a7a60", fontSize: "13px" }}>
              {jugador.posicion || "—"} · {jugador.pais || "—"} ·{" "}
              {PROGRAMAS[jugador.programa] || jugador.programa || "—"}
            </p>
          </div>

          {/* Badge estado */}
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

      {/* ── TAB DATOS ── */}
      {tab === "datos" && (
        <div className="card">
          {/* Botones edición */}
          {esAdmin && !editando && (
            <button className="btn btn-secondary"
              style={{ marginBottom: "16px" }}
              onClick={iniciarEdicion}>
              ✏️ Editar datos
            </button>
          )}
          {editando && (
            <div style={{
              display: "flex", gap: "8px", marginBottom: "16px"
            }}>
              <button className="btn btn-primary"
                onClick={guardarEdicion} disabled={savingEdit}>
                {savingEdit ? "Guardando..." : "✓ Guardar cambios"}
              </button>
              <button className="btn btn-secondary"
                onClick={cancelarEdicion}>
                Cancelar
              </button>
            </div>
          )}

          {editando ? (
            /* Formulario de edición */
            <div className="form-grid">
              {[
                { k: "nombre",           label: "Nombre *" },
                { k: "apellidos",        label: "Apellidos *" },
                { k: "codigo",           label: "Código interno" },
                { k: "pais",             label: "País" },
                { k: "fecha_nacimiento", label: "Fecha nacimiento", type: "date" },
                { k: "altura",           label: "Altura (cm)", type: "number" },
                { k: "peso",             label: "Peso (kg)",   type: "number" },
                { k: "email_jugador",    label: "Email jugador", type: "email" },
                { k: "email_familia",    label: "Email familia", type: "email" },
                { k: "telefono",         label: "Teléfono" },
                { k: "fecha_llegada",    label: "Fecha llegada", type: "date" },
                { k: "fecha_salida",     label: "Fecha salida",  type: "date" },
              ].map(({ k, label, type = "text" }) => (
                <div key={k} className="form-group">
                  <label>{label}</label>
                  <input
                    type={type}
                    value={formEdit[k] || ""}
                    onChange={e => setFormEdit(f => ({
                      ...f, [k]: e.target.value
                    }))}
                  />
                </div>
              ))}
              {/* Selects */}
              <div className="form-group">
                <label>Posición</label>
                <select value={formEdit.posicion || ""}
                  onChange={e => setFormEdit(f => ({
                    ...f, posicion: e.target.value
                  }))}>
                  <option value="">— Seleccionar —</option>
                  {["Base","Escolta","Alero","Ala-Pívot","Pívot"].map(p => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Programa</label>
                <select value={formEdit.programa || "gap_year"}
                  onChange={e => setFormEdit(f => ({
                    ...f, programa: e.target.value
                  }))}>
                  {Object.entries(PROGRAMAS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={formEdit.estado || "pendiente"}
                  onChange={e => setFormEdit(f => ({
                    ...f, estado: e.target.value
                  }))}>
                  <option value="pendiente">Pendiente</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div className="form-group full">
                <label>Notas</label>
                <textarea
                  value={formEdit.notas || ""}
                  onChange={e => setFormEdit(f => ({
                    ...f, notas: e.target.value
                  }))}
                  maxLength={1000}
                />
              </div>
            </div>
          ) : (
            /* Vista de solo lectura — campos según rol */
            <div className="form-grid">
              {(esAdmin ? [
                ["Programa",         PROGRAMAS[jugador.programa] || jugador.programa],
                ["País",             jugador.pais],
                ["Nacimiento",       formatearFecha(jugador.fecha_nacimiento)],
                ["Posición",         jugador.posicion],
                ["Altura",           jugador.altura ? jugador.altura + " cm" : null],
                ["Peso",             jugador.peso   ? jugador.peso   + " kg" : null],
                ["Email jugador",    jugador.email_jugador],
                ["Email familia",    jugador.email_familia],
                ["Teléfono",         jugador.telefono],
                ["Llegada",          formatearFecha(jugador.fecha_llegada)],
                ["Salida",           formatearFecha(jugador.fecha_salida)],
              ] : [
                // Entrenador: sin datos sensibles
                ["Programa",  PROGRAMAS[jugador.programa] || jugador.programa],
                ["País",      jugador.pais],
                ["Posición",  jugador.posicion],
                ["Altura",    jugador.altura ? jugador.altura + " cm" : null],
                ["Peso",      jugador.peso   ? jugador.peso   + " kg" : null],
                ["Llegada",   formatearFecha(jugador.fecha_llegada)],
                ["Salida",    formatearFecha(jugador.fecha_salida)],
              ]).map(([k, v]) => (
                <div key={k} className="form-group">
                  <label>{k}</label>
                  <div style={{
                    color: "#ccc", fontSize: "14px", padding: "6px 0"
                  }}>
                    {v || "—"}
                  </div>
                </div>
              ))}
              {esAdmin && jugador.notas && (
                <div className="form-group full">
                  <label>Notas</label>
                  <div style={{ color: "#ccc", fontSize: "14px" }}>
                    {jugador.notas}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB DOCUMENTACIÓN ── */}
      {tab === "documentacion" && esAdmin && (
        <div>
          <div className="card">
            {DOCS_LISTA.map(d => (
              <div key={d.key} className="doc-item">
                <span className="doc-name">{d.label}</span>
                <label style={{
                  display: "flex", alignItems: "center",
                  gap: "8px", cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={!!jugador.docs?.[d.key]}
                    disabled={savingDoc === d.key}
                    onChange={e => toggleDoc(d.key, e.target.checked)}
                    style={{
                      width: "16px", height: "16px",
                      accentColor: "#1a7a4a"
                    }}
                  />
                  <span className={
                    jugador.docs?.[d.key] ? "doc-ok" : "doc-missing"
                  }>
                    {savingDoc === d.key
                      ? "Guardando..."
                      : jugador.docs?.[d.key] ? "✓ Recibido" : "Pendiente"}
                  </span>
                </label>
              </div>
            ))}
          </div>

          {/* Historial cambios */}
          {historialDocs.length > 0 && (
            <div className="card">
              <h4 style={{
                color: "#4a7a60", fontSize: "13px",
                marginBottom: "12px", fontWeight: "600"
              }}>
                Historial de cambios
              </h4>
              {historialDocs.map(h => (
                <div key={h.id} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: "1px solid #0f1f17",
                  fontSize: "12px", gap: "8px"
                }}>
                  <span style={{ color: "#888" }}>
                    {DOCS_LISTA.find(d => d.key === h.campo)?.label || h.campo}
                    <span style={{
                      color: h.valor_nuevo ? "#4ade80" : "#f87171",
                      marginLeft: "8px", fontWeight: "600"
                    }}>
                      → {h.valor_nuevo ? "Recibido" : "Pendiente"}
                    </span>
                  </span>
                  <span style={{ color: "#4a7a60", whiteSpace: "nowrap" }}>
                    {h.autorNombre} · {h.fecha}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB DEPORTIVO ── */}
      {tab === "deportivo" && (
        <TabDeportivo
          jugadorId={jugador.id}
          jugadorNombre={`${jugador.nombre} ${jugador.apellidos}`}
          soloLectura={!esStaff}
        />
      )}

      {/* ── TAB FAMILIA ── */}
      {tab === "familia" && esAdmin && (
        <TabFamilia jugador={jugador} />
      )}
    </div>
  );
}
