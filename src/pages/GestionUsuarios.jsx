import { useToast } from "../components/Toast.jsx";
import { useEffect, useState } from "react";
import {
  collection, getDocs, query, orderBy,
  doc, updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { normalizar } from "../utils/helpers";

const ROLES = ["admin", "entrenador", "jugador", "familia"];

const ROL_BADGE = {
  admin:      { bg: "#1a1000", color: "#f97316" },
  entrenador: { bg: "#0a1a10", color: "#4ade80" },
  jugador:    { bg: "#0a0f1a", color: "#60a5fa" },
  familia:    { bg: "#1a0a1a", color: "#c084fc" },
};

export default function GestionUsuarios() {
  const { user: currentUser }         = useAuth();
  const toast = useToast();
  const [usuarios,  setUsuarios]      = useState([]);
  const [loading,   setLoading]       = useState(true);
  const [busqueda,  setBusqueda]      = useState("");
  const [filtroRol, setFiltroRol]     = useState("todos");
  const [saving,    setSaving]        = useState(null);

  useEffect(() => {
    // Sin filtro where("activo","!=",false) para evitar requerir índice compuesto
    // Filtramos en cliente
    getDocs(query(collection(db, "usuarios"), orderBy("rol")))
      .then(snap => {
        setUsuarios(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        setLoading(false);
      })
      .catch(e => {
        console.error("GestionUsuarios:", e);
        setLoading(false);
      });
  }, []);

  const toggleActivo = async (uid, activo) => {
    if (uid === currentUser?.uid) return toast.warning("No puedes desactivar tu propia cuenta.");
    setSaving(uid);
    try {
      await updateDoc(doc(db, "usuarios", uid), { activo: !activo });
      setUsuarios(u => u.map(usr =>
        usr.uid === uid ? { ...usr, activo: !activo } : usr
      ));
    } catch { toast.error("Error. Inténtalo de nuevo."); }
    finally { setSaving(null); }
  };

  const cambiarRol = async (uid, nuevoRol) => {
    if (uid === currentUser?.uid) return toast.warning("No puedes cambiar tu propio rol.");
    setSaving(uid);
    try {
      await updateDoc(doc(db, "usuarios", uid), { rol: nuevoRol });
      setUsuarios(u => u.map(usr =>
        usr.uid === uid ? { ...usr, rol: nuevoRol } : usr
      ));
    } catch { toast.error("Error. Inténtalo de nuevo."); }
    finally { setSaving(null); }
  };

  const usuariosFiltrados = usuarios
    .filter(u => filtroRol === "todos" || u.rol === filtroRol)
    .filter(u =>
      normalizar(`${u.nombre} ${u.apellidos} ${u.email}`)
        .includes(normalizar(busqueda))
    );

  const activos   = usuarios.filter(u => u.activo !== false).length;
  const inactivos = usuarios.filter(u => u.activo === false).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Gestión de usuarios</div>
          <div className="page-subtitle">
            {activos} activos · {inactivos} inactivos
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o email..." style={{ flex: 1, minWidth: "200px" }} />
        <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
          <option value="todos">Todos los roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <p style={{ color: "#666", padding: "24px" }}>Cargando...</p>
        ) : usuariosFiltrados.length === 0 ? (
          <p style={{ color: "#666", padding: "24px" }}>Sin resultados.</p>
        ) : (
          <table className="players-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map(u => {
                const esMiCuenta = u.uid === currentUser?.uid;
                const activo     = u.activo !== false;
                const badge      = ROL_BADGE[u.rol] || ROL_BADGE.jugador;
                const isSaving   = saving === u.uid;
                return (
                  <tr key={u.uid} style={{ opacity: activo ? 1 : 0.5 }}>
                    <td>
                      <div style={{ color: "#fff", fontWeight: "600", fontSize: "14px",
                        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "180px" }}>
                        {u.nombre} {u.apellidos}
                        {esMiCuenta && <span style={{ color: "#4a7a60", fontSize: "11px", marginLeft: "6px" }}>(tú)</span>}
                      </div>
                      <div style={{ color: "#4a7a60", fontSize: "12px", marginTop: "2px",
                        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "180px" }}>
                        {u.email}
                      </div>
                    </td>
                    <td>
                      {esMiCuenta ? (
                        <span style={{ background: badge.bg, color: badge.color,
                          borderRadius: "4px", padding: "3px 8px", fontSize: "12px", fontWeight: "600" }}>
                          {u.rol}
                        </span>
                      ) : (
                        <select value={u.rol} disabled={isSaving}
                          onChange={e => cambiarRol(u.uid, e.target.value)}
                          style={{ background: badge.bg, border: `1px solid ${badge.color}40`,
                            borderRadius: "6px", padding: "4px 8px", color: badge.color,
                            fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${activo ? "badge-activo" : "badge-inactivo"}`}>
                        {activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      {!esMiCuenta && (
                        <button disabled={isSaving}
                          onClick={() => toggleActivo(u.uid, activo)}
                          className={`btn ${activo ? "btn-danger" : "btn-primary"}`}
                          style={{ fontSize: "12px", padding: "5px 12px", opacity: isSaving ? 0.6 : 1 }}>
                          {isSaving ? "..." : activo ? "Desactivar" : "Activar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ color: "#2a5a3a", fontSize: "12px", marginTop: "10px" }}>
        ⚠️ Desactivar impide el acceso sin eliminar datos.
      </p>
    </div>
  );
}
