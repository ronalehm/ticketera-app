import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
