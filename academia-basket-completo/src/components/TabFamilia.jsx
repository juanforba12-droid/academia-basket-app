import { useIsMounted } from "../hooks/useIsMounted.js";
import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import { useEffect, useState } from "react";
import {
  collection, getDocs, query, where,
  doc, updateDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import { db } from "../firebase/config";

export default function TabFamilia({ jugador }) {
  const toast = useToast();
  const isMounted = useIsMounted();
  const confirm = useConfirm();
  const [familias,      setFamilias]      = useState([]);
  const [todasFamilias, setTodasFamilias] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(null);

  useEffect(() => {
    const fetch = async () => {
      // Sin filtro "activo" para evitar índice compuesto en Firestore
      // Filtramos en cliente
      const snap = await getDocs(query(
        collection(db, "usuarios"),
        where("rol", "==", "familia")
      ));
      const todas = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(f => f.activo !== false); // filtro en cliente
            if (!isMounted()) return;
      setTodasFamilias(todas);
      setFamilias(todas.filter(f =>
        jugador.familiasIds?.includes(f.uid)
      ));
      setLoading(false);
    };
    fetch();
  }, [jugador]);

  const vincular = async (familia) => {
    setSaving(familia.uid);
    try {
      await updateDoc(doc(db, "jugadores", jugador.id), {
        familiasIds: arrayUnion(familia.uid)
      });
      await updateDoc(doc(db, "usuarios", familia.uid), {
        jugadoresIds: arrayUnion(jugador.id)
      });
      setFamilias(f => [...f, familia]);
    } catch { toast.error("Error al vincular."); }
    finally { setSaving(null); }
  };

  const desvincular = async (familia) => {
    const ok = await confirm(`¿Desvincular a ${familia.nombre} ${familia.apellidos}?`, { tipo: "danger", textoOk: "Desvincular" });
    if (!ok) return;
    
    setSaving(familia.uid);
    try {
      await updateDoc(doc(db, "jugadores", jugador.id), {
        familiasIds: arrayRemove(familia.uid)
      });
      await updateDoc(doc(db, "usuarios", familia.uid), {
        jugadoresIds: arrayRemove(jugador.id)
      });
      setFamilias(f => f.filter(x => x.uid !== familia.uid));
    } catch { toast.error("Error al desvincular."); }
    finally { setSaving(null); }
  };

  const noVinculadas = todasFamilias.filter(
    f => !familias.find(x => x.uid === f.uid)
  );

  if (loading) return <p style={{ color: "#666", padding: "20px" }}>Cargando...</p>;

  return (
    <div className="card">
      <h3 style={{ color: "#fff", fontSize: "15px", marginBottom: "16px" }}>Familias vinculadas</h3>

      {familias.length > 0 && (
        <div style={{ background: "#1a1000", border: "1px solid #f97316",
          borderRadius: "8px", padding: "8px 14px", marginBottom: "14px",
          fontSize: "13px", color: "#fbbf24" }}>
          ⚠️ {familias.length} familia{familias.length > 1 ? "s" : ""} vinculada{familias.length > 1 ? "s" : ""}.
          Añadir más puede ser intencional (padres separados) o un error.
        </div>
      )}

      {familias.length === 0 ? (
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>Sin familias vinculadas.</p>
      ) : (
        <div style={{ marginBottom: "20px" }}>
          {familias.map(f => (
            <div key={f.uid} style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1e4030" }}>
              <div>
                <span style={{ color: "#fff", fontSize: "14px" }}>{f.nombre} {f.apellidos}</span>
                <span style={{ color: "#4a7a60", fontSize: "12px", marginLeft: "8px" }}>{f.email}</span>
              </div>
              <button disabled={saving === f.uid} onClick={() => desvincular(f)}
                style={{ background: "#200a0a", color: "#f87171", border: "1px solid #3a1515",
                  borderRadius: "6px", padding: "4px 10px", fontSize: "12px", cursor: "pointer",
                  opacity: saving === f.uid ? 0.5 : 1 }}>
                {saving === f.uid ? "..." : "Desvincular"}
              </button>
            </div>
          ))}
        </div>
      )}

      {noVinculadas.length > 0 && (
        <>
          <h4 style={{ color: "#4a7a60", fontSize: "13px", marginBottom: "10px", fontWeight: "600" }}>
            Vincular familia
          </h4>
          {noVinculadas.map(f => (
            <div key={f.uid} style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0f1a10" }}>
              <div>
                <span style={{ color: "#888", fontSize: "14px" }}>{f.nombre} {f.apellidos}</span>
                <span style={{ color: "#4a7a60", fontSize: "12px", marginLeft: "8px" }}>{f.email}</span>
              </div>
              <button disabled={saving === f.uid} onClick={() => vincular(f)}
                style={{ background: "#1a7a4a", color: "#fff", border: "none",
                  borderRadius: "6px", padding: "4px 12px", fontSize: "12px", cursor: "pointer",
                  opacity: saving === f.uid ? 0.5 : 1 }}>
                {saving === f.uid ? "..." : "Vincular"}
              </button>
            </div>
          ))}
        </>
      )}

      {noVinculadas.length === 0 && familias.length === 0 && (
        <p style={{ color: "#666", fontSize: "13px" }}>
          No hay usuarios con rol "familia" registrados.
        </p>
      )}
    </div>
  );
}
