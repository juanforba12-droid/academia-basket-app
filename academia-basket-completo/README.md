# 🏀 Academia Internacional de Básquet — App de Gestión

Plataforma web de gestión integral para la Academia Internacional de Básquet de Castellón.
Desarrollada en React + Firebase, desplegada en Vercel.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite |
| Base de datos | Firebase Firestore |
| Autenticación | Firebase Auth (Google) |
| Almacenamiento | Firebase Storage |
| Deploy | Vercel (auto desde GitHub) |
| Estilos | CSS puro (sin frameworks) |

---

## Estructura del proyecto

```
academia-basket-app/
├── public/
│   ├── icons/           → Iconos PWA (192x192, 512x512)
│   └── og-image.png     → Imagen para redes sociales (1200x630)
├── src/
│   ├── components/      → Componentes reutilizables
│   │   ├── AlertasVisados.jsx
│   │   ├── HiloForo.jsx
│   │   ├── Notificaciones.jsx
│   │   ├── RutaProtegida.jsx
│   │   ├── SliderMovil.jsx
│   │   ├── SplashScreen.jsx
│   │   ├── TabDeportivo.jsx
│   │   ├── TabFamilia.jsx
│   │   └── TabAcademico.jsx
│   ├── context/
│   │   └── AuthContext.jsx   → Usuario, perfil, login, logout
│   ├── firebase/
│   │   └── config.js         → Inicialización Firebase (usa .env)
│   ├── hooks/
│   │   ├── useConexion.js     → Detecta si hay internet
│   │   └── useNotificaciones.js → Notificaciones en tiempo real
│   ├── pages/               → Una página por ruta
│   │   ├── Ajustes.jsx
│   │   ├── Calendario.jsx
│   │   ├── Contactos.jsx
│   │   ├── Dashboard.jsx
│   │   ├── FichaJugador.jsx
│   │   ├── Foro.jsx
│   │   ├── Galeria.jsx
│   │   ├── GestionUsuarios.jsx
│   │   ├── Jugadores.jsx
│   │   ├── Login.jsx
│   │   ├── NotFound.jsx
│   │   ├── Noticias.jsx
│   │   ├── NuevoJugador.jsx
│   │   ├── NuevoPartido.jsx
│   │   ├── NuevaSesion.jsx
│   │   ├── PerfilJugador.jsx
│   │   ├── PortalFamilia.jsx
│   │   ├── Publica.jsx
│   │   ├── Registro.jsx
│   │   ├── SinAcceso.jsx
│   │   └── TodasNotificaciones.jsx
│   ├── utils/
│   │   ├── crearNotificacion.js  → Helper para crear notificaciones
│   │   └── helpers.js            → Normalizar, fechas, asistencia, vídeo
│   ├── App.jsx              → Rutas + Layout
│   ├── App.css              → Estilos globales + responsive
│   └── main.jsx
├── .env.example             → Variables de entorno (copiar como .env)
├── .gitignore
├── firestore.rules          → Reglas de seguridad Firestore
├── storage.rules            → Reglas de seguridad Storage
├── vercel.json              → Rewrites para React Router
└── vite.config.js
```

---

## Roles de usuario

| Rol | Acceso |
|---|---|
| `admin` | Todo. Gestión de usuarios, ajustes, documentación |
| `entrenador` | Módulos deportivos, noticias, foro |
| `jugador` | Su propio perfil, noticias, foro |
| `familia` | Portal familiar: ficha del jugador, docs, deportivo |

Los roles se asignan automáticamente al registrarse con un código secreto.
Los códigos se gestionan desde `/ajustes` (solo admin).

---

## Colecciones Firestore

| Colección | Descripción |
|---|---|
| `/usuarios/{uid}` | Perfil de cada usuario (rol, nombre, jugadorId...) |
| `/jugadores/{id}` | Ficha completa del jugador |
| `/sesiones/{id}` | Entrenamientos con asistencia por jugador |
| `/partidos/{id}` | Resultados y estadísticas individuales |
| `/evaluaciones/{id}` | Evaluaciones deportivas periódicas |
| `/noticias/{id}` | Noticias publicadas por staff |
| `/foro_hilos/{id}` | Hilos del foro |
| `/foro_respuestas/{id}` | Respuestas a hilos |
| `/notificaciones/{id}` | Notificaciones por usuario (tiempo real) |
| `/galeria/{id}` | Fotos de la academia |
| `/calendario/{id}` | Eventos del calendario |
| `/contacto/{id}` | Mensajes del formulario público |
| `/doc_historial/{id}` | Historial de cambios en documentación |
| `/config/codigos` | Códigos de acceso por rol |
| `/config/temporada_activa` | Temporada en curso |

---

## Setup inicial

### 1. Clonar e instalar
```bash
git clone https://github.com/tuusuario/academia-basket-app
cd academia-basket-app
npm install
```

### 2. Variables de entorno
```bash
cp .env.example .env
# Editar .env con las credenciales de Firebase Console
```

### 3. Firebase Console — configuración inicial
- Authentication → Sign-in method → habilitar **Google**
- Firestore → crear base de datos → pegar `firestore.rules`
- Storage → crear bucket → pegar `storage.rules`
- Crear documento `/config/codigos` en Firestore:
  ```json
  {
    "admin": "CODIGO_ADMIN_SECRETO",
    "entrenador": "CODIGO_ENTRENADOR",
    "jugador": "CODIGO_JUGADOR",
    "familia": "CODIGO_FAMILIA"
  }
  ```
- Crear documento `/config/temporada_activa`:
  ```json
  { "temporada": "2026-2027" }
  ```

### 4. Arrancar en local
```bash
npm run dev
```

### 5. Deploy en Vercel
- Conectar repo en vercel.com
- Añadir las 6 variables de entorno en Settings → Environment Variables
- Push a `main` → deploy automático

---

## Workflow de desarrollo

```
1. Editar código en GitHub Codespaces
2. npm run dev → probar en local
3. git add . && git commit -m "descripción"
4. git push → Vercel despliega automáticamente
5. Verificar en la URL de producción
```

---

## Backup

Desde `/ajustes` → botón "Exportar backup completo" → descarga JSON con todos los datos.
**Recomendado: hacer backup semanal y guardar en Google Drive.**

---

## Migración futura a App Store

El stack está preparado para migrar a React Native:
- Toda la lógica Firebase se reutiliza sin cambios
- Los componentes de UI se reescriben en React Native
- Auth, Firestore, Storage: misma API

---

## Contacto

Desarrollado por Juan Fortuño Baamonde para CD La Magdalena / Academia Internacional de Básquet.
