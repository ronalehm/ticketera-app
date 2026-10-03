import { UserAvatar } from "@/components/shared/UserAvatar";
import { getFullName } from "@/lib/userName";
import { cn } from "@/lib/utils";

type UserSummaryProps = {
  firstName: string;
  lastName: string;
  email: string;
  className?: string;
};

export function UserSummary({ firstName, lastName, email, className }: UserSummaryProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <UserAvatar size="lg" firstName={firstName} lastName={lastName} />
      <div className="min-w-0 flex-1">
        <p className="text-base leading-snug font-semibold wrap-break-word text-foreground">
          {getFullName(firstName, lastName)}
        </p>
        <p className="text-sm text-muted-foreground wrap-anywhere">{email}</p>
      </div>
    </div>
  );
}
