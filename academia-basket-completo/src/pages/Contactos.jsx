import { useEffect, useState } from "react";
import {
  collection, getDocs, orderBy, query,
  updateDoc, doc
} from "firebase/firestore";
import { db } from "../firebase/config";

export default function Contactos() {
  const [mensajes,  setMensajes]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filtro,    setFiltro]    = useState("todos"); // todos | sin_leer | leidos

  useEffect(() => {
    getDocs(query(collection(db, "contacto"), orderBy("createdAt", "desc")))
      .then(snap => {
        setMensajes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
  }, []);

  const marcarLeido = async (id) => {
    await updateDoc(doc(db, "contacto", id), { leido: true });
    setMensajes(m => m.map(msg =>
      msg.id === id ? { ...msg, leido: true } : msg
    ));
  };

  const marcarTodosLeidos = async () => {
    const sinLeer = mensajes.filter(m => !m.leido);
    await Promise.all(sinLeer.map(m =>
      updateDoc(doc(db, "contacto", m.id), { leido: true })
    ));
    setMensajes(m => m.map(msg => ({ ...msg, leido: true })));
  };

  const mensajesFiltrados = mensajes.filter(m => {
    if (filtro === "sin_leer") return !m.leido;
    if (filtro === "leidos")   return  m.leido;
    return true;
  });

  const noLeidos = mensajes.filter(m => !m.leido).length;

  // Construir tel limpio para WhatsApp
  const telLimpio = (tel) => tel?.replace(/\D/g, "") || "";

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Contactos</div>
          <div className="page-subtitle">
            {noLeidos > 0
              ? `${noLeidos} mensaje${noLeidos > 1 ? "s" : ""} sin leer`
              : "Todos leídos"}
          </div>
        </div>
        {noLeidos > 0 && (
          <button className="btn btn-secondary"
            onClick={marcarTodosLeidos}>
            ✓ Marcar todos leídos
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: "8px",
        marginBottom: "16px", flexWrap: "wrap"
      }}>
        {[
          { val: "todos",    label: `Todos (${mensajes.length})` },
          { val: "sin_leer", label: `Sin leer (${noLeidos})` },
          { val: "leidos",   label: `Leídos (${mensajes.length - noLeidos})` },
        ].map(f => (
          <button key={f.val}
            onClick={() => setFiltro(f.val)}
            className={`btn ${filtro === f.val ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: "13px", padding: "6px 14px" }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Cargando...</p>
      ) : mensajesFiltrados.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>📩</div>
          <p style={{ color: "#666" }}>
            {filtro === "sin_leer"
              ? "No hay mensajes sin leer."
              : "No hay mensajes todavía."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mensajesFiltrados.map(m => (
            <div key={m.id} className="card" style={{
              borderLeft: m.leido
                ? "3px solid #1e4030"
                : "3px solid #f97316",
              padding: "16px"
            }}>
              {/* Cabecera */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", marginBottom: "8px",
                gap: "8px", flexWrap: "wrap"
              }}>
                <div>
                  <strong style={{ color: "#fff", fontSize: "15px" }}>
                    {m.nombre}
                  </strong>
                  {!m.leido && (
                    <span style={{
                      background: "#f97316", color: "#fff",
                      borderRadius: "20px", padding: "1px 7px",
                      fontSize: "10px", fontWeight: "700",
                      marginLeft: "8px"
                    }}>
                      NUEVO
                    </span>
                  )}
                  {m.pais && (
                    <span style={{
                      background: "#1e4030", borderRadius: "4px",
                      padding: "1px 7px", fontSize: "11px",
                      color: "#6ab88a", marginLeft: "8px"
                    }}>
                      {m.pais}
                    </span>
                  )}
                </div>
                <span style={{ color: "#4a7a60", fontSize: "12px" }}>
                  {m.fecha}
                </span>
              </div>

              {/* Contacto */}
              <div style={{
                display: "flex", gap: "12px",
                marginBottom: "10px", flexWrap: "wrap"
              }}>
                <a href={`mailto:${m.email}?subject=Re: Academia Internacional de Básquet&body=Hola ${encodeURIComponent(m.nombre)},%0A%0A`}
                  style={{
                    color: "#60a5fa", fontSize: "13px",
                    textDecoration: "none"
                  }}>
                  ✉️ {m.email}
                </a>
                {m.telefono && (
                  <>
                    <a href={`tel:${m.telefono}`}
                      style={{
                        color: "#4ade80", fontSize: "13px",
                        textDecoration: "none"
                      }}>
                      📞 {m.telefono}
                    </a>
                    {telLimpio(m.telefono).length >= 7 && (
                      <a
                        href={`https://wa.me/${telLimpio(m.telefono)}?text=Hola ${encodeURIComponent(m.nombre)}, gracias por contactar con la Academia Internacional de Básquet de Castellón.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        rel="noopener noreferrer"
                        style={{
                          background: "#25D366", color: "#fff",
                          borderRadius: "6px", padding: "2px 10px",
                          fontSize: "12px", fontWeight: "600",
                          textDecoration: "none"
                        }}>
                        💬 WhatsApp
                      </a>
                    )}
                  </>
                )}
              </div>

              {/* Mensaje */}
              <p style={{
                color: "#ccc", fontSize: "14px",
                lineHeight: "1.6", whiteSpace: "pre-wrap"
              }}>
                {m.mensaje}
              </p>

              {/* Acción */}
              {!m.leido && (
                <button
                  className="btn btn-secondary"
                  style={{
                    marginTop: "12px", fontSize: "12px",
                    padding: "5px 12px"
                  }}
                  onClick={() => marcarLeido(m.id)}>
                  ✓ Marcar leído
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
