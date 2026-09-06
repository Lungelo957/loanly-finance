import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  portal,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  portal?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 flex justify-center">
          <BrandMark subtitle={portal} />
        </div>
        <div className="card-surface p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
