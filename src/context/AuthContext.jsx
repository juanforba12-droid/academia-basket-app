import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext   = createContext(null);
const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [perfil,      setPerfil]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          setPerfil(snap.exists() ? snap.data() : null);
        } catch {
          setPerfil(null);
        }
      } else {
        setUser(null);
        setPerfil(null);
      }
      setLoading(false);
      setInitialized(true);
    });
    return unsub;
  }, []);

  // ── Login con Google ──────────────────────────────────────
  const loginGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const snap   = await getDoc(doc(db, "usuarios", result.user.uid));
    return {
      firebaseUser:       result.user,
      tienePerfilCompleto: snap.exists(),
    };
  };

  // ── Completar perfil al registrarse ──────────────────────
  const completarPerfil = async (uid, nombre, apellidos, codigo) => {
    // Validación básica del código
    if (!codigo || !codigo.trim()) {
      throw new Error("Código incorrecto");
    }

    // Leer códigos desde Firestore
    const configSnap = await getDoc(doc(db, "config", "codigos"));
    if (!configSnap.exists()) {
      throw new Error("La app no está configurada. Contacta con el administrador.");
    }

    const codigos = configSnap.data();

    // Verificar que los códigos no estén vacíos
    const rolMap = {};
    Object.entries(codigos).forEach(([rol, cod]) => {
      if (cod && cod.trim().length >= 4) {
        rolMap[cod.trim()] = rol;
      }
    });

    const rol = rolMap[codigo.trim()];
    if (!rol) throw new Error("Código incorrecto");

    // Verificar que no tenga ya perfil (protección doble registro)
    const existente = await getDoc(doc(db, "usuarios", uid));
    if (existente.exists()) {
      // Ya tiene perfil, devolver el existente
      setPerfil(existente.data());
      return existente.data().rol;
    }

    const perfilData = {
      nombre:    nombre.trim(),
      apellidos: apellidos.trim(),
      rol,
      email:     auth.currentUser?.email || "",
      activo:    true,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "usuarios", uid), perfilData);
    setPerfil(perfilData);
    return rol;
  };

  // ── Logout limpio ─────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setPerfil(null);
    // Limpiar historial para evitar flash de contenido privado
    window.history.replaceState(null, "", "/login");
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{
      user, perfil, loading, initialized,
      loginGoogle, completarPerfil, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
