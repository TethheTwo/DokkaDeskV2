import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="bg-card border-b border-[#e2e8f0]">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-display-lg text-[#191c1e]">{title}</h1>
          {subtitle && <p className="text-body-lg text-[#414752] mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
