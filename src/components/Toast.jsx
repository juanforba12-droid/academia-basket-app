import { useState, useCallback, createContext, useContext, useRef } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const toast = useCallback((mensaje, tipo = "info", duracion = 3500) => {
    setToasts(prev => {
      // Deduplicar: ignorar si ya hay un toast igual visible
      if (prev.some(t => t.mensaje === mensaje && t.tipo === tipo)) return prev;
      const id = ++counter.current;
      setTimeout(() => {
        setToasts(t => t.filter(x => x.id !== id));
      }, duracion);
      return [...prev, { id, mensaje, tipo }];
    });
  }, []);

  const cerrar = (id) => setToasts(t => t.filter(x => x.id !== id));

  const COLORES = {
    success: { bg: "#14532d", border: "#166534", icon: "✅", color: "#4ade80" },
    error:   { bg: "#450a0a", border: "#991b1b", icon: "❌", color: "#f87171" },
    warning: { bg: "#451a03", border: "#92400e", icon: "⚠️", color: "#fbbf24" },
    info:    { bg: "#0c1a45", border: "#1e3a8a", icon: "ℹ️", color: "#93c5fd" },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: "fixed", bottom: "24px", right: "20px",
        display: "flex", flexDirection: "column", gap: "8px",
        zIndex: 9999, maxWidth: "320px",
        width: "calc(100vw - 40px)"
      }}>
        {toasts.map(t => {
          const estilo = COLORES[t.tipo] || COLORES.info;
          return (
            <div key={t.id} style={{
              background: estilo.bg,
              border: `1px solid ${estilo.border}`,
              borderRadius: "10px", padding: "12px 14px",
              display: "flex", alignItems: "flex-start",
              gap: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              animation: "toastIn 0.2s ease"
            }}>
              <span style={{ fontSize: "16px", flexShrink: 0 }}>
                {estilo.icon}
              </span>
              <span style={{
                color: estilo.color, fontSize: "14px",
                lineHeight: "1.4", flex: 1
              }}>
                {t.mensaje}
              </span>
              <button onClick={() => cerrar(t.id)} style={{
                background: "none", border: "none",
                color: estilo.color, cursor: "pointer",
                fontSize: "16px", padding: 0,
                opacity: 0.7, flexShrink: 0
              }}>✕</button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return {
    success: (msg)            => ctx(msg, "success"),
    error:   (msg)            => ctx(msg, "error",   5000),
    warning: (msg)            => ctx(msg, "warning"),
    info:    (msg)            => ctx(msg, "info"),
  };
}
