"use client";

import { useEffect, useState } from "react";

type ObjectUrlState = { file: File; url: string } | null;

/**
 * Devuelve una URL `blob:` local para `file` (o `null`).
 * La URL se crea y se revoca dentro del mismo efecto, así que funciona en
 * StrictMode y se revoca al cambiar de archivo y al desmontar.
 */
export function useObjectUrl(file: File | null): string | null {
  const [state, setState] = useState<ObjectUrlState>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Sincroniza el estado con un recurso externo (la URL del navegador).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Evita devolver una URL ya revocada mientras el efecto del archivo nuevo no ha corrido.
  return state && state.file === file ? state.url : null;
}
