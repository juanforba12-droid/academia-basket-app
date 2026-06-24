import { useState, useCallback, createContext, useContext } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [estado, setEstado] = useState(null);
  // estado: { mensaje, onConfirm, onCancel, textoOk, textoCancel, tipo }

  const confirm = useCallback((mensaje, opciones = {}) => {
    return new Promise((resolve) => {
      setEstado({
        mensaje,
        textoOk:     opciones.textoOk     || "Confirmar",
        textoCancel: opciones.textoCancel || "Cancelar",
        tipo:        opciones.tipo        || "warning",
        onConfirm:   () => { setEstado(null); resolve(true);  },
        onCancel:    () => { setEstado(null); resolve(false); },
      });
    });
  }, []);

  const ICONOS = { warning: "⚠️", danger: "🗑️", info: "ℹ️" };
  const COLORES = {
    warning: { border: "#f97316", btn: "#f97316",  btnColor: "#fff" },
    danger:  { border: "#dc2626", btn: "#dc2626",  btnColor: "#fff" },
    info:    { border: "#3b82f6", btn: "#1a7a4a",  btnColor: "#fff" },
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {estado && (
        <div
          onClick={estado.onCancel}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 10000,
            padding: "20px", backdropFilter: "blur(2px)"
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#132d1e",
              border: `1px solid ${COLORES[estado.tipo]?.border || "#1e4030"}`,
              borderRadius: "14px", padding: "24px",
              maxWidth: "360px", width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
            }}>
            <div style={{
              fontSize: "32px", textAlign: "center",
              marginBottom: "12px"
            }}>
              {ICONOS[estado.tipo]}
            </div>
            <p style={{
              color: "#e8e8e8", fontSize: "15px",
              lineHeight: "1.5", textAlign: "center",
              marginBottom: "20px", whiteSpace: "pre-wrap"
            }}>
              {estado.mensaje}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={estado.onCancel}
                style={{
                  flex: 1, background: "#1e4030", color: "#ccc",
                  border: "none", borderRadius: "8px",
                  padding: "11px", fontSize: "14px",
                  fontWeight: "600", cursor: "pointer",
                  minHeight: "44px"
                }}>
                {estado.textoCancel}
              </button>
              <button
                onClick={estado.onConfirm}
                style={{
                  flex: 1,
                  background: COLORES[estado.tipo]?.btn || "#1a7a4a",
                  color: COLORES[estado.tipo]?.btnColor || "#fff",
                  border: "none", borderRadius: "8px",
                  padding: "11px", fontSize: "14px",
                  fontWeight: "700", cursor: "pointer",
                  minHeight: "44px"
                }}>
                {estado.textoOk}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  return ctx;
}
