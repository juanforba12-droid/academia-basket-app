import { useToast } from "../components/Toast.jsx";
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { camposSort } from "../utils/helpers";

const DOCS_LISTA = [
  { key: "pasaporte",             label: "Pasaporte" },
  { key: "antecedentes",          label: "Antecedentes penales (FBI)" },
  { key: "seguro_medico",         label: "Seguro médico privado" },
  { key: "certificados_academicos", label: "Certificados académicos" },
  { key: "visado",                label: "Visado" },
  { key: "nie",                   label: "NIE/TIE" },
  { key: "contrato_firmado",      label: "Contrato firmado" },
  { key: "foto_oficial",          label: "Foto oficial" },
];

const ESTADO_INICIAL = {
  nombre: "", apellidos: "", codigo: "",
  pais: "", fecha_nacimiento: "",
  posicion: "", altura: "", peso: "",
  programa: "gap_year", estado: "pendiente",
  email_jugador: "", email_familia: "",
  telefono: "", prefijo_tel: "+1",
  fecha_llegada: "", fecha_salida: "",
  notas: "",
  docs: {},
  visado: {
    tipo: "", estado: "pendiente",
    numero: "", fecha_expiracion: "",
    fecha_solicitud: "", pais_emision: "", notas: ""
  }
};

export default function NuevoJugador() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const [saving, setSaving] = useState(false);
  // toast
  const [form, setForm]     = useState(ESTADO_INICIAL);
  const [errores, setErrores] = useState({});
  // toast

  const set    = (k, v)    => setForm(f => ({ ...f, [k]: v }));
  const setDoc = (k, v)    => setForm(f => ({ ...f, docs: { ...f.docs, [k]: v } }));
  const setVis = (k, v)    => setForm(f => ({ ...f, visado: { ...f.visado, [k]: v } }));

  const isValidEmail = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validar = () => {
    const e = {};
    if (!form.nombre.trim())    e.nombre    = "Obligatorio";
    if (!form.apellidos.trim()) e.apellidos = "Obligatorio";
    if (!isValidEmail(form.email_jugador)) e.email_jugador = "Email inválido";
    if (!isValidEmail(form.email_familia)) e.email_familia = "Email inválido";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "jugadores"), {
        ...form,
        telefono: `${form.prefijo_tel} ${form.telefono}`.trim(),
        // Campos normalizados para ordenación correcta
        ...camposSort(form.nombre, form.apellidos),
        // Arrays inicializados para evitar errores con arrayUnion
        familiasIds: [],
        // Metadata
        createdAt: serverTimestamp(),
      });
      navigate("/jugadores");
    } catch {
      toast.error("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const Campo = ({ k, label, type = "text", placeholder, full = false, children }) => (
    <div className={`form-group${full ? " full" : ""}`}>
      <label>
        {label}
        {errores[k] && (
          <span style={{ color: "#f87171", fontSize: "11px", marginLeft: "6px" }}>
            {errores[k]}
          </span>
        )}
      </label>
      {children || (
        <input
          type={type}
          value={form[k]}
          placeholder={placeholder}
          onChange={e => set(k, e.target.value)}
          style={errores[k] ? { borderColor: "#f87171" } : {}}
        />
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Nuevo jugador</div>
          <div className="page-subtitle">Rellena los datos del jugador</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary"
            onClick={() => navigate("/jugadores")}>
            Cancelar
          </button>
          <button className="btn btn-primary"
            onClick={handleGuardar} disabled={saving}>
            {saving ? "Guardando..." : "Guardar jugador"}
          </button>
        </div>
      </div>

      {/* Datos personales */}
      <div className="card">
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "15px" }}>
          Datos personales
        </h3>
        <div className="form-grid">
          <Campo k="nombre"    label="Nombre *"    placeholder="Nombre" />
          <Campo k="apellidos" label="Apellidos *"  placeholder="Apellidos" />
          <Campo k="codigo"    label="Código interno" placeholder="Ej: #23 o JUG-001" />
          <Campo k="pais"      label="País de origen" placeholder="Ej: USA" />
          <Campo k="fecha_nacimiento" label="Fecha de nacimiento" type="date" />
          <div className="form-group">
            <label>Posición</label>
            <select value={form.posicion} onChange={e => set("posicion", e.target.value)}>
              <option value="">— Seleccionar —</option>
              {["Base","Escolta","Alero","Ala-Pívot","Pívot"].map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <Campo k="altura" label="Altura (cm)" type="number" placeholder="195" />
          <Campo k="peso"   label="Peso (kg)"   type="number" placeholder="85" />
          <div className="form-group">
            <label>Programa</label>
            <select value={form.programa} onChange={e => set("programa", e.target.value)}>
              <option value="gap_year">Gap Year (10 meses)</option>
              <option value="academic">Academic + Athletic</option>
              <option value="semestral">Semestral (4-6 meses)</option>
              <option value="summer">Summer Program</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select value={form.estado} onChange={e => set("estado", e.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div className="card">
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "15px" }}>
          Contacto
        </h3>
        <div className="form-grid">
          <Campo k="email_jugador" label="Email jugador" type="email" />
          <Campo k="email_familia" label="Email familia"  type="email" />

          {/* Teléfono con prefijo */}
          <div className="form-group">
            <label>Teléfono</label>
            <div style={{ display: "flex", gap: "6px" }}>
              <select
                value={form.prefijo_tel}
                onChange={e => set("prefijo_tel", e.target.value)}
                style={{ width: "120px" }}>
                {[
                  ["+1",  "USA/CA"], ["+34","España"],
                  ["+55","Brasil"],  ["+33","Francia"],
                  ["+49","Alemania"],["+39","Italia"],
                  ["+44","UK"],      ["+61","Australia"],
                  ["+81","Japón"],   ["+82","Corea"],
                  ["+52","México"],  ["+54","Argentina"],
                ].map(([code, pais]) => (
                  <option key={code} value={code}>{code} {pais}</option>
                ))}
              </select>
              <input
                value={form.telefono}
                onChange={e => set("telefono", e.target.value)}
                placeholder="612 345 678"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <Campo k="fecha_llegada" label="Fecha llegada" type="date" />
          <Campo k="fecha_salida"  label="Fecha salida"  type="date" />
          <Campo k="notas" label="Notas" full>
            <textarea
              value={form.notas}
              onChange={e => set("notas", e.target.value)}
              placeholder="Observaciones..."
              maxLength={1000}
            />
          </Campo>
        </div>
      </div>

      {/* Documentación */}
      <div className="card">
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "15px" }}>
          Documentación
        </h3>
        {DOCS_LISTA.map(d => (
          <div key={d.key} className="doc-item">
            <span className="doc-name">{d.label}</span>
            <label style={{
              display: "flex", alignItems: "center",
              gap: "8px", cursor: "pointer"
            }}>
              <input
                type="checkbox"
                checked={!!form.docs[d.key]}
                onChange={e => setDoc(d.key, e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#1a7a4a" }}
              />
              <span className={form.docs[d.key] ? "doc-ok" : "doc-missing"}>
                {form.docs[d.key] ? "✓ Recibido" : "Pendiente"}
              </span>
            </label>
          </div>
        ))}
      </div>

      {/* Detalle visado */}
      <div className="card">
        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "15px" }}>
          Detalle visado
        </h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Tipo de visado</label>
            <select value={form.visado.tipo}
              onChange={e => setVis("tipo", e.target.value)}>
              <option value="">— Seleccionar —</option>
              <option value="estudiante">Estudiante</option>
              <option value="deportista">Deportista</option>
              <option value="turista">Turista</option>
              <option value="trabajo">Trabajo</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estado visado</label>
            <select value={form.visado.estado}
              onChange={e => setVis("estado", e.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="en_tramite">En trámite</option>
              <option value="aprobado">Aprobado</option>
              <option value="denegado">Denegado</option>
            </select>
          </div>
          <div className="form-group">
            <label>Número de expediente</label>
            <input value={form.visado.numero}
              onChange={e => setVis("numero", e.target.value)} />
          </div>
          <div className="form-group">
            <label>País de emisión</label>
            <input value={form.visado.pais_emision}
              onChange={e => setVis("pais_emision", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Fecha solicitud</label>
            <input type="date" value={form.visado.fecha_solicitud}
              onChange={e => setVis("fecha_solicitud", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Fecha expiración</label>
            <input type="date" value={form.visado.fecha_expiracion}
              onChange={e => setVis("fecha_expiracion", e.target.value)} />
          </div>
          <div className="form-group full">
            <label>Notas visado</label>
            <input value={form.visado.notas}
              onChange={e => setVis("notas", e.target.value)}
              placeholder="Observaciones sobre el visado..." />
          </div>
        </div>
      </div>
    </div>
  );
}
