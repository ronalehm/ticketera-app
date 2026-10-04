import { NewsletterForm } from "./NewsletterForm";

export function NewsletterSignup() {
  return (
    <section aria-labelledby="newsletter-title" className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <div className="flex flex-col gap-6 rounded-3xl bg-accent px-6 py-8 md:px-12 md:py-14 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-16">
          <div className="max-w-xl">
            <h2 id="newsletter-title" className="text-2xl font-bold tracking-tight md:text-3xl">
              No te pierdas ningún evento
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              Suscríbete y recibe las novedades de tus artistas y equipos favoritos.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
