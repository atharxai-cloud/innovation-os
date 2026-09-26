import Link from "next/link";
import { getProjectWorkspace } from "@/lib/projects/data";
import { AskProjectPanel } from "@/components/project/ask-project-panel";

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

export async function ProjectShell({
  projectId,
  children,
}: ProjectShellProps) {
  const base = "/projects/" + projectId;
  const state = await getProjectWorkspace(projectId);
  const biggestUnknown =
    state.brain?.biggestUnknown ??
    state.questions.find(
      (item) => item.status === "OPEN" || item.status === "IN_PROGRESS",
    )?.question ??
    "لا توجد أسئلة حرجة مفتوحة حاليًا.";

  return (
    <div className="shell grid min-h-screen gap-5 py-5 xl:grid-cols-[210px_minmax(0,1fr)_300px]">
      <aside className="surface h-fit p-4">
        <Link
          href="/innovations"
          className="text-sm font-semibold text-[var(--accent)]"
        >
          Innovation OS
        </Link>
        <p className="mt-3 line-clamp-2 text-sm font-semibold">
          {state.project.title}
        </p>
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
        <p className="text-sm font-semibold text-[var(--accent)]">
          Project Brain
        </p>

        <div className="mt-5 grid gap-5">
          <BrainItem label="Current Stage" value={state.project.current_stage} />
          <BrainItem label="Biggest Unknown" value={biggestUnknown} />
          <BrainItem
            label="Blocking Issue"
            value={state.nextAction.blockingIssue ?? "لا يوجد عائق حرج حاليًا."}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-semibold text-[var(--accent)]">
            Next Best Action
          </p>
          <p className="mt-2 font-semibold leading-6">
            {state.nextAction.action}
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
            {state.nextAction.reason}
          </p>
          {state.nextAction.confidence !== null ? (
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
              Confidence:{" "}
              {Math.round(state.nextAction.confidence * 100)}%
            </p>
          ) : null}
          {state.brain ? (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Snapshot v{state.brain.snapshotVersion} · {state.brain.generatedBy}
            </p>
          ) : null}
        </div>

        <AskProjectPanel projectId={projectId} />
      </aside>
    </div>
  );
}

function BrainItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}
