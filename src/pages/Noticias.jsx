import { useToast } from "../components/Toast.jsx";
import { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, limit, startAfter, getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { extraerVideo, truncar } from "../utils/helpers";
import { storagePath } from "../utils/storage.js";
import { notificarATodos } from "../utils/crearNotificacion";

const PAGE_SIZE = 10;

export default function Noticias() {
  const { user, perfil } = useAuth();
  const toast = useToast();
  const [noticias,    setNoticias]    = useState([]);
  const [hayMas,      setHayMas]      = useState(true);
  const [ultimoDoc,   setUltimoDoc]   = useState(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nueva,       setNueva]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [form, setForm] = useState({
    titulo: "", contenido: "", videoUrl: ""
  });
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [noticiaAbierta, setNoticiaAbierta] = useState(null);

  const puedePublicar =
    perfil?.rol === "admin" || perfil?.rol === "entrenador";

  // Tiempo real para las primeras PAGE_SIZE noticias
  useEffect(() => {
    const q = query(
      collection(db, "noticias"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNoticias(docs);
      setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
      setHayMas(snap.docs.length === PAGE_SIZE);
    });
    return unsub;
  }, []);

  const cargarMas = async () => {
    if (!ultimoDoc || cargandoMas) return;
    setCargandoMas(true);
    const snap = await getDocs(query(
      collection(db, "noticias"),
      orderBy("createdAt", "desc"),
      startAfter(ultimoDoc),
      limit(PAGE_SIZE)
    ));
    if (snap.docs.length < PAGE_SIZE) setHayMas(false);
    setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
    setNoticias(n => [
      ...n,
      ...snap.docs.map(d => ({ id: d.id, ...d.data() }))
    ]);
    setCargandoMas(false);
  };

  const subirFoto = async (file) => {
    setUploading(true);
    try {
      const storageRef = ref(storage, storagePath("noticias", file));
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
      await addDoc(collection(db, "noticias"), {
        titulo:      form.titulo.trim(),
        contenido:   form.contenido.trim(),
        videoUrl:    form.videoUrl.trim(),
        fotoUrl,
        autorId:     user.uid,
        autorNombre: `${perfil.nombre} ${perfil.apellidos}`,
        fecha:       new Date().toISOString().split("T")[0],
        createdAt:   serverTimestamp(),
      });

      await notificarATodos({
        tipo:    "noticia",
        titulo:  "Nueva noticia publicada",
        mensaje: truncar(form.titulo, 60),
        link:    "/noticias",
      });

      setForm({ titulo: "", contenido: "", videoUrl: "" });
      setArchivoFoto(null);
      setNueva(false);
    } catch {
      toast.error("Error al publicar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // Vista de noticia abierta
  if (noticiaAbierta) {
    return (
      <NoticiaDetalle
        noticia={noticiaAbierta}
        onVolver={() => setNoticiaAbierta(null)}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Noticias</div>
          <div className="page-subtitle">{noticias.length} publicaciones</div>
        </div>
        {puedePublicar && (
          <button className="btn btn-primary"
            onClick={() => setNueva(v => !v)}>
            {nueva ? "Cancelar" : "+ Nueva noticia"}
          </button>
        )}
      </div>

      {/* Formulario nueva noticia */}
      {nueva && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "15px" }}>
            Nueva noticia
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="form-group">
              <label>Título *</label>
              <input value={form.titulo} maxLength={120}
                placeholder="Título de la noticia"
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Contenido *</label>
              <textarea rows="5" value={form.contenido} maxLength={3000}
                placeholder="Escribe el contenido..."
                onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))} />
              <span style={{ color: "#4a7a60", fontSize: "11px", textAlign: "right" }}>
                {form.contenido.length}/3000
              </span>
            </div>
            <div className="form-group">
              <label>Foto (máx. 10MB)</label>
              <input type="file" accept="image/*"
                onChange={e => setArchivoFoto(e.target.files[0])}
                style={{ color: "#ccc" }} />
              {archivoFoto && (
                <span style={{ color: "#4ade80", fontSize: "12px" }}>
                  ✓ {archivoFoto.name}
                </span>
              )}
            </div>
            <div className="form-group">
              <label>URL vídeo (YouTube o Vimeo)</label>
              <input value={form.videoUrl}
                placeholder="https://youtube.com/watch?v=..."
                onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} />
            </div>
            <button className="btn btn-primary"
              onClick={handleGuardar}
              disabled={saving || uploading}>
              {uploading ? "Subiendo foto..." : saving ? "Publicando..." : "Publicar noticia"}
            </button>
          </div>
        </div>
      )}

      {/* Lista noticias */}
      {noticias.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📰</div>
          <p style={{ color: "#666" }}>No hay noticias publicadas todavía.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {noticias.map(n => (
              <TarjetaNoticia
                key={n.id}
                noticia={n}
                onClick={() => setNoticiaAbierta(n)}
              />
            ))}
          </div>
          {hayMas && (
            <button
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: "12px" }}
              onClick={cargarMas}
              disabled={cargandoMas}>
              {cargandoMas ? "Cargando..." : "Cargar más noticias"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Tarjeta resumen ──────────────────────────────────────
function TarjetaNoticia({ noticia: n, onClick }) {
  return (
    <div className="card" style={{ cursor: "pointer" }} onClick={onClick}>
      {n.fotoUrl && (
        <img loading="lazy" src={n.fotoUrl} alt={n.titulo}
          style={{
            width: "100%", borderRadius: "8px",
            marginBottom: "12px", maxHeight: "200px", objectFit: "cover"
          }}
          onError={e => { e.target.style.display = "none"; }}
        />
      )}
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginBottom: "6px", gap: "8px"
      }}>
        <strong style={{
          color: "#fff", fontSize: "16px", lineHeight: "1.3"
        }}>
          {n.titulo}
        </strong>
        <span style={{
          color: "#4a7a60", fontSize: "12px", whiteSpace: "nowrap"
        }}>
          {n.fecha}
        </span>
      </div>
      <p style={{ color: "#888", fontSize: "12px", marginBottom: "8px" }}>
        {n.autorNombre}
      </p>
      <p style={{
        color: "#ccc", fontSize: "14px", lineHeight: "1.5",
        overflow: "hidden", display: "-webkit-box",
        WebkitLineClamp: 3, WebkitBoxOrient: "vertical"
      }}>
        {n.contenido}
      </p>
      {(n.videoUrl || n.fotoUrl) && (
        <p style={{
          color: "#1a7a4a", fontSize: "13px",
          marginTop: "8px", fontWeight: "600"
        }}>
          Leer más →
        </p>
      )}
    </div>
  );
}

// ── Vista detalle noticia ────────────────────────────────
function NoticiaDetalle({ noticia: n, onVolver }) {
  const video = extraerVideo(n.videoUrl);
  return (
    <div>
      <button className="btn btn-secondary"
        style={{ marginBottom: "20px" }}
        onClick={onVolver}>
        ← Volver
      </button>
      <div className="card">
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginBottom: "8px", gap: "8px", flexWrap: "wrap"
        }}>
          <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: "700" }}>
            {n.titulo}
          </h2>
          <span style={{ color: "#4a7a60", fontSize: "13px" }}>{n.fecha}</span>
        </div>
        <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>
          {n.autorNombre}
        </p>
        {n.fotoUrl && (
          <img loading="lazy" src={n.fotoUrl} alt={n.titulo}
            style={{
              width: "100%", borderRadius: "8px",
              marginBottom: "16px", maxHeight: "400px", objectFit: "cover"
            }}
            onError={e => { e.target.style.display = "none"; }}
          />
        )}
        {video?.tipo === "youtube" && (
          <div style={{
            position: "relative", paddingBottom: "56.25%",
            marginBottom: "16px"
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
        {video?.tipo === "vimeo" && (
          <div style={{
            position: "relative", paddingBottom: "56.25%",
            marginBottom: "16px"
          }}>
            <iframe
              src={`https://player.vimeo.com/video/${video.id}`}
              style={{
                position: "absolute", top: 0, left: 0,
                width: "100%", height: "100%",
                borderRadius: "8px", border: "none"
              }}
              allowFullScreen
            />
          </div>
        )}
        <p style={{
          color: "#ccc", fontSize: "15px",
          lineHeight: "1.7", whiteSpace: "pre-wrap"
        }}>
          {n.contenido}
        </p>
      </div>
    </div>
  );
}
