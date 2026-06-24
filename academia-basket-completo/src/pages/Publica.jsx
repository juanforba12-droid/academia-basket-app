import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc,
  orderBy, query, limit, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useNavigate } from "react-router-dom";

const PROGRAMAS = [
  { icon: "🏀", titulo: "Gap Year",           duracion: "10 meses",
    desc: "Programa completo de inmersión deportiva y cultural. Entrenamiento de alto rendimiento, formación académica y experiencia internacional en Castellón." },
  { icon: "🎓", titulo: "Academic + Athletic", duracion: "Curso completo",
    desc: "Combina estudios universitarios en la Universitat Jaume I con entrenamiento de alto rendimiento." },
  { icon: "📅", titulo: "Semestral",           duracion: "4 – 6 meses",
    desc: "Disponible septiembre–diciembre o enero–junio. Ideal para jugadores que buscan una experiencia internacional intensiva." },
  { icon: "☀️", titulo: "Summer Program",      duracion: "2 – 8 semanas",
    desc: "Tecnificación intensiva durante el verano. Perfecto para mejorar el nivel técnico en un entorno profesional." },
];

export default function Publica() {
  const navigate = useNavigate();
  const [noticias, setNoticias] = useState([]);
  const [form,     setForm]     = useState({ nombre: "", email: "", pais: "", mensaje: "" });
  const [enviado,  setEnviado]  = useState(false);
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    // Meta tags SEO
    document.title = "Academia Internacional de Básquet | Castellón";

    getDocs(query(
      collection(db, "noticias"),
      orderBy("createdAt", "desc"),
      limit(3)
    )).then(snap =>
      setNoticias(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    ).catch(() => {});
  }, []);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEnviar = async () => {
    if (!form.nombre.trim() || !form.email.trim() || !form.mensaje.trim()) {
      return setError("Nombre, email y mensaje son obligatorios");
    }
    if (!isValidEmail(form.email)) {
      return setError("El email no tiene un formato válido");
    }
    setSending(true);
    setError("");
    try {
      await addDoc(collection(db, "contacto"), {
        ...form,
        fecha:     new Date().toISOString().split("T")[0],
        leido:     false,
        createdAt: serverTimestamp(),
      });
      setEnviado(true);
    } catch {
      setError("Error al enviar. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      background: "#0f1f17", minHeight: "100vh",
      color: "#e8e8e8", fontFamily: "Inter, system-ui, sans-serif"
    }}>
      {/* NAV */}
      <nav style={{
        background: "#132d1e", borderBottom: "1px solid #1e4030",
        padding: "0 24px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
        height: "60px", position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "26px" }}>🏀</span>
          <div>
            <div style={{ color: "#fff", fontWeight: "700", fontSize: "15px" }}>
              Academia Basket
            </div>
            <div style={{ color: "#4a7a60", fontSize: "11px" }}>
              Castellón, España
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <a href="#programas" style={{ color: "#ccc", textDecoration: "none", fontSize: "14px",
            display: window.innerWidth < 480 ? "none" : "inline" }}>Programas</a>
          <a href="#noticias"  style={{ color: "#ccc", textDecoration: "none", fontSize: "14px",
            display: window.innerWidth < 480 ? "none" : "inline" }}>Noticias</a>
          <a href="#contacto"  style={{ color: "#ccc", textDecoration: "none", fontSize: "14px",
            display: window.innerWidth < 480 ? "none" : "inline" }}>Contacto</a>
          <button onClick={() => navigate("/login")}
            style={{
              background: "#1a7a4a", color: "#fff", border: "none",
              borderRadius: "8px", padding: "8px 16px", fontSize: "14px",
              fontWeight: "600", cursor: "pointer"
            }}>
            Acceso miembros
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        background: "linear-gradient(135deg, #0f1f17 0%, #1a3326 50%, #0f2a1a 100%)",
        padding: "80px 24px", textAlign: "center"
      }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{
            display: "inline-block", background: "#1e4030",
            borderRadius: "20px", padding: "5px 16px",
            fontSize: "13px", color: "#6ab88a", marginBottom: "20px"
          }}>
            Castellón · España · Internacional
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 52px)", fontWeight: "800",
            color: "#fff", lineHeight: "1.2", marginBottom: "20px"
          }}>
            Forma parte de la<br />
            <span style={{ color: "#f97316" }}>Academia Internacional</span><br />
            de Básquet
          </h1>
          <p style={{
            fontSize: "17px", color: "#7aaa8a",
            lineHeight: "1.7", marginBottom: "32px"
          }}>
            Entrenamiento de alto rendimiento, formación académica
            y experiencia cultural en el Mediterráneo.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#programas" style={{
              background: "#1a7a4a", color: "#fff", textDecoration: "none",
              borderRadius: "10px", padding: "12px 28px",
              fontSize: "15px", fontWeight: "700"
            }}>Ver programas</a>
            <a href="#contacto" style={{
              background: "transparent", color: "#fff", textDecoration: "none",
              borderRadius: "10px", padding: "12px 28px",
              fontSize: "15px", fontWeight: "600",
              border: "1px solid #1e4030"
            }}>Contactar</a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{
        background: "#132d1e", borderTop: "1px solid #1e4030",
        borderBottom: "1px solid #1e4030", padding: "28px 24px"
      }}>
        <div style={{
          maxWidth: "800px", margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px", textAlign: "center"
        }}>
          {[
            { num: "4",    label: "Programas" },
            { num: "10+",  label: "Nacionalidades" },
            { num: "12",   label: "Meses de temporada" },
            { num: "100%", label: "Experiencia internacional" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: "30px", fontWeight: "800", color: "#f97316" }}>
                {s.num}
              </div>
              <div style={{ fontSize: "13px", color: "#4a7a60", marginTop: "4px" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PROGRAMAS */}
      <section id="programas" style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "30px", fontWeight: "800", color: "#fff" }}>
              Nuestros programas
            </h2>
            <p style={{ color: "#4a7a60", marginTop: "8px" }}>
              Elige el programa que mejor se adapta a tus objetivos
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px"
          }}>
            {PROGRAMAS.map(p => (
              <div key={p.titulo} style={{
                background: "#132d1e", border: "1px solid #1e4030",
                borderRadius: "12px", padding: "24px"
              }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>{p.icon}</div>
                <div style={{
                  color: "#f97316", fontSize: "12px",
                  fontWeight: "600", marginBottom: "6px"
                }}>
                  {p.duracion}
                </div>
                <h3 style={{
                  color: "#fff", fontSize: "17px",
                  fontWeight: "700", marginBottom: "10px"
                }}>
                  {p.titulo}
                </h3>
                <p style={{ color: "#7aaa8a", fontSize: "14px", lineHeight: "1.6" }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOTICIAS */}
      <section id="noticias" style={{
        padding: "64px 24px",
        background: "#0a1a10",
        borderTop: "1px solid #1e4030",
        borderBottom: "1px solid #1e4030"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <h2 style={{ fontSize: "30px", fontWeight: "800", color: "#fff" }}>
              Últimas noticias
            </h2>
          </div>
          {noticias.length === 0 ? (
            <p style={{ color: "#4a7a60", textAlign: "center" }}>
              Próximamente...
            </p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px"
            }}>
              {noticias.map(n => (
                <div key={n.id} style={{
                  background: "#132d1e", border: "1px solid #1e4030",
                  borderRadius: "12px", overflow: "hidden"
                }}>
                  {n.fotoUrl && (
                    <img loading="lazy" src={n.fotoUrl} alt={n.titulo}
                      style={{
                        width: "100%", height: "160px", objectFit: "cover"
                      }}
                      onError={e => { e.target.style.display = "none"; }}
                    />
                  )}
                  <div style={{ padding: "16px" }}>
                    <div style={{
                      color: "#4a7a60", fontSize: "12px", marginBottom: "6px"
                    }}>
                      {n.fecha}
                    </div>
                    <h3 style={{
                      color: "#fff", fontSize: "15px",
                      fontWeight: "700", marginBottom: "8px"
                    }}>
                      {n.titulo}
                    </h3>
                    <p style={{
                      color: "#7aaa8a", fontSize: "13px", lineHeight: "1.5",
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 3, WebkitBoxOrient: "vertical"
                    }}>
                      {n.contenido}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" style={{
        padding: "64px 24px", maxWidth: "560px", margin: "0 auto"
      }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontSize: "30px", fontWeight: "800", color: "#fff" }}>
            Contacta con nosotros
          </h2>
          <p style={{ color: "#4a7a60", marginTop: "8px" }}>
            ¿Interesado en algún programa? Cuéntanos tu caso.
          </p>
        </div>

        {enviado ? (
          <div style={{
            background: "#132d1e", border: "1px solid #1e4030",
            borderRadius: "16px", padding: "40px", textAlign: "center"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
            <h3 style={{ color: "#fff", fontSize: "20px", marginBottom: "8px" }}>
              ¡Mensaje enviado!
            </h3>
            <p style={{ color: "#4a7a60" }}>
              Nos pondremos en contacto contigo pronto.
            </p>
          </div>
        ) : (
          <div style={{
            background: "#132d1e", border: "1px solid #1e4030",
            borderRadius: "16px", padding: "28px"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { key: "nombre",   label: "Nombre completo", placeholder: "Tu nombre",      type: "text" },
                { key: "email",    label: "Email",           placeholder: "tu@email.com",    type: "email" },
                { key: "pais",     label: "País de origen",  placeholder: "Ej: USA, Brasil", type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{
                    color: "#4a7a60", fontSize: "13px",
                    display: "block", marginBottom: "6px"
                  }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    placeholder={f.placeholder}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label style={{
                  color: "#4a7a60", fontSize: "13px",
                  display: "block", marginBottom: "6px"
                }}>
                  Mensaje
                </label>
                <textarea
                  value={form.mensaje}
                  placeholder="Cuéntanos tus objetivos..."
                  rows="4"
                  maxLength={1000}
                  onChange={e => setForm(v => ({ ...v, mensaje: e.target.value }))}
                />
              </div>
              {error && (
                <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>
                  {error}
                </p>
              )}
              <button
                onClick={handleEnviar}
                disabled={sending}
                style={{
                  background: "#1a7a4a", color: "#fff", border: "none",
                  borderRadius: "8px", padding: "13px", fontSize: "15px",
                  fontWeight: "700", cursor: "pointer",
                  opacity: sending ? 0.7 : 1
                }}>
                {sending ? "Enviando..." : "Enviar mensaje"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{
        background: "#132d1e", borderTop: "1px solid #1e4030",
        padding: "20px 24px", textAlign: "center"
      }}>
        <p style={{ color: "#4a7a60", fontSize: "13px" }}>
          🏀 Academia Internacional de Básquet · Castellón, España
        </p>
        <div style={{ marginTop: "8px", display: "flex", gap: "16px", justifyContent: "center" }}>
          <button onClick={() => navigate("/login")}
            style={{
              background: "none", border: "none",
              color: "#4a7a60", fontSize: "12px", cursor: "pointer"
            }}>
            Acceso miembros
          </button>
        </div>
      </footer>
    </div>
  );
}
