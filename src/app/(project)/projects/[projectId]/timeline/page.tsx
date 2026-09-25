import { getProjectWorkspace } from "@/lib/projects/data";

type TimelinePageProps = {
  params: Promise<{ projectId: string }>;
};

const eventLabels: Record<string, string> = {
  PROJECT_CREATED: "تم إنشاء المشروع",
  PROJECT_STAGE_CHANGED: "تم تغيير مرحلة المشروع",
  PROJECT_ARCHIVED: "تمت أرشفة المشروع",
  PROJECT_STATUS_CHANGED: "تم تغيير حالة المشروع",
};

export default async function TimelinePage({ params }: TimelinePageProps) {
  const { projectId } = await params;
  const state = await getProjectWorkspace(projectId);

  return (
    <section className="surface p-6 sm:p-8">
      <p className="text-sm font-semibold text-[var(--accent)]">Timeline</p>
      <h1 className="mt-2 text-3xl font-semibold">الخط الزمني</h1>

      {state.events.length === 0 ? (
        <p className="mt-6 text-[var(--muted-foreground)]">
          لا توجد أحداث مسجلة بعد.
        </p>
      ) : (
        <div className="mt-8 grid gap-4">
          {state.events.map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-[var(--border)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">
                  {eventLabels[event.event_type] ?? event.event_type}
                </h2>
                <time className="text-xs text-[var(--muted-foreground)]">
                  {new Intl.DateTimeFormat("ar-SA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.created_at))}
                </time>
              </div>
              {event.metadata_json ? (
                <pre
                  dir="ltr"
                  className="mt-3 overflow-auto rounded-xl bg-[var(--surface-muted)] p-3 text-xs"
                >
                  {JSON.stringify(event.metadata_json, null, 2)}
                </pre>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
