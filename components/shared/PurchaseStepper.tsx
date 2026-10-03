import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type PurchaseStep = 1 | 2 | 3;

const STEPS = [
  { label: "Entradas", title: "Elige tus entradas", progress: "w-1/3" },
  { label: "Datos y pago", title: "Datos y pago", progress: "w-2/3" },
  { label: "Confirmación", title: "Confirmación", progress: "w-full" },
] as const;

export function PurchaseStepper({ currentStep }: { currentStep: PurchaseStep }) {
  const current = STEPS[currentStep - 1];

  return (
    <div className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="md:flex md:h-16 md:items-center md:justify-between md:gap-6">
          <ol
            aria-label="Pasos de la compra"
            className="sr-only md:not-sr-only md:flex md:items-center md:gap-3 md:text-sm md:font-medium"
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

          <p className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <Lock aria-hidden className="size-4" />
            Compra segura
          </p>
        </div>

        <div aria-hidden="true" className="md:hidden">
          <div className="flex items-center gap-3 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs text-muted-foreground">
                Paso {currentStep} de {STEPS.length}
              </span>
              <span className="text-base font-bold">{current.title}</span>
            </div>
            <Lock className="size-5 shrink-0 text-muted-foreground" />
          </div>
          <div className="-mx-4 h-1 bg-secondary">
            <div className={cn("h-full bg-primary", current.progress)} />
          </div>
        </div>
      </div>
    </div>
  );
}
