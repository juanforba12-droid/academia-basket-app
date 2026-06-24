// ─── TEXTO ────────────────────────────────────────────────

/**
 * Normaliza un string para búsqueda y ordenación:
 * quita tildes, pasa a minúsculas, elimina espacios extra.
 */
export const normalizar = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/**
 * Trunca un string a maxLen caracteres añadiendo "…".
 */
export const truncar = (str = "", maxLen = 80) =>
  str.length > maxLen ? str.slice(0, maxLen) + "…" : str;


// ─── FECHAS ───────────────────────────────────────────────

/**
 * Formatea una fecha ISO "YYYY-MM-DD" a formato legible español.
 * @param {string} fechaIso
 * @returns {string} "24 de junio de 2026"
 */
export const formatearFecha = (fechaIso) => {
  if (!fechaIso) return "—";
  try {
    const [y, m, d] = fechaIso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
      day: "numeric", month: "long", year: "numeric"
    });
  } catch {
    return fechaIso;
  }
};

/**
 * Devuelve "hace X minutos / horas / días" a partir de un Timestamp de Firestore.
 */
export const tiempoTranscurrido = (timestamp) => {
  if (!timestamp) return "";
  const fecha = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff  = Math.floor((Date.now() - fecha) / 1000);

  if (diff < 60)   return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)}d`;
  return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
};

/**
 * Hoy en formato "YYYY-MM-DD".
 */
export const hoyISO = () => new Date().toISOString().split("T")[0];

/**
 * Fecha dentro de N días en formato "YYYY-MM-DD".
 */
export const enDiasISO = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};


// ─── FIRESTORE ────────────────────────────────────────────

/**
 * Genera los campos de ordenación normalizados para un jugador.
 * Úsalos al crear o editar un jugador para ordenación correcta en Firestore.
 */
export const camposSort = (nombre = "", apellidos = "") => ({
  nombre_sort:   normalizar(nombre),
  apellidos_sort: normalizar(apellidos),
});


// ─── VÍDEO ────────────────────────────────────────────────

/**
 * Extrae el ID y tipo de vídeo de una URL de YouTube o Vimeo.
 * @returns {{ tipo: "youtube"|"vimeo", id: string } | null}
 */
export const extraerVideo = (url) => {
  if (!url) return null;

  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (yt) return { tipo: "youtube", id: yt[1] };

  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return { tipo: "vimeo", id: vi[1] };

  return null;
};


// ─── ASISTENCIA ───────────────────────────────────────────

export const ESTADOS_ASISTENCIA = {
  presente:  { label: "Presente",   color: "#4ade80", bg: "#14532d" },
  ausente:   { label: "Ausente",    color: "#f87171", bg: "#450a0a" },
  lesionado: { label: "Lesionado",  color: "#fbbf24", bg: "#451a03" },
  seleccion: { label: "Selección",  color: "#60a5fa", bg: "#0c1a45" },
  permiso:   { label: "Permiso",    color: "#c084fc", bg: "#2e0a45" },
};

/**
 * Calcula el porcentaje de asistencia real de un jugador
 * (excluye ausencias justificadas del denominador).
 */
export const calcularAsistencia = (sesiones, jugadorId) => {
  const del = sesiones.filter(s => s.jugadores?.includes(jugadorId));
  const total        = del.length;
  const presentes    = del.filter(s => s.asistencia?.[jugadorId] === "presente").length;
  const justificadas = del.filter(s =>
    ["lesionado", "seleccion", "permiso"].includes(s.asistencia?.[jugadorId])
  ).length;
  const denominador  = total - justificadas;
  const pct = denominador > 0 ? Math.round((presentes / denominador) * 100) : null;
  return { total, presentes, justificadas, pct };
};
