import { EmptyState } from "@/components/ui/empty-state";
import { logout } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth/require-user";

export default async function InnovationsPage() {
  const user = await requireUser();

  return (
    <main className="shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">My Innovations</p>
          <h1 className="mt-2 text-3xl font-semibold">ابتكاراتي</h1>
          {user.email ? (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]" dir="ltr">
              {user.email}
            </p>
          ) : null}
        </div>

        <form action={logout}>
          <button className="rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold">
            تسجيل الخروج
          </button>
        </form>
      </div>

      <div className="mt-8">
        <EmptyState
          title="لا توجد مشاريع بعد"
          description="ابدأ بفكرة أو مشكلة، ثم حوّل تحليل Idea X-Ray إلى مشروع ابتكاري."
          actionLabel="ابدأ بفكرة"
          actionHref="/idea-xray"
        />
      </div>
    </main>
  );
}
