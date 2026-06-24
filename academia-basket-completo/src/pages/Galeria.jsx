import { useIsMounted } from "../hooks/useIsMounted.js";
import { useToast } from "../components/Toast.jsx";
import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc,
  orderBy, query, serverTimestamp, limit, startAfter
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { storagePath, sanitizarNombreArchivo } from "../utils/storage.js";
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 20;

export default function Galeria() {
  const { perfil } = useAuth();
  const isMounted = useIsMounted();
  const toast = useToast();
  const [fotos,       setFotos]       = useState([]);
  const [hayMas,      setHayMas]      = useState(true);
  const [ultimoDoc,   setUltimoDoc]   = useState(null);
  const [subiendo,    setSubiendo]    = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [cargandoIni, setCargandoIni] = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [indiceAmpliado, setIndiceAmpliado] = useState(0);

  const puedeSubir =
    perfil?.rol === "admin" || perfil?.rol === "entrenador";

  // Carga inicial
  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(query(
        collection(db, "galeria"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      ));
          if (!isMounted()) return;
    setFotos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
      setHayMas(snap.docs.length === PAGE_SIZE);
      setCargandoIni(false);
    };
    fetch();
  }, []);

  const cargarMas = async () => {
    if (!ultimoDoc || cargandoMas) return;
    setCargandoMas(true);
    const snap = await getDocs(query(
      collection(db, "galeria"),
      orderBy("createdAt", "desc"),
      startAfter(ultimoDoc),
      limit(PAGE_SIZE)
    ));
    if (snap.docs.length < PAGE_SIZE) setHayMas(false);
    setUltimoDoc(snap.docs[snap.docs.length - 1] || null);
    setFotos(f => [
      ...f,
      ...snap.docs.map(d => ({ id: d.id, ...d.data() }))
    ]);
    setCargandoMas(false);
  };

  const handleSubir = async (e) => {
    const archivos = Array.from(e.target.files).filter(f => {
      if (!f.type.startsWith("image/")) {
        toast.warning(`${f.name} no es una imagen`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.warning(`${f.name} supera el límite de 10MB`);
        return false;
      }
      return true;
    });
    if (!archivos.length) return;

    setSubiendo(true);
    const nuevas = [];
    for (const archivo of archivos) {
      try {
        const storageRef = ref(
          storage, storagePath("galeria", archivo)
        );
        await uploadBytes(storageRef, archivo);
        const url = await getDownloadURL(storageRef);
        const data = {
          url,
          nombre:      sanitizarNombreArchivo(archivo.name),
          autorNombre: `${perfil.nombre} ${perfil.apellidos}`,
          fecha:       new Date().toISOString().split("T")[0],
          createdAt:   serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "galeria"), data);
        nuevas.push({ id: docRef.id, ...data });
      } catch {
        toast.error(`Error al subir ${archivo.name}`);
      }
    }
    setFotos(f => [...nuevas, ...f]);
    setSubiendo(false);
    // Limpiar input
    e.target.value = "";
  };

  const abrirFoto = (foto, idx) => {
    setFotoAmpliada(foto);
    setIndiceAmpliado(idx);
  };

  const navegar = (dir) => {
    const nuevo = indiceAmpliado + dir;
    if (nuevo < 0 || nuevo >= fotos.length) return;
    setFotoAmpliada(fotos[nuevo]);
    setIndiceAmpliado(nuevo);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Galería</div>
          <div className="page-subtitle">{fotos.length} fotos</div>
        </div>
        {puedeSubir && (
          <label style={{
            background: "#1a7a4a", color: "#fff",
            borderRadius: "8px", padding: "9px 16px",
            fontSize: "14px", fontWeight: "600",
            cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: "6px",
            minHeight: "44px"
          }}>
            {subiendo ? "⏳ Subiendo..." : "📷 Subir fotos"}
            <input type="file" accept="image/*" multiple
              onChange={handleSubir}
              disabled={subiendo}
              style={{ display: "none" }} />
          </label>
        )}
      </div>

      {/* Aviso sobre vídeos */}
      <div style={{
        background: "#0f1f17", border: "1px solid #1e4030",
        borderRadius: "8px", padding: "10px 14px",
        marginBottom: "16px", fontSize: "13px", color: "#4a7a60"
      }}>
        💡 <strong style={{ color: "#ccc" }}>Fotos:</strong> súbelas aquí
        (máx. 10MB).{" "}
        <strong style={{ color: "#ccc" }}>Vídeos:</strong> añade el enlace
        de YouTube o Vimeo en una{" "}
        <span style={{ color: "#f97316" }}>Noticia</span>.
      </div>

      {cargandoIni ? (
        <div style={{ textAlign: "center", padding: "48px", color: "#4a7a60" }}>
          Cargando galería...
        </div>
      ) : fotos.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📷</div>
          <p style={{ color: "#666" }}>Sin fotos en la galería.</p>
        </div>
      ) : (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "10px"
          }}>
            {fotos.map((f, idx) => (
              <FotoCard
                key={f.id}
                foto={f}
                onClick={() => abrirFoto(f, idx)}
              />
            ))}
          </div>

          {hayMas && (
            <button
              className="btn btn-secondary"
              style={{ width: "100%", marginTop: "12px" }}
              onClick={cargarMas}
              disabled={cargandoMas}>
              {cargandoMas ? "Cargando..." : "Cargar más fotos"}
            </button>
          )}
        </>
      )}

      {/* Lightbox con navegación */}
      {fotoAmpliada && (
        <Lightbox
          foto={fotoAmpliada}
          indice={indiceAmpliado}
          total={fotos.length}
          onCerrar={() => setFotoAmpliada(null)}
          onNavegar={navegar}
        />
      )}
    </div>
  );
}

// ── Tarjeta foto ─────────────────────────────────────────
function FotoCard({ foto, onClick }) {
  const [error, setError] = useState(false);
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "10px", overflow: "hidden",
        border: "1px solid #1e4030", cursor: "pointer",
        aspectRatio: "1", background: "#0f1f17",
        transition: "transform 0.15s, border-color 0.15s",
        display: "flex", alignItems: "center",
        justifyContent: "center"
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.borderColor = "#1a7a4a";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.borderColor = "#1e4030";
      }}
    >
      {error ? (
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "center", color: "#2a5a40",
          fontSize: "28px"
        }}>📷</div>
      ) : (
        <img src={foto.url} alt={foto.nombre}
          loading="lazy"
          style={{
            width: "100%", height: "100%", objectFit: "cover"
          }}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

// ── Lightbox ─────────────────────────────────────────────
function Lightbox({ foto, indice, total, onCerrar, onNavegar }) {
  // Navegación con teclado
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape")     onCerrar();
      if (e.key === "ArrowRight") onNavegar(1);
      if (e.key === "ArrowLeft")  onNavegar(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [indice]);

  return (
    <div
      onClick={onCerrar}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.92)",
        display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 1000, padding: "20px"
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "90vh", position: "relative" }}
      >
        <img src={foto.url} alt={foto.nombre}
          style={{
            maxWidth: "100%", maxHeight: "80vh",
            borderRadius: "12px", display: "block"
          }}
          onError={e => { e.target.alt = "Imagen no disponible"; }}
        />

        {/* Info */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginTop: "10px", gap: "12px"
        }}>
          <span style={{ color: "#4a7a60", fontSize: "13px" }}>
            {foto.autorNombre} · {foto.fecha}
          </span>
          <span style={{ color: "#4a7a60", fontSize: "12px" }}>
            {indice + 1}/{total}
          </span>
        </div>

        {/* Navegación */}
        {indice > 0 && (
          <button onClick={() => onNavegar(-1)} style={{
            position: "absolute", left: "-50px", top: "50%",
            transform: "translateY(-50%)",
            background: "#1e4030", border: "none", borderRadius: "50%",
            width: "40px", height: "40px", color: "#fff",
            fontSize: "18px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>‹</button>
        )}
        {indice < total - 1 && (
          <button onClick={() => onNavegar(1)} style={{
            position: "absolute", right: "-50px", top: "50%",
            transform: "translateY(-50%)",
            background: "#1e4030", border: "none", borderRadius: "50%",
            width: "40px", height: "40px", color: "#fff",
            fontSize: "18px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>›</button>
        )}

        {/* Cerrar */}
        <button onClick={onCerrar} style={{
          position: "absolute", top: "-14px", right: "-14px",
          background: "#1e4030", border: "none", borderRadius: "50%",
          width: "32px", height: "32px", color: "#ccc",
          fontSize: "16px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>✕</button>
      </div>
    </div>
  );
}
