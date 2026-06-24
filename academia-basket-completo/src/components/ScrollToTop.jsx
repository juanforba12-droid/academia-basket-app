import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hace scroll al top en cada cambio de ruta.
 * Colócalo dentro de BrowserRouter, encima de las Routes.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
