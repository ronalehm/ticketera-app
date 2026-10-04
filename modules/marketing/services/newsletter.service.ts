// Mock por ahora: se reemplazará por la llamada a la API sin cambiar la firma.
// No hace peticiones de red ni guarda el correo.
export const MOCK_LATENCY_MS = 600;

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

export async function subscribeToNewsletter(email: string): Promise<void> {
  void email; // la API real lo enviará; el mock solo simula la latencia
  await wait();
}
