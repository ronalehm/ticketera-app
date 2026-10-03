import { AuthBrandPanel } from "@/modules/auth";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex-1 lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <AuthBrandPanel />
      <main className="flex flex-col items-center px-4 pt-8 pb-12 md:pt-12 lg:justify-center lg:px-10 lg:py-12">
        {children}
      </main>
    </div>
  );
}
