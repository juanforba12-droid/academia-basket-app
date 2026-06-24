/**
 * Sanitiza un nombre de archivo para Firebase Storage.
 * Elimina espacios, caracteres especiales y acentos.
 * Conserva la extensión original.
 */
export function sanitizarNombreArchivo(nombre) {
  const ext   = nombre.split(".").pop().toLowerCase();
  const base  = nombre
    .split(".").slice(0, -1).join(".")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // quitar acentos
    .replace(/[^a-zA-Z0-9_-]/g, "_") // reemplazar caracteres especiales
    .replace(/_+/g, "_")              // colapsar guiones bajos múltiples
    .slice(0, 60);                    // límite de longitud
  return `${base}.${ext}`;
}

/**
 * Genera una ruta única para Storage evitando colisiones.
 * Formato: carpeta/timestamp_nombre-sanitizado.ext
 */
export function storagePath(carpeta, archivo) {
  const nombreSanitizado = sanitizarNombreArchivo(archivo.name);
  return `${carpeta}/${Date.now()}_${nombreSanitizado}`;
}
