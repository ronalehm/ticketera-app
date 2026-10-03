export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="flex justify-center bg-muted px-4 py-12 md:py-16">{children}</div>;
}
