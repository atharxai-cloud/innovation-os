import Link from "next/link";

type ProjectShellProps = {
  projectId: string;
  children: React.ReactNode;
};

const navigation = [
  ["", "نظرة عامة"],
  ["/evidence", "الأدلة"],
  ["/prior-art", "الأعمال السابقة"],
  ["/gap", "الفجوة"],
  ["/experiments", "التجارب"],
  ["/files", "الملفات"],
  ["/timeline", "الخط الزمني"],
] as const;

export function ProjectShell({ projectId, children }: ProjectShellProps) {
  const base = "/projects/" + projectId;

  return (
    <div className="shell grid min-h-screen gap-5 py-5 xl:grid-cols-[210px_minmax(0,1fr)_280px]">
      <aside className="surface h-fit p-4">
        <Link href="/innovations" className="text-sm font-semibold text-[var(--accent)]">
          Innovation OS
        </Link>
        <nav className="mt-6 grid gap-1" aria-label="تنقل المشروع">
          {navigation.map(([suffix, label]) => (
            <Link
              key={suffix}
              href={base + suffix}
              className="rounded-xl px-3 py-2.5 text-sm hover:bg-[var(--surface-muted)]"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-w-0">{children}</main>

      <aside className="surface h-fit p-5">
        <p className="text-sm font-semibold text-[var(--accent)]">Project Brain</p>
        <h2 className="mt-3 text-xl font-semibold">ماذا أفعل الآن؟</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
          ستظهر هنا الحالة الحالية، أكبر مجهول، الخطر الحالي، والخطوة التالية
          مع سببها بعد تفعيل Project State وNavigator.
        </p>
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
          Ask My Project سيكون متاحًا Contextually داخل المشروع، وليس كدردشة عامة.
        </div>
      </aside>
    </div>
  );
}
