import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export function useTemporada() {
  const [temporada, setTemporada] = useState("2026-2027");

  useEffect(() => {
    getDoc(doc(db, "config", "temporada_activa"))
      .then(snap => {
        if (snap.exists()) setTemporada(snap.data().temporada || "2026-2027");
      })
      .catch(() => {}); // silencioso
  }, []);

  return temporada;
}
