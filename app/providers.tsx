"use client";

import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Providers de cliente de la app. Un `QueryClient` por cliente (y por render en el servidor), creado una sola vez.
 * Debe ir dentro de `ClerkProvider` (app/layout.tsx).
 */
export function Providers({ children }: { children: ReactNode }) {
  // staleTime: los datos iniciales que llegan del servidor no se vuelven a pedir nada más hidratar.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  useClearCacheOnUserChange(queryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Vacía la caché cuando cambia el usuario de Clerk (otra cuenta o cierre de sesión): el `QueryClient` sobrevive a
 * signOut/signIn en la misma pestaña. Defensa en profundidad; las query keys con datos de usuario ya incluyen su id.
 * No limpia al montar ni mientras Clerk carga (`userId` undefined), solo al pasar de un usuario conocido a otro o a null.
 */
function useClearCacheOnUserChange(queryClient: QueryClient) {
  const { isLoaded, userId } = useAuth();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    const current = userId ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== current) queryClient.clear();
    previousUserId.current = current;
  }, [isLoaded, userId, queryClient]);
}
