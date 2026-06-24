import { useToast } from "../components/Toast.jsx";
import { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, getDocs, startAfter, serverTimestamp, limit
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import HiloForo from "../components/HiloForo";
import { normalizar, truncar } from "../utils/helpers";
import { storagePath } from "../utils/storage.js";
import { notificarATodos } from "../utils/crearNotificacion";

const PAGE_SIZE = 15;

export default function Foro() {
  const { user, perfil } = useAuth();
  const toast = useToast();
  const [hilos,       setHilos]       = useState([]);
  const [hayMas,      setHayMas]      = useState(true);
  const [ultimoDoc,   setUltimoDoc]   = useState(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [busqueda,    setBusqueda]    = useState("");
  const [hiloAbierto, setHiloAbierto] = useState(null);
  const [nuevoHilo,   setNuevoHilo]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [form, setForm] = useState({
    titulo: "", contenido: "", videoUrl: ""
  });
  const [archivoFoto, setArchivoFoto] = useState(null);

  const puedePublicar =
    perfil?.rol === "admin" || perfil?.rol === "entrenador";

  // Tiempo real para los primeros PAGE_SIZE hilos
  useEffect(() => {
    const q = query(
      collection(db, "foro_hilos"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    const unsub = onSnapshot(q, snap => {
      setHilos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
      setHayMas(snap.docs.length === PAGE_SIZE);
    });
    return unsub;
  }, []);

  const cargarMas = async () => {
    if (!ultimoDoc || cargandoMas) return;
    setCargandoMas(true);
    const snap = await getDocs(query(
      collection(db, "foro_hilos"),
      orderBy("createdAt", "desc"),
      startAfter(ultimoDoc),
      limit(PAGE_SIZE)
    ));
    if (snap.docs.length < PAGE_SIZE) setHayMas(false);
    setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
    setHilos(h => [
      ...h,
      ...snap.docs.map(d => ({ id: d.id, ...d.data() }))
    ]);
    setCargandoMas(false);
  };

  const hilosFiltrados = hilos.filter(h =>
    normalizar(`${h.titulo} ${h.contenido} ${h.autorNombre}`)
      .includes(normalizar(busqueda))
  );

  const subirFoto = async (file) => {
    setUploading(true);
    try {
      const storageRef = ref(storage, storagePath("foro", file));
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } finally {
      setUploading(false);
    }
  };

  const handleGuardar = async () => {
    if (saving) return;
    if (!form.titulo.trim() || !form.contenido.trim()) {
      return toast.warning("Título y contenido son obligatorios");
    }
    setSaving(true);
    try {
      let fotoUrl = "";
      if (archivoFoto) {
        try {
          fotoUrl = await subirFoto(archivoFoto);
        } catch {
          setSaving(false);
          return toast.error("Error al subir la foto.");
        }
      }
      await addDoc(collection(db, "foro_hilos"), {
        titulo:       form.titulo.trim(),
        contenido:    form.contenido.trim(),
        videoUrl:     form.videoUrl.trim(),
        fotoUrl,
        autorId:      user.uid,
        autorNombre:  `${perfil.nombre} ${perfil.apellidos}`,
        autorRol:     perfil.rol,
        fecha:        new Date().toISOString().split("T")[0],
        numRespuestas: 0,
        createdAt:    serverTimestamp(),
      });

      await notificarATodos({
        tipo:    "foro",
        titulo:  "Nuevo hilo en el foro",
        mensaje: truncar(form.titulo, 60),
        link:    "/foro",
      });

      setForm({ titulo: "", contenido: "", videoUrl: "" });
      setArchivoFoto(null);
      setNuevoHilo(false);
    } catch {
      toast.error("Error al publicar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (hiloAbierto) {
    return (
      <HiloForo
        hilo={hiloAbierto}
        onVolver={() => setHiloAbierto(null)}
        onRespuesta={() => {
          // Actualizar contador local
          setHilos(h => h.map(hilo =>
            hilo.id === hiloAbierto.id
              ? { ...hilo, numRespuestas: (hilo.numRespuestas || 0) + 1 }
              : hilo
          ));
        }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Foro</div>
          <div className="page-subtitle">
            {hilosFiltrados.length} hilos
          </div>
        </div>
        {puedePublicar && (
          <button className="btn btn-primary"
            onClick={() => setNuevoHilo(v => !v)}>
            {nuevoHilo ? "Cancelar" : "+ Nuevo hilo"}
          </button>
        )}
      </div>

      {/* Formulario nuevo hilo */}
      {nuevoHilo && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "15px" }}>
            Nuevo hilo
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="form-group">
              <label>Título *</label>
              <input value={form.titulo} maxLength={120}
                placeholder="Título del hilo"
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Contenido *</label>
              <textarea rows="4" value={form.contenido} maxLength={2000}
                placeholder="Escribe el mensaje..."
                onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))} />
              <span style={{
                color: "#4a7a60", fontSize: "11px", textAlign: "right"
              }}>
                {form.contenido.length}/2000
              </span>
            </div>
            <div className="form-group">
              <label>Foto (máx. 10MB)</label>
              <input type="file" accept="image/*"
                onChange={e => setArchivoFoto(e.target.files[0])}
                style={{ color: "#ccc" }} />
            </div>
            <div className="form-group">
              <label>URL vídeo (YouTube o Vimeo)</label>
              <input value={form.videoUrl}
                placeholder="https://youtube.com/..."
                onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} />
            </div>
            <button className="btn btn-primary"
              onClick={handleGuardar}
              disabled={saving || uploading}>
              {uploading ? "Subiendo foto..." : saving ? "Publicando..." : "Publicar hilo"}
            </button>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div style={{ marginBottom: "16px" }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar en el foro..."
        />
      </div>

      {/* Lista hilos */}
      {hilosFiltrados.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>💬</div>
          <p style={{ color: "#4a7a60", fontSize: "14px" }}>
            {busqueda
              ? "No hay hilos con ese texto."
              : "Aún no hay hilos en el foro."}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {hilosFiltrados.map(h => (
              <div key={h.id} className="card"
                style={{ cursor: "pointer" }}
                onClick={() => setHiloAbierto(h)}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginBottom: "6px", gap: "8px"
                }}>
                  <strong style={{ color: "#fff", fontSize: "15px" }}>
                    {h.titulo}
                  </strong>
                  <span style={{
                    color: "#4a7a60", fontSize: "12px", whiteSpace: "nowrap"
                  }}>
                    {h.fecha}
                  </span>
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <span style={{ color: "#888", fontSize: "13px" }}>
                      {h.autorNombre}
                    </span>
                    <span style={{
                      background: "#1e4030", borderRadius: "4px",
                      padding: "1px 6px", fontSize: "11px",
                      color: "#6ab88a", marginLeft: "8px"
                    }}>
                      {h.autorRol}
                    </span>
                  </div>
                  <span style={{ color: "#4a7a60", fontSize: "13px" }}>
                    💬 {h.numRespuestas || 0}
                  </span>
                </div>
                <p style={{
                  color: "#666", fontSize: "13px", marginTop: "8px",
                  overflow: "hidden", whiteSpace: "nowrap",
                  textOverflow: "ellipsis"
                }}>
                  {h.contenido}
                </p>
              </div>
            ))}
          </div>

          {hayMas && !busqueda && (
            <button
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: "12px" }}
              onClick={cargarMas}
              disabled={cargandoMas}>
              {cargandoMas ? "Cargando..." : "Cargar más hilos"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
