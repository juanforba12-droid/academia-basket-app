import { useEffect, useRef, useCallback } from "react";

/**
 * Devuelve una función isMounted() que retorna true
 * mientras el componente sigue montado.
 * Úsala antes de setStates en operaciones async.
 */
export function useIsMounted() {
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  return useCallback(() => mounted.current, []);
}
