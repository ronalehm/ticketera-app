import type * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/userName";

type UserAvatarProps = Omit<React.ComponentProps<typeof Avatar>, "size" | "children"> & {
  firstName: string;
  lastName: string;
  /** default 32 px · lg 40 px · xl 80 px */
  size?: "default" | "lg" | "xl";
};

export function UserAvatar({ firstName, lastName, size = "default", className, ...props }: UserAvatarProps) {
  return (
    <Avatar
      aria-hidden
      size={size === "lg" ? "lg" : "default"}
      className={cn(size === "xl" && "size-20", className)}
      {...props}
    >
      <AvatarFallback className={cn("bg-accent font-semibold text-accent-foreground", size === "xl" && "text-2xl")}>
        {getInitials(firstName, lastName)}
      </AvatarFallback>
    </Avatar>
  );
}
