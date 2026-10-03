"use client";

import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getFirstName, getFullName } from "@/lib/userName";
import { cn } from "@/lib/utils";
import { ACCOUNT_LINKS } from "./accountLinks";
import { UserSummary } from "@/components/shared/UserSummary";

const TRIGGER = cn(
  buttonVariants({ variant: "ghost" }),
  "h-11 min-w-11 cursor-pointer gap-2 rounded-full px-1.5 duration-200 sm:pr-3 data-popup-open:bg-accent",
);

const ITEM =
  "h-11 cursor-pointer gap-3 rounded-lg px-3 text-sm font-medium aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-accent-foreground";

type UserMenuProps = {
  firstName: string;
  lastName: string;
  email: string;
  pathname: string;
  onSignOut: () => void;
};

export function UserMenu({ firstName, lastName, email, pathname, onSignOut }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Cuenta de ${getFullName(firstName, lastName)}`} className={TRIGGER}>
        <UserAvatar size="default" firstName={firstName} lastName={lastName} />
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:inline">{getFirstName(firstName)}</span>
        <ChevronDown aria-hidden className="hidden size-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 pt-1 pb-3 text-sm text-foreground">
            <UserSummary firstName={firstName} lastName={lastName} email={email} />
          </DropdownMenuLabel>
          {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem
              key={href}
              className={ITEM}
              render={<Link href={href} aria-current={pathname === href ? "page" : undefined} />}
            >
              <Icon aria-hidden />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={ITEM} onClick={onSignOut}>
          <LogOut aria-hidden />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
