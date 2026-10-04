// Descarga de archivos generados en el navegador.

/** Margen antes de liberar la URL del blob: WebKit procesa la descarga después del clic (ver FileSaver.js). */
export const OBJECT_URL_REVOKE_DELAY_MS = 40_000;

/** Descarga `blob` con el nombre `fileName` mediante un enlace temporal. */
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
}
