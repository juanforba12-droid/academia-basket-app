import { useIsMounted } from "../hooks/useIsMounted.js";
import { useToast } from "../components/Toast.jsx";
import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, query,
  where, orderBy, serverTimestamp,
  doc, updateDoc, increment
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { extraerVideo } from "../utils/helpers";

const MAX_RESPUESTA = 2000;

export default function HiloForo({ hilo, onVolver, onRespuesta }) {
  const { user, perfil } = useAuth();
  const isMounted = useIsMounted();
  const toast = useToast();
  const [respuestas, setRespuestas] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [texto,      setTexto]      = useState("");
  const [saving,     setSaving]     = useState(false);

  const video = extraerVideo(hilo.videoUrl);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(query(
        collection(db, "foro_respuestas"),
        where("hiloId", "==", hilo.id),
        orderBy("createdAt", "asc")
      ));
            if (!isMounted()) return;
      setRespuestas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, [hilo.id]);

  const handleResponder = async () => {
    if (saving || !texto.trim()) return;
    setSaving(true);
    try {
      const data = {
        hiloId:      hilo.id,
        contenido:   texto.trim(),
        autorId:     user.uid,
        autorNombre: `${perfil.nombre} ${perfil.apellidos}`,
        autorRol:    perfil.rol,
        fecha:       new Date().toISOString().split("T")[0],
        createdAt:   serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "foro_respuestas"), data);

      // Incrementar contador en el hilo
      await updateDoc(doc(db, "foro_hilos", hilo.id), {
        numRespuestas: increment(1)
      });

      setRespuestas(r => [...r, { id: docRef.id, ...data }]);
      setTexto("");
      onRespuesta?.(); // notificar al padre
    } catch {
      toast.error("Error al enviar la respuesta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button className="btn btn-secondary"
        style={{ marginBottom: "20px" }}
        onClick={onVolver}>
        ← Volver al foro
      </button>

      {/* Hilo original */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginBottom: "8px", gap: "8px", flexWrap: "wrap"
        }}>
          <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "700" }}>
            {hilo.titulo}
          </h2>
          <span style={{ color: "#4a7a60", fontSize: "12px" }}>
            {hilo.fecha}
          </span>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <span style={{ color: "#888", fontSize: "13px" }}>
            {hilo.autorNombre}
          </span>
          <span style={{
            background: "#1e4030", borderRadius: "4px",
            padding: "1px 6px", fontSize: "11px",
            color: "#6ab88a", marginLeft: "8px"
          }}>
            {hilo.autorRol}
          </span>
        </div>

        {hilo.fotoUrl && (
          <img loading="lazy" src={hilo.fotoUrl} alt={hilo.titulo}
            style={{
              width: "100%", borderRadius: "8px",
              marginBottom: "12px", maxHeight: "300px",
              objectFit: "cover"
            }}
            onError={e => { e.target.style.display = "none"; }}
          />
        )}

        {video?.tipo === "youtube" && (
          <div style={{
            position: "relative", paddingBottom: "56.25%",
            marginBottom: "12px"
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
            marginBottom: "12px"
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
          color: "#ccc", fontSize: "14px",
          lineHeight: "1.6", whiteSpace: "pre-wrap"
        }}>
          {hilo.contenido}
        </p>
      </div>

      {/* Respuestas */}
      <h3 style={{
        color: "#fff", fontSize: "15px", marginBottom: "16px"
      }}>
        💬 {respuestas.length} respuesta{respuestas.length !== 1 ? "s" : ""}
      </h3>

      {loading ? (
        <p style={{ color: "#666" }}>Cargando respuestas...</p>
      ) : (
        <div style={{
          display: "flex", flexDirection: "column",
          gap: "10px", marginBottom: "20px"
        }}>
          {respuestas.map(r => (
            <div key={r.id} style={{
              background: r.autorId === user?.uid ? "#1a3326" : "#132d1e",
              border: "1px solid #1e4030",
              borderRadius: "10px", padding: "14px"
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: "6px", gap: "8px"
              }}>
                <div>
                  <span style={{
                    color: "#fff", fontWeight: "600", fontSize: "13px"
                  }}>
                    {r.autorNombre}
                  </span>
                  <span style={{
                    background: "#0f1f17", borderRadius: "4px",
                    padding: "1px 6px", fontSize: "11px",
                    color: "#6ab88a", marginLeft: "8px"
                  }}>
                    {r.autorRol}
                  </span>
                </div>
                <span style={{
                  color: "#4a7a60", fontSize: "12px", whiteSpace: "nowrap"
                }}>
                  {r.fecha}
                </span>
              </div>
              <p style={{
                color: "#ccc", fontSize: "14px",
                lineHeight: "1.5", whiteSpace: "pre-wrap"
              }}>
                {r.contenido}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Caja de respuesta */}
      <div className="card">
        <h4 style={{
          color: "#fff", marginBottom: "12px", fontSize: "14px"
        }}>
          Escribe una respuesta
        </h4>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Tu respuesta..."
          rows="3"
          maxLength={MAX_RESPUESTA}
          style={{ marginBottom: "6px" }}
        />
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "10px"
        }}>
          <span style={{ color: "#4a7a60", fontSize: "11px" }}>
            {texto.length}/{MAX_RESPUESTA}
          </span>
        </div>
        <button className="btn btn-primary"
          onClick={handleResponder}
          disabled={saving || !texto.trim()}>
          {saving ? "Enviando..." : "Enviar respuesta"}
        </button>
      </div>
    </div>
  );
}
