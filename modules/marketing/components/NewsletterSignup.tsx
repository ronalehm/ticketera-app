import { NewsletterForm } from "./NewsletterForm";

export function NewsletterSignup() {
  return (
    <section aria-labelledby="newsletter-title" className="bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 md:px-6 md:py-12 lg:flex-row lg:items-start lg:justify-between lg:gap-12 lg:px-8">
        <div className="lg:pt-2">
          <h2 id="newsletter-title" className="text-xl font-semibold tracking-tight md:text-2xl">
            No te pierdas ningún evento
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suscríbete y recibe las novedades de tus artistas y equipos favoritos.
          </p>
        </div>
        <NewsletterForm />
      </div>
    </section>
  );
}
