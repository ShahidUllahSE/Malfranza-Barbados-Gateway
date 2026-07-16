import type { ReactNode } from "react";

export function PagePlaceholder({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      {eyebrow && (
        <span className="inline-flex items-center rounded-full bg-brand-cream px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-green">
          {eyebrow}
        </span>
      )}
      <h1 className="mt-5 max-w-3xl text-4xl leading-tight sm:text-5xl">{title}</h1>
      {description && (
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-brand-charcoal/75">
          {description}
        </p>
      )}
      {children && <div className="mt-12">{children}</div>}
    </section>
  );
}
