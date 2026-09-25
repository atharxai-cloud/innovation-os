import Link from "next/link";
import { createProject } from "../actions";

type NewProjectPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const { error } = await searchParams;

  return (
    <main className="shell py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/innovations"
          className="text-sm font-semibold text-[var(--accent)]"
        >
          العودة إلى ابتكاراتي
        </Link>
        <h1 className="mt-4 text-4xl font-semibold">إنشاء مشروع ابتكاري</h1>
        <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
          ابدأ بالمشكلة نفسها، لا بالحل. سنحوّلها إلى Project State منظم ثم
          نحدد الخطوة التالية.
        </p>

        {error ? (
          <p className="mt-5 rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--danger)]">
            تعذر إنشاء المشروع. تحقق من الحقول وأعد المحاولة.
          </p>
        ) : null}

        <form action={createProject} className="surface mt-8 grid gap-5 p-6">
          <label className="grid gap-2 text-sm font-semibold">
            اسم المشروع
            <input
              name="title"
              required
              minLength={3}
              maxLength={180}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            ما المشكلة؟
            <textarea
              name="problem"
              required
              minLength={10}
              rows={5}
              className="rounded-2xl border border-[var(--border)] bg-white p-4 font-normal leading-7 outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            السياق
            <textarea
              name="context"
              rows={3}
              placeholder="أين تحدث المشكلة؟ وفي أي ظروف؟"
              className="rounded-2xl border border-[var(--border)] bg-white p-4 font-normal leading-7 outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            من المتأثر بالمشكلة؟
            <input
              name="affectedUsers"
              placeholder="مثال: المدارس، إدارة المرافق، الطلاب..."
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal outline-none focus:border-[var(--accent)]"
            />
          </label>

          <button className="mt-2 rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white">
            إنشاء المشروع
          </button>
        </form>
      </div>
    </main>
  );
}
