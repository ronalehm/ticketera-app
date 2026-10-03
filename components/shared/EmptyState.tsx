import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
};

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <Empty className="rounded-2xl border-2 border-dashed border-border bg-background px-6 py-14 md:py-20">
      <EmptyHeader className="max-w-md">
        <EmptyMedia variant="icon" aria-hidden className="size-14 rounded-2xl bg-accent text-accent-foreground">
          <Icon className="size-7" />
        </EmptyMedia>
        <EmptyTitle className="text-xl font-bold">
          <h2>{title}</h2>
        </EmptyTitle>
        <EmptyDescription className="max-w-md text-base text-muted-foreground">{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link
          href={actionHref}
          className={cn(buttonVariants(), "h-11 cursor-pointer px-6 font-semibold duration-200 hover:bg-primary-strong")}
        >
          {actionLabel}
        </Link>
      </EmptyContent>
    </Empty>
  );
}
