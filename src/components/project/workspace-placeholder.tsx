type WorkspacePlaceholderProps = {
  eyebrow: string;
  title: string;
  known: string;
  unknown: string;
  next: string;
};

export function WorkspacePlaceholder({
  eyebrow,
  title,
  known,
  unknown,
  next,
}: WorkspacePlaceholderProps) {
  return (
    <section className="surface p-6 sm:p-8">
      <p className="text-sm font-semibold text-[var(--accent)]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <InfoCard label="ماذا نعرف؟" value={known} />
        <InfoCard label="ماذا لا نعرف؟" value={unknown} />
        <InfoCard label="ماذا أفعل الآن؟" value={next} />
      </div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{value}</p>
    </div>
  );
}
