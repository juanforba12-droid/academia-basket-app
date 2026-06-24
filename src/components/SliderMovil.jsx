/**
 * SliderMovil — reemplaza input[type=range] en móvil.
 * En escritorio muestra el slider nativo.
 * En móvil muestra botones +/- para evitar conflicto con scroll.
 */
export default function SliderMovil({
  label,
  value = 0,
  onChange,
  min = 0,
  max = 10,
}) {
  const isMobile = window.matchMedia("(pointer: coarse)").matches;

  const color =
    value >= Math.floor(max * 0.8) ? "#4ade80" :
    value >= Math.floor(max * 0.5) ? "#fbbf24" :
    "#f87171";

  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      {/* Label + valor */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "8px"
      }}>
        <label style={{ color: "#4a7a60", fontSize: "13px" }}>
          {label}
        </label>
        <strong style={{ color, fontSize: "14px" }}>
          {value}/{max}
        </strong>
      </div>

      {isMobile ? (
        /* ── Móvil: botones +/- ── */
        <div style={{
          display: "flex", alignItems: "center", gap: "10px"
        }}>
          <button
            type="button"
            onClick={dec}
            disabled={value <= min}
            style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: value <= min ? "#0f1f17" : "#1e4030",
              border: "1px solid #2a5a40",
              color: value <= min ? "#2a5a40" : "#fff",
              fontSize: "20px", cursor: "pointer",
              display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
              transition: "all 0.15s"
            }}>
            −
          </button>

          {/* Barra de progreso visual */}
          <div style={{
            flex: 1, height: "8px",
            background: "#0f1f17", borderRadius: "4px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: color, borderRadius: "4px",
              transition: "width 0.15s, background 0.15s"
            }} />
          </div>

          <button
            type="button"
            onClick={inc}
            disabled={value >= max}
            style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: value >= max ? "#0f1f17" : "#1a7a4a",
              border: "1px solid #2a5a40",
              color: value >= max ? "#2a5a40" : "#fff",
              fontSize: "20px", cursor: "pointer",
              display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
              transition: "all 0.15s"
            }}>
            +
          </button>
        </div>
      ) : (
        /* ── Desktop: slider nativo ── */
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={e => onChange(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: color }}
          />
        </div>
      )}
    </div>
  );
}
