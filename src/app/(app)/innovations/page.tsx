import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth/require-user";
import { listMyProjects } from "@/lib/projects/data";

const stageLabels: Record<string, string> = {
  DISCOVERY: "اكتشاف",
  PROBLEM_VALIDATION: "التحقق من المشكلة",
  EVIDENCE: "الأدلة",
  PRIOR_ART: "الأعمال السابقة",
  GAP_DEFINITION: "تحديد الفجوة",
  EXPERIMENT_DESIGN: "تصميم التجربة",
  EXPERIMENT_READY: "التجربة جاهزة",
};

export default async function InnovationsPage() {
  const [user, projects] = await Promise.all([
    requireUser(),
    listMyProjects(),
  ]);

  return (
    <main className="shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">
            My Innovations
          </p>
          <h1 className="mt-2 text-3xl font-semibold">ابتكاراتي</h1>
          {user.email ? (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]" dir="ltr">
              {user.email}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Link
            href="/innovations/new"
            className="rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            مشروع جديد
          </Link>
          <form action={logout}>
            <button className="rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </div>

      {projects.length === 0 ? (
        <section className="surface mt-8 p-8 text-center">
          <h2 className="text-2xl font-semibold">لا توجد مشاريع بعد</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-[var(--muted-foreground)]">
            ابدأ بالمشكلة التي تعمل عليها. سننشئ Project State منظمًا ونحدد
            الخطوة التالية بدل تقديم حلول جاهزة.
          </p>
          <Link
            href="/innovations/new"
            className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white"
          >
            أنشئ مشروعك الأول
          </Link>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="surface p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold">{project.title}</h2>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">
                  {stageLabels[project.current_stage] ?? project.current_stage}
                </span>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
                {project.description || "لا يوجد وصف بعد."}
              </p>
              <p className="mt-6 text-xs text-[var(--muted-foreground)]">
                آخر تحديث:{" "}
                {new Intl.DateTimeFormat("ar-SA", {
                  dateStyle: "medium",
                }).format(new Date(project.updated_at))}
              </p>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
