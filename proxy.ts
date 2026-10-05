import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/perfil(.*)", "/mis-entradas(.*)", "/organizador(.*)", "/admin(.*)"]);

// Solo exige sesión (redirige a NEXT_PUBLIC_CLERK_SIGN_IN_URL); los permisos los aplica requireUser().
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Rutas de la app, salvo internos de Next y archivos estáticos (salvo que estén en los search params).
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Siempre para las rutas de API.
    "/(api|trpc)(.*)",
    // Frontend API de Clerk servida desde el propio dominio.
    "/__clerk/:path*",
  ],
};
