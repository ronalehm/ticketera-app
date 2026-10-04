import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { cn } from "@/lib/utils";

type PurchaseStep = 1 | 2 | 3;

type PurchaseShellProps = {
  /** Paso actual. Sin él (estados de error y de carga), la cabecera solo muestra el logo. */
  currentStep?: PurchaseStep;
  /** Flecha de vuelta de la cabecera móvil (< lg). Pasos 1 y 2. */
  back?: { href: string; label: string };
  children: ReactNode;
};

const STEPS = [
  { label: "Entradas", title: "Elige tus entradas", progress: "w-1/3" },
  { label: "Datos y pago", title: "Datos y pago", progress: "w-2/3" },
  { label: "Confirmación", title: "Confirmación", progress: "w-full" },
] as const;

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PurchaseShell({ currentStep, back, children }: PurchaseShellProps) {
  const current = currentStep ? STEPS[currentStep - 1] : undefined;

  return (
    <div className="flex flex-1 flex-col bg-muted">
      <header className="sticky top-0 z-40 border-b bg-background print:hidden">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="flex h-15 items-center gap-1 lg:grid lg:h-19 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
            {back && (
              <Link
                href={back.href}
                aria-label={back.label}
                className={cn(
                  "-ml-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors duration-200 hover:bg-accent hover:text-accent-foreground motion-reduce:transition-none lg:hidden",
                  FOCUS_RING,
                )}
              >
                <ArrowLeft aria-hidden className="size-5" />
              </Link>
            )}

            <Link
              href="/"
              className={cn(
                "shrink-0 cursor-pointer rounded-lg lg:justify-self-start",
                FOCUS_RING,
                back && "max-lg:hidden",
              )}
            >
              <BrandLogo preload className="h-7 w-auto lg:h-8" />
            </Link>

            {currentStep && current && (
              <>
                {currentStep < 3 ? (
                  <div aria-hidden className="flex min-w-0 flex-1 flex-col lg:hidden">
                    <span className="text-xs text-muted-foreground">
                      Paso {currentStep} de {STEPS.length}
                    </span>
                    <span className="text-base font-bold">{current.title}</span>
                  </div>
                ) : (
                  <div aria-hidden className="ml-auto lg:hidden">
                    <span className="text-xs text-muted-foreground">
                      Paso {currentStep} de {STEPS.length}
                    </span>
                  </div>
                )}

                <ol
                  aria-label="Pasos de la compra"
                  className="sr-only lg:not-sr-only lg:flex lg:items-center lg:gap-3 lg:text-sm lg:font-medium"
                >
                  {STEPS.map(({ label }, index) => {
                    const step = index + 1;
                    const isDone = step < currentStep;
                    const isCurrent = step === currentStep;
                    const isLast = step === STEPS.length;

                    return (
                      <li
                        key={label}
                        aria-current={isCurrent ? "step" : undefined}
                        className="flex items-center gap-3"
                      >
                        <span
                          className={cn(
                            "flex items-center gap-2.5",
                            isCurrent && "font-semibold",
                            !isDone && !isCurrent && "text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                              isDone || isCurrent
                                ? "bg-primary text-primary-foreground"
                                : "border-2 border-input",
                            )}
                          >
                            {isDone ? <Check aria-hidden className="size-4" /> : step}
                          </span>
                          {label}
                          {isDone && <span className="sr-only">(completado)</span>}
                        </span>
                        {!isLast && (
                          <span
                            aria-hidden
                            className={cn(
                              "h-0.5 w-10 rounded-full",
                              isDone ? "bg-primary" : "bg-input",
                            )}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>

                {currentStep < 3 && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground lg:justify-self-end">
                    <Lock aria-hidden className="size-5 shrink-0 lg:size-4" />
                    <span className="max-lg:sr-only">Compra segura</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {current && (
          <div aria-hidden className="h-1 bg-secondary lg:hidden">
            <div className={cn("h-full bg-primary", current.progress)} />
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
