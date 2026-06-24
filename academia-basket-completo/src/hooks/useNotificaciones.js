import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy,
  onSnapshot, updateDoc, doc, writeBatch, limit
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export function useNotificaciones() {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);

  useEffect(() => {
    // Sin usuario: limpiar y salir
    if (!user) {
      setNotificaciones([]);
      return;
    }

    const q = query(
      collection(db, "notificaciones"),
      where("usuarioId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50) // evita cargar historial completo
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotificaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      // Error silencioso — puede pasar al cerrar sesión
      console.warn("useNotificaciones:", error.code);
    });

    return unsub; // cleanup siempre
  }, [user]);

  const marcarLeida = async (id) => {
    try {
      await updateDoc(doc(db, "notificaciones", id), { leida: true });
    } catch (e) {
      console.warn("marcarLeida:", e);
    }
  };

  const marcarTodasLeidas = async () => {
    const pendientes = notificaciones.filter(n => !n.leida);
    if (!pendientes.length) return;
    try {
      const batch = writeBatch(db);
      pendientes.forEach(n =>
        batch.update(doc(db, "notificaciones", n.id), { leida: true })
      );
      await batch.commit();
    } catch (e) {
      console.warn("marcarTodasLeidas:", e);
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas };
}
