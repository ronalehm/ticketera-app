"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

type ObjectUrlEntry = { file: File; url: string };

const getServerSnapshot = () => null;

/**
 * Devuelve una URL `blob:` local para `file` (o `null` si no hay archivo).
 *
 * La URL es un recurso externo: se crea al suscribirse y se revoca al
 * desuscribirse (mismo ciclo de efecto), así que funciona en StrictMode y se
 * revoca la anterior al cambiar de archivo y la actual al desmontar.
 */
export function useObjectUrl(file: File | null): string | null {
  const entryRef = useRef<ObjectUrlEntry | null>(null);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!file) return () => {};
      const url = URL.createObjectURL(file);
      entryRef.current = { file, url };
      onChange();
      return () => {
        URL.revokeObjectURL(url);
        if (entryRef.current?.url === url) entryRef.current = null;
      };
    },
    [file],
  );

  // Solo devuelve la URL del archivo actual: nunca una ya revocada.
  const getSnapshot = () => {
    const entry = entryRef.current;
    return entry && entry.file === file ? entry.url : null;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
