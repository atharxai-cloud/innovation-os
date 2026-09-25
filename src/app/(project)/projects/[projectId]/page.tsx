import { getProjectWorkspace } from "@/lib/projects/data";

type ProjectOverviewPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectOverviewPage({
  params,
}: ProjectOverviewPageProps) {
  const { projectId } = await params;
  const state = await getProjectWorkspace(projectId);
  const biggestUnknown =
    state.questions.find(
      (item) => item.status === "OPEN" || item.status === "IN_PROGRESS",
    )?.question ?? "لا توجد أسئلة حرجة مفتوحة حاليًا.";

  return (
    <div className="grid gap-5">
      <section className="surface p-6 sm:p-8">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Project Overview
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{state.project.title}</h1>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              المرحلة الحالية: {state.project.current_stage}
            </p>
          </div>
          <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold">
            {state.project.status}
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <InfoBlock
            label="المشكلة"
            value={
              state.problem?.problem_statement ??
              state.project.description ??
              "لم تُحدد المشكلة بعد."
            }
          />
          <InfoBlock
            label="السياق"
            value={state.problem?.context ?? "لم يُحدد السياق بعد."}
          />
          <InfoBlock
            label="المستفيد أو المتأثر"
            value={state.problem?.affected_users ?? "لم يُحدد بعد."}
          />
          <InfoBlock
            label="اتجاه الحل الحالي"
            value={
              state.problem?.current_solution_direction ??
              "لا نثبت اتجاه حل قبل التحقق من المشكلة."
            }
          />
        </div>
      </section>

      <section className="surface p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Biggest Unknown
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{biggestUnknown}</h2>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          هذه ليست نتيجة نهائية؛ إنها أهم نقطة ينبغي تقليل عدم اليقين حولها
          قبل الانتقال للمرحلة التالية.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-6">
          <p className="text-sm font-semibold">الأسئلة المفتوحة</p>
          <div className="mt-4 grid gap-3">
            {state.questions.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--border)] p-4"
              >
                <p className="font-semibold">{item.question}</p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {item.type} · Priority {item.priority} · {item.status}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-6">
          <p className="text-sm font-semibold">الافتراضات الحالية</p>
          <div className="mt-4 grid gap-3">
            {state.assumptions.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--border)] p-4"
              >
                <p className="font-semibold">{item.statement}</p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {item.category} · {item.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 leading-7 text-[var(--muted-foreground)]">{value}</p>
    </div>
  );
}
