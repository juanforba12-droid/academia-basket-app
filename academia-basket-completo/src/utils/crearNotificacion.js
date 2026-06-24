import {
  collection, getDocs, query,
  where, writeBatch, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";

// Tipos de notificación y sus iconos
const ICONOS = {
  documento: "📄",
  contacto:  "📩",
  noticia:   "📰",
  foro:      "💬",
  sesion:    "🏋️",
  partido:   "🏀",
  sistema:   "⚙️",
};

/**
 * Crea notificaciones para uno o varios usuarios.
 *
 * @param {object} params
 * @param {string} params.tipo         - Tipo de notificación
 * @param {string} params.titulo       - Título corto
 * @param {string} params.mensaje      - Descripción
 * @param {string} params.link         - Ruta de la app al hacer clic
 * @param {string[]} [params.usuarioIds]  - UIDs concretos (opcional)
 * @param {string[]} [params.roles]       - Notificar a todos los de estos roles
 * @param {boolean} [params.soloAdmins]   - true = solo admins (defecto si no hay nada)
 */
export async function crearNotificacion({
  tipo,
  titulo,
  mensaje,
  link = "/",
  usuarioIds,
  roles,
  soloAdmins = false,
}) {
  try {
    let destinatarios = usuarioIds || [];

    // Si no se pasaron UIDs concretos, buscar por rol o todos los admins
    if (!destinatarios.length) {
      const rolesDestino = (roles && roles.length > 0)
        ? roles
        : (soloAdmins ? ["admin"] : ["admin"]);

      // Guard: Firestore where("in") falla con array vacío
      if (!rolesDestino.length) return;

      const snap = await getDocs(
        query(
          collection(db, "usuarios"),
          where("rol", "in", rolesDestino)
          // No usar where("activo","!=",false) — requiere índice compuesto
          // Filtramos activos en cliente:
        )
      );
      destinatarios = snap.docs
        .filter(d => d.data().activo !== false)
        .map(d => d.id);
    }

    if (!destinatarios.length) return;

    // Usar writeBatch para eficiencia (máx 500 por batch)
    const chunks = [];
    for (let i = 0; i < destinatarios.length; i += 499) {
      chunks.push(destinatarios.slice(i, i + 499));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(uid => {
        const ref = doc(collection(db, "notificaciones"));
        batch.set(ref, {
          usuarioId:  uid,
          tipo,
          icono:      ICONOS[tipo] || "🔔",
          titulo,
          mensaje,
          link,
          leida:      false,
          fecha:      new Date().toISOString().split("T")[0],
          createdAt:  serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    // No bloquear el flujo principal si falla la notificación
    console.error("Error creando notificación:", error);
  }
}

/**
 * Notificar a todos los usuarios activos (para noticias y foro).
 */
export async function notificarATodos({ tipo, titulo, mensaje, link }) {
  try {
    const snap = await getDocs(
      query(collection(db, "usuarios"), where("activo", "!=", false))
    );
    const todos = snap.docs.map(d => d.id);
    await crearNotificacion({ tipo, titulo, mensaje, link, usuarioIds: todos });
  } catch (error) {
    console.error("Error notificando a todos:", error);
  }
}
