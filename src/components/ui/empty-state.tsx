import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <section className="surface p-8 text-center">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl leading-7 text-[var(--muted-foreground)]">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
