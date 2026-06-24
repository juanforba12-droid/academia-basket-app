import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import { useEffect, useState } from "react";
import {
  doc, onSnapshot, setDoc,
  collection, getDocs
} from "firebase/firestore";
import { db } from "../firebase/config";

const ROLES_CONFIG = [
  { key: "admin",      label: "Administrador",   icon: "👑",
    desc: "Acceso total a la plataforma" },
  { key: "entrenador", label: "Entrenador",       icon: "📋",
    desc: "Acceso deportivo y foro" },
  { key: "jugador",    label: "Jugador",          icon: "🏀",
    desc: "Acceso a su propio perfil" },
  { key: "familia",    label: "Familia",          icon: "👨‍👩‍👧",
    desc: "Portal de su jugador" },
];

const COLECCIONES_BACKUP = [
  "jugadores", "usuarios", "sesiones", "partidos",
  "evaluaciones", "noticias", "foro_hilos", "foro_respuestas",
  "calendario", "contacto", "doc_historial",
];

export default function Ajustes() {
  const [codigos,         setCodigos]         = useState({
    admin: "", entrenador: "", jugador: "", familia: ""
  });
  const [codigosOriginales, setCodigosOriginales] = useState({});
  const [mostrar,         setMostrar]         = useState({});
  const [saving,          setSaving]          = useState(false);
  const [guardado,        setGuardado]        = useState(false);
  const [haciendoBackup,  setHaciendoBackup]  = useState(false);
  const [temporadaActiva, setTemporadaActiva] = useState("2026-2027");
  const [savingTemp,      setSavingTemp]      = useState(false);
  const toast   = useToast();
  const confirm = useConfirm();

  // Tiempo real para evitar sobreescrituras entre admins
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "config", "codigos"),
      snap => {
        if (snap.exists()) {
          setCodigos(snap.data());
          setCodigosOriginales(snap.data());
        }
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "temporada_activa"), snap => {
      if (snap.exists()) setTemporadaActiva(snap.data().temporada || "");
    });
    return unsub;
  }, []);

  const handleGuardar = async () => {
    // Validar longitud mínima
    const invalidos = ROLES_CONFIG.filter(r =>
      !codigos[r.key] || codigos[r.key].trim().length < 6
    );
    if (invalidos.length > 0) {
      return toast.warning(
        `Códigos demasiado cortos (mín. 6 caracteres): ${invalidos.map(r => r.label).join(", ")}`
      );
    }

    // Confirmación especial si cambia el código de admin
    if (codigos.admin !== codigosOriginales.admin) {
      const ok = confirm(
        "⚠️ Estás cambiando el código de ADMINISTRADOR.\n\n" +
        "Guárdalo en un lugar seguro antes de continuar.\n" +
        "Si lo pierdes, solo podrás recuperarlo desde Firebase Console.\n\n" +
        "¿Confirmas el cambio?"
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, "config", "codigos"), codigos, { merge: true });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch {
      toast.error("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarTemporada = async () => {
    if (!temporadaActiva.trim()) return;
    setSavingTemp(true);
    try {
      await setDoc(
        doc(db, "config", "temporada_activa"),
        { temporada: temporadaActiva.trim() },
        { merge: true }
      );
    } catch {
      toast.error("Error al guardar la temporada.");
    } finally {
      setSavingTemp(false);
    }
  };

  const exportarBackup = async () => {
    setHaciendoBackup(true);
    try {
      const backup = {
        exportado_el: new Date().toISOString(),
        version:      "1.0",
        datos:        {}
      };
      for (const col of COLECCIONES_BACKUP) {
        try {
          const snap = await getDocs(collection(db, col));
          backup.datos[col] = snap.docs.map(d => ({
            id: d.id, ...d.data()
          }));
        } catch {
          backup.datos[col] = `ERROR: no se pudo leer`;
        }
      }
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `backup_academia_${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al exportar el backup.");
    } finally {
      setHaciendoBackup(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ajustes</div>
          <div className="page-subtitle">Configuración de la academia</div>
        </div>
      </div>

      {/* Temporada activa */}
      <div className="card" style={{ maxWidth: "560px" }}>
        <h3 style={{ color: "#fff", fontSize: "15px", marginBottom: "6px" }}>
          Temporada activa
        </h3>
        <p style={{ color: "#4a7a60", fontSize: "13px", marginBottom: "14px" }}>
          Filtra los datos del dashboard, sesiones y partidos.
        </p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            value={temporadaActiva}
            onChange={e => setTemporadaActiva(e.target.value)}
            placeholder="Ej: 2026-2027"
            style={{ maxWidth: "200px" }}
          />
          <button
            className="btn btn-primary"
            onClick={handleGuardarTemporada}
            disabled={savingTemp}>
            {savingTemp ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Códigos de acceso */}
      <div className="card" style={{ maxWidth: "560px" }}>
        <h3 style={{ color: "#fff", fontSize: "15px", marginBottom: "6px" }}>
          Códigos de acceso por rol
        </h3>
        <p style={{ color: "#4a7a60", fontSize: "13px", marginBottom: "20px" }}>
          Cada rol usa un código secreto al registrarse.
          Cámbialo para invalidar nuevos registros con el código anterior.
          Los usuarios ya registrados no se ven afectados.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {ROLES_CONFIG.map(r => {
            const cambiado = codigos[r.key] !== codigosOriginales[r.key];
            return (
              <div key={r.key}>
                <label style={{
                  display: "flex", alignItems: "center",
                  gap: "6px", marginBottom: "6px"
                }}>
                  <span>{r.icon}</span>
                  <span style={{
                    color: "#fff", fontSize: "14px", fontWeight: "600"
                  }}>
                    {r.label}
                  </span>
                  <span style={{ color: "#4a7a60", fontSize: "12px" }}>
                    — {r.desc}
                  </span>
                  {cambiado && (
                    <span style={{
                      color: "#fbbf24", fontSize: "11px",
                      marginLeft: "4px"
                    }}>
                      (modificado)
                    </span>
                  )}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={mostrar[r.key] ? "text" : "password"}
                    value={codigos[r.key] || ""}
                    onChange={e => setCodigos(c => ({
                      ...c, [r.key]: e.target.value
                    }))}
                    placeholder={`Mínimo 6 caracteres`}
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrar(m => ({
                      ...m, [r.key]: !m[r.key]
                    }))}
                    style={{
                      position: "absolute", right: "12px", top: "50%",
                      transform: "translateY(-50%)",
                      background: "none", border: "none",
                      cursor: "pointer", color: "#4a7a60", fontSize: "16px"
                    }}>
                    {mostrar[r.key] ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ color: "#f87171", fontSize: "12px", marginTop: "12px" }}>
          ⚠️ No compartas los códigos por email o chat.
        </p>

        <div style={{
          display: "flex", alignItems: "center",
          gap: "12px", marginTop: "16px"
        }}>
          <button className="btn btn-primary"
            onClick={handleGuardar} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {guardado && (
            <span style={{ color: "#4ade80", fontSize: "13px" }}>
              ✓ Guardado
            </span>
          )}
        </div>
      </div>

      {/* Backup */}
      <div className="card" style={{ maxWidth: "560px" }}>
        <h3 style={{ color: "#fff", fontSize: "15px", marginBottom: "6px" }}>
          Backup de datos
        </h3>
        <p style={{ color: "#4a7a60", fontSize: "13px", marginBottom: "16px" }}>
          Exporta todos los datos de la academia a un archivo JSON.
          Recomendado: hacer backup semanal y guardarlo en Google Drive.
        </p>
        <button
          className="btn btn-secondary"
          onClick={exportarBackup}
          disabled={haciendoBackup}>
          {haciendoBackup ? "⏳ Exportando..." : "💾 Exportar backup completo"}
        </button>
      </div>
    </div>
  );
}
