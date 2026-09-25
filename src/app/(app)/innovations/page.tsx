import { EmptyState } from "@/components/ui/empty-state";

export default function InnovationsPage() {
  return (
    <main className="shell py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">My Innovations</p>
          <h1 className="mt-2 text-3xl font-semibold">ابتكاراتي</h1>
        </div>
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
